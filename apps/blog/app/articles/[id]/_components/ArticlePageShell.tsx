import { Calendar, Tag } from 'lucide-react';
import { UserAvatar } from '@/components/ui/avatar';
import { ArticleContentRenderer } from './ArticleContentRenderer';
import { ArticleInteractiveChrome } from './ArticleInteractiveChrome';
import { ArticleStatsDisplay } from './ArticleStatsDisplay';
import { ArticleSummary } from './ArticleSummary';
import { ArticleTableOfContents } from './TableOfContents';
import { CommentSection } from './comments/CommentSection';
import type { ArticleHeading } from '../toc';

interface ArticlePageAuthor {
    id?: number;
    username?: string | null;
    nickname?: string | null;
    avatar?: string | null;
}

interface ArticlePageArticle {
    id: string;
    title: string;
    content: string;
    commentsCount?: number;
    summary?: string | null;
    createdAt: string | Date;
    author?: ArticlePageAuthor | null;
    tags: Array<{
        id: number;
        name: string;
    }>;
}

interface ArticlePageShellProps {
    article: ArticlePageArticle;
    headings: ArticleHeading[];
    isPreview: boolean;
}

function formatArticleDate(date: string | Date) {
    return new Date(date).toLocaleDateString('zh-CN');
}

function getAuthorName(article: ArticlePageArticle) {
    return article.author?.nickname || article.author?.username || '匿名';
}

export function ArticlePageShell({ article, headings, isPreview }: ArticlePageShellProps) {
    const summary = article.summary || '';
    const authorName = getAuthorName(article);

    return (
        <div className="min-h-screen bg-white text-gray-900 transition-colors duration-300 dark:bg-[#1a202c] dark:text-[#fafafa]">
            <div className="mx-auto max-w-screen-xl px-6 py-10 lg:py-20">
                <div className="relative flex flex-col gap-12 lg:flex-row lg:justify-center lg:gap-24">
                    <div className="w-full max-w-3xl min-w-0">
                        <article className="transition-colors">
                            <header className="pt-4 pb-4 lg:pt-8">
                                <h1 className="mb-6 text-4xl leading-tight font-extrabold tracking-tight text-gray-900 sm:text-5xl dark:text-white">
                                    {article.title}
                                </h1>

                                <div className="flex flex-col gap-4">
                                    <div className="flex flex-wrap items-center gap-4 text-sm text-gray-500 sm:gap-6 dark:text-gray-400">
                                        <div className="flex items-center gap-2">
                                            <UserAvatar
                                                src={article.author?.avatar}
                                                name={authorName}
                                                fallback="匿"
                                                imageAlt={authorName}
                                            />
                                            <span className="font-medium text-gray-700 dark:text-gray-300">
                                                {authorName}
                                            </span>
                                        </div>

                                        <div className="flex items-center gap-2">
                                            <Calendar size={16} strokeWidth={1.5} />
                                            <span>{formatArticleDate(article.createdAt)}</span>
                                        </div>

                                        {!isPreview && (
                                            <ArticleStatsDisplay articleId={article.id} />
                                        )}
                                    </div>

                                    {article.tags.length > 0 && (
                                        <div className="flex flex-wrap gap-2">
                                            {article.tags.map((tag) => (
                                                <span
                                                    key={tag.id}
                                                    className="inline-flex items-center gap-1 rounded-full bg-primary/10 px-2.5 py-0.5 text-xs text-primary transition-colors duration-200 hover:bg-primary/20 md:px-3 md:py-1 md:text-sm"
                                                >
                                                    <Tag className="h-3 w-3 md:h-3.5 md:w-3.5" />
                                                    {tag.name}
                                                </span>
                                            ))}
                                        </div>
                                    )}
                                </div>
                            </header>

                            <div className="mt-2 mb-8 border-t border-gray-100 dark:border-gray-800" />

                            {summary && (
                                <>
                                    <ArticleSummary summary={summary} />
                                    <div className="mt-8 mb-10 border-t border-gray-100 dark:border-gray-800" />
                                </>
                            )}

                            <ArticleContentRenderer content={article.content} headings={headings} />
                        </article>

                        {!isPreview && (
                            <>
                                <div className="my-16 border-t border-gray-100 dark:border-gray-800" />
                                <section id="comments" className="transition-colors">
                                    <CommentSection
                                        articleId={article.id}
                                        authorId={article.author?.id}
                                    />
                                </section>
                            </>
                        )}
                    </div>

                    {headings.length > 0 && (
                        <aside className="hidden w-64 flex-shrink-0 self-start lg:block">
                            <div className="fixed top-32 right-[max(1.5rem,calc((100vw-80rem)/2+1.5rem))] z-20 w-64">
                                <div className="max-h-[calc(100vh-9rem)] overflow-y-auto overscroll-contain pr-3 pb-6 pl-0.5">
                                    <ArticleTableOfContents headings={headings} />
                                </div>
                            </div>
                        </aside>
                    )}
                </div>
            </div>

            <ArticleInteractiveChrome
                articleId={article.id}
                initialCommentCount={article.commentsCount}
                title={article.title}
                headings={headings}
                isPreview={isPreview}
            />
        </div>
    );
}
