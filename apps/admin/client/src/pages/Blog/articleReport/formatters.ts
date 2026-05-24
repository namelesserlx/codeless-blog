export const formatNumber = (value: number) =>
    new Intl.NumberFormat('zh-CN').format(Math.round(value));

export type DeltaTone = 'up' | 'down' | 'flat';

export function formatDelta(
    value: number | null,
    currentValue = 0,
    currentValueFormatter: (value: number) => string = formatNumber,
) {
    if (value === null) {
        return currentValue > 0 ? `↑ ${currentValueFormatter(currentValue)}` : '→ 0';
    }

    if (!Number.isFinite(value)) return '→ 0%';

    const rounded = Number(Math.abs(value).toFixed(1));

    if (value > 0) return `↑ ${rounded}%`;
    if (value < 0) return `↓ ${rounded}%`;
    return '→ 0%';
}

export function calculateDelta(current: number, previous: number) {
    if (previous === 0) {
        return current === 0 ? 0 : null;
    }

    return ((current - previous) / previous) * 100;
}

export function formatDeltaCount(value: number) {
    const absoluteValue = formatNumber(Math.abs(value));

    if (value > 0) return `↑ ${absoluteValue} 篇`;
    if (value < 0) return `↓ ${absoluteValue} 篇`;
    return '→ 0 篇';
}

export function getDeltaTone(value: number | null, currentValue = 0): DeltaTone {
    if (value === null) {
        return currentValue > 0 ? 'up' : 'flat';
    }

    if (!Number.isFinite(value) || value === 0) {
        return 'flat';
    }

    return value > 0 ? 'up' : 'down';
}
