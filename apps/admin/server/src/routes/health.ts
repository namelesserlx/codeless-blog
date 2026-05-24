import Router from '@koa/router';
import { Response } from '../utils/response';

export const healthRouter = new Router();

healthRouter.get('/health', (ctx) => {
    ctx.body = Response.success(
        {
            status: 'ok',
            timestamp: new Date().toISOString(),
        },
        '服务运行正常',
    );
});
