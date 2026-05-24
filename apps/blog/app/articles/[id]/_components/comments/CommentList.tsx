'use client';

import { Button } from '@/components/ui/button';
import { CommentItem } from './CommentItem';
import { Loader2, MessageCircle, ChevronDown } from 'lucide-react';
import type { CommentListProps } from './types';

export function CommentList({
    comments,
    postId,
    authorId,
    onLoadMore,
    hasMore,
    isLoading,
    onReplyPublished,
}: CommentListProps) {
    if (comments.length === 0) {
        return (
            <div className="py-14 text-center text-gray-500 md:py-18 dark:text-gray-400">
                <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-gray-100 md:h-20 md:w-20 dark:bg-gray-800">
                    <MessageCircle
                        size={24}
                        className="text-gray-300 md:hidden dark:text-gray-600"
                    />
                    <MessageCircle
                        size={32}
                        className="hidden text-gray-300 md:block dark:text-gray-600"
                    />
                </div>
                <p className="mb-1 text-base font-medium md:text-lg">还没有评论</p>
                <p className="text-sm md:text-base">来发表第一条评论吧！</p>
            </div>
        );
    }

    return (
        <div className="space-y-8">
            <div className="space-y-8">
                {comments &&
                    comments.length > 0 &&
                    comments.map((comment, index) => (
                        <div key={comment.id}>
                            <CommentItem
                                comment={comment}
                                postId={postId}
                                authorId={authorId}
                                onReplyPublished={onReplyPublished}
                            />
                            {index < comments.length - 1 && (
                                <div className="mt-8 border-b border-gray-100 dark:border-gray-800" />
                            )}
                        </div>
                    ))}
            </div>

            {hasMore && (
                <div className="flex justify-center pt-2 md:pt-4">
                    <Button
                        variant="outline"
                        onClick={onLoadMore}
                        disabled={isLoading}
                        className="flex items-center gap-2 rounded-full border-gray-200 bg-white px-5 py-2.5 text-sm hover:bg-gray-50 md:px-6 md:text-base dark:border-gray-700 dark:bg-[#111827] dark:hover:bg-gray-800"
                    >
                        {isLoading ? (
                            <>
                                <Loader2 size={16} className="animate-spin" />
                                <span className="hidden sm:inline">加载中...</span>
                                <span className="sm:hidden">加载中</span>
                            </>
                        ) : (
                            <>
                                <ChevronDown size={16} />
                                <span className="hidden sm:inline">加载更多评论</span>
                                <span className="sm:hidden">更多</span>
                            </>
                        )}
                    </Button>
                </div>
            )}

            {!hasMore && comments.length > 0 && (
                <div className="py-4 text-center md:py-6">
                    <div className="inline-flex items-center gap-2 text-xs text-gray-400 md:text-sm dark:text-gray-500">
                        <div className="h-px w-8 bg-gray-200 md:w-12 dark:bg-gray-700"></div>
                        <span>已经到底了</span>
                        <div className="h-px w-8 bg-gray-200 md:w-12 dark:bg-gray-700"></div>
                    </div>
                </div>
            )}
        </div>
    );
}
