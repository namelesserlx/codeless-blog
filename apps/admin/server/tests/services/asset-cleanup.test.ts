import { beforeEach, describe, expect, it, vi } from 'vitest';

vi.mock('@blog/db', () => ({
    prisma: {
        post: {
            findUnique: vi.fn(),
            update: vi.fn(),
        },
        photo: {
            findUnique: vi.fn(),
            update: vi.fn(),
            delete: vi.fn(),
        },
        user: {
            findUnique: vi.fn(),
            update: vi.fn(),
        },
    },
}));

vi.mock('../../src/services/global', () => ({
    globalService: {
        deleteFiles: vi.fn(() => Promise.resolve()),
    },
}));

vi.mock('../../src/services/search/article', () => ({
    articleSearchService: {
        indexArticle: vi.fn(),
        deleteArticle: vi.fn(),
    },
}));

vi.mock('../../src/services/blog/article/preview', () => ({
    createArticlePreviewSession: vi.fn(),
    getArticlePreviewSession: vi.fn(),
}));

vi.mock('../../src/utils/deepseek', () => ({
    default: {
        generateSummary: vi.fn(),
    },
}));

vi.mock('../../src/lib/redis', () => ({
    default: {
        get: vi.fn(),
        set: vi.fn(),
        del: vi.fn(),
        exists: vi.fn(),
        expire: vi.fn(),
        on: vi.fn(),
    },
    redis: {
        get: vi.fn(),
        set: vi.fn(),
        del: vi.fn(),
        exists: vi.fn(),
        expire: vi.fn(),
        on: vi.fn(),
    },
}));

const storageMock = vi.hoisted(() => ({
    upload: vi.fn(),
    delete: vi.fn(),
}));

vi.mock('../../src/lib/storage', () => ({
    getStorage: () => storageMock,
}));

vi.mock('../../src/services/email/notification', () => ({
    emailNotificationService: {
        sendWelcomeEmail: vi.fn(),
    },
}));

import { prisma } from '@blog/db';
import { globalService } from '../../src/services/global';
import { articleService } from '../../src/services/blog/article';
import { photoService } from '../../src/services/blog/photo';
import { userService } from '../../src/services/system/user';

describe('asset cleanup', () => {
    beforeEach(() => {
        vi.clearAllMocks();
    });

    it('does not delete article assets when the article update fails', async () => {
        vi.mocked(prisma.post.findUnique).mockResolvedValue({
            id: 'post-1',
            content: '<p><img src="https://cdn.example.com/articles/post-1/images/old.png"></p>',
            cardImageUrl: 'https://cdn.example.com/articles/post-1/images/card.png',
        } as never);
        vi.mocked(prisma.post.update).mockRejectedValue(new Error('tag missing'));

        await expect(
            articleService.updateArticle({
                id: 'post-1',
                content: '<p>updated</p>',
                cardImageUrl: 'https://cdn.example.com/articles/post-1/images/new-card.png',
                tagIds: [999],
            }),
        ).rejects.toThrow('tag missing');

        expect(globalService.deleteFiles).not.toHaveBeenCalled();
    });

    it('updates photos whose legacy src is stored as a plain URL', async () => {
        vi.mocked(prisma.photo.findUnique).mockResolvedValue({
            id: 1,
            src: 'https://cdn.example.com/photos/legacy.jpg',
        } as never);
        vi.mocked(prisma.photo.update).mockResolvedValue({
            id: 1,
            title: 'Updated',
            alt: 'Updated',
            description: 'Description',
            location: 'Shanghai',
            category: 'LIFE',
            src: JSON.stringify(['https://cdn.example.com/photos/new.jpg']),
            date: new Date('2026-01-01T00:00:00.000Z'),
            tags: JSON.stringify(['life']),
            createdAt: new Date('2026-01-01T00:00:00.000Z'),
            updatedAt: new Date('2026-01-02T00:00:00.000Z'),
        } as never);

        await expect(
            photoService.updatePhoto({
                id: 1,
                title: 'Updated',
                description: 'Description',
                location: 'Shanghai',
                category: 'LIFE',
                src: ['https://cdn.example.com/photos/new.jpg'],
                date: '2026-01-01T00:00:00.000Z' as never,
                tags: ['life'],
            }),
        ).resolves.toMatchObject({
            id: 1,
            src: ['https://cdn.example.com/photos/new.jpg'],
        });

        expect(globalService.deleteFiles).toHaveBeenCalledWith([
            'https://cdn.example.com/photos/legacy.jpg',
        ]);
    });

    it('deletes photos whose legacy src is stored as a plain URL', async () => {
        vi.mocked(prisma.photo.findUnique).mockResolvedValue({
            id: 1,
            src: 'https://cdn.example.com/photos/legacy.jpg',
        } as never);
        vi.mocked(prisma.photo.delete).mockResolvedValue({ id: 1 } as never);

        await expect(photoService.deletePhoto(1)).resolves.toBeUndefined();

        expect(globalService.deleteFiles).toHaveBeenCalledWith([
            'https://cdn.example.com/photos/legacy.jpg',
        ]);
        expect(prisma.photo.delete).toHaveBeenCalledWith({ where: { id: 1 } });
    });

    it('keeps the old avatar when replacement upload fails', async () => {
        vi.mocked(prisma.user.findUnique).mockResolvedValue({
            avatar: 'https://cdn.example.com/avatars/1/images/old.png',
        } as never);
        storageMock.upload.mockRejectedValue(new Error('upload failed'));

        await expect(
            userService.updateAvatar({
                userId: 1,
                file: {
                    fieldname: 'avatar',
                    buffer: Buffer.from('avatar'),
                    originalname: 'avatar.png',
                    mimetype: 'image/png',
                    size: 6,
                },
            }),
        ).rejects.toThrow('upload failed');

        expect(storageMock.delete).not.toHaveBeenCalled();
        expect(prisma.user.update).not.toHaveBeenCalled();
    });

    it('does not delete the old avatar after replacement succeeds', async () => {
        vi.mocked(prisma.user.findUnique).mockResolvedValue({
            avatar: 'https://cdn.example.com/avatars/1/images/old.png',
        } as never);
        storageMock.upload.mockResolvedValue('https://cdn.example.com/avatars/1/images/new.png');
        vi.mocked(prisma.user.update).mockResolvedValue({ id: 1 } as never);

        await expect(
            userService.updateAvatar({
                userId: 1,
                file: {
                    fieldname: 'avatar',
                    buffer: Buffer.from('avatar'),
                    originalname: 'avatar.png',
                    mimetype: 'image/png',
                    size: 6,
                },
            }),
        ).resolves.toEqual({
            avatar: 'https://cdn.example.com/avatars/1/images/new.png',
        });

        expect(storageMock.delete).not.toHaveBeenCalled();
    });
});
