import { PermissionStatus, PermissionType, prisma } from '@blog/db';
import {
    PermissionListRequest,
    PermissionListResponse,
    PermissionTreeResponse,
    CreatePermissionRequest,
    UpdatePermissionRequest,
    PermissionDetailResponse,
    PermissionBatchOperationRequest,
    PermissionOption,
    PermissionStatsResponse,
    PermissionWithHierarchy,
    PermissionTreeNode,
    PermissionType as SharedPermissionType,
    PermissionStatus as SharedPermissionStatus,
    Permission as SharedPermission,
} from '@blog/shared';
import { BusinessError, ErrorCode } from '../../../types/errors';
import { ServiceErrorHandler } from '../../../utils/decorators';
import { PermissionCacheService } from '../../../utils/auth';

// 类型转换辅助函数
function convertPermissionType(type: PermissionType): SharedPermissionType {
    return type as unknown as SharedPermissionType;
}

function convertPermissionStatus(status: PermissionStatus): SharedPermissionStatus {
    return status as unknown as SharedPermissionStatus;
}

function convertToSharedPermission(permission: any): SharedPermission {
    return {
        id: permission.id,
        name: permission.name,
        code: permission.code,
        type: convertPermissionType(permission.type),
        resource: permission.resource,
        action: permission.action,
        path: permission.path,
        component: permission.component,
        icon: permission.icon,
        sort: permission.sort,
        status: convertPermissionStatus(permission.status),
        parentId: permission.parentId,
        createdAt: permission.createdAt.toISOString(),
        updatedAt: permission.updatedAt.toISOString(),
    };
}

export class PermissionService {
    private async assignPermissionToSuperAdmin(permissionId: number): Promise<void> {
        const superAdminRoles = await prisma.role.findMany({
            where: { code: 'super_admin' },
            select: {
                id: true,
                userRoles: {
                    select: { userId: true },
                },
            },
        });

        if (superAdminRoles.length === 0) return;

        await prisma.rolePermission.createMany({
            data: superAdminRoles.map((role) => ({
                roleId: role.id,
                permissionId,
            })),
            skipDuplicates: true,
        });

        const userIds = Array.from(
            new Set(
                superAdminRoles.flatMap((role) =>
                    role.userRoles.map((userRole) => userRole.userId),
                ),
            ),
        );
        try {
            await PermissionCacheService.clearPermissionCache(userIds);
        } catch {
            // 权限已写入数据库；缓存清理失败时由登录/后续请求自然刷新。
        }
    }

    /**
     * 获取权限列表
     */
    @ServiceErrorHandler
    async getPermissionList(params: PermissionListRequest): Promise<PermissionListResponse> {
        const { page, pageSize, name, code, type, status, parentId, tree } = params;

        // 构建查询条件
        const where: any = {};
        if (name) where.name = { contains: name };
        if (code) where.code = { contains: code };
        if (type) where.type = type;
        if (status) where.status = status;
        if (parentId !== undefined) where.parentId = parentId;

        if (tree) {
            // 返回树形结构
            const allPermissions = await prisma.permission.findMany({
                where,
                include: {
                    parent: true,
                    children: true,
                },
                orderBy: [{ sort: 'asc' }, { createdAt: 'desc' }],
            });

            const list = this.buildPermissionTree(allPermissions);
            return {
                list,
                total: allPermissions.length,
            };
        } else {
            // 分页列表
            const total = await prisma.permission.count({ where });
            const skip = page ? (page - 1) * (pageSize || 10) : 0;
            const take = pageSize || 10;

            const permissions = await prisma.permission.findMany({
                where,
                include: {
                    parent: true,
                    children: true,
                },
                orderBy: [{ sort: 'asc' }, { createdAt: 'desc' }],
                skip,
                take,
            });

            const list: PermissionWithHierarchy[] = permissions.map((permission) => ({
                id: permission.id,
                name: permission.name,
                code: permission.code,
                type: convertPermissionType(permission.type),
                resource: permission.resource,
                action: permission.action,
                path: permission.path,
                component: permission.component,
                icon: permission.icon,
                sort: permission.sort,
                status: convertPermissionStatus(permission.status),
                parentId: permission.parentId,
                createdAt: permission.createdAt.toISOString(),
                updatedAt: permission.updatedAt.toISOString(),
                parent: permission.parent
                    ? convertToSharedPermission(permission.parent)
                    : undefined,
                children: permission.children.map((child) => convertToSharedPermission(child)),
            }));

            return {
                list,
                total,
                page,
                pageSize,
            };
        }
    }

    /**
     * 获取权限树
     */
    @ServiceErrorHandler
    async getPermissionTree(params: {
        status?: string;
        type?: string;
    }): Promise<PermissionTreeResponse> {
        const { status, type } = params;

        const where: any = {};
        if (status) where.status = status;
        if (type) where.type = type;

        const permissions = await prisma.permission.findMany({
            where,
            orderBy: [{ sort: 'asc' }, { id: 'asc' }],
        });

        const tree = this.buildTree(permissions);

        return {
            tree,
            total: permissions.length,
        };
    }

    /**
     * 构建权限树
     */
    private buildPermissionTree(permissions: any[]): PermissionWithHierarchy[] {
        const map = new Map();
        const result: PermissionWithHierarchy[] = [];

        // 先创建所有节点
        permissions.forEach((permission) => {
            const node: PermissionWithHierarchy = {
                id: permission.id,
                name: permission.name,
                code: permission.code,
                type: convertPermissionType(permission.type),
                resource: permission.resource,
                action: permission.action,
                path: permission.path,
                component: permission.component,
                icon: permission.icon,
                sort: permission.sort,
                status: convertPermissionStatus(permission.status),
                parentId: permission.parentId,
                createdAt: permission.createdAt.toISOString(),
                updatedAt: permission.updatedAt.toISOString(),
                children: [],
            };
            map.set(permission.id, node);
        });

        // 构建树形结构
        permissions.forEach((permission) => {
            const node = map.get(permission.id);
            if (permission.parentId) {
                const parent = map.get(permission.parentId);
                if (parent) {
                    parent.children = parent.children || [];
                    parent.children.push(node);
                }
            } else {
                result.push(node);
            }
        });

        return result;
    }

    /**
     * 构建权限树节点
     */
    private buildTree(permissions: any[], parentId: number | null = null): PermissionTreeNode[] {
        return permissions
            .filter((p) => p.parentId === parentId)
            .map((permission) => ({
                id: permission.id,
                name: permission.name,
                code: permission.code,
                type: convertPermissionType(permission.type),
                resource: permission.resource,
                action: permission.action,
                path: permission.path,
                component: permission.component,
                icon: permission.icon,
                sort: permission.sort,
                status: convertPermissionStatus(permission.status),
                parentId: permission.parentId,
                createdAt: permission.createdAt.toISOString(),
                updatedAt: permission.updatedAt.toISOString(),
                children: this.buildTree(permissions, permission.id),
            }));
    }

    /**
     * 获取权限详情
     */
    @ServiceErrorHandler
    async getPermissionDetail(id: number): Promise<PermissionDetailResponse> {
        const permission = await prisma.permission.findUnique({
            where: { id },
            include: {
                parent: true,
                children: true,
            },
        });

        if (!permission) {
            throw new BusinessError(ErrorCode.RESOURCE_NOT_FOUND);
        }

        return {
            id: permission.id,
            name: permission.name,
            code: permission.code,
            type: convertPermissionType(permission.type),
            resource: permission.resource,
            action: permission.action,
            path: permission.path,
            component: permission.component,
            icon: permission.icon,
            sort: permission.sort,
            status: convertPermissionStatus(permission.status),
            parentId: permission.parentId,
            createdAt: permission.createdAt.toISOString(),
            updatedAt: permission.updatedAt.toISOString(),
            parent: permission.parent ? convertToSharedPermission(permission.parent) : undefined,
            children: permission.children.map((child) => convertToSharedPermission(child)),
        };
    }

    /**
     * 创建权限
     */
    @ServiceErrorHandler
    async createPermission(data: CreatePermissionRequest) {
        const {
            name,
            code,
            type,
            resource,
            action,
            path,
            component,
            icon,
            sort = 0,
            status = PermissionStatus.ACTIVE,
            parentId,
        } = data;

        // 检查权限代码是否已存在
        const existingPermission = await prisma.permission.findUnique({
            where: { code },
        });
        if (existingPermission) {
            throw new BusinessError(ErrorCode.PERMISSION_CODE_EXISTS);
        }

        // 如果指定了父权限，检查父权限是否存在
        if (parentId) {
            const parentPermission = await prisma.permission.findUnique({
                where: { id: parentId },
            });
            if (!parentPermission) {
                throw new BusinessError(ErrorCode.PARENT_PERMISSION_NOT_FOUND);
            }
        }

        // 创建权限
        const permission = await prisma.permission.create({
            data: {
                name,
                code,
                type,
                resource,
                action,
                path,
                component,
                icon,
                sort,
                status,
                parentId,
            },
        });

        await this.assignPermissionToSuperAdmin(permission.id);

        return permission;
    }

    /**
     * 更新权限
     */
    @ServiceErrorHandler
    async updatePermission(data: UpdatePermissionRequest) {
        const { id, ...updateData } = data;

        // 检查权限是否存在
        const existingPermission = await prisma.permission.findUnique({
            where: { id },
        });
        if (!existingPermission) {
            throw new BusinessError(ErrorCode.RESOURCE_NOT_FOUND);
        }

        // 如果更新代码，检查是否重复
        if (updateData.code && updateData.code !== existingPermission.code) {
            const codeExists = await prisma.permission.findFirst({
                where: {
                    code: updateData.code,
                    id: { not: id },
                },
            });
            if (codeExists) {
                throw new BusinessError(ErrorCode.PERMISSION_CODE_EXISTS);
            }
        }

        // 如果指定了父权限，检查父权限是否存在
        if (updateData.parentId) {
            const parentPermission = await prisma.permission.findUnique({
                where: { id: updateData.parentId },
            });
            if (!parentPermission) {
                throw new BusinessError(ErrorCode.PARENT_PERMISSION_NOT_FOUND);
            }
        }

        // 更新权限
        const permission = await prisma.permission.update({
            where: { id },
            data: updateData,
        });

        return permission;
    }

    /**
     * 删除权限
     */
    @ServiceErrorHandler
    async deletePermission(id: number) {
        // 检查权限是否存在
        const permission = await prisma.permission.findUnique({
            where: { id },
            include: {
                children: true,
                rolePermissions: true,
            },
        });

        if (!permission) {
            throw new BusinessError(ErrorCode.RESOURCE_NOT_FOUND);
        }

        // 检查是否有子权限
        if (permission.children.length > 0) {
            throw new BusinessError(ErrorCode.PERMISSION_HAS_CHILDREN);
        }

        // 检查是否有角色使用该权限
        if (permission.rolePermissions.length > 0) {
            throw new BusinessError(ErrorCode.PERMISSION_IN_USE);
        }

        // 删除权限
        await prisma.permission.delete({
            where: { id },
        });
    }

    /**
     * 批量操作权限
     */
    @ServiceErrorHandler
    async batchOperation(data: PermissionBatchOperationRequest) {
        const { ids, action } = data;

        switch (action) {
            case 'delete':
                // 批量删除前检查
                for (const id of ids) {
                    await this.deletePermission(id);
                }
                break;
            case 'activate':
                await prisma.permission.updateMany({
                    where: { id: { in: ids } },
                    data: { status: PermissionStatus.ACTIVE },
                });
                break;
            case 'deactivate':
                await prisma.permission.updateMany({
                    where: { id: { in: ids } },
                    data: { status: PermissionStatus.INACTIVE },
                });
                break;
            default:
                throw new BusinessError(ErrorCode.UNSUPPORTED_OPERATION);
        }
    }

    /**
     * 获取权限选项
     */
    @ServiceErrorHandler
    async getPermissionOptions(params: {
        type?: string;
        parentId?: number;
    }): Promise<PermissionOption[]> {
        const { type, parentId } = params;

        const where: any = { status: PermissionStatus.ACTIVE };
        if (type) where.type = type;
        if (parentId !== undefined) where.parentId = parentId;

        const permissions = await prisma.permission.findMany({
            where,
            orderBy: [{ sort: 'asc' }, { name: 'asc' }],
        });

        return permissions.map((permission) => ({
            id: permission.id,
            name: permission.name,
            code: permission.code,
            type: convertPermissionType(permission.type),
            parentId: permission.parentId,
        }));
    }

    /**
     * 获取权限统计信息
     */
    @ServiceErrorHandler
    async getPermissionStats(): Promise<PermissionStatsResponse> {
        const [total, menu, button, directory, active, inactive] = await Promise.all([
            prisma.permission.count(),
            prisma.permission.count({ where: { type: PermissionType.MENU } }),
            prisma.permission.count({ where: { type: PermissionType.BUTTON } }),
            prisma.permission.count({ where: { type: PermissionType.DIRECTORY } }),
            prisma.permission.count({ where: { status: PermissionStatus.ACTIVE } }),
            prisma.permission.count({ where: { status: PermissionStatus.INACTIVE } }),
        ]);

        return {
            total,
            menu,
            button,
            directory,
            active,
            inactive,
        };
    }

    /**
     * 检查权限代码是否可用
     */
    @ServiceErrorHandler
    async checkCode(code: string, excludeId?: number): Promise<{ available: boolean }> {
        const where: any = { code };
        if (excludeId) {
            where.id = { not: excludeId };
        }

        const existingPermission = await prisma.permission.findFirst({ where });
        return { available: !existingPermission };
    }
}

export const permissionService = new PermissionService();
