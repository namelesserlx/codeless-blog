import {
    RoleListRequest,
    RoleListResponse,
    CreateRoleRequest,
    UpdateRoleRequest,
    RoleDetailResponse,
    RoleBatchOperationRequest,
    RolePermissionAssignRequest,
    RoleOption,
    RoleStatsResponse,
    RoleWithHierarchy,
    RolePermissionsResponse,
    RoleUsersResponse,
    RoleStatus,
    UserStatus,
    CORE_ROLE_CODES,
} from '@blog/shared';
import { prisma } from '@blog/db';
import { BusinessError, ErrorCode } from '../../../types/errors';
import { ServiceErrorHandler } from '../../../utils/decorators';
import { PermissionCacheService } from '../../../utils/auth';

const CORE_ROLE_CODE_SET = new Set<string>(CORE_ROLE_CODES);

export class RoleService {
    /**
     * 获取角色列表
     */
    @ServiceErrorHandler
    async getRoleList(params: RoleListRequest & { userId?: number }): Promise<RoleListResponse> {
        const { page, pageSize, keyword, name, code, status, level, parentId, userId } = params;

        // 构建查询条件
        const where: any = {};

        // 如果有用户ID，需要根据用户权限过滤角色
        if (userId) {
            // 获取用户的所有角色
            const userRoles = await prisma.userRole.findMany({
                where: { userId },
                include: {
                    role: true,
                },
            });

            if (userRoles.length === 0) {
                // 用户没有任何角色，返回空列表
                return {
                    list: [],
                    total: 0,
                    page,
                    pageSize,
                };
            }

            // 找到用户角色中等级最高的（level值最小的）
            const maxLevelRole = userRoles.reduce((prev, curr) =>
                curr.role.level < prev.role.level ? curr : prev,
            ).role;

            // 检查是否是超级管理员（level = 0）
            if (maxLevelRole.level === 0) {
                // 超级管理员可以查看所有角色
                // 不添加额外的where条件
            } else {
                // 普通管理员只能查看自己角色的下级角色
                // 查询条件：level > maxLevelRole.level 或者 parentId = maxLevelRole.id
                where.OR = [
                    { level: { gt: maxLevelRole.level } }, // 下级角色
                    { parentId: maxLevelRole.id }, // 直接子角色
                    { id: maxLevelRole.id }, // 包含自己的角色
                ];
            }
        }

        // 支持 keyword 统一搜索（OR 条件）
        if (keyword) {
            const keywordCondition = [
                { name: { contains: keyword } },
                { code: { contains: keyword } },
            ];

            if (where.OR) {
                // 如果已经有OR条件（权限过滤），需要合并
                where.AND = [{ OR: where.OR }, { OR: keywordCondition }];
                delete where.OR;
            } else {
                where.OR = keywordCondition;
            }
        } else {
            // 保持原有的独立搜索逻辑
            if (name) where.name = { contains: name };
            if (code) where.code = { contains: code };
        }

        if (status) where.status = status;
        if (level !== undefined) where.level = level;
        if (parentId !== undefined) where.parentId = parentId;

        // 计算总数
        const total = await prisma.role.count({ where });

        // 分页查询
        const skip = (page - 1) * pageSize;
        const roles = await prisma.role.findMany({
            where,
            include: {
                parent: true,
                children: true,
                _count: {
                    select: {
                        userRoles: true,
                        rolePermissions: true,
                    },
                },
            },
            orderBy: [{ level: 'asc' }, { createdAt: 'desc' }],
            skip,
            take: pageSize,
        });

        const list: RoleWithHierarchy[] = roles.map((role) => ({
            id: role.id,
            name: role.name,
            code: role.code,
            description: role.description,
            level: role.level,
            status: role.status as RoleStatus,
            parentId: role.parentId,
            createdAt: role.createdAt.toISOString(),
            updatedAt: role.updatedAt.toISOString(),
            parent: role.parent
                ? {
                      id: role.parent.id,
                      name: role.parent.name,
                      code: role.parent.code,
                      description: role.parent.description,
                      level: role.parent.level,
                      status: role.parent.status as RoleStatus,
                      parentId: role.parent.parentId,
                      createdAt: role.parent.createdAt.toISOString(),
                      updatedAt: role.parent.updatedAt.toISOString(),
                  }
                : undefined,
            children: role.children.map((child) => ({
                id: child.id,
                name: child.name,
                code: child.code,
                description: child.description,
                level: child.level,
                status: child.status as RoleStatus,
                parentId: child.parentId,
                createdAt: child.createdAt.toISOString(),
                updatedAt: child.updatedAt.toISOString(),
            })),
            // 添加权限统计信息
            userCount: role._count.userRoles,
            permissionCount: role._count.rolePermissions,
        }));

        return {
            list,
            total,
            page,
            pageSize,
        };
    }

    /**
     * 获取角色详情
     */
    @ServiceErrorHandler
    async getRoleDetail(id: number): Promise<RoleDetailResponse> {
        const role = await prisma.role.findUnique({
            where: { id },
            include: {
                parent: true,
                children: true,
                rolePermissions: {
                    include: {
                        permission: true,
                    },
                },
            },
        });

        if (!role) {
            // throw new BusinessError('角色不存在', 404);
            throw new BusinessError(ErrorCode.RESOURCE_NOT_FOUND);
        }

        return {
            id: role.id,
            name: role.name,
            code: role.code,
            description: role.description,
            level: role.level,
            status: role.status as RoleStatus,
            parentId: role.parentId,
            createdAt: role.createdAt.toISOString(),
            updatedAt: role.updatedAt.toISOString(),
            parent: role.parent
                ? {
                      id: role.parent.id,
                      name: role.parent.name,
                      code: role.parent.code,
                      description: role.parent.description,
                      level: role.parent.level,
                      status: role.parent.status as RoleStatus,
                      parentId: role.parent.parentId,
                      createdAt: role.parent.createdAt.toISOString(),
                      updatedAt: role.parent.updatedAt.toISOString(),
                  }
                : undefined,
            children: role.children.map((child) => ({
                id: child.id,
                name: child.name,
                code: child.code,
                description: child.description,
                level: child.level,
                status: child.status as RoleStatus,
                parentId: child.parentId,
                createdAt: child.createdAt.toISOString(),
                updatedAt: child.updatedAt.toISOString(),
            })),
            rolePermissions: role.rolePermissions.map((rp) => ({
                permission: {
                    id: rp.permission.id,
                    name: rp.permission.name,
                    code: rp.permission.code,
                    type: rp.permission.type,
                },
            })),
        };
    }

    /**
     * 创建角色
     */
    @ServiceErrorHandler
    async createRole(data: CreateRoleRequest) {
        const {
            name,
            code,
            description,
            level = 0,
            status = RoleStatus.ACTIVE,
            parentId,
            permissionIds,
        } = data;

        // 检查角色代码是否已存在
        const existingRole = await prisma.role.findUnique({
            where: { code },
        });
        if (existingRole) {
            throw new BusinessError(ErrorCode.RESOURCE_EXISTS);
        }

        // 检查角色名称是否已存在
        const existingName = await prisma.role.findFirst({
            where: { name },
        });
        if (existingName) {
            throw new BusinessError(ErrorCode.ROLE_NAME_EXISTS);
        }

        // 如果指定了父角色，检查父角色是否存在
        if (parentId) {
            const parentRole = await prisma.role.findUnique({
                where: { id: parentId },
            });
            if (!parentRole) {
                throw new BusinessError(ErrorCode.PARENT_ROLE_NOT_FOUND);
            }
        }

        // 创建角色
        const role = await prisma.role.create({
            data: {
                name,
                code,
                description,
                level,
                status,
                parentId,
            },
        });

        // 如果有权限ID，分配权限
        if (permissionIds && permissionIds.length > 0) {
            await this.assignPermissions({ roleId: role.id, permissionIds });
        }

        return role;
    }

    /**
     * 更新角色
     */
    @ServiceErrorHandler
    async updateRole(data: UpdateRoleRequest) {
        const { id, permissionIds, ...updateData } = data;

        // 检查角色是否存在
        const existingRole = await prisma.role.findUnique({
            where: { id },
        });
        if (!existingRole) {
            throw new BusinessError(ErrorCode.RESOURCE_NOT_FOUND);
        }

        // 如果更新代码，检查是否重复
        if (updateData.code && updateData.code !== existingRole.code) {
            const codeExists = await prisma.role.findFirst({
                where: {
                    code: updateData.code,
                    id: { not: id },
                },
            });
            if (codeExists) {
                throw new BusinessError(ErrorCode.RESOURCE_EXISTS);
            }
        }

        // 如果更新名称，检查是否重复
        if (updateData.name && updateData.name !== existingRole.name) {
            const nameExists = await prisma.role.findFirst({
                where: {
                    name: updateData.name,
                    id: { not: id },
                },
            });
            if (nameExists) {
                throw new BusinessError(ErrorCode.ROLE_NAME_EXISTS);
            }
        }

        // 如果指定了父角色，检查父角色是否存在
        if (updateData.parentId) {
            const parentRole = await prisma.role.findUnique({
                where: { id: updateData.parentId },
            });
            if (!parentRole) {
                throw new BusinessError(ErrorCode.PARENT_ROLE_NOT_FOUND);
            }
        }

        // 更新角色
        const role = await prisma.role.update({
            where: { id },
            data: updateData,
        });

        // 如果有权限ID，重新分配权限
        if (permissionIds !== undefined) {
            await this.assignPermissions({ roleId: id, permissionIds });
        }

        return role;
    }

    /**
     * 删除角色
     */
    @ServiceErrorHandler
    async deleteRole(id: number) {
        // 检查角色是否存在
        const role = await prisma.role.findUnique({
            where: { id },
            include: {
                userRoles: true,
                children: true,
            },
        });

        if (!role) {
            throw new BusinessError(ErrorCode.RESOURCE_NOT_FOUND);
        }

        if (CORE_ROLE_CODE_SET.has(role.code)) {
            throw new BusinessError(ErrorCode.CORE_ROLE_CANNOT_DELETE);
        }

        // 检查是否有用户使用该角色
        if (role.userRoles.length > 0) {
            throw new BusinessError(ErrorCode.ROLE_HAS_USERS);
        }

        // 检查是否有子角色
        if (role.children.length > 0) {
            throw new BusinessError(ErrorCode.ROLE_HAS_CHILDREN);
        }

        // 删除角色权限关联
        await prisma.rolePermission.deleteMany({
            where: { roleId: id },
        });

        // 删除角色
        await prisma.role.delete({
            where: { id },
        });
    }

    /**
     * 批量操作角色
     */
    @ServiceErrorHandler
    async batchOperation(data: RoleBatchOperationRequest) {
        const { ids, action } = data;

        switch (action) {
            case 'delete':
                // 批量删除前检查
                for (const id of ids) {
                    await this.deleteRole(id);
                }
                break;
            case 'activate':
                await prisma.role.updateMany({
                    where: { id: { in: ids } },
                    data: { status: RoleStatus.ACTIVE },
                });
                break;
            case 'deactivate':
                await prisma.role.updateMany({
                    where: { id: { in: ids } },
                    data: { status: RoleStatus.INACTIVE },
                });
                break;
            default:
                throw new BusinessError(ErrorCode.UNSUPPORTED_OPERATION);
        }
    }

    /**
     * 获取角色选项
     */
    @ServiceErrorHandler
    async getRoleOptions(): Promise<RoleOption[]> {
        const roles = await prisma.role.findMany({
            where: { status: RoleStatus.ACTIVE },
            orderBy: [{ level: 'asc' }, { name: 'asc' }],
        });

        return roles.map((role) => ({
            id: role.id,
            name: role.name,
            code: role.code,
            description: role.description,
            level: role.level,
        }));
    }

    /**
     * 获取角色统计信息
     */
    @ServiceErrorHandler
    async getRoleStats(): Promise<RoleStatsResponse> {
        const [total, active, inactive] = await Promise.all([
            prisma.role.count(),
            prisma.role.count({ where: { status: RoleStatus.ACTIVE } }),
            prisma.role.count({ where: { status: RoleStatus.INACTIVE } }),
        ]);

        return {
            total,
            active,
            inactive,
        };
    }

    /**
     * 获取角色权限
     */
    @ServiceErrorHandler
    async getRolePermissions(roleId: number): Promise<RolePermissionsResponse> {
        // 检查角色是否存在
        const role = await prisma.role.findUnique({
            where: { id: roleId },
            include: {
                rolePermissions: {
                    include: {
                        permission: true,
                    },
                },
            },
        });

        if (!role) {
            throw new BusinessError(ErrorCode.RESOURCE_NOT_FOUND);
        }

        // 获取所有权限构建树形结构
        const allPermissions = await prisma.permission.findMany({
            orderBy: [{ sort: 'asc' }, { id: 'asc' }],
        });

        // 角色已有的权限ID
        const rolePermissionIds = role.rolePermissions.map((rp) => rp.permission.id);

        // 构建权限树
        const buildTree = (parentId: number | null = null): any[] => {
            return allPermissions
                .filter((p) => p.parentId === parentId)
                .map((permission) => ({
                    id: permission.id,
                    name: permission.name,
                    code: permission.code,
                    type: permission.type,
                    resource: permission.resource,
                    action: permission.action,
                    path: permission.path,
                    component: permission.component,
                    icon: permission.icon,
                    sort: permission.sort,
                    status: permission.status,
                    parentId: permission.parentId,
                    createdAt: permission.createdAt.toISOString(),
                    updatedAt: permission.updatedAt.toISOString(),
                    checked: rolePermissionIds.includes(permission.id),
                    children: buildTree(permission.id),
                }));
        };

        const permissions = buildTree();

        return {
            roleId,
            permissionIds: rolePermissionIds,
            permissions,
        };
    }

    /**
     * 获取角色下的用户
     */
    @ServiceErrorHandler
    async getRoleUsers(roleId: number): Promise<RoleUsersResponse> {
        const role = await prisma.role.findUnique({
            where: { id: roleId },
            select: { id: true },
        });

        if (!role) {
            throw new BusinessError(ErrorCode.RESOURCE_NOT_FOUND);
        }

        const userRoles = await prisma.userRole.findMany({
            where: {
                roleId,
                user: {
                    status: { not: UserStatus.DELETED },
                },
            },
            include: {
                user: true,
            },
            orderBy: { createdAt: 'desc' },
        });

        return {
            list: userRoles.map(({ user }) => ({
                id: user.id,
                username: user.username,
                email: user.email,
                nickname: user.nickname,
                avatar: user.avatar,
                bio: user.bio,
                address: user.address,
                status: user.status as UserStatus,
                createdAt: user.createdAt.toISOString(),
                updatedAt: user.updatedAt.toISOString(),
                phone: user.phone,
                githubId: user.githubId,
                googleId: user.googleId,
            })),
            total: userRoles.length,
        };
    }

    /**
     * 从角色移除用户
     */
    @ServiceErrorHandler
    async removeUserFromRole(roleId: number, userId: number): Promise<void> {
        const result = await prisma.userRole.deleteMany({
            where: {
                roleId,
                userId,
            },
        });

        if (result.count === 0) {
            throw new BusinessError(ErrorCode.RESOURCE_NOT_FOUND);
        }

        await PermissionCacheService.clearPermissionCache([userId]);
    }

    /**
     * 分配角色权限
     */
    @ServiceErrorHandler
    async assignPermissions(data: RolePermissionAssignRequest) {
        const { roleId, permissionIds } = data;

        // 检查角色是否存在
        const role = await prisma.role.findUnique({
            where: { id: roleId },
        });
        if (!role) {
            throw new BusinessError(ErrorCode.RESOURCE_NOT_FOUND);
        }

        // 检查权限是否存在
        if (permissionIds.length > 0) {
            const permissions = await prisma.permission.findMany({
                where: { id: { in: permissionIds } },
            });
            if (permissions.length !== permissionIds.length) {
                throw new BusinessError(ErrorCode.SOME_PERMISSIONS_NOT_FOUND);
            }
        }

        // 删除原有权限关联
        await prisma.rolePermission.deleteMany({
            where: { roleId },
        });

        // 创建新的权限关联
        if (permissionIds.length > 0) {
            await prisma.rolePermission.createMany({
                data: permissionIds.map((permissionId) => ({
                    roleId,
                    permissionId,
                })),
            });
        }

        const roleUsers = await prisma.userRole.findMany({
            where: { roleId },
            select: { userId: true },
        });
        await PermissionCacheService.clearPermissionCache(roleUsers.map((user) => user.userId));
    }

    /**
     * 检查角色代码是否可用
     */
    @ServiceErrorHandler
    async checkCode(code: string, excludeId?: number): Promise<{ available: boolean }> {
        const where: any = { code };
        if (excludeId) {
            where.id = { not: excludeId };
        }

        const existingRole = await prisma.role.findFirst({ where });
        return { available: !existingRole };
    }
}

export const roleService = new RoleService();
