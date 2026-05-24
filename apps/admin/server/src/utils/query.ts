export function parseOptionalBoolean(value: unknown): boolean | undefined {
    if (value === undefined || value === null || value === '') {
        return undefined;
    }

    if (typeof value === 'boolean') {
        return value;
    }

    if (typeof value === 'number') {
        if (value === 1) {
            return true;
        }

        if (value === 0) {
            return false;
        }
    }

    if (typeof value === 'string') {
        const normalized = value.trim().toLowerCase();

        if (['true', '1', 'yes'].includes(normalized)) {
            return true;
        }

        if (['false', '0', 'no'].includes(normalized)) {
            return false;
        }
    }

    return undefined;
}
