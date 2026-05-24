import { query, request, summary, tags, prefix } from 'koa-swagger-decorator';
import type { Context } from 'koa';
import type { ArticleReportListQuery, ArticleReportQuery } from '@blog/shared';
import { articleReportService } from '../../../services/blog/article-report';
import { Response } from '../../../utils/response';
import { ControllerErrorHandler, RequirePermission } from '../../../utils/decorators';

const tag = tags(['文章报表']);
const requireArticleReportPermission = RequirePermission({ permissions: 'article_report' });

const parseBaseQuery = (ctx: Context): ArticleReportQuery => {
    const { startDate, endDate, authorId, tagId, keyword } = ctx.query as {
        startDate?: string;
        endDate?: string;
        authorId?: string;
        tagId?: string;
        keyword?: string;
    };

    return {
        startDate,
        endDate,
        authorId: authorId ? Number(authorId) : undefined,
        tagId: tagId ? Number(tagId) : undefined,
        keyword: keyword?.trim() || undefined,
    };
};

const parseListQuery = (ctx: Context): ArticleReportListQuery => {
    const { cursor, limit, sortBy, sortOrder } = ctx.query as {
        cursor?: string;
        limit?: string;
        sortBy?: ArticleReportListQuery['sortBy'];
        sortOrder?: ArticleReportListQuery['sortOrder'];
    };

    return {
        ...parseBaseQuery(ctx),
        cursor,
        limit: limit ? Number(limit) : undefined,
        sortBy,
        sortOrder,
    };
};

@prefix('/blog/article-report')
export default class ArticleReportController {
    @request('get', '/')
    @summary('获取文章报表')
    @tag
    @query({
        startDate: { type: 'string', required: false },
        endDate: { type: 'string', required: false },
        authorId: { type: 'number', required: false },
        tagId: { type: 'number', required: false },
        keyword: { type: 'string', required: false },
    })
    @requireArticleReportPermission
    @ControllerErrorHandler
    async getReport(ctx: Context) {
        const result = await articleReportService.getReport(parseBaseQuery(ctx));
        ctx.body = Response.success(result, '获取文章报表成功');
    }

    @request('get', '/overview')
    @summary('获取文章报表总览')
    @tag
    @query({
        startDate: { type: 'string', required: false },
        endDate: { type: 'string', required: false },
        authorId: { type: 'number', required: false },
        tagId: { type: 'number', required: false },
        keyword: { type: 'string', required: false },
    })
    @requireArticleReportPermission
    @ControllerErrorHandler
    async getOverview(ctx: Context) {
        const result = await articleReportService.getOverview(parseBaseQuery(ctx));
        ctx.body = Response.success(result, '获取文章报表总览成功');
    }

    @request('get', '/articles')
    @summary('获取文章报表文章清单')
    @tag
    @query({
        startDate: { type: 'string', required: false },
        endDate: { type: 'string', required: false },
        authorId: { type: 'number', required: false },
        tagId: { type: 'number', required: false },
        keyword: { type: 'string', required: false },
        cursor: { type: 'string', required: false },
        limit: { type: 'number', required: false },
        sortBy: { type: 'string', required: false },
        sortOrder: { type: 'string', required: false },
    })
    @requireArticleReportPermission
    @ControllerErrorHandler
    async getArticleList(ctx: Context) {
        const result = await articleReportService.getArticleList(parseListQuery(ctx));
        ctx.body = Response.success(result, '获取文章表现清单成功');
    }

    @request('get', '/articles/:articleId/trend')
    @summary('获取文章报表单篇趋势')
    @tag
    @query({
        startDate: { type: 'string', required: false },
        endDate: { type: 'string', required: false },
        authorId: { type: 'number', required: false },
        tagId: { type: 'number', required: false },
        keyword: { type: 'string', required: false },
    })
    @requireArticleReportPermission
    @ControllerErrorHandler
    async getArticleTrend(ctx: Context) {
        const articleId = String(ctx.params.articleId || '');
        const result = await articleReportService.getArticleTrend(articleId, parseBaseQuery(ctx));
        ctx.body = Response.success(result, '获取单篇文章趋势成功');
    }
}

export const articleReportController = new ArticleReportController();
