import { runWithSpan } from '../../telemetry/tracing';

type TraceSpanAttributes = Record<string, string | number | boolean>;
type TraceSpanAttributesFactory = (...args: unknown[]) => TraceSpanAttributes;
type TraceableMethod = (this: unknown, ...args: unknown[]) => unknown;

export function TraceSpan(
    spanName: string,
    attributesFactory?: TraceSpanAttributesFactory,
): (
    _target: object,
    _propertyKey: string | symbol,
    descriptor: PropertyDescriptor,
) => PropertyDescriptor {
    return function (_target, _propertyKey, descriptor) {
        const originalMethod = descriptor.value as TraceableMethod | undefined;

        if (typeof originalMethod !== 'function') {
            return descriptor;
        }

        descriptor.value = async function (this: unknown, ...args: unknown[]) {
            const attributes = attributesFactory?.(...args);
            if (attributes) {
                return runWithSpan(spanName, () => originalMethod.apply(this, args), attributes);
            }

            return runWithSpan(spanName, () => originalMethod.apply(this, args));
        } as TraceableMethod;

        return descriptor;
    };
}
