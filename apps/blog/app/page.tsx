import { HomePageContent } from './_components/HomePageContent';
import { getHomeSidebarData, getHomeStats, getPublishedArticles } from '@/lib/server/db';
import { transformArticleData } from '@/lib/shared/utils';

export const revalidate = 1800;

export default async function Home() {
    const [homeStats, articles, sidebarData] = await Promise.all([
        getHomeStats(),
        getPublishedArticles({ take: 3 }),
        getHomeSidebarData(),
    ]);

    const articleCards = articles.map(transformArticleData);

    return (
        <HomePageContent homeStats={homeStats} articles={articleCards} sidebarData={sidebarData} />
    );
}
