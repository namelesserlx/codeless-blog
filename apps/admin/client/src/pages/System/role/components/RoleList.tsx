import React, { useState, useCallback, useMemo } from 'react';
import { Card, Button, Input, message, Popconfirm, Tag, Avatar } from 'antd';
import { PlusOutlined, EditOutlined, DeleteOutlined, UserOutlined } from '@ant-design/icons';
import NiceModal from '@ebay/nice-modal-react';
import { useRequest, useDebounceFn } from 'ahooks';
import { roleService } from '@/services/system/role';
import { RoleModal } from '../modal';
import styles from './RoleList.module.less';
import { CORE_ROLE_CODES, Role, RoleListRequest, RoleStatusColors } from '@blog/shared';

interface RoleListProps {
    selectedRole: Role | null;
    onRoleSelect: (role: Role) => void;
    onRoleChange: () => void;
}

const { Search } = Input;
const CORE_ROLE_CODE_SET = new Set<string>(CORE_ROLE_CODES);

export const RoleList: React.FC<RoleListProps> = ({ selectedRole, onRoleSelect, onRoleChange }) => {
    const [searchValue, setSearchValue] = useState('');

    // 防抖搜索参数
    const { run: debouncedSearch } = useDebounceFn(
        (value: string) => {
            setSearchValue(value);
        },
        { wait: 500 },
    );

    // 缓存请求参数
    const requestParams = useMemo<RoleListRequest>(() => {
        const params: RoleListRequest = {
            page: 1,
            pageSize: 100,
        };

        // 只有当searchValue存在且不为空时才传递keyword
        if (searchValue && searchValue.trim()) {
            params.keyword = searchValue.trim();
        }

        return params;
    }, [searchValue]);

    // 获取角色列表
    const {
        data: res,
        loading,
        refresh,
    } = useRequest(() => roleService.getRoleList(requestParams), {
        refreshDeps: [requestParams],
        onSuccess: (data) => {
            // 如果没有选中角色，默认选中第一个
            if (data.data.list.length > 0 && !selectedRole) {
                const testerRole = data.data.list.find((role) => role.code === 'tester');
                const defaultRole = testerRole || data.data.list[0];
                onRoleSelect(defaultRole);
            }
        },
        onError: () => {
            message.error('获取角色列表失败');
        },
    });

    // 删除角色
    const { run: deleteRole, loading: deleteLoading } = useRequest(roleService.deleteRole, {
        manual: true,
        onSuccess: () => {
            message.success('删除成功');
            refresh();
            onRoleChange();
        },
        onError: (error) => {
            const errorMessage = error instanceof Error ? error.message : '删除失败';
            message.error(errorMessage);
        },
    });

    // 搜索处理 - 使用防抖优化
    const handleSearch = useCallback(
        (value: string) => {
            debouncedSearch(value);
        },
        [debouncedSearch],
    );

    // 缓存过滤后的角色列表
    const filteredRoles = useMemo(() => {
        const roles = res?.data?.list || [];
        // 如果有搜索值，后端已经过滤了，直接返回
        if (searchValue) {
            return roles;
        }
        return roles;
    }, [res?.data?.list, searchValue]);

    // 新增角色 - 使用 useCallback 优化
    const handleAdd = useCallback(async () => {
        try {
            await NiceModal.show(RoleModal, {
                type: 'create',
            });
            refresh();
            onRoleChange();
        } catch {
            // 用户取消操作
        }
    }, [refresh, onRoleChange]);

    // 编辑角色 - 使用 useCallback 优化
    const handleEdit = useCallback(
        async (role: Role, e: React.MouseEvent) => {
            e.stopPropagation();
            try {
                await NiceModal.show(RoleModal, {
                    type: 'edit',
                    role,
                });
                refresh();
                onRoleChange();
            } catch {
                // 用户取消操作
            }
        },
        [refresh, onRoleChange],
    );

    // 删除角色 - 使用 useCallback 优化
    const handleDelete = useCallback(
        async (id: number, e?: React.MouseEvent) => {
            e?.stopPropagation();
            deleteRole(id);
        },
        [deleteRole],
    );

    // 角色选择处理 - 使用 useCallback 优化
    const handleRoleSelect = useCallback(
        (role: Role) => {
            onRoleSelect(role);
        },
        [onRoleSelect],
    );

    return (
        <div className={styles.container}>
            <Card
                title="角色列表"
                extra={
                    <Button type="primary" icon={<PlusOutlined />} size="small" onClick={handleAdd}>
                        新增
                    </Button>
                }
                className={styles.card}
            >
                {/* 搜索框 */}
                <Search
                    placeholder="搜索名称/编码"
                    allowClear
                    onSearch={handleSearch}
                    onChange={(e) => handleSearch(e.target.value)}
                />

                {/* 角色列表 */}
                <div className={styles.roleList}>
                    {filteredRoles.map((role) => (
                        <div
                            key={role.id}
                            className={`${styles.roleItem} ${
                                selectedRole?.id === role.id ? styles.selected : ''
                            }`}
                            onClick={() => handleRoleSelect(role)}
                        >
                            <div className={styles.roleContent}>
                                <div className={styles.roleHeader}>
                                    <Avatar
                                        size={40}
                                        icon={<UserOutlined />}
                                        style={{
                                            backgroundColor:
                                                selectedRole?.id === role.id
                                                    ? '#1890ff'
                                                    : '#52c41a',
                                        }}
                                    />
                                    <div className={styles.roleInfo}>
                                        <div className={styles.roleName}>{role.name}</div>
                                        <div className={styles.roleCode}>({role.code})</div>
                                    </div>
                                    <div className={styles.roleActions}>
                                        <Tag
                                            color={RoleStatusColors[role.status]}
                                            className={styles.statusTag}
                                        >
                                            激活
                                        </Tag>
                                    </div>
                                </div>

                                {role.description && (
                                    <div className={styles.roleDescription}>{role.description}</div>
                                )}

                                <div className={styles.roleFooter}>
                                    <Button
                                        type="text"
                                        size="small"
                                        icon={<EditOutlined />}
                                        onClick={(e) => handleEdit(role, e)}
                                        className={styles.actionBtn}
                                    />
                                    {!CORE_ROLE_CODE_SET.has(role.code) && (
                                        <Popconfirm
                                            title="确定要删除这个角色吗？"
                                            onConfirm={(e) => handleDelete(role.id, e)}
                                            onCancel={(e) => e?.stopPropagation()}
                                        >
                                            <Button
                                                type="text"
                                                size="small"
                                                danger
                                                icon={<DeleteOutlined />}
                                                onClick={(e) => e.stopPropagation()}
                                                loading={deleteLoading}
                                                className={styles.actionBtn}
                                            />
                                        </Popconfirm>
                                    )}
                                </div>
                            </div>
                        </div>
                    ))}
                </div>

                {loading && <div className={styles.loading}>加载中...</div>}
            </Card>
        </div>
    );
};
