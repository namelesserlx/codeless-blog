import { cache } from 'react';
import type { Metadata } from 'next';
import Link from 'next/link';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent } from '@/components/ui/card';
import { Tag as TagIcon } from 'lucide-react';
import { cn } from '@/lib/shared/utils';
import { getPublishedTags } from '@/lib/server/db';
import { getSiteUrl } from '@/lib/server/site-url';

interface Tag {
    id: number;
    name: string;
    count: number;
}

const TAGS_PAGE_TITLE = "标签 | CodeLess's Blog";
const EMPTY_TAGS_DESCRIPTION =
    '浏览 CodeLess 博客中的全部技术标签，快速按主题发现相关文章与内容方向。';

export const revalidate = 300;

const getTagsPageData = cache(async () => {
    try {
        const [siteUrl, tags] = await Promise.all([getSiteUrl(), getPublishedTags()]);

        return { siteUrl, tags };
    } catch (error) {
        console.error('获取标签页数据失败:', error);

        return {
            siteUrl: await getSiteUrl(),
            tags: [] as Tag[],
        };
    }
});

function buildTagsDescription(tags: Tag[]) {
    if (tags.length === 0) {
        return EMPTY_TAGS_DESCRIPTION;
    }

    const featuredTags = tags
        .slice(0, 3)
        .map((tag) => tag.name)
        .join('、');

    return `浏览 CodeLess 博客中的 ${tags.length} 个技术标签，包含 ${featuredTags} 等主题，快速找到对应技术文章。`;
}

function buildTagsKeywords(tags: Tag[]) {
    return Array.from(
        new Set([
            '标签',
            '标签云',
            '技术博客',
            '文章标签',
            'CodeLess',
            ...tags.slice(0, 8).map((tag) => tag.name),
        ]),
    );
}

function buildTagUrl(tagName: string) {
    return `/articles?tag=${encodeURIComponent(tagName)}`;
}

function buildTagsJsonLd(tags: Tag[], siteUrl: string) {
    const description = buildTagsDescription(tags);

    return {
        breadcrumb: {
            '@context': 'https://schema.org',
            '@type': 'BreadcrumbList',
            itemListElement: [
                {
                    '@type': 'ListItem',
                    position: 1,
                    name: '首页',
                    item: new URL('/', siteUrl).toString(),
                },
                {
                    '@type': 'ListItem',
                    position: 2,
                    name: '标签',
                    item: new URL('/tags', siteUrl).toString(),
                },
            ],
        },
        collection: {
            '@context': 'https://schema.org',
            '@type': 'CollectionPage',
            name: TAGS_PAGE_TITLE,
            description,
            url: new URL('/tags', siteUrl).toString(),
            mainEntity: {
                '@type': 'ItemList',
                numberOfItems: tags.length,
                itemListElement: tags.map((tag, index) => ({
                    '@type': 'ListItem',
                    position: index + 1,
                    name: tag.name,
                    url: new URL(buildTagUrl(tag.name), siteUrl).toString(),
                    item: {
                        '@type': 'Thing',
                        name: tag.name,
                        description: `${tag.name} 相关的 ${tag.count} 篇已发布文章`,
                        url: new URL(buildTagUrl(tag.name), siteUrl).toString(),
                    },
                })),
            },
        },
    };
}

export async function generateMetadata(): Promise<Metadata> {
    const { siteUrl, tags } = await getTagsPageData();
    const description = buildTagsDescription(tags);
    const openGraphImage = new URL('/icon_512.png', siteUrl).toString();

    return {
        title: TAGS_PAGE_TITLE,
        description,
        keywords: buildTagsKeywords(tags),
        authors: [{ name: 'CodeLess' }],
        creator: 'CodeLess',
        publisher: 'CodeLess',
        alternates: {
            canonical: '/tags',
        },
        openGraph: {
            title: TAGS_PAGE_TITLE,
            description,
            url: new URL('/tags', siteUrl).toString(),
            type: 'website',
            images: [
                {
                    url: openGraphImage,
                    width: 512,
                    height: 512,
                    alt: "CodeLess's Blog 标签页",
                },
            ],
        },
        twitter: {
            card: 'summary',
            title: TAGS_PAGE_TITLE,
            description,
            images: [openGraphImage],
        },
    };
}

function AnimatedBackground({ tags }: { tags: Tag[] }) {
    const len = tags.length;
    const rows = Math.ceil(len / 5);
    const backgroundTags = [];

    for (let i = 0; i < rows; i++) {
        backgroundTags.push(tags.slice(i * 5, (i + 1) * 5).map((tag) => tag.name));
    }

    const rowConfig = [
        {
            color: 'text-blue-600',
            darkColor: 'dark:text-blue-300',
            bgColor: 'bg-blue-100/50',
            darkBgColor: 'dark:bg-blue-900/30',
            animate: 'animate-scroll-right',
            animateSpeed: 'animate-scroll-right',
            opacity: 'opacity-40',
            top: 'top-10',
        },
        {
            color: 'text-green-600',
            darkColor: 'dark:text-green-300',
            bgColor: 'bg-green-100/50',
            darkBgColor: 'dark:bg-green-900/30',
            animate: 'animate-scroll-left',
            animateSpeed: 'animate-scroll-left-medium',
            opacity: 'opacity-40',
            top: 'top-32',
        },
        {
            color: 'text-purple-600',
            darkColor: 'dark:text-purple-300',
            bgColor: 'bg-purple-100/50',
            darkBgColor: 'dark:bg-purple-900/30',
            animate: 'animate-scroll-right-slow',
            animateSpeed: 'animate-scroll-right-slow',
            opacity: 'opacity-40',
            top: 'top-56',
        },
        {
            color: 'text-orange-600',
            darkColor: 'dark:text-orange-300',
            bgColor: 'bg-orange-100/50',
            darkBgColor: 'dark:bg-orange-900/30',
            animate: 'animate-scroll-left-medium',
            animateSpeed: 'animate-scroll-left-medium',
            opacity: 'opacity-40',
            top: 'top-80',
        },
        {
            color: 'text-pink-600',
            darkColor: 'dark:text-pink-300',
            bgColor: 'bg-pink-100/50',
            darkBgColor: 'dark:bg-pink-900/30',
            animate: 'animate-scroll-right-fast',
            animateSpeed: 'animate-scroll-right-fast',
            opacity: 'opacity-40',
            top: 'top-[26rem]',
        },
    ];

    return (
        <div className="pointer-events-none absolute inset-0 overflow-hidden">
            {backgroundTags.map((row, index) => (
                <div
                    className={`absolute ${rowConfig[index % rowConfig.length].top} ${rowConfig[index % rowConfig.length].animate} ${rowConfig[index % rowConfig.length].opacity}`}
                    key={`row-${index}`}
                >
                    <div className="flex gap-4 whitespace-nowrap">
                        {row.map((tag, index1) => (
                            <span
                                key={`row-${index}-${index1}`}
                                className={`rounded-full px-3 py-1 ${rowConfig[index % rowConfig.length].bgColor} ${rowConfig[index % rowConfig.length].color} text-sm ${rowConfig[index % rowConfig.length].darkBgColor} ${rowConfig[index % rowConfig.length].darkColor}`}
                            >
                                {tag}
                            </span>
                        ))}
                    </div>
                </div>
            ))}
        </div>
    );
}

function getTagColor(index: number): {
    variant: 'default' | 'secondary' | 'destructive' | 'outline';
    className: string;
} {
    const colors = [
        {
            variant: 'default' as const,
            className:
                'bg-blue-100 hover:bg-blue-200 text-blue-700 border-blue-200 dark:bg-blue-900/40 dark:hover:bg-blue-900/60 dark:text-blue-300 dark:border-blue-800',
        },
        {
            variant: 'secondary' as const,
            className:
                'bg-green-100 hover:bg-green-200 text-green-700 border-green-200 dark:bg-green-900/40 dark:hover:bg-green-900/60 dark:text-green-300 dark:border-green-800',
        },
        {
            variant: 'outline' as const,
            className:
                'bg-purple-100 hover:bg-purple-200 text-purple-700 border-purple-200 dark:bg-purple-900/40 dark:hover:bg-purple-900/60 dark:text-purple-300 dark:border-purple-800',
        },
        {
            variant: 'destructive' as const,
            className:
                'bg-orange-100 hover:bg-orange-200 text-orange-700 border-orange-200 dark:bg-orange-900/40 dark:hover:bg-orange-900/60 dark:text-orange-300 dark:border-orange-800',
        },
        {
            variant: 'default' as const,
            className:
                'bg-pink-100 hover:bg-pink-200 text-pink-700 border-pink-200 dark:bg-pink-900/40 dark:hover:bg-pink-900/60 dark:text-pink-300 dark:border-pink-800',
        },
        {
            variant: 'secondary' as const,
            className:
                'bg-indigo-100 hover:bg-indigo-200 text-indigo-700 border-indigo-200 dark:bg-indigo-900/40 dark:hover:bg-indigo-900/60 dark:text-indigo-300 dark:border-indigo-800',
        },
        {
            variant: 'outline' as const,
            className:
                'bg-teal-100 hover:bg-teal-200 text-teal-700 border-teal-200 dark:bg-teal-900/40 dark:hover:bg-teal-900/60 dark:text-teal-300 dark:border-teal-800',
        },
        {
            variant: 'destructive' as const,
            className:
                'bg-cyan-100 hover:bg-cyan-200 text-cyan-700 border-cyan-200 dark:bg-cyan-900/40 dark:hover:bg-cyan-900/60 dark:text-cyan-300 dark:border-cyan-800',
        },
    ];

    return colors[index % colors.length];
}

export default async function TagsPage() {
    const { siteUrl, tags } = await getTagsPageData();
    const jsonLd = buildTagsJsonLd(tags, siteUrl);

    if (tags.length === 0) {
        return (
            <>
                <script
                    type="application/ld+json"
                    dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd.breadcrumb) }}
                />
                <script
                    type="application/ld+json"
                    dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd.collection) }}
                />
                <div className="relative h-full">
                    <AnimatedBackground tags={tags} />
                    <div className="relative z-10 container mx-auto px-4 py-20">
                        <Card className="bg-background/80 py-12 text-center backdrop-blur-sm">
                            <CardContent className="space-y-4">
                                <TagIcon className="mx-auto h-12 w-12 text-muted-foreground" />
                                <div className="space-y-2">
                                    <p className="text-lg font-medium">暂无标签</p>
                                    <p className="text-muted-foreground">
                                        还没有任何标签，发布文章时会自动创建标签。
                                    </p>
                                </div>
                            </CardContent>
                        </Card>
                    </div>
                </div>
            </>
        );
    }

    return (
        <>
            <script
                type="application/ld+json"
                dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd.breadcrumb) }}
            />
            <script
                type="application/ld+json"
                dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd.collection) }}
            />
            <div className="relative h-full">
                <AnimatedBackground tags={tags} />
                <div className="relative z-10 container mx-auto px-4 py-20">
                    <div className="space-y-12 pt-20">
                        <div className="space-y-8">
                            <h1 className="text-center text-3xl font-bold">标签云</h1>
                            <div className="mx-auto flex max-w-6xl flex-wrap justify-center gap-3">
                                {tags.map((tag, index) => {
                                    const colorInfo = getTagColor(index);

                                    return (
                                        <Link
                                            key={tag.id}
                                            href={buildTagUrl(tag.name)}
                                            className="transition-transform hover:scale-105"
                                            aria-label={`查看 ${tag.name} 标签下的 ${tag.count} 篇文章`}
                                        >
                                            <Badge
                                                variant={colorInfo.variant}
                                                className={cn(
                                                    'cursor-pointer px-4 py-2 text-sm font-medium transition-all duration-200',
                                                    'opacity-80 hover:shadow-lg hover:shadow-primary/25',
                                                    colorInfo.className,
                                                )}
                                            >
                                                {tag.name}
                                                <span className="ml-2 text-xs opacity-90">
                                                    {tag.count}
                                                </span>
                                            </Badge>
                                        </Link>
                                    );
                                })}
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </>
    );
}
