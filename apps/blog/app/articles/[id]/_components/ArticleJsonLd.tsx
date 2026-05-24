import { buildArticleJsonLd, type ArticleSeoData } from '../seo';

interface ArticleJsonLdProps {
    articleId: string;
    article: ArticleSeoData;
    siteUrl: string;
}

export function ArticleJsonLd({ articleId, article, siteUrl }: ArticleJsonLdProps) {
    const jsonLd = buildArticleJsonLd(articleId, article, siteUrl);

    return (
        <script
            type="application/ld+json"
            dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
        />
    );
}
