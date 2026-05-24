import { prisma } from '@blog/db';
import {
    TagListRequest,
    TagListResponse,
    CreateTagRequest,
    UpdateTagRequest,
    TagWithStats,
    BatchTagOperationRequest,
} from '@blog/shared';
import { ServiceErrorHandler } from '../../../utils/decorators';
import { ValidationError, NotFoundError } from '../../../types/errors';

export class TagService {
    // 获取标签列表
    @ServiceErrorHandler
    async getTagList(params: TagListRequest): Promise<TagListResponse> {
        const { page = 1, pageSize = 10, name } = params;

        const skip = (page - 1) * pageSize;
        const where: Record<string, unknown> = {};

        // 构建查询条件
        if (name) {
            where.name = { contains: name };
        }

        // 查询标签列表
        const [tagList, total] = await Promise.all([
            prisma.tag.findMany({
                where,
                skip,
                take: pageSize,
                include: {
                    _count: {
                        select: {
                            posts: true,
                        },
                    },
                },
                orderBy: { id: 'desc' },
            }),
            prisma.tag.count({ where }),
        ]);

        // 转换数据格式
        const list: TagWithStats[] = tagList.map((tag) => ({
            id: tag.id,
            name: tag.name,
            _count: tag._count,
        }));

        return {
            list,
            total,
            page,
            pageSize,
        };
    }

    // 获取标签详情
    @ServiceErrorHandler
    async getTagDetail(id: number): Promise<TagWithStats> {
        const tag = await prisma.tag.findUnique({
            where: { id },
            include: {
                _count: {
                    select: {
                        posts: true,
                    },
                },
            },
        });

        if (!tag) {
            throw new NotFoundError('标签不存在');
        }

        return {
            id: tag.id,
            name: tag.name,
            _count: tag._count,
        };
    }

    // 创建标签
    @ServiceErrorHandler
    async createTag(data: CreateTagRequest) {
        const { name } = data;

        if (!name || !name.trim()) {
            throw new ValidationError('标签名称不能为空');
        }

        // 检查标签名称是否已存在
        const existingTag = await prisma.tag.findFirst({
            where: { name: name.trim() },
        });

        if (existingTag) {
            throw new ValidationError('标签名称已存在');
        }

        const tag = await prisma.tag.create({
            data: {
                name: name.trim(),
            },
            include: {
                _count: {
                    select: {
                        posts: true,
                    },
                },
            },
        });

        return {
            id: tag.id,
            name: tag.name,
            _count: tag._count,
        };
    }

    // 更新标签
    @ServiceErrorHandler
    async updateTag(data: UpdateTagRequest) {
        const { id, name } = data;

        if (!id || isNaN(id)) {
            throw new ValidationError('无效的标签ID');
        }

        if (!name || !name.trim()) {
            throw new ValidationError('标签名称不能为空');
        }

        const tag = await prisma.tag.findUnique({
            where: { id },
        });

        if (!tag) {
            throw new NotFoundError('标签不存在');
        }

        // 检查标签名称是否与其他标签冲突
        const existingTag = await prisma.tag.findFirst({
            where: {
                AND: [{ id: { not: id } }, { name: name.trim() }],
            },
        });

        if (existingTag) {
            throw new ValidationError('标签名称已存在');
        }

        const updatedTag = await prisma.tag.update({
            where: { id },
            data: { name: name.trim() },
            include: {
                _count: {
                    select: {
                        posts: true,
                    },
                },
            },
        });

        return {
            id: updatedTag.id,
            name: updatedTag.name,
            _count: updatedTag._count,
        };
    }

    // 删除标签
    @ServiceErrorHandler
    async deleteTag(id: number) {
        if (!id || isNaN(id)) {
            throw new ValidationError('无效的标签ID');
        }

        const tag = await prisma.tag.findUnique({
            where: { id },
            include: {
                _count: {
                    select: {
                        posts: true,
                    },
                },
            },
        });

        if (!tag) {
            throw new NotFoundError('标签不存在');
        }

        // 检查是否有关联的文章
        if (tag._count.posts > 0) {
            throw new ValidationError(
                `标签 "${tag.name}" 关联了 ${tag._count.posts} 篇文章，无法删除`,
            );
        }

        await prisma.tag.delete({
            where: { id },
        });
    }

    // 批量操作
    @ServiceErrorHandler
    async batchOperation(data: BatchTagOperationRequest) {
        const { ids, action } = data;

        if (!ids || ids.length === 0) {
            throw new ValidationError('请选择要操作的标签');
        }

        switch (action) {
            case 'delete': {
                // 检查是否有关联的文章
                const tagsWithPosts = await prisma.tag.findMany({
                    where: { id: { in: ids } },
                    include: {
                        _count: {
                            select: {
                                posts: true,
                            },
                        },
                    },
                });

                const linkedTags = tagsWithPosts.filter((tag) => tag._count.posts > 0);
                if (linkedTags.length > 0) {
                    const tagNames = linkedTags.map((tag) => tag.name).join('、');
                    throw new ValidationError(`标签 "${tagNames}" 关联了文章，无法删除`);
                }

                await prisma.tag.deleteMany({
                    where: { id: { in: ids } },
                });
                break;
            }
        }
    }

    // 检查标签名称是否可用
    @ServiceErrorHandler
    async checkTagName(name: string, excludeId?: number) {
        const where: any = { name: name.trim() };
        if (excludeId) {
            where.id = { not: excludeId };
        }

        const existingTag = await prisma.tag.findFirst({ where });
        return { available: !existingTag };
    }

    // 获取标签统计信息
    @ServiceErrorHandler
    async getTagStats() {
        const [total, withPosts, withoutPosts] = await Promise.all([
            prisma.tag.count(),
            prisma.tag.count({
                where: {
                    posts: {
                        some: {},
                    },
                },
            }),
            prisma.tag.count({
                where: {
                    posts: {
                        none: {},
                    },
                },
            }),
        ]);

        return { total, withPosts, withoutPosts };
    }
}

export const tagService = new TagService();
