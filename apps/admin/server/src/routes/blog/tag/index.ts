import Router from '@koa/router';
import { tagController } from '../../../controllers/blog/tag';

export const tagRouter = new Router({
    prefix: '/blog/tags',
});

// 标签统计 - 放在前面避免路径冲突
tagRouter.get('/stats', tagController.getTagStats);

// 检查标签名称
tagRouter.get('/check-name', tagController.checkTagName);

// 标签列表
tagRouter.get('/list', tagController.getTagList);

// 创建标签
tagRouter.post('/create', tagController.createTag);

// 标签详情
tagRouter.get('/detail/:id', tagController.getTagDetail);

// 更新标签
tagRouter.post('/update', tagController.updateTag);

// 删除标签
tagRouter.post('/delete', tagController.deleteTag);

// 批量操作
tagRouter.post('/batch', tagController.batchOperation);
