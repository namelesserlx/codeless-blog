import {
    AppstoreOutlined,
    CommentOutlined,
    EyeOutlined,
    FileTextOutlined,
} from '@ant-design/icons';
import type { DashboardMetricCardTemplate, DashboardRangeOption } from './types';

export const dashboardRangeOptions: DashboardRangeOption[] = [
    { label: '今日', value: 'today' },
    { label: '近 7 天', value: '7d' },
    { label: '近 30 天', value: '30d' },
];

export const dashboardMetricCardTemplates: DashboardMetricCardTemplate[] = [
    {
        key: 'article',
        title: '文章总数',
        icon: <FileTextOutlined />,
        iconStyle: { background: '#edf2ff', color: '#2f54eb' },
    },
    {
        key: 'snippet',
        title: '片段总数',
        icon: <AppstoreOutlined />,
        iconStyle: { background: '#f6ffed', color: '#52c41a' },
    },
    {
        key: 'comment',
        title: '评论总数',
        icon: <CommentOutlined />,
        iconStyle: { background: '#f9f0ff', color: '#9254de' },
    },
    {
        key: 'view',
        title: '总浏览量',
        icon: <EyeOutlined />,
        iconStyle: { background: '#fff7e6', color: '#fa8c16' },
    },
];
