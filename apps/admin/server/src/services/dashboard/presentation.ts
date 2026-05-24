import os from 'os';
import type { DashboardHealthGauge, DashboardOverviewResponse } from '@blog/shared';
import { emailNotificationService } from '../email/notification';
import type { ContentModuleData, TrafficModuleData } from './types';

const clamp = (value: number, min: number, max: number) => Math.min(max, Math.max(min, value));

const formatTrend = (current: number, previous: number): number => {
    if (previous === 0) {
        return current === 0 ? 0 : 100;
    }

    return Number((((current - previous) / previous) * 100).toFixed(1));
};

export const buildHealthGauges = (): DashboardHealthGauge[] => {
    const cpuUsage = clamp(
        Math.round((os.loadavg()[0] / Math.max(os.cpus().length, 1)) * 100),
        0,
        100,
    );
    const memoryUsage = clamp(
        Math.round(((os.totalmem() - os.freemem()) / os.totalmem()) * 100),
        0,
        100,
    );
    const emailQueueStatus = emailNotificationService.getServiceStatus().queueStatus;
    const emailQueueTotal = emailQueueStatus.total;
    const emailQueueGaugeTotal = Math.max(emailQueueTotal + 5, 10);

    return [
        {
            key: 'cpu',
            label: 'CPU 使用率',
            value: cpuUsage,
            total: 100,
            activeColor: '#3b82f6',
        },
        {
            key: 'memory',
            label: '内存使用率',
            value: memoryUsage,
            total: 100,
            activeColor: '#a855f7',
        },
        {
            key: 'queue',
            label: '邮件队列长度',
            value: emailQueueTotal,
            total: emailQueueGaugeTotal,
            activeColor: '#14b8a6',
            unit: '封',
        },
    ];
};

export const buildOverviewMetrics = (
    content: ContentModuleData,
    traffic: TrafficModuleData,
): DashboardOverviewResponse['metrics'] => {
    return [
        {
            key: 'article',
            total: content.article.total,
            unit: '篇',
            trend: formatTrend(content.article.currentNew, content.article.previousNew),
            hint: `较上期新增 ${content.article.currentNew} 篇`,
        },
        {
            key: 'snippet',
            total: content.snippet.total,
            unit: '条',
            trend: formatTrend(content.snippet.currentNew, content.snippet.previousNew),
            hint: `本期新增 ${content.snippet.currentNew} 条`,
        },
        {
            key: 'comment',
            total: content.comment.total,
            unit: '条',
            trend: formatTrend(content.comment.currentNew, content.comment.previousNew),
            hint: `待审核 ${content.comment.pending} 条`,
        },
        {
            key: 'view',
            total: traffic.totalViews,
            unit: '次',
            trend: formatTrend(traffic.currentWindowViews, traffic.previousWindowViews),
            hint: `当前窗口访问 ${traffic.currentWindowViews} 次`,
        },
    ];
};
