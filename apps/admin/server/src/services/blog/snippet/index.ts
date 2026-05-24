import { prisma } from '@blog/db';
import type {
    Snippet,
    SnippetListRequest,
    SnippetListResponse,
    CreateSnippetRequest,
    UpdateSnippetRequest,
} from '@blog/shared';
import { globalService, type UploadedMemoryFile } from '../../global';
import { ServiceErrorHandler } from '../../../utils/decorators';
import { NotFoundError } from '../../../types/errors';

type SnippetFindManyArgs = NonNullable<Parameters<typeof prisma.snippet.findMany>[0]>;
type SnippetWhereInput = NonNullable<SnippetFindManyArgs['where']>;

interface SnippetRecord {
    id: string;
    title?: string | null;
    content: string;
    published: boolean;
    isDraft: boolean;
    allowComments: boolean;
    images?: string | null;
    video?: string | null;
    videoPoster?: string | null;
    authorId: number;
    createdAt: Date;
    updatedAt: Date;
}

function parseUrlList(value: string | null | undefined): string[] {
    if (!value) return [];

    try {
        const parsed = JSON.parse(value);
        if (Array.isArray(parsed)) {
            return parsed.filter((item): item is string => typeof item === 'string');
        }
        return typeof parsed === 'string' ? [parsed] : [];
    } catch {
        return [value];
    }
}

// 完整的片段数据转换函数
function transformSnippetData(snippet: SnippetRecord): Snippet {
    return {
        id: snippet.id,
        title: snippet.title ?? undefined,
        content: snippet.content,
        published: snippet.published,
        isDraft: snippet.isDraft,
        allowComments: snippet.allowComments,
        images: parseUrlList(snippet.images),
        video: parseUrlList(snippet.video),
        videoPoster: snippet.videoPoster || null,
        authorId: snippet.authorId,
        createdAt: snippet.createdAt.toISOString(),
        updatedAt: snippet.updatedAt.toISOString(),
    };
}

/**
 * 文章服务类
 */
export class SnippetService {
    /**
     * 获取片段列表
     */
    @ServiceErrorHandler
    async getSnippetList(params: SnippetListRequest): Promise<SnippetListResponse> {
        const { page, pageSize, id, keyword, authorId, published, isDraft, startTime, endTime } =
            params;

        // 构建查询条件
        const where: SnippetWhereInput = {};

        if (id) {
            where.id = id;
        }

        // 关键词搜索（标题或内容）
        if (keyword) {
            where.OR = [{ title: { contains: keyword } }, { content: { contains: keyword } }];
        }

        // 作者筛选
        if (authorId) {
            where.authorId = authorId;
        }

        // 发布状态筛选
        if (typeof published === 'boolean') {
            where.published = published;
        }

        // 草稿状态筛选
        if (typeof isDraft === 'boolean') {
            where.isDraft = isDraft;
        }

        // 时间范围筛选
        if (startTime || endTime) {
            const createdAt: { gte?: Date; lte?: Date } = {};
            if (startTime) {
                createdAt.gte = new Date(startTime);
            }
            if (endTime) {
                createdAt.lte = new Date(endTime);
            }
            where.createdAt = createdAt;
        }

        // 分页计算
        const skip = (page - 1) * pageSize;
        const take = pageSize;

        // 执行查询
        const [list, total] = await Promise.all([
            prisma.snippet.findMany({
                where,
                skip,
                take,
                include: {
                    author: {
                        select: {
                            id: true,
                            username: true,
                            nickname: true,
                            email: true,
                            avatar: true,
                        },
                    },
                },
                orderBy: {
                    createdAt: 'desc',
                },
            }),
            prisma.snippet.count({ where }),
        ]);

        const transformedList = list.map((item) => transformSnippetData(item));

        return {
            list: transformedList,
            total,
            page,
            pageSize,
        };
    }

    /**
     * 创建片段
     */
    @ServiceErrorHandler
    async createSnippet(
        authorId: number,
        data: CreateSnippetRequest & { id?: string },
    ): Promise<Snippet> {
        const { images, video, videoPoster, id: clientId, ...rest } = data;
        const imageUrls = JSON.stringify(images);
        const videoUrl = JSON.stringify(video);
        const snippet = await prisma.snippet.create({
            data: {
                ...(clientId ? { id: clientId } : {}),
                ...rest,
                images: imageUrls,
                video: videoUrl,
                videoPoster: videoPoster || null,
                authorId,
            },
            include: {
                author: {
                    select: {
                        id: true,
                        username: true,
                        nickname: true,
                        email: true,
                        avatar: true,
                    },
                },
            },
        });

        return transformSnippetData(snippet);
    }

    /**
     * 更新片段
     */
    @ServiceErrorHandler
    async updateSnippet(data: UpdateSnippetRequest): Promise<Snippet> {
        const { id, images, video, videoPoster, ...updateData } = data;
        const imageUrls = JSON.stringify(images);
        const videoUrl = JSON.stringify(video);

        // 检查片段是否存在
        const existingSnippet = await prisma.snippet.findUnique({
            where: { id },
        });

        if (!existingSnippet) {
            throw new NotFoundError('片段不存在');
        }

        // 清理废弃文件：对比新旧 images/video/videoPoster
        const oldImages = parseUrlList(existingSnippet.images);
        const oldVideo = parseUrlList(existingSnippet.video);
        const oldPoster = existingSnippet.videoPoster ? [existingSnippet.videoPoster] : [];
        const newImages = images ?? oldImages;
        const newVideo = video ?? oldVideo;
        const newPoster = videoPoster ? [videoPoster] : [];

        const oldSet = new Set([...oldImages, ...oldVideo, ...oldPoster]);
        const newSet = new Set([...newImages, ...newVideo, ...newPoster]);
        const removedUrls = [...oldSet].filter((url) => !newSet.has(url));

        const snippet = await prisma.snippet.update({
            where: { id },
            data: {
                ...updateData,
                images: imageUrls,
                video: videoUrl,
                videoPoster: videoPoster || null,
            },
            include: {
                author: {
                    select: {
                        id: true,
                        username: true,
                        nickname: true,
                        email: true,
                        avatar: true,
                    },
                },
            },
        });

        if (removedUrls.length > 0) {
            globalService.deleteFiles(removedUrls).catch(() => {});
        }

        return transformSnippetData(snippet);
    }

    /**
     * 删除片段
     */
    @ServiceErrorHandler
    async deleteSnippet(id: string): Promise<void> {
        const existingSnippet = await prisma.snippet.findUnique({
            where: { id },
        });

        if (!existingSnippet) {
            throw new NotFoundError('片段不存在');
        }

        const oldImages = parseUrlList(existingSnippet.images);
        const oldVideo = parseUrlList(existingSnippet.video);
        const urls = [...oldImages, ...oldVideo];
        if (existingSnippet.videoPoster) urls.push(existingSnippet.videoPoster);

        await prisma.snippet.delete({ where: { id } });

        if (urls.length > 0) {
            globalService.deleteFiles(urls).catch(() => {});
        }
    }

    /**
     * 上传图片和视频（按片段+类型组织目录）
     */
    @ServiceErrorHandler
    async upload(
        file: UploadedMemoryFile | undefined,
        type: 'image' | 'video',
        snippetId: string,
    ): Promise<string> {
        return await globalService.uploadAsset(file, {
            entityType: 'snippets',
            entityId: snippetId,
            category: type === 'image' ? 'image' : 'video',
        });
    }
}

// 导出服务实例
export const snippetService = new SnippetService();
