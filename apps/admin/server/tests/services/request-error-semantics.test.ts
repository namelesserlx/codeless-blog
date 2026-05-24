import { beforeEach, describe, expect, it, vi } from 'vitest';

vi.mock('../../src/config/cos', () => ({
    validateCosConfig: vi.fn(),
}));

vi.mock('../../src/utils/cos', () => ({
    CosUtil: {
        uploadFile: vi.fn(),
        deleteFile: vi.fn(),
        getCacheControl: vi.fn(() => 'public, max-age=31536000'),
        getContentType: vi.fn(() => 'image/png'),
    },
}));

vi.mock('@blog/db', () => ({
    prisma: {
        post: {
            findUnique: vi.fn(),
            findMany: vi.fn(),
            count: vi.fn(),
        },
        user: {
            findMany: vi.fn(),
        },
    },
}));

vi.mock('../../src/utils/deepseek', () => ({
    default: {
        generateSummary: vi.fn(),
    },
}));

vi.mock('../../src/services/search/article', () => ({
    articleSearchService: {
        indexArticle: vi.fn(),
        deleteArticle: vi.fn(),
        deleteArticles: vi.fn(),
        indexArticles: vi.fn(),
        reindexAll: vi.fn(),
        search: vi.fn(),
    },
}));

vi.mock('../../src/services/blog/article/preview', () => ({
    createArticlePreviewSession: vi.fn(),
    getArticlePreviewSession: vi.fn(),
}));

import { validateCosConfig } from '../../src/config/cos';
import { articleService } from '../../src/services/blog/article';
import { globalService } from '../../src/services/global';

describe('request error semantics', () => {
    beforeEach(() => {
        vi.clearAllMocks();
    });

    it('maps missing upload file to a validation error', async () => {
        await expect(globalService.upload(undefined)).rejects.toMatchObject({
            name: 'ValidationError',
            code: 'VALIDATION_ERROR',
            statusCode: 400,
            message: '请上传附件文件',
        });
    });

    it('maps incomplete object storage config to an upload failure', async () => {
        vi.mocked(validateCosConfig).mockReturnValue(false);

        await expect(
            globalService.upload({
                buffer: Buffer.from('x'),
                originalname: 'demo.png',
                mimetype: 'image/png',
            }),
        ).rejects.toMatchObject({
            name: 'FileError',
            code: 'UPLOAD_FAILED',
            statusCode: 500,
            message: '对象存储配置不完整，无法上传文件',
        });
    });

    it('maps empty summary input to a validation error', async () => {
        await expect(
            articleService.generateSummary({
                content: '   ',
                model: 'deepseek-v4-flash',
            }),
        ).rejects.toMatchObject({
            name: 'ValidationError',
            code: 'VALIDATION_ERROR',
            statusCode: 400,
            message: '文章内容不能为空',
        });
    });
});
