import 'server-only';

// lib/server/db.ts - 服务端数据查询工具
import { prisma } from '@blog/db';
import type { Comment as BlogComment } from '@blog/shared';
import { buildPublishedPostWhere, isPublishedPost } from '@/lib/server/published-posts';
import { getRedisClient } from '@/lib/server/redis';

// ========================== 文章相关查询函数 ==========================

/**
 * 获取已发布文章列表，包含基础统计数据和访客个人数据
 *
 * @param options 配置选项
 * @param options.visitorId 可选的访客ID，用于获取个人阅读时长和点赞状态
 * @param options.skip 跳过的文章数量，用于分页
 * @param options.take 获取的文章数量，用于分页
 * @returns Promise<Array> 返回文章列表，每篇文章包含以下数据：
 *   - 基础信息：id, title, summary, author, tags, createdAt 等
 *   - 统计数据：commentsCount（评论数）, likesCount（点赞数）, viewsCount（浏览次数）, readersCount（阅读人数）
 *   - 个人数据：currentVisitorReadTime（当前访客阅读时长，秒）, isLikedByCurrentVisitor（当前访客是否点赞）
 *
 */
export async function getPublishedArticles({
    visitorId,
    skip = 0,
    take,
    tagName,
}: { visitorId?: string; skip?: number; take?: number; tagName?: string } = {}) {
    const articles = await prisma.post.findMany({
        where: buildPublishedPostWhere(tagName),
        select: {
            id: true,
            title: true,
            summary: true,
            published: true,
            isDraft: true,
            allowComments: true,
            cardType: true,
            cardImageUrl: true,
            authorId: true,
            createdAt: true,
            updatedAt: true,
            author: {
                select: {
                    id: true,
                    nickname: true,
                    username: true,
                    email: true,
                    avatar: true,
                },
            },
            tags: {
                select: {
                    id: true,
                    name: true,
                },
            },
            _count: {
                select: {
                    comments: {
                        where: {
                            status: 'PUBLISHED', // 只统计已发布的评论
                        },
                    },
                    likes: true, // 点赞数
                    views: true, // 浏览记录数
                    readTimes: true, // 阅读时长记录数
                },
            },
        },
        orderBy: {
            createdAt: 'desc',
        },
        skip,
        take,
    });

    // 获取每篇文章的统计数据
    const articlesWithStats = await Promise.all(
        articles.map(async (article) => {
            // 全局阅读人数（去重）
            let readersCount = 0;
            try {
                readersCount = await prisma.postReadTime.count({
                    where: { postId: article.id },
                });
            } catch (error) {
                console.warn(`获取文章 ${article.id} 阅读人数失败:`, error);
            }

            // 当前访客的阅读时长（如果提供了 visitorId）
            let currentVisitorReadTime = 0;
            if (visitorId) {
                try {
                    const visitorReadData = await prisma.postReadTime.findUnique({
                        where: {
                            postId_visitorId: {
                                postId: article.id,
                                visitorId: visitorId,
                            },
                        },
                        select: { seconds: true },
                    });
                    currentVisitorReadTime = visitorReadData?.seconds || 0;
                } catch (error) {
                    console.warn(
                        `获取访客 ${visitorId} 对文章 ${article.id} 的阅读时长失败:`,
                        error,
                    );
                }
            }

            // 当前访客是否点赞（如果提供了 visitorId）
            let isLikedByCurrentVisitor = false;
            if (visitorId) {
                try {
                    const likeRecord = await prisma.postLike.findUnique({
                        where: {
                            postId_visitorId: {
                                postId: article.id,
                                visitorId: visitorId,
                            },
                        },
                    });
                    isLikedByCurrentVisitor = !!likeRecord;
                } catch (error) {
                    console.warn(
                        `获取访客 ${visitorId} 对文章 ${article.id} 的点赞状态失败:`,
                        error,
                    );
                }
            }

            return {
                ...article,
                // 基础统计
                commentsCount: article._count.comments, // 总评论数（包括回复）
                likesCount: article._count.likes, // 点赞数
                viewsCount: article._count.views, // 浏览次数
                readersCount, // 阅读人数

                // 当前访客相关数据
                currentVisitorReadTime, // 当前访客的阅读时长（秒）
                isLikedByCurrentVisitor, // 当前访客是否点赞
            };
        }),
    );

    return articlesWithStats;
}

/**
 * 获取已发布文章的总数
 * @returns Promise<number> 返回已发布文章的总数
 */
export async function getPublishedArticlesCount({
    tagName,
}: { tagName?: string } = {}): Promise<number> {
    return await prisma.post.count({
        where: buildPublishedPostWhere(tagName),
    });
}

function parseStringArrayField(value?: string | null): string[] {
    if (!value) {
        return [];
    }

    try {
        const parsed = JSON.parse(value) as unknown;

        if (!Array.isArray(parsed)) {
            return [];
        }

        return parsed.filter((item): item is string => typeof item === 'string' && item.length > 0);
    } catch (error) {
        console.warn('解析片段媒体字段失败:', error);
        return [];
    }
}

export interface PublishedSnippetAuthor {
    id: number;
    username: string;
    nickname: string | null;
    avatar: string | null;
}

export interface PublishedSnippet {
    id: string;
    title: string | null;
    content: string;
    createdAt: string;
    updatedAt: string;
    author: PublishedSnippetAuthor;
    images: string[];
    videos: string[];
    videoPoster: string | null;
    likesCount: number;
    commentsCount: number;
    viewsCount: number;
}

export interface PublishedSnippetsResult {
    snippets: PublishedSnippet[];
    pagination: {
        page: number;
        limit: number;
        total: number;
        totalPages: number;
    };
}

export async function getPublishedSnippets({
    page = 1,
    limit = 10,
}: {
    page?: number;
    limit?: number;
} = {}): Promise<PublishedSnippetsResult> {
    const safePage = Math.max(1, page);
    const safeLimit = Math.min(Math.max(1, limit), 20);
    const skip = (safePage - 1) * safeLimit;
    const where = {
        published: true,
    } as const;

    const [snippets, total] = await Promise.all([
        prisma.snippet.findMany({
            where,
            select: {
                id: true,
                title: true,
                content: true,
                createdAt: true,
                updatedAt: true,
                images: true,
                video: true,
                videoPoster: true,
                author: {
                    select: {
                        id: true,
                        username: true,
                        nickname: true,
                        avatar: true,
                    },
                },
                _count: {
                    select: {
                        likes: true,
                        views: true,
                        comments: {
                            where: {
                                status: 'PUBLISHED',
                            },
                        },
                    },
                },
            },
            orderBy: {
                createdAt: 'desc',
            },
            skip,
            take: safeLimit,
        }),
        prisma.snippet.count({ where }),
    ]);

    return {
        snippets: snippets.map((snippet) => ({
            id: snippet.id,
            title: snippet.title,
            content: snippet.content,
            createdAt: snippet.createdAt.toISOString(),
            updatedAt: snippet.updatedAt.toISOString(),
            author: snippet.author,
            images: parseStringArrayField(snippet.images),
            videos: parseStringArrayField(snippet.video),
            videoPoster: snippet.videoPoster,
            likesCount: snippet._count.likes,
            commentsCount: snippet._count.comments,
            viewsCount: snippet._count.views,
        })),
        pagination: {
            page: safePage,
            limit: safeLimit,
            total,
            totalPages: Math.ceil(total / safeLimit),
        },
    };
}

export interface HomeStats {
    articleCount: number;
    viewCount: number;
    likeCount: number;
}

function getSettledHomeCount(result: PromiseSettledResult<number>, label: string): number {
    if (result.status === 'fulfilled') {
        return result.value;
    }

    console.error(`获取首页${label}统计失败:`, result.reason);
    return 0;
}

export interface HomeSidebarPost {
    id: string;
    title: string;
    viewCount: number;
}

export interface HomeSidebarTag {
    id: number;
    name: string;
    count: number;
}

export interface HomeSidebarData {
    popularPosts: HomeSidebarPost[];
    tags: HomeSidebarTag[];
}

function sortPublishedTags(tags: HomeSidebarTag[]) {
    return tags.sort((left, right) => {
        if (right.count !== left.count) {
            return right.count - left.count;
        }

        return left.name.localeCompare(right.name, 'zh-CN');
    });
}

async function sumRedisSetCardinality(pattern: string): Promise<number> {
    const redis = getRedisClient();

    if (!redis) {
        return 0;
    }

    let cursor = '0';
    let total = 0;

    do {
        const [nextCursor, keys] = await redis.scan(cursor, 'MATCH', pattern, 'COUNT', 100);
        cursor = nextCursor;

        if (keys.length === 0) {
            continue;
        }

        const pipeline = redis.pipeline();
        keys.forEach((key) => {
            pipeline.scard(key);
        });

        const results = await pipeline.exec();
        if (!results) {
            continue;
        }

        total += results.reduce((sum, [error, value]) => {
            if (error || typeof value !== 'number') {
                return sum;
            }

            return sum + value;
        }, 0);
    } while (cursor !== '0');

    return total;
}

export async function getPublishedTags({ take }: { take?: number } = {}): Promise<
    HomeSidebarTag[]
> {
    const tags = await prisma.tag.findMany({
        where: {
            posts: {
                some: buildPublishedPostWhere(),
            },
        },
        include: {
            _count: {
                select: {
                    posts: {
                        where: buildPublishedPostWhere(),
                    },
                },
            },
        },
    });

    const sortedTags = sortPublishedTags(
        tags.map((tag) => ({
            id: tag.id,
            name: tag.name,
            count: tag._count.posts,
        })),
    );

    return typeof take === 'number' ? sortedTags.slice(0, take) : sortedTags;
}

export async function getHomeStats(): Promise<HomeStats> {
    const publishedPostWhere = buildPublishedPostWhere();

    const [dbResults, redisStats] = await Promise.all([
        Promise.allSettled([
            prisma.post.count({
                where: publishedPostWhere,
            }),
            prisma.postViewDaily.count({
                where: {
                    post: publishedPostWhere,
                },
            }),
            prisma.postLike.count({
                where: {
                    post: publishedPostWhere,
                },
            }),
        ]),
        (async () => {
            try {
                const [pendingViewCount, realtimeLikeCount] = await Promise.all([
                    sumRedisSetCardinality('post:*:uv:*'),
                    sumRedisSetCardinality('post:*:like'),
                ]);

                return {
                    pendingViewCount,
                    realtimeLikeCount,
                };
            } catch (error) {
                console.error('获取首页 Redis 统计失败:', error);
                return {
                    pendingViewCount: 0,
                    realtimeLikeCount: null as number | null,
                };
            }
        })(),
    ]);

    const articleCount = getSettledHomeCount(dbResults[0], '文章数');
    const dbViewCount = getSettledHomeCount(dbResults[1], '浏览量');
    const dbLikeCount = getSettledHomeCount(dbResults[2], '点赞量');
    const viewCount = dbViewCount + redisStats.pendingViewCount;
    const likeCount =
        typeof redisStats.realtimeLikeCount === 'number'
            ? redisStats.realtimeLikeCount
            : dbLikeCount;

    return {
        articleCount,
        viewCount,
        likeCount,
    };
}

export async function getHomeSidebarData(): Promise<HomeSidebarData> {
    const [popularPosts, tags] = await Promise.all([
        prisma.post.findMany({
            where: buildPublishedPostWhere(),
            select: {
                id: true,
                title: true,
                _count: {
                    select: {
                        views: true,
                    },
                },
            },
            orderBy: [{ views: { _count: 'desc' } }, { createdAt: 'desc' }],
            take: 4,
        }),
        getPublishedTags({ take: 10 }),
    ]);

    return {
        popularPosts: popularPosts.map((post) => ({
            id: post.id,
            title: post.title,
            viewCount: post._count.views,
        })),
        tags,
    };
}

/**
 * 根据ID获取单个博客文章（包含必要统计数据）
 * @param id 文章ID
 * @param visitorId 可选的访客ID，用于获取个人阅读数据
 */
export async function getArticleById(id: string, { visitorId }: { visitorId?: string } = {}) {
    const article = await prisma.post.findUnique({
        where: { id },
        include: {
            author: {
                select: {
                    id: true,
                    nickname: true,
                    username: true,
                    email: true,
                    avatar: true,
                },
            },
            tags: {
                select: {
                    id: true,
                    name: true,
                },
            },
            _count: {
                select: {
                    comments: {
                        where: {
                            status: 'PUBLISHED',
                        },
                    },
                    likes: true,
                    views: true,
                    readTimes: true,
                },
            },
        },
    });
    if (!article || !isPublishedPost(article)) {
        return null;
    }

    // 获取统计数据
    let readersCount = 0;
    try {
        readersCount = await prisma.postReadTime.count({
            where: { postId: article.id },
        });
    } catch (error) {
        console.warn(`获取文章 ${article.id} 阅读人数失败:`, error);
    }

    // 当前访客的阅读时长（如果提供了 visitorId）
    let currentVisitorReadTime = 0;
    if (visitorId) {
        try {
            const visitorReadData = await prisma.postReadTime.findUnique({
                where: {
                    postId_visitorId: {
                        postId: article.id,
                        visitorId: visitorId,
                    },
                },
                select: { seconds: true },
            });
            currentVisitorReadTime = visitorReadData?.seconds || 0;
        } catch (error) {
            console.warn(`获取访客 ${visitorId} 对文章 ${article.id} 的阅读时长失败:`, error);
        }
    }

    // 当前访客是否点赞（如果提供了 visitorId）
    let isLikedByCurrentVisitor = false;
    if (visitorId) {
        try {
            const likeRecord = await prisma.postLike.findUnique({
                where: {
                    postId_visitorId: {
                        postId: article.id,
                        visitorId: visitorId,
                    },
                },
            });
            isLikedByCurrentVisitor = !!likeRecord;
        } catch (error) {
            console.warn(`获取访客 ${visitorId} 对文章 ${article.id} 的点赞状态失败:`, error);
        }
    }

    return {
        ...article,
        // 基础统计
        commentsCount: article._count.comments, // 总评论数（包括回复）
        likesCount: article._count.likes, // 点赞数
        viewsCount: article._count.views, // 浏览次数
        readersCount, // 阅读人数

        // 当前访客相关数据
        currentVisitorReadTime, // 当前访客的阅读时长（秒）
        isLikedByCurrentVisitor, // 当前访客是否点赞
    };
}

/**
 * 根据标签名获取文章（包含必要统计数据）
 * @param tagName 标签名
 * @param visitorId 可选的访客ID，用于获取个人阅读数据
 */
export async function getArticlesByTag(
    tagName: string,
    { visitorId }: { visitorId?: string } = {},
) {
    return getPublishedArticles({
        visitorId,
        tagName,
    });
}

// ========================== 评论相关查询函数 ==========================

export interface PublishedCommentsQuery {
    postId?: string;
    snippetId?: string;
    page?: number;
    limit?: number;
}

export interface PublishedCommentsResult {
    comments: BlogComment[];
    pagination: {
        page: number;
        limit: number;
        total: number;
        totalPages: number;
    };
}

export async function getPublishedComments({
    postId,
    snippetId,
    page = 1,
    limit = 20,
}: PublishedCommentsQuery): Promise<PublishedCommentsResult> {
    const safePage = Math.max(1, page);
    const safeLimit = Math.min(Math.max(1, limit), 50);

    const where: {
        status: 'PUBLISHED';
        parentId: null;
        postId?: string;
        snippetId?: string;
    } = {
        status: 'PUBLISHED',
        parentId: null,
    };

    if (postId) {
        where.postId = postId;
    }

    if (snippetId) {
        where.snippetId = snippetId;
    }

    const [comments, total] = await Promise.all([
        prisma.comment.findMany({
            where,
            include: {
                author: {
                    select: {
                        id: true,
                        username: true,
                        nickname: true,
                        avatar: true,
                        address: true,
                    },
                },
                receiver: {
                    select: {
                        id: true,
                        username: true,
                        nickname: true,
                    },
                },
                replies: {
                    where: { status: 'PUBLISHED' },
                    include: {
                        author: {
                            select: {
                                id: true,
                                username: true,
                                nickname: true,
                                avatar: true,
                                address: true,
                            },
                        },
                        receiver: {
                            select: {
                                id: true,
                                username: true,
                                nickname: true,
                            },
                        },
                        _count: {
                            select: {
                                replies: true,
                                likes: true,
                            },
                        },
                    },
                    orderBy: { createdAt: 'asc' },
                },
                _count: {
                    select: {
                        replies: true,
                        likes: true,
                    },
                },
            },
            orderBy: { createdAt: 'desc' },
            skip: (safePage - 1) * safeLimit,
            take: safeLimit,
        }),
        prisma.comment.count({ where }),
    ]);

    return {
        comments: comments as unknown as BlogComment[],
        pagination: {
            page: safePage,
            limit: safeLimit,
            total,
            totalPages: Math.ceil(total / safeLimit),
        },
    };
}

/**
 * 1. 查询某篇文章的评论
 */
export async function getArticleComments(postId: string) {
    const { comments } = await getPublishedComments({ postId, page: 1, limit: 100 });
    return comments;
}

/**
 * 2. 发表评论
 */
export async function createComment(data: {
    content: string;
    postId: string;
    authorId: number;
    ipAddress?: string;
    userAgent?: string;
}) {
    console.log('createComment', data);
    const { content, postId, authorId } = data;

    // 验证文章是否存在且允许评论
    const post = await prisma.post.findUnique({
        where: { id: postId },
        select: { allowComments: true, published: true, isDraft: true },
    });

    if (!post) {
        throw new Error('文章不存在');
    }

    if (!isPublishedPost(post)) {
        throw new Error('无法对未发布的文章评论');
    }

    if (!post.allowComments) {
        throw new Error('该文章不允许评论');
    }

    // 创建评论
    return prisma.comment.create({
        data: {
            content,
            authorId,
            postId,
            status: 'PUBLISHED',
        },
        include: {
            author: {
                select: {
                    id: true,
                    username: true,
                    nickname: true,
                    avatar: true,
                    address: true,
                },
            },
        },
    });
}

/**
 * 3. 对已有评论进行回复
 */
export async function replyToComment(data: {
    content: string;
    parentId: number;
    authorId: number;
    ipAddress?: string;
    userAgent?: string;
}) {
    const { content, parentId, authorId } = data;

    // 验证父评论是否存在
    const parentComment = await prisma.comment.findUnique({
        where: { id: parentId },
        include: {
            post: {
                select: { id: true, allowComments: true, published: true, isDraft: true },
            },
        },
    });

    if (!parentComment) {
        throw new Error('父评论不存在');
    }

    if (parentComment.status !== 'PUBLISHED') {
        throw new Error('无法回复未发布的评论');
    }

    // 只允许两层评论：如果父评论已经是回复，则不能再回复
    if (parentComment.parentId) {
        throw new Error('评论只支持两层嵌套');
    }

    // 验证关联的文章是否允许评论
    if (!parentComment.post?.allowComments) {
        throw new Error('该文章不允许评论');
    }

    if (!parentComment.post || !isPublishedPost(parentComment.post)) {
        throw new Error('无法对未发布的文章评论');
    }

    // 创建回复
    return prisma.comment.create({
        data: {
            content,
            authorId,
            postId: parentComment.postId,
            parentId,
            receiverId: parentComment.authorId,
            status: 'PUBLISHED',
        },
        include: {
            author: {
                select: {
                    id: true,
                    username: true,
                    nickname: true,
                    avatar: true,
                    address: true,
                },
            },
            receiver: {
                select: {
                    id: true,
                    username: true,
                    nickname: true,
                },
            },
        },
    });
}
