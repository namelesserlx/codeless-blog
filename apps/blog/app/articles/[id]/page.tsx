import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { ARTICLE_NOT_FOUND_METADATA, buildArticleMetadata } from './seo';
import { getArticlePageData, type ArticlePageProps } from './data';
import { ArticleJsonLd } from './_components/ArticleJsonLd';
import { ArticlePageShell } from './_components/ArticlePageShell';

export async function generateMetadata({
    params,
    searchParams,
}: ArticlePageProps): Promise<Metadata> {
    const { articleId, article, isPreview, siteUrl } = await getArticlePageData({
        params,
        searchParams,
    });

    if (!article) {
        return ARTICLE_NOT_FOUND_METADATA;
    }

    return buildArticleMetadata({
        articleId,
        article,
        siteUrl,
        isPreview,
    });
}

export default async function ArticlePage({ params, searchParams }: ArticlePageProps) {
    const { articleId, article, headings, isPreview, siteUrl } = await getArticlePageData({
        params,
        searchParams,
    });

    if (!article) {
        notFound();
    }

    return (
        <>
            {!isPreview ? (
                <ArticleJsonLd articleId={articleId} article={article} siteUrl={siteUrl} />
            ) : null}
            <ArticlePageShell article={article} headings={headings} isPreview={isPreview} />
        </>
    );
}
