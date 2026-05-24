import Router from '@koa/router';
import { articleController } from '../../../controllers/blog/article';

export const articleRouter = new Router({
    prefix: '/blog/articles',
});

// 获取文章列表
articleRouter.get('/list', articleController.getArticleList);

// 获取文章统计信息
articleRouter.get('/stats', articleController.getArticleStats);

// 获取标签选项
articleRouter.get('/tags', articleController.getTagOptions);

// 获取作者选项
articleRouter.get('/authors', articleController.getAuthorOptions);

// 获取文章详情
articleRouter.get('/detail/:id', articleController.getArticleDetail);

// 获取文章预览数据
articleRouter.get('/preview/:token', articleController.getArticlePreview);

// 预创建草稿（返回 ID 供上传使用）
articleRouter.post('/draft', articleController.createDraft);

// 创建文章
articleRouter.post('/create', articleController.createArticle);

// 更新文章
articleRouter.post('/update', articleController.updateArticle);

// 创建文章预览
articleRouter.post('/preview', articleController.createArticlePreview);

// 删除文章
articleRouter.post('/delete', articleController.deleteArticle);

// 批量操作文章
articleRouter.post('/batch', articleController.batchOperateArticles);

// 生成文章摘要
articleRouter.post('/generate-summary', articleController.generateSummary);

// 文章下拉列表
articleRouter.get('/options', articleController.getArticleOptions);

// 导出所有文章配置
articleRouter.get('/export-all', articleController.exportAllArticles);

// 批量导出文章
articleRouter.post('/export', articleController.exportArticles);

// 批量导入文章
articleRouter.post('/import', articleController.importArticles);

// 重新索引搜索
articleRouter.post('/reindex-search', articleController.reindexSearch);
