import type { Context } from 'koa';
import { BusinessError, ErrorCode } from '../../types/errors';
import { sanitizeForLog } from './sanitize';

const ERROR_LOG_CONTEXT_SYMBOL = Symbol.for('blog:error-log-context');

interface ServiceErrorContext {
    className: string;
    methodName: string;
}

interface ControllerErrorContext {
    className: string;
    methodName: string;
    request: {
        method: string;
        url: string;
        query: unknown;
        body: unknown;
        ip: string;
        userAgent: string;
    };
    user: unknown;
}

interface PermissionErrorContext {
    methodName: string;
    permissions?: unknown;
    strategy?: string;
    userId?: number;
}

export interface ErrorLogContext {
    service?: ServiceErrorContext;
    controller?: ControllerErrorContext;
    permission?: PermissionErrorContext;
}

function mergeContext(
    current: ErrorLogContext | undefined,
    incoming: Partial<ErrorLogContext>,
): ErrorLogContext {
    return {
        ...incoming,
        ...current,
        service: current?.service ?? incoming.service,
        controller: current?.controller ?? incoming.controller,
        permission: current?.permission ?? incoming.permission,
    };
}

export function attachErrorContext(error: Error, context: Partial<ErrorLogContext>): Error {
    const currentContext = (error as Error & { [ERROR_LOG_CONTEXT_SYMBOL]?: ErrorLogContext })[
        ERROR_LOG_CONTEXT_SYMBOL
    ];

    Object.defineProperty(error, ERROR_LOG_CONTEXT_SYMBOL, {
        value: mergeContext(currentContext, context),
        configurable: true,
        enumerable: false,
        writable: true,
    });

    return error;
}

export function getErrorContext(error: unknown): ErrorLogContext | undefined {
    if (!(error instanceof Error)) {
        return undefined;
    }

    return (error as Error & { [ERROR_LOG_CONTEXT_SYMBOL]?: ErrorLogContext })[
        ERROR_LOG_CONTEXT_SYMBOL
    ];
}

export function ServiceErrorHandler(
    target: any,
    propertyKey: string,
    descriptor: PropertyDescriptor,
) {
    const originalMethod = descriptor.value;
    descriptor.value = async function (...args: any[]) {
        try {
            return await originalMethod.apply(this, args);
        } catch (error) {
            if (error instanceof BusinessError) {
                throw attachErrorContext(error, {
                    service: {
                        className: target.constructor.name,
                        methodName: propertyKey,
                    },
                });
            }

            if (error instanceof Error) {
                throw attachErrorContext(error, {
                    service: {
                        className: target.constructor.name,
                        methodName: propertyKey,
                    },
                });
            }

            throw attachErrorContext(new BusinessError(ErrorCode.UNKNOWN_ERROR, '服务执行失败'), {
                service: {
                    className: target.constructor.name,
                    methodName: propertyKey,
                },
            });
        }
    };

    return descriptor;
}

export function ControllerErrorHandler(
    target: any,
    propertyKey: string,
    descriptor: PropertyDescriptor,
) {
    const originalMethod = descriptor.value;

    descriptor.value = async function (ctx: Context, ...args: any[]) {
        try {
            return await originalMethod.apply(this, [ctx, ...args]);
        } catch (error) {
            if (error instanceof Error) {
                throw attachErrorContext(error, {
                    controller: {
                        className: target.constructor.name,
                        methodName: propertyKey,
                        request: {
                            method: ctx.method,
                            url: ctx.url,
                            query: sanitizeForLog(ctx.query),
                            body: sanitizeForLog(ctx.request.body),
                            ip: ctx.ip,
                            userAgent: ctx.get('User-Agent'),
                        },
                        user: sanitizeForLog(ctx.state?.user),
                    },
                });
            }

            throw error;
        }
    };

    return descriptor;
}
