import request from '@/utils/request';
import {
    CommentListRequest,
    CommentListResponse,
    ResponseData,
    UpdateCommentRequest,
} from '@blog/shared';

export class CommentService {
    /**
     * 获取评论列表(分页)
     */
    async getCommentList(params: CommentListRequest): Promise<ResponseData<CommentListResponse>> {
        return request({
            url: '/blog/comments/list',
            method: 'GET',
            params,
        });
    }

    /**
     * 修改评论状态
     */
    async updateComment(data: UpdateCommentRequest): Promise<ResponseData<null>> {
        return request({
            url: '/blog/comments/update',
            method: 'POST',
            data,
        });
    }

    /**
     * 删除评论
     */
    async deleteComment(id: number): Promise<ResponseData<null>> {
        return request({
            url: `/blog/comments/delete`,
            method: 'POST',
            data: {
                id,
            },
        });
    }
}

export const commentService = new CommentService();
