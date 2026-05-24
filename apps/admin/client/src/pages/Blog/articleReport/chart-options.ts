import type {
    EChartsOption,
    TooltipComponentFormatterCallbackParams,
} from 'echarts/types/dist/option';
import { ARTICLE_DETAIL_CHART_COLORS } from './config';
import { formatNumber } from './formatters';
import type { MetricDefinition, MetricKey, TrendPoint } from './types';

type TooltipItem = Extract<TooltipComponentFormatterCallbackParams, readonly unknown[]>[number];

function toTooltipItems(params: TooltipComponentFormatterCallbackParams): TooltipItem[] {
    return Array.isArray(params) ? params : [params];
}

function getTooltipNumericValue(value: TooltipItem['value']): number {
    const candidate = Array.isArray(value) ? value[value.length - 1] : value;
    const numericValue =
        typeof candidate === 'number' || typeof candidate === 'string' || candidate instanceof Date
            ? Number(candidate)
            : NaN;

    return Number.isFinite(numericValue) ? numericValue : 0;
}

export function buildTrendOption(points: TrendPoint[], metric: MetricDefinition): EChartsOption {
    return {
        tooltip: {
            trigger: 'axis',
            backgroundColor: '#0f172a',
            borderWidth: 0,
            textStyle: { color: '#fff' },
            formatter: (params: TooltipComponentFormatterCallbackParams) => {
                const [currentItem] = toTooltipItems(params);
                const value = currentItem ? getTooltipNumericValue(currentItem.value) : 0;
                const label = currentItem?.name ?? '';
                return `${label}<br />${metric.valueFormatter(value)} ${metric.tooltipSuffix}`;
            },
        },
        grid: { top: 26, right: 14, bottom: 28, left: 8, containLabel: true },
        xAxis: {
            type: 'category',
            boundaryGap: false,
            data: points.map((point) => point.label),
            axisLine: { lineStyle: { color: '#e2e8f0' } },
            axisTick: { show: false },
            axisLabel: { color: '#64748b', fontSize: 11 },
        },
        yAxis: {
            type: 'value',
            axisLine: { show: false },
            axisTick: { show: false },
            splitLine: { lineStyle: { color: '#eef2ff' } },
            axisLabel: {
                color: '#94a3b8',
                fontSize: 11,
                formatter: (value: number) => metric.axisFormatter(value),
            },
        },
        series: [
            {
                type: 'line',
                smooth: true,
                symbol: 'circle',
                symbolSize: 6,
                data: points.map((point) => point[metric.key]),
                lineStyle: {
                    width: 3,
                    color: metric.color,
                },
                itemStyle: {
                    color: metric.color,
                    borderColor: '#ffffff',
                    borderWidth: 2,
                },
                areaStyle: {
                    color: {
                        type: 'linear',
                        x: 0,
                        y: 0,
                        x2: 0,
                        y2: 1,
                        colorStops: [
                            { offset: 0, color: metric.areaStart },
                            { offset: 1, color: metric.areaEnd },
                        ],
                    },
                },
            },
        ],
    };
}

export function buildArticleDetailOption(
    points: TrendPoint[],
    activeMetric?: MetricKey,
): EChartsOption {
    const isActive = (metricKey: MetricKey) => (activeMetric ? metricKey === activeMetric : true);

    return {
        tooltip: {
            trigger: 'axis',
            axisPointer: {
                type: 'cross',
                crossStyle: {
                    color: '#94a3b8',
                },
            },
            backgroundColor: '#0f172a',
            borderWidth: 0,
            textStyle: { color: '#fff' },
            formatter: (params: TooltipComponentFormatterCallbackParams) => {
                const items = toTooltipItems(params);
                const label = items[0]?.name ?? '';
                const rows = items.map(
                    (item) =>
                        `${item.marker ?? ''}${item.seriesName ?? ''}：${formatNumber(
                            getTooltipNumericValue(item.value),
                        )}`,
                );

                return [label, ...rows].join('<br />');
            },
        },
        grid: { top: 30, right: 18, bottom: 28, left: 10, containLabel: true },
        xAxis: {
            type: 'category',
            boundaryGap: true,
            data: points.map((point) => point.label),
            axisLine: { lineStyle: { color: '#e2e8f0' } },
            axisTick: { show: false },
            axisLabel: { color: '#64748b', fontSize: 11 },
        },
        yAxis: {
            type: 'value',
            axisLine: { show: false },
            axisTick: { show: false },
            splitLine: { lineStyle: { color: '#eef2ff' } },
            axisLabel: {
                color: '#94a3b8',
                fontSize: 11,
                formatter: (value: number) => `${Math.round(value)}`,
            },
        },
        series: [
            {
                name: 'UV',
                type: 'line',
                smooth: true,
                showSymbol: false,
                symbol: 'circle',
                symbolSize: 4,
                data: points.map((point) => point.uv),
                lineStyle: {
                    width: isActive('uv') ? 3.2 : 2.1,
                    color: ARTICLE_DETAIL_CHART_COLORS.uv,
                    opacity: isActive('uv') ? 1 : 0.55,
                },
                itemStyle: {
                    color: ARTICLE_DETAIL_CHART_COLORS.uv,
                    borderWidth: 0,
                    opacity: isActive('uv') ? 0.9 : 0.68,
                },
                emphasis: {
                    scale: 0.9,
                    itemStyle: {
                        color: ARTICLE_DETAIL_CHART_COLORS.uv,
                        borderWidth: 0,
                        opacity: 1,
                    },
                },
                z: 4,
            },
            {
                name: '评论数',
                type: 'line',
                smooth: true,
                symbol: 'circle',
                symbolSize: 5,
                data: points.map((point) => point.comments),
                lineStyle: {
                    width: isActive('comments') ? 3 : 2,
                    color: ARTICLE_DETAIL_CHART_COLORS.comments,
                    opacity: isActive('comments') ? 1 : 0.55,
                },
                itemStyle: {
                    color: ARTICLE_DETAIL_CHART_COLORS.comments,
                    opacity: isActive('comments') ? 1 : 0.72,
                },
                z: 3,
            },
            {
                name: '点赞互动',
                type: 'line',
                smooth: true,
                symbol: 'circle',
                symbolSize: 5,
                data: points.map((point) => point.likeAdds),
                lineStyle: {
                    width: isActive('likeAdds') ? 3 : 2,
                    type: 'dashed',
                    color: ARTICLE_DETAIL_CHART_COLORS.likeAdds,
                    opacity: isActive('likeAdds') ? 1 : 0.55,
                },
                itemStyle: {
                    color: ARTICLE_DETAIL_CHART_COLORS.likeAdds,
                    opacity: isActive('likeAdds') ? 1 : 0.72,
                },
                z: 2,
            },
        ],
    };
}
