import { SwaggerRouter, request, summary, tags, prefix, body, query } from 'koa-swagger-decorator';
import type { Context } from 'koa';
import { Response } from '../../../utils/response';
import { roleService } from '../../../services/system/role';
import {
    RoleListRequest,
    CreateRoleRequest,
    UpdateRoleRequest,
    RoleBatchOperationRequest,
    RolePermissionAssignRequest,
    RemoveRoleUserRequest,
} from '@blog/shared';
import { ControllerErrorHandler, RequirePermission } from '../../../utils/decorators';

const tag = tags(['角色管理']);
const requireRoleManagement = RequirePermission({ permissions: 'role' });
const requireRoleCreate = RequirePermission({ permissions: 'role:create' });
const requireRoleUpdate = RequirePermission({ permissions: 'role:update' });
const requireRoleDelete = RequirePermission({ permissions: 'role:delete' });
const requireRoleAssign = RequirePermission({ permissions: 'role:assign' });

@prefix('/system/roles')
export class RoleController {
    @request('get', '/list')
    @summary('获取角色列表')
    @tag
    @query({
        page: { type: 'number', required: false, default: 1 },
        pageSize: { type: 'number', required: false, default: 10 },
        keyword: { type: 'string', required: false },
        name: { type: 'string', required: false },
        code: { type: 'string', required: false },
        status: { type: 'string', required: false },
        level: { type: 'number', required: false },
        parentId: { type: 'number', required: false },
    })
    @requireRoleManagement
    @ControllerErrorHandler
    async getRoleList(ctx: Context) {
        const { page, pageSize, name, code, status, level, parentId, keyword } =
            ctx.query as unknown as RoleListRequest;

        // 获取当前用户ID
        const userId = ctx.state.user?.id;

        const filter: RoleListRequest & { userId?: number } = {
            page: Number(page),
            pageSize: Number(pageSize),
            keyword,
            name,
            code,
            status,
            level: level ? Number(level) : undefined,
            parentId: parentId ? Number(parentId) : undefined,
            userId, // 传递用户ID用于权限过滤
        };
        const result = await roleService.getRoleList(filter);
        ctx.body = Response.success(result);
    }

    @request('get', '/detail/:id')
    @summary('获取角色详情')
    @tag
    @requireRoleManagement
    @ControllerErrorHandler
    async getRoleDetail(ctx: Context) {
        const id = parseInt(ctx.params.id);
        const result = await roleService.getRoleDetail(id);
        ctx.body = Response.success(result);
    }

    @request('post', '/create')
    @summary('创建角色')
    @tag
    @body({
        name: { type: 'string', required: true },
        code: { type: 'string', required: true },
        description: { type: 'string', required: false },
        level: { type: 'number', required: false },
        status: { type: 'string', required: false },
        parentId: { type: 'number', required: false },
        permissionIds: { type: 'array', required: false },
    })
    @requireRoleCreate
    @ControllerErrorHandler
    async createRole(ctx: Context) {
        const data = ctx.request.body as CreateRoleRequest;
        const result = await roleService.createRole(data);
        ctx.body = Response.success(result, '角色创建成功');
    }

    @request('post', '/update')
    @summary('更新角色')
    @tag
    @body({
        id: { type: 'number', required: true },
        name: { type: 'string', required: false },
        code: { type: 'string', required: false },
        description: { type: 'string', required: false },
        level: { type: 'number', required: false },
        status: { type: 'string', required: false },
        parentId: { type: 'number', required: false },
        permissionIds: { type: 'array', required: false },
    })
    @requireRoleUpdate
    @ControllerErrorHandler
    async updateRole(ctx: Context) {
        const data = ctx.request.body as UpdateRoleRequest;
        const result = await roleService.updateRole(data);
        ctx.body = Response.success(result, '角色更新成功');
    }

    @request('post', '/delete')
    @summary('删除角色')
    @tag
    @body({
        id: { type: 'number', required: true },
    })
    @requireRoleDelete
    @ControllerErrorHandler
    async deleteRole(ctx: Context) {
        const { id } = ctx.request.body as { id: number };
        await roleService.deleteRole(id);
        ctx.body = Response.success(null, '角色删除成功');
    }

    @request('post', '/batch')
    @summary('批量操作角色')
    @tag
    @body({
        ids: { type: 'array', required: true },
        action: { type: 'string', required: true },
    })
    @requireRoleUpdate
    @ControllerErrorHandler
    async batchOperation(ctx: Context) {
        const data = ctx.request.body as RoleBatchOperationRequest;
        await roleService.batchOperation(data);
        ctx.body = Response.success(null, '批量操作成功');
    }

    @request('get', '/options')
    @summary('获取角色选项')
    @tag
    @requireRoleManagement
    @ControllerErrorHandler
    async getRoleOptions(ctx: Context) {
        const result = await roleService.getRoleOptions();
        ctx.body = Response.success(result);
    }

    @request('get', '/stats')
    @summary('获取角色统计信息')
    @tag
    @requireRoleManagement
    @ControllerErrorHandler
    async getRoleStats(ctx: Context) {
        const result = await roleService.getRoleStats();
        ctx.body = Response.success(result);
    }

    @request('get', '/:id/permissions')
    @summary('获取角色权限')
    @tag
    @requireRoleManagement
    @ControllerErrorHandler
    async getRolePermissions(ctx: Context) {
        const roleId = parseInt(ctx.params.id);
        const result = await roleService.getRolePermissions(roleId);
        ctx.body = Response.success(result);
    }

    @request('get', '/:id/users')
    @summary('获取角色用户')
    @tag
    @requireRoleManagement
    @ControllerErrorHandler
    async getRoleUsers(ctx: Context) {
        const roleId = parseInt(ctx.params.id);
        const result = await roleService.getRoleUsers(roleId);
        ctx.body = Response.success(result);
    }

    @request('post', '/assign-permissions')
    @summary('分配角色权限')
    @tag
    @body({
        roleId: { type: 'number', required: true },
        permissionIds: { type: 'array', required: true },
    })
    @requireRoleAssign
    @ControllerErrorHandler
    async assignPermissions(ctx: Context) {
        const data = ctx.request.body as RolePermissionAssignRequest;
        await roleService.assignPermissions(data);
        ctx.body = Response.success(null, '权限分配成功');
    }

    @request('post', '/remove-user')
    @summary('从角色移除用户')
    @tag
    @body({
        roleId: { type: 'number', required: true },
        userId: { type: 'number', required: true },
    })
    @requireRoleAssign
    @ControllerErrorHandler
    async removeUserFromRole(ctx: Context) {
        const { roleId, userId } = ctx.request.body as RemoveRoleUserRequest;
        await roleService.removeUserFromRole(roleId, userId);
        ctx.body = Response.success(null, '用户已从角色移除');
    }

    @request('get', '/check-code')
    @summary('检查角色代码是否可用')
    @tag
    @query({
        code: { type: 'string', required: true },
        excludeId: { type: 'number', required: false },
    })
    @requireRoleManagement
    @ControllerErrorHandler
    async checkCode(ctx: Context) {
        const { code, excludeId } = ctx.query as { code: string; excludeId?: string };
        const result = await roleService.checkCode(
            code,
            excludeId ? parseInt(excludeId) : undefined,
        );
        ctx.body = Response.success(result);
    }
}
export const roleController = new RoleController();
