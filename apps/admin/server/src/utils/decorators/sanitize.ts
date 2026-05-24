const SENSITIVE_FIELDS = new Set([
    'password',
    'captcha',
    'token',
    'resetToken',
    'authorization',
    'cookie',
    'verificationCode',
    'code',
]);

export function sanitizeForLog(value: unknown, depth = 0): unknown {
    if (value === null || value === undefined) {
        return value;
    }

    if (
        typeof value === 'string' ||
        typeof value === 'number' ||
        typeof value === 'boolean' ||
        typeof value === 'bigint'
    ) {
        return value;
    }

    if (typeof value === 'function') {
        return '[Function]';
    }

    if (Array.isArray(value)) {
        if (depth >= 2) {
            return `[Array(${value.length})]`;
        }

        return value.slice(0, 10).map((item) => sanitizeForLog(item, depth + 1));
    }

    if (typeof value === 'object') {
        const objectValue = value as Record<string, unknown>;

        if (
            objectValue.constructor?.name === 'Context' ||
            ('request' in objectValue && 'response' in objectValue && 'state' in objectValue)
        ) {
            return {
                type: 'KoaContext',
                method: objectValue.method,
                url: objectValue.url,
                path: objectValue.path,
                query: sanitizeForLog(objectValue.query, depth + 1),
                ip: objectValue.ip,
                userAgent:
                    typeof objectValue.get === 'function'
                        ? objectValue.get.call(objectValue, 'User-Agent')
                        : undefined,
                state: sanitizeForLog(objectValue.state, depth + 1),
            };
        }

        if (depth >= 2) {
            return `[${objectValue.constructor?.name || 'Object'}]`;
        }

        const safeObject: Record<string, unknown> = {};
        for (const key of Object.keys(objectValue).slice(0, 20)) {
            if (SENSITIVE_FIELDS.has(key)) {
                safeObject[key] = '[REDACTED]';
                continue;
            }

            safeObject[key] = sanitizeForLog(objectValue[key], depth + 1);
        }

        return safeObject;
    }

    return String(value);
}
