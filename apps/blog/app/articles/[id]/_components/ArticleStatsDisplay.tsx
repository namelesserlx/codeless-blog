'use client';

import { useEffect, useState, useRef } from 'react';
import { getVisitorId } from '@/lib/client/visitor-id';
import { Eye, Clock } from 'lucide-react';

interface ArticleStatsDisplayProps {
    articleId: string;
}

export function ArticleStatsDisplay({ articleId }: ArticleStatsDisplayProps) {
    const [views, setViews] = useState<number>(0);
    const [readSeconds, setReadSeconds] = useState<number>(0);
    const visitorIdRef = useRef<string>('');

    useEffect(() => {
        const fetchStats = async () => {
            try {
                if (!visitorIdRef.current) {
                    visitorIdRef.current = await getVisitorId();
                }
                const visitorId = visitorIdRef.current;

                const res = await fetch(
                    `/api/posts/${articleId}/stats?visitorId=${encodeURIComponent(visitorId)}`,
                    {
                        method: 'GET',
                        cache: 'no-store',
                    },
                );
                if (res.ok) {
                    const data = await res.json();
                    if (typeof data?.views === 'number') setViews(data.views);
                    if (typeof data?.readSecondsForVisitor === 'number')
                        setReadSeconds(data.readSecondsForVisitor);
                }
            } catch (err) {
                console.error('加载统计失败', err);
            }
        };

        // 初始加载
        fetchStats();

        // 可选：每 60s 轻量刷新一次，保持与上报节奏一致
        const timer = window.setInterval(fetchStats, 60000);

        return () => {
            clearInterval(timer);
        };
    }, [articleId]);

    const minutes = Math.max(1, Math.ceil(readSeconds / 60));

    return (
        <>
            <div className="flex items-center gap-2">
                <Clock size={16} strokeWidth={1.5} />
                <span>{minutes} 分钟阅读</span>
            </div>
            <div className="flex items-center gap-2">
                <Eye size={16} strokeWidth={1.5} />
                <span>{views.toLocaleString('zh-CN')} 次阅读</span>
            </div>
        </>
    );
}
