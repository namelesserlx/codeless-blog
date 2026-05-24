import Link from 'next/link';
import { ArrowRight } from 'lucide-react';
import { FadeInSection } from '@/components/animations/FadeInSection';
import { HomeArticleCardLarge } from './HomeArticleCardLarge';
import { HomeArticleCardSmall } from './HomeArticleCardSmall';
import type { HomeArticle } from './types';

function buildHomepageArticles(articles: HomeArticle[]) {
    const featuredArticle = articles.find((article) => article.cardType === 'LARGE_IMAGE');
    const primaryArticle = featuredArticle ?? articles[0];
    const remainingArticles = articles.filter((article) => article.id !== primaryArticle?.id);
    const secondaryArticles = remainingArticles.slice(0, 2);

    return [
        ...(primaryArticle ? [{ article: primaryArticle, variant: 'large' as const }] : []),
        ...secondaryArticles.map((article) => ({ article, variant: 'small' as const })),
    ];
}

interface LatestArticlesSectionProps {
    articles: HomeArticle[];
}

export function LatestArticlesSection({ articles }: LatestArticlesSectionProps) {
    const homepageArticles = buildHomepageArticles(articles);

    return (
        <div className="space-y-12 lg:col-span-8">
            <FadeInSection direction="left" duration={420}>
                <div className="flex items-center justify-between border-b border-border pb-4">
                    <h2 className="relative text-2xl font-bold tracking-tight">
                        最新文章
                        <span className="absolute -bottom-[17px] left-0 h-0.5 w-1/2 bg-primary"></span>
                    </h2>
                    <Link
                        href="/articles"
                        className="group flex items-center text-sm text-primary hover:underline"
                    >
                        查看更多
                        <ArrowRight className="ml-1 h-4 w-4 transition-transform group-hover:translate-x-1" />
                    </Link>
                </div>
            </FadeInSection>

            <div className="space-y-10">
                {homepageArticles.map(({ article, variant }, index) => (
                    <FadeInSection
                        key={article.id}
                        direction={variant === 'large' ? 'up' : index % 2 === 0 ? 'left' : 'right'}
                        delay={variant === 'large' ? 120 : 220 + (index - 1) * 120}
                        duration={variant === 'large' ? 560 : 480}
                        className="transition-transform duration-300 hover:-translate-y-1"
                    >
                        {variant === 'large' ? (
                            <HomeArticleCardLarge article={article} />
                        ) : (
                            <HomeArticleCardSmall article={article} />
                        )}
                    </FadeInSection>
                ))}
            </div>
        </div>
    );
}
