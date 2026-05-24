import { SwaggerRouter, request, summary, tags, prefix, body } from 'koa-swagger-decorator';
import type { Context } from 'koa';
import { Response } from '../../utils/response';
import { authService } from '../../services/auth';
import {
    LoginRequest,
    RegisterRequest,
    EmailLoginRequest,
    UpdateCurrentUserProfileRequest,
} from '@blog/shared';
import { ControllerErrorHandler } from '../../utils/decorators';
const tag = tags(['认证中心']);

@prefix('/auth')
export default class AuthController {
    @request('get', '/captcha')
    @summary('获取图形验证码')
    @tag
    @ControllerErrorHandler
    async getCaptcha(ctx: Context) {
        const captchaData = await authService.createCaptchaChallenge(ctx);
        ctx.body = Response.success(captchaData);
    }

    @request('post', '/login')
    @summary('登录')
    @tag
    @body({
        username: { type: 'string', required: true },
        password: { type: 'string', required: true },
        captcha: { type: 'string', required: true },
    })
    @ControllerErrorHandler
    async login(ctx: Context) {
        const loginResponse = await authService.login(ctx.request.body as LoginRequest, ctx);
        ctx.body = Response.success(loginResponse);
    }

    @request('post', '/admin-login')
    @summary('管理后台登录')
    @tag
    @body({
        username: { type: 'string', required: true },
        password: { type: 'string', required: true },
        captcha: { type: 'string', required: true },
    })
    @ControllerErrorHandler
    async adminLogin(ctx: Context) {
        const loginResponse = await authService.adminLogin(ctx.request.body as LoginRequest, ctx);
        ctx.body = Response.success(loginResponse);
    }

    @request('get', '/checkLogin')
    @summary('获取当前登录用户（sid Cookie 或 Authorization）')
    @tag
    @ControllerErrorHandler
    async checkLogin(ctx: Context) {
        const data = await authService.checkLogin(ctx);
        ctx.body = Response.success(data);
    }

    @request('get', '/admin-checkLogin')
    @summary('获取当前管理后台登录用户（sid Cookie 或 Authorization）')
    @tag
    @ControllerErrorHandler
    async adminCheckLogin(ctx: Context) {
        const data = await authService.adminCheckLogin(ctx);
        ctx.body = Response.success(data);
    }

    @request('post', '/refresh')
    @summary('基于会话Cookie刷新访问令牌')
    @tag
    @ControllerErrorHandler
    async refresh(ctx: Context) {
        const data = await authService.refresh(ctx);
        ctx.body = Response.success(data);
    }

    @request('post', '/admin-refresh')
    @summary('基于会话Cookie刷新管理后台访问令牌')
    @tag
    @ControllerErrorHandler
    async adminRefresh(ctx: Context) {
        const data = await authService.adminRefresh(ctx);
        ctx.body = Response.success(data);
    }

    @request('get', '/profile')
    @summary('获取当前用户资料')
    @tag
    @ControllerErrorHandler
    async getProfile(ctx: Context) {
        const data = await authService.getCurrentProfile(ctx.state.user.id);
        ctx.body = Response.success(data);
    }

    @request('post', '/profile')
    @summary('更新当前用户资料')
    @tag
    @body({
        nickname: { type: 'string', required: false },
        email: { type: 'string', required: false },
        code: { type: 'string', required: false },
    })
    @ControllerErrorHandler
    async updateProfile(ctx: Context) {
        const data = await authService.updateCurrentProfile(
            ctx.state.user.id,
            ctx.request.body as UpdateCurrentUserProfileRequest,
        );
        ctx.body = Response.success(data, '资料更新成功');
    }

    @request('post', '/profile/avatar')
    @summary('更新当前用户头像')
    @tag
    @ControllerErrorHandler
    async updateProfileAvatar(ctx: Context) {
        const file = ctx.file as
            | {
                  buffer: Buffer;
                  originalname: string;
                  mimetype: string;
                  size: number;
              }
            | undefined;
        const data = await authService.updateCurrentAvatar(ctx.state.user.id, file);
        ctx.body = Response.success(data, '头像更新成功');
    }

    @request('post', '/logout')
    @summary('退出登录')
    @tag
    @ControllerErrorHandler
    async logout(ctx: Context) {
        const result = await authService.logout(ctx);
        ctx.body = Response.success(result);
    }

    @request('post', '/send-password-change-code')
    @summary('发送修改密码邮箱验证码')
    @tag
    @ControllerErrorHandler
    async sendPasswordChangeCode(ctx: Context) {
        const result = await authService.sendPasswordChangeVerificationCode(ctx.state.user.id);
        ctx.body = Response.success(result, '验证码已发送');
    }

    @request('post', '/verify-password-change-code')
    @summary('校验修改密码邮箱验证码')
    @tag
    @body({
        code: { type: 'string', required: true },
    })
    @ControllerErrorHandler
    async verifyPasswordChangeCode(ctx: Context) {
        const result = await authService.verifyPasswordChangeCode(
            ctx.state.user.id,
            ctx.request.body as { code: string },
        );
        ctx.body = Response.success(result, '验证通过');
    }

    @request('post', '/change-password')
    @summary('修改当前登录用户密码')
    @tag
    @body({
        token: { type: 'string', required: true },
        newPassword: { type: 'string', required: true },
    })
    @ControllerErrorHandler
    async changePassword(ctx: Context) {
        await authService.changePassword(
            ctx.state.user.id,
            ctx.request.body as { token: string; newPassword: string },
        );
        ctx.body = Response.success(null, '密码修改成功');
    }

    @request('post', '/send-email-code')
    @summary('发送邮箱验证码')
    @tag
    @body({
        email: { type: 'string', required: true },
    })
    @ControllerErrorHandler
    async sendEmailCode(ctx: Context) {
        const result = await authService.sendEmailVerificationCode(
            ctx.request.body as { email: string },
        );
        ctx.body = Response.success(result);
    }

    @request('post', '/email-login')
    @summary('邮箱验证码登录')
    @tag
    @body({
        email: { type: 'string', required: true },
        code: { type: 'string', required: true },
    })
    @ControllerErrorHandler
    async emailLogin(ctx: Context) {
        const data = await authService.emailLogin(ctx.request.body as EmailLoginRequest, ctx);
        ctx.body = Response.success(data);
    }

    @request('post', '/send-reset-email')
    @summary('发送密码重置邮件')
    @tag
    @body({
        email: { type: 'string', required: true },
    })
    @ControllerErrorHandler
    async sendResetEmail(ctx: Context) {
        const data = await authService.sendPasswordResetEmail(
            ctx.request.body as { email: string },
        );
        ctx.body = Response.success(data);
    }

    @request('post', '/verify-reset-token')
    @summary('验证重置令牌')
    @tag
    @body({
        token: { type: 'string', required: true },
    })
    @ControllerErrorHandler
    async verifyResetToken(ctx: Context) {
        const data = await authService.verifyResetToken(
            (ctx.request.body as { token: string }).token,
        );
        ctx.body = Response.success(data);
    }

    @request('post', '/reset-password')
    @summary('重置密码')
    @tag
    @body({
        token: { type: 'string', required: true },
        newPassword: { type: 'string', required: true },
    })
    @ControllerErrorHandler
    async resetPassword(ctx: Context) {
        const data = await authService.resetPassword(
            ctx.request.body as { token: string; newPassword: string },
        );
        ctx.body = Response.success(data);
    }

    @request('post', '/register')
    @summary('注册')
    @tag
    @body({
        username: { type: 'string', required: true },
        nickname: { type: 'string', required: true },
        email: { type: 'string', required: true },
        code: { type: 'string', required: true },
        password: { type: 'string', required: true },
        confirmPassword: { type: 'string', required: true },
    })
    @ControllerErrorHandler
    async register(ctx: Context) {
        const data = await authService.register(ctx.request.body as RegisterRequest, ctx);
        ctx.body = Response.success(data);
    }
}
export const authController = new AuthController();
