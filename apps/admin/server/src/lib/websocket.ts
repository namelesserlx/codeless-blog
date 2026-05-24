import type { IncomingMessage, Server } from 'http';
import type { Duplex } from 'stream';
import { WebSocketServer, type RawData, WebSocket } from 'ws';

export interface WsContext<TState = unknown, TUser = unknown> {
    socket: WebSocket;
    request: IncomingMessage;
    requestUrl: URL;
    user: TUser | null;
    state: TState;
    sendJson(payload: unknown): void;
    close(code?: number, reason?: string): void;
}

export interface Channel<TState = unknown, TUser = unknown> {
    path: string;
    authenticate?: (request: IncomingMessage, requestUrl: URL) => Promise<TUser | null>;
    createState?: (params: {
        request: IncomingMessage;
        requestUrl: URL;
        user: TUser | null;
    }) => TState;
    onConnect?: (ctx: WsContext<TState, TUser>) => void | Promise<void>;
    onMessage?: (ctx: WsContext<TState, TUser>, rawData: RawData) => void | Promise<void>;
    onClose?: (ctx: WsContext<TState, TUser>, code: number, reason: string) => void;
    onError?: (ctx: WsContext<TState, TUser>, error: Error) => void;
}

type InternalChannel = Channel<unknown, unknown>;
type InternalContext = WsContext<unknown, unknown> & {
    channel: InternalChannel;
};

declare global {
    // eslint-disable-next-line no-var
    var __WS_SERVER__: WebSocketServer | undefined; // WebSocketServer 实例
    // eslint-disable-next-line no-var
    var __WS_UPGRADE_BOUND__: boolean | undefined; // 是否已绑定 upgrade 监听器
    // eslint-disable-next-line no-var
    var __WS_CHANNEL_MAP__: Map<string, InternalChannel> | undefined; // 通道映射
}

// 挂载到 global，避免热重载后模块重新执行产生新的 Map 实例，
// 导致旧的 upgrade 监听器通过闭包拿到的是空 Map 而找不到 channel。
global.__WS_CHANNEL_MAP__ ??= new Map<string, InternalChannel>();
const channelMap = global.__WS_CHANNEL_MAP__;
const ctxMap = new WeakMap<WebSocket, InternalContext>();

const createUrl = (request: IncomingMessage): URL => {
    const requestHost = request.headers.host || 'localhost';
    const requestPath = request.url || '/';
    return new URL(requestPath, `http://${requestHost}`);
};

const rejectUpgrade = (socket: Duplex, statusCode: number, reason: string) => {
    socket.write(
        `HTTP/1.1 ${statusCode} ${reason}\r\nConnection: close\r\nContent-Type: text/plain\r\n\r\n${reason}`,
    );
    socket.destroy();
};

const getErrorMessage = (error: unknown): string => {
    if (typeof error === 'string') {
        return error || 'WebSocket handler error';
    }

    if (error && typeof error === 'object') {
        if ('message' in error && typeof error.message === 'string' && error.message) {
            return error.message;
        }

        try {
            const serialized = JSON.stringify(error);
            if (serialized) {
                return serialized;
            }
        } catch {
            return Object.prototype.toString.call(error);
        }

        return Object.prototype.toString.call(error);
    }

    if (error === undefined) {
        return 'WebSocket handler error';
    }

    return String(error) || 'WebSocket handler error';
};

const toError = (error: unknown): Error => {
    if (error instanceof Error) return error;
    return new Error(getErrorMessage(error));
};

const getContext = (socket: WebSocket): InternalContext | undefined => {
    return ctxMap.get(socket);
};

const runHandler = (ctx: InternalContext, handler: () => void | Promise<void>) => {
    void Promise.resolve(handler()).catch((error) => {
        const wsError = toError(error);

        if (ctx.channel.onError) {
            ctx.channel.onError(ctx, wsError);
            return;
        }

        ctx.close(1011, wsError.message);
    });
};

const bindSocketEvents = (ctx: InternalContext) => {
    const { socket, channel } = ctx;

    socket.on('message', (rawData) => {
        if (!channel.onMessage) return;

        runHandler(ctx, () => channel.onMessage!(ctx, rawData));
    });

    socket.on('close', (code, reasonBuffer) => {
        channel.onClose?.(ctx, code, reasonBuffer.toString('utf-8'));
        ctxMap.delete(socket);
    });

    socket.on('error', (error) => {
        channel.onError?.(ctx, error);
    });
};

const bindUpgradeHandler = (server: Server, wsServer: WebSocketServer) => {
    if (global.__WS_UPGRADE_BOUND__) {
        return;
    }

    server.on('upgrade', async (request, socket, head) => {
        const requestUrl = createUrl(request);
        const channel = channelMap.get(requestUrl.pathname);

        if (!channel) {
            rejectUpgrade(socket, 404, 'Not Found');
            return;
        }

        let user: unknown = null;

        try {
            user = channel.authenticate ? await channel.authenticate(request, requestUrl) : null;
        } catch {
            rejectUpgrade(socket, 500, 'WebSocket Authentication Failed');
            return;
        }

        if (channel.authenticate && !user) {
            rejectUpgrade(socket, 401, 'Unauthorized');
            return;
        }

        wsServer.handleUpgrade(request, socket, head, (socketClient) => {
            try {
                const ctx: InternalContext = {
                    channel,
                    socket: socketClient,
                    request,
                    requestUrl,
                    user,
                    state: channel.createState?.({
                        request,
                        requestUrl,
                        user,
                    }),
                    sendJson: (payload: unknown) => {
                        if (socketClient.readyState !== WebSocket.OPEN) {
                            return;
                        }

                        try {
                            socketClient.send(JSON.stringify(payload));
                        } catch {
                            // 连接可能已在 readyState 检查后关闭，忽略发送失败
                        }
                    },
                    close: (code = 1000, reason = 'normal') => {
                        if (
                            socketClient.readyState === WebSocket.OPEN ||
                            socketClient.readyState === WebSocket.CONNECTING
                        ) {
                            socketClient.close(code, reason);
                        }
                    },
                };

                ctxMap.set(socketClient, ctx);
                wsServer.emit('connection', socketClient, request);
            } catch {
                socketClient.close(1011, 'WebSocket initialization failed');
            }
        });
    });

    global.__WS_UPGRADE_BOUND__ = true;
};

/**
 * 注册 WebSocket 通道
 * @param channels - WebSocket 通道列表
 */
const registerChannels = (channels: Channel[]) => {
    channels.forEach((channel) => {
        channelMap.set(channel.path, channel);
    });
};

/**
 * 注册 WebSocket
 * @param server - HTTP 服务器实例
 * @param channels - WebSocket 通道列表
 * @returns WebSocketServer 实例
 */
export const registerWebSocketServer = (server: Server, channels: Channel[]): WebSocketServer => {
    registerChannels(channels);

    if (global.__WS_SERVER__) {
        return global.__WS_SERVER__;
    }
    // 创建 WebSocketServer 实例，这个 WebSocketServer 自己不去占一个端口，也不自己启动服务器，而是通过 HTTP 服务器来启动
    const wss = new WebSocketServer({ noServer: true });

    bindUpgradeHandler(server, wss);

    wss.on('connection', (socket) => {
        const ctx = getContext(socket);
        if (!ctx) {
            socket.close(1011, 'WebSocket context not found');
            return;
        }

        bindSocketEvents(ctx);

        if (!ctx.channel.onConnect) {
            return;
        }

        runHandler(ctx, () => ctx.channel.onConnect!(ctx));
    });

    server.on('close', () => {
        wss.close();
    });

    global.__WS_SERVER__ = wss;
    return wss;
};
