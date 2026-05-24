import Router from '@koa/router';
import { githubOAuthController } from '../../../controllers/auth';

export const authGithubRouter = new Router({
    prefix: '/oauth/github',
});

// 绑定GitHub账号
authGithubRouter.post('/bind', githubOAuthController.bindGithub);

// 解绑GitHub账号
authGithubRouter.post('/unbind', githubOAuthController.unbindGithub);

// GitHub登录
authGithubRouter.post('/login', githubOAuthController.githubLogin);
