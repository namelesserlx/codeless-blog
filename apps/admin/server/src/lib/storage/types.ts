/** 文件内容分类，决定子目录名和 CDN 缓存策略 */
export type FileCategory = 'image' | 'video' | 'other';

/** FileCategory → COS 子目录映射 */
export const CATEGORY_DIR: Record<FileCategory, string> = {
    image: 'images',
    video: 'videos',
    other: 'others',
};

/**
 * 根据 MIME type 推断 FileCategory
 */
export function inferCategory(mimeType: string): FileCategory {
    if (mimeType.startsWith('image/')) return 'image';
    if (mimeType.startsWith('video/')) return 'video';
    return 'other';
}

export interface UploadParams {
    buffer: Buffer;
    originalName: string;
    mimeType: string;
    category: FileCategory;
    entityType: string;
    entityId: string | number;
}

export interface StorageProvider {
    /** 上传文件，返回可访问的完整 URL */
    upload(params: UploadParams): Promise<string>;
    /** 根据 URL 删除文件 */
    delete(fileUrl: string): Promise<void>;
    /** 根据 fileKey 构造访问 URL */
    getUrl(fileKey: string): string;
}
