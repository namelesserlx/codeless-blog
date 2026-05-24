import Router from '@koa/router';
import { snippetController } from '../../../controllers/blog/snippet';
import { createMemoryUpload, mixedMediaUploadConfig } from '../../../config/upload';
export const snippetRouter = new Router({
    prefix: '/blog/snippets',
});

const upload = createMemoryUpload(mixedMediaUploadConfig);

// 获取片段列表
snippetRouter.get('/list', snippetController.getSnippetList);

// 创建片段
snippetRouter.post('/create', snippetController.createSnippet);

// 更新片段
snippetRouter.post('/update', snippetController.updateSnippet);

// 删除片段
snippetRouter.post('/delete', snippetController.deleteSnippet);

// 上传文件
snippetRouter.post('/upload', upload.single('file'), snippetController.upload);
