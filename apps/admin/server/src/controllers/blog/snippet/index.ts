import { request, summary, tags, prefix, body, query } from 'koa-swagger-decorator';
import type { Context } from 'koa';
import { Response } from '../../../utils/response';
import { snippetService } from '../../../services/blog/snippet';
import type { SnippetListRequest, CreateSnippetRequest, UpdateSnippetRequest } from '@blog/shared';
import { ControllerErrorHandler, RequirePermission } from '../../../utils/decorators';
import { parseOptionalBoolean } from '../../../utils/query';

const tag = tags(['片段管理']);
const requireSnippetPermission = RequirePermission({ permissions: 'snippet' });
const requireSnippetEditPermission = RequirePermission({
    permissions: ['snippet', 'snippet:edit'],
});

@prefix('/blog/snippets')
export default class SnippetController {
    @request('get', '/list')
    @summary('获取片段列表')
    @tag
    @query({
        page: { type: 'number', required: false, default: 1 },
        pageSize: { type: 'number', required: false, default: 10 },
        id: { type: 'string', required: false },
        keyword: { type: 'string', required: false },
        authorId: { type: 'number', required: false },
        published: { type: 'boolean', required: false },
        isDraft: { type: 'boolean', required: false },
        startTime: { type: 'string', required: false },
        endTime: { type: 'string', required: false },
    })
    @requireSnippetPermission
    @ControllerErrorHandler
    async getSnippetList(ctx: Context) {
        const { page, pageSize, id, keyword, authorId, published, isDraft, startTime, endTime } =
            ctx.query as unknown as SnippetListRequest;

        const filter: SnippetListRequest = {
            page: Number(page) || 1,
            pageSize: Number(pageSize) || 10,
            id: id,
            keyword: keyword,
            authorId: authorId ? Number(authorId) : undefined,
            published: parseOptionalBoolean(published),
            isDraft: parseOptionalBoolean(isDraft),
            startTime: startTime,
            endTime: endTime,
        };

        const result = await snippetService.getSnippetList(filter);
        ctx.body = Response.success(result, '获取片段列表成功');
    }

    @request('post', '/create')
    @summary('创建片段')
    @tag
    @body({
        content: { type: 'string', required: true },
        published: { type: 'boolean', required: false },
        isDraft: { type: 'boolean', required: false },
        allowComments: { type: 'boolean', required: false },
        images: { type: 'array', required: false },
        video: { type: 'array', required: false },
        videoPoster: { type: 'string', required: false },
    })
    @requireSnippetEditPermission
    @ControllerErrorHandler
    async createSnippet(ctx: Context) {
        const data = ctx.request.body as CreateSnippetRequest;
        const userId = ctx.state.user?.id;

        const result = await snippetService.createSnippet(userId, data);
        ctx.body = Response.success(result, '创建片段成功');
    }

    @request('post', '/update')
    @summary('更新片段')
    @tag
    @body({
        id: { type: 'string', required: true },
        content: { type: 'string', required: false },
        published: { type: 'boolean', required: false },
        isDraft: { type: 'boolean', required: false },
        allowComments: { type: 'boolean', required: false },
        images: { type: 'array', required: false },
        video: { type: 'array', required: false },
        videoPoster: { type: 'string', required: false },
    })
    @requireSnippetEditPermission
    @ControllerErrorHandler
    async updateSnippet(ctx: Context) {
        const data = ctx.request.body as UpdateSnippetRequest;
        const result = await snippetService.updateSnippet(data);
        ctx.body = Response.success(result, '更新片段成功');
    }

    @request('post', '/delete')
    @summary('删除片段')
    @tag
    @body({
        id: { type: 'string', required: true },
    })
    @requireSnippetEditPermission
    @ControllerErrorHandler
    async deleteSnippet(ctx: Context) {
        const { id } = ctx.request.body as { id: string };
        await snippetService.deleteSnippet(id);
        ctx.body = Response.success(null, '删除片段成功');
    }

    @request('post', '/upload')
    @summary('上传文件')
    @tag
    @body({
        type: { type: 'string', required: true, default: 'image' },
        snippetId: { type: 'string', required: true },
        file: { type: 'string', required: true },
    })
    @requireSnippetEditPermission
    @ControllerErrorHandler
    async upload(ctx: Context) {
        const file = ctx.file;
        const { type, snippetId } = ctx.request.body as {
            type: 'image' | 'video';
            snippetId: string;
        };
        const fileUrl = await snippetService.upload(file, type, snippetId);
        ctx.body = Response.success({ url: fileUrl }, '上传成功');
    }
}

export const snippetController = new SnippetController();
