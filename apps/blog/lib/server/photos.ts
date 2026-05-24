import 'server-only';

import { PhotoCategory, type Photo, type Prisma, prisma } from '@blog/db';
import { unstable_cache } from 'next/cache';
import type { PhotoRecord } from '@/types/photo';

export interface PaginationInfo {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
    hasMore: boolean;
}

export interface PhotosResponse {
    photos: PhotoRecord[];
    pagination: PaginationInfo;
}

const PHOTO_QUERY_REVALIDATE_SECONDS = 300;

const PHOTO_CATEGORY_MAP: Record<string, PhotoCategory> = {
    风景: PhotoCategory.SCENERY,
    动物: PhotoCategory.ANIMAL,
    人物: PhotoCategory.PERSON,
    建筑: PhotoCategory.BUILDING,
    美食: PhotoCategory.FOOD,
    旅行: PhotoCategory.TRAVEL,
    日常: PhotoCategory.DAILY,
    科技: PhotoCategory.TECHNOLOGY,
    运动: PhotoCategory.SPORTS,
    其他: PhotoCategory.OTHER,
};

const PHOTO_CATEGORY_LABELS: Record<PhotoCategory, string> = {
    [PhotoCategory.SCENERY]: '风景',
    [PhotoCategory.ANIMAL]: '动物',
    [PhotoCategory.PERSON]: '人物',
    [PhotoCategory.BUILDING]: '建筑',
    [PhotoCategory.FOOD]: '美食',
    [PhotoCategory.TRAVEL]: '旅行',
    [PhotoCategory.DAILY]: '日常',
    [PhotoCategory.TECHNOLOGY]: '科技',
    [PhotoCategory.SPORTS]: '运动',
    [PhotoCategory.OTHER]: '其他',
};

function parseJsonArray(value: string) {
    try {
        const parsedValue = JSON.parse(value);

        if (Array.isArray(parsedValue)) {
            return parsedValue.map((item) => String(item)).filter(Boolean);
        }

        if (parsedValue) {
            return [String(parsedValue)];
        }
    } catch {
        // ignore invalid JSON and fallback to plain string parsing
    }

    return value
        .split(',')
        .map((item) => item.trim())
        .filter(Boolean);
}

function formatPhotoRecord(photo: Photo): PhotoRecord {
    return {
        id: photo.id,
        src: parseJsonArray(photo.src),
        alt: photo.alt,
        title: photo.title,
        description: photo.description,
        location: photo.location,
        date: photo.date.toISOString().split('T')[0],
        tags: parseJsonArray(photo.tags),
        category: PHOTO_CATEGORY_LABELS[photo.category] || photo.category,
        createdAt: photo.createdAt.toISOString(),
        updatedAt: photo.updatedAt.toISOString(),
    };
}

function buildPagination(
    page: number,
    limit: number,
    total: number,
    count: number,
): PaginationInfo {
    const totalPages = total === 0 ? 0 : Math.ceil(total / limit);

    return {
        page,
        limit,
        total,
        totalPages,
        hasMore: page * limit < total && count > 0,
    };
}

const getAllPhotosCached = unstable_cache(
    async (): Promise<PhotoRecord[]> => {
        const photos = await prisma.photo.findMany({
            orderBy: [{ createdAt: 'desc' }, { date: 'desc' }],
        });

        return photos.map(formatPhotoRecord);
    },
    ['photos:all'],
    { revalidate: PHOTO_QUERY_REVALIDATE_SECONDS, tags: ['photos'] },
);

const getPaginatedPhotosCached = unstable_cache(
    async (categoryKey: string, page: number, limit: number): Promise<PhotosResponse> => {
        const whereCondition: Prisma.PhotoWhereInput =
            categoryKey === 'ALL'
                ? {}
                : {
                      category: PHOTO_CATEGORY_MAP[categoryKey] || (categoryKey as PhotoCategory),
                  };

        const skip = (page - 1) * limit;
        const [photos, total] = await Promise.all([
            prisma.photo.findMany({
                where: whereCondition,
                orderBy: [{ createdAt: 'desc' }, { date: 'desc' }],
                skip,
                take: limit,
            }),
            prisma.photo.count({ where: whereCondition }),
        ]);

        return {
            photos: photos.map(formatPhotoRecord),
            pagination: buildPagination(page, limit, total, photos.length),
        };
    },
    ['photos:paginated'],
    { revalidate: PHOTO_QUERY_REVALIDATE_SECONDS, tags: ['photos'] },
);

export async function getAllPhotos(): Promise<PhotosResponse> {
    const photos = await getAllPhotosCached();

    return {
        photos,
        pagination: buildPagination(1, photos.length || 1, photos.length, photos.length),
    };
}

export async function getPaginatedPhotos(
    category?: string,
    page: number = 1,
    limit: number = 12,
): Promise<PhotosResponse> {
    return getPaginatedPhotosCached(category || 'ALL', page, limit);
}
