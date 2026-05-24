import React, { useState, useCallback } from 'react';
import { Table, Button, Avatar, Tag, Input, Space, Popconfirm, message } from 'antd';
import { UserOutlined, DeleteOutlined, PlusOutlined } from '@ant-design/icons';
import { useRequest } from 'ahooks';
import { useNavigate } from 'react-router';
import styles from './RoleUsers.module.less';
import { Role, User, UserStatus } from '@blog/shared';
import { roleService } from '@/services/system/role';

interface RoleUsersProps {
    selectedRole: Role;
}

const { Search } = Input;

export const RoleUsers: React.FC<RoleUsersProps> = ({ selectedRole }) => {
    const navigate = useNavigate();
    const [searchValue, setSearchValue] = useState('');

    // 获取角色用户列表
    const {
        data: res,
        loading,
        refresh,
    } = useRequest(() => roleService.getRoleUsers(selectedRole.id), {
        refreshDeps: [selectedRole.id],
        onError: (error) => {
            const errorMessage = error instanceof Error ? error.message : '获取角色用户失败';
            message.error(errorMessage);
        },
    });

    // 移除用户
    const { run: removeUser, loading: removeLoading } = useRequest(roleService.removeUserFromRole, {
        manual: true,
        onSuccess: () => {
            message.success('移除成功');
            refresh();
        },
        onError: (error) => {
            const errorMessage = error instanceof Error ? error.message : '移除失败';
            message.error(errorMessage);
        },
    });

    // 搜索处理
    const handleSearch = useCallback((value: string) => {
        setSearchValue(value);
    }, []);

    // 过滤用户列表
    const filteredUsers = React.useMemo(() => {
        const users = res?.data?.list || [];
        if (!searchValue) return users;
        return users.filter(
            (user) =>
                user.username.toLowerCase().includes(searchValue.toLowerCase()) ||
                user.email.toLowerCase().includes(searchValue.toLowerCase()) ||
                (user.nickname && user.nickname.toLowerCase().includes(searchValue.toLowerCase())),
        );
    }, [res?.data?.list, searchValue]);

    // 添加用户到角色
    const handleAddUser = useCallback(() => {
        navigate('/system/user');
    }, [navigate]);

    // 移除用户
    const handleRemoveUser = useCallback(
        (userId: number) => {
            removeUser(selectedRole.id, userId);
        },
        [removeUser, selectedRole.id],
    );

    // 表格列定义
    const columns = [
        {
            title: '头像',
            dataIndex: 'avatar',
            key: 'avatar',
            width: 80,
            render: (avatar: string) => <Avatar src={avatar} icon={<UserOutlined />} size={40} />,
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
                <Tag color={status === UserStatus.ACTIVE ? 'success' : 'default'}>
                    {status === UserStatus.ACTIVE ? '激活' : '禁用'}
                </Tag>
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
            width: 120,
            fixed: 'right' as const,
            render: (_value: unknown, record: User) => (
                <Space>
                    <Popconfirm
                        title="确定要从该角色中移除这个用户吗？"
                        onConfirm={() => handleRemoveUser(record.id)}
                        okText="确定"
                        cancelText="取消"
                    >
                        <Button
                            type="link"
                            danger
                            size="small"
                            icon={<DeleteOutlined />}
                            loading={removeLoading}
                        >
                            移除
                        </Button>
                    </Popconfirm>
                </Space>
            ),
        },
    ];

    return (
        <div className={styles.container}>
            <div className={styles.toolbar}>
                <div className={styles.toolbarLeft}>
                    <Search
                        placeholder="搜索用户名/邮箱/昵称"
                        allowClear
                        style={{ width: 240 }}
                        onSearch={handleSearch}
                        onChange={(e) => handleSearch(e.target.value)}
                    />
                </div>
                <div className={styles.toolbarRight}>
                    <Button type="primary" icon={<PlusOutlined />} onClick={handleAddUser}>
                        添加用户
                    </Button>
                </div>
            </div>

            <Table
                className={styles.userTable}
                columns={columns}
                dataSource={filteredUsers}
                loading={loading}
                pagination={{
                    total: res?.data?.total || 0,
                    pageSize: 10,
                    showSizeChanger: true,
                    showQuickJumper: true,
                    showTotal: (total, range) => `第 ${range[0]}-${range[1]} 条/共 ${total} 条`,
                }}
                rowKey="id"
                scroll={{ x: 'max-content' }}
                size="small"
            />
        </div>
    );
};
