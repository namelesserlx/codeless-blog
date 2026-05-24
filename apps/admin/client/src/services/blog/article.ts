import {
    ArticleListRequest,
    ArticleListResponse,
    CreateArticleRequest,
    UpdateArticleRequest,
    ArticleDetailResponse,
    ArticleBatchOperationRequest,
    ArticleStatsResponse,
    TagOption,
    AuthorOption,
    GenerateSummaryRequest,
    GenerateSummaryResponse,
    ResponseData,
    ArticleOption,
    ArticleExportResponse,
    ArticleImportRequest,
    ArticleImportResponse,
} from '@blog/shared';
import request from '@/utils/request';

interface ArticlePreviewSessionResponse {
    token: string;
    expiresAt: string;
}

/**
 * 文章管理服务
 */
export class ArticleService {
    /**
     * 获取文章列表
     */
    async getArticleList(params: ArticleListRequest): Promise<ResponseData<ArticleListResponse>> {
        return request({
            url: '/blog/articles/list',
            method: 'GET',
            params,
        });
    }

    /**
     * 获取文章详情
     */
    async getArticleDetail(id: string): Promise<ResponseData<ArticleDetailResponse>> {
        return request({
            url: `/blog/articles/detail/${id}`,
            method: 'GET',
        });
    }

    /**
     * 创建文章
     */
    async createArticle(data: CreateArticleRequest): Promise<ResponseData<ArticleDetailResponse>> {
        return request({
            url: '/blog/articles/create',
            method: 'POST',
            data,
        });
    }

    /**
     * 更新文章
     */
    async updateArticle(data: UpdateArticleRequest): Promise<ResponseData<ArticleDetailResponse>> {
        return request({
            url: `/blog/articles/update`,
            method: 'POST',
            data,
        });
    }

    /**
     * 删除文章
     */
    async deleteArticle(id: string): Promise<ResponseData<null>> {
        return request({
            url: `/blog/articles/delete`,
            method: 'POST',
            data: {
                id,
            },
        });
    }

    /**
     * 批量操作文章
     */
    async batchOperateArticles(data: ArticleBatchOperationRequest): Promise<ResponseData<null>> {
        return request({
            url: '/blog/articles/batch',
            method: 'POST',
            data,
        });
    }

    /**
     * 获取文章统计信息
     */
    async getArticleStats(): Promise<ResponseData<ArticleStatsResponse>> {
        return request({
            url: '/blog/articles/stats',
            method: 'GET',
        });
    }

    /**
     * 获取标签选项
     */
    async getTagOptions(): Promise<ResponseData<TagOption[]>> {
        return request({
            url: '/blog/articles/tags',
            method: 'GET',
        });
    }

    /**
     * 获取作者选项
     */
    async getAuthorOptions(): Promise<ResponseData<AuthorOption[]>> {
        return request({
            url: '/blog/articles/authors',
            method: 'GET',
        });
    }
    /**
     * 生成文章摘要
     */
    async generateSummary(
        data: GenerateSummaryRequest,
    ): Promise<ResponseData<GenerateSummaryResponse>> {
        return request({
            url: '/blog/articles/generate-summary',
            method: 'POST',
            data,
        });
    }

    /**
     * 文章列表（下拉查询）
     */
    async getArticleOptions(): Promise<ResponseData<ArticleOption[]>> {
        return request({
            url: '/blog/articles/options',
            method: 'GET',
        });
    }

    /**
     * 导出所有文章为 JSON 配置
     */
    async exportAllArticles(): Promise<ResponseData<ArticleExportResponse>> {
        return request({
            url: '/blog/articles/export-all',
            method: 'GET',
        });
    }

    /**
     * 批量导出文章为 JSON 配置
     */
    async exportArticles(ids: string[]): Promise<ResponseData<ArticleExportResponse>> {
        return request({
            url: '/blog/articles/export',
            method: 'POST',
            data: {
                ids,
            },
        });
    }

    /**
     * 批量导入文章 JSON 配置
     */
    async importArticles(data: ArticleImportRequest): Promise<ResponseData<ArticleImportResponse>> {
        return request({
            url: '/blog/articles/import',
            method: 'POST',
            data,
        });
    }

    /**
     * 重新索引搜索
     */
    async reindexSearch(): Promise<ResponseData<null>> {
        return request({
            url: '/blog/articles/reindex-search',
            method: 'POST',
        });
    }

    /**
     * 创建文章预览
     */
    async createPreview(
        article: ArticleDetailResponse,
    ): Promise<ResponseData<ArticlePreviewSessionResponse>> {
        return request({
            url: '/blog/articles/preview',
            method: 'POST',
            data: {
                article,
            },
        });
    }
}

// 导出服务实例
export const articleService = new ArticleService();
