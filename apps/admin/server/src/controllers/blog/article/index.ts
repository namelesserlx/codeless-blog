import { request, summary, tags, prefix, body, query } from 'koa-swagger-decorator';
import type { Context } from 'koa';
import { Response } from '../../../utils/response';
import { articleService } from '../../../services/blog/article';
import type {
    ArticleListRequest,
    CreateArticleRequest,
    UpdateArticleRequest,
    ArticleDetailResponse,
    ArticleBatchOperationRequest,
    GenerateSummaryRequest,
} from '@blog/shared';
import { ControllerErrorHandler, RequirePermission } from '../../../utils/decorators';
import { parseOptionalBoolean } from '../../../utils/query';

const tag = tags(['文章管理']);
const requireArticlePermission = RequirePermission({ permissions: 'article' });
const requireArticleWritePermission = RequirePermission({ permissions: 'article:write' });

interface ArticlePreviewRequestBody {
    article: ArticleDetailResponse;
}

@prefix('/blog/articles')
export default class ArticleController {
    @request('get', '/list')
    @summary('获取文章列表')
    @tag
    @query({
        page: { type: 'number', required: false, default: 1 },
        pageSize: { type: 'number', required: false, default: 10 },
        keyword: { type: 'string', required: false },
        title: { type: 'string', required: false },
        authorId: { type: 'number', required: false },
        published: { type: 'boolean', required: false },
        isDraft: { type: 'boolean', required: false },
        cardType: { type: 'string', required: false },
        startTime: { type: 'string', required: false },
        endTime: { type: 'string', required: false },
    })
    @requireArticlePermission
    @ControllerErrorHandler
    async getArticleList(ctx: Context) {
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
        } = ctx.query as unknown as ArticleListRequest;

        const filter: ArticleListRequest = {
            page: Number(page) || 1,
            pageSize: Number(pageSize) || 10,
            keyword: keyword,
            title: title,
            authorId: authorId ? Number(authorId) : undefined,
            published: parseOptionalBoolean(published),
            isDraft: parseOptionalBoolean(isDraft),
            cardType: cardType,
            startTime: startTime,
            endTime: endTime,
        };

        const result = await articleService.getArticleList(filter);
        ctx.body = Response.success(result, '获取文章列表成功');
    }

    @request('get', '/detail/:id')
    @summary('获取文章详情')
    @tag
    @requireArticlePermission
    @ControllerErrorHandler
    async getArticleDetail(ctx: Context) {
        const id = ctx.params.id;
        const result = await articleService.getArticleDetail(id);
        ctx.body = Response.success(result, '获取文章详情成功');
    }

    @request('get', '/preview/:token')
    @summary('获取文章预览数据')
    @tag
    @ControllerErrorHandler
    async getArticlePreview(ctx: Context) {
        const token = ctx.params.token;
        const result = await articleService.getArticlePreview(token);
        ctx.body = Response.success(result, '获取文章预览成功');
    }

    @request('post', '/draft')
    @summary('预创建草稿')
    @tag
    @requireArticleWritePermission
    @ControllerErrorHandler
    async createDraft(ctx: Context) {
        const userId = ctx.state.user?.id;
        const result = await articleService.createDraft(userId);
        ctx.body = Response.success(result, '草稿创建成功');
    }

    @request('post', '/create')
    @summary('创建文章')
    @tag
    @body({
        title: { type: 'string', required: true },
        content: { type: 'string', required: true },
        published: { type: 'boolean', required: false },
        isDraft: { type: 'boolean', required: false },
        allowComments: { type: 'boolean', required: false },
        cardType: { type: 'string', required: false },
        cardImageUrl: { type: 'string', required: false },
        tagIds: { type: 'array', required: false },
    })
    @requireArticleWritePermission
    @ControllerErrorHandler
    async createArticle(ctx: Context) {
        const data = ctx.request.body as CreateArticleRequest;
        const userId = ctx.state.user?.id;

        const result = await articleService.createArticleForUser(userId, data);
        ctx.body = Response.success(result, '创建文章成功');
    }

    @request('post', '/update')
    @summary('更新文章')
    @tag
    @body({
        id: { type: 'string', required: true },
        title: { type: 'string', required: false },
        content: { type: 'string', required: false },
        published: { type: 'boolean', required: false },
        isDraft: { type: 'boolean', required: false },
        allowComments: { type: 'boolean', required: false },
        cardType: { type: 'string', required: false },
        cardImageUrl: { type: 'string', required: false },
        tagIds: { type: 'array', required: false },
    })
    @requireArticleWritePermission
    @ControllerErrorHandler
    async updateArticle(ctx: Context) {
        const data = ctx.request.body as UpdateArticleRequest;
        const result = await articleService.updateArticleForUser(ctx.state.user?.id, data);
        ctx.body = Response.success(result, '更新文章成功');
    }

    @request('post', '/preview')
    @summary('创建文章预览')
    @tag
    @body({
        article: { type: 'object', required: true },
    })
    @requireArticleWritePermission
    @ControllerErrorHandler
    async createArticlePreview(ctx: Context) {
        const data = ctx.request.body as ArticlePreviewRequestBody;
        const result = await articleService.createArticlePreview(data);
        ctx.body = Response.success(result, '创建文章预览成功');
    }

    @request('post', '/delete')
    @summary('删除文章')
    @tag
    @body({
        id: { type: 'string', required: true },
    })
    @requireArticlePermission
    @ControllerErrorHandler
    async deleteArticle(ctx: Context) {
        const { id } = ctx.request.body as { id: string };
        await articleService.deleteArticleForUser(ctx.state.user?.id, id);
        ctx.body = Response.success(null, '删除文章成功');
    }

    @request('post', '/batch')
    @summary('批量操作文章')
    @tag
    @body({
        ids: { type: 'array', required: true },
        action: { type: 'string', required: true },
    })
    @requireArticlePermission
    @ControllerErrorHandler
    async batchOperateArticles(ctx: Context) {
        const data = ctx.request.body as ArticleBatchOperationRequest;
        await articleService.batchOperateArticlesForUser(ctx.state.user?.id, data);
        ctx.body = Response.success(null, '批量操作成功');
    }

    @request('get', '/stats')
    @summary('获取文章统计信息')
    @tag
    @requireArticlePermission
    @ControllerErrorHandler
    async getArticleStats(ctx: Context) {
        const result = await articleService.getArticleStats();
        ctx.body = Response.success(result, '获取统计信息成功');
    }

    @request('get', '/tags')
    @summary('获取标签选项')
    @tag
    @requireArticlePermission
    @ControllerErrorHandler
    async getTagOptions(ctx: Context) {
        const result = await articleService.getTagOptions();
        ctx.body = Response.success(result, '获取标签选项成功');
    }

    @request('get', '/authors')
    @summary('获取作者选项')
    @tag
    @requireArticlePermission
    @ControllerErrorHandler
    async getAuthorOptions(ctx: Context) {
        const result = await articleService.getAuthorOptions();
        ctx.body = Response.success(result, '获取作者选项成功');
    }

    @request('post', '/generate-summary')
    @summary('生成文章摘要')
    @tag
    @body({
        content: { type: 'string', required: true },
    })
    @requireArticleWritePermission
    @ControllerErrorHandler
    async generateSummary(ctx: Context) {
        const data = ctx.request.body as GenerateSummaryRequest;
        const result = await articleService.generateSummary(data);
        ctx.body = Response.success(result, '生成摘要成功');
    }

    @request('get', '/options')
    @summary('文章下拉列表')
    @tag
    @requireArticlePermission
    @ControllerErrorHandler
    async getArticleOptions(ctx: Context) {
        const result = await articleService.getArticleOptions();
        ctx.body = Response.success(result, '获取文章下拉列表成功');
    }

    @request('get', '/export-all')
    @summary('导出所有文章配置')
    @tag
    @requireArticlePermission
    @ControllerErrorHandler
    async exportAllArticles(ctx: Context) {
        const result = await articleService.exportAllArticlesForUser(ctx.state.user?.id);
        ctx.body = Response.success(result, '导出所有文章成功');
    }

    @request('post', '/export')
    @summary('批量导出文章配置')
    @tag
    @body({
        ids: { type: 'array', required: true },
    })
    @requireArticlePermission
    @ControllerErrorHandler
    async exportArticles(ctx: Context) {
        const { ids } = ctx.request.body as { ids: string[] };
        const result = await articleService.exportArticlesForUser(ctx.state.user?.id, ids);
        ctx.body = Response.success(result, '导出文章成功');
    }

    @request('post', '/import')
    @summary('批量导入文章配置')
    @tag
    @body({
        articles: { type: 'array', required: true },
    })
    @requireArticlePermission
    @ControllerErrorHandler
    async importArticles(ctx: Context) {
        const data = ctx.request.body as Parameters<typeof articleService.importArticles>[1];
        const result = await articleService.importArticlesForUser(ctx.state.user?.id, data);
        ctx.body = Response.success(result, '导入文章成功');
    }

    @request('post', '/reindex-search')
    @summary('重新索引所有文章到搜索引擎')
    @tag
    @requireArticlePermission
    @ControllerErrorHandler
    async reindexSearch(ctx: Context) {
        await articleService.reindexSearchForUser(ctx.state.user?.id);
        ctx.body = Response.success(null, '重新索引成功');
    }
}

export const articleController = new ArticleController();
