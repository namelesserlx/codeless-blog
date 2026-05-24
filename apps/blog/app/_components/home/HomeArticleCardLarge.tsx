import Image from 'next/image';
import Link from 'next/link';
import { Calendar, Eye, MessageSquare, Tag } from 'lucide-react';
import emptyLarge from '@/public/images/empty-large.webp';
import type { HomeArticle } from './types';

interface HomeArticleCardLargeProps {
    article: HomeArticle;
}

function isRemoteImage(src?: string) {
    return Boolean(src && /^https?:\/\//.test(src));
}

export function HomeArticleCardLarge({ article }: HomeArticleCardLargeProps) {
    return (
        <article className="group relative flex flex-col gap-4 rounded-2xl border border-transparent p-4 transition-all duration-300 hover:border-border/50 hover:bg-card/50 hover:shadow-[0_8px_30px_rgb(0,0,0,0.04)] dark:hover:shadow-[0_8px_30px_rgba(255,255,255,0.02)]">
            <Link
                href={`/articles/${article.id}`}
                prefetch={false}
                className="relative block aspect-[2/1] w-full overflow-hidden rounded-xl border border-border/50 bg-muted/20"
            >
                <div className="relative h-full min-h-[200px] w-full">
                    <Image
                        src={article.coverImage || emptyLarge}
                        alt={article.title}
                        fill
                        unoptimized={isRemoteImage(article.coverImage)}
                        placeholder={article.blurDataUrl ? 'blur' : 'empty'}
                        blurDataURL={article.blurDataUrl}
                        className="object-cover transition-transform duration-700 group-hover:scale-110"
                    />
                    <div className="absolute inset-0 bg-gradient-to-t from-background/90 via-background/20 to-transparent opacity-60 transition-opacity duration-300 group-hover:opacity-80"></div>
                    <div className="absolute inset-0 bg-primary/10 opacity-0 mix-blend-overlay transition-opacity duration-300 group-hover:opacity-100"></div>
                </div>
            </Link>

            <div className="flex w-full flex-col justify-center">
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
