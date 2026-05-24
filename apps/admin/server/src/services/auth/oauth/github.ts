import axios from 'axios';
import type { Context } from 'koa';
import { GithubTokenResponse, GithubUserResponse } from '../../../types/auth';
import { LoginResponse } from '../../../types/auth';
import { prisma } from '@blog/db';
import { getGithubOAuthConfig } from '../../../config/oauth';
import { createLoginResult } from '../session-manager';
import { ServiceErrorHandler, TraceSpan } from '../../../utils/decorators';
import { logger } from '../../../utils/logger';
import { buildLoginResponseUser, getUserRolesAndPermissions } from '../profile';
import bcrypt from 'bcryptjs';
import { nanoid } from 'nanoid';
import { BusinessError, ErrorCode, NotFoundError, ValidationError } from '../../../types/errors';
import { runWithSpan } from '../../../telemetry/tracing';
import { ensureAdminAccess } from '../access';

class GithubService {
    /**
     * 获取GitHub访问令牌
     */
    @TraceSpan('auth.oauth.github.token.exchange', (_code: string, source: string) => ({
        'auth.oauth.source': source,
    }))
    @ServiceErrorHandler
    private async getGithubAccessToken(code: string, source: string): Promise<string> {
        try {
            const { clientId, clientSecret } = getGithubOAuthConfig(source);
            const response = await axios.post<GithubTokenResponse>(
                'https://github.com/login/oauth/access_token',
                {
                    client_id: clientId,
                    client_secret: clientSecret,
                    code,
                },
                {
                    headers: {
                        Accept: 'application/json',
                    },
                },
            );

            return response.data.access_token;
        } catch (error) {
            logger.error('获取GitHub访问令牌失败', error);
            throw new BusinessError(ErrorCode.UNKNOWN_ERROR, '获取GitHub访问令牌失败');
        }
    }

    /**
     * 获取GitHub用户信息
     */
    @TraceSpan('auth.oauth.github.user.load')
    @ServiceErrorHandler
    private async getGithubUserInfo(accessToken: string): Promise<GithubUserResponse> {
        try {
            const response = await axios.get<GithubUserResponse>('https://api.github.com/user', {
                headers: {
                    Authorization: `token ${accessToken}`,
                },
            });

            return response.data;
        } catch (error) {
            logger.error('获取GitHub用户信息失败', error);
            throw new BusinessError(ErrorCode.UNKNOWN_ERROR, '获取GitHub用户信息失败');
        }
    }

    /**
     * 获取GitHub用户的邮箱信息
     */
    @TraceSpan('auth.oauth.github.email.load')
    @ServiceErrorHandler
    private async getGithubUserEmail(
        accessToken: string,
    ): Promise<{ email: string; primary: boolean }[]> {
        try {
            const response = await axios.get<{ email: string; primary: boolean }[]>(
                'https://api.github.com/user/emails',
                {
                    headers: {
                        Authorization: `token ${accessToken}`,
                    },
                },
            );
            return response.data;
        } catch (error) {
            logger.error('获取GitHub用户邮箱信息失败', error);
            throw new BusinessError(ErrorCode.UNKNOWN_ERROR, '获取GitHub用户邮箱信息失败');
        }
    }

    /**
     * GitHub登录
     */
    @TraceSpan('auth.oauth.github.login', (_code: string, source: string) => ({
        'auth.oauth.source': source,
    }))
    @ServiceErrorHandler
    async githubLogin(code: string, source: string, ctx: Context): Promise<LoginResponse> {
        // 获取GitHub访问令牌
        const accessToken = await this.getGithubAccessToken(code, source);

        // 获取GitHub用户信息
        const githubUser = await this.getGithubUserInfo(accessToken);

        // 获取GitHub用户的邮箱信息
        const githubEmail = await this.getGithubUserEmail(accessToken);
        const primaryEmail = await runWithSpan(
            'auth.oauth.github.email.resolve',
            () => githubEmail.find((email) => email.primary)?.email || githubUser.email,
            {
                'auth.oauth.github.email_count': githubEmail.length,
            },
        );

        if (!primaryEmail) {
            throw new ValidationError(
                '无法获取GitHub账号的邮箱信息，请确保您的GitHub账号设置了公开邮箱',
            );
        }

        // 查找是否有绑定该GitHub账号的用户
        const user = await runWithSpan(
            'auth.oauth.github.user.resolve',
            async () => {
                const resolvedUser = await prisma.user.findFirst({
                    where: { githubId: githubUser.id.toString() },
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
                    where: { email: primaryEmail },
                });

                if (existingUser) {
                    return prisma.user.update({
                        where: { id: existingUser.id },
                        data: {
                            githubId: githubUser.id.toString(),
                            avatar: existingUser.avatar || githubUser.avatar_url,
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

                let username = githubUser.login;
                let counter = 1;
                while (await prisma.user.findUnique({ where: { username } })) {
                    username = `${githubUser.login}${counter}`;
                    counter++;
                }

                let nickname = githubUser.name || githubUser.login;
                counter = 1;
                while (await prisma.user.findFirst({ where: { nickname } })) {
                    nickname = `${githubUser.name || githubUser.login}${counter}`;
                    counter++;
                }

                return prisma.user.create({
                    data: {
                        username,
                        nickname,
                        email: primaryEmail,
                        password: await bcrypt.hash(nanoid(), 10),
                        avatar: githubUser.avatar_url,
                        githubId: githubUser.id.toString(),
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
            'auth.oauth.github.profile.load',
            () => getUserRolesAndPermissions(user.id),
            {
                'auth.user.id': user.id,
            },
        );
        if (source !== 'next') {
            ensureAdminAccess(permissions);
        }

        return runWithSpan(
            'auth.oauth.github.session.issue',
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
     * 绑定GitHub账号
     */
    @TraceSpan('auth.oauth.github.bind', (_userId: string, source: string) => ({
        'auth.oauth.source': source,
    }))
    @ServiceErrorHandler
    async bindGithub(userId: string, source: string, code: string): Promise<{ githubId: string }> {
        // 获取GitHub访问令牌
        const accessToken = await this.getGithubAccessToken(code, source);

        // 获取GitHub用户信息
        const githubUser = await this.getGithubUserInfo(accessToken);

        // 检查是否已有用户绑定了该GitHub账号
        const existingUser = await prisma.user.findFirst({
            where: { githubId: githubUser.id.toString() },
        });

        if (existingUser) {
            throw new ValidationError('该GitHub账号已被其他用户绑定');
        }

        // 更新用户信息，绑定GitHub账号
        await prisma.user.update({
            where: { id: +userId },
            data: {
                githubId: githubUser.id.toString(),
            },
        });

        return { githubId: githubUser.id.toString() };
    }

    /**
     * 解绑GitHub账号
     */
    @TraceSpan('auth.oauth.github.unbind', (userId: string) => ({
        'auth.user.has_id': Boolean(userId),
    }))
    @ServiceErrorHandler
    async unbindGithub(userId: string): Promise<void> {
        logger.info('解绑GitHub账号', {
            userId,
        });
        // 更新用户信息，解绑GitHub账号
        await prisma.user.update({
            where: { id: +userId },
            data: {
                githubId: null,
            },
        });
    }
}

export const githubService = new GithubService();
