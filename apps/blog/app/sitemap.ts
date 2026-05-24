import type { MetadataRoute } from 'next';
import { prisma } from '@blog/db';
import { buildPublishedPostWhere } from '@/lib/server/published-posts';
import { getSiteUrl } from '@/lib/server/site-url';

export const revalidate = 3600;

const STATIC_ROUTES = ['', '/about', '/articles', '/tags', '/photos', '/snippets'] as const;

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
    const siteUrl = await getSiteUrl();
    const articles = await prisma.post.findMany({
        where: buildPublishedPostWhere(),
        select: {
            id: true,
            createdAt: true,
            updatedAt: true,
        },
        orderBy: {
            updatedAt: 'desc',
        },
    });

    const staticEntries: MetadataRoute.Sitemap = STATIC_ROUTES.map((path) => ({
        url: `${siteUrl}${path}`,
        lastModified: new Date(),
        changeFrequency: path === '' ? 'daily' : 'weekly',
        priority: path === '' ? 1 : 0.7,
    }));

    const articleEntries: MetadataRoute.Sitemap = articles.map((article) => ({
        url: `${siteUrl}/articles/${article.id}`,
        lastModified: article.updatedAt,
        changeFrequency: 'weekly',
        priority: 0.8,
    }));

    return [...staticEntries, ...articleEntries];
}
