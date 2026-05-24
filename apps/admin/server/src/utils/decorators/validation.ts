import { BusinessError, ErrorCode } from '../../types/errors';

export function ValidateParams(validator: (args: any[]) => void) {
    return function (target: any, propertyKey: string, descriptor: PropertyDescriptor) {
        const originalMethod = descriptor.value;

        descriptor.value = async function (...args: any[]) {
            try {
                validator(args);
            } catch (error) {
                throw new BusinessError(
                    ErrorCode.VALIDATION_ERROR,
                    error instanceof Error ? error.message : String(error),
                );
            }

            return await originalMethod.apply(this, args);
        };

        return descriptor;
    };
}
