import { SwaggerRouter, request, summary, tags, prefix, body, query } from 'koa-swagger-decorator';
import type { Context } from 'koa';
import { Response } from '../../../utils/response';
import { tagService } from '../../../services/blog/tag';
import { TagListRequest, CreateTagRequest, UpdateTagRequest } from '@blog/shared';
import { ControllerErrorHandler, RequirePermission } from '../../../utils/decorators';

const tag = tags(['标签管理']);
const requireTagPermission = RequirePermission({ permissions: 'tag' });
const requireTagEditPermission = RequirePermission({ permissions: ['tag', 'tag:edit'] });

@prefix('/blog/tags')
export default class TagController {
    @request('get', '/list')
    @summary('获取标签列表')
    @tag
    @query({
        page: { type: 'number', required: false, default: 1 },
        pageSize: { type: 'number', required: false, default: 10 },
        name: { type: 'string', required: false },
    })
    @requireTagPermission
    @ControllerErrorHandler
    async getTagList(ctx: Context) {
        const { page, pageSize, name } = ctx.query as unknown as TagListRequest;
        const filter: TagListRequest = {
            page: Number(page),
            pageSize: Number(pageSize),
            name: name,
        };
        const result = await tagService.getTagList(filter);
        ctx.body = Response.success(result);
    }

    @request('get', '/detail/:id')
    @summary('获取标签详情')
    @tag
    @requireTagPermission
    @ControllerErrorHandler
    async getTagDetail(ctx: Context) {
        const id = parseInt(ctx.params.id);
        const result = await tagService.getTagDetail(id);
        ctx.body = Response.success(result);
    }

    @request('post', '/create')
    @summary('创建标签')
    @tag
    @body({
        name: { type: 'string', required: true },
    })
    @requireTagEditPermission
    @ControllerErrorHandler
    async createTag(ctx: Context) {
        const data = ctx.request.body as CreateTagRequest;
        const result = await tagService.createTag(data);
        ctx.body = Response.success(result, '标签创建成功');
    }

    @request('post', '/update')
    @summary('更新标签')
    @tag
    @body({
        id: { type: 'number', required: true },
        name: { type: 'string', required: true },
    })
    @requireTagEditPermission
    @ControllerErrorHandler
    async updateTag(ctx: Context) {
        const data = ctx.request.body as UpdateTagRequest;
        const result = await tagService.updateTag(data);
        ctx.body = Response.success(result, '标签更新成功');
    }

    @request('post', '/delete')
    @summary('删除标签')
    @tag
    @body({
        id: { type: 'number', required: true },
    })
    @requireTagEditPermission
    @ControllerErrorHandler
    async deleteTag(ctx: Context) {
        const { id } = ctx.request.body as { id: number };
        await tagService.deleteTag(id);
        ctx.body = Response.success(null, '标签删除成功');
    }

    @request('get', '/stats')
    @summary('获取标签统计信息')
    @tag
    @requireTagPermission
    @ControllerErrorHandler
    async getTagStats(ctx: Context) {
        const result = await tagService.getTagStats();
        ctx.body = Response.success(result);
    }

    @request('post', '/batch')
    @summary('批量操作标签')
    @tag
    @body({
        ids: { type: 'array', required: true },
        action: { type: 'string', required: true },
    })
    @requireTagEditPermission
    @ControllerErrorHandler
    async batchOperation(ctx: Context) {
        const data = ctx.request.body as {
            ids: number[];
            action: 'delete';
        };
        await tagService.batchOperation(data);
        ctx.body = Response.success(null, '批量操作成功');
    }

    @request('get', '/check-name')
    @summary('检查标签名称是否可用')
    @tag
    @requireTagPermission
    @ControllerErrorHandler
    async checkTagName(ctx: Context) {
        const { name, excludeId } = ctx.query as { name: string; excludeId?: string };
        const result = await tagService.checkTagName(
            name,
            excludeId ? parseInt(excludeId) : undefined,
        );
        ctx.body = Response.success(result);
    }
}

export const tagController = new TagController();
