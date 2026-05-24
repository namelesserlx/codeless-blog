import { SwaggerRouter, request, summary, tags, prefix } from 'koa-swagger-decorator';
import type { Context } from 'koa';
import { Response } from '../../utils/response';
import { globalService } from '../../services/global';
import { ControllerErrorHandler, RequirePermission } from '../../utils/decorators';
const tag = tags(['全局']);
const requireArticleWritePermission = RequirePermission({ permissions: 'article:write' });

@prefix('/global')
export default class GlobalController {
    @request('post', '/upload')
    @summary('上传文件')
    @tag
    @requireArticleWritePermission
    @ControllerErrorHandler
    async upload(ctx: Context) {
        const file = ctx.file;
        const { entityType, entityId } = (ctx.request.body as Record<string, unknown>) || {};

        // 新模式：按实体+类型组织目录
        if (entityType && entityId) {
            const fileUrl = await globalService.uploadAsset(file, {
                entityType: String(entityType),
                entityId: entityId as string | number,
            });
            ctx.body = Response.success({ url: fileUrl }, '附件上传成功');
            return;
        }

        // 旧模式：兼容未传 entityType/entityId 的调用
        const fileUrl = await globalService.uploadImage(file, 'article-images');
        ctx.body = Response.success({ url: fileUrl }, '附件上传成功');
    }
}
export const globalController = new GlobalController();
