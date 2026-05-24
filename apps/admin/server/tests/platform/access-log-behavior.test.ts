import { EventEmitter } from 'node:events';
import koaLogger from 'koa-logger';
import { describe, expect, it } from 'vitest';
import { errorHandler } from '../../src/middlewares/error-handler';
import { BusinessError, ErrorCode } from '../../src/types/errors';

function createMockResponse() {
    const socket = new EventEmitter() as EventEmitter & { writable: boolean };
    socket.writable = true;

    const res = new EventEmitter() as EventEmitter & {
        finished: boolean;
        socket: EventEmitter & { writable: boolean };
    };
    res.finished = false;
    res.socket = socket;

    return res;
}

describe('access log behavior', () => {
    it('logs the mapped response status when request logging wraps the global error handler', async () => {
        const loggedStatuses: number[] = [];
        const requestLogger = koaLogger({
            transporter: (_message, args) => {
                const status = args[3];
                if (typeof status === 'number') {
                    loggedStatuses.push(status);
                }
            },
        });
        const response = createMockResponse();
        const ctx = {
            method: 'POST',
            originalUrl: '/api/blog/comments/moderate',
            status: 404,
            body: undefined,
            res: response,
            response: {
                length: 0,
            },
            state: {},
            ip: '127.0.0.1',
            get: () => 'Vitest',
        };

        await requestLogger(ctx as never, async () => {
            await errorHandler()(ctx as never, async () => {
                throw new BusinessError(ErrorCode.PERMISSION_DENIED, '权限不足');
            });
        });

        response.finished = true;
        response.emit('finish');
        await Promise.resolve();

        expect(ctx.status).toBe(403);
        expect(loggedStatuses.at(-1)).toBe(403);
        expect(loggedStatuses).not.toContain(500);
    });
});
