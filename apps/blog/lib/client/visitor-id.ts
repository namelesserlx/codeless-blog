'use client';

import FingerprintJS from '@fingerprintjs/fingerprintjs';

const VISITOR_ID_KEY = 'visitorId';
const ANON_ID_KEY = 'anonId';
let visitorIdPromise: Promise<string> | null = null;

/**
 * 获取匿名访客 ID：优先使用缓存的 visitorId，确保一致性
 * 1. 优先从 localStorage 读取已缓存的 visitorId
 * 2. 如果没有缓存，使用 FingerprintJS 生成并缓存
 * 3. 如果 FingerprintJS 失败，使用 anonId 作为兜底
 */
export async function getVisitorId(): Promise<string> {
    if (typeof window === 'undefined') return 'server';

    // 优先使用已缓存的 visitorId，确保一致性
    const cachedVisitorId = localStorage.getItem(VISITOR_ID_KEY);
    if (cachedVisitorId) {
        console.log('[getVisitorId] Using cached visitorId:', cachedVisitorId);
        return cachedVisitorId;
    }

    if (visitorIdPromise) {
        return visitorIdPromise;
    }

    visitorIdPromise = (async () => {
        // 如果没有缓存的 visitorId，尝试使用 FingerprintJS 生成
        try {
            const fp = await FingerprintJS.load();
            const result = await fp.get();
            const visitorId = result.visitorId;

            // 立即缓存，确保后续调用返回相同的值
            localStorage.setItem(VISITOR_ID_KEY, visitorId);
            console.log('[getVisitorId] Generated new visitorId with FingerprintJS:', visitorId);
            return visitorId;
        } catch (error) {
            console.warn('[getVisitorId] FingerprintJS failed, using fallback:', error);

            // FingerprintJS 失败，使用 anonId 作为兜底
            let anonId = localStorage.getItem(ANON_ID_KEY);
            if (!anonId) {
                anonId = crypto.randomUUID();
                localStorage.setItem(ANON_ID_KEY, anonId);
                console.log('[getVisitorId] Generated new anonId:', anonId);
            } else {
                console.log('[getVisitorId] Using cached anonId:', anonId);
            }

            // 将 anonId 也保存为 visitorId，确保一致性
            localStorage.setItem(VISITOR_ID_KEY, anonId);
            return anonId;
        }
    })().finally(() => {
        visitorIdPromise = null;
    });

    return visitorIdPromise;
}
