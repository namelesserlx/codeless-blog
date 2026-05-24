import Image from 'next/image';
import Link from 'next/link';
import { Calendar, Eye, MessageSquare, Tag } from 'lucide-react';
import { ArticleCardProps } from '@/types';
import { memo } from 'react';
import emptyLarge from '@/public/images/empty-large.webp';

export const ArticleCardLarge = memo(function ArticleCardLarge({
    id,
    title,
    coverImage,
    summary,
    date,
    viewsCount = 0,
    commentsCount = 0,
    category,
    blurDataUrl,
}: ArticleCardProps) {
    return (
        <article
            className={`group relative h-[350px] w-full overflow-hidden rounded-xl shadow-sm transition-all duration-300 hover:-translate-y-1 hover:shadow-xl md:h-[400px] lg:col-span-2`}
        >
            <Link href={`/articles/${id}`} className="block h-full w-full">
                {/* 背景图片 */}
                <div className="absolute inset-0">
                    <Image
                        src={coverImage || emptyLarge}
                        alt={title}
                        fill
                        className="object-cover transition-transform duration-500 group-hover:scale-110"
                        placeholder={blurDataUrl ? 'blur' : 'empty'}
                        blurDataURL={blurDataUrl}
                    />
                    <div className="absolute inset-0 bg-linear-to-t from-black/80 via-black/40 to-transparent" />
                </div>

                {/* 内容区域 */}
                <div className="relative flex h-full flex-col justify-end p-5 md:p-8">
                    {/* 标签 */}
                    <div className="mb-3 flex flex-wrap gap-2 md:mb-4">
                        {category?.map((tag, index) => (
                            <span
                                key={index}
                                className="inline-flex items-center gap-1 rounded-full bg-white/20 px-2.5 py-1 text-xs text-white backdrop-blur-sm transition-colors duration-200 hover:bg-white/30 md:gap-1.5 md:px-3 md:py-1.5 md:text-sm"
                            >
                                <Tag className="h-3 w-3 md:h-3.5 md:w-3.5" />
                                {tag.name}
                            </span>
                        ))}
                    </div>

                    {/* 标题 */}
                    <h2 className="mb-2 line-clamp-2 text-2xl text-white transition-colors duration-300 group-hover:text-primary md:mb-3 md:text-3xl">
                        {title}
                    </h2>

                    {/* 描述 */}
                    <p className="mb-3 line-clamp-2 text-base text-gray-200 md:mb-4 md:text-lg">
                        {summary}
                    </p>

                    {/* 元信息 */}
                    <div className="flex items-center gap-3 text-xs text-gray-300 md:gap-4 md:text-sm">
                        <div className="group/date flex items-center gap-1 transition-colors duration-200 hover:text-primary md:gap-1.5">
                            <Calendar className="h-3.5 w-3.5 md:h-4 md:w-4" />
                            <span>{date}</span>
                        </div>
                        <div className="group/views flex items-center gap-1 transition-colors duration-200 hover:text-primary md:gap-1.5">
                            <Eye className="h-3.5 w-3.5 md:h-4 md:w-4" />
                            <span>{viewsCount}</span>
                        </div>
                        <div className="group/likes flex cursor-pointer items-center gap-1 transition-colors duration-200 hover:text-red-400 md:gap-1.5">
                            <MessageSquare className="h-3.5 w-3.5 group-hover/likes:fill-red-400 md:h-4 md:w-4" />
                            <span>{commentsCount}</span>
                        </div>
                    </div>
                </div>
            </Link>
        </article>
    );
});
