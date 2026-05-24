import { cache } from 'react';
import type { ArticleDetailResponse, ResponseData } from '@blog/shared';
import { publicEnv } from '@/config/public-env';
import { getArticleById } from '@/lib/server/db';
import { getSiteUrl } from '@/lib/server/site-url';
import { extractTableOfContents, type ArticleHeading } from './toc';

type PublishedArticle = NonNullable<Awaited<ReturnType<typeof getArticleById>>>;
export type ArticlePageArticle = PublishedArticle | ArticleDetailResponse;

export interface ArticlePageProps {
    params: Promise<{
        id: string;
    }>;
    searchParams: Promise<{
        preview?: string;
        previewToken?: string;
    }>;
}

interface ArticleRouteState {
    articleId: string;
    previewToken?: string;
    isPreview: boolean;
}

export interface ArticlePageData extends ArticleRouteState {
    article: ArticlePageArticle | null;
    headings: ArticleHeading[];
    siteUrl: string;
}

function buildPreviewApiUrl(previewToken: string) {
    const apiUrl = publicEnv.urls.api;
    const normalizedBase = apiUrl.replace(/\/+$/, '');
    const apiBase = normalizedBase.endsWith('/api') ? normalizedBase : `${normalizedBase}/api`;

    return `${apiBase}/blog/articles/preview/${encodeURIComponent(previewToken)}`;
}

async function getPreviewArticle(previewToken: string): Promise<ArticleDetailResponse | null> {
    try {
        const response = await fetch(buildPreviewApiUrl(previewToken), {
            cache: 'no-store',
        });

        if (!response.ok) {
            return null;
        }

        const result = (await response.json()) as ResponseData<ArticleDetailResponse>;
        return result.code === 0 ? result.data : null;
    } catch (error) {
        console.error('获取文章预览失败:', error);
        return null;
    }
}

const resolveArticle = cache(async (articleId: string, previewToken?: string) => {
    if (previewToken) {
        return await getPreviewArticle(previewToken);
    }

    return await getArticleById(articleId);
});

async function resolveRouteState({
    params,
    searchParams,
}: ArticlePageProps): Promise<ArticleRouteState> {
    const resolvedParams = await params;
    const resolvedSearchParams = await searchParams;
    const previewToken = resolvedSearchParams.previewToken;

    return {
        articleId: resolvedParams.id,
        previewToken,
        isPreview: Boolean(previewToken),
    };
}

const readArticlePageData = cache(
    async (articleId: string, previewToken?: string): Promise<ArticlePageData> => {
        const isPreview = Boolean(previewToken);
        const [article, siteUrl] = await Promise.all([
            resolveArticle(articleId, previewToken),
            getSiteUrl(),
        ]);

        return {
            articleId,
            previewToken,
            isPreview,
            article,
            headings: article ? extractTableOfContents(article.content) : [],
            siteUrl,
        };
    },
);

export async function getArticlePageData(props: ArticlePageProps): Promise<ArticlePageData> {
    const routeState = await resolveRouteState(props);

    return await readArticlePageData(routeState.articleId, routeState.previewToken);
}
