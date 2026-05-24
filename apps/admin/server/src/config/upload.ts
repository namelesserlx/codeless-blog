import multer, { type Options } from '@koa/multer';
import { ErrorCode, FileError } from '../types/errors';

const MB = 1024 * 1024;

const IMAGE_MIME_TYPES = ['image/jpeg', 'image/png', 'image/webp', 'image/gif'];
const VIDEO_MIME_TYPES = ['video/mp4', 'video/webm', 'video/quicktime'];

export interface UploadConfig {
    allowedMimeTypes: string[];
    limits: NonNullable<Options['limits']>;
}

type UploadFileFilterCallback = (error: Error | null, acceptFile?: boolean) => void;

export const avatarUploadConfig: UploadConfig = {
    allowedMimeTypes: IMAGE_MIME_TYPES,
    limits: {
        fileSize: 2 * MB,
        files: 1,
    },
};

export const imageUploadConfig: UploadConfig = {
    allowedMimeTypes: IMAGE_MIME_TYPES,
    limits: {
        fileSize: 5 * MB,
        files: 1,
    },
};

export const mixedMediaUploadConfig: UploadConfig = {
    allowedMimeTypes: [...IMAGE_MIME_TYPES, ...VIDEO_MIME_TYPES],
    limits: {
        fileSize: 20 * MB,
        files: 1,
    },
};

export const createUploadFileFilter =
    (allowedMimeTypes: string[]) =>
    (_req: unknown, file: { mimetype: string }, cb: UploadFileFilterCallback) => {
        if (!allowedMimeTypes.includes(file.mimetype)) {
            cb(new FileError(ErrorCode.INVALID_FILE_TYPE, '文件类型不支持'), false);
            return;
        }

        cb(null, true);
    };

export const createMemoryUpload = (config: UploadConfig) => {
    return multer({
        storage: multer.memoryStorage(),
        limits: config.limits,
        fileFilter: createUploadFileFilter(config.allowedMimeTypes),
    });
};
