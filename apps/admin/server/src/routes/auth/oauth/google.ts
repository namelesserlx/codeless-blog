import Router from '@koa/router';
import { googleOAuthController } from '../../../controllers/auth';

export const authGoogleRouter = new Router({
    prefix: '/oauth/google',
});

// 绑定Google账号
authGoogleRouter.post('/bind', googleOAuthController.bindGoogle);

// 解绑Google账号
authGoogleRouter.post('/unbind', googleOAuthController.unbindGoogle);

// Google 登录
authGoogleRouter.post('/login', googleOAuthController.googleLogin);
