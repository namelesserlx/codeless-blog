import { request, summary, tags, prefix, body } from 'koa-swagger-decorator';
import type { Context } from 'koa';
import { googleService } from '../../../services/auth/oauth/google';
import { ControllerErrorHandler } from '../../../utils/decorators';
import { Response } from '../../../utils/response';

const tag = tags(['Google认证']);

@prefix('/auth/google')
export default class GoogleOAuthController {
    @request('post', '/login')
    @summary('Google登录')
    @tag
    @ControllerErrorHandler
    @body({
        code: { type: 'string', required: true, description: 'Google授权码' },
        source: { type: 'string', required: false, description: '来源' },
    })
    async googleLogin(ctx: Context) {
        const { code, source } = ctx.request.body as { code: string; source: string };
        const result = await googleService.googleLogin(code, source, ctx);
        ctx.body = Response.success(result, '登录成功');
    }

    @request('post', '/bind')
    @summary('绑定Google账号')
    @tag
    @ControllerErrorHandler
    @body({
        code: { type: 'string', required: true, description: 'Google授权码' },
        source: { type: 'string', required: false, description: '来源' },
    })
    async bindGoogle(ctx: Context) {
        const { code, source } = ctx.request.body as { code: string; source: string };
        const userId = ctx.state.user.id;
        const result = await googleService.bindGoogle(userId, source, code);
        ctx.body = Response.success(result);
    }

    @request('post', '/unbind')
    @summary('解绑Google账号')
    @tag
    @ControllerErrorHandler
    async unbindGoogle(ctx: Context) {
        const userId = ctx.state.user.id;
        await googleService.unbindGoogle(userId);
        ctx.body = Response.success(null, '解绑成功');
    }
}

export const googleOAuthController = new GoogleOAuthController();
