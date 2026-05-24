import type { Metadata } from 'next';
import { preconnect, prefetchDNS, preload } from 'react-dom';
import { getPublishedSnippets } from '@/lib/server/db';
import { getConfiguredSiteUrl } from '@/config/site-config';
import { SnippetFeed } from './_components/SnippetFeed';
import type { SnippetListItem } from './_lib/snippet-types';
import {
    SNIPPETS_PAGE_DESCRIPTION,
    SNIPPETS_PAGE_TITLE,
    buildSnippetExcerpt,
    getSnippetAuthorName,
    serializeSnippet,
} from './_lib/snippet-utils';

const INITIAL_PAGE_SIZE = 10;

export const revalidate = 300;

function buildSnippetsJsonLd(snippets: SnippetListItem[], siteUrl: string) {
    return {
        '@context': 'https://schema.org',
        '@type': 'CollectionPage',
        name: '片段',
        description: SNIPPETS_PAGE_DESCRIPTION,
        url: new URL('/snippets', siteUrl).toString(),
        mainEntity: {
            '@type': 'ItemList',
            itemListElement: snippets.map((snippet, index) => ({
                '@type': 'ListItem',
                position: index + 1,
                item: {
                    '@type': 'SocialMediaPosting',
                    headline: snippet.title || buildSnippetExcerpt(snippet),
                    articleBody: snippet.content,
                    url: new URL(`/snippets#snippet-${snippet.id}`, siteUrl).toString(),
                    datePublished: snippet.createdAt,
                    dateModified: snippet.updatedAt,
                    author: {
                        '@type': 'Person',
                        name: getSnippetAuthorName(snippet.author),
                    },
                },
            })),
        },
    };
}

function warmSnippetMedia(snippets: SnippetListItem[]) {
    const firstSnippet = snippets[0];

    if (!firstSnippet) {
        return;
    }

    const firstMedia = firstSnippet.media[0];

    if (!firstMedia || firstMedia.type !== 'video' || !firstMedia.posterUrl) {
        return;
    }

    try {
        const mediaUrl = new URL(firstMedia.posterUrl);
        const origin = mediaUrl.origin;

        prefetchDNS(origin);
        preconnect(origin, { crossOrigin: '' });
        preload(firstMedia.posterUrl, {
            as: 'image',
            fetchPriority: 'high',
        });
    } catch {
        // 忽略无效 URL，避免影响页面渲染
    }
}

export async function generateMetadata(): Promise<Metadata> {
    const siteUrl = getConfiguredSiteUrl();

    return {
        title: SNIPPETS_PAGE_TITLE,
        description: SNIPPETS_PAGE_DESCRIPTION,
        alternates: {
            canonical: '/snippets',
        },
        keywords: ['片段', '动态', '日常', '灵感', 'CodeLess'],
        openGraph: {
            title: SNIPPETS_PAGE_TITLE,
            description: SNIPPETS_PAGE_DESCRIPTION,
            url: new URL('/snippets', siteUrl).toString(),
            type: 'website',
        },
        twitter: {
            card: 'summary',
            title: SNIPPETS_PAGE_TITLE,
            description: SNIPPETS_PAGE_DESCRIPTION,
        },
    };
}

export default async function SnippetsPage() {
    const siteUrl = getConfiguredSiteUrl();
    const snippetsResult = await getPublishedSnippets({
        page: 1,
        limit: INITIAL_PAGE_SIZE,
    });

    const initialSnippets = snippetsResult.snippets.map(serializeSnippet);
    const jsonLd = buildSnippetsJsonLd(initialSnippets, siteUrl);
    warmSnippetMedia(initialSnippets);

    return (
        <div className="min-h-screen bg-[#f7fafc] text-zinc-900 transition-colors duration-300 dark:bg-[#1a202c] dark:text-zinc-100">
            <script
                type="application/ld+json"
                dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
            />

            <section className="mx-auto max-w-2xl border-b border-zinc-200 px-5 pt-10 pb-6 md:px-4 dark:border-zinc-800/50">
                <h1 className="mb-2 text-2xl font-bold text-zinc-900 dark:text-zinc-100">片段</h1>
                <p className="text-sm text-zinc-500 dark:text-zinc-400">
                    {SNIPPETS_PAGE_DESCRIPTION}
                </p>
            </section>

            <SnippetFeed
                initialSnippets={initialSnippets}
                initialPage={snippetsResult.pagination.page}
                totalPages={snippetsResult.pagination.totalPages}
                pageSize={snippetsResult.pagination.limit}
            />
        </div>
    );
}
