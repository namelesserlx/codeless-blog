import Router from '@koa/router';
import { createMemoryUpload, imageUploadConfig } from '../../config/upload';
import { globalController } from '../../controllers/global';
export const globalRouter = new Router({
    prefix: '/global',
});

const upload = createMemoryUpload(imageUploadConfig);

globalRouter.post('/upload', upload.single('file'), globalController.upload);
