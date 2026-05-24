import { SwaggerRouter, request, summary, tags, prefix, body, query } from 'koa-swagger-decorator';
import type { Context } from 'koa';
import { Response } from '../../../utils/response';
import { permissionService } from '../../../services/system/permission';
import {
    PermissionListRequest,
    CreatePermissionRequest,
    UpdatePermissionRequest,
    PermissionBatchOperationRequest,
} from '@blog/shared';
import { ControllerErrorHandler, RequirePermission } from '../../../utils/decorators';

const tag = tags(['权限管理']);
const requirePermissionManagement = RequirePermission({ permissions: 'permission' });

@prefix('/system/permissions')
export class PermissionController {
    @request('get', '/list')
    @summary('获取权限列表')
    @tag
    @query({
        page: { type: 'number', required: false, default: 1 },
        pageSize: { type: 'number', required: false, default: 10 },
        name: { type: 'string', required: false },
        code: { type: 'string', required: false },
        type: { type: 'string', required: false },
        status: { type: 'string', required: false },
        parentId: { type: 'number', required: false },
        tree: { type: 'boolean', required: false },
    })
    @requirePermissionManagement
    @ControllerErrorHandler
    async getPermissionList(ctx: Context) {
        const { page, pageSize, name, code, type, status, parentId, tree } =
            ctx.query as unknown as PermissionListRequest;

        const filter: PermissionListRequest = {
            page: page ? Number(page) : undefined,
            pageSize: pageSize ? Number(pageSize) : undefined,
            name,
            code,
            type,
            status,
            parentId: parentId ? Number(parentId) : undefined,
            tree,
        };

        const result = await permissionService.getPermissionList(filter);
        ctx.body = Response.success(result);
    }

    @request('get', '/tree')
    @summary('获取权限树')
    @tag
    @query({
        status: { type: 'string', required: false },
        type: { type: 'string', required: false },
    })
    @requirePermissionManagement
    @ControllerErrorHandler
    async getPermissionTree(ctx: Context) {
        const { status, type } = ctx.query as {
            status?: string;
            type?: string;
        };
        const result = await permissionService.getPermissionTree({ status, type });
        ctx.body = Response.success(result);
    }

    @request('get', '/detail/:id')
    @summary('获取权限详情')
    @tag
    @requirePermissionManagement
    @ControllerErrorHandler
    async getPermissionDetail(ctx: Context) {
        const id = parseInt(ctx.params.id);
        const result = await permissionService.getPermissionDetail(id);
        ctx.body = Response.success(result);
    }

    @request('post', '/create')
    @summary('创建权限')
    @tag
    @body({
        name: { type: 'string', required: true },
        code: { type: 'string', required: true },
        type: { type: 'string', required: true },
        resource: { type: 'string', required: false },
        action: { type: 'string', required: false },
        path: { type: 'string', required: false },
        component: { type: 'string', required: false },
        icon: { type: 'string', required: false },
        sort: { type: 'number', required: false },
        status: { type: 'string', required: false },
        parentId: { type: 'number', required: false },
    })
    @requirePermissionManagement
    @ControllerErrorHandler
    async createPermission(ctx: Context) {
        const data = ctx.request.body as CreatePermissionRequest;
        const result = await permissionService.createPermission(data);
        ctx.body = Response.success(result, '权限创建成功');
    }

    @request('post', '/update')
    @summary('更新权限')
    @tag
    @body({
        id: { type: 'number', required: true },
        name: { type: 'string', required: false },
        code: { type: 'string', required: false },
        type: { type: 'string', required: false },
        resource: { type: 'string', required: false },
        action: { type: 'string', required: false },
        path: { type: 'string', required: false },
        component: { type: 'string', required: false },
        icon: { type: 'string', required: false },
        sort: { type: 'number', required: false },
        status: { type: 'string', required: false },
        parentId: { type: 'number', required: false },
    })
    @requirePermissionManagement
    @ControllerErrorHandler
    async updatePermission(ctx: Context) {
        const data = ctx.request.body as UpdatePermissionRequest;
        const result = await permissionService.updatePermission(data);
        ctx.body = Response.success(result, '权限更新成功');
    }

    @request('post', '/delete')
    @summary('删除权限')
    @tag
    @body({
        id: { type: 'number', required: true },
    })
    @requirePermissionManagement
    @ControllerErrorHandler
    async deletePermission(ctx: Context) {
        const { id } = ctx.request.body as { id: number };
        await permissionService.deletePermission(id);
        ctx.body = Response.success(null, '权限删除成功');
    }

    @request('post', '/batch')
    @summary('批量操作权限')
    @tag
    @body({
        ids: { type: 'array', required: true },
        action: { type: 'string', required: true },
    })
    @requirePermissionManagement
    @ControllerErrorHandler
    async batchOperation(ctx: Context) {
        const data = ctx.request.body as PermissionBatchOperationRequest;
        await permissionService.batchOperation(data);
        ctx.body = Response.success(null, '批量操作成功');
    }

    @request('get', '/options')
    @summary('获取权限选项')
    @tag
    @query({
        type: { type: 'string', required: false },
        parentId: { type: 'number', required: false },
    })
    @requirePermissionManagement
    @ControllerErrorHandler
    async getPermissionOptions(ctx: Context) {
        const { type, parentId } = ctx.query as {
            type?: string;
            parentId?: string;
        };
        const result = await permissionService.getPermissionOptions({
            type,
            parentId: parentId ? Number(parentId) : undefined,
        });
        ctx.body = Response.success(result);
    }

    @request('get', '/stats')
    @summary('获取权限统计信息')
    @tag
    @requirePermissionManagement
    @ControllerErrorHandler
    async getPermissionStats(ctx: Context) {
        const result = await permissionService.getPermissionStats();
        ctx.body = Response.success(result);
    }

    @request('get', '/check-code')
    @summary('检查权限代码是否可用')
    @tag
    @query({
        code: { type: 'string', required: true },
        excludeId: { type: 'number', required: false },
    })
    @requirePermissionManagement
    @ControllerErrorHandler
    async checkCode(ctx: Context) {
        const { code, excludeId } = ctx.query as { code: string; excludeId?: string };
        const result = await permissionService.checkCode(
            code,
            excludeId ? parseInt(excludeId) : undefined,
        );
        ctx.body = Response.success(result);
    }
}

export const permissionController = new PermissionController();
