import Router from '@koa/router';
import { roleController } from '../../../controllers/system/role';

export const roleRouter = new Router({
    prefix: '/system/roles',
});

// 角色统计 - 放在前面避免路径冲突
roleRouter.get('/stats', roleController.getRoleStats);

// 角色选项
roleRouter.get('/options', roleController.getRoleOptions);

// 检查角色代码
roleRouter.get('/check-code', roleController.checkCode);

// 角色列表
roleRouter.get('/list', roleController.getRoleList);

// 创建角色
roleRouter.post('/create', roleController.createRole);

// 角色详情
roleRouter.get('/detail/:id', roleController.getRoleDetail);

// 更新角色
roleRouter.post('/update', roleController.updateRole);

// 删除角色
roleRouter.post('/delete', roleController.deleteRole);

// 批量操作
roleRouter.post('/batch', roleController.batchOperation);

// 获取角色权限
roleRouter.get('/:id/permissions', roleController.getRolePermissions);

// 获取角色用户
roleRouter.get('/:id/users', roleController.getRoleUsers);

// 分配角色权限
roleRouter.post('/assign-permissions', roleController.assignPermissions);

// 从角色移除用户
roleRouter.post('/remove-user', roleController.removeUserFromRole);
