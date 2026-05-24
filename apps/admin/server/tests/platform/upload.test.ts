import type { FileFilterCallback } from '@koa/multer';
import { describe, expect, it } from 'vitest';

import {
    createUploadFileFilter,
    imageUploadConfig,
    mixedMediaUploadConfig,
} from '../../src/config/upload';

const runFileFilter = async (allowedMimeTypes: string[], mimetype: string) => {
    const fileFilter = createUploadFileFilter(allowedMimeTypes);

    return await new Promise<{ accept: boolean; error: Error | null }>((resolve) => {
        fileFilter(
            {} as never,
            {
                fieldname: 'file',
                originalname: 'asset.bin',
                encoding: '7bit',
                mimetype,
                size: 1,
                destination: '',
                filename: '',
                path: '',
                stream: undefined as never,
                buffer: Buffer.from('test'),
            },
            ((error: Error | null, accept: boolean) =>
                resolve({ error, accept })) as FileFilterCallback,
        );
    });
};

describe('upload config', () => {
    it('accepts allowed image mime types', async () => {
        const result = await runFileFilter(imageUploadConfig.allowedMimeTypes, 'image/png');

        expect(result.error).toBeNull();
        expect(result.accept).toBe(true);
    });

    it('rejects unsupported mime types', async () => {
        const result = await runFileFilter(imageUploadConfig.allowedMimeTypes, 'application/pdf');

        expect(result.accept).toBe(false);
        expect(result.error?.message).toMatch(/文件类型/);
        expect(result.error).toMatchObject({
            code: 'INVALID_FILE_TYPE',
            statusCode: 400,
        });
    });

    it('uses stricter size limits for generic media uploads', () => {
        expect(imageUploadConfig.limits.fileSize).toBeLessThanOrEqual(5 * 1024 * 1024);
        expect(mixedMediaUploadConfig.limits.fileSize).toBeLessThanOrEqual(20 * 1024 * 1024);
    });
});
