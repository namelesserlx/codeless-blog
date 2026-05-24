import Router from '@koa/router';
import { photoController } from '../../../controllers/blog/photo';
import { createMemoryUpload, imageUploadConfig } from '../../../config/upload';
export const photoRouter = new Router({
    prefix: '/blog/photos',
});

const upload = createMemoryUpload(imageUploadConfig);

// 获取相册列表（分页）
photoRouter.get('/list', photoController.getPhotoList);

// 创建相册
photoRouter.post('/create', photoController.createPhoto);

// 更新相册
photoRouter.post('/update', photoController.updatePhoto);

// 删除相册
photoRouter.post('/delete', photoController.deletePhoto);

photoRouter.post('/upload', upload.single('file'), photoController.upload);

// 批量导出相册
photoRouter.post('/export', photoController.exportPhotos);

// 导出所有相册
photoRouter.get('/export-all', photoController.exportAllPhotos);

// 批量导入相册
photoRouter.post('/import', photoController.importPhotos);
