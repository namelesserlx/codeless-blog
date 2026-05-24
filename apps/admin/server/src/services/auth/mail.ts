import { generateHash } from '@blog/shared';
import redis from '../../lib/redis';
import { logger } from '../../utils/logger';
import { AuthError, BusinessError, ErrorCode, ValidationError } from '../../types/errors';

const EMAIL_CODE_TTL_SECONDS = 600;
const RESET_TOKEN_TTL_SECONDS = 1800;
const PASSWORD_CHANGE_TOKEN_TTL_SECONDS = 600;
const SEND_COOLDOWN_SECONDS = 60;

const getRemainingCooldown = async (cacheKey: string): Promise<number> => {
    const lastSent = await redis.get(cacheKey);
    if (!lastSent) {
        return 0;
    }

    const remaining = SEND_COOLDOWN_SECONDS - Math.floor((Date.now() - parseInt(lastSent)) / 1000);
    return remaining > 0 ? remaining : 0;
};

const writeSendCooldown = async (cacheKey: string) => {
    await redis.setex(cacheKey, SEND_COOLDOWN_SECONDS, Date.now().toString());
};

export const ensureValidEmail = (email: string): void => {
    if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
        throw new ValidationError('请输入有效的邮箱地址');
    }
};

export const issueEmailLoginCode = async (
    email: string,
): Promise<{ code: string; expiresIn: number }> => {
    const cacheKey = `email_code_sent:${email}`;
    const remaining = await getRemainingCooldown(cacheKey);
    if (remaining > 0) {
        throw new ValidationError(`请${remaining}秒后再试`);
    }

    const code = Math.floor(100000 + Math.random() * 900000).toString();
    const codeKey = `email_login_code:${email}`;
    await redis.setex(codeKey, EMAIL_CODE_TTL_SECONDS, code);
    await writeSendCooldown(cacheKey);

    return {
        code,
        expiresIn: EMAIL_CODE_TTL_SECONDS,
    };
};

export const consumeEmailLoginCode = async (email: string, code: string): Promise<void> => {
    const codeKey = `email_login_code:${email}`;
    const storedCode = await redis.get(codeKey);

    if (!storedCode) {
        throw new ValidationError('验证码已过期，请重新获取');
    }

    if (storedCode !== code) {
        throw new AuthError(ErrorCode.INVALID_CREDENTIALS, '验证码错误');
    }

    await redis.del(codeKey);
};

export const issuePasswordChangeCode = async (
    email: string,
): Promise<{ code: string; expiresIn: number }> => {
    const cacheKey = `password_change_code_sent:${email}`;
    const remaining = await getRemainingCooldown(cacheKey);
    if (remaining > 0) {
        throw new ValidationError(`请${remaining}秒后再试`);
    }

    const code = Math.floor(100000 + Math.random() * 900000).toString();
    const codeKey = `password_change_code:${email}`;
    await redis.setex(codeKey, EMAIL_CODE_TTL_SECONDS, code);
    await writeSendCooldown(cacheKey);

    return {
        code,
        expiresIn: EMAIL_CODE_TTL_SECONDS,
    };
};

export const consumePasswordChangeCode = async (email: string, code: string): Promise<void> => {
    const codeKey = `password_change_code:${email}`;
    const storedCode = await redis.get(codeKey);

    if (!storedCode) {
        throw new ValidationError('验证码已过期，请重新获取');
    }

    if (storedCode !== code) {
        throw new AuthError(ErrorCode.INVALID_CREDENTIALS, '验证码错误');
    }

    await redis.del(codeKey);
};

export const sendVerificationCodeEmail = async (email: string, code: string): Promise<void> => {
    try {
        const { emailNotificationService } = await import('../email/notification.js');
        await emailNotificationService.sendVerificationCodeWithCode({
            email,
            code,
            purpose: 'login',
            expiresInMinutes: EMAIL_CODE_TTL_SECONDS / 60,
        });
    } catch (error) {
        logger.error('发送验证码邮件失败:', error);
        throw new BusinessError(ErrorCode.UNKNOWN_ERROR, '发送验证码失败，请稍后重试');
    }
};

export const sendPasswordChangeCodeEmail = async (email: string, code: string): Promise<void> => {
    try {
        const { emailNotificationService } = await import('../email/notification.js');
        await emailNotificationService.sendVerificationCodeWithCode({
            email,
            code,
            purpose: 'reset_password',
            expiresInMinutes: EMAIL_CODE_TTL_SECONDS / 60,
        });
    } catch (error) {
        logger.error('发送修改密码验证码邮件失败:', error);
        throw new BusinessError(ErrorCode.UNKNOWN_ERROR, '发送验证码失败，请稍后重试');
    }
};

export const issuePasswordChangeToken = async (
    email: string,
    userId: number,
): Promise<{ token: string; expiresIn: number }> => {
    const token = generateHash(32);
    const tokenKey = `password_change_token:${token}`;
    await redis.setex(
        tokenKey,
        PASSWORD_CHANGE_TOKEN_TTL_SECONDS,
        JSON.stringify({ email, userId }),
    );

    return {
        token,
        expiresIn: PASSWORD_CHANGE_TOKEN_TTL_SECONDS,
    };
};

export const readPasswordChangeToken = async (
    token: string,
): Promise<{ email: string; userId: number }> => {
    if (!token) {
        throw new ValidationError('修改密码令牌不能为空');
    }

    const tokenKey = `password_change_token:${token}`;
    const tokenData = await redis.get(tokenKey);

    if (!tokenData) {
        throw new AuthError(ErrorCode.TOKEN_EXPIRED, '修改密码令牌已过期，请重新验证邮箱');
    }

    try {
        return JSON.parse(tokenData);
    } catch {
        throw new ValidationError('修改密码令牌格式错误');
    }
};

export const clearPasswordChangeToken = async (token: string): Promise<void> => {
    const tokenKey = `password_change_token:${token}`;
    await redis.del(tokenKey);
};

export const issuePasswordResetToken = async (
    email: string,
    userId: number,
): Promise<{ token: string; expiresIn: number }> => {
    const cacheKey = `reset_email_sent:${email}`;
    const remaining = await getRemainingCooldown(cacheKey);
    if (remaining > 0) {
        throw new ValidationError(`请${remaining}秒后再试`);
    }

    const resetToken = generateHash(32);
    const tokenKey = `password_reset_token:${resetToken}`;
    await redis.setex(tokenKey, RESET_TOKEN_TTL_SECONDS, JSON.stringify({ email, userId }));
    await writeSendCooldown(cacheKey);

    return {
        token: resetToken,
        expiresIn: RESET_TOKEN_TTL_SECONDS,
    };
};

export const sendPasswordResetNotification = async (params: {
    email: string;
    userName: string;
    resetToken: string;
}): Promise<void> => {
    try {
        const { emailNotificationService } = await import('../email/notification.js');
        await emailNotificationService.sendPasswordResetEmail({
            email: params.email,
            userName: params.userName,
            resetToken: params.resetToken,
            expiresInMinutes: RESET_TOKEN_TTL_SECONDS / 60,
        });
    } catch (error) {
        logger.error('发送密码重置邮件失败:', error);
        throw new BusinessError(ErrorCode.UNKNOWN_ERROR, '发送重置邮件失败，请稍后重试');
    }
};

export const readPasswordResetToken = async (
    token: string,
): Promise<{ email: string; userId: number }> => {
    if (!token) {
        throw new ValidationError('重置令牌不能为空');
    }

    const tokenKey = `password_reset_token:${token}`;
    const tokenData = await redis.get(tokenKey);

    if (!tokenData) {
        throw new AuthError(ErrorCode.TOKEN_EXPIRED, '重置链接已过期或无效，请重新申请');
    }

    try {
        return JSON.parse(tokenData);
    } catch {
        throw new ValidationError('重置令牌格式错误');
    }
};

export const clearPasswordResetToken = async (token: string): Promise<void> => {
    const tokenKey = `password_reset_token:${token}`;
    await redis.del(tokenKey);
};
