import type { ColumnsType } from 'antd/es/table';
import StandardTable from '@/components/StandardTable';
import type { UserWithRoles } from '@blog/shared';

export interface UserTablePagination {
    total: number;
    current: number;
    pageSize: number;
}

export interface UserTableAddButton {
    text: string;
    onClick: () => void;
}

export interface UserTableProps {
    columns: ColumnsType<UserWithRoles>;
    dataSource: UserWithRoles[];
    loading?: boolean;
    pagination: UserTablePagination;
    onPageChange: (page: number, pageSize: number) => void;
    /** 新增按钮配置，传入则显示，不传则不显示（替代 showAdd 布尔） */
    addButton?: UserTableAddButton | null;
}

/**
 * 用户管理表格 - 纯展示组件
 * 使用 addButton 对象替代 showAdd 布尔，符合显式变体设计
 */
export function UserTable({
    columns,
    dataSource,
    loading = false,
    pagination,
    onPageChange,
    addButton,
}: UserTableProps) {
    return (
        <StandardTable<UserWithRoles>
            columns={columns}
            dataSource={dataSource}
            loading={loading}
            rowKey="id"
            scroll={{ x: 'max-content' }}
            toolbar={
                addButton ? (
                    <StandardTable.AddButton text={addButton.text} onClick={addButton.onClick} />
                ) : undefined
            }
            pagination={{
                ...pagination,
                onPageChange,
            }}
        />
    );
}
