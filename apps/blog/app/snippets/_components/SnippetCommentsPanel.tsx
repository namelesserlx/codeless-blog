'use client';

import { useEffect, useState } from 'react';
import { toast } from 'sonner';
import { apiRequest } from '@/lib/client/api-client';
import { useAuth } from '@/context/auth-context';
import { CommentStatus } from '@blog/shared';
import type { ResponseData, Comment, GetCommentsResponse } from '@blog/shared';
import type { SnippetCommentItem } from '../_lib/snippet-types';
import { getSnippetAuthorName } from '../_lib/snippet-utils';

interface SnippetCommentsPanelProps {
    snippetId: string;
}

const commentsCache = new Map<string, SnippetCommentItem[]>();
const commentsPromiseCache = new Map<string, Promise<SnippetCommentItem[]>>();

function normalizeComments(comments: Comment[]): SnippetCommentItem[] {
    return comments.map((comment) => ({
        id: comment.id,
        content: comment.content,
        createdAt: new Date(comment.createdAt).toISOString(),
        author: {
            id: comment.author.id,
            username: comment.author.username,
            nickname: comment.author.nickname,
            avatar: comment.author.avatar,
        },
    }));
}

async function fetchSnippetComments(snippetId: string) {
    const params = new URLSearchParams({
        snippetId,
        page: '1',
        limit: '20',
    });

    const response = await fetch(`/api/blog/comments?${params.toString()}`, {
        method: 'GET',
        cache: 'no-store',
    });

    if (!response.ok) {
        throw new Error(`获取评论失败: ${response.status}`);
    }

    const result = (await response.json()) as ResponseData<GetCommentsResponse>;

    if (result.code !== 0) {
        throw new Error(result.message || '获取评论失败');
    }

    return normalizeComments(result.data.comments);
}

export function prefetchSnippetComments(snippetId: string) {
    const cached = commentsCache.get(snippetId);

    if (cached) {
        return Promise.resolve(cached);
    }

    const existingPromise = commentsPromiseCache.get(snippetId);

    if (existingPromise) {
        return existingPromise;
    }

    const nextPromise = fetchSnippetComments(snippetId)
        .then((comments) => {
            commentsCache.set(snippetId, comments);
            return comments;
        })
        .finally(() => {
            commentsPromiseCache.delete(snippetId);
        });

    commentsPromiseCache.set(snippetId, nextPromise);
    return nextPromise;
}

export function SnippetCommentsPanel({ snippetId }: SnippetCommentsPanelProps) {
    const [comments, setComments] = useState<SnippetCommentItem[]>(() => {
        return commentsCache.get(snippetId) ?? [];
    });
    const [loading, setLoading] = useState(() => !commentsCache.has(snippetId));
    const [submitting, setSubmitting] = useState(false);
    const [content, setContent] = useState('');
    const { auth, handleOpenLoginDialog } = useAuth();

    useEffect(() => {
        let cancelled = false;
        const cached = commentsCache.get(snippetId);

        if (cached) {
            setComments(cached);
            setLoading(false);
            return;
        }

        setLoading(true);

        prefetchSnippetComments(snippetId)
            .then((nextComments) => {
                if (cancelled) {
                    return;
                }

                setComments(nextComments);
            })
            .catch((error) => {
                if (!cancelled) {
                    console.error('加载片段评论失败:', error);
                }
            })
            .finally(() => {
                if (!cancelled) {
                    setLoading(false);
                }
            });

        return () => {
            cancelled = true;
        };
    }, [snippetId]);

    const syncCommentsCache = (nextComments: SnippetCommentItem[]) => {
        commentsCache.set(snippetId, nextComments);
        setComments(nextComments);
    };

    const handleSubmit = async () => {
        const trimmedContent = content.trim();

        if (!trimmedContent) {
            return;
        }

        if (!auth?.token) {
            handleOpenLoginDialog(true);
            toast.info('登录后就可以参与评论了');
            return;
        }

        try {
            setSubmitting(true);

            const result = await apiRequest<ResponseData<Comment>>({
                endpoint: '/api/blog/comments/create',
                method: 'POST',
                data: {
                    snippetId,
                    content: trimmedContent,
                },
                options: {
                    headers: {
                        Authorization: `Bearer ${auth.token}`,
                    },
                },
            });

            if (result.code !== 0) {
                throw new Error(result.message || '评论发送失败');
            }

            if (result.data.status === CommentStatus.REJECTED) {
                toast.error('评论未通过审核', {
                    description: result.message || '评论内容可能不符合规范，请修改后重新提交',
                });
                return;
            }

            const nextComment: SnippetCommentItem = {
                id: result.data.id,
                content: result.data.content,
                createdAt: new Date(result.data.createdAt).toISOString(),
                author: {
                    id: result.data.author.id,
                    username: result.data.author.username,
                    nickname: result.data.author.nickname,
                    avatar: result.data.author.avatar,
                },
            };

            if (result.data.status === CommentStatus.PUBLISHED) {
                syncCommentsCache([nextComment, ...comments]);
            }

            setContent('');
            toast.success('评论已提交', {
                description:
                    result.data.status === CommentStatus.PUBLISHED
                        ? '评论已显示在当前片段下。'
                        : '审核通过后会显示在这里。',
            });
        } catch (error) {
            console.error('提交片段评论失败:', error);
            toast.error('评论发送失败', {
                description: error instanceof Error ? error.message : '请稍后再试',
            });
        } finally {
            setSubmitting(false);
        }
    };

    return (
        <div className="mt-5 space-y-4 rounded-2xl border border-zinc-100 bg-white p-5 shadow-sm dark:border-zinc-800/50 dark:bg-zinc-900/50">
            {loading ? (
                <div className="space-y-3 py-1">
                    <div className="h-4 w-40 animate-pulse rounded-full bg-zinc-100 dark:bg-zinc-800" />
                    <div className="h-4 w-56 animate-pulse rounded-full bg-zinc-100 dark:bg-zinc-800" />
                </div>
            ) : comments.length > 0 ? (
                comments.map((comment) => (
                    <div key={comment.id} className="text-[14px] leading-relaxed">
                        <span className="mr-2 cursor-pointer font-medium text-zinc-900 transition-colors hover:text-[#0ea5e9] dark:text-zinc-100">
                            {getSnippetAuthorName(comment.author)}:
                        </span>
                        <span className="text-zinc-600 dark:text-zinc-400">{comment.content}</span>
                    </div>
                ))
            ) : (
                <div className="py-3 text-center text-[14px] text-zinc-400">
                    还没有人评论，快来抢沙发吧！
                </div>
            )}

            <div className="mt-2 flex items-center gap-3 border-t border-zinc-100 pt-4 dark:border-zinc-800/50">
                <input
                    type="text"
                    value={content}
                    onChange={(event) => setContent(event.target.value)}
                    placeholder="写评论..."
                    disabled={submitting}
                    className="flex-1 bg-transparent text-[14px] text-zinc-800 outline-none placeholder:text-zinc-400 dark:text-zinc-200 dark:placeholder:text-zinc-500"
                />
                <button
                    type="button"
                    onClick={handleSubmit}
                    disabled={submitting}
                    className="rounded-full px-3 py-1.5 text-[14px] font-medium text-[#0ea5e9] transition-colors hover:bg-sky-50 hover:text-[#0284c7] disabled:opacity-50 dark:hover:bg-sky-900/20"
                >
                    发送
                </button>
            </div>
        </div>
    );
}
