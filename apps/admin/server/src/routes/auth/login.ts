import Router from '@koa/router';
import { avatarUploadConfig, createMemoryUpload } from '../../config/upload';
import { authController } from '../../controllers/auth';
export const authLoginRouter = new Router({
    prefix: '/auth',
});

const upload = createMemoryUpload(avatarUploadConfig);

authLoginRouter.get('/captcha', authController.getCaptcha);

authLoginRouter.post('/login', authController.login);

authLoginRouter.post('/admin-login', authController.adminLogin);

authLoginRouter.get('/checkLogin', authController.checkLogin);

authLoginRouter.get('/admin-checkLogin', authController.adminCheckLogin);

authLoginRouter.post('/refresh', authController.refresh);

authLoginRouter.post('/admin-refresh', authController.adminRefresh);

authLoginRouter.get('/profile', authController.getProfile);

authLoginRouter.post('/profile', authController.updateProfile);

authLoginRouter.post(
    '/profile/avatar',
    upload.single('avatar'),
    authController.updateProfileAvatar,
);

authLoginRouter.post('/logout', authController.logout);

authLoginRouter.post('/send-password-change-code', authController.sendPasswordChangeCode);

authLoginRouter.post('/verify-password-change-code', authController.verifyPasswordChangeCode);

authLoginRouter.post('/change-password', authController.changePassword);

authLoginRouter.post('/send-email-code', authController.sendEmailCode);

authLoginRouter.post('/email-login', authController.emailLogin);

authLoginRouter.post('/register', authController.register);

authLoginRouter.post('/send-reset-email', authController.sendResetEmail);

authLoginRouter.post('/verify-reset-token', authController.verifyResetToken);

authLoginRouter.post('/reset-password', authController.resetPassword);
