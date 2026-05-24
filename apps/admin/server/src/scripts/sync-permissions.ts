import '../bootstrap/load-env';
import { PermissionStatus, PermissionType, prisma, RoleStatus } from '@blog/db';
import {
    BUILTIN_PERMISSION_DEFINITIONS,
    BUILTIN_ROLE_DEFINITIONS,
    REMOVED_BUILTIN_ROLE_CODES,
    resolveBuiltinRolePermissionCodes,
} from '@blog/shared';
import { PermissionCacheService } from '../utils/auth';

type PermissionRecord = { id: number; code: string };
type RoleRecord = { id: number; code: string };

function getRequiredMapValue<T>(map: Map<string, T>, code: string, label: string): T {
    const value = map.get(code);

    if (!value) {
        throw new Error(`${label} not found: ${code}`);
    }

    return value;
}

async function syncBuiltinPermissions() {
    const permissionByCode = new Map(
        (
            await prisma.permission.findMany({
                select: { id: true, code: true },
            })
        ).map((permission) => [permission.code, permission]),
    );

    let syncedCount = 0;

    for (const definition of BUILTIN_PERMISSION_DEFINITIONS) {
        const parentId = definition.parentCode
            ? getRequiredMapValue(permissionByCode, definition.parentCode, 'Parent permission').id
            : null;
        const data = {
            name: definition.name,
            code: definition.code,
            type: definition.type as PermissionType,
            resource: definition.resource ?? null,
            action: definition.action ?? null,
            path: null,
            component: null,
            icon: null,
            sort: definition.sort,
            status: (definition.status ?? PermissionStatus.ACTIVE) as PermissionStatus,
            parentId,
        };

        const permission = await prisma.permission.upsert({
            where: { code: definition.code },
            update: data,
            create: data,
        });

        permissionByCode.set(permission.code, permission);
        syncedCount += 1;
    }

    return syncedCount;
}

async function syncBuiltinRoles() {
    const roleByCode = new Map(
        (
            await prisma.role.findMany({
                select: { id: true, code: true },
            })
        ).map((role) => [role.code, role]),
    );

    let syncedCount = 0;

    for (const definition of BUILTIN_ROLE_DEFINITIONS) {
        const parentId = definition.parentCode
            ? getRequiredMapValue(roleByCode, definition.parentCode, 'Parent role').id
            : null;
        const data = {
            name: definition.name,
            code: definition.code,
            description: definition.description,
            level: definition.level,
            status: (definition.status ?? RoleStatus.ACTIVE) as RoleStatus,
            parentId,
        };

        const role = await prisma.role.upsert({
            where: { code: definition.code },
            update: data,
            create: data,
        });

        roleByCode.set(role.code, role);
        syncedCount += 1;
    }

    return { roleByCode, syncedCount };
}

async function syncBuiltinRolePermissions(roleByCode: Map<string, RoleRecord>) {
    const permissions = await prisma.permission.findMany({
        select: { id: true, code: true },
    });
    const permissionByCode = new Map<string, PermissionRecord>(
        permissions.map((permission) => [permission.code, permission]),
    );
    const availablePermissionCodes = permissions.map((permission) => permission.code);

    let createdCount = 0;
    let deletedCount = 0;

    for (const roleDefinition of BUILTIN_ROLE_DEFINITIONS) {
        const role = getRequiredMapValue(roleByCode, roleDefinition.code, 'Role');
        const desiredPermissionCodes = resolveBuiltinRolePermissionCodes(
            roleDefinition.code,
            availablePermissionCodes,
        );
        const desiredPermissionIds = desiredPermissionCodes.map(
            (code) => getRequiredMapValue(permissionByCode, code, 'Permission').id,
        );

        const deleted = await prisma.rolePermission.deleteMany({
            where:
                desiredPermissionIds.length > 0
                    ? {
                          roleId: role.id,
                          permissionId: { notIn: desiredPermissionIds },
                      }
                    : { roleId: role.id },
        });
        deletedCount += deleted.count;

        if (desiredPermissionIds.length === 0) continue;

        const created = await prisma.rolePermission.createMany({
            data: desiredPermissionIds.map((permissionId) => ({
                roleId: role.id,
                permissionId,
            })),
            skipDuplicates: true,
        });
        createdCount += created.count;
    }

    return { createdCount, deletedCount };
}

async function removeObsoleteBuiltinRoles(roleByCode: Map<string, RoleRecord>) {
    const fallbackParentRole = roleByCode.get('admin') ?? roleByCode.get('super_admin');
    let deletedCount = 0;

    for (const code of REMOVED_BUILTIN_ROLE_CODES) {
        const role = await prisma.role.findUnique({
            where: { code },
            select: { id: true },
        });

        if (!role) continue;

        await prisma.role.updateMany({
            where: { parentId: role.id },
            data: { parentId: fallbackParentRole?.id ?? null },
        });

        await prisma.role.delete({
            where: { id: role.id },
        });
        deletedCount += 1;
    }

    return deletedCount;
}

async function main() {
    try {
        console.log('🔐 开始同步后台 RBAC...');

        const permissionCount = await syncBuiltinPermissions();
        const { roleByCode, syncedCount: roleCount } = await syncBuiltinRoles();
        const { createdCount, deletedCount } = await syncBuiltinRolePermissions(roleByCode);
        const removedRoleCount = await removeObsoleteBuiltinRoles(roleByCode);

        try {
            await PermissionCacheService.clearAllPermissionCache();
        } catch {
            console.warn('⚠️ 权限缓存清理失败，请重新登录或重启后台服务后再验证');
        }

        console.log(`✅ 已同步内置权限 ${permissionCount} 个`);
        console.log(`✅ 已同步内置角色 ${roleCount} 个`);
        console.log(`✅ 已新增角色权限关联 ${createdCount} 条`);
        console.log(`✅ 已移除非默认角色权限关联 ${deletedCount} 条`);
        console.log(`✅ 已移除废弃内置角色 ${removedRoleCount} 个`);
        console.log('✅ 已清理权限缓存');
    } catch (error) {
        console.error('❌ RBAC 同步失败:', error);
        process.exitCode = 1;
    } finally {
        await prisma.$disconnect();
        process.exit();
    }
}

void main();
