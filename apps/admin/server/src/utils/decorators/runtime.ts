import { logger } from '../logger';
import { BusinessError } from '../../types/errors';

export function Retry(options: { times?: number; delay?: number } = {}) {
    const { times = 3, delay = 1000 } = options;

    return function (target: any, propertyKey: string, descriptor: PropertyDescriptor) {
        const originalMethod = descriptor.value;

        descriptor.value = async function (...args: any[]) {
            let lastError: Error;

            for (let attempt = 1; attempt <= times; attempt++) {
                try {
                    return await originalMethod.apply(this, args);
                } catch (error) {
                    lastError = error as Error;

                    if (error instanceof BusinessError) {
                        throw error;
                    }

                    logger.warn(
                        `方法 ${target.constructor.name}.${propertyKey} 第 ${attempt} 次执行失败`,
                        {
                            attempt,
                            totalAttempts: times,
                            error: error instanceof Error ? error.message : String(error),
                        },
                    );

                    if (attempt === times) {
                        break;
                    }

                    await new Promise((resolve) => setTimeout(resolve, delay));
                }
            }

            throw lastError!;
        };

        return descriptor;
    };
}

export function Performance(target: any, propertyKey: string, descriptor: PropertyDescriptor) {
    const originalMethod = descriptor.value;

    descriptor.value = async function (...args: any[]) {
        const startTime = Date.now();
        const methodName = `${target.constructor.name}.${propertyKey}`;

        try {
            const result = await originalMethod.apply(this, args);
            const executionTime = Date.now() - startTime;

            if (executionTime > 500) {
                logger.warn(`方法执行时间过长: ${methodName}`, {
                    executionTime: `${executionTime}ms`,
                    arguments: args,
                });
            } else {
                logger.debug(`方法执行完成: ${methodName}`, {
                    executionTime: `${executionTime}ms`,
                });
            }

            return result;
        } catch (error) {
            const executionTime = Date.now() - startTime;
            logger.error(`方法执行失败: ${methodName}`, {
                executionTime: `${executionTime}ms`,
                error: error instanceof Error ? error.message : String(error),
            });
            throw error;
        }
    };

    return descriptor;
}
