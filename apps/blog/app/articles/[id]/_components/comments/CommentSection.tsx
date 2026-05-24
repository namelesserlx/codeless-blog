'use client';

import { useCallback, useEffect, useState } from 'react';
import { CommentForm } from './CommentForm';
import { CommentList } from './CommentList';
import { MessageCircle } from 'lucide-react';

import type { CommentFormData } from './types';
import { apiRequest } from '@/lib/client/api-client';
import { toast } from 'sonner';
import { CommentStatus, type ResponseData, type Comment } from '@blog/shared';
import { useAuth } from '@/context/auth-context';

interface CommentSectionProps {
    articleId: string;
    authorId?: number;
}

export function CommentSection({ articleId, authorId }: CommentSectionProps) {
    const [comments, setComments] = useState<Comment[]>([]);
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [hasMore, setHasMore] = useState(true);
    const [isLoading, setIsLoading] = useState(false);
    const [currentPage, setCurrentPage] = useState(1);
    const { auth, handleOpenLoginDialog } = useAuth();

    const fetchComments = useCallback(
        async (page: number) => {
            const params = new URLSearchParams({
                postId: articleId,
                page: String(page),
                limit: '20',
            });

            const response = await fetch(`/api/blog/comments?${params.toString()}`, {
                method: 'GET',
                cache: 'no-store',
            });

            if (!response.ok) {
                throw new Error(`获取评论失败: ${response.status}`);
            }

            return (await response.json()) as ResponseData<{
                comments: Comment[];
                pagination: { page: number; limit: number; total: number; totalPages: number };
            }>;
        },
        [articleId],
    );

    useEffect(() => {
        const loadInitialComments = async () => {
            try {
                const res = await fetchComments(1);
                if (res.code === 0) {
                    setComments(res.data.comments);
                    setHasMore(res.data.pagination.page < res.data.pagination.totalPages);
                    setCurrentPage(1);
                }
            } catch (error) {
                console.error('加载评论失败:', error);
            }
        };

        loadInitialComments();
    }, [fetchComments]);

    const handleSubmitComment = async (data: CommentFormData) => {
        if (!auth?.token) {
            handleOpenLoginDialog(true);
            toast.info('请先登录后再发表评论');
            return false;
        }

        setIsSubmitting(true);
        try {
            const res: ResponseData<Comment> = await apiRequest({
                endpoint: '/api/blog/comments/create',
                method: 'POST',
                data: {
                    postId: articleId,
                    content: data.content,
                },
                options: {
                    headers: {
                        Authorization: `Bearer ${auth.token}`,
                    },
                },
            });
            if (res.code === 0) {
                if (res.data.status === CommentStatus.REJECTED) {
                    toast.error('评论未通过审核', {
                        description: res.message || '评论内容可能不符合规范，请修改后重新提交',
                    });
                    return false;
                }

                toast.success(
                    res.data.status === CommentStatus.PUBLISHED ? '评论发表成功' : '评论已提交',
                    {
                        description:
                            res.data.status === CommentStatus.PUBLISHED
                                ? '评论已通过自动审核。'
                                : '审核通过后会显示在这里。',
                    },
                );
                if (res.data.status === CommentStatus.PUBLISHED) {
                    setComments((prev) => [res.data, ...prev]);
                }
                return true;
            } else {
                toast.error('评论发表失败', {
                    description: res.message || '请稍后重试',
                });
            }
        } catch {
            toast.error('评论发表失败', {
                description: '网络错误，请稍后重试',
            });
        } finally {
            setIsSubmitting(false);
        }

        return false;
    };

    const handleLoadMore = async () => {
        setIsLoading(true);

        try {
            const nextPage = currentPage + 1;
            const res = await fetchComments(nextPage);

            if (res.code === 0) {
                setComments((prev) => [...prev, ...res.data.comments]);
                setCurrentPage(nextPage);
                setHasMore(nextPage < res.data.pagination.totalPages);
            }
        } catch (error) {
            console.error('加载更多评论失败:', error);
        } finally {
            setIsLoading(false);
        }
    };

    const handleReplyPublished = (parentId: number, reply: Comment) => {
        setComments((prev) =>
            prev.map((comment) => {
                if (comment.id !== parentId) {
                    return comment;
                }

                if (comment.replies?.some((item) => item.id === reply.id)) {
                    return comment;
                }

                const replies = [...(comment.replies ?? []), reply];
                const currentReplyCount = Math.max(
                    comment._count?.replies ?? 0,
                    comment.replies?.length ?? 0,
                );
                return {
                    ...comment,
                    replies,
                    _count: {
                        likes: comment._count?.likes ?? 0,
                        replies: currentReplyCount + 1,
                    },
                };
            }),
        );
    };

    const totalReplies = comments.reduce((acc, comment) => {
        return acc + (comment?.replies?.length || 0);
    }, 0);

    const totalComments = comments.length + totalReplies;

    return (
        <div className="space-y-8 md:space-y-10">
            <div className="flex items-center gap-3">
                <div className="flex items-center gap-3">
                    <MessageCircle
                        size={24}
                        strokeWidth={1.8}
                        className="text-gray-900 dark:text-gray-100"
                    />
                    <h3 className="text-2xl font-bold tracking-tight text-gray-900 dark:text-white">
                        评论
                    </h3>
                </div>
                {totalComments > 0 && (
                    <span className="inline-flex items-center rounded-full border border-primary/20 bg-primary/10 px-3 py-1 text-xs font-medium text-primary">
                        {totalComments}
                    </span>
                )}
            </div>

            <CommentForm
                onSubmit={handleSubmitComment}
                placeholder="写下你的评论..."
                buttonText="发表评论"
                isSubmitting={isSubmitting}
            />

            <CommentList
                comments={comments}
                postId={articleId}
                authorId={authorId}
                onLoadMore={handleLoadMore}
                hasMore={hasMore}
                isLoading={isLoading}
                onReplyPublished={handleReplyPublished}
            />
        </div>
    );
}
