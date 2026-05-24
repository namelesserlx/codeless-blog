'use client';

import { useEffect, useRef } from 'react';
import { getVisitorId } from '@/lib/client/visitor-id';

interface ArticleViewAndTimeTrackerProps {
    articleId: string; // 文章ID
    viewDelayMs?: number; // viewDelayMs 视窗延迟时间，默认 5000ms，即5秒后才触发上报
    tickMs?: number; // tickMs 定时器时间，默认 5000ms，即每5秒触发一次
    flushEveryMs?: number; // flushEveryMs 定时器时间，默认 60000ms，即每分钟 flush 一次
}

export function ArticleViewAndTimeTracker({
    articleId,
    viewDelayMs = 5000,
    tickMs = 5000,
    flushEveryMs = 60000,
}: ArticleViewAndTimeTrackerProps) {
    const lastActivityTs = useRef<number>(Date.now());
    const accumulatedMs = useRef<number>(0);
    const sentView = useRef<boolean>(false);
    const visitorIdRef = useRef<string>('');
    useEffect(() => {
        let tickTimer: number | undefined; // tickTimer 定时器
        let flushTimer: number | undefined; // flushTimer 定时器
        let pendingMs = 0; // pendingMs 待发送时间

        const markActive = () => (lastActivityTs.current = Date.now()); // markActive 标记活动
        const onVisibility = () => (lastActivityTs.current = Date.now()); // onVisibility 标记可见

        window.addEventListener('mousemove', markActive, { passive: true }); // 监听鼠标移动事件
        window.addEventListener('scroll', markActive, { passive: true }); // 监听滚动事件
        window.addEventListener('keydown', markActive); // 监听键盘事件
        document.addEventListener('visibilitychange', onVisibility); // 监听可见性变化事件

        (async () => {
            visitorIdRef.current = await getVisitorId(); // 获取访客ID

            /**
             * 记录用户有效浏览行为，上报阅读人数UV，累计阅读时长
             * 定时器：每5秒触发一次，如果页面可见且最近30秒内活跃，则累计时间，并发送浏览
             * 只会触发发送一次浏览（sentView.current 设为 true 后不再触发）。
             *  如果用户：
             *  1. 打开页面但立即关闭 / 切到后台（可见时间+活跃不足 5s）
             *  2. 或一直在后台 tab（visible === false）
             *  3. 或超过 30 秒完全没任何交互（recentlyActive === false）
             * 那么 不会 调用 /view。
             */
            tickTimer = window.setInterval(() => {
                const visible = document.visibilityState === 'visible'; // 是否可见
                const recentlyActive = Date.now() - lastActivityTs.current < 30000; // 最近30秒内活跃
                if (visible && recentlyActive) {
                    accumulatedMs.current += tickMs; // 累计时间
                    pendingMs += tickMs; // 待发送时间
                }
                if (!sentView.current && accumulatedMs.current >= viewDelayMs) {
                    // 如果未发送浏览且累计时间大于等于视窗延迟时间
                    sentView.current = true;
                    const blob = new Blob([JSON.stringify({ visitorId: visitorIdRef.current })], {
                        // 创建Blob
                        type: 'application/json', // 类型为application/json
                    });
                    navigator.sendBeacon(`/api/posts/${articleId}/view`, blob); // 发送浏览
                }
            }, tickMs);

            /**
             * 周期性上报阅读时长，每分钟刷新一次
             * 如果页面可见，则发送阅读时长，否则不发送，
             * 每累计一段时间（默认每 60 秒），只要这段时间内有“可见 + 活跃”的 tick，就会批量上报一次阅读时长增量。
             */
            flushTimer = window.setInterval(() => {
                if (pendingMs <= 0) return;
                const payload = {
                    visitorId: visitorIdRef.current,
                    deltaSeconds: Math.round(pendingMs / 1000),
                };
                pendingMs = 0;
                fetch(`/api/posts/${articleId}/readtime`, {
                    // 发送阅读时长
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify(payload),
                    keepalive: true,
                }).catch(() => {});
            }, flushEveryMs);

            /**
             当前页面触发：
             * beforeunload（关闭 / 刷新 / 跳转）
             * visibilitychange 变为 hidden（切到后台 tab、切换页面等）
             * 且此时 pendingMs > 0，说明这次离开前，有一段累计但还没 flush 的阅读时间。
             * 这时会通过 navigator.sendBeacon 调用 /readtime，确保用户在离开页面前的阅读时长也被上报，不用等到下一次 60s 定时器。
            */
            const flushOnHide = () => {
                if (pendingMs <= 0) return;
                const data = JSON.stringify({
                    visitorId: visitorIdRef.current,
                    deltaSeconds: Math.round(pendingMs / 1000),
                });
                pendingMs = 0;
                navigator.sendBeacon(
                    // 发送阅读时长
                    `/api/posts/${articleId}/readtime`,
                    new Blob([data], { type: 'application/json' }),
                );
            };
            window.addEventListener('beforeunload', flushOnHide); // 监听页面卸载事件
            document.addEventListener('visibilitychange', () => {
                if (document.visibilityState === 'hidden') flushOnHide(); // 如果页面不可见，则发送阅读时长
            });
        })();

        return () => {
            window.removeEventListener('mousemove', markActive); // 移除鼠标移动事件
            window.removeEventListener('scroll', markActive); // 移除滚动事件
            window.removeEventListener('keydown', markActive); // 移除键盘事件
            document.removeEventListener('visibilitychange', onVisibility); // 移除可见性变化事件
            if (tickTimer) clearInterval(tickTimer); // 移除定时器
            if (flushTimer) clearInterval(flushTimer); // 移除定时器
        };
    }, [articleId, tickMs, viewDelayMs, flushEveryMs]);

    return null;
}
