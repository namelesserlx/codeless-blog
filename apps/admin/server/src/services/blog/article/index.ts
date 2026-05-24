import { prisma, type CardType as PrismaCardType } from '@blog/db';
import type {
    ArticleListRequest,
    ArticleListItem,
    ArticleListResponse,
    CreateArticleRequest,
    UpdateArticleRequest,
    ArticleDetailResponse,
    ArticleBatchOperationRequest,
    ArticleStatsResponse,
    TagOption,
    AuthorOption,
    CardType as SharedCardType,
    GenerateSummaryRequest,
    GenerateSummaryResponse,
    ArticleOption,
} from '@blog/shared';
import deepSeekClient from '../../../utils/deepseek';
import { ServiceErrorHandler, TraceSpan } from '../../../utils/decorators';
import { runWithSpan } from '../../../telemetry/tracing';
import { logger } from '../../../utils/logger';
import { articleSearchService } from '../../search/article';
import { createArticlePreviewSession, getArticlePreviewSession } from './preview';
import {
    BusinessError,
    ErrorCode,
    NotFoundError,
    PermissionError,
    ValidationError,
} from '../../../types/errors';
import { globalService } from '../../global';
import { PermissionCacheService } from '../../../utils/auth';

const ARTICLE_WRITE_PERMISSION = 'article:write';
const ARTICLE_MANAGE_PERMISSION = 'article:manage';

/** 从 HTML 内容中提取所有媒体文件 URL */
function extractMediaUrls(content: string): string[] {
    if (!content) return [];
    const urls: string[] = [];
    // 匹配 <img src="...">, <video src="...">, <source src="...">
    const regex = /<(?:img|video|source|audio)\s[^>]*?src\s*=\s*["']([^"']+)["'][^>]*>/gi;
    let match: RegExpExecArray | null;
    while ((match = regex.exec(content)) !== null) {
        urls.push(match[1]);
    }
    return urls;
}

/** 对比新旧内容/URL 列表，返回需要删除的 URL */
function findRemovedUrls(oldUrls: string[], newUrls: string[]): string[] {
    const newSet = new Set(newUrls);
    return oldUrls.filter((url) => !newSet.has(url));
}

// 类型转换函数
function prismaCardTypeToSharedCardType(cardType: PrismaCardType): SharedCardType {
    return cardType as unknown as SharedCardType;
}

function sharedCardTypeToPrismaCardType(cardType: SharedCardType): PrismaCardType {
    return cardType as unknown as PrismaCardType;
}

// 完整的文章数据转换函数
type PostFindManyArgs = NonNullable<Parameters<typeof prisma.post.findMany>[0]>;
type PostWhereInput = NonNullable<PostFindManyArgs['where']>;

interface ArticleRecordWithRelations {
    id: string;
    title: string;
    content: string;
    summary?: string | null;
    published: boolean;
    isDraft: boolean;
    allowComments: boolean;
    cardType: PrismaCardType;
    cardImageUrl?: string | null;
    authorId: number;
    createdAt: Date;
    updatedAt: Date;
    author: ArticleDetailResponse['author'];
    tags: ArticleDetailResponse['tags'];
}

type ArticleListRecordWithRelations = Omit<ArticleRecordWithRelations, 'content'>;

function transformArticleData(article: ArticleRecordWithRelations): ArticleDetailResponse {
    return {
        id: article.id,
        title: article.title,
        content: article.content,
        summary: article.summary ?? undefined,
        published: article.published,
        isDraft: article.isDraft,
        allowComments: article.allowComments,
        cardType: prismaCardTypeToSharedCardType(article.cardType),
        cardImageUrl: article.cardImageUrl ?? undefined,
        authorId: article.authorId,
        author: article.author,
        tags: article.tags,
        createdAt: article.createdAt.toISOString(),
        updatedAt: article.updatedAt.toISOString(),
    };
}

function transformArticleListItem(article: ArticleListRecordWithRelations): ArticleListItem {
    return {
        id: article.id,
        title: article.title,
        summary: article.summary ?? undefined,
        published: article.published,
        isDraft: article.isDraft,
        allowComments: article.allowComments,
        cardType: prismaCardTypeToSharedCardType(article.cardType),
        cardImageUrl: article.cardImageUrl ?? undefined,
        authorId: article.authorId,
        author: article.author,
        tags: article.tags,
        createdAt: article.createdAt.toISOString(),
        updatedAt: article.updatedAt.toISOString(),
    };
}

/**
 * 本服务内部使用的导出条目类型（结构与 @blog/shared 中的 ArticleExportItem 保持一致）
 */
interface ArticleExportItemInternal extends CreateArticleRequest {
    originalId: string;
    createdAt: string;
    updatedAt: string;
}

type ArticleExportResponseInternal = ArticleExportItemInternal[];

interface ArticleImportRequestInternal {
    articles: ArticleExportItemInternal[];
}

interface ArticleImportResponseInternal {
    total: number;
    successCount: number;
    failCount: number;
    results: {
        originalId: string;
        newId?: string;
        title: string;
        success: boolean;
        errorMessage?: string;
    }[];
}

interface ArticlePreviewRequestInternal {
    article: ArticleDetailResponse;
}

interface ArticlePreviewResponseInternal {
    token: string;
    expiresAt: string;
}

/**
 * 文章服务类
 */
export class ArticleService {
    private requireUserId(userId: number | undefined | null, permission: string): number {
        if (!userId) {
            throw new PermissionError(`缺少必要权限: ${permission}`);
        }

        return userId;
    }

    private async hasArticleManagePermission(userId: number | undefined | null): Promise<boolean> {
        return Boolean(
            userId &&
            (await PermissionCacheService.hasPermission(userId, ARTICLE_MANAGE_PERMISSION)),
        );
    }

    @ServiceErrorHandler
    async ensureArticleManagePermission(userId: number | undefined | null): Promise<void> {
        const operatorId = this.requireUserId(userId, ARTICLE_MANAGE_PERMISSION);

        if (!(await this.hasArticleManagePermission(operatorId))) {
            throw new PermissionError(`缺少必要权限: ${ARTICLE_MANAGE_PERMISSION}`);
        }
    }

    private async ensureCanUpdateArticle(
        userId: number | undefined | null,
        data: UpdateArticleRequest,
    ): Promise<void> {
        const operatorId = this.requireUserId(userId, ARTICLE_WRITE_PERMISSION);

        if (await this.hasArticleManagePermission(operatorId)) return;

        const currentArticle = await prisma.post.findUnique({
            where: { id: data.id },
            select: {
                authorId: true,
                published: true,
                isDraft: true,
            },
        });

        if (
            currentArticle &&
            operatorId === currentArticle.authorId &&
            !currentArticle.published &&
            currentArticle.isDraft &&
            typeof data.published !== 'boolean' &&
            typeof data.isDraft !== 'boolean'
        ) {
            return;
        }

        throw new PermissionError(`缺少必要权限: ${ARTICLE_MANAGE_PERMISSION}`);
    }

    /**
     * 获取文章列表
     */
    @ServiceErrorHandler
    async getArticleList(params: ArticleListRequest): Promise<ArticleListResponse> {
        const {
            page,
            pageSize,
            keyword,
            title,
            authorId,
            published,
            isDraft,
            cardType,
            startTime,
            endTime,
        } = params;

        // 构建查询条件
        const where: PostWhereInput = {};

        // 关键词搜索（标题或内容）
        if (keyword) {
            where.OR = [{ title: { contains: keyword } }, { content: { contains: keyword } }];
        }

        // 标题搜索
        if (title) {
            where.title = { contains: title };
        }

        // 作者筛选
        if (authorId) {
            where.authorId = authorId;
        }

        // 发布状态筛选
        if (typeof published === 'boolean') {
            where.published = published;
        }

        // 草稿状态筛选
        if (typeof isDraft === 'boolean') {
            where.isDraft = isDraft;
        }

        // 卡片类型筛选
        if (cardType) {
            where.cardType = sharedCardTypeToPrismaCardType(cardType);
        }

        // 时间范围筛选
        if (startTime || endTime) {
            const createdAt: { gte?: Date; lte?: Date } = {};
            if (startTime) {
                createdAt.gte = new Date(startTime);
            }
            if (endTime) {
                createdAt.lte = new Date(endTime);
            }
            where.createdAt = createdAt;
        }

        // 分页计算
        const skip = (page - 1) * pageSize;
        const take = pageSize;

        // 执行查询
        const [list, total] = await Promise.all([
            prisma.post.findMany({
                where,
                skip,
                take,
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
                            username: true,
                            nickname: true,
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
                },
                orderBy: {
                    createdAt: 'desc',
                },
            }),
            prisma.post.count({ where }),
        ]);

        // 转换cardType和日期字段
        const transformedList = list.map((item) => transformArticleListItem(item));

        return {
            list: transformedList,
            total,
            page,
            pageSize,
        };
    }

    /**
     * 获取文章详情
     */
    @ServiceErrorHandler
    async getArticleDetail(id: string): Promise<ArticleDetailResponse> {
        const article = await prisma.post.findUnique({
            where: { id },
            include: {
                author: {
                    select: {
                        id: true,
                        username: true,
                        nickname: true,
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
            },
        });

        if (!article) {
            throw new NotFoundError('文章不存在');
        }

        return transformArticleData(article);
    }

    /**
     * 预创建草稿（进入编辑器时调用，返回 ID 供上传使用）
     */
    @ServiceErrorHandler
    async createDraft(authorId: number): Promise<{ id: string }> {
        const draft = await prisma.post.create({
            data: {
                title: '',
                content: '',
                authorId,
                published: false,
                isDraft: true,
            },
            select: { id: true },
        });
        return { id: draft.id };
    }

    /**
     * 创建文章
     */
    @TraceSpan('article.create', (authorId: number, data: CreateArticleRequest) => ({
        'article.author.id': authorId,
        'article.has_tags': Boolean(data.tagIds?.length),
        'article.published': Boolean(data.published),
        'article.is_draft': Boolean(data.isDraft),
    }))
    @ServiceErrorHandler
    async createArticle(
        authorId: number,
        data: CreateArticleRequest,
    ): Promise<ArticleDetailResponse> {
        const { tagIds, cardType, ...articleData } = data;

        const article = await runWithSpan(
            'article.db.create',
            () =>
                prisma.post.create({
                    data: {
                        ...articleData,
                        authorId,
                        cardType: cardType ? sharedCardTypeToPrismaCardType(cardType) : undefined,
                        // 连接标签
                        tags: tagIds
                            ? {
                                  connect: tagIds.map((id) => ({ id })),
                              }
                            : undefined,
                    },
                    include: {
                        author: {
                            select: {
                                id: true,
                                username: true,
                                nickname: true,
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
                    },
                }),
            {
                'article.author.id': authorId,
                'article.tag.count': tagIds?.length || 0,
            },
        );

        // 同步到搜索引擎
        try {
            await runWithSpan(
                'article.search.sync',
                () => articleSearchService.indexArticle(article.id),
                {
                    'article.search.action': 'index',
                    'article.has_id': Boolean(article.id),
                },
            );
        } catch (error) {
            logger.warn('同步文章到搜索引擎失败，但不阻断创建流程', {
                articleId: article.id,
                error,
            });
            // 不阻断主流程
        }

        return transformArticleData(article);
    }

    @ServiceErrorHandler
    async createArticleForUser(
        authorId: number | undefined | null,
        data: CreateArticleRequest,
    ): Promise<ArticleDetailResponse> {
        const operatorId = this.requireUserId(authorId, ARTICLE_WRITE_PERMISSION);
        const createData = { ...data };

        if (!(await this.hasArticleManagePermission(operatorId))) {
            createData.published = false;
            createData.isDraft = true;
        }

        return this.createArticle(operatorId, createData);
    }

    /**
     * 更新文章
     */
    @TraceSpan('article.update', (data: UpdateArticleRequest) => ({
        'article.has_id': Boolean(data.id),
        'article.has_tags': Boolean(data.tagIds?.length),
        'article.published': Boolean(data.published),
        'article.is_draft': Boolean(data.isDraft),
    }))
    @ServiceErrorHandler
    async updateArticle(data: UpdateArticleRequest): Promise<ArticleDetailResponse> {
        const { id, tagIds, cardType, ...updateData } = data;

        // 检查文章是否存在
        const existingArticle = await runWithSpan(
            'article.db.detail',
            () =>
                prisma.post.findUnique({
                    where: { id },
                }),
            {
                'article.has_id': Boolean(id),
            },
        );

        if (!existingArticle) {
            throw new NotFoundError('文章不存在');
        }

        // 清理旧文件：对比新旧内容中的媒体 URL 和卡片图
        const oldMediaUrls = extractMediaUrls(existingArticle.content);
        const oldCardUrl = existingArticle.cardImageUrl ? [existingArticle.cardImageUrl] : [];
        const newMediaUrls =
            updateData.content !== undefined
                ? extractMediaUrls(String(updateData.content))
                : oldMediaUrls;
        const newCardUrl =
            updateData.cardImageUrl !== undefined
                ? updateData.cardImageUrl
                    ? [String(updateData.cardImageUrl)]
                    : []
                : oldCardUrl;
        const removedUrls = findRemovedUrls(
            [...oldMediaUrls, ...oldCardUrl],
            [...newMediaUrls, ...newCardUrl],
        );

        const article = await runWithSpan(
            'article.db.update',
            () =>
                prisma.post.update({
                    where: { id },
                    data: {
                        ...updateData,
                        cardType: cardType ? sharedCardTypeToPrismaCardType(cardType) : undefined,
                        // 更新标签关联
                        tags: tagIds
                            ? {
                                  set: tagIds.map((tagId) => ({ id: tagId })),
                              }
                            : undefined,
                    },
                    include: {
                        author: {
                            select: {
                                id: true,
                                username: true,
                                nickname: true,
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
                    },
                }),
            {
                'article.has_id': Boolean(id),
                'article.tag.count': tagIds?.length || 0,
            },
        );

        if (removedUrls.length > 0) {
            globalService.deleteFiles(removedUrls).catch(() => {});
        }

        // 同步到搜索引擎
        try {
            await runWithSpan(
                'article.search.sync',
                () => articleSearchService.indexArticle(article.id),
                {
                    'article.search.action': 'index',
                    'article.has_id': Boolean(article.id),
                },
            );
        } catch (error) {
            logger.warn('同步文章到搜索引擎失败，但不阻断更新流程', {
                articleId: article.id,
                error,
            });
            // 不阻断主流程
        }

        return transformArticleData(article);
    }

    @ServiceErrorHandler
    async updateArticleForUser(
        userId: number | undefined | null,
        data: UpdateArticleRequest,
    ): Promise<ArticleDetailResponse> {
        await this.ensureCanUpdateArticle(userId, data);
        return this.updateArticle(data);
    }

    @ServiceErrorHandler
    async createArticlePreview(
        data: ArticlePreviewRequestInternal,
    ): Promise<ArticlePreviewResponseInternal> {
        return await createArticlePreviewSession(data.article);
    }

    @ServiceErrorHandler
    async getArticlePreview(token: string): Promise<ArticleDetailResponse> {
        const article = await getArticlePreviewSession(token);

        if (!article) {
            throw new NotFoundError('预览内容不存在或已过期');
        }

        return article;
    }

    /**
     * 删除文章
     */
    @TraceSpan('article.delete', (id: string) => ({
        'article.has_id': Boolean(id),
    }))
    @ServiceErrorHandler
    async deleteArticle(id: string): Promise<void> {
        const existingArticle = await runWithSpan(
            'article.db.detail',
            () =>
                prisma.post.findUnique({
                    where: { id },
                }),
            {
                'article.has_id': Boolean(id),
            },
        );

        if (!existingArticle) {
            throw new NotFoundError('文章不存在');
        }

        const mediaUrls = extractMediaUrls(existingArticle.content);
        if (existingArticle.cardImageUrl) {
            mediaUrls.push(existingArticle.cardImageUrl);
        }

        await runWithSpan(
            'article.db.delete',
            () =>
                prisma.post.delete({
                    where: { id },
                }),
            {
                'article.has_id': Boolean(id),
            },
        );

        if (mediaUrls.length > 0) {
            globalService.deleteFiles(mediaUrls).catch(() => {});
        }

        // 从搜索引擎中删除
        try {
            await runWithSpan('article.search.sync', () => articleSearchService.deleteArticle(id), {
                'article.search.action': 'delete',
                'article.has_id': Boolean(id),
            });
        } catch (error) {
            logger.warn('从搜索引擎删除文章失败，但不阻断删除流程', {
                articleId: id,
                error,
            });
        }
    }

    @ServiceErrorHandler
    async deleteArticleForUser(userId: number | undefined | null, id: string): Promise<void> {
        await this.ensureArticleManagePermission(userId);
        await this.deleteArticle(id);
    }

    /**
     * 批量操作文章
     */
    @TraceSpan('article.batch', (data: ArticleBatchOperationRequest) => ({
        'article.batch.count': data.ids.length,
        'article.batch.action': data.action,
    }))
    @ServiceErrorHandler
    async batchOperateArticles(data: ArticleBatchOperationRequest): Promise<void> {
        const { ids, action } = data;

        // 检查文章是否存在
        const existingArticles = await runWithSpan(
            'article.db.list',
            () =>
                prisma.post.findMany({
                    where: { id: { in: ids } },
                    select: { id: true },
                }),
            {
                'article.batch.count': ids.length,
                'article.batch.action': action,
            },
        );

        if (existingArticles.length !== ids.length) {
            throw new NotFoundError('部分文章不存在');
        }

        // 根据操作类型执行不同的更新
        const updateData: { published?: boolean; isDraft?: boolean } = {};
        switch (action) {
            case 'delete':
                await runWithSpan(
                    'article.batch.db.apply',
                    () =>
                        prisma.post.deleteMany({
                            where: { id: { in: ids } },
                        }),
                    {
                        'article.batch.count': ids.length,
                        'article.batch.action': action,
                    },
                );
                // 从搜索引擎批量删除
                try {
                    await runWithSpan(
                        'article.search.sync',
                        () => articleSearchService.deleteArticles(ids),
                        {
                            'article.search.action': 'delete_batch',
                            'article.batch.count': ids.length,
                        },
                    );
                } catch (error) {
                    logger.warn('批量删除搜索索引失败，但不阻断批量删除流程', {
                        articleIds: ids,
                        error,
                    });
                }
                return;
            case 'publish':
                updateData.published = true;
                updateData.isDraft = false;
                break;
            case 'unpublish':
                updateData.published = false;
                break;
            case 'draft':
                updateData.isDraft = true;
                updateData.published = false;
                break;
            case 'undraft':
                updateData.isDraft = false;
                break;
            default:
                throw new BusinessError(ErrorCode.UNSUPPORTED_OPERATION, '不支持的操作类型');
        }

        await runWithSpan(
            'article.batch.db.apply',
            () =>
                prisma.post.updateMany({
                    where: { id: { in: ids } },
                    data: updateData,
                }),
            {
                'article.batch.count': ids.length,
                'article.batch.action': action,
            },
        );

        // 批量更新搜索索引
        try {
            await runWithSpan(
                'article.search.sync',
                () => articleSearchService.indexArticles(ids),
                {
                    'article.search.action': 'index_batch',
                    'article.batch.count': ids.length,
                },
            );
        } catch (error) {
            logger.warn('批量更新搜索索引失败，但不阻断批量操作流程', {
                articleIds: ids,
                error,
            });
        }
    }

    @ServiceErrorHandler
    async batchOperateArticlesForUser(
        userId: number | undefined | null,
        data: ArticleBatchOperationRequest,
    ): Promise<void> {
        await this.ensureArticleManagePermission(userId);
        await this.batchOperateArticles(data);
    }

    /**
     * 获取文章统计信息
     */
    @ServiceErrorHandler
    async getArticleStats(): Promise<ArticleStatsResponse> {
        const [total, published, draft, unpublished] = await Promise.all([
            prisma.post.count(),
            prisma.post.count({ where: { published: true } }),
            prisma.post.count({ where: { isDraft: true } }),
            prisma.post.count({ where: { published: false, isDraft: false } }),
        ]);

        return {
            total,
            published,
            draft,
            unpublished,
        };
    }

    /**
     * 获取标签选项
     */
    @ServiceErrorHandler
    async getTagOptions(): Promise<TagOption[]> {
        const tags = await prisma.tag.findMany({
            select: {
                id: true,
                name: true,
            },
            orderBy: {
                name: 'asc',
            },
        });

        return tags;
    }

    /**
     * 获取作者选项
     */
    @ServiceErrorHandler
    async getAuthorOptions(): Promise<AuthorOption[]> {
        const authors = await prisma.user.findMany({
            where: {
                status: 'ACTIVE',
            },
            select: {
                id: true,
                username: true,
                nickname: true,
            },
            orderBy: {
                username: 'asc',
            },
        });

        return authors;
    }

    /**
     * 生成文章摘要
     */
    @TraceSpan('article.summary.generate', (data: GenerateSummaryRequest) => ({
        'article.summary.content_length': data.content?.length || 0,
        'article.summary.model': data.model || 'deepseek-v4-flash',
    }))
    @ServiceErrorHandler
    async generateSummary(data: GenerateSummaryRequest): Promise<GenerateSummaryResponse> {
        const { content, model = 'deepseek-v4-flash' } = data;

        if (!content || content.trim().length === 0) {
            throw new ValidationError('文章内容不能为空');
        }

        const summary = await runWithSpan(
            'article.summary.deepseek',
            () => deepSeekClient.generateSummary(content, model),
            {
                'article.summary.content_length': content.length,
                'article.summary.model': model,
            },
        );

        return {
            summary,
        };
    }

    /**
     * 文章下拉列表
     */
    @ServiceErrorHandler
    async getArticleOptions(): Promise<ArticleOption[]> {
        const articles = await prisma.post.findMany({
            select: { id: true, title: true },
        });
        return articles.map((article) => ({
            articleId: article.id,
            articleTitle: article.title,
        }));
    }

    /**
     * 导出所有文章为 JSON 配置
     */
    @ServiceErrorHandler
    async exportAllArticles(): Promise<ArticleExportResponseInternal> {
        const articles = await prisma.post.findMany({
            include: {
                tags: {
                    select: {
                        id: true,
                        name: true,
                    },
                },
            },
            orderBy: {
                createdAt: 'desc',
            },
        });

        const exportItems: ArticleExportResponseInternal = articles.map((article) => ({
            originalId: article.id,
            title: article.title,
            content: article.content,
            summary: article.summary ?? undefined,
            published: article.published,
            isDraft: article.isDraft,
            allowComments: article.allowComments,
            cardType: prismaCardTypeToSharedCardType(article.cardType),
            cardImageUrl: article.cardImageUrl ?? undefined,
            tagIds: article.tags?.map((tag) => tag.id) ?? [],
            createdAt: article.createdAt.toISOString(),
            updatedAt: article.updatedAt.toISOString(),
        }));

        return exportItems;
    }

    @ServiceErrorHandler
    async exportAllArticlesForUser(
        userId: number | undefined | null,
    ): Promise<ArticleExportResponseInternal> {
        await this.ensureArticleManagePermission(userId);
        return this.exportAllArticles();
    }

    /**
     * 批量导出文章为 JSON 配置
     */
    @ServiceErrorHandler
    async exportArticles(ids: string[]): Promise<ArticleExportResponseInternal> {
        if (!ids || ids.length === 0) {
            return [];
        }

        const articles = await prisma.post.findMany({
            where: { id: { in: ids } },
            include: {
                tags: {
                    select: {
                        id: true,
                        name: true,
                    },
                },
            },
            orderBy: {
                createdAt: 'desc',
            },
        });

        // 转换为导出配置格式
        const exportItems: ArticleExportResponseInternal = articles.map((article) => ({
            originalId: article.id,
            title: article.title,
            content: article.content,
            summary: article.summary ?? undefined,
            published: article.published,
            isDraft: article.isDraft,
            allowComments: article.allowComments,
            cardType: prismaCardTypeToSharedCardType(article.cardType),
            cardImageUrl: article.cardImageUrl ?? undefined,
            tagIds: article.tags?.map((tag) => tag.id) ?? [],
            createdAt: article.createdAt.toISOString(),
            updatedAt: article.updatedAt.toISOString(),
        }));

        return exportItems;
    }

    @ServiceErrorHandler
    async exportArticlesForUser(
        userId: number | undefined | null,
        ids: string[],
    ): Promise<ArticleExportResponseInternal> {
        await this.ensureArticleManagePermission(userId);
        return this.exportArticles(ids);
    }

    /**
     * 批量导入文章 JSON 配置
     */
    @ServiceErrorHandler
    async importArticles(
        authorId: number,
        data: ArticleImportRequestInternal,
    ): Promise<ArticleImportResponseInternal> {
        const { articles } = data;

        if (!articles || articles.length === 0) {
            return {
                total: 0,
                successCount: 0,
                failCount: 0,
                results: [],
            };
        }

        const results = [];

        for (const article of articles) {
            const {
                originalId,
                createdAt: _createdAt,
                updatedAt: _updatedAt,
                ...createData
            } = article;
            void _createdAt;
            void _updatedAt;

            try {
                // 复用已有的创建逻辑，确保行为一致
                const created = await this.createArticle(authorId, createData);

                results.push({
                    originalId,
                    newId: created.id,
                    title: created.title,
                    success: true,
                });
            } catch (error: unknown) {
                const message = error instanceof Error ? error.message : '导入失败';
                results.push({
                    originalId,
                    newId: undefined,
                    title: article.title,
                    success: false,
                    errorMessage: message,
                });
            }
        }

        const total = results.length;
        const successCount = results.filter((item) => item.success).length;
        const failCount = total - successCount;

        return {
            total,
            successCount,
            failCount,
            results,
        };
    }

    @ServiceErrorHandler
    async importArticlesForUser(
        userId: number | undefined | null,
        data: ArticleImportRequestInternal,
    ): Promise<ArticleImportResponseInternal> {
        const operatorId = this.requireUserId(userId, ARTICLE_MANAGE_PERMISSION);
        await this.ensureArticleManagePermission(operatorId);
        return this.importArticles(operatorId, data);
    }

    @ServiceErrorHandler
    async reindexSearchForUser(userId: number | undefined | null): Promise<void> {
        await this.ensureArticleManagePermission(userId);
        await articleSearchService.reindexAll();
    }
}

// 导出服务实例
export const articleService = new ArticleService();
