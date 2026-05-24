import { cache } from 'react';
import type { Metadata } from 'next';
import { getConfiguredSiteUrl } from '@/config/site-config';
import { getAllPhotos } from '@/lib/server/photos';
import type { PhotoRecord } from '@/types/photo';
import { PhotosPageClient } from './_components/PhotosPageClient';

const PHOTOS_PAGE_TITLE = '时光相册';
const PHOTOS_PAGE_DESCRIPTION =
    '记录生活中的美好瞬间，分享摄影作品和旅行回忆。浏览精选照片集，涵盖风景、建筑、美食、旅行等多个分类。';

export const revalidate = 300;

const getPhotosPageData = cache(async () => {
    const siteUrl = getConfiguredSiteUrl();
    const photosResult = await getAllPhotos();

    return {
        siteUrl,
        photosResult,
    };
});

function toAbsoluteAssetUrl(src: string, siteUrl: string) {
    try {
        return new URL(src, siteUrl).toString();
    } catch {
        return undefined;
    }
}

function buildPhotosJsonLd(photos: PhotoRecord[], siteUrl: string) {
    const imageItems = photos
        .flatMap((photo) =>
            photo.src.map((src, index) => {
                const resolvedSrc = toAbsoluteAssetUrl(src, siteUrl);

                if (!resolvedSrc) {
                    return null;
                }

                return {
                    '@type': 'ImageObject',
                    url: resolvedSrc,
                    contentUrl: resolvedSrc,
                    name: photo.title || photo.alt,
                    caption: photo.alt || photo.title,
                    description: photo.description || undefined,
                    uploadDate: photo.createdAt,
                    keywords: photo.tags.join(', ') || undefined,
                    genre: photo.category || undefined,
                    locationCreated: photo.location
                        ? {
                              '@type': 'Place',
                              name: photo.location,
                          }
                        : undefined,
                    representativeOfPage: index === 0,
                };
            }),
        )
        .filter(Boolean)
        .slice(0, 24);

    return {
        '@context': 'https://schema.org',
        '@type': 'CollectionPage',
        name: PHOTOS_PAGE_TITLE,
        description: PHOTOS_PAGE_DESCRIPTION,
        url: new URL('/photos', siteUrl).toString(),
        mainEntity: {
            '@type': 'ImageGallery',
            name: PHOTOS_PAGE_TITLE,
            associatedMedia: imageItems,
        },
        hasPart: {
            '@type': 'ItemList',
            itemListElement: imageItems.map((image, index) => ({
                '@type': 'ListItem',
                position: index + 1,
                item: image,
            })),
        },
    };
}

export async function generateMetadata(): Promise<Metadata> {
    const { siteUrl, photosResult } = await getPhotosPageData();
    const firstImage = photosResult.photos[0]?.src[0];
    const socialImage = firstImage ? toAbsoluteAssetUrl(firstImage, siteUrl) : undefined;

    return {
        title: `${PHOTOS_PAGE_TITLE} - 个人博客`,
        description: PHOTOS_PAGE_DESCRIPTION,
        alternates: {
            canonical: '/photos',
        },
        keywords: ['摄影', '相册', '时光', '回忆', '旅行', '风景摄影', '建筑摄影', '个人博客'],
        robots: {
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
        openGraph: {
            title: PHOTOS_PAGE_TITLE,
            description: PHOTOS_PAGE_DESCRIPTION,
            url: new URL('/photos', siteUrl).toString(),
            type: 'website',
            images: socialImage
                ? [
                      {
                          url: socialImage,
                          alt: PHOTOS_PAGE_TITLE,
                      },
                  ]
                : undefined,
        },
        twitter: {
            card: socialImage ? 'summary_large_image' : 'summary',
            title: PHOTOS_PAGE_TITLE,
            description: PHOTOS_PAGE_DESCRIPTION,
            images: socialImage ? [socialImage] : undefined,
        },
    };
}

export default async function PhotosPage() {
    const { siteUrl, photosResult } = await getPhotosPageData();
    const jsonLd = buildPhotosJsonLd(photosResult.photos, siteUrl);

    return (
        <>
            <script
                type="application/ld+json"
                dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
            />
            <PhotosPageClient initialPhotos={photosResult.photos} />
        </>
    );
}
