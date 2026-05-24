import { prisma, type CommentStatus } from '@blog/db';
import {
    CommentListRequest,
    CommentStatus as SharedCommentStatus,
    CreateCommentRequest,
    SUPER_ADMIN_ROLE_CODE,
    UpdateCommentRequest,
} from '@blog/shared';
import { queryKeyValue } from '../../../utils/auth';
import { ServiceErrorHandler, TraceSpan } from '../../../utils/decorators';
import { runWithSpan } from '../../../telemetry/tracing';
import { emailNotificationService } from '../../email/notification';
import { logger } from '../../../utils/logger';
import { NotFoundError, PermissionError, ValidationError } from '../../../types/errors';
import { env } from '../../../config/env';
import { commentModerationService } from './moderation';

export interface GetCommentsParams {
    postId?: string;
    snippetId?: string;
    status?: CommentStatus;
    page?: number;
    limit?: number;
}

interface ModeratableComment {
    id: number;
    content: string;
    status: CommentStatus;
    author: {
        username: string;
        nickname: string | null;
    };
    post?: {
        id: string;
        title: string;
    } | null;
    snippet?: {
        id: string;
        title: string;
    } | null;
}

function getCommentAuthorName(comment: ModeratableComment) {
    return comment.author.nickname || comment.author.username;
}

function getCommentTarget(comment: ModeratableComment) {
    if (comment.post) {
        return {
            type: 'article' as const,
            title: comment.post.title,
        };
    }

    return {
        type: 'snippet' as const,
        title: comment.snippet?.title || '未知内容',
    };
}

function getAdminCommentReviewUrl(commentId: number) {
    const adminBaseUrl = env.urls.admin;

    return `${adminBaseUrl.replace(/\/$/, '')}/blog/comment?id=${commentId}&status=PENDING`;
}

function getSuperAdminRecipientName(users: { username: string; nickname: string | null }[]) {
    if (users.length === 1) {
        return users[0].nickname || users[0].username;
    }

    return '超级管理员';
}

export class CommentService {
    private validateCommentContent(content: string | undefined) {
        if (content === undefined) {
            throw new ValidationError('评论内容不能为空');
        }

        if (typeof content !== 'string') {
            throw new ValidationError('评论内容必须是字符串');
        }

        const trimmedContent = content.trim();
        if (trimmedContent.length === 0) {
            throw new ValidationError('评论内容不能为空');
        }

        if (trimmedContent.length > 1000) {
            throw new ValidationError('评论内容不能超过1000字符');
        }

        return trimmedContent;
    }

    private async getSuperAdminReviewRecipient() {
        const users = await prisma.user.findMany({
            where: {
                status: 'ACTIVE',
                userRoles: {
                    some: {
                        role: {
                            code: SUPER_ADMIN_ROLE_CODE,
                            status: 'ACTIVE',
                        },
                    },
                },
            },
            select: {
                email: true,
                username: true,
                nickname: true,
            },
            orderBy: {
                id: 'asc',
            },
        });

        const emails = users.map((user) => user.email.trim()).filter(Boolean);

        if (emails.length === 0) {
            return null;
        }

        return {
            email: emails.join(','),
            name: getSuperAdminRecipientName(users),
        };
    }

    private async applyAutoModeration(comment: ModeratableComment) {
        const target = getCommentTarget(comment);
        const authorName = getCommentAuthorName(comment);
        const moderationResult = await commentModerationService.reviewComment({
            content: comment.content,
            targetType: target.type,
            targetTitle: target.title,
            authorName,
        });

        if (moderationResult.decision === 'approve') {
            logger.info('评论自动审核通过', {
                commentId: comment.id,
                confidence: moderationResult.confidence,
                reason: moderationResult.reason,
            });

            return this.moderateComment({
                id: comment.id,
                status: SharedCommentStatus.PUBLISHED,
            });
        }

        if (moderationResult.decision === 'reject') {
            logger.info('评论自动审核拒绝', {
                commentId: comment.id,
                confidence: moderationResult.confidence,
                reason: moderationResult.reason,
            });

            return prisma.comment.update({
                where: { id: comment.id },
                data: { status: 'REJECTED' },
                include: {
                    author: {
                        select: {
                            id: true,
                            username: true,
                            nickname: true,
                            avatar: true,
                            address: true,
                        },
                    },
                    receiver: {
                        select: {
                            id: true,
                            username: true,
                            nickname: true,
                        },
                    },
                    post: {
                        select: {
                            id: true,
                            title: true,
                        },
                    },
                    snippet: {
                        select: {
                            id: true,
                            title: true,
                        },
                    },
                },
            });
        }

        const reviewRecipient = await this.getSuperAdminReviewRecipient();
        if (!reviewRecipient) {
            logger.warn('未找到可接收评论审核提醒的超级管理员邮箱', {
                commentId: comment.id,
                moderationReason: moderationResult.reason,
            });
            return comment;
        }

        await emailNotificationService.sendCommentReviewRequiredNotification({
            recipientEmail: reviewRecipient.email,
            recipientName: reviewRecipient.name,
            commentId: comment.id,
            authorName,
            commentContent: comment.content,
            targetTitle: target.title,
            targetType: target.type,
            reviewUrl: getAdminCommentReviewUrl(comment.id),
            moderationReason: moderationResult.reason,
            moderationNote: moderationResult.note,
        });

        return comment;
    }

    /**
     * 创建评论
     * @param params 评论参数 + session信息
     * @returns Comment with author and receiver info
     */
    @TraceSpan(
        'comment.create',
        (params: CreateCommentRequest & { sessionId: string; authorId: number }) => ({
            'comment.author.id': params.authorId,
            'comment.has_parent': Boolean(params.parentId),
            'comment.target.type': params.postId
                ? 'post'
                : params.snippetId
                  ? 'snippet'
                  : 'unknown',
        }),
    )
    @ServiceErrorHandler
    async createComment(params: CreateCommentRequest & { sessionId: string; authorId: number }) {
        const { content, postId, snippetId, parentId, receiverId, userAgent, sessionId, authorId } =
            params;

        // 参数校验
        if (!content || typeof content !== 'string') {
            throw new ValidationError('评论内容不能为空');
        }

        const trimmedContent = content.trim();
        if (trimmedContent.length === 0) {
            throw new ValidationError('评论内容不能为空');
        }

        if (trimmedContent.length > 1000) {
            throw new ValidationError('评论内容不能超过1000字符');
        }

        if (!authorId || typeof authorId !== 'number') {
            throw new ValidationError('用户ID无效');
        }

        if (!sessionId || typeof sessionId !== 'string') {
            throw new ValidationError('会话ID无效');
        }

        // 验证是否有关联内容
        if (!postId && !snippetId) {
            throw new ValidationError('评论必须关联文章或片段');
        }

        // 从Redis session中获取用户信息（IP地址、位置等）
        interface SessionData {
            ip?: string;
            ipAddress?: string;
            address?: string;
            location?: string;
            device?: string;
            deviceType?: string;
            [key: string]: unknown;
        }

        let sessionData: SessionData = {};
        try {
            sessionData = await runWithSpan(
                'comment.session.load',
                () => queryKeyValue(sessionId),
                {
                    'comment.session.present': Boolean(sessionId),
                },
            );
        } catch (error) {
            logger.warn('获取session信息失败', {
                error: error instanceof Error ? error.message : String(error),
            });
        }

        // 如果是回复评论，验证父评论是否存在
        if (parentId) {
            const parentComment = await runWithSpan(
                'comment.parent.validate',
                () =>
                    prisma.comment.findUnique({
                        where: { id: parentId },
                        include: { parentComment: true },
                    }),
                {
                    'comment.parent.id': parentId,
                },
            );

            if (!parentComment) {
                throw new NotFoundError('父评论不存在');
            }

            // 只允许两层评论：如果父评论已经有父评论，则不允许继续回复
            if (parentComment.parentId) {
                throw new ValidationError('只支持两层评论，不能再次回复');
            }
        }

        // 验证文章或片段是否存在且允许评论
        if (postId) {
            const post = await runWithSpan(
                'comment.target.validate',
                () =>
                    prisma.post.findUnique({
                        where: { id: postId },
                        select: { allowComments: true, published: true },
                    }),
                {
                    'comment.target.type': 'post',
                    'comment.target.present': Boolean(postId),
                },
            );

            if (!post) {
                throw new NotFoundError('文章不存在');
            }

            if (!post.published) {
                throw new ValidationError('文章未发布，不能评论');
            }

            if (!post.allowComments) {
                throw new ValidationError('该文章不允许评论');
            }
        }

        if (snippetId) {
            const snippet = await runWithSpan(
                'comment.target.validate',
                () =>
                    prisma.snippet.findUnique({
                        where: { id: snippetId },
                        select: { allowComments: true, published: true },
                    }),
                {
                    'comment.target.type': 'snippet',
                    'comment.target.present': Boolean(snippetId),
                },
            );

            if (!snippet) {
                throw new NotFoundError('片段不存在');
            }

            if (!snippet.published) {
                throw new ValidationError('片段未发布，不能评论');
            }

            if (!snippet.allowComments) {
                throw new ValidationError('该片段不允许评论');
            }
        }

        // 从session中提取用户环境信息
        const ipAddress = sessionData.ip || sessionData.ipAddress;
        const location = sessionData.address || sessionData.location;
        const device = sessionData.device || sessionData.deviceType;

        // 创建评论数据，使用类型安全的方式构建
        interface CommentCreateData {
            content: string;
            authorId: number;
            postId?: string;
            snippetId?: string;
            parentId?: number;
            receiverId?: number;
            userAgent?: string;
            status: 'PUBLISHED' | 'PENDING' | 'REJECTED' | 'DELETED';
            ipAddress?: string;
            location?: string;
            device?: string;
        }

        const commentData: CommentCreateData = {
            content: trimmedContent,
            authorId,
            status: 'PENDING', // 默认待审核状态
        };

        // 只添加非空的可选字段
        if (postId) commentData.postId = postId;
        if (snippetId) commentData.snippetId = snippetId;
        if (parentId) commentData.parentId = parentId;
        if (receiverId) commentData.receiverId = receiverId;
        if (userAgent) commentData.userAgent = userAgent;
        if (ipAddress) commentData.ipAddress = ipAddress;
        if (location) commentData.location = location;
        if (device) commentData.device = device;

        // 创建评论
        const comment = await runWithSpan(
            'comment.db.create',
            () =>
                prisma.comment.create({
                    data: commentData,
                    include: {
                        author: {
                            select: {
                                id: true,
                                username: true,
                                nickname: true,
                                avatar: true,
                                address: true,
                            },
                        },
                        receiver: {
                            select: {
                                id: true,
                                username: true,
                                nickname: true,
                            },
                        },
                        post: {
                            select: {
                                id: true,
                                title: true,
                            },
                        },
                        snippet: {
                            select: {
                                id: true,
                                title: true,
                            },
                        },
                    },
                }),
            {
                'comment.author.id': authorId,
                'comment.has_parent': Boolean(parentId),
                'comment.target.type': postId ? 'post' : snippetId ? 'snippet' : 'unknown',
            },
        );

        return this.applyAutoModeration(comment);
    }

    /**
     * 获取评论列表（分页）
     */
    @ServiceErrorHandler
    async getCommentsPage(params: CommentListRequest) {
        const { page, pageSize, id, postId, snippetId, authorId, status } = params;
        const where: any = {};
        if (id !== undefined && id !== null && `${id}` !== '') {
            where.id = Number(id);
        }
        if (postId) {
            where.postId = postId;
        }
        if (authorId) {
            where.authorId = authorId;
        }
        if (snippetId) {
            where.snippetId = snippetId;
        }
        if (status) {
            where.status = status;
        }
        const [list, total] = await Promise.all([
            prisma.comment.findMany({
                where,
                include: {
                    post: { select: { title: true, id: true } },
                    snippet: { select: { title: true, id: true } },
                    author: { select: { username: true, nickname: true, id: true } },
                    receiver: { select: { username: true, nickname: true, id: true } },
                },
                skip: (page - 1) * pageSize,
                take: pageSize,
            }),
            prisma.comment.count({ where }),
        ]);
        return { list, total, page, pageSize };
    }

    /**
     * 获取评论列表
     */
    @ServiceErrorHandler
    async getComments(params: GetCommentsParams) {
        const { postId, snippetId, status = 'PUBLISHED', page = 1, limit = 20 } = params;

        const where: any = {
            status,
            parentId: null, // 只获取顶级评论
        };

        if (postId) {
            where.postId = postId;
        }

        if (snippetId) {
            where.snippetId = snippetId;
        }

        const [comments, total] = await Promise.all([
            prisma.comment.findMany({
                where,
                include: {
                    author: {
                        select: {
                            id: true,
                            username: true,
                            nickname: true,
                            avatar: true,
                            address: true,
                        },
                    },
                    receiver: {
                        select: {
                            id: true,
                            username: true,
                            nickname: true,
                        },
                    },
                    replies: {
                        where: { status },
                        include: {
                            author: {
                                select: {
                                    id: true,
                                    username: true,
                                    nickname: true,
                                    avatar: true,
                                    address: true,
                                },
                            },
                            receiver: {
                                select: {
                                    id: true,
                                    username: true,
                                    nickname: true,
                                },
                            },
                        },
                        orderBy: { createdAt: 'asc' },
                    },
                },
                orderBy: { createdAt: 'desc' },
                skip: (page - 1) * limit,
                take: limit,
            }),
            prisma.comment.count({ where }),
        ]);

        return {
            comments,
            pagination: {
                page,
                limit,
                total,
                totalPages: Math.ceil(total / limit),
            },
        };
    }

    /**
     * 编辑评论内容
     */
    @ServiceErrorHandler
    async editComment(params: { id: number | number[]; content?: string; authorId: number }) {
        const { id, content, authorId } = params;

        if (!id || (typeof id !== 'number' && !Array.isArray(id))) {
            throw new ValidationError('评论ID无效');
        }

        if (Array.isArray(id)) {
            throw new ValidationError('不支持批量编辑评论内容');
        }

        if (!authorId || typeof authorId !== 'number') {
            throw new ValidationError('用户ID无效');
        }

        const trimmedContent = this.validateCommentContent(content);
        const originalComment = await prisma.comment.findUnique({
            where: { id },
            select: {
                id: true,
                authorId: true,
            },
        });

        if (!originalComment) {
            throw new NotFoundError('评论不存在');
        }

        if (originalComment.authorId !== authorId) {
            throw new PermissionError('无权修改他人评论');
        }

        return prisma.comment.update({
            where: { id },
            data: {
                content: trimmedContent,
                isEdited: true,
                editedAt: new Date(),
            },
            include: {
                author: {
                    select: {
                        id: true,
                        username: true,
                        nickname: true,
                        avatar: true,
                        email: true,
                    },
                },
                receiver: {
                    select: {
                        id: true,
                        username: true,
                        nickname: true,
                        email: true,
                    },
                },
                post: {
                    select: {
                        id: true,
                        title: true,
                    },
                },
                snippet: {
                    select: {
                        id: true,
                        title: true,
                    },
                },
            },
        });
    }

    /**
     * 审核评论
     */
    @TraceSpan('comment.moderate', (params: Pick<UpdateCommentRequest, 'id' | 'status'>) => ({
        'comment.batch': Array.isArray(params.id),
        'comment.status': params.status || 'unknown',
    }))
    @ServiceErrorHandler
    async moderateComment(params: Pick<UpdateCommentRequest, 'id' | 'status'>) {
        const { id, status } = params;

        if (!id || (typeof id !== 'number' && !Array.isArray(id))) {
            throw new ValidationError('评论ID无效');
        }

        if (status === undefined) {
            throw new ValidationError('评论状态无效');
        }

        const validStatuses = ['PUBLISHED', 'PENDING', 'REJECTED', 'DELETED'];
        if (!validStatuses.includes(status)) {
            throw new ValidationError('评论状态无效');
        }

        const updateData = {
            status,
        };

        if (Array.isArray(id)) {
            return runWithSpan(
                'comment.moderate.db.update',
                () =>
                    prisma.comment.updateMany({
                        where: { id: { in: id } },
                        data: updateData,
                    }),
                {
                    'comment.batch': true,
                    'comment.batch.count': id.length,
                    'comment.status': status,
                },
            );
        }

        const originalComment = await runWithSpan(
            'comment.moderate.db.load',
            () =>
                prisma.comment.findUnique({
                    where: { id },
                    include: {
                        author: {
                            select: {
                                id: true,
                                username: true,
                                nickname: true,
                                avatar: true,
                                email: true,
                            },
                        },
                        post: {
                            select: {
                                id: true,
                                title: true,
                            },
                        },
                        snippet: {
                            select: {
                                id: true,
                                title: true,
                            },
                        },
                    },
                }),
            {
                'comment.id': id,
            },
        );

        if (!originalComment) {
            throw new NotFoundError('评论不存在');
        }

        let parentComment: {
            content: string;
            author: {
                email: string;
                nickname: string | null;
                username: string;
            };
        } | null = null;
        if (originalComment.parentId) {
            parentComment = await runWithSpan(
                'comment.moderate.db.load',
                () =>
                    prisma.comment.findUnique({
                        where: { id: originalComment.parentId },
                        include: {
                            author: {
                                select: {
                                    email: true,
                                    nickname: true,
                                    username: true,
                                },
                            },
                        },
                    }),
                {
                    'comment.parent.id': originalComment.parentId,
                },
            );
        }

        const updatedComment = await runWithSpan(
            'comment.moderate.db.update',
            () =>
                prisma.comment.update({
                    where: { id },
                    data: updateData,
                    include: {
                        author: {
                            select: {
                                id: true,
                                username: true,
                                nickname: true,
                                avatar: true,
                                email: true,
                            },
                        },
                        receiver: {
                            select: {
                                id: true,
                                username: true,
                                nickname: true,
                                email: true,
                            },
                        },
                        post: {
                            select: {
                                id: true,
                                title: true,
                            },
                        },
                        snippet: {
                            select: {
                                id: true,
                                title: true,
                            },
                        },
                    },
                }),
            {
                'comment.id': id,
                'comment.status': status,
            },
        );

        if (status === 'PUBLISHED' && originalComment.status !== 'PUBLISHED') {
            try {
                await runWithSpan(
                    'comment.email.notify',
                    async () => {
                        const articleTitle =
                            updatedComment.post?.title ||
                            updatedComment.snippet?.title ||
                            '未知内容';
                        const articleId =
                            updatedComment.post?.id || updatedComment.snippet?.id || '';

                        if (originalComment.parentId && parentComment?.author?.email) {
                            await emailNotificationService.sendCommentReplyNotification({
                                recipientEmail: parentComment.author.email,
                                recipientName:
                                    parentComment.author.nickname || parentComment.author.username,
                                originalCommentContent: parentComment.content,
                                replyContent: updatedComment.content,
                                replierName:
                                    updatedComment.author.nickname ||
                                    updatedComment.author.username,
                                articleTitle,
                                articleId,
                                commentId: updatedComment.id,
                            });
                        }

                        await emailNotificationService.sendCommentApprovedNotification({
                            userEmail: updatedComment.author.email,
                            userName:
                                updatedComment.author.nickname || updatedComment.author.username,
                            commentContent: updatedComment.content,
                            articleTitle,
                            articleId,
                            commentId: updatedComment.id,
                        });
                    },
                    {
                        'comment.id': updatedComment.id,
                        'comment.email.reply': Boolean(originalComment.parentId),
                    },
                );
            } catch (emailError) {
                logger.error('发送评论审核通过邮件失败:', emailError);
            }
        }

        return updatedComment;
    }

    /**
     * 删除评论
     */
    @ServiceErrorHandler
    async deleteComment(params: { id: number; authorId?: number; enforceOwner?: boolean }) {
        const { id, authorId, enforceOwner = true } = params;
        // 检查评论是否存在且属于当前用户
        const existingComment = await prisma.comment.findUnique({
            where: { id },
            include: {
                replies: { select: { id: true } },
            },
        });

        if (!existingComment) {
            throw new NotFoundError('评论不存在');
        }

        if (enforceOwner) {
            if (!authorId || typeof authorId !== 'number') {
                throw new ValidationError('用户ID无效');
            }

            if (existingComment.authorId !== authorId) {
                throw new PermissionError('只能删除自己的评论');
            }
        }

        // 如果有回复，软删除（更新状态为DELETED）
        if (existingComment.replies.length > 0) {
            // 软删除所有评论和回复他的评论
            await prisma.comment.updateMany({
                where: { parentId: id },
                data: { status: 'DELETED' },
            });
            await prisma.comment.update({
                where: { id },
                data: { status: 'DELETED' },
            });
        } else {
            // 如果没有回复，直接删除
            return await prisma.comment.delete({
                where: { id },
            });
        }
    }

    /**
     * 获取评论统计
     *
     */
    @ServiceErrorHandler
    async getCommentStats(postId?: string, snippetId?: string) {
        const where: any = {
            status: 'PUBLISHED',
        };

        if (postId) {
            where.postId = postId;
        }

        if (snippetId) {
            where.snippetId = snippetId;
        }

        const total = await prisma.comment.count({ where });

        return { total };
    }
}

export const commentService = new CommentService();
