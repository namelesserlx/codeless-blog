import 'module-alias/register';
import './bootstrap/load-env';
import './telemetry/init';
import Koa from 'koa';
import bodyParser from 'koa-bodyparser';
import logger from 'koa-logger';
import router from './routes';
import { healthRouter } from './routes/health';
import { jwtAuth } from './middlewares/auth';
import { corsMiddleware } from './middlewares/cors';
import { normalizeSecureProxyHeaders } from './middlewares/secure-proxy';
import swaggerRouter from './config/swagger';
import { validateServerEnvironment } from './config/env';
import { transformDateMiddleware } from './middlewares/transform';
import { errorHandler, notFoundHandler } from './middlewares/error-handler';
import { logger as appLogger } from './utils/logger';
import { getServerPort, startKoaServer } from './utils/port';
import { currentNodeEnv } from './utils/env';
import { registerWebSocketServer } from './lib/websocket';
import { dashboardChannel } from './services/dashboard/websocket';

const app = new Koa();
app.proxy = true;

validateServerEnvironment();

app.use(normalizeSecureProxyHeaders);

// 请求日志必须在全局错误处理中间件外层，才能记录错误被映射后的最终状态码
app.use(logger());
// 全局错误处理中间件需要包裹后续业务链路，统一处理下游抛出的异常
app.use(errorHandler());
// 基础中间件
// CORS 中间件 - 支持多源白名单配置，允许带凭证的跨域请求
app.use(corsMiddleware());

app.use(bodyParser());
// app.use(systemLogger);

// 日期转换中间件 - 放在所有路由之前，确保能处理所有响应
app.use(transformDateMiddleware);

// Swagger路由
app.use(swaggerRouter.routes());
app.use(swaggerRouter.allowedMethods());

// 健康检查
app.use(healthRouter.routes());
app.use(healthRouter.allowedMethods());

// 认证中间件
app.use(jwtAuth);

// 业务路由
app.use(router.routes());
app.use(router.allowedMethods());

// 404 处理中间件 - 放在最后
app.use(notFoundHandler());

const PORT = getServerPort();

// 使用 startKoaServer 来避免热更新时的端口占用问题
const server = startKoaServer(app, PORT, () => {
    appLogger.info(`Server is running on port ${PORT} in ${currentNodeEnv} mode`);
});

registerWebSocketServer(server, [dashboardChannel]);

export default app;
