import request from '@/utils/request';
import type {
    TagListRequest,
    TagListResponse,
    CreateTagRequest,
    UpdateTagRequest,
    TagWithStats,
    BatchTagOperationRequest,
    ResponseData,
} from '@blog/shared';

export class TagService {
    /**
     * 获取标签列表
     */
    async getTagList(params: TagListRequest): Promise<ResponseData<TagListResponse>> {
        return request({
            url: '/blog/tags/list',
            method: 'GET',
            params,
        });
    }

    /**
     * 获取标签详情
     */
    async getTagDetail(id: number): Promise<ResponseData<TagWithStats>> {
        return request({
            url: `/blog/tags/detail/${id}`,
            method: 'GET',
        });
    }

    /**
     * 创建标签
     */
    async createTag(data: CreateTagRequest): Promise<ResponseData<TagWithStats>> {
        return request({
            url: '/blog/tags/create',
            method: 'POST',
            data,
        });
    }

    /**
     * 更新标签
     */
    async updateTag(data: UpdateTagRequest): Promise<ResponseData<TagWithStats>> {
        return request({
            url: '/blog/tags/update',
            method: 'POST',
            data,
        });
    }

    /**
     * 删除标签
     */
    async deleteTag(id: number): Promise<ResponseData<null>> {
        return request({
            url: '/blog/tags/delete',
            method: 'POST',
            data: { id },
        });
    }

    /**
     * 批量操作
     */
    async batchOperation(data: BatchTagOperationRequest): Promise<ResponseData<null>> {
        return request({
            url: '/blog/tags/batch',
            method: 'POST',
            data,
        });
    }

    /**
     * 检查标签名称是否可用
     */
    async checkTagName(
        name: string,
        excludeId?: number,
    ): Promise<ResponseData<{ available: boolean }>> {
        return request({
            url: '/blog/tags/check-name',
            method: 'GET',
            params: { name, excludeId },
        });
    }

    /**
     * 获取标签统计信息
     */
    async getTagStats(): Promise<
        ResponseData<{ total: number; withPosts: number; withoutPosts: number }>
    > {
        return request({
            url: '/blog/tags/stats',
            method: 'GET',
        });
    }
}

export const tagService = new TagService();
