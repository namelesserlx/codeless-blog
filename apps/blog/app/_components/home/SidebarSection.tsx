import Link from 'next/link';
import { Flame, Tag } from 'lucide-react';
import { FadeInSection } from '@/components/animations/FadeInSection';
import type { SidebarData } from './types';

interface SidebarSectionProps {
    sidebarData: SidebarData;
}

export function SidebarSection({ sidebarData }: SidebarSectionProps) {
    return (
        <aside className="space-y-16 lg:col-span-4">
            <FadeInSection direction="right" delay={180} duration={460}>
                <div className="relative">
                    <h3 className="mb-6 flex items-center border-b border-border/40 pb-3 text-lg font-bold">
                        <Flame className="mr-2 h-5 w-5 animate-pulse text-orange-500" />
                        热门文章
                    </h3>
                    <ul className="space-y-5">
                        {sidebarData.popularPosts.map((article, index) => (
                            <li
                                key={article.id}
                                className="group flex cursor-pointer items-start gap-4 transition-transform duration-200 hover:translate-x-1"
                            >
                                <span
                                    className={`flex h-6 w-6 shrink-0 items-center justify-center rounded-full font-mono text-xs font-bold transition-colors ${
                                        index < 3
                                            ? 'bg-primary/10 text-primary group-hover:bg-primary group-hover:text-primary-foreground'
                                            : 'bg-muted text-muted-foreground group-hover:bg-muted-foreground group-hover:text-background'
                                    }`}
                                >
                                    {index + 1}
                                </span>
                                <div className="flex flex-col gap-1">
                                    <Link
                                        href={`/articles/${article.id}`}
                                        prefetch={false}
                                        className="line-clamp-2 text-sm leading-tight font-medium transition-colors group-hover:text-primary"
                                    >
                                        {article.title}
                                    </Link>
                                    <span className="font-mono text-xs text-muted-foreground">
                                        {article.viewCount} 浏览
                                    </span>
                                </div>
                            </li>
                        ))}
                    </ul>
                </div>
            </FadeInSection>

            <FadeInSection direction="right" delay={340} duration={560}>
                <div className="relative">
                    <h3 className="mb-6 flex items-center border-b border-border/40 pb-3 text-lg font-bold">
                        <Tag className="mr-2 h-5 w-5 text-primary" />
                        标签云
                    </h3>
                    <div className="flex flex-wrap gap-2">
                        {sidebarData.tags.map((tag) => (
                            <div key={tag.id}>
                                <Link
                                    href="/tags"
                                    className="inline-flex items-center rounded-md border border-border/50 bg-background px-2.5 py-1 text-xs font-medium text-muted-foreground transition-all hover:scale-105 hover:border-primary/30 hover:bg-primary/10 hover:text-primary hover:shadow-sm"
                                >
                                    {tag.name}
                                </Link>
                            </div>
                        ))}
                    </div>
                </div>
            </FadeInSection>
        </aside>
    );
}
