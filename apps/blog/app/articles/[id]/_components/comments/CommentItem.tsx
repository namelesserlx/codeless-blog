'use client';

import { useCallback, useState } from 'react';
import { UserAvatar } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import { apiRequest } from '@/lib/client/api-client';
import dayjs from 'dayjs';
import Picker from '@emoji-mart/react';
import data from '@emoji-mart/data';
import { ChevronDown, ChevronUp, Clock, Heart, MapPin, Reply, Smile } from 'lucide-react';
import { toast } from 'sonner';
import { CommentStatus, type Comment, type ResponseData } from '@blog/shared';
import { useAuth } from '@/context/auth-context';
import type { CommentProps } from './types';

interface EmojiSelection {
    native: string;
}

function formatTime(date: Date) {
    const diff = dayjs().diff(dayjs(date), 'minute');
    if (diff < 1) return '刚刚';
    if (diff < 60) return `${diff}分钟前`;
    if (diff < 1440) return `${Math.floor(diff / 60)}小时前`;
    if (diff < 10080) return `${Math.floor(diff / 1440)}天前`;
    return dayjs(date).format('YYYY年MM月DD日');
}

export function CommentItem({
    comment,
    level = 0,
    postId,
    authorId,
    onReplyPublished,
}: CommentProps) {
    const [showReplies, setShowReplies] = useState(level < 2);
    const [isReplying, setIsReplying] = useState(false);
    const [isLiked, setIsLiked] = useState(false);
    const [replyContent, setReplyContent] = useState('');
    const [isSubmittingReply, setIsSubmittingReply] = useState(false);
    const [showEmojiPicker, setShowEmojiPicker] = useState(false);
    const { auth } = useAuth();
    const authorName = comment.author.nickname || '访客';

    const handleCancelReply = () => {
        setIsReplying(false);
        setReplyContent('');
    };

    const handleSubmitReply = useCallback(async () => {
        if (!replyContent.trim()) {
            toast.error('回复内容不能为空');
            return;
        }

        setIsSubmittingReply(true);
        try {
            const parentId = comment.parentId || comment.id;

            if (auth) {
                const res: ResponseData<Comment> = await apiRequest({
                    endpoint: '/api/blog/comments/create',
                    method: 'POST',
                    data: {
                        postId,
                        content: replyContent.trim(),
                        parentId,
                        receiverId: comment.author.id,
                    },
                    options: {
                        headers: {
                            Authorization: `Bearer ${auth.token}`,
                        },
                    },
                });

                if (res.code === 0) {
                    if (res.data.status === CommentStatus.REJECTED) {
                        toast.error('回复未通过审核', {
                            description: res.message || '回复内容可能不符合规范，请修改后重新提交',
                        });
                        return;
                    }

                    toast.success(
                        res.data.status === CommentStatus.PUBLISHED ? '回复发表成功' : '回复已提交',
                        {
                            description:
                                res.data.status === CommentStatus.PUBLISHED
                                    ? '回复已通过自动审核。'
                                    : '审核通过后会显示在这里。',
                        },
                    );
                    if (res.data.status === CommentStatus.PUBLISHED) {
                        onReplyPublished?.(parentId, res.data);
                        setShowReplies(true);
                    }
                    setReplyContent('');
                    setIsReplying(false);
                } else {
                    toast.error('回复发表失败', {
                        description: res.message || '请稍后重试',
                    });
                }
            }
        } catch {
            toast.error('回复发表失败', {
                description: '网络错误，请稍后重试',
            });
        } finally {
            setIsSubmittingReply(false);
        }
    }, [
        auth,
        comment.author.id,
        comment.id,
        comment.parentId,
        onReplyPublished,
        postId,
        replyContent,
    ]);

    const handleEmojiClick = (emoji: EmojiSelection) => {
        setReplyContent(replyContent + emoji.native);
        setShowEmojiPicker(false);
    };

    const replyCount = comment._count?.replies ?? comment.replies?.length ?? 0;
    const likeCount = comment.likeCount + (isLiked ? 1 : 0);

    return (
        <div
            className={
                level > 0
                    ? 'ml-4 border-l-2 border-gray-100 pl-3 md:ml-8 md:pl-6 dark:border-gray-700'
                    : ''
            }
        >
            <div className="flex gap-3 md:gap-4">
                <UserAvatar
                    className="flex-shrink-0"
                    src={comment.author.avatar}
                    name={authorName}
                />

                <div className="min-w-0 flex-1">
                    <div className="mb-2 flex flex-wrap items-center gap-x-2 gap-y-1">
                        <span className="text-sm font-semibold text-gray-900 md:text-base dark:text-gray-100">
                            {comment.author.nickname}
                        </span>

                        {authorId === comment.author.id && (
                            <span className="inline-flex items-center rounded-full border border-primary/20 bg-primary/10 px-2 py-0.5 text-xs font-medium text-primary">
                                作者
                            </span>
                        )}

                        <span className="flex flex-wrap items-center gap-2 text-xs text-gray-400 sm:ml-auto dark:text-gray-500">
                            {comment.location && (
                                <span className="inline-flex items-center gap-1">
                                    <MapPin size={12} />
                                    {comment.location}
                                </span>
                            )}
                            <span className="inline-flex items-center gap-1">
                                <Clock size={12} />
                                {formatTime(comment.createdAt)}
                            </span>
                        </span>
                    </div>

                    <div className="text-sm leading-7 text-gray-700 md:text-[15px] dark:text-gray-300">
                        {comment.parentId && (
                            <span className="font-medium text-sky-600 dark:text-sky-400">
                                @{comment.receiver?.nickname}{' '}
                            </span>
                        )}
                        {comment.content}
                    </div>

                    <div className="mt-3 flex flex-wrap items-center gap-5 text-sm">
                        <button
                            type="button"
                            onClick={() => setIsLiked((value) => !value)}
                            className={`inline-flex items-center gap-1.5 font-medium transition-colors ${
                                isLiked
                                    ? 'text-sky-500 dark:text-sky-300'
                                    : 'text-gray-500 hover:text-gray-900 dark:text-gray-400 dark:hover:text-white'
                            }`}
                        >
                            <Heart size={16} className={isLiked ? 'fill-current' : ''} />
                            <span>{likeCount}</span>
                        </button>

                        <button
                            type="button"
                            onClick={() => setIsReplying((value) => !value)}
                            className={`inline-flex items-center gap-1.5 font-medium transition-colors ${
                                isReplying
                                    ? 'text-sky-500 dark:text-sky-300'
                                    : 'text-gray-500 hover:text-gray-900 dark:text-gray-400 dark:hover:text-white'
                            }`}
                        >
                            <Reply size={16} />
                            <span>{isReplying ? '取消回复' : '回复'}</span>
                        </button>

                        {replyCount > 0 && (
                            <button
                                type="button"
                                onClick={() => setShowReplies((value) => !value)}
                                className="inline-flex items-center gap-1.5 font-medium text-sky-500 transition-colors hover:text-sky-600 dark:text-sky-300 dark:hover:text-sky-200"
                            >
                                {showReplies ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
                                <span>
                                    {showReplies ? '收起回复' : `展开 ${replyCount} 条回复`}
                                </span>
                            </button>
                        )}
                    </div>

                    {isReplying && (
                        <div className="mt-4 rounded-2xl bg-white/70 p-4 ring-1 ring-gray-200 dark:bg-[#111827]/65 dark:ring-gray-700">
                            <div className="mb-3 flex items-center justify-between">
                                <span className="text-sm font-medium text-gray-600 dark:text-gray-300">
                                    回复 @{comment.author.nickname}
                                </span>
                                <Button
                                    variant="ghost"
                                    size="sm"
                                    onClick={handleCancelReply}
                                    className="h-6 w-6 p-0 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"
                                >
                                    ×
                                </Button>
                            </div>

                            <div className="relative">
                                <textarea
                                    value={replyContent}
                                    onChange={(event) => setReplyContent(event.target.value)}
                                    placeholder={`回复 @${comment.author.nickname}...`}
                                    className="min-h-[90px] w-full rounded-xl border border-gray-200 bg-white px-3 py-3 text-sm leading-7 transition-all duration-200 placeholder:text-gray-400 focus:border-sky-400 focus:ring-2 focus:ring-sky-400/20 focus:outline-none dark:border-gray-700 dark:bg-[#1f2937] dark:text-gray-100 dark:placeholder:text-gray-500 dark:focus:border-sky-400 dark:focus:ring-sky-400/20"
                                    autoFocus
                                    disabled={isSubmittingReply}
                                />

                                <div className="absolute right-3 bottom-3 hidden items-center gap-2 md:flex">
                                    <Button
                                        type="button"
                                        variant="ghost"
                                        size="sm"
                                        className="h-7 w-7 rounded-full p-0 text-gray-400 hover:bg-gray-100 hover:text-gray-600 dark:hover:bg-gray-800 dark:hover:text-gray-300"
                                        onClick={() => setShowEmojiPicker((value) => !value)}
                                    >
                                        <Smile size={14} />
                                    </Button>
                                    {showEmojiPicker && (
                                        <Picker
                                            data={data}
                                            onEmojiSelect={handleEmojiClick}
                                            onClickOutside={() => setShowEmojiPicker(false)}
                                            previewPosition="none"
                                            locale="zh"
                                        />
                                    )}
                                </div>
                            </div>

                            <div className="mt-3 flex justify-end gap-2">
                                <Button
                                    variant="outline"
                                    size="sm"
                                    onClick={handleCancelReply}
                                    className="h-8 px-3 text-xs"
                                    disabled={isSubmittingReply}
                                >
                                    取消
                                </Button>
                                <Button
                                    size="sm"
                                    onClick={handleSubmitReply}
                                    disabled={isSubmittingReply || !replyContent.trim()}
                                    className="h-8 bg-sky-500 px-3 text-xs text-white hover:bg-sky-600 disabled:opacity-50"
                                >
                                    {isSubmittingReply ? '发表中...' : '回复'}
                                </Button>
                            </div>
                        </div>
                    )}
                </div>
            </div>

            {comment.replies && comment.replies.length > 0 && showReplies && (
                <div className="mt-4 space-y-4 md:mt-6 md:space-y-6">
                    {comment.replies.map((reply) => (
                        <CommentItem
                            key={reply.id}
                            comment={reply}
                            postId={postId}
                            authorId={authorId}
                            onReplyPublished={onReplyPublished}
                            level={level + 1}
                        />
                    ))}
                </div>
            )}
        </div>
    );
}
