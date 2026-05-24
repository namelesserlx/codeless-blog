import svgCaptcha from 'svg-captcha';
import type {
    CurrentUserProfile,
    LoginRequest,
    RegisterRequest,
    UpdateCurrentUserProfileRequest,
} from '@blog/shared';
import { prisma } from '@blog/db';
import { LoginResponse } from '../../types/auth';
import { crypto } from '../../utils/crypto';
import { removeSession, verifyToken } from '../../utils/auth';
import type { Context } from 'koa';
import { logger } from '../../utils/logger';
import { ServiceErrorHandler, TraceSpan, ValidateParams } from '../../utils/decorators';
import { runWithSpan } from '../../telemetry/tracing';
import {
    AuthError,
    BusinessError,
    ErrorCode,
    NotFoundError,
    UserError,
    ValidationError,
} from '../../types/errors';
import { authConfig } from '../../config/auth';
import bcrypt from 'bcryptjs';
import {
    clearAuthSession,
    createLoginResult,
    getAuthSession,
    issueAccessToken,
    readAuthSessionId,
    refreshAuthSession,
    resolveSessionUser,
    writeAuthSession,
} from './session-manager';
import { clearCaptchaChallenge, readCaptchaText, storeCaptchaChallenge } from './captcha';
import { buildLoginResponseUser, createLoginResponse, getUserRolesAndPermissions } from './profile';
import { ensureAdminAccess } from './access';
import { getStorage } from '../../lib/storage';
import {
    clearPasswordResetToken,
    clearPasswordChangeToken,
    consumeEmailLoginCode,
    consumePasswordChangeCode,
    ensureValidEmail,
    issueEmailLoginCode,
    issuePasswordChangeCode,
    issuePasswordChangeToken,
    issuePasswordResetToken,
    readPasswordChangeToken,
    readPasswordResetToken,
    sendPasswordChangeCodeEmail,
    sendPasswordResetNotification,
    sendVerificationCodeEmail,
} from './mail';
import { isDev } from '../../utils/env';

const DEFAULT_AVATAR_URL = '/images/default-avatar.svg';

interface UploadedProfileAvatarFile {
    buffer: Buffer;
    originalname: string;
    mimetype: string;
    size: number;
}

class AuthService {
    /**
     * 生成图形验证码
     */
    @TraceSpan('auth.captcha.generate')
    private async generateCaptcha(): Promise<{ text: string; data: string }> {
        const captcha = svgCaptcha.create({
            size: 4,
            ignoreChars: '0o1il',
            noise: 2,
            background: '#fff',
            charPreset: '23456789ABCDEFGHJKLMNPQRSTUVWXYZ',
            color: true, // 使用彩色
            fontSize: 75,
        });
        return {
            text: captcha.text.toLowerCase(),
            data: captcha.data,
        };
    }

    @TraceSpan('auth.captcha.store', (ctx: Context) => ({
        'auth.captcha.cookie_present': Boolean(ctx.cookies.get(authConfig.captchaCookieName)),
    }))
    private async storeCaptcha(ctx: Context, captchaText: string): Promise<void> {
        await storeCaptchaChallenge(ctx, captchaText);
    }

    /**
     * 创建验证码
     */
    @TraceSpan('auth.captcha.create')
    @ServiceErrorHandler
    async createCaptchaChallenge(ctx: Context): Promise<string> {
        const captcha = await this.generateCaptcha();
        await this.storeCaptcha(ctx, captcha.text);
        return captcha.data;
    }

    /**
     * 验证验证码
     */
    private validateCaptcha(sessionCaptcha: string | undefined, inputCaptcha: string): void {
        // 开发环境下允许使用特殊测试验证码
        if (isDev && inputCaptcha === 'test') {
            return;
        }

        if (!sessionCaptcha) {
            throw new ValidationError('验证码已过期，请刷新验证码');
        }

        if (!inputCaptcha || inputCaptcha.toLowerCase() !== sessionCaptcha) {
            throw new ValidationError('验证码错误');
        }
    }

    private createAccountStatusError(status: string, fallbackMessage = '账号状态异常') {
        const statusMessages = {
            INACTIVE: '账号未激活，请联系管理员',
            BANNED: '账号已被禁用，请联系管理员',
            DELETED: '账号已被删除',
        } as const;

        return new AuthError(
            ErrorCode.UNAUTHORIZED,
            statusMessages[status as keyof typeof statusMessages] || fallbackMessage,
        );
    }

    private buildCurrentUserProfile(user: {
        id: number;
        username: string;
        email: string;
        nickname: string | null;
        avatar: string | null;
    }): CurrentUserProfile {
        return {
            id: user.id,
            username: user.username,
            email: user.email,
            nickname: user.nickname || undefined,
            avatar: user.avatar || DEFAULT_AVATAR_URL,
        };
    }

    /**
     * 拿现有的 sessionId 恢复登录态，并重新签发一个新的 access token
     * @param ctx 上下文
     * @param sessionId 会话ID
     * @returns 登录结果
     */
    @TraceSpan('auth.session.restore', (_ctx: Context, sessionId: string) => ({
        'auth.session.present': Boolean(sessionId),
    }))
    private async issueLoginResponseFromSession(
        ctx: Context,
        sessionId: string,
        options?: { requireAdminAccess?: boolean },
    ): Promise<LoginResponse> {
        const sessionData = await runWithSpan(
            'auth.session.load',
            () => getAuthSession(sessionId),
            {
                'auth.session.present': Boolean(sessionId),
            },
        );
        const sessionUser = resolveSessionUser(sessionData);

        if (!sessionUser) {
            clearAuthSession(ctx);
            throw new AuthError(ErrorCode.UNAUTHORIZED, '未登录');
        }

        await runWithSpan(
            'auth.session.refresh',
            async () => {
                await refreshAuthSession(sessionId);
                writeAuthSession(ctx, sessionId);
            },
            {
                'auth.user.id': sessionUser.id,
            },
        );

        const { user, userRoles, permissions } = await runWithSpan(
            'auth.profile.load',
            () => getUserRolesAndPermissions(sessionUser.id),
            {
                'auth.user.id': sessionUser.id,
            },
        );
        if (options?.requireAdminAccess) {
            ensureAdminAccess(permissions);
        }

        const roleCodes = userRoles.map((role) => role.code);
        const token = await runWithSpan(
            'auth.token.issue',
            () =>
                issueAccessToken({
                    id: user.id,
                    username: user.username,
                    roles: roleCodes,
                    session: sessionId,
                }),
            {
                'auth.user.id': user.id,
                'auth.role.count': roleCodes.length,
            },
        );

        const responseUser = buildLoginResponseUser(user, userRoles, permissions);
        ctx.state.user = {
            id: user.id,
            username: user.username,
            roles: roleCodes,
            session: sessionId,
            exp: Math.floor(Date.now() / 1000) + authConfig.accessTokenTtlSeconds,
        };

        return {
            token,
            user: responseUser,
        };
    }

    private async authenticateByPassword(loginData: LoginRequest, ctx: Context): Promise<number> {
        const { username, password, captcha } = loginData;
        const storedCaptcha = await runWithSpan(
            'auth.captcha.read',
            async () => {
                const captchaText = await readCaptchaText(ctx);
                if (!captchaText) {
                    await clearCaptchaChallenge(ctx);
                }

                return captchaText;
            },
            {
                'auth.captcha.cookie_present': Boolean(
                    ctx.cookies.get(authConfig.captchaCookieName),
                ),
            },
        );

        await runWithSpan(
            'auth.captcha.validate',
            () => this.validateCaptcha(storedCaptcha ?? undefined, captcha),
            {
                'auth.captcha.dev_bypass': isDev && captcha === 'test',
            },
        );

        // 清除验证码，防止重复使用
        await clearCaptchaChallenge(ctx);
        ctx.state.user = null;

        const user = await runWithSpan(
            'auth.user.load',
            () =>
                prisma.user.findUnique({
                    where: { username },
                    include: {
                        userRoles: {
                            include: {
                                role: {
                                    include: {
                                        rolePermissions: {
                                            include: {
                                                permission: true,
                                            },
                                        },
                                    },
                                },
                            },
                        },
                    },
                }),
            {
                'auth.login.username_length': username.length,
            },
        );

        if (!user) {
            throw new UserError(ErrorCode.USER_NOT_FOUND);
        }

        // 检查用户状态
        if (user.status !== 'ACTIVE') {
            throw this.createAccountStatusError(user.status);
        }

        const isValid = await runWithSpan(
            'auth.password.verify',
            () => crypto.comparePassword(password, user.password),
            {
                'auth.user.id': user.id,
            },
        );
        if (!isValid) {
            throw new UserError(ErrorCode.INVALID_PASSWORD);
        }

        return user.id;
    }

    /**
     * 登录
     * @param loginData 登录数据
     * @param ctx 上下文
     * @returns 登录响应
     */
    @TraceSpan('auth.login.password', (loginData: LoginRequest) => ({
        'auth.login.has_username': Boolean(loginData.username?.trim()),
        'auth.login.has_captcha': Boolean(loginData.captcha),
    }))
    @ServiceErrorHandler
    @ValidateParams((args) => {
        const [params] = args;
        const { username, password, captcha } = params;
        if (!username || !password || !captcha) {
            throw new ValidationError('用户名、密码和验证码不能为空');
        }
    })
    async login(loginData: LoginRequest, ctx: Context): Promise<LoginResponse> {
        const userId = await this.authenticateByPassword(loginData, ctx);

        return runWithSpan('auth.login.response.create', () => createLoginResponse(ctx, userId), {
            'auth.user.id': userId,
        });
    }

    @TraceSpan('auth.login.admin_password', (loginData: LoginRequest) => ({
        'auth.login.has_username': Boolean(loginData.username?.trim()),
        'auth.login.has_captcha': Boolean(loginData.captcha),
    }))
    @ServiceErrorHandler
    @ValidateParams((args) => {
        const [params] = args;
        const { username, password, captcha } = params;
        if (!username || !password || !captcha) {
            throw new ValidationError('用户名、密码和验证码不能为空');
        }
    })
    async adminLogin(loginData: LoginRequest, ctx: Context): Promise<LoginResponse> {
        const userId = await this.authenticateByPassword(loginData, ctx);
        const { user, userRoles, permissions } = await getUserRolesAndPermissions(userId);

        ensureAdminAccess(permissions);

        const responseUser = buildLoginResponseUser(user, userRoles, permissions);
        return createLoginResult({
            ctx,
            user: responseUser,
            roleCodes: userRoles.map((role) => role.code),
        });
    }

    /**
     * 从 Authorization 或 sid Cookie 中解析当前用户
     */
    @TraceSpan('auth.login.check', (ctx: Context) => ({
        'auth.login.has_authorization': Boolean(ctx.headers.authorization),
        'auth.login.has_session_cookie': Boolean(ctx.cookies.get(authConfig.sessionCookieName)),
    }))
    @ServiceErrorHandler
    async checkLogin(ctx: Context): Promise<LoginResponse> {
        // 1. Authorization 优先
        const authz = ctx.headers.authorization;
        if (authz && authz.startsWith('Bearer ')) {
            const token = authz.replace('Bearer ', '');
            const payload = await runWithSpan('auth.token.verify', () => verifyToken(token), {
                'auth.token.source': 'authorization',
            });
            if (payload?.id && payload.session) {
                return this.issueLoginResponseFromSession(ctx, payload.session);
            }
        }

        const sessionId = readAuthSessionId(ctx);
        if (sessionId) {
            return this.issueLoginResponseFromSession(ctx, sessionId);
        }

        clearAuthSession(ctx);
        throw new AuthError(ErrorCode.UNAUTHORIZED, '未登录');
    }

    @TraceSpan('auth.login.admin_check', (ctx: Context) => ({
        'auth.login.has_authorization': Boolean(ctx.headers.authorization),
        'auth.login.has_session_cookie': Boolean(ctx.cookies.get(authConfig.sessionCookieName)),
    }))
    @ServiceErrorHandler
    async adminCheckLogin(ctx: Context): Promise<LoginResponse> {
        const authz = ctx.headers.authorization;
        if (authz && authz.startsWith('Bearer ')) {
            const token = authz.replace('Bearer ', '');
            const payload = await runWithSpan('auth.token.verify', () => verifyToken(token), {
                'auth.token.source': 'authorization',
            });
            if (payload?.id && payload.session) {
                return this.issueLoginResponseFromSession(ctx, payload.session, {
                    requireAdminAccess: true,
                });
            }
        }

        const sessionId = readAuthSessionId(ctx);
        if (sessionId) {
            return this.issueLoginResponseFromSession(ctx, sessionId, {
                requireAdminAccess: true,
            });
        }

        clearAuthSession(ctx);
        throw new AuthError(ErrorCode.UNAUTHORIZED, '未登录');
    }

    @TraceSpan('auth.token.refresh', (ctx: Context) => ({
        'auth.login.has_session_cookie': Boolean(ctx.cookies.get(authConfig.sessionCookieName)),
    }))
    @ServiceErrorHandler
    async refresh(ctx: Context): Promise<LoginResponse> {
        const sessionId = readAuthSessionId(ctx);
        if (!sessionId) {
            clearAuthSession(ctx);
            throw new AuthError(ErrorCode.UNAUTHORIZED, '未登录');
        }

        return this.issueLoginResponseFromSession(ctx, sessionId);
    }

    @TraceSpan('auth.token.admin_refresh', (ctx: Context) => ({
        'auth.login.has_session_cookie': Boolean(ctx.cookies.get(authConfig.sessionCookieName)),
    }))
    @ServiceErrorHandler
    async adminRefresh(ctx: Context): Promise<LoginResponse> {
        const sessionId = readAuthSessionId(ctx);
        if (!sessionId) {
            clearAuthSession(ctx);
            throw new AuthError(ErrorCode.UNAUTHORIZED, '未登录');
        }

        return this.issueLoginResponseFromSession(ctx, sessionId, {
            requireAdminAccess: true,
        });
    }

    @ServiceErrorHandler
    async sendPasswordChangeVerificationCode(
        userId: number,
    ): Promise<{ email: string; expiresIn: number }> {
        const user = await prisma.user.findUnique({
            where: { id: userId },
            select: {
                id: true,
                email: true,
                status: true,
            },
        });

        if (!user) {
            throw new UserError(ErrorCode.USER_NOT_FOUND);
        }

        if (user.status !== 'ACTIVE') {
            throw this.createAccountStatusError(user.status);
        }

        ensureValidEmail(user.email);

        const { code, expiresIn } = await issuePasswordChangeCode(user.email);
        await sendPasswordChangeCodeEmail(user.email, code);

        return {
            email: user.email,
            expiresIn,
        };
    }

    @ServiceErrorHandler
    @ValidateParams((args) => {
        const [_userId, params] = args;
        if (!params.code) {
            throw new ValidationError('验证码不能为空');
        }
    })
    async verifyPasswordChangeCode(
        userId: number,
        params: { code: string },
    ): Promise<{ token: string; expiresIn: number }> {
        const user = await prisma.user.findUnique({
            where: { id: userId },
            select: {
                id: true,
                email: true,
                status: true,
            },
        });

        if (!user) {
            throw new UserError(ErrorCode.USER_NOT_FOUND);
        }

        if (user.status !== 'ACTIVE') {
            throw this.createAccountStatusError(user.status);
        }

        ensureValidEmail(user.email);
        await consumePasswordChangeCode(user.email, params.code);

        return issuePasswordChangeToken(user.email, user.id);
    }

    @ServiceErrorHandler
    @ValidateParams((args) => {
        const [_userId, params] = args;
        const { token, newPassword } = params;

        if (!token || !newPassword) {
            throw new ValidationError('修改密码令牌和新密码不能为空');
        }

        if (newPassword.length < 6) {
            throw new ValidationError('新密码长度至少6个字符');
        }
    })
    async changePassword(
        userId: number,
        params: { token: string; newPassword: string },
    ): Promise<void> {
        const tokenPayload = await readPasswordChangeToken(params.token);

        if (tokenPayload.userId !== userId) {
            throw new AuthError(ErrorCode.PERMISSION_DENIED, '修改密码令牌不属于当前用户');
        }

        await prisma.user.update({
            where: { id: userId },
            data: {
                password: await crypto.hashPassword(params.newPassword),
            },
        });

        await clearPasswordChangeToken(params.token);
    }

    /**
     * 发送邮箱验证码
     */
    @ServiceErrorHandler
    async sendEmailVerificationCode(params: {
        email: string;
    }): Promise<{ message: string; expiresIn: number }> {
        const { email } = params;

        ensureValidEmail(email);
        const { code, expiresIn } = await issueEmailLoginCode(email);
        await sendVerificationCodeEmail(email, code);

        return {
            message: '验证码已发送到您的邮箱',
            expiresIn,
        };
    }

    /**
     * 邮箱验证码登录
     */
    @TraceSpan('auth.login.email', (params: { email: string; code: string }) => ({
        'auth.login.email_present': Boolean(params.email),
        'auth.login.code_present': Boolean(params.code),
    }))
    @ServiceErrorHandler
    async emailLogin(
        params: { email: string; code: string },
        ctx: Context,
    ): Promise<LoginResponse> {
        const { email, code } = params;

        if (!email || !code) {
            throw new ValidationError('邮箱和验证码不能为空');
        }

        ensureValidEmail(email);
        await runWithSpan('auth.email.code.consume', () => consumeEmailLoginCode(email, code), {
            'auth.login.method': 'email',
        });

        const user = await runWithSpan(
            'auth.user.load',
            () =>
                prisma.user.findUnique({
                    where: { email },
                    include: {
                        userRoles: {
                            include: {
                                role: {
                                    include: {
                                        rolePermissions: {
                                            include: {
                                                permission: true,
                                            },
                                        },
                                    },
                                },
                            },
                        },
                    },
                }),
            {
                'auth.login.method': 'email',
            },
        );

        if (!user) {
            throw new UserError(ErrorCode.USER_NOT_FOUND, '该邮箱尚未注册');
        }

        // 检查用户状态
        if (user.status !== 'ACTIVE') {
            throw this.createAccountStatusError(user.status);
        }

        return runWithSpan('auth.login.response.create', () => createLoginResponse(ctx, user.id), {
            'auth.user.id': user.id,
        });
    }

    /**
     * 获取当前用户信息
     * @param userId 用户ID
     * @returns 用户信息
     */
    @ServiceErrorHandler
    async getCurrentUser(userId: number): Promise<LoginResponse['user']> {
        const { user, userRoles, permissions } = await getUserRolesAndPermissions(userId);

        return buildLoginResponseUser(user, userRoles, permissions);
    }

    @ServiceErrorHandler
    async getCurrentProfile(userId: number): Promise<CurrentUserProfile> {
        const user = await prisma.user.findUnique({
            where: { id: userId },
            select: {
                id: true,
                username: true,
                email: true,
                nickname: true,
                avatar: true,
                status: true,
            },
        });

        if (!user) {
            throw new UserError(ErrorCode.USER_NOT_FOUND);
        }

        if (user.status !== 'ACTIVE') {
            throw this.createAccountStatusError(user.status);
        }

        return this.buildCurrentUserProfile(user);
    }

    @ServiceErrorHandler
    async updateCurrentProfile(
        userId: number,
        params: UpdateCurrentUserProfileRequest,
    ): Promise<CurrentUserProfile> {
        const currentUser = await prisma.user.findUnique({
            where: { id: userId },
            select: {
                id: true,
                username: true,
                email: true,
                nickname: true,
                avatar: true,
                status: true,
            },
        });

        if (!currentUser) {
            throw new UserError(ErrorCode.USER_NOT_FOUND);
        }

        if (currentUser.status !== 'ACTIVE') {
            throw this.createAccountStatusError(currentUser.status);
        }

        const data: { nickname?: string; email?: string } = {};
        const nickname = params.nickname?.trim();
        const email = params.email?.trim();

        if (params.nickname !== undefined) {
            if (!nickname) {
                throw new ValidationError('昵称不能为空');
            }

            const existingNickname = await prisma.user.findFirst({
                where: {
                    id: { not: userId },
                    nickname,
                },
                select: { id: true },
            });

            if (existingNickname) {
                throw new BusinessError(ErrorCode.RESOURCE_EXISTS, '昵称已存在');
            }

            data.nickname = nickname;
        }

        if (email !== undefined && email !== currentUser.email) {
            ensureValidEmail(email);

            if (!params.code?.trim()) {
                throw new ValidationError('邮箱验证码不能为空');
            }

            const existingEmail = await prisma.user.findFirst({
                where: {
                    id: { not: userId },
                    email,
                },
                select: { id: true },
            });

            if (existingEmail) {
                throw new UserError(ErrorCode.EMAIL_EXISTS);
            }

            await consumeEmailLoginCode(email, params.code.trim());
            data.email = email;
        }

        if (Object.keys(data).length === 0) {
            return this.buildCurrentUserProfile(currentUser);
        }

        const updatedUser = await prisma.user.update({
            where: { id: userId },
            data,
            select: {
                id: true,
                username: true,
                email: true,
                nickname: true,
                avatar: true,
            },
        });

        return this.buildCurrentUserProfile(updatedUser);
    }

    @ServiceErrorHandler
    async updateCurrentAvatar(
        userId: number,
        file: UploadedProfileAvatarFile | undefined,
    ): Promise<CurrentUserProfile> {
        if (!file) {
            throw new ValidationError('请上传头像文件');
        }

        const user = await prisma.user.findUnique({
            where: { id: userId },
            select: {
                id: true,
                status: true,
            },
        });

        if (!user) {
            throw new UserError(ErrorCode.USER_NOT_FOUND);
        }

        if (user.status !== 'ACTIVE') {
            throw this.createAccountStatusError(user.status);
        }

        const avatar = await getStorage().upload({
            buffer: file.buffer,
            originalName: file.originalname,
            mimeType: file.mimetype,
            category: 'image',
            entityType: 'avatars',
            entityId: userId,
        });

        const updatedUser = await prisma.user.update({
            where: { id: userId },
            data: { avatar },
            select: {
                id: true,
                username: true,
                email: true,
                nickname: true,
                avatar: true,
            },
        });

        return this.buildCurrentUserProfile(updatedUser);
    }

    /**
     * 退出登录
     * @param sessionId 会话ID
     */
    @ServiceErrorHandler
    async logout(ctx: Context): Promise<void> {
        try {
            const sessionId = readAuthSessionId(ctx);
            if (sessionId) {
                await removeSession(sessionId);
            }
            clearAuthSession(ctx);
        } catch (error) {
            logger.error('Error:', error);
            throw error;
        }
    }

    /**
     * 发送密码重置邮件
     */
    @ServiceErrorHandler
    async sendPasswordResetEmail(params: {
        email: string;
    }): Promise<{ message: string; expiresIn: number }> {
        const { email } = params;

        ensureValidEmail(email);

        // 检查用户是否存在
        const user = await prisma.user.findUnique({
            where: { email },
        });

        if (!user) {
            throw new UserError(ErrorCode.USER_NOT_FOUND, '该邮箱尚未注册');
        }

        // 检查用户状态
        if (user.status !== 'ACTIVE') {
            throw this.createAccountStatusError(user.status, '账号状态异常，无法重置密码');
        }

        const { token: resetToken, expiresIn } = await issuePasswordResetToken(email, user.id);
        await sendPasswordResetNotification({
            email,
            userName: user.nickname || user.username,
            resetToken,
        });

        return {
            message: '密码重置邮件已发送到您的邮箱',
            expiresIn,
        };
    }

    /**
     * 验证重置令牌
     */
    @ServiceErrorHandler
    async verifyResetToken(token: string): Promise<{ email: string; userId: number }> {
        return readPasswordResetToken(token);
    }

    /**
     * 重置密码
     */
    @ServiceErrorHandler
    async resetPassword(params: { token: string; newPassword: string }): Promise<string> {
        const { token, newPassword } = params;

        if (!token || !newPassword) {
            throw new ValidationError('重置令牌和新密码不能为空');
        }

        if (newPassword.length < 6) {
            throw new ValidationError('密码长度不能小于6位');
        }

        // 验证重置令牌
        const tokenData = await readPasswordResetToken(token);
        const { email, userId } = tokenData;

        // 再次检查用户是否存在
        const user = await prisma.user.findUnique({
            where: { id: userId, email },
        });

        if (!user) {
            throw new UserError(ErrorCode.USER_NOT_FOUND);
        }

        // 检查用户状态
        if (user.status !== 'ACTIVE') {
            throw this.createAccountStatusError(user.status, '账号状态异常，无法重置密码');
        }

        // 更新密码
        const hashedPassword = await bcrypt.hash(newPassword, 10);
        await prisma.user.update({
            where: { id: userId },
            data: { password: hashedPassword },
        });

        // 删除使用过的重置令牌
        await clearPasswordResetToken(token);

        // 清除该用户的所有登录会话（强制重新登录）
        try {
            // 这里可以添加清除用户会话的逻辑
            // 由于当前架构使用hash作为session key，这里暂时跳过
            logger.info(`用户 ${email} 密码重置成功`);
        } catch (error) {
            logger.warn('清除用户会话失败:', error);
        }

        return '密码重置成功，请使用新密码登录';
    }

    /**
     * 注册
     */
    @ServiceErrorHandler
    async register(params: RegisterRequest, ctx: Context): Promise<string> {
        const { username, nickname, email, code, password } = params;

        if (!username || !nickname || !email || !code || !password) {
            throw new ValidationError('请填写完整信息');
        }

        if (password.length < 6) {
            throw new ValidationError('密码长度不能小于6位');
        }

        ensureValidEmail(email);

        // 分别验证用户名、昵称、邮箱是否已存在
        const userExists = await prisma.user.findUnique({
            where: {
                username,
            },
        });

        if (userExists) {
            throw new UserError(ErrorCode.USERNAME_EXISTS, '用户名已存在');
        }

        const nicknameExists = await prisma.user.findFirst({
            where: {
                nickname,
            },
        });

        if (nicknameExists) {
            throw new BusinessError(ErrorCode.RESOURCE_EXISTS, '昵称已存在');
        }

        const emailExists = await prisma.user.findUnique({
            where: {
                email,
            },
        });

        if (emailExists) {
            throw new UserError(ErrorCode.EMAIL_EXISTS, '邮箱已存在');
        }

        // 验证验证码
        await consumeEmailLoginCode(email, code);

        // 分配默认角色
        const defaultRole = await prisma.role.findFirst({
            where: {
                code: 'user',
            },
        });

        if (!defaultRole) {
            throw new NotFoundError('默认角色不存在');
        }

        // 创建用户
        await prisma.user.create({
            data: {
                username,
                nickname,
                email,
                avatar: DEFAULT_AVATAR_URL,
                password: await bcrypt.hash(password, 10),
                status: 'ACTIVE',
                userRoles: {
                    create: {
                        roleId: defaultRole.id,
                    },
                },
            },
        });

        return '注册成功';
    }
}

export const authService = new AuthService();
