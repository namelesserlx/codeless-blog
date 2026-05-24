import type {
    ArticleReportArticleTrendResponse,
    ArticleReportListQuery,
    ArticleReportListResponse,
    ArticleReportOverviewResponse,
    ArticleReportQuery,
    ArticleReportResponse,
    ResponseData,
} from '@blog/shared';
import request from '@/utils/request';

/**
 * 文章报表服务
 */
export class ArticleReportService {
    /**
     * 获取兼容版文章报表
     */
    async getReport(params: ArticleReportQuery): Promise<ResponseData<ArticleReportResponse>> {
        return request<ArticleReportResponse>({
            url: '/blog/article-report',
            method: 'GET',
            params,
        });
    }

    /**
     * 获取文章报表总览
     */
    async getOverview(
        params: ArticleReportQuery,
    ): Promise<ResponseData<ArticleReportOverviewResponse>> {
        return request<ArticleReportOverviewResponse>({
            url: '/blog/article-report/overview',
            method: 'GET',
            params,
        });
    }

    /**
     * 获取文章表现清单
     */
    async getArticleList(
        params: ArticleReportListQuery,
    ): Promise<ResponseData<ArticleReportListResponse>> {
        return request<ArticleReportListResponse>({
            url: '/blog/article-report/articles',
            method: 'GET',
            params,
        });
    }

    /**
     * 获取单篇文章趋势
     */
    async getArticleTrend(
        articleId: string,
        params: ArticleReportQuery,
    ): Promise<ResponseData<ArticleReportArticleTrendResponse>> {
        return request<ArticleReportArticleTrendResponse>({
            url: `/blog/article-report/articles/${articleId}/trend`,
            method: 'GET',
            params,
        });
    }
}

export const articleReportService = new ArticleReportService();
