import { validateCosConfig } from '../../config/cos';
import { ErrorCode, FileError, ValidationError } from '../../types/errors';
import { ServiceErrorHandler, TraceSpan } from '../../utils/decorators';
import { CosUtil, UploadOptions } from '../../utils/cos';
import { getStorage } from '../../lib/storage';
import type { FileCategory, UploadParams } from '../../lib/storage/types';
import { inferCategory } from '../../lib/storage/types';

export interface UploadFileOptions {
    /** 上传到的文件夹，如 'images', 'documents', 'videos'（旧模式） */
    folder?: string;
    /** 缓存类型，会自动设置对应的cache-control */
    cacheType?: 'image' | 'document' | 'video' | 'static' | 'dynamic';
    /** 自定义缓存控制，优先级高于cacheType */
    cacheControl?: string;
    /** 是否自动检测文件类型并设置Content-Type */
    autoContentType?: boolean;
}

export interface UploadedMemoryFile {
    buffer: Buffer;
    originalname: string;
    mimetype?: string;
    fieldname?: string;
    size?: number;
}

export interface UploadAssetOptions {
    entityType: string;
    entityId: string | number;
    category?: FileCategory;
}

export class GlobalService {
    /**
     * 上传附件（旧模式，兼容保留）
     */
    @TraceSpan('storage.upload', (_file: any, options: UploadFileOptions = {}) => ({
        'storage.has_folder': Boolean(options.folder),
        'storage.has_cache_control': Boolean(options.cacheControl),
    }))
    @ServiceErrorHandler
    async upload(
        file: UploadedMemoryFile | undefined,
        options: UploadFileOptions = {},
    ): Promise<string> {
        if (!file) {
            throw new ValidationError('请上传附件文件');
        }

        if (!validateCosConfig()) {
            throw new FileError(ErrorCode.UPLOAD_FAILED, '对象存储配置不完整，无法上传文件');
        }

        const { buffer, originalname, mimetype } = file;
        const { folder, cacheType = 'static', cacheControl, autoContentType = true } = options;

        const cosOptions: UploadOptions = {};

        if (folder) {
            cosOptions.folder = folder;
        }

        if (cacheControl) {
            cosOptions.cacheControl = cacheControl;
        } else {
            cosOptions.cacheControl = CosUtil.getCacheControl(cacheType);
        }

        if (autoContentType) {
            cosOptions.contentType = mimetype || CosUtil.getContentType(originalname);
        }

        return await CosUtil.uploadFile(buffer, originalname, cosOptions);
    }

    /**
     * 按实体+类型上传文件（新模式）
     * 存储路径：{entityType}/{entityId}/{categoryDir}/{uuid}-{fileName}
     */
    @ServiceErrorHandler
    async uploadAsset(
        file: UploadedMemoryFile | undefined,
        options: UploadAssetOptions,
    ): Promise<string> {
        if (!file) {
            throw new ValidationError('请上传附件文件');
        }

        const { buffer, originalname, mimetype } = file;
        const category = options.category ?? inferCategory(mimetype ?? '');

        const params: UploadParams = {
            buffer,
            originalName: originalname,
            mimeType: mimetype ?? 'application/octet-stream',
            category,
            entityType: options.entityType,
            entityId: options.entityId,
        };

        return await getStorage().upload(params);
    }

    /**
     * 上传图片文件（预设配置）
     */
    @ServiceErrorHandler
    async uploadImage(
        file: UploadedMemoryFile | undefined,
        folder: string = 'images',
    ): Promise<string> {
        return this.upload(file, {
            folder,
            cacheType: 'image',
            autoContentType: true,
        });
    }

    /**
     * 上传文档文件（预设配置）
     */
    @ServiceErrorHandler
    async uploadDocument(
        file: UploadedMemoryFile | undefined,
        folder: string = 'documents',
    ): Promise<string> {
        return this.upload(file, {
            folder,
            cacheType: 'document',
            autoContentType: true,
        });
    }

    /**
     * 上传视频文件（预设配置）
     */
    @ServiceErrorHandler
    async uploadVideo(
        file: UploadedMemoryFile | undefined,
        folder: string = 'videos',
    ): Promise<string> {
        return this.upload(file, {
            folder,
            cacheType: 'video',
            autoContentType: true,
        });
    }

    /**
     * 删除文件
     */
    @TraceSpan('storage.delete', (fileUrl: string) => ({
        'storage.has_file_url': Boolean(fileUrl),
    }))
    @ServiceErrorHandler
    async deleteFile(fileUrl: string): Promise<void> {
        if (!validateCosConfig()) return;
        await getStorage().delete(fileUrl);
    }

    /**
     * 批量删除文件（通过 URL），忽略单个删除失败
     */
    @ServiceErrorHandler
    async deleteFiles(urls: string[]): Promise<void> {
        await Promise.allSettled(urls.map((url) => this.deleteFile(url)));
    }
}

export const globalService = new GlobalService();
