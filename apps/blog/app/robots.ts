import type { MetadataRoute } from 'next';
import { getSiteUrl } from '@/lib/server/site-url';

export default async function robots(): Promise<MetadataRoute.Robots> {
    const siteUrl = await getSiteUrl();

    return {
        rules: [
            {
                userAgent: '*',
                allow: '/',
                disallow: ['/api/'],
            },
        ],
        sitemap: `${siteUrl}/sitemap.xml`,
        host: siteUrl,
    };
}
