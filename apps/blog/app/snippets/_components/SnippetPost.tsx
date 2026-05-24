'use client';

import { useEffect, useState } from 'react';
import { motion } from 'motion/react';
import { Heart, MessageCircle, Share2 } from 'lucide-react';
import { toast } from 'sonner';
import { UserAvatar } from '@/components/ui/avatar';
import { useIntersectionObserver } from '@/components/photo/useIntersectionObserver';
import { cn } from '@/lib/shared/utils';
import type { SnippetListItem } from '../_lib/snippet-types';
import { buildSnippetAnchor, getSnippetAuthorName } from '../_lib/snippet-utils';
import { SnippetMediaGrid } from './SnippetMediaGrid';
import { prefetchSnippetComments, SnippetCommentsPanel } from './SnippetCommentsPanel';

const VISITOR_ID_KEY = 'visitorId';
const COMMENTS_TRANSITION = {
    opacity: {
        duration: 0.16,
        ease: [0.33, 1, 0.68, 1] as [number, number, number, number],
    },
    y: {
        duration: 0.2,
        ease: [0.22, 1, 0.36, 1] as [number, number, number, number],
    },
};

function getOrCreateVisitorId() {
    if (typeof window === 'undefined') {
        return 'server';
    }

    const cached = window.localStorage.getItem(VISITOR_ID_KEY);

    if (cached) {
        return cached;
    }

    const nextId =
        typeof crypto !== 'undefined' && 'randomUUID' in crypto
            ? crypto.randomUUID()
            : Math.random().toString(36).slice(2);

    window.localStorage.setItem(VISITOR_ID_KEY, nextId);
    return nextId;
}

function copyTextWithExecCommand(text: string) {
    const textarea = document.createElement('textarea');
    textarea.value = text;
    textarea.setAttribute('readonly', 'true');
    textarea.style.position = 'fixed';
    textarea.style.top = '0';
    textarea.style.left = '-9999px';

    document.body.appendChild(textarea);
    textarea.focus();
    textarea.select();

    const copied = document.execCommand('copy');
    document.body.removeChild(textarea);

    return copied;
}

async function copyTextToClipboard(text: string) {
    if (
        typeof window !== 'undefined' &&
        window.isSecureContext &&
        typeof navigator !== 'undefined' &&
        navigator.clipboard?.writeText
    ) {
        await navigator.clipboard.writeText(text);
        return true;
    }

    return copyTextWithExecCommand(text);
}

interface SnippetPostProps {
    snippet: SnippetListItem;
    index: number;
}

export function SnippetPost({ snippet, index }: SnippetPostProps) {
    const [liked, setLiked] = useState(false);
    const [likesCount, setLikesCount] = useState(snippet.likesCount);
    const [commentsOpen, setCommentsOpen] = useState(false);
    const [commentsMounted, setCommentsMounted] = useState(false);
    const prioritizeMedia = index === 0;
    const articleStyle = prioritizeMedia
        ? { scrollMarginTop: 'clamp(7rem, 18vh, 11rem)' }
        : {
              contentVisibility: 'auto' as const,
              containIntrinsicSize: '540px',
              scrollMarginTop: 'clamp(7rem, 18vh, 11rem)',
          };
    const { ref, isVisible } = useIntersectionObserver({
        threshold: 0.55,
        rootMargin: '0px',
        triggerOnce: true,
    });
    const authorName = getSnippetAuthorName(snippet.author);

    useEffect(() => {
        if (!isVisible) {
            return;
        }

        const visitorId = getOrCreateVisitorId();

        fetch(`/api/snippets/${snippet.id}/view`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({ visitorId }),
        }).catch((error) => {
            console.error('记录片段浏览失败:', error);
        });
    }, [isVisible, snippet.id]);

    useEffect(() => {
        if (!isVisible || typeof window === 'undefined') {
            return;
        }

        const frameId = globalThis.requestAnimationFrame(() => {
            void prefetchSnippetComments(snippet.id);
        });

        return () => {
            globalThis.cancelAnimationFrame(frameId);
        };
    }, [isVisible, snippet.id]);

    const handleLike = async () => {
        const visitorId = getOrCreateVisitorId();
        const previousLiked = liked;
        const previousCount = likesCount;
        const nextLiked = !previousLiked;

        setLiked(nextLiked);
        setLikesCount((count) => count + (nextLiked ? 1 : -1));

        try {
            const response = await fetch(`/api/snippets/${snippet.id}/like`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({ visitorId }),
            });

            if (!response.ok) {
                throw new Error(`点赞失败: ${response.status}`);
            }

            const result = (await response.json()) as {
                liked: boolean;
                count: number;
            };

            setLiked(result.liked);
            setLikesCount(result.count);
        } catch (error) {
            console.error('更新片段点赞失败:', error);
            setLiked(previousLiked);
            setLikesCount(previousCount);
        }
    };

    const handleShare = async () => {
        const url = `${window.location.origin}/snippets#${buildSnippetAnchor(snippet.id)}`;
        const shareData = {
            title: snippet.title || snippet.excerpt,
            text: snippet.excerpt,
            url,
        };

        try {
            if (typeof navigator !== 'undefined' && typeof navigator.share === 'function') {
                await navigator.share(shareData);
                return;
            }

            const copied = await copyTextToClipboard(url);

            if (!copied) {
                throw new Error('当前浏览器不支持自动复制');
            }

            toast.success('片段链接已复制');
        } catch (error) {
            if (error instanceof DOMException && error.name === 'AbortError') {
                return;
            }

            console.error('分享片段失败:', error);
            toast.error('分享失败，请手动复制当前页面链接');
        }
    };

    const handleToggleComments = () => {
        void prefetchSnippetComments(snippet.id);
        setCommentsMounted(true);
        setCommentsOpen((value) => !value);
    };

    return (
        <article
            id={buildSnippetAnchor(snippet.id)}
            className="group relative border-b border-zinc-200 py-8 last:border-0 dark:border-zinc-800/50"
            style={articleStyle}
        >
            <div ref={ref} className="pointer-events-none absolute h-px w-px opacity-0" />

            <div className="mb-4 flex items-center gap-3">
                <UserAvatar src={snippet.author.avatar} name={authorName} />

                <div className="flex flex-col">
                    <span className="text-[15px] font-medium text-zinc-900 dark:text-zinc-100">
                        {authorName}
                    </span>
                    <span className="text-[13px] text-zinc-400 dark:text-zinc-500">
                        {snippet.relativeCreatedAt}
                    </span>
                </div>
            </div>

            <p className="mb-4 text-[16px] leading-relaxed break-words whitespace-pre-wrap text-zinc-800 dark:text-zinc-200">
                {snippet.title ? `${snippet.title}\n${snippet.content}`.trim() : snippet.content}
            </p>

            {snippet.media.length > 0 ? (
                <div className="mb-4">
                    <SnippetMediaGrid
                        media={snippet.media}
                        excerpt={snippet.excerpt}
                        prioritizeMedia={prioritizeMedia}
                    />
                </div>
            ) : null}

            <div className="mt-4 flex items-center justify-between">
                <div className="flex items-center gap-3">
                    <button
                        type="button"
                        onClick={handleLike}
                        className={cn(
                            'flex items-center gap-1.5 rounded-full px-3.5 py-2 text-[13px] font-medium transition-colors',
                            liked
                                ? 'bg-rose-50 text-rose-600 hover:bg-rose-100 dark:bg-rose-500/10 dark:text-rose-400 dark:hover:bg-rose-500/20'
                                : 'bg-zinc-100 text-zinc-600 hover:bg-zinc-200 dark:bg-white/5 dark:text-zinc-400 dark:hover:bg-white/10 dark:hover:text-zinc-300',
                        )}
                        aria-label="点赞"
                    >
                        <Heart
                            className={cn(
                                'h-4 w-4 transition-transform active:scale-75',
                                liked && 'fill-current',
                            )}
                        />
                        <span>{likesCount > 0 ? likesCount : '赞'}</span>
                    </button>

                    <button
                        type="button"
                        onPointerEnter={() => {
                            void prefetchSnippetComments(snippet.id);
                        }}
                        onFocus={() => {
                            void prefetchSnippetComments(snippet.id);
                        }}
                        onTouchStart={() => {
                            void prefetchSnippetComments(snippet.id);
                        }}
                        onClick={handleToggleComments}
                        className="flex items-center gap-1.5 rounded-full bg-zinc-100 px-3.5 py-2 text-[13px] font-medium text-zinc-600 transition-colors hover:bg-zinc-200 dark:bg-white/5 dark:text-zinc-400 dark:hover:bg-white/10 dark:hover:text-zinc-300"
                        aria-expanded={commentsOpen}
                        aria-controls={`snippet-comments-${snippet.id}`}
                    >
                        <MessageCircle className="h-4 w-4 transition-transform active:scale-75" />
                        <span>{snippet.commentsCount > 0 ? snippet.commentsCount : '评论'}</span>
                    </button>
                </div>

                <button
                    type="button"
                    onClick={handleShare}
                    className="flex items-center gap-1.5 rounded-full bg-zinc-100 px-3.5 py-2 text-[13px] font-medium text-zinc-600 transition-colors hover:bg-zinc-200 dark:bg-white/5 dark:text-zinc-400 dark:hover:bg-white/10 dark:hover:text-zinc-300"
                    aria-label="分享片段"
                >
                    <Share2 className="h-4 w-4 transition-transform active:scale-75" />
                </button>
            </div>

            {commentsMounted ? (
                <motion.div
                    id={`snippet-comments-${snippet.id}`}
                    initial={false}
                    animate={
                        commentsOpen
                            ? {
                                  height: 'auto',
                                  opacity: 1,
                                  marginTop: 20,
                              }
                            : {
                                  height: 0,
                                  opacity: 0,
                                  marginTop: 0,
                              }
                    }
                    className="overflow-hidden"
                    style={{ overflowAnchor: 'none' }}
                    transition={{
                        height: {
                            duration: 0.28,
                            ease: [0.22, 1, 0.36, 1],
                        },
                        opacity: {
                            duration: 0.16,
                            ease: [0.33, 1, 0.68, 1],
                        },
                        marginTop: {
                            duration: 0.28,
                            ease: [0.22, 1, 0.36, 1],
                        },
                    }}
                    aria-hidden={!commentsOpen}
                >
                    <motion.div
                        initial={false}
                        animate={
                            commentsOpen
                                ? {
                                      opacity: 1,
                                      y: 0,
                                  }
                                : {
                                      opacity: 0,
                                      y: -6,
                                  }
                        }
                        transition={COMMENTS_TRANSITION}
                    >
                        <SnippetCommentsPanel snippetId={snippet.id} />
                    </motion.div>
                </motion.div>
            ) : null}
        </article>
    );
}
