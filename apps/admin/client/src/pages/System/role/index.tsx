import { useState } from 'react';
import type { Role } from '@blog/shared';
import { RoleList } from './components/RoleList';
import { PermissionPanel } from './components/PermissionPanel';
import styles from './index.module.less';

function Role() {
    const [selectedRole, setSelectedRole] = useState<Role | null>(null);
    const [refreshKey, setRefreshKey] = useState(0);

    // 角色选择处理
    const handleRoleSelect = (role: Role) => {
        setSelectedRole(role);
    };

    // 角色变更处理（新增、编辑、删除后）
    const handleRoleChange = () => {
        setRefreshKey((prev) => prev + 1);
    };

    return (
        <div className={styles.container}>
            <RoleList
                selectedRole={selectedRole}
                onRoleSelect={handleRoleSelect}
                onRoleChange={handleRoleChange}
                key={refreshKey} // 强制刷新
            />
            <PermissionPanel selectedRole={selectedRole} />
        </div>
    );
}

export { Role as Component };
