import Image from 'next/image';
import Link from 'next/link';
import { Calendar, Eye, MessageSquare, Tag } from 'lucide-react';
import emptySmall from '@/public/images/empty-small.webp';
import type { HomeArticle } from './types';

interface HomeArticleCardSmallProps {
    article: HomeArticle;
}

function isRemoteImage(src?: string) {
    return Boolean(src && /^https?:\/\//.test(src));
}

export function HomeArticleCardSmall({ article }: HomeArticleCardSmallProps) {
    return (
        <article className="group relative flex flex-col gap-6 rounded-2xl border border-transparent p-4 transition-all duration-300 hover:border-border/50 hover:bg-card/50 hover:shadow-[0_8px_30px_rgb(0,0,0,0.04)] md:flex-row dark:hover:shadow-[0_8px_30px_rgba(255,255,255,0.02)]">
            <Link
                href={`/articles/${article.id}`}
                prefetch={false}
                className="relative block min-h-[200px] overflow-hidden rounded-xl border border-border/50 bg-muted/20 md:w-1/3 md:shrink-0"
            >
                <div className="relative h-full min-h-[200px] w-full">
                    <Image
                        src={article.coverImage || emptySmall}
                        alt={article.title}
                        fill
                        unoptimized={isRemoteImage(article.coverImage)}
                        className="object-cover transition-transform duration-700 group-hover:scale-110"
                    />
                    <div className="absolute inset-0 bg-primary/10 opacity-0 mix-blend-overlay transition-opacity duration-300 group-hover:opacity-100"></div>
                </div>
            </Link>

            <div className="flex flex-col justify-center md:w-2/3">
                <Link
                    href={`/articles/${article.id}`}
                    prefetch={false}
                    className="transition-colors group-hover:text-primary"
                >
                    <h3 className="mb-3 line-clamp-2 text-xl font-bold tracking-tight md:text-2xl">
                        {article.title}
                    </h3>
                </Link>

                <p className="mb-4 line-clamp-2 text-sm text-muted-foreground md:text-base">
                    {article.summary}
                </p>

                <div className="mt-auto flex flex-col gap-4">
                    <div className="flex flex-wrap gap-2">
                        {article.category?.map((tag) => (
                            <span
                                key={tag.id}
                                className="inline-flex items-center rounded-md border border-border/50 bg-background px-2.5 py-1 text-xs font-medium text-muted-foreground transition-all group-hover:border-primary/30 group-hover:bg-primary/10 group-hover:text-primary group-hover:shadow-sm"
                            >
                                <Tag className="mr-1 h-3 w-3" />
                                {tag.name}
                            </span>
                        ))}
                    </div>

                    <div className="flex items-center gap-4 font-mono text-xs text-muted-foreground">
                        <span className="flex items-center">
                            <Calendar className="mr-1.5 h-3.5 w-3.5" />
                            {article.date}
                        </span>
                        <span className="flex items-center">
                            <Eye className="mr-1.5 h-3.5 w-3.5" />
                            {article.viewsCount ?? 0}
                        </span>
                        <span className="flex items-center">
                            <MessageSquare className="mr-1.5 h-3.5 w-3.5" />
                            {article.commentsCount ?? 0}
                        </span>
                    </div>
                </div>
            </div>
        </article>
    );
}
