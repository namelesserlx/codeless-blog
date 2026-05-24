import request from '@/utils/request';
import { ResponseData } from '@blog/shared';

/**
 * 全局服务
 */
export class GlobalService {
    /**
     * 上传文件
     */
    async upload(file: File, entityId?: string | number): Promise<ResponseData<{ url: string }>> {
        const formData = new FormData();
        formData.append('file', file);
        if (entityId !== undefined) {
            formData.append('entityType', 'articles');
            formData.append('entityId', String(entityId));
        }

        return request<{ url: string }>({
            url: '/global/upload',
            method: 'POST',
            data: formData,
            headers: {
                'Content-Type': 'multipart/form-data',
            },
        });
    }
}

export const globalService = new GlobalService();
