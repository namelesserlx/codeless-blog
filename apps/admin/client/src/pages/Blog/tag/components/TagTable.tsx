import type { ColumnsType } from 'antd/es/table';
import StandardTable from '@/components/StandardTable';
import type { TagWithStats } from '@blog/shared';

export interface TagTablePagination {
    total: number;
    current: number;
    pageSize: number;
}

export interface TagTableAddButton {
    text: string;
    onClick: () => void;
}

export interface TagTableProps {
    columns: ColumnsType<TagWithStats>;
    dataSource: TagWithStats[];
    loading?: boolean;
    pagination: TagTablePagination;
    onPageChange: (page: number, pageSize: number) => void;
    addButton?: TagTableAddButton | null;
}

/**
 * 标签管理表格 - 纯展示组件
 */
export function TagTable({
    columns,
    dataSource,
    loading = false,
    pagination,
    onPageChange,
    addButton,
}: TagTableProps) {
    return (
        <StandardTable<TagWithStats>
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
