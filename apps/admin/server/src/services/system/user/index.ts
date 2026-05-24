import { prisma } from '@blog/db';
import bcrypt from 'bcryptjs';
import {
    UserListRequest,
    UserListResponse,
    CreateUserRequest,
    UpdateUserRequest,
    UserStatus,
    BatchOperationRequest,
    UserWithRoles,
} from '@blog/shared';
import { ServiceErrorHandler, ValidateParams } from '../../../utils/decorators';
import { UserError, ValidationError, ErrorCode } from '../../../types/errors';
import { getStorage } from '../../../lib/storage';
import { logger } from '../../../utils/logger';
import { emailNotificationService } from '../../email/notification';
import { PermissionCacheService } from '../../../utils/auth';

type UserFindManyArgs = NonNullable<Parameters<typeof prisma.user.findMany>[0]>;
type UserWhereInput = NonNullable<UserFindManyArgs['where']>;

export class UserService {
    // 获取用户列表
    @ServiceErrorHandler
    async getUserList(params: UserListRequest): Promise<UserListResponse> {
        const {
            page = 1,
            pageSize = 10,
            username,
            email,
            nickname,
            status,
            startTime,
            endTime,
        } = params;

        const skip = (page - 1) * pageSize;
        const where: UserWhereInput = {};

        // 构建查询条件
        if (username) {
            where.username = { contains: username };
        }
        if (email) {
            where.email = { contains: email };
        }
        if (nickname) {
            where.nickname = { contains: nickname };
        }
        if (status) {
            where.status = status;
        } else {
            where.status = { not: UserStatus.DELETED };
        }
        if (startTime && endTime) {
            const createdAt: { gte: Date; lte: Date } = {
                gte: new Date(startTime),
                lte: new Date(endTime),
            };
            where.createdAt = createdAt;
        }

        // 查询用户列表
        const [userList, total] = await Promise.all([
            prisma.user.findMany({
                where,
                skip,
                take: pageSize,
                include: {
                    userRoles: {
                        include: {
                            role: {
                                select: {
                                    id: true,
                                    name: true,
                                    code: true,
                                },
                            },
                        },
                    },
                },
                orderBy: { createdAt: 'desc' },
            }),
            prisma.user.count({ where }),
        ]);

        // 转换数据格式以匹配接口类型
        const list: UserWithRoles[] = userList.map((user) => ({
            id: user.id,
            username: user.username,
            email: user.email,
            nickname: user.nickname,
            avatar: user.avatar,
            bio: user.bio,
            address: user.address,
            status: user.status as UserStatus, // 类型转换
            createdAt: user.createdAt.toISOString(),
            updatedAt: user.updatedAt.toISOString(),
            userRoles: user.userRoles.map((userRole) => ({
                role: {
                    id: userRole.role.id,
                    name: userRole.role.name,
                    code: userRole.role.code,
                },
            })),
        }));

        return {
            list,
            total,
            page,
            pageSize,
        };
    }

    // 获取用户详情
    @ServiceErrorHandler
    @ValidateParams((args) => {
        const [params] = args;
        const { id } = params;
        if (!id || isNaN(id)) {
            throw new ValidationError('无效的用户ID');
        }
    })
    async getUserDetail(id: number): Promise<UserWithRoles> {
        const user = await prisma.user.findUnique({
            where: { id },
            include: {
                userRoles: {
                    include: {
                        role: {
                            select: {
                                id: true,
                                name: true,
                                code: true,
                            },
                        },
                    },
                },
            },
        });

        if (!user) {
            throw new UserError(ErrorCode.USER_NOT_FOUND);
        }

        // 转换数据格式
        return {
            id: user.id,
            username: user.username,
            email: user.email,
            nickname: user.nickname,
            avatar: user.avatar,
            bio: user.bio,
            address: user.address,
            phone: user.phone,
            githubId: user.githubId,
            googleId: user.googleId,
            status: user.status as UserStatus,
            createdAt: user.createdAt.toISOString(),
            updatedAt: user.updatedAt.toISOString(),
            userRoles: user.userRoles.map((userRole) => ({
                role: {
                    id: userRole.role.id,
                    name: userRole.role.name,
                    code: userRole.role.code,
                },
            })),
        };
    }

    // 创建用户
    @ServiceErrorHandler
    async createUser(data: CreateUserRequest) {
        delete data.confirmPassword;
        const { username, email, password, roleIds, ...userData } = data;

        if (!username || !email || !password) {
            throw new ValidationError('用户名、邮箱和密码不能为空');
        }

        // 检查用户名和邮箱是否已存在
        const existingUser = await prisma.user.findFirst({
            where: {
                OR: [{ username }, { email }],
            },
        });

        if (existingUser) {
            if (existingUser.username === username) {
                throw new UserError(ErrorCode.USERNAME_EXISTS);
            }
            if (existingUser.email === email) {
                throw new UserError(ErrorCode.EMAIL_EXISTS);
            }
        }

        try {
            const hashedPassword = await bcrypt.hash(password, 10);
            const user = await prisma.$transaction(async (tx) => {
                const createdUser = await tx.user.create({
                    data: {
                        username,
                        email,
                        password: hashedPassword,
                        ...userData,
                        status: userData.status || UserStatus.ACTIVE,
                    },
                });

                if (roleIds && roleIds.length > 0) {
                    await tx.userRole.createMany({
                        data: roleIds.map((roleId) => ({
                            userId: createdUser.id,
                            roleId,
                        })),
                    });
                }

                return createdUser;
            });

            await emailNotificationService.sendWelcomeEmail({
                email: user.email,
                username: user.username,
            });

            return user;
        } catch (error) {
            logger.error('创建用户失败', error);
            throw error;
        }
    }

    // 更新用户
    @ServiceErrorHandler
    async updateUser(data: UpdateUserRequest) {
        const { id, roleIds, ...updateData } = data;

        if (!id || isNaN(id)) {
            throw new UserError(ErrorCode.INVALID_USER_ID);
        }

        const user = await prisma.user.findUnique({
            where: { id },
        });

        if (!user) {
            throw new UserError(ErrorCode.USER_NOT_FOUND);
        }

        // 检查用户名和邮箱是否冲突
        if (updateData.username || updateData.email) {
            const existingUser = await prisma.user.findFirst({
                where: {
                    AND: [
                        { id: { not: id } },
                        {
                            OR: [
                                updateData.username ? { username: updateData.username } : {},
                                updateData.email ? { email: updateData.email } : {},
                            ].filter((condition) => Object.keys(condition).length > 0),
                        },
                    ],
                },
            });

            if (existingUser) {
                if (existingUser.username === updateData.username) {
                    throw new UserError(ErrorCode.USERNAME_EXISTS);
                }
                if (existingUser.email === updateData.email) {
                    throw new UserError(ErrorCode.EMAIL_EXISTS);
                }
            }
        }

        // 更新用户信息
        const updatedUser = await prisma.user.update({
            where: { id },
            data: updateData,
        });

        // 更新角色关联
        if (roleIds !== undefined) {
            // 删除现有角色关联
            await prisma.userRole.deleteMany({
                where: { userId: id },
            });

            // 添加新的角色关联
            if (roleIds.length > 0) {
                await prisma.userRole.createMany({
                    data: roleIds.map((roleId) => ({
                        userId: id,
                        roleId,
                    })),
                });
            }

            await PermissionCacheService.clearPermissionCache([id]);
        }

        return {
            ...updatedUser,
            password: undefined,
        };
    }

    // 删除用户
    @ServiceErrorHandler
    async deleteUser(id: number) {
        if (!id || isNaN(id)) {
            throw new UserError(ErrorCode.INVALID_USER_ID);
        }

        const user = await prisma.user.findUnique({
            where: { id },
        });

        if (!user) {
            throw new UserError(ErrorCode.USER_NOT_FOUND);
        }

        // 检查是否为超级管理员
        const isSuperAdmin = await prisma.userRole.findFirst({
            where: {
                userId: id,
                role: {
                    code: 'super_admin',
                },
            },
        });

        if (isSuperAdmin) {
            throw new UserError(ErrorCode.CANNOT_DELETE_SUPER_ADMIN);
        }

        await prisma.$transaction(async (tx) => {
            await tx.user.update({
                where: { id },
                data: { status: UserStatus.DELETED },
            });

            await tx.userRole.deleteMany({
                where: { userId: id },
            });
        });

        await PermissionCacheService.clearPermissionCache([id]);
    }

    // 更新用户头像
    @ServiceErrorHandler
    async updateAvatar(data: {
        userId: number;
        file: {
            fieldname: string;
            buffer: Buffer;
            originalname: string;
            mimetype: string;
            size: number;
        };
    }) {
        const { userId, file } = data;

        if (!file) {
            throw new ValidationError('请上传头像文件');
        }

        // 通过存储抽象层上传
        const fileUrl = await getStorage().upload({
            buffer: file.buffer,
            originalName: file.originalname,
            mimeType: file.mimetype,
            category: 'image',
            entityType: 'avatars',
            entityId: userId,
        });

        await prisma.user.update({
            where: { id: userId },
            data: { avatar: fileUrl },
        });

        return {
            avatar: fileUrl,
        };
    }

    // 批量操作
    @ServiceErrorHandler
    async batchOperation(data: BatchOperationRequest) {
        const { ids, action } = data;

        // 检查是否包含超级管理员
        if (action === 'delete') {
            const superAdminUsers = await prisma.userRole.findMany({
                where: {
                    userId: { in: ids },
                    role: {
                        code: 'super_admin',
                    },
                },
            });

            if (superAdminUsers.length > 0) {
                throw new UserError(ErrorCode.CANNOT_DELETE_SUPER_ADMIN);
            }
        }

        switch (action) {
            case 'delete':
                await prisma.$transaction(async (tx) => {
                    await tx.user.updateMany({
                        where: { id: { in: ids } },
                        data: { status: UserStatus.DELETED },
                    });

                    await tx.userRole.deleteMany({
                        where: { userId: { in: ids } },
                    });
                });
                await PermissionCacheService.clearPermissionCache(ids);
                break;
            case 'activate':
                await prisma.user.updateMany({
                    where: { id: { in: ids } },
                    data: { status: UserStatus.ACTIVE },
                });
                break;
            case 'deactivate':
                await prisma.user.updateMany({
                    where: { id: { in: ids } },
                    data: { status: UserStatus.INACTIVE },
                });
                break;
            case 'ban':
                await prisma.user.updateMany({
                    where: { id: { in: ids } },
                    data: { status: UserStatus.BANNED },
                });
                break;
        }
    }

    // 获取角色选项
    @ServiceErrorHandler
    async getRoleOptions() {
        return await prisma.role.findMany({
            where: { status: 'ACTIVE' },
            select: {
                id: true,
                name: true,
                code: true,
                description: true,
            },
            orderBy: { level: 'asc' },
        });
    }

    // 检查用户名是否可用
    @ServiceErrorHandler
    async checkUsername(username: string, excludeId?: number) {
        const where: UserWhereInput = { username };
        if (excludeId) {
            where.id = { not: excludeId };
        }

        const existingUser = await prisma.user.findFirst({ where });
        return { available: !existingUser };
    }

    // 检查邮箱是否可用
    @ServiceErrorHandler
    async checkEmail(email: string, excludeId?: number) {
        const where: UserWhereInput = { email };
        if (excludeId) {
            where.id = { not: excludeId };
        }

        const existingUser = await prisma.user.findFirst({ where });
        return { available: !existingUser };
    }

    // 获取用户统计信息
    @ServiceErrorHandler
    async getUserStats() {
        const [total, active, inactive, banned] = await Promise.all([
            prisma.user.count({ where: { status: { not: UserStatus.DELETED } } }),
            prisma.user.count({ where: { status: UserStatus.ACTIVE } }),
            prisma.user.count({ where: { status: UserStatus.INACTIVE } }),
            prisma.user.count({ where: { status: UserStatus.BANNED } }),
        ]);

        return { total, active, inactive, banned };
    }
}

export const userService = new UserService();
