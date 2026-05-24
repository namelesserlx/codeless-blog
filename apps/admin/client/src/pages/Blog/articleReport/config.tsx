import { CommentOutlined, EyeOutlined, FileTextOutlined, LikeOutlined } from '@ant-design/icons';
import type {
    ArticleDetailLegendItem,
    ArticleReportPresetOption,
    MetricDefinition,
    OverviewMetricCardTemplate,
} from './types';

export const PRESET_OPTIONS: ArticleReportPresetOption[] = [
    { label: '近 7 天', value: '7d' },
    { label: '近 30 天', value: '30d' },
    { label: '近 90 天', value: '90d' },
];

export const METRICS: MetricDefinition[] = [
    {
        key: 'uv',
        label: 'UV',
        color: '#2563eb',
        areaStart: 'rgba(37, 99, 235, 0.26)',
        areaEnd: 'rgba(37, 99, 235, 0.02)',
        axisFormatter: (value) => `${Math.round(value)}`,
        valueFormatter: (value) => `${Math.round(value)}`,
        tooltipSuffix: 'UV',
    },
    {
        key: 'comments',
        label: '评论数',
        color: '#0f766e',
        areaStart: 'rgba(15, 118, 110, 0.24)',
        areaEnd: 'rgba(15, 118, 110, 0.02)',
        axisFormatter: (value) => `${Math.round(value)}`,
        valueFormatter: (value) => `${Math.round(value)}`,
        tooltipSuffix: '条评论',
    },
    {
        key: 'likeAdds',
        label: '点赞互动',
        color: '#e11d48',
        areaStart: 'rgba(225, 29, 72, 0.22)',
        areaEnd: 'rgba(225, 29, 72, 0.02)',
        axisFormatter: (value) => `${Math.round(value)}`,
        valueFormatter: (value) => `${Math.round(value)}`,
        tooltipSuffix: '次互动',
    },
];

export const ARTICLE_DETAIL_CHART_COLORS = {
    uv: '#1677ff',
    comments: '#13c2c2',
    likeAdds: '#eb2f96',
} as const;

export const ARTICLE_DETAIL_LEGEND: ArticleDetailLegendItem[] = [
    { key: 'uv', label: 'UV', color: ARTICLE_DETAIL_CHART_COLORS.uv },
    {
        key: 'comments',
        label: '评论数',
        color: ARTICLE_DETAIL_CHART_COLORS.comments,
    },
    {
        key: 'likeAdds',
        label: '点赞互动',
        color: ARTICLE_DETAIL_CHART_COLORS.likeAdds,
    },
];

export const OVERVIEW_METRIC_CARD_TEMPLATES: OverviewMetricCardTemplate[] = [
    {
        key: 'articleCount',
        label: '匹配文章',
        icon: <FileTextOutlined />,
        iconStyle: { background: '#edf2ff', color: '#2f54eb' },
    },
    {
        key: 'uv',
        label: '所选范围 UV',
        icon: <EyeOutlined />,
        iconStyle: { background: '#e6f4ff', color: '#1677ff' },
    },
    {
        key: 'comments',
        label: '所选范围评论',
        icon: <CommentOutlined />,
        iconStyle: { background: '#e6fffb', color: '#08979c' },
    },
    {
        key: 'likes',
        label: '当前点赞存量',
        icon: <LikeOutlined />,
        iconStyle: { background: '#fff1f0', color: '#f5222d' },
    },
];
