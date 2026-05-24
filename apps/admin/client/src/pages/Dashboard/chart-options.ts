import type { EChartsOption } from 'echarts/types/dist/option';
import type { HealthGaugeItem, TrafficPoint } from './types';

type TooltipFormatterParam = {
    name: string;
    value: string | number;
};

const trendTooltip = {
    trigger: 'axis',
    backgroundColor: '#111827',
    borderWidth: 0,
    padding: [8, 10],
    textStyle: {
        color: '#ffffff',
        fontSize: 12,
    },
    formatter: (params: unknown) => {
        const current = Array.isArray(params)
            ? (params[0] as TooltipFormatterParam)
            : (params as TooltipFormatterParam);
        return `${current.name}<br/>访问量：${current.value}`;
    },
} as NonNullable<EChartsOption['tooltip']>;

export function getGaugeChartOption(item: HealthGaugeItem): EChartsOption {
    return {
        animation: false,
        series: [
            {
                type: 'gauge',
                startAngle: 210,
                endAngle: -30,
                min: 0,
                max: item.total,
                radius: '94%',
                center: ['50%', '56%'],
                splitNumber: 5,
                pointer: {
                    show: true,
                    width: 4,
                    length: '56%',
                    itemStyle: {
                        color: item.activeColor,
                    },
                },
                progress: {
                    show: true,
                    roundCap: true,
                    width: 8,
                    itemStyle: {
                        color: item.activeColor,
                    },
                },
                axisLine: {
                    lineStyle: {
                        width: 8,
                        color: [[1, '#e5e7eb']],
                    },
                },
                axisTick: {
                    show: false,
                },
                splitLine: {
                    distance: -2,
                    length: 6,
                    lineStyle: {
                        width: 1,
                        color: '#cbd5e1',
                    },
                },
                axisLabel: {
                    distance: 8,
                    color: '#94a3b8',
                    fontSize: 9,
                },
                anchor: {
                    show: true,
                    showAbove: true,
                    size: 9,
                    itemStyle: {
                        color: '#ffffff',
                        borderWidth: 3,
                        borderColor: item.activeColor,
                    },
                },
                title: {
                    show: false,
                },
                detail: {
                    valueAnimation: true,
                    offsetCenter: [0, '64%'],
                    formatter: (value: number) => `${value}${item.unit ?? '%'}`,
                    color: '#1e2939',
                    fontSize: 18,
                    fontWeight: 700,
                },
                data: [{ value: item.value }],
            },
        ],
    };
}

export function getTrendChartOption(data: TrafficPoint[]): EChartsOption {
    return {
        animation: false,
        grid: {
            left: 44,
            right: 18,
            top: 12,
            bottom: 26,
        },
        tooltip: trendTooltip,
        xAxis: {
            type: 'category',
            boundaryGap: false,
            data: data.map((item) => item.label),
            axisLine: {
                show: false,
            },
            axisTick: {
                show: false,
            },
            axisLabel: {
                color: '#9ca3af',
                fontSize: 12,
                margin: 10,
            },
        },
        yAxis: {
            type: 'value',
            min: 0,
            splitNumber: 4,
            axisLine: {
                show: false,
            },
            axisTick: {
                show: false,
            },
            axisLabel: {
                color: '#c0c9d7',
                fontSize: 11,
            },
            splitLine: {
                lineStyle: {
                    color: '#eff4fb',
                },
            },
        },
        series: [
            {
                type: 'line',
                smooth: true,
                data: data.map((item) => item.visits),
                symbol: 'circle',
                showSymbol: false,
                symbolSize: 8,
                lineStyle: {
                    width: 2,
                    color: '#3b82f6',
                },
                itemStyle: {
                    color: '#3b82f6',
                    borderColor: '#ffffff',
                    borderWidth: 2,
                },
                emphasis: {
                    focus: 'series',
                    scale: true,
                },
                areaStyle: {
                    color: {
                        type: 'linear',
                        x: 0,
                        y: 0,
                        x2: 0,
                        y2: 1,
                        colorStops: [
                            { offset: 0, color: 'rgba(59, 130, 246, 0.18)' },
                            { offset: 1, color: 'rgba(59, 130, 246, 0.02)' },
                        ],
                    },
                },
            },
        ],
    };
}
