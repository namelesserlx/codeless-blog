import Image from 'next/image';
import Link from 'next/link';
import { Calendar, Eye, MessageSquare, Tag } from 'lucide-react';
import { ArticleCardProps } from '@/types';
import { memo } from 'react';
import emptySmall from '@/public/images/empty-small.webp';
export const ArticleCardSmall = memo(function ArticleCardSmall({
    id,
    title,
    summary,
    coverImage,
    date,
    viewsCount = 0,
    commentsCount = 0,
    category,
}: ArticleCardProps) {
    return (
        <article className="group h-full w-full overflow-hidden rounded-2xl bg-white shadow-sm transition-all duration-300 hover:-translate-y-1 hover:shadow-xl dark:bg-gray-800">
            <Link href={`/articles/${id}`} className="block h-full w-full">
                <div className="flex h-full flex-col md:flex-row md:items-center md:gap-4 md:p-4">
                    {/* 头图 */}
                    <div className="relative h-48 w-full shrink-0 overflow-hidden md:h-52 md:w-52 md:rounded-xl lg:h-44 lg:w-44">
                        <Image
                            src={coverImage || emptySmall}
                            alt={title}
                            fill
                            className="object-cover transition-transform duration-500 group-hover:scale-110"
                        />
                    </div>

                    {/* 内容区域 */}
                    <div className="flex min-w-0 flex-1 flex-col p-4 md:p-0">
                        {/* 标题 */}
                        <h2 className="mb-2 line-clamp-2 min-h-[3.5rem] text-lg leading-7 text-gray-900 transition-colors duration-300 group-hover:text-primary md:text-xl dark:text-white dark:group-hover:text-primary">
                            {title}
                        </h2>

                        {/* 描述 */}
                        <p className="mb-3 line-clamp-2 min-h-[2.75rem] text-sm leading-5 text-gray-600 md:mb-4 dark:text-gray-400">
                            {summary}
                        </p>

                        {/* 标签 */}
                        <div className="mt-1 flex w-full flex-nowrap gap-1.5 overflow-x-auto overflow-y-hidden pr-1 pb-1 [scrollbar-width:none] md:mt-0 md:gap-2 [&::-webkit-scrollbar]:hidden">
                            {category?.map((tag, index) => (
                                <span
                                    key={index}
                                    className="inline-flex shrink-0 items-center gap-1 rounded-full border border-gray-200/80 bg-transparent px-2.5 py-0.5 text-xs whitespace-nowrap text-gray-500 transition-colors duration-200 hover:border-primary/30 hover:text-primary md:px-3 md:py-1 md:text-sm dark:border-gray-700/80 dark:text-gray-400 dark:hover:border-primary/30 dark:hover:text-primary"
                                >
                                    <Tag className="h-3 w-3 md:h-3.5 md:w-3.5" />
                                    <span>{tag.name}</span>
                                </span>
                            ))}
                        </div>

                        {/* 元信息 */}
                        <div className="mt-3 flex items-center gap-3 text-xs text-gray-500 md:mt-4 md:gap-4 md:text-sm dark:text-gray-400">
                            <div className="flex items-center gap-1 transition-colors duration-200 hover:text-primary md:gap-1.5">
                                <Calendar className="h-3.5 w-3.5 md:h-4 md:w-4" />
                                <span>{date}</span>
                            </div>
                            <div className="flex items-center gap-1 transition-colors duration-200 hover:text-primary md:gap-1.5">
                                <Eye className="h-3.5 w-3.5 md:h-4 md:w-4" />
                                <span>{viewsCount}</span>
                            </div>
                            <div className="flex cursor-pointer items-center gap-1 transition-colors duration-200 md:gap-1.5">
                                <MessageSquare className="h-3.5 w-3.5 md:h-4 md:w-4" />
                                <span>{commentsCount}</span>
                            </div>
                        </div>
                    </div>
                </div>
            </Link>
        </article>
    );
});
