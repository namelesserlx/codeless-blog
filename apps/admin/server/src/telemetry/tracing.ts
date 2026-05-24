import { SpanStatusCode, trace } from '@opentelemetry/api';

const tracer = trace.getTracer('blog-admin-server');

export const runWithSpan = async <T>(
    name: string,
    operation: () => T | Promise<T>,
    attributes?: Record<string, string | number | boolean>,
): Promise<T> => {
    return tracer.startActiveSpan(name, { attributes }, async (span) => {
        try {
            return await operation();
        } catch (error) {
            if (error instanceof Error) {
                span.recordException(error);
                span.setStatus({
                    code: SpanStatusCode.ERROR,
                    message: error.message,
                });
            } else {
                span.setStatus({
                    code: SpanStatusCode.ERROR,
                    message: String(error),
                });
            }

            throw error;
        } finally {
            span.end();
        }
    });
};
