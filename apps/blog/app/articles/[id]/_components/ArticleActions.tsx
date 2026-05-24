'use client';

import { useEffect, useState } from 'react';
import { Check, Heart, List, MessageCircle, Plus, Share2 } from 'lucide-react';
import { getVisitorId } from '@/lib/client/visitor-id';
import { AnimatePresence, motion } from 'motion/react';
import { cn } from '@/lib/shared/utils';

interface ArticleActionsProps {
    articleId: string;
    title: string;
    initialCommentCount?: number;
    onToc?: () => void;
}

export function ArticleActions({
    articleId,
    title,
    initialCommentCount = 0,
    onToc,
}: ArticleActionsProps) {
    const [isLiked, setIsLiked] = useState(false);
    const [likeCount, setLikeCount] = useState(0);
    const [commentCount] = useState(initialCommentCount);
    const [isCopied, setIsCopied] = useState(false);
    const [isOpen, setIsOpen] = useState(false);

    useEffect(() => {
        (async () => {
            try {
                const visitorId = await getVisitorId();
                const res = await fetch(
                    `/api/posts/${articleId}/like?visitorId=${encodeURIComponent(visitorId)}`,
                    {
                        method: 'GET',
                        cache: 'no-store',
                    },
                );
                if (!res.ok) return;
                const data = await res.json();
                if (typeof data?.count === 'number') setLikeCount(data.count);
                if (typeof data?.liked === 'boolean') setIsLiked(data.liked);
            } catch (err) {
                console.error('初始化点赞数据失败', err);
            }
        })();
    }, [articleId]);

    const handleLike = async () => {
        try {
            const visitorId = await getVisitorId();
            const res = await fetch(`/api/posts/${articleId}/like`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ visitorId }),
            });
            if (!res.ok) throw new Error('网络异常');
            const data = await res.json();
            if (typeof data?.liked === 'boolean') setIsLiked(data.liked);
            if (typeof data?.count === 'number') setLikeCount(data.count);
        } catch (err) {
            console.error('点赞失败', err);
        }
    };

    const handleComment = () => {
        const commentsSection = document.getElementById('comments');
        if (commentsSection) {
            commentsSection.scrollIntoView({ behavior: 'smooth' });
        }
    };

    const handleShare = async () => {
        try {
            const url = window.location.href;
            await navigator.clipboard.writeText(url);
            setIsCopied(true);
            setTimeout(() => setIsCopied(false), 2000);
        } catch (err) {
            console.error('复制失败:', err);
        }
    };

    const handleShareClick = async () => {
        await handleShare();
    };

    return (
        <>
            <div className="fixed top-1/3 left-[max(2rem,calc(50%-42rem))] z-30 hidden lg:block">
                <div className="flex flex-col gap-5">
                    <div className="flex flex-col items-center">
                        <motion.button
                            type="button"
                            onClick={handleLike}
                            animate={
                                isLiked
                                    ? {
                                          x: [0, -3, 3, -2, 2, 0],
                                          scale: [1, 0.94, 1.06, 1],
                                      }
                                    : { x: 0, scale: 1 }
                            }
                            transition={{ duration: 0.35 }}
                            className={cn(
                                'relative flex h-12 w-12 items-center justify-center rounded-full transition-all hover:scale-105',
                                isLiked
                                    ? 'bg-sky-100 text-sky-500 ring-2 ring-sky-300 dark:bg-sky-500/15 dark:text-sky-300 dark:ring-sky-500/40'
                                    : 'bg-white text-gray-500 ring-1 ring-gray-200 hover:text-gray-900 hover:ring-gray-300 dark:bg-[#1a202c] dark:text-gray-400 dark:ring-gray-800 dark:hover:text-white dark:hover:ring-gray-600',
                            )}
                            title={`点赞 ${title}`}
                        >
                            <motion.div
                                animate={isLiked ? { scale: [1, 1.45, 1] } : { scale: 1 }}
                                transition={{ duration: 0.4 }}
                            >
                                <Heart
                                    size={20}
                                    strokeWidth={1.7}
                                    className={isLiked ? 'fill-current' : ''}
                                />
                            </motion.div>
                        </motion.button>
                        {likeCount > 0 && (
                            <span className="mt-2 text-xs font-medium text-gray-400 dark:text-gray-500">
                                {likeCount}
                            </span>
                        )}
                    </div>

                    <div className="flex flex-col items-center">
                        <button
                            type="button"
                            onClick={handleComment}
                            className="flex h-12 w-12 items-center justify-center rounded-full bg-white text-gray-500 ring-1 ring-gray-200 transition-all hover:scale-105 hover:text-gray-900 hover:ring-gray-300 dark:bg-[#1a202c] dark:text-gray-400 dark:ring-gray-800 dark:hover:text-white dark:hover:ring-gray-600"
                            title="跳转评论"
                        >
                            <MessageCircle size={20} strokeWidth={1.7} />
                        </button>
                        <span className="mt-2 text-xs font-medium text-gray-400 dark:text-gray-500">
                            {commentCount}
                        </span>
                    </div>

                    <button
                        type="button"
                        onClick={handleShareClick}
                        className={cn(
                            'flex h-12 w-12 items-center justify-center rounded-full transition-all hover:scale-105',
                            isCopied
                                ? 'bg-emerald-50 text-emerald-500 ring-2 ring-emerald-200 dark:bg-emerald-500/15 dark:text-emerald-300 dark:ring-emerald-500/35'
                                : 'bg-white text-gray-500 ring-1 ring-gray-200 hover:text-gray-900 hover:ring-gray-300 dark:bg-[#1a202c] dark:text-gray-400 dark:ring-gray-800 dark:hover:text-white dark:hover:ring-gray-600',
                        )}
                        title={isCopied ? '链接已复制' : `分享 ${title}`}
                    >
                        {isCopied ? (
                            <Check size={20} strokeWidth={2.6} />
                        ) : (
                            <Share2 size={20} strokeWidth={1.7} />
                        )}
                    </button>
                </div>
            </div>

            <div className="fixed right-6 bottom-6 z-30 lg:hidden">
                <div className="relative flex items-center justify-center">
                    <AnimatePresence>
                        {isOpen && (
                            <>
                                <motion.button
                                    type="button"
                                    initial={{ opacity: 0, scale: 0, x: 0, y: 0 }}
                                    animate={{ opacity: 1, scale: 1, x: -100, y: 0 }}
                                    exit={{ opacity: 0, scale: 0, x: 0, y: 0 }}
                                    transition={{
                                        type: 'spring',
                                        stiffness: 260,
                                        damping: 20,
                                        delay: 0,
                                    }}
                                    onClick={() => {
                                        onToc?.();
                                        setIsOpen(false);
                                    }}
                                    className="absolute flex h-10 w-10 items-center justify-center rounded-full bg-white text-gray-600 shadow-md ring-1 ring-gray-200 transition-colors hover:bg-gray-50 dark:bg-[#1f2937] dark:text-gray-300 dark:ring-gray-700 dark:hover:bg-gray-700"
                                    title="目录"
                                >
                                    <List size={18} strokeWidth={1.5} />
                                </motion.button>

                                <motion.button
                                    type="button"
                                    initial={{ opacity: 0, scale: 0, x: 0, y: 0 }}
                                    animate={{ opacity: 1, scale: 1, x: -87, y: -50 }}
                                    exit={{ opacity: 0, scale: 0, x: 0, y: 0 }}
                                    transition={{
                                        type: 'spring',
                                        stiffness: 260,
                                        damping: 20,
                                        delay: 0.05,
                                    }}
                                    onClick={handleShareClick}
                                    className={cn(
                                        'absolute flex h-10 w-10 items-center justify-center rounded-full shadow-md ring-1 transition-colors',
                                        isCopied
                                            ? 'bg-emerald-50 text-emerald-500 ring-emerald-200 dark:bg-emerald-500/15 dark:text-emerald-300 dark:ring-emerald-500/35'
                                            : 'bg-white text-gray-600 ring-gray-200 hover:bg-gray-50 dark:bg-[#1f2937] dark:text-gray-300 dark:ring-gray-700 dark:hover:bg-gray-700',
                                    )}
                                    title="分享"
                                >
                                    {isCopied ? (
                                        <Check size={18} strokeWidth={3} />
                                    ) : (
                                        <Share2 size={18} strokeWidth={1.5} />
                                    )}
                                </motion.button>

                                <motion.button
                                    type="button"
                                    initial={{ opacity: 0, scale: 0, x: 0, y: 0 }}
                                    animate={{ opacity: 1, scale: 1, x: -50, y: -87 }}
                                    exit={{ opacity: 0, scale: 0, x: 0, y: 0 }}
                                    transition={{
                                        type: 'spring',
                                        stiffness: 260,
                                        damping: 20,
                                        delay: 0.1,
                                    }}
                                    onClick={() => {
                                        handleComment();
                                        setIsOpen(false);
                                    }}
                                    className="absolute flex h-10 w-10 items-center justify-center rounded-full bg-white text-gray-600 shadow-md ring-1 ring-gray-200 transition-colors hover:bg-gray-50 dark:bg-[#1f2937] dark:text-gray-300 dark:ring-gray-700 dark:hover:bg-gray-700"
                                    title="评论"
                                >
                                    <MessageCircle size={18} strokeWidth={1.5} />
                                </motion.button>

                                <motion.button
                                    type="button"
                                    initial={{ opacity: 0, scale: 0, x: 0, y: 0 }}
                                    animate={{ opacity: 1, scale: 1, x: 0, y: -100 }}
                                    exit={{ opacity: 0, scale: 0, x: 0, y: 0 }}
                                    transition={{
                                        type: 'spring',
                                        stiffness: 260,
                                        damping: 20,
                                        delay: 0.15,
                                    }}
                                    onClick={handleLike}
                                    className={cn(
                                        'absolute flex h-10 w-10 items-center justify-center rounded-full shadow-md ring-1 transition-colors',
                                        isLiked
                                            ? 'bg-sky-100 text-sky-500 ring-sky-300 dark:bg-sky-500/15 dark:text-sky-300 dark:ring-sky-500/40'
                                            : 'bg-white text-gray-600 ring-gray-200 hover:bg-gray-50 dark:bg-[#1f2937] dark:text-gray-300 dark:ring-gray-700 dark:hover:bg-gray-700',
                                    )}
                                    title="点赞"
                                >
                                    <motion.div
                                        animate={
                                            isLiked
                                                ? { scale: [1, 1.6, 0.8, 1.2, 1] }
                                                : { scale: 1 }
                                        }
                                        transition={{ duration: 0.5 }}
                                        className="z-10"
                                    >
                                        <Heart
                                            size={18}
                                            fill={isLiked ? 'currentColor' : 'none'}
                                            strokeWidth={1.5}
                                        />
                                    </motion.div>
                                </motion.button>
                            </>
                        )}
                    </AnimatePresence>

                    <button
                        type="button"
                        onClick={() => setIsOpen((value) => !value)}
                        className={cn(
                            'relative z-10 flex h-11 w-11 items-center justify-center rounded-full bg-gray-100/60 text-gray-500 shadow-lg ring-1 ring-gray-200/50 backdrop-blur-sm transition-all hover:scale-105 dark:bg-gray-800/40 dark:text-gray-400 dark:ring-gray-700/50',
                            isOpen &&
                                'bg-gray-100/75 text-gray-600 dark:bg-gray-800/55 dark:text-gray-300',
                        )}
                        title={isOpen ? '收起操作菜单' : '展开操作菜单'}
                    >
                        <motion.div
                            className="flex items-center justify-center leading-none"
                            animate={{ rotate: isOpen ? 45 : 0, scale: isOpen ? 0.96 : 1 }}
                            transition={{ duration: 0.22, ease: 'easeOut' }}
                        >
                            <Plus size={21} strokeWidth={2} />
                        </motion.div>
                    </button>
                </div>
            </div>
        </>
    );
}
