import { useState, useCallback, useMemo } from 'react';
import { Button, Space, Tag, Avatar, message, Popconfirm } from 'antd';
import { EditOutlined, DeleteOutlined, UserOutlined } from '@ant-design/icons';
import type { ColumnsType } from 'antd/es/table';
import NiceModal from '@ebay/nice-modal-react';
import { UserModal } from './components/UserModal';
import { UserSearchFilters } from './components/UserSearchFilters';
import { UserTable } from './components/UserTable';
import { userService } from '@/services/system/user';
import {
    UserListRequest,
    UserWithRoles,
    UserStatus,
    UserStatusLabels,
    UserStatusColors,
} from '@blog/shared';
import { useRequest } from 'ahooks';
import { usePermission } from '@/hooks/usePermission';
import styles from './index.module.less';

/**
 * 用户管理页面 - 容器组件
 * 负责：数据拉取、权限判断、业务逻辑（增删改查）
 * 展示组件：UserSearchFilters、UserTable
 */
function UserPageContainer() {
    const { hasPermission } = usePermission();
    const [searchParams, setSearchParams] = useState<Partial<UserListRequest>>({});
    const [pagination, setPagination] = useState({
        currentPage: 1,
        pageSize: 10,
    });

    const {
        data: res,
        loading,
        refresh,
    } = useRequest(
        (params?: Partial<UserListRequest>) => {
            const requestParams: UserListRequest = {
                page: pagination.currentPage,
                pageSize: pagination.pageSize,
                ...searchParams,
                ...params,
            };
            return userService.getUserList(requestParams);
        },
        {
            refreshDeps: [pagination.currentPage, pagination.pageSize, searchParams],
            onSuccess: () => {
                message.success('获取用户列表成功');
            },
            onError: () => {
                message.error('获取用户列表失败');
            },
        },
    );

    const { run: deleteUser, loading: deleteLoading } = useRequest(userService.deleteUser, {
        manual: true,
        onSuccess: () => {
            message.success('删除成功');
            refresh();
        },
        onError: (error) => {
            const errorMessage = error instanceof Error ? error.message : '删除失败';
            message.error(errorMessage);
        },
    });

    const handleSearch = useCallback((values: Partial<UserListRequest>) => {
        setSearchParams(values);
        setPagination((prev) => ({ ...prev, currentPage: 1 }));
    }, []);

    const handleReset = useCallback(() => {
        setSearchParams({});
        setPagination((prev) => ({ ...prev, currentPage: 1 }));
    }, []);

    const handlePageChange = useCallback((page: number, pageSize: number) => {
        setPagination({
            currentPage: page,
            pageSize,
        });
    }, []);

    const handleAdd = useCallback(async () => {
        try {
            await NiceModal.show(UserModal, {
                type: 'create',
            });
            refresh();
        } catch {
            // 用户取消操作
        }
    }, [refresh]);

    const handleEdit = useCallback(
        async (record: UserWithRoles) => {
            try {
                await NiceModal.show(UserModal, {
                    type: 'edit',
                    user: record,
                });
                refresh();
            } catch {
                // 用户取消操作
            }
        },
        [refresh],
    );

    const handleDelete = useCallback(
        async (id: number) => {
            deleteUser(id);
        },
        [deleteUser],
    );

    const statusOptions = useMemo(
        () =>
            Object.entries(UserStatusLabels).map(([value, label]) => ({
                label,
                value,
            })),
        [],
    );

    const columns: ColumnsType<UserWithRoles> = useMemo(
        () => [
            {
                title: '头像',
                dataIndex: 'avatar',
                key: 'avatar',
                width: 80,
                render: (avatar: string) => (
                    <Avatar src={avatar} icon={<UserOutlined />} size={40} />
                ),
            },
            {
                title: '用户名',
                dataIndex: 'username',
                key: 'username',
                width: 120,
            },
            {
                title: '邮箱',
                dataIndex: 'email',
                key: 'email',
                width: 200,
            },
            {
                title: '昵称',
                dataIndex: 'nickname',
                key: 'nickname',
                width: 120,
                render: (text: string) => text || '-',
            },
            {
                title: '状态',
                dataIndex: 'status',
                key: 'status',
                width: 100,
                render: (status: UserStatus) => (
                    <Tag color={UserStatusColors[status]}>{UserStatusLabels[status]}</Tag>
                ),
            },
            {
                title: '角色',
                dataIndex: 'userRoles',
                key: 'roles',
                width: 200,
                render: (userRoles: UserWithRoles['userRoles']) => (
                    <Space wrap>
                        {userRoles.map((ur) => (
                            <Tag key={ur.role.id} color="blue">
                                {ur.role.name}
                            </Tag>
                        ))}
                    </Space>
                ),
            },
            {
                title: '创建时间',
                dataIndex: 'createdAt',
                key: 'createdAt',
                width: 180,
                render: (text: string) => new Date(text).toLocaleString(),
            },
            {
                title: '操作',
                key: 'action',
                width: 200,
                fixed: 'right',
                render: (_, record) => (
                    <Space>
                        {hasPermission('user:update') && (
                            <Button
                                type="link"
                                icon={<EditOutlined />}
                                onClick={() => handleEdit(record)}
                            >
                                编辑
                            </Button>
                        )}
                        {hasPermission('user:delete') && (
                            <Popconfirm
                                title="确定要删除这个用户吗？"
                                onConfirm={() => handleDelete(record.id)}
                                okText="确定"
                                cancelText="取消"
                            >
                                <Button
                                    type="link"
                                    danger
                                    icon={<DeleteOutlined />}
                                    loading={deleteLoading}
                                >
                                    删除
                                </Button>
                            </Popconfirm>
                        )}
                    </Space>
                ),
            },
        ],
        [hasPermission, handleEdit, handleDelete, deleteLoading],
    );

    const addButton = hasPermission('user:create')
        ? { text: '新增用户', onClick: handleAdd }
        : undefined;

    return (
        <div className={styles.pageContainer}>
            <UserSearchFilters
                onSearch={handleSearch}
                onReset={handleReset}
                loading={loading}
                statusOptions={statusOptions}
            />
            <UserTable
                columns={columns}
                dataSource={res?.data?.list ?? []}
                loading={loading}
                pagination={{
                    total: res?.data?.total ?? 0,
                    current: pagination.currentPage,
                    pageSize: pagination.pageSize,
                }}
                onPageChange={handlePageChange}
                addButton={addButton}
            />
        </div>
    );
}

export default UserPageContainer;
