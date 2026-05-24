import { SwaggerRouter, request, summary, tags, prefix, body, query } from 'koa-swagger-decorator';
import type { Context } from 'koa';
import { Response } from '../../../utils/response';
import { userService } from '../../../services/system/user';
import { UserListRequest, CreateUserRequest, UpdateUserRequest } from '@blog/shared';
import {
    ControllerErrorHandler,
    RequirePermission,
    RequireSuperAdmin,
    PermissionStrategy,
} from '../../../utils/decorators';

const tag = tags(['用户管理']);

@prefix('/system/users')
export default class UserController {
    @request('get', '/list')
    @summary('获取用户列表')
    @tag
    @query({
        page: { type: 'number', required: false, default: 1 },
        pageSize: { type: 'number', required: false, default: 10 },
        username: { type: 'string', required: false },
        email: { type: 'string', required: false },
        nickname: { type: 'string', required: false },
        status: { type: 'number', required: false },
        startTime: { type: 'string', required: false },
    })
    @ControllerErrorHandler
    @RequirePermission({ permissions: 'user_management' })
    async getUserList(ctx: Context) {
        const { page, pageSize, username, email, nickname, status, startTime, endTime } =
            ctx.query as unknown as UserListRequest;
        const filter: UserListRequest = {
            page: Number(page),
            pageSize: Number(pageSize),
            username: username,
            email: email,
            nickname: nickname,
            status: status,
            startTime: startTime,
            endTime: endTime,
        };
        const result = await userService.getUserList(filter);
        ctx.body = Response.success(result);
    }

    @request('get', '/detail/:id')
    @summary('获取用户详情')
    @tag
    @body({
        id: { type: 'number', required: true },
    })
    @RequirePermission({
        permissions: 'user_management',
        allowOwner: true,
        message: '您没有权限查看用户详情',
    })
    @ControllerErrorHandler
    async getUserDetail(ctx: Context) {
        const id = parseInt(ctx.params.id);
        const result = await userService.getUserDetail(id);
        ctx.body = Response.success(result);
    }

    @request('post', '/create')
    @summary('创建用户')
    @tag
    @body({
        username: { type: 'string', required: true },
        email: { type: 'string', required: true },
        password: { type: 'string', required: true },
        roleIds: { type: 'array', required: false },
        nickname: { type: 'string', required: false },
        address: { type: 'string', required: false },
        avatar: { type: 'string', required: false },
        phone: { type: 'string', required: false },
        status: { type: 'number', required: false },
        bio: { type: 'string', required: false },
    })
    @RequirePermission({ permissions: 'user:create' })
    @ControllerErrorHandler
    async createUser(ctx: Context) {
        const data = ctx.request.body as CreateUserRequest;
        const result = await userService.createUser(data);
        ctx.body = Response.success(result, '用户创建成功');
    }

    @request('post', '/update')
    @summary('更新用户')
    @tag
    @body({
        id: { type: 'number', required: true },
        username: { type: 'string', required: false },
        email: { type: 'string', required: false },
        nickname: { type: 'string', required: false },
        status: { type: 'number', required: false },
        address: { type: 'string', required: false },
        avatar: { type: 'string', required: false },
        phone: { type: 'string', required: false },
        roleIds: { type: 'array', required: false },
        birthday: { type: 'string', required: false },
    })
    @RequirePermission({
        permissions: 'user:update',
        allowOwner: true,
        message: '您没有权限修改用户信息',
    })
    @ControllerErrorHandler
    async updateUser(ctx: Context) {
        const data = ctx.request.body as UpdateUserRequest;
        const result = await userService.updateUser(data);
        ctx.body = Response.success(result, '用户更新成功');
    }

    @request('post', '/delete')
    @summary('删除用户')
    @tag
    @body({
        id: { type: 'number', required: true },
    })
    @RequirePermission({
        permissions: 'user:delete',
        message: '删除用户需要删除权限',
    })
    @ControllerErrorHandler
    async deleteUser(ctx: Context) {
        const { id } = ctx.request.body as { id: number };
        await userService.deleteUser(id);
        ctx.body = Response.success(null, '用户删除成功');
    }

    @request('get', '/role-options')
    @summary('获取角色选项')
    @tag
    @RequirePermission({ permissions: 'user_management' })
    @ControllerErrorHandler
    async getRoleOptions(ctx: Context) {
        const result = await userService.getRoleOptions();
        ctx.body = Response.success(result);
    }

    @request('get', '/stats')
    @summary('获取用户统计信息')
    @tag
    @RequirePermission({ permissions: 'user_management' })
    @ControllerErrorHandler
    async getUserStats(ctx: Context) {
        const result = await userService.getUserStats();
        ctx.body = Response.success(result);
    }

    @request('post', '/avatar')
    @summary('更新用户头像')
    @tag
    @body({
        id: { type: 'number', required: true },
        avatar: { type: 'string', required: true },
    })
    @RequirePermission({
        permissions: 'user:update',
        allowOwner: true,
    })
    @ControllerErrorHandler
    async updateAvatar(ctx: Context) {
        const userId = ctx.state.user.id;
        const file = ctx.file as unknown as {
            fieldname: string;
            buffer: Buffer;
            originalname: string;
            mimetype: string;
            size: number;
        };
        const result = await userService.updateAvatar({ userId, file });
        ctx.body = Response.success(result);
    }

    @request('post', '/batch')
    @summary('批量操作用户')
    @tag
    @RequirePermission({ permissions: 'user:update' })
    @ControllerErrorHandler
    async batchOperation(ctx: Context) {
        const data = ctx.request.body as {
            ids: number[];
            action: 'delete' | 'activate' | 'deactivate' | 'ban';
        };
        await userService.batchOperation(data);
        ctx.body = Response.success(null, '批量操作成功');
    }

    @request('get', '/check-username')
    @summary('检查用户名是否可用')
    @tag
    @ControllerErrorHandler
    async checkUsername(ctx: Context) {
        const { username, excludeId } = ctx.query as { username: string; excludeId?: string };
        const result = await userService.checkUsername(
            username,
            excludeId ? parseInt(excludeId) : undefined,
        );
        ctx.body = Response.success(result);
    }

    @request('get', '/check-email')
    @summary('检查邮箱是否可用')
    @tag
    @ControllerErrorHandler
    async checkEmail(ctx: Context) {
        const { email, excludeId } = ctx.query as { email: string; excludeId?: string };
        const result = await userService.checkEmail(
            email,
            excludeId ? parseInt(excludeId) : undefined,
        );
        ctx.body = Response.success(result);
    }
}

export const userController = new UserController();
