import { Context, Next } from 'koa';
import { BusinessError, ErrorCode, HTTP_STATUS_MAP } from '../types/errors';
import { Response } from '../utils/response';
import { logger } from '../utils/logger';
import { getErrorContext } from '../utils/decorators/error';

const MULTER_ERROR_MESSAGE_MAP: Record<string, string> = {
    LIMIT_FILE_SIZE: '文件大小超过限制',
    LIMIT_FILE_COUNT: '文件数量超过限制',
    LIMIT_PART_COUNT: '上传表单字段过多',
    LIMIT_FIELD_COUNT: '上传字段数量超过限制',
    LIMIT_FIELD_KEY: '上传字段名过长',
    LIMIT_FIELD_VALUE: '上传字段值过长',
    LIMIT_UNEXPECTED_FILE: '上传文件字段不合法',
};

/**
 * 全局错误处理中间件
 */
export const errorHandler = () => {
    return async (ctx: Context, next: Next) => {
        try {
            await next();
        } catch (error) {
            const buildErrorPayload = (err: Error, statusCode: number) => {
                const includeDiagnosticDetails = statusCode >= 500;
                const errorContext = getErrorContext(err);

                const logData = {
                    method: ctx.method,
                    url: ctx.url,
                    ip: ctx.ip,
                    userAgent: ctx.get('User-Agent'),
                    userId: ctx.state?.user?.id,
                    ...(errorContext?.service && {
                        service: errorContext.service,
                    }),
                    ...(errorContext?.permission && {
                        permission: errorContext.permission,
                    }),
                    ...(errorContext?.controller && {
                        controller: includeDiagnosticDetails
                            ? errorContext.controller
                            : {
                                  className: errorContext.controller.className,
                                  methodName: errorContext.controller.methodName,
                              },
                    }),
                    error: {
                        name: err.name,
                        message: err.message,
                        ...(err instanceof BusinessError && {
                            code: err.code,
                            statusCode: err.statusCode,
                            ...(includeDiagnosticDetails &&
                                err.details !== undefined && {
                                    details: err.details,
                                }),
                        }),
                        ...(includeDiagnosticDetails && {
                            stack: err.stack,
                        }),
                    },
                };

                return logData;
            };

            const logError = (err: Error, statusCode: number) => {
                const level = statusCode >= 500 ? 'error' : 'warn';
                logger[level]('请求处理出错', buildErrorPayload(err, statusCode));
            };

            // 处理业务异常
            if (error instanceof BusinessError) {
                logError(error, error.statusCode);

                ctx.status = error.statusCode;
                ctx.body = Response.error(error.message, HTTP_STATUS_MAP[error.code]);
                return;
            }

            // 处理 Multer 上传错误
            if (error.name === 'MulterError') {
                logError(error, 400);

                ctx.status = 400;
                ctx.body = Response.error(
                    MULTER_ERROR_MESSAGE_MAP[error.code] || '上传请求不合法',
                    400,
                );
                return;
            }

            // 处理 Prisma 数据库错误
            if (error.code && error.code.startsWith('P')) {
                logError(error, 500);

                ctx.status = 500;
                ctx.body = Response.error('数据库操作失败', 500);
                return;
            }

            // 处理验证错误
            if (error.name === 'ValidationError') {
                logError(error, 400);

                ctx.status = 400;
                ctx.body = Response.error(error.message, 400);
                return;
            }

            // 处理 JWT 错误
            if (error.name === 'JsonWebTokenError' || error.name === 'TokenExpiredError') {
                logError(error, 401);

                ctx.status = 401;
                ctx.body = Response.error('认证失败', 401);
                return;
            }

            // 处理 Koa 中间件错误
            if (error.status) {
                logError(error, error.status);

                ctx.status = error.status;
                ctx.body = Response.error(error.message || '请求处理失败', error.status);
                return;
            }

            // 处理未知错误
            logError(error, 500);

            ctx.status = 500;
            ctx.body = Response.error('服务器内部错误', 500);
        }
    };
};

/**
 * 404 处理中间件
 */
export const notFoundHandler = () => {
    return async (ctx: Context, next: Next) => {
        await next();

        if (ctx.status === 404 && !ctx.body) {
            ctx.status = 404;
            ctx.body = Response.error('接口不存在', 404);
        }
    };
};
