'use client';

import { useRouter } from 'next/navigation';
import {
    CommandDialog,
    CommandEmpty,
    CommandGroup,
    CommandInput,
    CommandItem,
    CommandList,
} from '@/components/ui/command';
import { useSearch } from '@/lib/client/hooks/useSearch';
import { Badge } from '@/components/ui/badge';
import { CalendarIcon, TagIcon, FileTextIcon } from 'lucide-react';

interface SearchModalProps {
    open: boolean;
    setOpen: (open: boolean) => void;
}

type SearchArticle = ReturnType<typeof useSearch>['results'][number];

export function SearchModal({ open, setOpen }: SearchModalProps) {
    const router = useRouter();
    const { query, setQuery, results, suggestions, isLoading, searchByTag } = useSearch(open);
    /**
     * 处理文章选择
     */
    const handleSelectArticle = (articleId: string) => {
        setOpen(false);
        router.push(`/articles/${articleId}`);
    };

    /**
     * 处理标签选择
     */
    const handleSelectTag = (tag: string) => {
        setQuery('');
        searchByTag(tag);
    };

    /**
     * 格式化日期
     */
    const formatDate = (timestamp: number) => {
        return new Date(timestamp).toLocaleDateString('zh-CN', {
            year: 'numeric',
            month: 'short',
            day: 'numeric',
        });
    };

    /**
     * 清理 HTML 标签，只保留文本内容和 mark 标签（用于高亮）
     */
    const cleanHtmlKeepHighlight = (html: string) => {
        if (!html) return '';

        // 1. 替换常见的块级元素为空格，避免文字连在一起
        let cleaned = html
            .replace(/<\/?(div|p|h[1-6]|li|br|hr)[^>]*>/gi, ' ')
            .replace(/<\/?(ul|ol)[^>]*>/gi, ' ');

        // 2. 移除所有 HTML 标签，但保留 <mark> 和 </mark>
        cleaned = cleaned.replace(/<(?!\/?(mark)\b)[^>]*>/gi, '');

        // 3. 清理多余的空格
        cleaned = cleaned.replace(/\s+/g, ' ').trim();

        return cleaned;
    };

    /**
     * 获取最佳展示内容：优先显示包含搜索关键词的裁剪片段，并清理 HTML
     */
    const getBestDisplayContent = (article: SearchArticle) => {
        const formatted = article._formatted;

        // 检查是否有高亮（包含 <mark> 标签）
        const hasHighlight = (text?: string) => text && text.includes('<mark>');

        // 优先级：
        // 1. 裁剪后的 content（如果有高亮）- 最精准匹配
        // 2. 裁剪后的 summary（如果有高亮）
        // 3. 原始 summary（无匹配时的默认展示）
        // 4. 空字符串

        // 优先显示裁剪后包含高亮的 content 片段
        if (formatted?.content && hasHighlight(formatted.content)) {
            return cleanHtmlKeepHighlight(formatted.content);
        }

        // 其次显示裁剪后包含高亮的 summary
        if (formatted?.summary && hasHighlight(formatted.summary)) {
            return cleanHtmlKeepHighlight(formatted.summary);
        }

        // 如果都没有高亮，显示原始 summary 的前 80 字符（纯文本）
        if (article.summary) {
            const maxLength = 80;
            const plainText = article.summary.replace(/<[^>]*>/g, '').trim();
            return plainText.length > maxLength
                ? plainText.substring(0, maxLength) + '...'
                : plainText;
        }

        return '';
    };

    if (!open) return null;

    return (
        <CommandDialog open={open} onOpenChange={setOpen} shouldFilter={false} modal={false}>
            <CommandInput placeholder="搜索文章、标签..." value={query} onValueChange={setQuery} />
            <CommandList>
                {isLoading && <div className="py-6 text-center text-sm">搜索中...</div>}

                {!isLoading && query && results.length === 0 && (
                    <CommandEmpty>未找到相关内容</CommandEmpty>
                )}

                {/* 搜索结果 */}
                {!isLoading && query && results.length > 0 && (
                    <CommandGroup heading={`搜索结果 (${results.length})`}>
                        {results.map((article) => (
                            <CommandItem
                                key={article.id}
                                value={article.title}
                                onSelect={() => handleSelectArticle(article.id)}
                                className="flex flex-col items-start gap-2 py-3"
                            >
                                <div className="flex items-start gap-2">
                                    <FileTextIcon className="mt-0.5 h-4 w-4 shrink-0 text-muted-foreground" />
                                    <div className="flex-1">
                                        <div
                                            className="font-medium"
                                            dangerouslySetInnerHTML={{
                                                __html: article._formatted?.title || article.title,
                                            }}
                                        />
                                        <div
                                            className="mt-1 line-clamp-2 text-sm text-muted-foreground"
                                            dangerouslySetInnerHTML={{
                                                __html: getBestDisplayContent(article),
                                            }}
                                        />
                                        <div className="mt-2 flex flex-wrap items-center gap-2 text-xs">
                                            {article.tags.length > 0 && (
                                                <div className="flex flex-wrap gap-1">
                                                    {article.tags.slice(0, 3).map((tag) => (
                                                        <Badge
                                                            key={tag.id}
                                                            variant="secondary"
                                                            className="cursor-pointer text-xs"
                                                            onClick={(e) => {
                                                                e.stopPropagation();
                                                                handleSelectTag(tag.name);
                                                            }}
                                                        >
                                                            <TagIcon className="mr-1 h-3 w-3" />
                                                            {tag.name}
                                                        </Badge>
                                                    ))}
                                                </div>
                                            )}
                                            <span className="flex items-center text-muted-foreground">
                                                <CalendarIcon className="mr-1 h-3 w-3" />
                                                {formatDate(article.createdAt)}
                                            </span>
                                        </div>
                                    </div>
                                </div>
                            </CommandItem>
                        ))}
                    </CommandGroup>
                )}

                {/* 热门文章（无搜索时显示） */}
                {!query && suggestions.length > 0 && (
                    <CommandGroup heading="热门文章">
                        {suggestions.map((article) => (
                            <CommandItem
                                key={article.id}
                                value={article.title}
                                onSelect={() => handleSelectArticle(article.id)}
                                className="flex items-start gap-2"
                            >
                                <FileTextIcon className="mt-0.5 h-4 w-4 shrink-0 text-muted-foreground" />
                                <div className="flex-1">
                                    <div className="font-medium">{article.title}</div>
                                    {article.summary && (
                                        <p className="mt-1 line-clamp-1 text-sm text-muted-foreground">
                                            {article.summary}
                                        </p>
                                    )}
                                </div>
                            </CommandItem>
                        ))}
                    </CommandGroup>
                )}

                {/* 标签快捷访问（无搜索时显示） */}
                {!query && suggestions.length > 0 && (
                    <CommandGroup heading="热门标签">
                        {Array.from(new Set(suggestions.flatMap((article) => article.tags)))
                            .slice(0, 5)
                            .map((tag) => (
                                <CommandItem
                                    key={tag.id}
                                    value={tag.name}
                                    onSelect={() => handleSelectTag(tag.name)}
                                    className="flex items-center gap-2"
                                >
                                    <TagIcon className="h-4 w-4 text-muted-foreground" />
                                    <span>{tag.name}</span>
                                </CommandItem>
                            ))}
                    </CommandGroup>
                )}
            </CommandList>

            {/* 底部提示 */}
            <div className="flex items-center justify-center border-t bg-muted/50 px-2 py-2 text-xs text-muted-foreground">
                <div className="px-2">
                    <span>由 MeiliSearch 提供支持</span>
                </div>
                <div className="flex items-center rounded-sm bg-muted px-1.5 py-0.5 text-xs font-medium">
                    <span>↑</span>
                    <span className="mx-0.5">↓</span>
                </div>
                <span className="mx-1.5">导航</span>
                <div className="mx-1 h-4 w-px bg-border/50"></div>
                <div className="mx-1.5 flex items-center rounded-sm bg-muted px-1.5 py-0.5 text-xs font-medium">
                    <span>⏎</span>
                </div>
                <span className="mx-1.5">选择</span>
                <div className="mx-1 h-4 w-px bg-border/50"></div>
                <div className="mx-1.5 flex items-center rounded-sm bg-muted px-1.5 py-0.5 text-xs font-medium">
                    <span>esc</span>
                </div>
                <span className="mx-1.5">关闭</span>
            </div>
        </CommandDialog>
    );
}
