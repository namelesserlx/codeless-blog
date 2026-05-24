'use client';

import { useEffect, useRef, useState, useTransition } from 'react';
import { Loader2 } from 'lucide-react';
import { SnippetPost } from './SnippetPost';
import type { SnippetListItem, SnippetListResponse } from '../_lib/snippet-types';
import { formatSnippetRelativeTime } from '../_lib/snippet-utils';

interface SnippetFeedProps {
    initialSnippets: SnippetListItem[];
    initialPage: number;
    totalPages: number;
    pageSize: number;
}

function hydrateSnippet(item: SnippetListItem) {
    return {
        ...item,
        relativeCreatedAt: formatSnippetRelativeTime(item.createdAt),
    };
}

function getHashTargetId() {
    if (typeof window === 'undefined' || !window.location.hash) {
        return '';
    }

    return decodeURIComponent(window.location.hash.slice(1));
}

function alignSnippetIntoView(targetId: string, behavior: ScrollBehavior) {
    if (typeof window === 'undefined' || !targetId) {
        return false;
    }

    const target = document.getElementById(targetId);

    if (!target) {
        return false;
    }

    const header = document.querySelector('header');
    const headerHeight = header instanceof HTMLElement ? header.getBoundingClientRect().height : 0;
    const viewportOffset = Math.max(32, Math.min(window.innerHeight * 0.18, 180));
    const absoluteTop = window.scrollY + target.getBoundingClientRect().top;
    const maxScrollTop = Math.max(0, document.documentElement.scrollHeight - window.innerHeight);
    const nextTop = Math.min(
        Math.max(0, absoluteTop - headerHeight - viewportOffset),
        maxScrollTop,
    );

    window.scrollTo({ top: nextTop, behavior });
    return true;
}

export function SnippetFeed({
    initialSnippets,
    initialPage,
    totalPages,
    pageSize,
}: SnippetFeedProps) {
    const [snippets, setSnippets] = useState(initialSnippets);
    const [page, setPage] = useState(initialPage);
    const [hasMore, setHasMore] = useState(initialPage < totalPages);
    const [loadingFailed, setLoadingFailed] = useState(false);
    const [isLoadingMore, setIsLoadingMore] = useState(false);
    const [isPending, startTransition] = useTransition();
    const sentinelRef = useRef<HTMLDivElement | null>(null);
    const loadingRef = useRef(false);
    const pendingHashRef = useRef<string | null>(null);

    useEffect(() => {
        if (!hasMore || !sentinelRef.current) {
            return;
        }

        const observer = new IntersectionObserver(
            (entries) => {
                const entry = entries[0];

                if (!entry?.isIntersecting || loadingRef.current) {
                    return;
                }

                loadingRef.current = true;
                setIsLoadingMore(true);
                setLoadingFailed(false);

                const nextPage = page + 1;

                fetch(`/api/snippets?page=${nextPage}&limit=${pageSize}`, {
                    method: 'GET',
                    cache: 'no-store',
                })
                    .then(async (response) => {
                        if (!response.ok) {
                            throw new Error(`获取更多片段失败: ${response.status}`);
                        }

                        return (await response.json()) as SnippetListResponse;
                    })
                    .then((result) => {
                        startTransition(() => {
                            setSnippets((current) => {
                                const knownIds = new Set(current.map((item) => item.id));
                                const nextItems = result.snippets
                                    .map(hydrateSnippet)
                                    .filter((item) => !knownIds.has(item.id));

                                return [...current, ...nextItems];
                            });
                            setPage(result.pagination.page);
                            setHasMore(result.pagination.page < result.pagination.totalPages);
                        });
                    })
                    .catch((error) => {
                        console.error('加载更多片段失败:', error);
                        setLoadingFailed(true);
                    })
                    .finally(() => {
                        loadingRef.current = false;
                        setIsLoadingMore(false);
                    });
            },
            {
                rootMargin: '800px 0px',
                threshold: 0.01,
            },
        );

        observer.observe(sentinelRef.current);

        return () => {
            observer.disconnect();
        };
    }, [hasMore, page, pageSize, startTransition]);

    useEffect(() => {
        if (typeof window === 'undefined') {
            return;
        }

        let frameId = 0;
        let settleTimer = 0;
        let mediaTimer = 0;

        const scheduleAlignment = (behavior: ScrollBehavior) => {
            const targetId = pendingHashRef.current;

            if (!targetId) {
                return;
            }

            window.cancelAnimationFrame(frameId);
            window.clearTimeout(settleTimer);
            window.clearTimeout(mediaTimer);

            frameId = window.requestAnimationFrame(() => {
                if (alignSnippetIntoView(targetId, behavior)) {
                    pendingHashRef.current = null;
                }
            });

            settleTimer = window.setTimeout(() => {
                if (alignSnippetIntoView(targetId, behavior)) {
                    pendingHashRef.current = null;
                }
            }, 120);

            mediaTimer = window.setTimeout(() => {
                if (alignSnippetIntoView(targetId, behavior)) {
                    pendingHashRef.current = null;
                }
            }, 360);
        };

        const handleHashChange = () => {
            const targetId = getHashTargetId();
            pendingHashRef.current = targetId || null;

            if (targetId) {
                scheduleAlignment('smooth');
            }
        };

        pendingHashRef.current = getHashTargetId() || null;

        if (pendingHashRef.current) {
            scheduleAlignment('auto');
        }

        window.addEventListener('hashchange', handleHashChange);

        return () => {
            window.removeEventListener('hashchange', handleHashChange);
            window.cancelAnimationFrame(frameId);
            window.clearTimeout(settleTimer);
            window.clearTimeout(mediaTimer);
        };
    }, []);

    useEffect(() => {
        if (!pendingHashRef.current || typeof window === 'undefined') {
            return;
        }

        const frameId = window.requestAnimationFrame(() => {
            if (alignSnippetIntoView(pendingHashRef.current!, 'auto')) {
                pendingHashRef.current = null;
            }
        });

        return () => {
            window.cancelAnimationFrame(frameId);
        };
    }, [snippets.length]);

    return (
        <div className="mx-auto max-w-2xl px-6 pt-8 pb-32 md:px-4">
            <div className="space-y-4">
                {snippets.map((snippet, index) => (
                    <SnippetPost key={snippet.id} snippet={snippet} index={index} />
                ))}
            </div>

            {hasMore ? (
                <div ref={sentinelRef} className="py-10">
                    <div className="flex items-center justify-center gap-2 text-sm text-zinc-400 dark:text-zinc-500">
                        <Loader2
                            className={`h-4 w-4 ${isLoadingMore || isPending ? 'animate-spin' : ''}`}
                        />
                        <span>
                            {loadingFailed ? '加载失败，继续下滑可重试' : '正在加载更多片段...'}
                        </span>
                    </div>
                </div>
            ) : snippets.length > 0 ? (
                <div className="mt-16 flex items-center justify-center gap-4 text-sm text-zinc-400 dark:text-zinc-600">
                    <div className="h-px w-12 bg-zinc-200 dark:bg-zinc-800" />
                    <span className="text-[12px] tracking-[0.3em] uppercase">The End</span>
                    <div className="h-px w-12 bg-zinc-200 dark:bg-zinc-800" />
                </div>
            ) : (
                <div className="py-20 text-center text-sm text-zinc-400 dark:text-zinc-500">
                    还没有任何片段内容
                </div>
            )}
        </div>
    );
}
