# MeiliSearch 搜索引擎集成指南

## 📋 概述

本项目已成功集成 MeiliSearch 搜索引擎,提供快速、准确的文章搜索功能。

### 功能特性

- ✅ 实时搜索,支持中文分词
- ✅ 高亮显示搜索结果
- ✅ 按标签过滤文章
- ✅ 自动同步文章索引
- ✅ 搜索建议和热门文章
- ✅ 响应式搜索界面

---

## 1. 启动 MeiliSearch

### 使用 Docker Compose (推荐)

```bash
# 在项目根目录下执行
docker compose --env-file .env.development up -d meilisearch
```

### 验证 MeiliSearch 是否启动成功

```bash
curl http://localhost:7700/health
```

应该返回: `{"status":"available"}`

### 手动启动（不使用 Docker）

```bash
# macOS/Linux
curl -L https://install.meilisearch.com | sh
./meilisearch --master-key="your_master_key_here"
```

---

## 2. 配置环境变量

优先在根目录 `.env.development` 中添加：

```env
# MeiliSearch 配置
MEILI_URL=http://localhost:7700
MEILI_ADMIN_KEY=your_meili_admin_key
MEILI_SEARCH_KEY=your_meili_search_key
```

如果只想局部覆盖，再分别创建：

- `apps/admin/server/.env.development`
- `apps/blog/.env.development`

---

## 3. 安装依赖

依赖已自动安装,如需手动安装:

```bash
# 在管理后台 server 端
cd apps/admin/server
pnpm add meilisearch

# 在博客用户端
cd apps/blog
pnpm add meilisearch
```

---

## 4. 初始化索引

### 方式一: 使用初始化脚本（推荐）

```bash
# 开发环境
cd apps/admin/server
pnpm run init-search:dev

# 生产环境
pnpm run init-search:prod
```

### 方式二: 通过 API 接口

启动管理后台服务后,访问:

```bash
POST http://localhost:8000/api/blog/articles/reindex-search
```

---

## 5. 使用搜索功能

### 前台用户搜索

1. 在博客首页按 `Cmd/Ctrl + K` 打开搜索框
2. 输入关键词进行搜索
3. 支持搜索标题、内容、摘要、标签、作者
4. 点击结果直接跳转到文章详情页

### 后台自动同步

文章的增删改操作会自动同步到搜索引擎:

- ✅ 创建文章 → 自动添加到索引
- ✅ 更新文章 → 自动更新索引
- ✅ 删除文章 → 自动从索引删除
- ✅ 批量操作 → 自动批量同步

---

## 6. API 接口

### 搜索文章

```bash
GET /api/search?q=关键词&limit=10&offset=0
```

**响应示例:**

```json
{
    "success": true,
    "data": {
        "hits": [
            {
                "id": "article-id",
                "title": "文章标题",
                "summary": "文章摘要",
                "tags": [{ "id": 1, "name": "React" }],
                "_formatted": {
                    "title": "文章<mark>标题</mark>"
                }
            }
        ],
        "total": 100,
        "processingTimeMs": 5
    }
}
```

### 获取搜索建议

```bash
GET /api/search/suggestions?limit=5
```

### 按标签搜索

```bash
GET /api/search/tags?tag=React&limit=10
```

---

## 7. MeiliSearch 管理界面

访问 http://localhost:7700 可以看到 MeiliSearch 的管理界面。

使用 Admin Key 或 Master Key 登录后可以:

- 查看索引统计
- 浏览文档
- 调整搜索配置
- 查看搜索日志

---

## 8. 索引配置

当前文章索引配置:

### 可搜索字段（按优先级排序）

1. `title` - 文章标题
2. `summary` - 文章摘要
3. `content` - 文章内容
4. `tagNames` - 标签名称
5. `authorName` - 作者名
6. `authorNickname` - 作者昵称

### 可过滤字段

- `published` - 发布状态
- `isDraft` - 草稿状态
- `authorId` - 作者 ID
- `tagNames` - 标签名称
- `createdAt` - 创建时间
- `updatedAt` - 更新时间

### 可排序字段

- `createdAt` - 创建时间
- `updatedAt` - 更新时间

---

## 9. 生产环境配置

### 安全配置

1. **修改实例级 Master Key 为强密码**

    ```env
    MEILI_MASTER_KEY=your_very_strong_random_master_key_at_least_32_chars
    ```

2. **应用侧分离 Admin / Search Key**

    ```bash
    # apps/admin/server 使用 Admin Key
    # apps/blog 使用 Search Key
    ```

3. **配置 HTTPS**

    ```yaml
    # docker-compose.yml
    environment:
        - MEILI_ENV=production
        - MEILI_HTTP_ADDR=0.0.0.0:7700
    ```

4. **限制访问**
    - 使用防火墙限制 7700 端口仅允许应用服务器访问
    - 使用反向代理（Nginx/Caddy）暴露 HTTPS 端点

### 性能优化

1. **数据持久化**

    ```yaml
    volumes:
        - ./meilisearch_data:/meili_data
    ```

2. **资源限制**

    ```yaml
    deploy:
        resources:
            limits:
                memory: 2G
                cpus: '1.0'
    ```

3. **定期备份**
    ```bash
    # 创建快照
    curl -X POST 'http://localhost:7700/snapshots' \
      -H 'Authorization: Bearer YOUR_MASTER_KEY'
    ```

---

## 10. 常见问题

### Q: MeiliSearch 启动失败?

**A:**

1. 检查 7700 端口是否被占用: `lsof -i :7700`
2. 查看 Docker 日志: `docker logs blog-meilisearch`
3. 确认 Master Key 已正确配置

### Q: 搜索结果不准确?

**A:**

1. 重新索引所有文章: `pnpm run init-search:dev`
2. 检查 `searchableAttributes` 配置
3. 调整 `rankingRules` 权重

### Q: 搜索速度慢?

**A:**

1. 检查 MeiliSearch 资源使用情况
2. 优化索引大小,减少不必要的字段
3. 考虑增加服务器资源

### Q: 中文搜索效果不好?

**A:**
MeiliSearch v1.7 已经很好地支持中文搜索,如果效果不理想:

1. 确认 MeiliSearch 版本 >= 1.7
2. 检查 `content` 字段是否正确索引
3. 尝试使用短语搜索

### Q: 如何重新索引所有文章?

**A:**

```bash
# 方式一: 使用脚本
cd apps/admin/server
pnpm run init-search:dev

# 方式二: 调用 API
curl -X POST http://localhost:8000/api/blog/articles/reindex-search \
  -H "Authorization: Bearer YOUR_TOKEN"
```

### Q: Docker 容器无法启动?

**A:**

```bash
# 清理旧容器和数据
docker-compose down -v
docker-compose up -d meilisearch

# 查看日志
docker-compose logs -f meilisearch
```

---

## 11. 开发调试

### 查看索引状态

```bash
curl http://localhost:7700/indexes/articles \
  -H 'Authorization: Bearer YOUR_MASTER_KEY'
```

### 查看文档数量

```bash
curl http://localhost:7700/indexes/articles/stats \
  -H 'Authorization: Bearer YOUR_MASTER_KEY'
```

### 测试搜索

```bash
curl -X POST http://localhost:7700/indexes/articles/search \
  -H 'Authorization: Bearer YOUR_MASTER_KEY' \
  -H 'Content-Type: application/json' \
  -d '{"q": "Next.js", "limit": 5}'
```

---

## 12. 项目文件结构

```
├── docker-compose.yml                          # Docker 配置
├── docs/
│   └── search/
│       └── features/search/meilisearch-integration.md  # 本文档
├── apps/
│   ├── admin/server/
│   │   ├── src/
│   │   │   ├── lib/
│   │   │   │   └── meilisearch.ts              # MeiliSearch 客户端配置
│   │   │   ├── services/
│   │   │   │   └── search/
│   │   │   │       └── article-search.ts       # 文章搜索服务
│   │   │   ├── controllers/
│   │   │   │   └── blog/article/index.ts       # 添加了重新索引接口
│   │   │   ├── routes/
│   │   │   │   └── blog/article/index.ts       # 添加了重新索引路由
│   │   │   └── scripts/
│   │   │       └── init-meilisearch.ts         # 初始化脚本
│   │   └── package.json                        # 添加了 init-search 脚本
│   └── blog/
│       ├── app/api/search/
│       │   ├── route.ts                        # 搜索 API
│       │   ├── suggestions/route.ts            # 搜索建议 API
│       │   └── tags/route.ts                   # 标签搜索 API
│       ├── lib/hooks/
│       │   ├── useSearch.ts                    # 搜索 Hook
│       │   └── useDebounce.ts                  # 防抖 Hook
│       └── components/search/
│           └── search-modal.tsx                # 搜索弹窗组件
```

---

## 13. 下一步计划

- [ ] 添加搜索历史记录
- [ ] 支持高级搜索（日期范围、作者筛选等）
- [ ] 添加搜索统计和分析
- [ ] 支持拼音搜索
- [ ] 添加搜索结果缓存

---

## 📞 技术支持

如有问题,请查看:

- [MeiliSearch 官方文档](https://docs.meilisearch.com/)
- [MeiliSearch GitHub](https://github.com/meilisearch/meilisearch)
- 项目 Issue 追踪

---

**最后更新:** 2025-12-07
