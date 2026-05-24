import React, { useState, useCallback, useMemo } from 'react';
import { Button, Table, Checkbox, Tag, message } from 'antd';
import type { TableColumnsType } from 'antd';
import { useRequest } from 'ahooks';
import { roleService } from '@/services/system/role';
import { permissionService } from '@/services/system/permission';
import { hasPermission } from '@/hooks/usePermission';
import type { AppRoute, RouteMeta } from '@/types/route';
import { layoutRoutes } from '@/config/admin-routes';
import { PermissionStatus, PermissionTreeNode, PermissionType, Role } from '@blog/shared';
import styles from './FunctionPermissions.module.less';
import { nanoid } from 'nanoid';

interface FunctionPermissionsProps {
    selectedRole: Role;
}

type FunctionMenuItemKind = 'directory' | 'menu';

interface FunctionPermissionOption {
    id: number;
    name: string;
    code: string;
    type?: PermissionType;
}

interface FunctionMenuItem {
    id: string;
    name: string;
    code?: string;
    path: string;
    icon?: string;
    sort: number;
    parentPath?: string;
    level: number;
    hasChildren: boolean;
    type: FunctionMenuItemKind;
    permissionId?: number;
    permissionType?: PermissionType;
    buttonPermissions?: PermissionTreeNode[];
    children?: FunctionMenuItem[];
}

// 获取图标组件的名称（React 组件函数的 displayName 或 name）
const getIconName = (icon: RouteMeta['icon']): string | undefined => {
    if (!icon || typeof icon === 'string') return undefined;
    return (icon as { displayName?: string }).displayName ?? (icon as { name?: string }).name;
};

const collectExpandableKeys = (nodes: FunctionMenuItem[]): string[] => {
    const expandKeys: string[] = [];

    const walk = (items: FunctionMenuItem[]) => {
        items.forEach((item) => {
            if (item.children?.length) {
                expandKeys.push(item.id);
                walk(item.children);
            }
        });
    };

    walk(nodes);

    return expandKeys;
};

const collectUserPermissionIds = (permissions: PermissionTreeNode[]): number[] => {
    const permissionIds: number[] = [];

    const walk = (nodes: PermissionTreeNode[]) => {
        nodes.forEach((permission) => {
            if (hasPermission(permission.code)) {
                permissionIds.push(permission.id);
            }

            if (permission.children?.length) {
                walk(permission.children);
            }
        });
    };

    walk(permissions);

    return permissionIds;
};

const collectDirectoryPermissions = (
    children: FunctionMenuItem[] | undefined,
    permissions: FunctionPermissionOption[],
) => {
    children?.forEach((child) => {
        if (
            child.type === 'menu' &&
            child.permissionId &&
            child.code &&
            hasPermission(child.code)
        ) {
            permissions.push({
                id: child.permissionId,
                name: child.name,
                code: child.code,
                type: child.permissionType,
            });
        }

        if (child.children?.length) {
            collectDirectoryPermissions(child.children, permissions);
        }
    });
};

// 将路由配置转换为菜单权限数据（带权限过滤）
const convertRoutesToMenuData = (routes: AppRoute[]): FunctionMenuItem[] => {
    const menuItems: FunctionMenuItem[] = [];
    const pathToMenuMap = new Map<string, FunctionMenuItem>();

    const processRoute = (route: AppRoute, parentPath?: string, level = 0): void => {
        if (route.meta?.code && !hasPermission(route.meta.code)) {
            return;
        }

        if (route.meta?.showInMenu) {
            const hasChildren = (route.children?.length ?? 0) > 0;
            const menuItem: FunctionMenuItem = {
                id: nanoid(),
                name: route.meta.title,
                code: route.meta.code,
                path: route.path,
                icon: getIconName(route.meta.icon),
                sort: route.meta.order ?? 0,
                parentPath,
                level,
                hasChildren,
                type: parentPath ? 'menu' : 'directory',
            };

            if (hasChildren) {
                menuItem.children = [];
            }

            menuItems.push(menuItem);
            pathToMenuMap.set(route.path, menuItem);

            if (route.children) {
                route.children
                    .filter((child) => child.meta?.showInMenu)
                    .forEach((child) => processRoute(child, route.path, level + 1));
            }
        } else if (route.children) {
            route.children
                .filter((child) => child.meta?.showInMenu)
                .forEach((child) => processRoute(child, parentPath, level));
        }
    };

    // 处理所有路由
    routes.forEach((route) => processRoute(route));

    // 构建父子关系
    menuItems.forEach((item) => {
        if (item.parentPath) {
            const parent = pathToMenuMap.get(item.parentPath);
            if (parent && parent.children) {
                parent.children.push(item);
            }
        }
    });

    // 返回顶级菜单项（没有父路径的），并过滤掉没有子项且没有权限的目录
    return menuItems
        .filter((item) => !item.parentPath)
        .filter((item) => {
            if (item.type === 'directory') {
                const hasValidChildren = (item.children?.length ?? 0) > 0;
                const hasOwnPermission = item.code ? hasPermission(item.code) : false;
                return hasValidChildren || Boolean(hasOwnPermission);
            }
            return true;
        });
};

export const FunctionPermissions: React.FC<FunctionPermissionsProps> = ({ selectedRole }) => {
    const [selectedPermissionOverrides, setSelectedPermissionOverrides] = useState<
        Record<number, number[]>
    >({});
    const [expandedRowKeyOverrides, setExpandedRowKeyOverrides] = useState<
        Record<number, string[]>
    >({});

    // 获取角色权限数据
    const {
        data: rolePermissionsData,
        loading: permissionsLoading,
        refresh: refreshPermissions,
    } = useRequest(async () => roleService.getRolePermissions(selectedRole.id), {
        refreshDeps: [selectedRole.id],
    });

    // 获取系统权限树数据
    const { data: systemPermissions, loading: systemLoading } = useRequest(async () => {
        const response = await permissionService.getPermissionTree({
            status: PermissionStatus.ACTIVE,
        });
        return response.data.tree;
    });

    // 获取菜单数据 - 将路由数据与权限数据合并，并进行权限过滤
    const menuData = useMemo(() => {
        // 首先将路由转换为菜单数据（已包含权限过滤）
        const baseMenuData = convertRoutesToMenuData(layoutRoutes);

        if (!systemPermissions) {
            return baseMenuData;
        }

        const permissionMap = new Map<string, PermissionTreeNode>();
        const buildPermissionMap = (permissions: PermissionTreeNode[]) => {
            permissions.forEach((permission) => {
                permissionMap.set(permission.code, permission);
                if (permission.children?.length) {
                    buildPermissionMap(permission.children);
                }
            });
        };
        buildPermissionMap(systemPermissions);

        const mergeWithPermissions = (items: FunctionMenuItem[]): FunctionMenuItem[] =>
            items.map((item) => {
                const permission = item.code ? permissionMap.get(item.code) : undefined;
                const mergedItem = {
                    ...item,
                    permissionId: permission?.id,
                    permissionType: permission?.type,
                    buttonPermissions:
                        permission?.children?.filter(
                            (child) =>
                                child.type === PermissionType.BUTTON && hasPermission(child.code),
                        ) || [],
                };

                if (item.children?.length) {
                    mergedItem.children = mergeWithPermissions(item.children);
                }

                return mergedItem;
            });

        return mergeWithPermissions(baseMenuData);
    }, [systemPermissions]);
    const defaultPermissionIds = rolePermissionsData?.data?.permissionIds;
    const defaultSelectedPermissions = useMemo(
        () => defaultPermissionIds ?? [],
        [defaultPermissionIds],
    );
    const defaultExpandedRowKeys = useMemo(() => collectExpandableKeys(menuData), [menuData]);
    const selectedPermissions =
        selectedPermissionOverrides[selectedRole.id] ?? defaultSelectedPermissions;
    const expandedRowKeys = expandedRowKeyOverrides[selectedRole.id] ?? defaultExpandedRowKeys;

    // 权限选择
    const handlePermissionSelect = useCallback(
        (permissionId: number, checked: boolean) => {
            setSelectedPermissionOverrides((prev) => {
                const currentPermissions = prev[selectedRole.id] ?? defaultSelectedPermissions;
                const nextPermissions = checked
                    ? [...currentPermissions, permissionId]
                    : currentPermissions.filter((id) => id !== permissionId);

                return {
                    ...prev,
                    [selectedRole.id]: nextPermissions,
                };
            });
        },
        [defaultSelectedPermissions, selectedRole.id],
    );

    // 全选权限
    const handleSelectAll = useCallback(
        (checked: boolean) => {
            if (checked && systemPermissions) {
                setSelectedPermissionOverrides((prev) => ({
                    ...prev,
                    [selectedRole.id]: collectUserPermissionIds(systemPermissions),
                }));
            } else {
                setSelectedPermissionOverrides((prev) => ({
                    ...prev,
                    [selectedRole.id]: [],
                }));
            }
        },
        [selectedRole.id, systemPermissions],
    );

    // 保存权限
    const { loading: saveLoading, run: savePermissions } = useRequest(
        async () => {
            if (!selectedRole) return;

            // 使用真实的权限ID
            await roleService.assignPermissions({
                roleId: selectedRole.id,
                permissionIds: selectedPermissions,
            });
            message.success('权限保存成功');
            refreshPermissions();
            setSelectedPermissionOverrides((prev) => ({
                ...prev,
                [selectedRole.id]: selectedPermissions,
            }));
        },
        {
            manual: true,
        },
    );

    // 权限表格列定义
    const permissionColumns: TableColumnsType<FunctionMenuItem> = [
        {
            title: '目录&菜单',
            dataIndex: 'name',
            key: 'name',
            width: 300,
            render: (text: string, record) => {
                return (
                    <div>
                        <span style={{ marginRight: 8 }}>{text}</span>
                        {record.type === 'directory' ? (
                            <Tag color="blue">目录</Tag>
                        ) : (
                            <Tag color="green">菜单</Tag>
                        )}
                    </div>
                );
            },
        },
        {
            title: '权限',
            dataIndex: 'permissions',
            key: 'permissions',
            render: (_value: unknown, record) => {
                const permissions: FunctionPermissionOption[] = [];

                if (record.type === 'directory') {
                    if (record.permissionId && record.code && hasPermission(record.code)) {
                        permissions.push({
                            id: record.permissionId,
                            name: record.name,
                            code: record.code,
                            type: record.permissionType,
                        });
                    }

                    collectDirectoryPermissions(record.children, permissions);
                } else if (record.type === 'menu') {
                    if (record.buttonPermissions?.length) {
                        permissions.push(...record.buttonPermissions);
                    }
                }

                if (permissions.length === 0) {
                    return null;
                }

                return (
                    <div
                        style={{ display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap' }}
                    >
                        {permissions.map((permission) => (
                            <div key={permission.id} style={{ marginBottom: 4 }}>
                                <Checkbox
                                    checked={selectedPermissions.includes(permission.id)}
                                    onChange={(e) =>
                                        handlePermissionSelect(permission.id, e.target.checked)
                                    }
                                />
                                <span style={{ marginLeft: 5 }}>{permission.name}</span>
                            </div>
                        ))}
                    </div>
                );
            },
        },
    ];

    if (!selectedRole) {
        return (
            <div className={styles.container}>
                <div style={{ textAlign: 'center', padding: '50px 0', color: '#999' }}>
                    请选择角色以查看权限信息
                </div>
            </div>
        );
    }

    return (
        <div className={styles.container}>
            <div className={styles.toolbar}>
                <div className={styles.toolbarLeft}>
                    <Button
                        onClick={() => {
                            setExpandedRowKeyOverrides((prev) => ({
                                ...prev,
                                [selectedRole.id]: collectExpandableKeys(menuData),
                            }));
                        }}
                        size="small"
                    >
                        全部展开
                    </Button>
                    <Button
                        onClick={() =>
                            setExpandedRowKeyOverrides((prev) => ({
                                ...prev,
                                [selectedRole.id]: [],
                            }))
                        }
                        size="small"
                    >
                        全部收起
                    </Button>
                    <Button
                        onClick={() => handleSelectAll(true)}
                        size="small"
                        style={{ marginLeft: 8 }}
                    >
                        全选
                    </Button>
                    <Button
                        onClick={() => handleSelectAll(false)}
                        size="small"
                        style={{ marginLeft: 8 }}
                    >
                        全不选
                    </Button>
                </div>
                <div className={styles.toolbarRight}>
                    <Button
                        type="primary"
                        size="small"
                        onClick={savePermissions}
                        loading={saveLoading}
                    >
                        保存权限
                    </Button>
                </div>
            </div>

            <Table
                className={styles.permissionTable}
                columns={permissionColumns}
                dataSource={menuData}
                pagination={false}
                rowKey="id"
                showHeader={true}
                size="small"
                loading={permissionsLoading || systemLoading}
                expandable={{
                    expandedRowKeys,
                    onExpandedRowsChange: (keys) =>
                        setExpandedRowKeyOverrides((prev) => ({
                            ...prev,
                            [selectedRole.id]: keys.map(String),
                        })),
                    childrenColumnName: 'children',
                }}
            />
        </div>
    );
};
