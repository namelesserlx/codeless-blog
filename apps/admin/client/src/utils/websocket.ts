import { clientEnv } from '@/config/env';

export interface WebSocketOptions<TMessage = unknown> {
    pathname: string;
    searchParams?: Record<string, string | number | null | undefined>;
    onOpen?: (event: Event) => void;
    onMessage?: (message: TMessage | null, event: MessageEvent) => void;
    onClose?: (event: CloseEvent) => void;
    onError?: (event: Event) => void;
}

export type WebSocketStatus = 'connecting' | 'open' | 'closed';

export interface WebSocketConnection {
    readonly status: WebSocketStatus;
    send(payload: unknown): void;
    disconnect(reason?: string): void;
}

const WS_BASE_URL = clientEnv.urls.api;

const buildWebSocketUrl = (
    pathname: string,
    searchParams: Record<string, string | number | null | undefined> = {},
): string => {
    const url = new URL(pathname, WS_BASE_URL);
    url.protocol = url.protocol === 'https:' ? 'wss:' : 'ws:';

    for (const [key, value] of Object.entries(searchParams)) {
        if (value !== null && value !== undefined && value !== '') {
            url.searchParams.set(key, String(value));
        }
    }

    return url.toString();
};

const parseMessage = <T>(rawData: unknown): T | null => {
    if (typeof rawData !== 'string') return null;
    try {
        return JSON.parse(rawData) as T;
    } catch {
        return null;
    }
};

/**
 * 创建一个 WebSocket 连接，返回可发送消息和断开的连接对象。
 */
export const createWebSocketConnection = <TMessage = unknown>(
    options: WebSocketOptions<TMessage>,
): WebSocketConnection => {
    const { pathname, searchParams, onOpen, onMessage, onClose, onError } = options;
    let status: WebSocketStatus = 'connecting';
    const url = buildWebSocketUrl(pathname, searchParams);
    const socket = new WebSocket(url);

    const detachHandlers = (): void => {
        socket.onopen = null;
        socket.onmessage = null;
        socket.onclose = null;
        socket.onerror = null;
    };

    socket.onopen = (event) => {
        status = 'open';
        onOpen?.(event);
    };

    socket.onmessage = (event) => {
        onMessage?.(parseMessage<TMessage>(event.data), event);
    };

    socket.onerror = (event) => {
        onError?.(event);
    };

    socket.onclose = (event) => {
        detachHandlers();
        status = 'closed';
        onClose?.(event);
    };

    return {
        get status() {
            return status;
        },
        send: (payload: unknown): void => {
            if (socket.readyState !== WebSocket.OPEN) return;
            socket.send(typeof payload === 'string' ? payload : JSON.stringify(payload));
        },
        disconnect: (reason = 'normal'): void => {
            detachHandlers();
            status = 'closed';
            if (
                socket.readyState === WebSocket.OPEN ||
                socket.readyState === WebSocket.CONNECTING
            ) {
                socket.close(1000, reason);
            }
        },
    };
};
