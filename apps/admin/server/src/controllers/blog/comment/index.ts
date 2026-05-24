import { request, summary, tags, prefix, body, query } from 'koa-swagger-decorator';
import type { Context } from 'koa';
import { Response } from '../../../utils/response';
import { commentService } from '../../../services/blog/comment';
import { ControllerErrorHandler, RequirePermission } from '../../../utils/decorators';
import { ValidationError } from '../../../types/errors';
import {
    CommentListRequest,
    CommentStatus,
    CreateCommentRequest,
    UpdateCommentRequest,
} from '@blog/shared';

const tag = tags(['评论管理']);
const requireCommentPermission = RequirePermission({ permissions: 'comment' });
const requireCommentEditPermission = RequirePermission({
    permissions: ['comment', 'comment:edit'],
});

@prefix('/blog/comments')
export default class CommentController {
    @request('get', '/list')
    @summary('获取评论列表（分页）')
    @tag
    @query({
        page: { type: 'number', required: false, default: 1 },
        pageSize: { type: 'number', required: false, default: 10 },
        id: { type: 'number', required: false },
        postId: { type: 'string', required: false },
        snippetId: { type: 'string', required: false },
        authorId: { type: 'number', required: false },
        status: { type: 'string', required: false },
    })
    @requireCommentPermission
    @ControllerErrorHandler
    async getCommentPage(ctx: Context) {
        const { page, pageSize, id, postId, snippetId, authorId, status } =
            ctx.query as unknown as CommentListRequest;
        const filter: CommentListRequest = {
            page: Number(page) || 1,
            pageSize: Number(pageSize) || 10,
            id: id ? Number(id) : undefined,
            postId: postId,
            snippetId: snippetId,
            authorId: Number(authorId),
            status: status as CommentStatus,
        };
        const result = await commentService.getCommentsPage(filter);
        ctx.body = Response.success(result, '获取评论列表成功');
    }

    @request('get', '/')
    @summary('获取评论列表')
    @tag
    @query({
        postId: { type: 'string', required: false },
        snippetId: { type: 'string', required: false },
        page: { type: 'number', required: false, default: 1 },
        limit: { type: 'number', required: false, default: 20 },
        status: { type: 'string', required: false },
    })
    @ControllerErrorHandler
    async getComments(ctx: Context) {
        const { postId, snippetId, page = 1, limit = 20, status } = ctx.query;

        if (!postId && !snippetId) {
            throw new ValidationError('必须指定文章ID或片段ID');
        }

        const result = await commentService.getComments({
            postId: postId as string,
            snippetId: snippetId as string,
            page: parseInt(page as string, 10),
            limit: Math.min(parseInt(limit as string, 10), 50), // 限制最大50条
            status: status as CommentStatus,
        });

        ctx.body = Response.success(result, '获取评论列表成功');
    }

    @request('get', '/stats')
    @summary('获取评论统计')
    @tag
    @query({
        postId: { type: 'string', required: false },
        snippetId: { type: 'string', required: false },
    })
    @ControllerErrorHandler
    async getCommentStats(ctx: Context) {
        const { postId, snippetId } = ctx.query;

        if (!postId && !snippetId) {
            throw new ValidationError('必须指定文章ID或片段ID');
        }

        const stats = await commentService.getCommentStats(postId as string, snippetId as string);

        ctx.body = Response.success(stats, '获取评论统计成功');
    }

    @request('post', '/create')
    @summary('创建评论')
    @tag
    @body({
        content: { type: 'string', required: true },
        postId: { type: 'string', required: false },
        snippetId: { type: 'string', required: false },
        parentId: { type: 'number', required: false },
        receiverId: { type: 'number', required: false },
    })
    @ControllerErrorHandler
    async createComment(ctx: Context) {
        const { content, postId, snippetId, parentId, receiverId } = ctx.request
            .body as CreateCommentRequest;
        const authorId = ctx.state.user?.id;
        const sessionId = ctx.state.user?.session;
        if (!authorId) {
            ctx.status = 401;
            ctx.body = Response.unauthorized('请先登录');
            return;
        }

        const comment = await commentService.createComment({
            content,
            postId,
            snippetId,
            parentId,
            receiverId,
            userAgent: ctx.request.headers['user-agent'],
            sessionId,
            authorId,
        });

        const commentStatus = 'status' in comment ? comment.status : undefined;
        const message =
            commentStatus === CommentStatus.REJECTED
                ? '评论内容可能不符合规范，请修改后重新提交'
                : commentStatus === CommentStatus.PUBLISHED
                  ? '评论发表成功'
                  : '评论已提交，等待审核';

        ctx.body = Response.success(comment, message);
    }

    @request('post', '/update')
    @summary('更新评论')
    @tag
    @body({
        id: { type: 'number', required: true },
        content: { type: 'string', required: false },
        status: { type: 'string', required: false },
    })
    @ControllerErrorHandler
    async updateComment(ctx: Context) {
        const { id, content, status } = ctx.request.body as UpdateCommentRequest;
        const authorId = ctx.state.user?.id;

        if (!authorId) {
            ctx.status = 401;
            ctx.body = Response.unauthorized('请先登录');
            return;
        }

        if (status !== undefined) {
            return this.moderateComment(ctx);
        }

        const comment = await commentService.editComment({ id, content, authorId });
        ctx.body = Response.success(comment, '评论更新成功');
    }

    @request('post', '/moderate')
    @summary('审核评论')
    @tag
    @body({
        id: { type: 'number', required: true },
        status: { type: 'string', required: true },
    })
    @requireCommentEditPermission
    @ControllerErrorHandler
    async moderateComment(ctx: Context) {
        const { id, status } = ctx.request.body as UpdateCommentRequest;
        const comment = await commentService.moderateComment({ id, status });
        ctx.body = Response.success(comment, '评论审核成功');
    }

    @request('post', '/delete')
    @summary('删除评论')
    @tag
    @requireCommentEditPermission
    @ControllerErrorHandler
    async deleteComment(ctx: Context) {
        const { id } = ctx.request.body as any;
        await commentService.deleteComment({ id, enforceOwner: false });
        ctx.body = Response.success(null, '评论删除成功');
    }
}

export const commentController = new CommentController();
