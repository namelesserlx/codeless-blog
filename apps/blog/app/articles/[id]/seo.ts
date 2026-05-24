import type { Metadata } from 'next';
import { storedArticleContentToText } from './content-format';

interface ArticleSeoAuthor {
    nickname?: string | null;
    username?: string | null;
}

interface ArticleSeoTag {
    name: string;
}

export interface ArticleSeoData {
    title: string;
    content: string;
    summary?: string | null;
    createdAt: string | Date;
    updatedAt: string | Date;
    author?: ArticleSeoAuthor | null;
    tags: ArticleSeoTag[];
}

interface BuildArticleMetadataOptions {
    articleId: string;
    article: ArticleSeoData;
    siteUrl: string;
    isPreview: boolean;
}

export const ARTICLE_NOT_FOUND_METADATA: Metadata = {
    title: '文章不存在',
    description: '抱歉，您访问的文章不存在。',
    robots: {
        index: false,
        follow: false,
    },
};

function toDate(value: string | Date) {
    return value instanceof Date ? value : new Date(value);
}

export function getArticleAuthorName(article: Pick<ArticleSeoData, 'author'>) {
    return article.author?.nickname || article.author?.username || '匿名';
}

export function buildArticleDescription(
    article: Pick<ArticleSeoData, 'title' | 'content' | 'summary'>,
) {
    const source = (
        article.summary ||
        storedArticleContentToText(article.content) ||
        article.title
    ).trim();

    return source.length > 160 ? `${source.slice(0, 157)}...` : source;
}

export function buildArticleUrl(articleId: string, siteUrl: string) {
    return new URL(`/articles/${articleId}`, siteUrl).toString();
}

export function buildArticleImageUrl(articleId: string, siteUrl: string) {
    return new URL(`/articles/${articleId}/opengraph-image`, siteUrl).toString();
}

export function buildArticleMetadata({
    articleId,
    article,
    siteUrl,
    isPreview,
}: BuildArticleMetadataOptions): Metadata {
    const description = buildArticleDescription(article);
    const publishedTime = toDate(article.createdAt);
    const modifiedTime = toDate(article.updatedAt);
    const articleImageUrl = buildArticleImageUrl(articleId, siteUrl);
    const authorName = getArticleAuthorName(article);

    return {
        title: article.title,
        description,
        alternates: isPreview
            ? undefined
            : {
                  canonical: `/articles/${articleId}`,
              },
        robots: isPreview
            ? {
                  index: false,
                  follow: false,
                  googleBot: {
                      index: false,
                      follow: false,
                      noimageindex: true,
                      nosnippet: true,
                      noarchive: true,
                  },
              }
            : {
                  index: true,
                  follow: true,
                  googleBot: {
                      index: true,
                      follow: true,
                      'max-image-preview': 'large',
                      'max-snippet': -1,
                      'max-video-preview': -1,
                  },
              },
        keywords: article.tags.map((tag) => tag.name).join(', '),
        authors: [{ name: authorName }],
        openGraph: {
            title: article.title,
            description,
            url: isPreview ? undefined : buildArticleUrl(articleId, siteUrl),
            type: 'article',
            publishedTime: publishedTime.toISOString(),
            modifiedTime: modifiedTime.toISOString(),
            authors: [authorName],
            tags: article.tags.map((tag) => tag.name),
            images: isPreview
                ? undefined
                : [
                      {
                          url: articleImageUrl,
                          width: 1200,
                          height: 630,
                          alt: article.title,
                      },
                  ],
        },
        twitter: {
            card: isPreview ? 'summary' : 'summary_large_image',
            title: article.title,
            description,
            images: isPreview ? undefined : [articleImageUrl],
        },
    };
}

export function buildArticleJsonLd(articleId: string, article: ArticleSeoData, siteUrl: string) {
    return {
        '@context': 'https://schema.org',
        '@type': 'Article',
        headline: article.title,
        description: buildArticleDescription(article),
        datePublished: toDate(article.createdAt).toISOString(),
        dateModified: toDate(article.updatedAt).toISOString(),
        mainEntityOfPage: buildArticleUrl(articleId, siteUrl),
        url: buildArticleUrl(articleId, siteUrl),
        image: [buildArticleImageUrl(articleId, siteUrl)],
        author: {
            '@type': 'Person',
            name: getArticleAuthorName(article),
        },
        keywords: article.tags.map((tag) => tag.name).join(', '),
    };
}
