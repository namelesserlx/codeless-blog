import Router from '@koa/router';
import { avatarUploadConfig, createMemoryUpload } from '../../../config/upload';
import { userController } from '../../../controllers/system/user';

export const userRouter = new Router({
    prefix: '/system/users',
});
const upload = createMemoryUpload(avatarUploadConfig);
// 用户统计 - 放在前面避免路径冲突
userRouter.get('/stats', userController.getUserStats);

// 角色选项
userRouter.get('/role-options', userController.getRoleOptions);

// 检查用户名和邮箱
userRouter.get('/check-username', userController.checkUsername);
userRouter.get('/check-email', userController.checkEmail);

// 用户列表
userRouter.get('/list', userController.getUserList);

// 创建用户
userRouter.post('/create', userController.createUser);

// 用户详情
userRouter.get('/detail/:id', userController.getUserDetail);

// 更新用户
userRouter.post('/update', userController.updateUser);

// 删除用户
userRouter.post('/delete', userController.deleteUser);

// 更新用户头像
userRouter.post('/avatar', upload.single('avatar'), userController.updateAvatar);

// 批量操作
userRouter.post('/batch', userController.batchOperation);
