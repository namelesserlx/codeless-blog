import { request, summary, tags, prefix, body } from 'koa-swagger-decorator';
import type { Context } from 'koa';
import { Response } from '../../../utils/response';
import { githubService } from '../../../services/auth/oauth/github';
import { ControllerErrorHandler } from '../../../utils/decorators';

const tag = tags(['GitHub认证']);

@prefix('/auth/github')
export default class GitHubOAuthController {
    @request('post', '/bind')
    @summary('绑定GitHub账号')
    @tag
    @ControllerErrorHandler
    @body({
        code: { type: 'string', required: true, description: 'GitHub授权码' },
        source: { type: 'string', required: false, description: '来源' },
    })
    async bindGithub(ctx: Context) {
        const { code, source } = ctx.request.body as { code: string; source?: string };
        const userId = ctx.state.user.id;
        const result = await githubService.bindGithub(userId, source, code);
        ctx.body = Response.success(result);
    }

    @request('post', '/unbind')
    @summary('解绑GitHub账号')
    @tag
    @ControllerErrorHandler
    async unbindGithub(ctx: Context) {
        const userId = ctx.state.user.id;
        await githubService.unbindGithub(userId);
        ctx.body = Response.success(null, '解绑成功');
    }

    @request('post', '/login')
    @summary('GitHub登录')
    @tag
    @ControllerErrorHandler
    @body({
        code: { type: 'string', required: true, description: 'GitHub授权码' },
        source: { type: 'string', required: false, description: '来源' },
    })
    async githubLogin(ctx: Context) {
        const { code, source } = ctx.request.body as { code: string; source: string };
        const result = await githubService.githubLogin(code, source, ctx);
        ctx.body = Response.success(result, '登录成功');
    }
}

export const githubOAuthController = new GitHubOAuthController();
