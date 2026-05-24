import { SwaggerRouter, request, summary, tags, prefix, body, query } from 'koa-swagger-decorator';
import type { Context } from 'koa';
import { Response } from '../../../utils/response';
import { photoService } from '../../../services/blog/photo';
import { CreatePhotoRequest, PhotoListRequest, UpdatePhotoRequest } from '@blog/shared';
import { ControllerErrorHandler, RequirePermission } from '../../../utils/decorators';

const tag = tags(['相册管理']);
const requirePhotoPermission = RequirePermission({ permissions: 'photo' });
const requirePhotoEditPermission = RequirePermission({ permissions: ['photo', 'photo:edit'] });

@prefix('/blog/photos')
export default class PhotosController {
    @request('get', '/list')
    @summary('获取相册列表')
    @tag
    @query({
        page: { type: 'number', required: false, default: 1 },
        pageSize: { type: 'number', required: false, default: 10 },
        title: { type: 'string', required: false },
        tags: { type: 'array', required: false },
        category: { type: 'string', required: false },
        date: { type: 'array', required: false },
    })
    @requirePhotoPermission
    @ControllerErrorHandler
    async getPhotoList(ctx: Context) {
        const { page, pageSize, title, tags, category, date } =
            ctx.query as unknown as PhotoListRequest;
        const filter: PhotoListRequest = {
            page: Number(page),
            pageSize: Number(pageSize),
            title: title,
            tags: tags,
            category: category,
            date: date,
        };
        const result = await photoService.getPhotoList(filter);
        ctx.body = Response.success(result);
    }

    @request('post', '/create')
    @summary('创建相册')
    @tag
    @body({
        title: { type: 'string', required: true },
        description: { type: 'string', required: false },
        src: { type: 'string', required: true },
        category: { type: 'string', required: true },
        tags: { type: 'array', required: true },
        date: { type: 'string', required: true },
    })
    @requirePhotoEditPermission
    @ControllerErrorHandler
    async createPhoto(ctx: Context) {
        const { title, description, src, category, tags, date, location } = ctx.request
            .body as unknown as CreatePhotoRequest;
        const result = await photoService.createPhoto({
            title,
            description,
            src,
            category,
            tags,
            date,
            location,
        });
        ctx.body = Response.success(result);
    }

    @request('post', '/update')
    @summary('更新相册')
    @tag
    @body({
        id: { type: 'number', required: true },
    })
    @requirePhotoEditPermission
    @ControllerErrorHandler
    async updatePhoto(ctx: Context) {
        const { id, ...data } = ctx.request.body as unknown as UpdatePhotoRequest;
        const result = await photoService.updatePhoto({ id, ...data });
        ctx.body = Response.success(result);
    }

    @request('post', '/delete')
    @summary('删除相册')
    @tag
    @body({
        id: { type: 'number', required: true },
    })
    @requirePhotoEditPermission
    @ControllerErrorHandler
    async deletePhoto(ctx: Context) {
        const { id } = ctx.request.body as unknown as { id: number };
        await photoService.deletePhoto(id);
        ctx.body = Response.success(null);
    }

    @request('post', '/upload')
    @summary('上传文件')
    @tag
    @requirePhotoEditPermission
    @ControllerErrorHandler
    async upload(ctx: Context) {
        const file = ctx.file;
        const { photoId } = (ctx.request.body as Record<string, unknown>) || {};
        const fileUrl = await photoService.upload(file, photoId as string | number);
        ctx.body = Response.success({ url: fileUrl }, '附件上传成功');
    }

    @request('post', '/export')
    @summary('批量导出相册配置')
    @tag
    @body({
        ids: { type: 'array', required: true },
    })
    @requirePhotoEditPermission
    @ControllerErrorHandler
    async exportPhotos(ctx: Context) {
        const { ids } = ctx.request.body as { ids: number[] };
        const result = await photoService.exportPhotos(ids);
        ctx.body = Response.success(result, '导出相册成功');
    }

    @request('get', '/export-all')
    @summary('导出所有相册配置')
    @tag
    @requirePhotoEditPermission
    @ControllerErrorHandler
    async exportAllPhotos(ctx: Context) {
        const result = await photoService.exportAllPhotos();
        ctx.body = Response.success(result, '导出所有相册成功');
    }

    @request('post', '/import')
    @summary('批量导入相册配置')
    @tag
    @body({
        photos: { type: 'array', required: true },
    })
    @requirePhotoEditPermission
    @ControllerErrorHandler
    async importPhotos(ctx: Context) {
        const data = ctx.request.body as Parameters<typeof photoService.importPhotos>[0];
        const result = await photoService.importPhotos(data);
        ctx.body = Response.success(result, '导入相册成功');
    }
}

export const photoController = new PhotosController();
