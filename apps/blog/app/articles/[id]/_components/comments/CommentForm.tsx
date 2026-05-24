'use client';

import { useState, useEffect, useRef } from 'react';
import { Button } from '@/components/ui/button';
import { UserAvatar } from '@/components/ui/avatar';
import { Textarea } from '@/components/ui/textarea';
import { Send, Smile } from 'lucide-react';
import type { CommentFormProps } from './types';
import data from '@emoji-mart/data';
import Picker from '@emoji-mart/react';
import { useAuth } from '@/context/auth-context';

interface EmojiSelection {
    native: string;
}

export function CommentForm({
    onSubmit,
    placeholder = '写下你的评论...',
    buttonText = '发表评论',
    isSubmitting = false,
}: CommentFormProps) {
    const { auth } = useAuth();
    const [content, setContent] = useState('');
    const [showEmojiPicker, setShowEmojiPicker] = useState(false);
    const textareaRef = useRef<HTMLTextAreaElement>(null);
    const displayName = auth?.user ? auth.user.nickname || auth.user.username : '访客';

    const adjustHeight = () => {
        const textarea = textareaRef.current;
        if (textarea) {
            textarea.style.height = 'auto';
            textarea.style.height = textarea.scrollHeight + 'px';
        }
    };

    useEffect(() => {
        adjustHeight();
    }, [content]);

    const submitComment = async () => {
        if (!content.trim()) return;

        const submitted = await onSubmit({ content: content.trim() });
        if (submitted) {
            setContent('');
            adjustHeight();
        }
    };

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        void submitComment();
    };

    const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
        if (e.key === 'Enter' && (e.metaKey || e.ctrlKey)) {
            e.preventDefault();
            void submitComment();
        }
    };
    const handleEmojiClick = (emoji: EmojiSelection) => {
        setContent(content + emoji.native);
        setShowEmojiPicker(false);
    };

    return (
        <form onSubmit={handleSubmit} className="space-y-4">
            <div className="flex gap-3 md:gap-4">
                <UserAvatar
                    className="mt-1 flex-shrink-0"
                    src={auth?.user?.avatar}
                    name={displayName}
                />
                <div className="flex-1 space-y-3">
                    <div className="relative">
                        <label htmlFor="comment-content" className="sr-only">
                            评论内容
                        </label>
                        <Textarea
                            ref={textareaRef}
                            id="comment-content"
                            name="content"
                            value={content}
                            onChange={(e: React.ChangeEvent<HTMLTextAreaElement>) => {
                                setContent(e.target.value);
                            }}
                            onInput={() => {
                                adjustHeight();
                            }}
                            onKeyDown={handleKeyDown}
                            placeholder={placeholder}
                            className="block min-h-[110px] resize-none overflow-hidden rounded-2xl border-input bg-background px-4 py-4 text-sm leading-7 text-foreground shadow-none transition-[border-color] outline-none placeholder:text-muted-foreground focus:border-primary focus:outline-none focus-visible:ring-0 md:min-h-[132px] md:pr-12 md:text-[15px]"
                            disabled={isSubmitting}
                        />
                        <div className="absolute right-3 bottom-3 hidden items-center gap-2 md:flex">
                            <Button
                                type="button"
                                variant="ghost"
                                size="sm"
                                className="h-8 w-8 rounded-full p-0 text-gray-400 hover:bg-gray-100 hover:text-gray-600 dark:hover:bg-gray-800 dark:hover:text-gray-300"
                                onClick={() => setShowEmojiPicker(!showEmojiPicker)}
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
                    <div className="flex items-center justify-between gap-2">
                        <p className="hidden text-xs text-gray-500 md:block dark:text-gray-400">
                            按{' '}
                            <kbd className="rounded bg-gray-100 px-1.5 py-0.5 text-xs font-medium dark:bg-gray-700">
                                ⌘
                            </kbd>{' '}
                            +{' '}
                            <kbd className="rounded bg-gray-100 px-1.5 py-0.5 text-xs font-medium dark:bg-gray-700">
                                Enter
                            </kbd>{' '}
                            快速发表
                        </p>
                        <div className="md:hidden"></div>
                        <Button
                            type="submit"
                            disabled={!content.trim() || isSubmitting}
                            className="flex h-10 items-center gap-2 rounded-xl bg-sky-500 px-5 py-2 text-sm font-medium text-white shadow-sm transition-all duration-200 hover:bg-sky-600 hover:shadow-md disabled:opacity-50"
                        >
                            {isSubmitting ? (
                                <>
                                    <div className="h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent" />
                                    <span className="hidden sm:inline">发表中...</span>
                                    <span className="sm:hidden">...</span>
                                </>
                            ) : (
                                <>
                                    <Send size={14} />
                                    <span className="hidden sm:inline">{buttonText}</span>
                                    <span className="sm:hidden">发表</span>
                                </>
                            )}
                        </Button>
                    </div>
                </div>
            </div>
        </form>
    );
}
