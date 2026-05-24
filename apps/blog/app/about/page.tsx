import { cache } from 'react';
import type { Metadata } from 'next';
import { AboutPage } from './_components/AboutPage';
import { getConfiguredSiteUrl } from '@/config/site-config';

const ABOUT_PAGE_TITLE = "关于 | CodeLess's Blog";
const ABOUT_PAGE_DESCRIPTION =
    '了解 CodeLess 的技术方向、项目实践与内容表达方式，查看个人介绍、技术栈、开源项目与成长路径。';
export const dynamic = 'force-static';
export const revalidate = 86400;

function buildAboutJsonLd(siteUrl: string) {
    const aboutUrl = new URL('/about', siteUrl).toString();

    return {
        page: {
            '@context': 'https://schema.org',
            '@type': 'AboutPage',
            name: ABOUT_PAGE_TITLE,
            description: ABOUT_PAGE_DESCRIPTION,
            url: aboutUrl,
            isPartOf: {
                '@type': 'WebSite',
                name: "CodeLess's Blog",
                url: siteUrl,
            },
            about: {
                '@type': 'Person',
                name: 'CodeLess',
                jobTitle: 'Frontend Developer',
                email: 'your-email@example.com',
                address: {
                    '@type': 'PostalAddress',
                    addressLocality: 'Guangzhou',
                    addressCountry: 'China',
                },
            },
        },
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
                    name: '关于',
                    item: aboutUrl,
                },
            ],
        },
    };
}

const getAboutPageData = cache(async () => {
    return {
        siteUrl: getConfiguredSiteUrl(),
    };
});

export async function generateMetadata(): Promise<Metadata> {
    const { siteUrl } = await getAboutPageData();
    const openGraphImage = new URL('/icon_512.png', siteUrl).toString();

    return {
        title: ABOUT_PAGE_TITLE,
        description: ABOUT_PAGE_DESCRIPTION,
        keywords: ['关于', '个人介绍', '前端开发', '技术栈', '开源项目', '成长路径', 'CodeLess'],
        authors: [{ name: 'CodeLess' }],
        creator: 'CodeLess',
        publisher: 'CodeLess',
        alternates: {
            canonical: '/about',
        },
        openGraph: {
            title: ABOUT_PAGE_TITLE,
            description: ABOUT_PAGE_DESCRIPTION,
            url: new URL('/about', siteUrl).toString(),
            type: 'profile',
            images: [
                {
                    url: openGraphImage,
                    width: 512,
                    height: 512,
                    alt: "CodeLess's Blog 关于页",
                },
            ],
        },
        twitter: {
            card: 'summary',
            title: ABOUT_PAGE_TITLE,
            description: ABOUT_PAGE_DESCRIPTION,
            images: [openGraphImage],
        },
    };
}

export default async function AboutRoute() {
    const { siteUrl } = await getAboutPageData();
    const jsonLd = buildAboutJsonLd(siteUrl);

    return (
        <>
            <script
                type="application/ld+json"
                dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd.page) }}
            />
            <script
                type="application/ld+json"
                dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd.breadcrumb) }}
            />
            <AboutPage />
        </>
    );
}
