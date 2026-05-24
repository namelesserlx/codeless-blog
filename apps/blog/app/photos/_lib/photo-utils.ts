import type { PhotoModalData } from './photo-modal';
import type { PhotoRecord } from '@/types/photo';

export interface PhotoGroupSummary {
    categoryLabel?: string;
    countLabel: string;
    locationLabel?: string;
}

export function formatPhotoDate(date: string) {
    const [year, month, day] = date.split('-').map((value) => parseInt(value, 10));

    if (!year || !month || !day) {
        return date;
    }

    return `${year}年${month}月${day}日`;
}

export function getImageCount<T extends { src: string[] | string }>(photos: T[]) {
    return photos.reduce((count, photo) => {
        return count + (Array.isArray(photo.src) ? photo.src.length : 1);
    }, 0);
}

export function getPhotoGroupSummary<T extends { category: string; location: string }>(
    photos: T[],
    count: number = photos.length,
): PhotoGroupSummary {
    const uniqueLocations = Array.from(
        new Set(photos.map((photo) => photo.location).filter(Boolean)),
    );
    const uniqueCategories = Array.from(
        new Set(photos.map((photo) => photo.category).filter(Boolean)),
    );

    const locationLabel =
        uniqueLocations.length === 0
            ? undefined
            : uniqueLocations.length === 1
              ? uniqueLocations[0]
              : `${uniqueLocations[0]} 等 ${uniqueLocations.length} 个地点`;

    const categoryLabel =
        uniqueCategories.length === 0
            ? undefined
            : uniqueCategories.length === 1
              ? uniqueCategories[0]
              : `${uniqueCategories.length} 个主题`;

    return {
        locationLabel,
        categoryLabel,
        countLabel: `${count} 张照片`,
    };
}

export function toPhotoModalData(photo: PhotoRecord): PhotoModalData {
    return {
        id: photo.id,
        src: photo.src,
        alt: photo.alt,
        title: photo.title,
        description: photo.description,
        location: photo.location,
        date: photo.date,
        tags: photo.tags,
        category: photo.category,
        createdAt: photo.createdAt,
        initialImageIndex: 0,
        viewerKey: String(photo.id),
    };
}
