import type Koa from 'koa';
import type { Server } from 'http';
import { env } from '../config/env';
import { logger } from './logger';

/**
 * 获取服务启动端口
 *
 * 优先读取环境变量 PORT，若未设置或非法，则回退到 8000。
 */
export const getServerPort = (): number => {
    return env.server.port;
};

declare global {
    var __ADMIN_SERVER__: Server | undefined;

    var __ADMIN_SERVER_CLEANUP_REGISTERED__: boolean | undefined;
}

/**
 * 注册进程退出时的清理逻辑
 *
 * 确保在进程退出或热更新重启前，正确关闭 http.Server，释放端口。
 *
 * ts-node-dev 热更新流程：
 * 1. 检测到文件变化
 * 2. 发送 SIGTERM 给子进程
 * 3. 子进程退出后，ts-node-dev 重新 fork 新进程
 *
 * 所以我们需要在 SIGTERM 时优雅关闭服务器并退出进程。
 */
const registerCleanup = (): void => {
    if (global.__ADMIN_SERVER_CLEANUP_REGISTERED__) {
        return;
    }

    const gracefulShutdown = (signal: string) => {
        logger.info(`Received ${signal}, shutting down gracefully`);

        if (global.__ADMIN_SERVER__) {
            // 设置超时，防止关闭时间过长
            const forceExitTimeout = setTimeout(() => {
                logger.warn('Forcing exit after shutdown timeout');
                process.exit(0);
            }, 3000);

            global.__ADMIN_SERVER__.close(() => {
                clearTimeout(forceExitTimeout);
                logger.info('HTTP server closed');
                global.__ADMIN_SERVER__ = undefined;
                process.exit(0);
            });
        } else {
            process.exit(0);
        }
    };

    // 处理 Ctrl+C 退出
    process.on('SIGINT', () => gracefulShutdown('SIGINT'));

    // 处理 SIGTERM（ts-node-dev 热更新时发送）
    process.on('SIGTERM', () => gracefulShutdown('SIGTERM'));

    global.__ADMIN_SERVER_CLEANUP_REGISTERED__ = true;
};

/**
 * 启动 Koa Server（带端口复用保护）
 *
 * 在 dev 热更新（ts-node-dev）场景下，同一个进程里可能会多次执行到
 * `app.listen`，从而导致端口占用错误（EADDRINUSE）。
 *
 * 这里通过挂载到 global 上，确保一个进程内只创建一个 http.Server 实例，
 * 避免热更新时重复监听同一端口。
 *
 * @param app Koa 实例
 * @param port 监听端口
 * @param onListening 监听成功回调
 */
export const startKoaServer = (app: Koa, port: number, onListening?: () => void): Server => {
    // 注册清理逻辑
    registerCleanup();

    // 如果已有服务器实例在运行，直接返回
    if (global.__ADMIN_SERVER__) {
        logger.info(`Reusing existing server instance on port ${port}`);
        return global.__ADMIN_SERVER__;
    }

    const server = app.listen(port, () => {
        if (onListening) {
            onListening();
        }
    });

    // 处理端口占用错误
    server.on('error', (err: NodeJS.ErrnoException) => {
        if (err.code === 'EADDRINUSE') {
            logger.error(`Port ${port} is already in use.`);
            logger.error(`Try running: lsof -i :${port} | grep LISTEN`);
            process.exit(1);
        }
        throw err;
    });

    global.__ADMIN_SERVER__ = server;

    return server;
};
