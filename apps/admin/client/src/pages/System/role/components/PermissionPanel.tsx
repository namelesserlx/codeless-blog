import React from 'react';
import { Card, Tabs } from 'antd';
import { FunctionPermissions } from '@/pages/System/permission/FunctionPermissions';
import { RoleUsers } from './RoleUsers';
import { Role } from '@blog/shared';
import styles from './PermissionPanel.module.less';

interface PermissionPanelProps {
    selectedRole: Role | null;
}

export const PermissionPanel: React.FC<PermissionPanelProps> = ({ selectedRole }) => {
    if (!selectedRole) {
        return (
            <div className={styles.container}>
                <Card>
                    <div className={styles.emptyState}>
                        <p>请选择一个角色查看权限信息</p>
                    </div>
                </Card>
            </div>
        );
    }

    const tabItems = [
        {
            key: 'permissions',
            label: '功能权限',
            children: <FunctionPermissions selectedRole={selectedRole} />,
        },
        {
            key: 'users',
            label: '角色用户',
            children: <RoleUsers selectedRole={selectedRole} />,
        },
    ];

    return (
        <div className={styles.container}>
            <Card title={`权限分配 - ${selectedRole.name}`}>
                <Tabs
                    defaultActiveKey="permissions"
                    className={styles.tabsWrapper}
                    items={tabItems}
                />
            </Card>
        </div>
    );
};
