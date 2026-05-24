import Router from '@koa/router';
import { globalRouter } from './global';
import { authLoginRouter, authGithubRouter, authGoogleRouter } from './auth';
import { userRouter } from './system/user';
import { roleRouter } from './system/role';
import { permissionRouter } from './system/permission';
import { articleRouter } from './blog/article';
import { tagRouter } from './blog/tag';
import commentRouter from './blog/comment';
import emailTestRouter from './email/test';
import { photoRouter } from './blog/photo';
import { snippetRouter } from './blog/snippet';
import { dashboardRouter } from './dashboard';
import { articleReportRouter } from './blog/article-report';
import { isProd } from '../utils/env';

const shouldRegisterEmailTestRoutes = () => !isProd;

const getRegisteredApiRouters = () => {
    const routers = [
        globalRouter,
        authLoginRouter,
        authGithubRouter,
        authGoogleRouter,
        userRouter,
        roleRouter,
        permissionRouter,
        articleRouter,
        tagRouter,
        commentRouter,
        photoRouter,
        snippetRouter,
        dashboardRouter,
        articleReportRouter,
    ];

    if (shouldRegisterEmailTestRoutes()) {
        routers.push(emailTestRouter);
    }

    return routers;
};

export const isKnownApiRoute = (path: string, method: string) => {
    if (!path.startsWith('/api')) {
        return false;
    }

    const normalizedPath = path.slice(4) || '/';

    return getRegisteredApiRouters().some((apiRouter) => {
        const matched = apiRouter.match(normalizedPath, method);
        return matched.path.length > 0;
    });
};

export const createApiRouter = () => {
    const router = new Router({
        prefix: '/api',
    });

    for (const apiRouter of getRegisteredApiRouters()) {
        router.use(apiRouter.routes());
    }

    return router;
};

const router = createApiRouter();

export default router;
