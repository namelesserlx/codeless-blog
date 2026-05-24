import { prisma } from '@blog/db';
import { ArticleSearchDocument, getArticlesSearchIndex } from '../../lib/meilisearch';
import { BusinessError, ErrorCode } from '../../types/errors';
import { ServiceErrorHandler, TraceSpan } from '../../utils/decorators';
import { storedEditorContentToText } from '../../utils/editor-content';
import { logger } from '../../utils/logger';

/**
 * 文章搜索服务类
 */
export class ArticleSearchService {
    private getIndex() {
        try {
            const index = getArticlesSearchIndex();
            if (!index) {
                throw new BusinessError(ErrorCode.UNKNOWN_ERROR, '搜索服务未配置');
            }

            return index;
        } catch (error) {
            if (error instanceof BusinessError) {
                throw error;
            }

            throw new BusinessError(ErrorCode.UNKNOWN_ERROR, '搜索服务未配置', {
                source: 'ArticleSearchService.getIndex',
                cause: error instanceof Error ? error.message : String(error),
            });
        }
    }

    /**
     * 将数据库文章转换为搜索文档
     */
    private transformToSearchDocument(article: any): ArticleSearchDocument {
        return {
            id: article.id,
            title: article.title,
            content: storedEditorContentToText(article.content),
            summary: article.summary,
            authorId: article.authorId,
            authorName: article.author?.username || '',
            authorNickname: article.author?.nickname || null,
            tags: article.tags || [],
            tagNames: article.tags?.map((tag: any) => tag.name) || [],
            cardImageUrl: article.cardImageUrl,
            published: article.published,
            isDraft: article.isDraft,
            allowComments: article.allowComments,
            createdAt: new Date(article.createdAt).getTime(),
            updatedAt: new Date(article.updatedAt).getTime(),
        };
    }

    /**
     * 添加或更新单篇文章到搜索索引
     */
    @TraceSpan('search.article.index.one', (articleId: string) => ({
        'search.article.has_id': Boolean(articleId),
    }))
    @ServiceErrorHandler
    async indexArticle(articleId: string): Promise<void> {
        const article = await prisma.post.findUnique({
            where: { id: articleId },
            include: {
                author: {
                    select: {
                        username: true,
                        nickname: true,
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
            logger.warn('文章不存在，跳过索引', {
                articleId,
            });
            return;
        }

        const searchDoc = this.transformToSearchDocument(article);
        await this.getIndex().addDocuments([searchDoc], { primaryKey: 'id' });

        logger.info('文章已添加到搜索索引', {
            articleId,
        });
    }

    /**
     * 从搜索索引中删除文章
     */
    @TraceSpan('search.article.delete.one', (articleId: string) => ({
        'search.article.has_id': Boolean(articleId),
    }))
    @ServiceErrorHandler
    async deleteArticle(articleId: string): Promise<void> {
        await this.getIndex().deleteDocument(articleId);
        logger.info('文章已从搜索索引中删除', {
            articleId,
        });
    }

    /**
     * 批量删除文章
     */
    @TraceSpan('search.article.delete.batch', (articleIds: string[]) => ({
        'search.article.count': articleIds.length,
    }))
    @ServiceErrorHandler
    async deleteArticles(articleIds: string[]): Promise<void> {
        await this.getIndex().deleteDocuments(articleIds);
        logger.info('批量删除文章索引完成', {
            count: articleIds.length,
        });
    }

    /**
     * 批量索引文章
     */
    @TraceSpan('search.article.index.batch', (articleIds: string[]) => ({
        'search.article.count': articleIds.length,
    }))
    @ServiceErrorHandler
    async indexArticles(articleIds: string[]): Promise<void> {
        const articles = await prisma.post.findMany({
            where: { id: { in: articleIds } },
            include: {
                author: {
                    select: {
                        username: true,
                        nickname: true,
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

        const searchDocs = articles.map((article) => this.transformToSearchDocument(article));
        await this.getIndex().addDocuments(searchDocs, { primaryKey: 'id' });

        logger.info('批量索引文章完成', {
            count: articles.length,
        });
    }

    /**
     * 重新索引所有已发布的文章
     */
    @TraceSpan('search.article.reindex')
    @ServiceErrorHandler
    async reindexAll(): Promise<void> {
        logger.info('开始重新索引所有文章');

        const articles = await prisma.post.findMany({
            include: {
                author: {
                    select: {
                        username: true,
                        nickname: true,
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

        const searchDocs = articles.map((article) => this.transformToSearchDocument(article));

        await this.getIndex().deleteAllDocuments();

        if (searchDocs.length > 0) {
            await this.getIndex().addDocuments(searchDocs, { primaryKey: 'id' });
        }

        logger.info('重新索引完成', {
            count: searchDocs.length,
        });
    }

    /**
     * 搜索文章
     */
    @TraceSpan('search.article.query', (query: string, options?: any) => ({
        'search.article.has_query': Boolean(query.trim()),
        'search.article.limit': options?.limit || 20,
    }))
    @ServiceErrorHandler
    async search(query: string, options?: any) {
        return await this.getIndex().search(query, {
            limit: options?.limit || 20,
            offset: options?.offset || 0,
            filter: options?.filter,
            sort: options?.sort,
            attributesToHighlight: ['title', 'summary', 'content'],
            highlightPreTag: '<mark>',
            highlightPostTag: '</mark>',
        });
    }
}

export const articleSearchService = new ArticleSearchService();
