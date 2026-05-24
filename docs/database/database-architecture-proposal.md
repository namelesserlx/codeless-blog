# 数据库架构优化方案

## 问题分析

当前使用 MySQL 存储文章存在以下问题：

1. **大文本存储**：`content` 字段存储 md/html，可能很大，MySQL 的 LongText 类型对大文本的全文搜索支持有限
2. **半结构化数据**：文章内容可能包含复杂的嵌套结构（如 frontmatter、metadata 等）
3. **JSON 导入导出**：需要频繁的序列化/反序列化操作
4. **扩展性**：未来可能需要存储文章版本历史、草稿等

## 推荐方案：MySQL + MongoDB 混合架构

### 架构设计

```
┌─────────────────────────────────────────┐
│         MySQL (关系型数据)                │
├─────────────────────────────────────────┤
│ Post (元数据)                            │
│ - id (CUID)                              │
│ - title                                  │
│ - summary                                │
│ - published, isDraft, allowComments     │
│ - cardType, cardImageUrl                 │
│ - authorId (FK -> User)                 │
│ - createdAt, updatedAt                   │
│ - contentId (引用 MongoDB 文档)         │
│                                          │
│ 关联表：Tag, Comment, PostLike 等        │
└─────────────────────────────────────────┘
                    ↓
┌─────────────────────────────────────────┐
│      MongoDB (文档型数据)                │
├─────────────────────────────────────────┤
│ PostContent Collection                  │
│ {                                       │
│   _id: ObjectId                         │
│   postId: "cuid..." (对应 MySQL Post)   │
│   content: "markdown/html content",     │
│   metadata: {                           │
│     format: "markdown" | "html",        │
│     wordCount: 1234,                    │
│     readingTime: 5,                     │
│     frontmatter: {...}                  │
│   },                                    │
│   versions: [...], // 版本历史           │
│   createdAt, updatedAt                 │
│ }                                       │
└─────────────────────────────────────────┘
```

### 优势

1. **保持关系型优势**
    - MySQL 继续处理复杂的关联查询（JOIN）
    - 统计查询性能好（count, sum 等）
    - ACID 事务保证数据一致性
    - Prisma 支持完善

2. **MongoDB 优势**
    - 文档型存储，天然支持 JSON
    - 大文本存储和查询性能好
    - 灵活的 schema，适合半结构化数据
    - 版本历史、草稿等扩展方便

3. **JSON 导入导出**
    - MongoDB 文档直接就是 JSON，导入导出无需转换
    - 支持批量操作

### 实现步骤

#### 1. 修改 Prisma Schema

```prisma
model Post {
  id               String    @id @default(cuid())
  title            String
  summary          String?   @db.Text
  published        Boolean   @default(false)
  isDraft          Boolean   @default(true)
  allowComments    Boolean   @default(true)
  cardType         CardType  @default(LARGE_IMAGE)
  cardImageUrl     String?
  createdAt        DateTime  @default(now())
  updatedAt        DateTime  @updatedAt

  // 新增：MongoDB 内容引用
  contentId        String?   @unique // MongoDB ObjectId 或自定义ID

  author           User      @relation(fields: [authorId], references: [id])
  authorId         Int
  tags             Tag[]
  comments         Comment[]
  likes            PostLike[]
  views            PostViewDaily[]
  readTimes        PostReadTime[]

  @@index([contentId])
}
```

#### 2. 创建 MongoDB 服务层

```typescript
// lib/mongodb.ts
import { MongoClient, Db, Collection } from 'mongodb';

interface PostContent {
    _id?: string;
    postId: string;
    content: string;
    metadata?: {
        format: 'markdown' | 'html';
        wordCount?: number;
        readingTime?: number;
        frontmatter?: Record<string, any>;
    };
    versions?: Array<{
        content: string;
        createdAt: Date;
    }>;
    createdAt: Date;
    updatedAt: Date;
}

class MongoDBService {
    private client: MongoClient;
    private db: Db;
    private postContentCollection: Collection<PostContent>;

    async connect() {
        this.client = new MongoClient(process.env.MONGODB_URI!);
        await this.client.connect();
        this.db = this.client.db('blog');
        this.postContentCollection = this.db.collection<PostContent>('postContents');

        // 创建索引
        await this.postContentCollection.createIndex({ postId: 1 }, { unique: true });
    }

    async getPostContent(postId: string): Promise<PostContent | null> {
        return await this.postContentCollection.findOne({ postId });
    }

    async createPostContent(
        data: Omit<PostContent, '_id' | 'createdAt' | 'updatedAt'>,
    ): Promise<string> {
        const result = await this.postContentCollection.insertOne({
            ...data,
            createdAt: new Date(),
            updatedAt: new Date(),
        });
        return result.insertedId.toString();
    }

    async updatePostContent(
        postId: string,
        content: string,
        metadata?: PostContent['metadata'],
    ): Promise<void> {
        const existing = await this.getPostContent(postId);

        // 保存版本历史
        const versions = existing?.versions || [];
        if (existing?.content) {
            versions.push({
                content: existing.content,
                createdAt: existing.updatedAt,
            });
        }

        await this.postContentCollection.updateOne(
            { postId },
            {
                $set: {
                    content,
                    metadata: metadata || existing?.metadata,
                    versions: versions.slice(-10), // 保留最近10个版本
                    updatedAt: new Date(),
                },
            },
        );
    }

    async deletePostContent(postId: string): Promise<void> {
        await this.postContentCollection.deleteOne({ postId });
    }

    // JSON 导入导出
    async exportPostContent(postId: string): Promise<PostContent> {
        const content = await this.getPostContent(postId);
        if (!content) {
            throw new Error('Post content not found');
        }
        return content;
    }

    async importPostContent(data: PostContent): Promise<string> {
        const result = await this.createPostContent(data);
        return result;
    }

    async bulkExportPostContents(postIds: string[]): Promise<PostContent[]> {
        return await this.postContentCollection.find({ postId: { $in: postIds } }).toArray();
    }
}

export const mongoDBService = new MongoDBService();
```

#### 3. 修改文章服务层

```typescript
// services/blog/article/index.ts
import { prisma } from '@blog/db';
import { mongoDBService } from '@/lib/mongodb';

export class ArticleService {
    async createArticle(data: CreateArticleRequest) {
        // 1. 创建 MySQL 记录（元数据）
        const post = await prisma.post.create({
            data: {
                title: data.title,
                summary: data.summary,
                // ... 其他字段
            },
        });

        // 2. 创建 MongoDB 记录（内容）
        const contentId = await mongoDBService.createPostContent({
            postId: post.id,
            content: data.content,
            metadata: {
                format: data.format || 'markdown',
                // ... 其他元数据
            },
        });

        // 3. 更新 MySQL 记录，关联 MongoDB
        await prisma.post.update({
            where: { id: post.id },
            data: { contentId },
        });

        return post;
    }

    async getArticleDetail(id: string) {
        // 1. 从 MySQL 获取元数据
        const post = await prisma.post.findUnique({
            where: { id },
            include: {
                author: true,
                tags: true,
                // ... 其他关联
            },
        });

        if (!post) return null;

        // 2. 从 MongoDB 获取内容
        const content = await mongoDBService.getPostContent(id);

        return {
            ...post,
            content: content?.content || '',
            metadata: content?.metadata,
        };
    }

    async exportArticleAsJSON(id: string) {
        const post = await prisma.post.findUnique({
            where: { id },
            include: {
                author: { select: { id: true, username: true } },
                tags: { select: { id: true, name: true } },
            },
        });

        const content = await mongoDBService.exportPostContent(id);

        return {
            ...post,
            content: content.content,
            metadata: content.metadata,
            versions: content.versions,
        };
    }
}
```

## 方案二：优化 MySQL 方案（备选）

如果不想引入 MongoDB，可以优化 MySQL：

### 1. 使用 JSON 字段存储元数据

```prisma
model Post {
  // ... 其他字段
  content          String    @db.LongText
  metadata         Json?     // 存储格式、字数、阅读时间等
  frontmatter      Json?     // 存储 frontmatter
}
```

### 2. 使用全文索引优化搜索

```sql
-- 创建全文索引
ALTER TABLE Post ADD FULLTEXT INDEX ft_content (title, summary, content);
```

### 3. JSON 导入导出工具函数

```typescript
async function exportPostAsJSON(postId: string) {
    const post = await prisma.post.findUnique({
        where: { id: postId },
        include: { author: true, tags: true },
    });

    return JSON.stringify(post, null, 2);
}

async function importPostFromJSON(jsonData: string) {
    const data = JSON.parse(jsonData);
    // ... 导入逻辑
}
```

## 对比总结

| 特性       | MySQL 单库     | MySQL + MongoDB 混合 |
| ---------- | -------------- | -------------------- |
| 关联查询   | ✅ 优秀        | ✅ MySQL 处理        |
| 大文本存储 | ⚠️ 一般        | ✅ MongoDB 优秀      |
| JSON 支持  | ⚠️ JSON 字段   | ✅ 原生支持          |
| 全文搜索   | ⚠️ 有限        | ✅ MongoDB 全文索引  |
| 版本历史   | ❌ 需要额外表  | ✅ 文档内数组        |
| 扩展性     | ⚠️ Schema 固定 | ✅ 灵活              |
| 复杂度     | ✅ 简单        | ⚠️ 需要维护两套      |
| 事务支持   | ✅ ACID        | ⚠️ 跨库事务复杂      |

## 最终建议

**推荐采用方案一（MySQL + MongoDB 混合架构）**，原因：

1. ✅ 保持现有 MySQL 架构的优势（关联查询、统计）
2. ✅ MongoDB 天然支持 JSON，导入导出简单
3. ✅ 大文本存储和查询性能更好
4. ✅ 支持版本历史、草稿等扩展需求
5. ✅ 未来可以轻松扩展（如文章版本对比、内容搜索等）

**实施建议：**

- 先实现 MongoDB 服务层和基础 CRUD
- 逐步迁移现有文章内容到 MongoDB
- 保持 MySQL Post 表作为主表，只存储元数据
- 实现统一的文章服务层，封装 MySQL + MongoDB 操作
