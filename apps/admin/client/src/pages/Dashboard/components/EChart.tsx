import { useEffect, useRef } from 'react';
import { GaugeChart, LineChart } from 'echarts/charts';
import { AxisPointerComponent, GridComponent, TooltipComponent } from 'echarts/components';
import { init, use as registerEChartsModules } from 'echarts/core';
import type { EChartsType } from 'echarts/core';
import { SVGRenderer } from 'echarts/renderers';
import type { EChartsOption } from 'echarts/types/dist/option';

registerEChartsModules([
    LineChart,
    GaugeChart,
    GridComponent,
    TooltipComponent,
    AxisPointerComponent,
    SVGRenderer,
]);

interface EChartProps {
    className?: string;
    option: EChartsOption;
}

export function EChart({ className, option }: EChartProps) {
    const containerRef = useRef<HTMLDivElement | null>(null);
    const chartRef = useRef<EChartsType | null>(null);

    useEffect(() => {
        const node = containerRef.current;
        if (!node) return;

        chartRef.current = init(node, undefined, { renderer: 'svg' });

        const resizeObserver = new ResizeObserver(() => {
            chartRef.current?.resize();
        });
        resizeObserver.observe(node);

        return () => {
            resizeObserver.disconnect();
            chartRef.current?.dispose();
            chartRef.current = null;
        };
    }, []);

    useEffect(() => {
        chartRef.current?.setOption(option, { notMerge: true });
    }, [option]);

    return <div ref={containerRef} className={className} />;
}
