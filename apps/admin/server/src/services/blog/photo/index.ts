import { prisma, type PhotoCategory as PrismaPhotoCategory } from '@blog/db';
import {
    CreatePhotoRequest,
    Photo,
    PhotoListRequest,
    PhotoListResponse,
    UpdatePhotoRequest,
} from '@blog/shared';
import { ServiceErrorHandler } from '../../../utils/decorators';
import { ValidationError, NotFoundError } from '../../../types/errors';
import { globalService, type UploadedMemoryFile } from '../../global';

interface PhotoExportItemInternal extends CreatePhotoRequest {
    originalId: number;
    createdAt: string;
    updatedAt: string;
}

type PhotoExportResponseInternal = PhotoExportItemInternal[];

interface PhotoImportRequestInternal {
    photos: PhotoExportItemInternal[];
}

interface PhotoImportResponseInternal {
    total: number;
    successCount: number;
    failCount: number;
    results: {
        originalId: number;
        newId?: number;
        title: string;
        success: boolean;
        errorMessage?: string;
    }[];
}

interface PhotoRecord {
    id: number;
    src: string;
    alt: string;
    title: string;
    description: string;
    location: string;
    date: Date;
    tags: string;
    category: { toString(): string };
    createdAt: Date;
    updatedAt: Date;
}

interface PhotoUpdateData {
    title?: string;
    alt?: string;
    description?: string;
    src?: string;
    category?: PrismaPhotoCategory;
    location?: string;
    tags?: string;
    date?: Date;
}

type PhotoFindManyArgs = NonNullable<Parameters<typeof prisma.photo.findMany>[0]>;
type PhotoWhereInput = NonNullable<PhotoFindManyArgs['where']>;

function parsePhotoSrc(src: string | null | undefined): string[] {
    if (!src) return [];

    try {
        const parsed = JSON.parse(src);
        if (Array.isArray(parsed)) {
            return parsed;
        }
        return parsed ? [String(parsed)] : [];
    } catch {
        return [src];
    }
}

function parsePhotoTags(tags: string): string[] {
    try {
        const parsed = JSON.parse(tags);
        if (Array.isArray(parsed)) {
            return parsed.filter((item): item is string => typeof item === 'string');
        }
    } catch {
        // 兼容历史逗号分隔字符串
    }

    return tags
        .split(',')
        .map((tag) => tag.trim())
        .filter(Boolean);
}

function transformPhotoData(photo: PhotoRecord): Photo {
    return {
        id: photo.id,
        title: photo.title,
        alt: photo.alt,
        description: photo.description,
        location: photo.location,
        category: photo.category.toString(),
        src: parsePhotoSrc(photo.src),
        date: photo.date.toISOString(),
        tags: parsePhotoTags(photo.tags),
        createdAt: photo.createdAt.toISOString(),
        updatedAt: photo.updatedAt.toISOString(),
    };
}

export class PhotoService {
    // 获取相册列表
    @ServiceErrorHandler
    async getPhotoList(params: PhotoListRequest): Promise<PhotoListResponse> {
        const { page = 1, pageSize = 10, title, tags, category, date } = params;

        const skip = (page - 1) * pageSize;
        const where: PhotoWhereInput = {};

        // 构建查询条件
        if (title) {
            where.title = { contains: title };
        }
        if (tags) {
            where.tags = { contains: tags.join(',') };
        }
        if (category) {
            where.category = category as PrismaPhotoCategory;
        }
        if (date) {
            where.date = { gte: new Date(date[0]), lte: new Date(date[1]) };
        }

        // 查询相册列表
        const [list, total] = await Promise.all([
            prisma.photo.findMany({
                where,
                skip,
                take: pageSize,
                orderBy: { id: 'desc' },
            }),
            prisma.photo.count({ where }),
        ]);

        return {
            list: list.map((item) => transformPhotoData(item)),
            total,
            page,
            pageSize,
        };
    }

    // 创建相册
    @ServiceErrorHandler
    async createPhoto(params: CreatePhotoRequest): Promise<Photo> {
        const { title, description, src, category, tags, date, location } = params;

        // 处理图片URL：统一为JSON字符串格式存储
        const imageUrls = JSON.stringify(src);

        const photo = await prisma.photo.create({
            data: {
                title,
                alt: title,
                description,
                src: imageUrls,
                category: category as PrismaPhotoCategory,
                tags: JSON.stringify(tags),
                date: date as unknown as Date,
                location,
            },
        });

        return transformPhotoData(photo);
    }

    // 更新相册
    @ServiceErrorHandler
    async updatePhoto(params: UpdatePhotoRequest): Promise<Photo> {
        const { id, ...data } = params;
        let removedUrls: string[] = [];

        // 清理废弃的图片文件
        if (data.src) {
            const existing = await prisma.photo.findUnique({ where: { id } });
            if (existing) {
                const oldSrc = parsePhotoSrc(existing.src);
                const newSrc = Array.isArray(data.src) ? data.src : [data.src as unknown as string];
                const newSet = new Set(newSrc);
                removedUrls = oldSrc.filter((url) => !newSet.has(url));
            }
        }

        const updateData: PhotoUpdateData = {};
        if (data.title !== undefined) updateData.title = data.title;
        if (data.description !== undefined) updateData.description = data.description;
        if (data.location !== undefined) updateData.location = data.location;
        if (data.src !== undefined) updateData.src = JSON.stringify(data.src);
        if (data.category !== undefined) updateData.category = data.category as PrismaPhotoCategory;
        if (data.tags !== undefined) updateData.tags = JSON.stringify(data.tags);
        if (data.date !== undefined) updateData.date = data.date as unknown as Date;

        const photo = await prisma.photo.update({
            where: { id },
            data: updateData,
        });

        if (removedUrls.length > 0) {
            globalService.deleteFiles(removedUrls).catch(() => {});
        }

        return transformPhotoData(photo);
    }

    // 删除相册
    @ServiceErrorHandler
    async deletePhoto(id: number): Promise<void> {
        // 先读取 URL 用于删除 COS 文件
        const existing = await prisma.photo.findUnique({ where: { id } });
        const urls = existing ? parsePhotoSrc(existing.src) : [];

        await prisma.photo.delete({ where: { id } });

        if (urls.length > 0) {
            globalService.deleteFiles(urls).catch(() => {});
        }
    }

    @ServiceErrorHandler
    async upload(file: UploadedMemoryFile | undefined, photoId: string | number): Promise<string> {
        return await globalService.uploadAsset(file, {
            entityType: 'photos',
            entityId: photoId,
            category: 'image',
        });
    }

    /**
     * 将数据库中的相册记录转换为导出结构
     */
    private transformPhotoForExport(photo: PhotoRecord): PhotoExportItemInternal {
        return {
            originalId: photo.id,
            title: photo.title,
            description: photo.description,
            src: parsePhotoSrc(photo.src),
            category: photo.category.toString(),
            location: photo.location,
            tags: parsePhotoTags(photo.tags),
            date: photo.date.toISOString(),
            createdAt: photo.createdAt.toISOString(),
            updatedAt: photo.updatedAt.toISOString(),
        };
    }

    /**
     * 批量导出相册为 JSON 配置
     */
    @ServiceErrorHandler
    async exportPhotos(ids: number[]): Promise<PhotoExportResponseInternal> {
        if (!ids || ids.length === 0) {
            return [];
        }

        const photos = await prisma.photo.findMany({
            where: { id: { in: ids } },
            orderBy: { id: 'desc' },
        });

        return photos.map((photo) => this.transformPhotoForExport(photo));
    }

    /**
     * 导出所有相册为 JSON 配置
     */
    @ServiceErrorHandler
    async exportAllPhotos(): Promise<PhotoExportResponseInternal> {
        const photos = await prisma.photo.findMany({
            orderBy: { id: 'desc' },
        });

        return photos.map((photo) => this.transformPhotoForExport(photo));
    }

    /**
     * 批量导入相册 JSON 配置
     */
    @ServiceErrorHandler
    async importPhotos(data: PhotoImportRequestInternal): Promise<PhotoImportResponseInternal> {
        const { photos } = data;

        if (!photos || photos.length === 0) {
            return {
                total: 0,
                successCount: 0,
                failCount: 0,
                results: [],
            };
        }

        const results: PhotoImportResponseInternal['results'] = [];

        for (const photo of photos) {
            const {
                originalId,
                createdAt: _createdAt,
                updatedAt: _updatedAt,
                ...createData
            } = photo;

            try {
                const created = await this.createPhoto(createData);

                results.push({
                    originalId,
                    newId: created.id,
                    title: created.title,
                    success: true,
                });
            } catch (error) {
                const message = error instanceof Error ? error.message : '导入失败';
                results.push({
                    originalId,
                    newId: undefined,
                    title: photo.title,
                    success: false,
                    errorMessage: message,
                });
            }
        }

        const total = results.length;
        const successCount = results.filter((item) => item.success).length;
        const failCount = total - successCount;

        return {
            total,
            successCount,
            failCount,
            results,
        };
    }
}

export const photoService = new PhotoService();
