import request from '@/utils/request';
import type {
    CreatePhotoRequest,
    Photo,
    PhotoListRequest,
    PhotoListResponse,
    ResponseData,
    UpdatePhotoRequest,
    PhotoExportResponse,
    PhotoImportRequest,
    PhotoImportResponse,
} from '@blog/shared';

export class PhotoService {
    /**
     * 获取标签列表
     */
    async getPhotoList(params: PhotoListRequest): Promise<ResponseData<PhotoListResponse>> {
        return request({
            url: '/blog/photos/list',
            method: 'GET',
            params,
        });
    }

    /**
     * 创建相册
     */
    async createPhoto(params: CreatePhotoRequest): Promise<ResponseData<Photo>> {
        return request({
            url: '/blog/photos/create',
            method: 'POST',
            data: params,
        });
    }

    /**
     * 更新相册
     */
    async updatePhoto(params: UpdatePhotoRequest): Promise<ResponseData<Photo>> {
        return request({
            url: '/blog/photos/update',
            method: 'POST',
            data: params,
        });
    }

    /**
     * 删除相册
     */
    async deletePhoto(id: number): Promise<ResponseData<null>> {
        return request({
            url: '/blog/photos/delete',
            method: 'POST',
            data: { id },
        });
    }

    /**
     * 上传文件
     */
    async upload(file: File, photoId: string | number): Promise<ResponseData<{ url: string }>> {
        const formData = new FormData();
        formData.append('file', file);
        formData.append('photoId', String(photoId));

        return request<{ url: string }>({
            url: '/blog/photos/upload',
            method: 'POST',
            data: formData,
            headers: {
                'Content-Type': 'multipart/form-data',
            },
        });
    }

    /**
     * 批量导出相册为 JSON 配置
     */
    async exportPhotos(ids: number[]): Promise<ResponseData<PhotoExportResponse>> {
        return request({
            url: '/blog/photos/export',
            method: 'POST',
            data: { ids },
        });
    }

    /**
     * 导出所有相册为 JSON 配置
     */
    async exportAllPhotos(): Promise<ResponseData<PhotoExportResponse>> {
        return request({
            url: '/blog/photos/export-all',
            method: 'GET',
        });
    }

    /**
     * 批量导入相册 JSON 配置
     */
    async importPhotos(data: PhotoImportRequest): Promise<ResponseData<PhotoImportResponse>> {
        return request({
            url: '/blog/photos/import',
            method: 'POST',
            data,
        });
    }
}

export const photoService = new PhotoService();
