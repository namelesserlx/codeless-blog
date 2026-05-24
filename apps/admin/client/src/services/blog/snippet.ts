import {
    CreateSnippetRequest,
    ResponseData,
    Snippet,
    SnippetListRequest,
    SnippetListResponse,
    UpdateSnippetRequest,
} from '@blog/shared';
import request from '@/utils/request';

export class SnippetService {
    /**
     * 获取片段列表
     */
    async getSnippetList(params: SnippetListRequest): Promise<ResponseData<SnippetListResponse>> {
        return request({
            url: '/blog/snippets/list',
            method: 'GET',
            params,
        });
    }

    /**
     * 创建片段
     */
    async createSnippet(data: CreateSnippetRequest): Promise<ResponseData<Snippet>> {
        return request({
            url: '/blog/snippets/create',
            method: 'POST',
            data,
        });
    }

    /**
     * 更新片段
     */
    async updateSnippet(data: UpdateSnippetRequest): Promise<ResponseData<Snippet>> {
        return request({
            url: '/blog/snippets/update',
            method: 'POST',
            data,
        });
    }

    /**
     * 删除片段
     */
    async deleteSnippet(id: string): Promise<ResponseData<null>> {
        return request({
            url: `/blog/snippets/delete`,
            method: 'POST',
            data: {
                id,
            },
        });
    }

    /**
     * 上传文件
     */
    async upload(
        type: 'image' | 'video',
        file: File,
        snippetId: string,
    ): Promise<ResponseData<{ url: string }>> {
        const formData = new FormData();
        formData.append('type', type);
        formData.append('file', file);
        formData.append('snippetId', snippetId);

        return request<{ url: string }>({
            url: '/blog/snippets/upload',
            method: 'POST',
            data: formData,
            headers: {
                'Content-Type': 'multipart/form-data',
            },
        });
    }
}

export const snippetService = new SnippetService();
