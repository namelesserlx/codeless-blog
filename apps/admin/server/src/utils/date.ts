export interface DateBucket {
    date: Date;
    key: string;
    label: string;
}

const pad = (value: number): string => String(value).padStart(2, '0');

/**
 * 返回日期当天的 00:00:00。
 *
 * @param date 原始日期对象。
 * @returns 当天零点时间。
 * @example
 * startOfDay(new Date('2026-03-19T15:24:18'));
 * // => new Date('2026-03-19T00:00:00')
 */
export const startOfDay = (date: Date): Date =>
    new Date(date.getFullYear(), date.getMonth(), date.getDate(), 0, 0, 0, 0);

/**
 * 在指定日期上增加或减少天数。
 *
 * @param date 起始日期。
 * @param days 增减的天数，负数表示向前。
 * @returns 偏移后的新日期。
 * @example
 * addDays(new Date('2026-03-19T00:00:00'), 3);
 * // => new Date('2026-03-22T00:00:00')
 */
export const addDays = (date: Date, days: number): Date => {
    const next = new Date(date);
    next.setDate(next.getDate() + days);
    return next;
};

/**
 * 格式化为 `YYYY-MM-DD`。
 *
 * @param date 日期对象。
 * @returns 日期字符串。
 * @example
 * formatDate(new Date('2026-03-19T15:24:18'));
 * // => '2026-03-19'
 */
export const formatDate = (date: Date): string =>
    `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`;

/**
 * 格式化为 `YYYY-MM-DD HH:mm`。
 *
 * @param date 日期对象。
 * @returns 日期时间字符串。
 * @example
 * formatDateTime(new Date('2026-03-19T15:24:18'));
 * // => '2026-03-19 15:24'
 */
export const formatDateTime = (date: Date): string =>
    `${formatDate(date)} ${pad(date.getHours())}:${pad(date.getMinutes())}`;

/**
 * 格式化为 `M/D`。
 *
 * @param date 日期对象。
 * @returns 月/日字符串。
 * @example
 * formatMonthDay(new Date('2026-03-19T15:24:18'));
 * // => '3/19'
 */
export const formatMonthDay = (date: Date): string => `${date.getMonth() + 1}/${date.getDate()}`;

/**
 * 格式化为 `MM/DD HH:mm`。
 *
 * @param date 日期对象。
 * @returns 月/日时间字符串。
 * @example
 * formatMonthDayTime(new Date('2026-03-19T15:24:18'));
 * // => '03/19 15:24'
 */
export const formatMonthDayTime = (date: Date): string =>
    `${pad(date.getMonth() + 1)}/${pad(date.getDate())} ${pad(date.getHours())}:${pad(date.getMinutes())}`;

/**
 * 解析日期字符串；缺失时返回兜底日期。
 *
 * @param value `YYYY-MM-DD` 格式的日期字符串。
 * @param fallback 缺失时返回的默认日期。
 * @returns 解析后的日期对象。
 * @example
 * parseDate('2026-03-19', new Date('2026-03-01T00:00:00'));
 * // => new Date('2026-03-19T00:00:00')
 *
 * @example
 * parseDate(undefined, new Date('2026-03-01T00:00:00'));
 * // => new Date('2026-03-01T00:00:00')
 */
export const parseDate = (value: string | undefined, fallback: Date): Date => {
    if (!value) {
        return fallback;
    }

    const [year, month, day] = value.split('-').map(Number);
    return startOfDay(new Date(year, month - 1, day));
};

/**
 * 安全解析日期字符串；非法日期返回 `null`。
 *
 * @param value `YYYY-MM-DD` 格式的日期字符串。
 * @returns 合法日期对象或 `null`。
 * @example
 * parseDateSafe('2026-02-29');
 * // => null
 *
 * @example
 * parseDateSafe('2024-02-29');
 * // => new Date('2024-02-29T00:00:00')
 */
export const parseDateSafe = (value?: string): Date | null => {
    if (!value || !/^\d{4}-\d{2}-\d{2}$/.test(value)) {
        return null;
    }

    const [year, month, day] = value.split('-').map(Number);
    if (!year || !month || !day) {
        return null;
    }

    const date = startOfDay(new Date(year, month - 1, day));

    if (date.getFullYear() !== year || date.getMonth() !== month - 1 || date.getDate() !== day) {
        return null;
    }

    return date;
};

/**
 * 计算两个日期之间包含首尾的天数。
 *
 * @param start 开始日期。
 * @param end 结束日期。
 * @returns 包含首尾的总天数。
 * @example
 * countDays(new Date('2026-03-01T00:00:00'), new Date('2026-03-07T00:00:00'));
 * // => 7
 */
export const countDays = (start: Date, end: Date): number => {
    let total = 0;

    for (
        let date = startOfDay(start), last = startOfDay(end);
        date <= last;
        date = addDays(date, 1)
    ) {
        total += 1;
    }

    return total;
};

/**
 * 按天生成日期桶。
 *
 * @param start 开始日期。
 * @param end 结束日期。
 * @param getLabel 每个日期的标签生成函数，默认使用 `M/D`。
 * @returns 日期桶数组。
 * @example
 * buildDateBuckets(new Date('2026-03-01T00:00:00'), new Date('2026-03-03T00:00:00'));
 * // => [
 * //      { date: new Date('2026-03-01T00:00:00'), key: '2026-03-01', label: '3/1' },
 * //      { date: new Date('2026-03-02T00:00:00'), key: '2026-03-02', label: '3/2' },
 * //      { date: new Date('2026-03-03T00:00:00'), key: '2026-03-03', label: '3/3' }
 * //    ]
 */
export const buildDateBuckets = (
    start: Date,
    end: Date,
    getLabel: (date: Date) => string = formatMonthDay,
): DateBucket[] => {
    const buckets: DateBucket[] = [];

    for (
        let date = startOfDay(start), last = startOfDay(end);
        date <= last;
        date = addDays(date, 1)
    ) {
        buckets.push({
            date,
            key: formatDate(date),
            label: getLabel(date),
        });
    }

    return buckets;
};
