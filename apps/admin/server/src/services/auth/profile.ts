import type { Context } from 'koa';
import { prisma } from '@blog/db';
import type { LoginResponse } from '../../types/auth';
import { ErrorCode, UserError } from '../../types/errors';
import { createLoginResult } from './session-manager';

export const getUserRolesAndPermissions = async (userId: number) => {
    const user = await prisma.user.findUnique({
        where: { id: userId },
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

    if (!user) {
        throw new UserError(ErrorCode.USER_NOT_FOUND);
    }

    const userRoles = user.userRoles.map((userRole) => ({
        id: userRole.role.id,
        name: userRole.role.name,
        code: userRole.role.code,
        level: userRole.role.level,
    }));

    const permissionsMap = new Map<string, LoginResponse['user']['permissions'][number]>();
    user.userRoles.forEach((userRole) => {
        userRole.role.rolePermissions.forEach((rolePermission) => {
            const permission = rolePermission.permission;
            if (permission.status === 'ACTIVE' && !permissionsMap.has(permission.code)) {
                permissionsMap.set(permission.code, {
                    code: permission.code,
                });
            }
        });
    });

    return {
        user,
        userRoles,
        permissions: Array.from(permissionsMap.values()),
    };
};

type AuthUserAccess = Awaited<ReturnType<typeof getUserRolesAndPermissions>>;

export const buildLoginResponseUser = (
    user: AuthUserAccess['user'],
    userRoles: AuthUserAccess['userRoles'],
    permissions: AuthUserAccess['permissions'],
): LoginResponse['user'] => {
    return {
        id: user.id,
        username: user.username,
        nickname: user.nickname,
        avatar: user.avatar,
        permissions,
    };
};

export const createLoginResponse = async (
    ctx: Context,
    userId: number,
    responseUserOverride?: LoginResponse['user'],
): Promise<LoginResponse> => {
    const { user, userRoles, permissions } = await getUserRolesAndPermissions(userId);
    const responseUser =
        responseUserOverride || buildLoginResponseUser(user, userRoles, permissions);

    return createLoginResult({
        ctx,
        user: responseUser,
        roleCodes: userRoles.map((role) => role.code),
    });
};
