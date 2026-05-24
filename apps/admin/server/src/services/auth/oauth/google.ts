import axios, { type AxiosRequestConfig } from 'axios';
import type { Context } from 'koa';
import { GoogleTokenResponse, GoogleUserResponse } from '../../../types/auth';
import { LoginResponse } from '../../../types/auth';
import { prisma } from '@blog/db';
import { getGoogleOAuthConfig } from '../../../config/oauth';
import { env } from '../../../config/env';
import { createLoginResult } from '../session-manager';
import { ServiceErrorHandler, TraceSpan } from '../../../utils/decorators';
import { logger } from '../../../utils/logger';
import { buildLoginResponseUser, getUserRolesAndPermissions } from '../profile';
import { nanoid } from 'nanoid';
import bcrypt from 'bcryptjs';
import { BusinessError, ErrorCode, NotFoundError, ValidationError } from '../../../types/errors';
import { runWithSpan } from '../../../telemetry/tracing';
import { ensureAdminAccess } from '../access';

function getGoogleOAuthProxyUrl() {
    return env.oauth.googleProxyUrl;
}

function getGoogleOAuthAxiosOptions(): AxiosRequestConfig {
    const proxyUrl = getGoogleOAuthProxyUrl();

    if (!proxyUrl) {
        return {};
    }

    const url = new URL(proxyUrl);
    const protocol = url.protocol.replace(':', '');
    const port = url.port ? Number.parseInt(url.port, 10) : protocol === 'https' ? 443 : 80;
    const auth =
        url.username || url.password
            ? {
                  username: decodeURIComponent(url.username),
                  password: decodeURIComponent(url.password),
              }
            : undefined;

    return {
        proxy: {
            protocol,
            host: url.hostname,
            port,
            auth,
        },
    };
}

class GoogleService {
    /**
     * 获取Google访问令牌
     */
    @TraceSpan('auth.oauth.google.token.exchange', (_code: string, source: string) => ({
        'auth.oauth.source': source,
    }))
    @ServiceErrorHandler
    private async getGoogleAccessToken(code: string, source: string): Promise<string> {
        const { clientId, clientSecret, redirectUri } = getGoogleOAuthConfig(source);
        const contentType = 'application/x-www-form-urlencoded';
        try {
            const response = await axios.post<GoogleTokenResponse>(
                'https://oauth2.googleapis.com/token',
                new URLSearchParams({
                    client_id: clientId,
                    client_secret: clientSecret,
                    code,
                    redirect_uri: redirectUri,
                    grant_type: 'authorization_code',
                }),
                {
                    headers: {
                        'Content-Type': contentType,
                    },
                    ...getGoogleOAuthAxiosOptions(),
                },
            );

            return response.data.access_token;
        } catch (error) {
            const axiosError = axios.isAxiosError(error) ? error : undefined;
            const response = axiosError?.response;

            logger.error('获取Google访问令牌失败', {
                source,
                hasProxy: Boolean(getGoogleOAuthProxyUrl()),
                status: response?.status,
                errorCode: axiosError?.code,
            });
            throw new BusinessError(ErrorCode.UNKNOWN_ERROR, '获取Google访问令牌失败');
        }
    }

    /**
     * 获取Google用户信息
     */
    @TraceSpan('auth.oauth.google.user.load')
    @ServiceErrorHandler
    private async getGoogleUserInfo(accessToken: string): Promise<GoogleUserResponse> {
        try {
            // 使用包含email信息的API端点，并指定fields参数获取email
            const response = await axios.get<GoogleUserResponse>(
                'https://www.googleapis.com/oauth2/v2/userinfo',
                {
                    headers: {
                        Authorization: `Bearer ${accessToken}`,
                    },
                    ...getGoogleOAuthAxiosOptions(),
                },
            );

            return response.data;
        } catch (error) {
            logger.error('获取Google用户信息失败', error);
            throw new BusinessError(ErrorCode.UNKNOWN_ERROR, '获取Google用户信息失败');
        }
    }

    @TraceSpan('auth.oauth.google.login', (_code: string, source: string) => ({
        'auth.oauth.source': source,
    }))
    @ServiceErrorHandler
    async googleLogin(code: string, source: string, ctx: Context): Promise<LoginResponse> {
        // 获取Google访问令牌
        const accessToken = await this.getGoogleAccessToken(code, source);
        // 获取Google用户信息
        const googleUser = await this.getGoogleUserInfo(accessToken);

        if (!googleUser.email) {
            throw new ValidationError('无法获取Google账号的邮箱信息');
        }

        // 查找是否有绑定该Google账号的用户
        const user = await runWithSpan(
            'auth.oauth.google.user.resolve',
            async () => {
                const resolvedUser = await prisma.user.findFirst({
                    where: { googleId: googleUser.id.toString() },
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
                });

                if (resolvedUser) {
                    return resolvedUser;
                }

                const existingUser = await prisma.user.findUnique({
                    where: { email: googleUser.email },
                });

                if (existingUser) {
                    return prisma.user.update({
                        where: { id: existingUser.id },
                        data: {
                            googleId: googleUser.id.toString(),
                            avatar: existingUser.avatar || googleUser.picture,
                        },
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
                    });
                }

                const defaultRole = await prisma.role.findFirst({
                    where: { code: 'user' },
                });

                if (!defaultRole) {
                    throw new NotFoundError('默认角色不存在');
                }

                const emailPrefix = googleUser.email.split('@')[0];
                let username = emailPrefix.replace(/[^a-zA-Z0-9]/g, '');
                let counter = 1;
                while (await prisma.user.findUnique({ where: { username } })) {
                    username = `${emailPrefix.replace(/[^a-zA-Z0-9]/g, '')}${counter}`;
                    counter++;
                }

                let nickname = googleUser.name || emailPrefix;
                counter = 1;
                while (await prisma.user.findFirst({ where: { nickname } })) {
                    nickname = `${googleUser.name || emailPrefix}${counter}`;
                    counter++;
                }

                return prisma.user.create({
                    data: {
                        username,
                        nickname,
                        email: googleUser.email,
                        password: await bcrypt.hash(nanoid(), 10),
                        avatar: googleUser.picture,
                        googleId: googleUser.id.toString(),
                        status: 'ACTIVE',
                        userRoles: {
                            create: {
                                roleId: defaultRole.id,
                            },
                        },
                    },
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
                });
            },
            {
                'auth.oauth.source': source,
            },
        );

        const { userRoles, permissions } = await runWithSpan(
            'auth.oauth.google.profile.load',
            () => getUserRolesAndPermissions(user.id),
            {
                'auth.user.id': user.id,
            },
        );
        if (source !== 'next') {
            ensureAdminAccess(permissions);
        }

        return runWithSpan(
            'auth.oauth.google.session.issue',
            () =>
                createLoginResult({
                    ctx,
                    user: buildLoginResponseUser(user, userRoles, permissions),
                    roleCodes: userRoles.map((role) => role.code),
                }),
            {
                'auth.user.id': user.id,
                'auth.role.count': userRoles.length,
            },
        );
    }

    /**
     * 绑定Google账号
     */
    @TraceSpan('auth.oauth.google.bind', (_userId: string, source: string) => ({
        'auth.oauth.source': source,
    }))
    @ServiceErrorHandler
    async bindGoogle(userId: string, source: string, code: string): Promise<{ googleId: string }> {
        // 获取Google访问令牌
        const accessToken = await this.getGoogleAccessToken(code, source);

        // 获取Google用户信息
        const googleUser = await this.getGoogleUserInfo(accessToken);

        // 检查是否已有用户绑定了该Google账号
        const existingUser = await prisma.user.findFirst({
            where: {
                googleId: googleUser.id,
            },
        });

        if (existingUser) {
            throw new ValidationError('该Google账号已被其他用户绑定');
        }

        // 更新用户信息，绑定Google账号
        await prisma.user.update({
            where: { id: +userId },
            data: {
                googleId: googleUser.id,
            },
        });

        return { googleId: googleUser.id };
    }

    /**
     * 解绑Google账号
     */
    @TraceSpan('auth.oauth.google.unbind', (userId: string) => ({
        'auth.user.has_id': Boolean(userId),
    }))
    @ServiceErrorHandler
    async unbindGoogle(userId: string): Promise<void> {
        // 更新用户信息，解绑Google账号
        await prisma.user.update({
            where: { id: +userId },
            data: {
                googleId: null,
            },
        });
    }
}

export const googleService = new GoogleService();
