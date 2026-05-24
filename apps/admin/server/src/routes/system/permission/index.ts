import Router from '@koa/router';
import { permissionController } from '../../../controllers/system/permission';

export const permissionRouter = new Router({
    prefix: '/system/permissions',
});

// 权限统计 - 放在前面避免路径冲突
permissionRouter.get('/stats', permissionController.getPermissionStats);

// 权限选项
permissionRouter.get('/options', permissionController.getPermissionOptions);

// 检查权限代码
permissionRouter.get('/check-code', permissionController.checkCode);

// 权限树
permissionRouter.get('/tree', permissionController.getPermissionTree);

// 权限列表
permissionRouter.get('/list', permissionController.getPermissionList);

// 创建权限
permissionRouter.post('/create', permissionController.createPermission);

// 权限详情
permissionRouter.get('/detail/:id', permissionController.getPermissionDetail);

// 更新权限
permissionRouter.post('/update', permissionController.updatePermission);

// 删除权限
permissionRouter.post('/delete', permissionController.deletePermission);

// 批量操作
permissionRouter.post('/batch', permissionController.batchOperation);
