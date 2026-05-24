import type { ColumnsType } from 'antd/es/table';
import StandardTable from '@/components/StandardTable';
import type { Comment } from '@blog/shared';

export interface CommentTablePagination {
    total: number;
    current: number;
    pageSize: number;
}

export interface CommentTableProps {
    columns: ColumnsType<Comment>;
    dataSource: Comment[];
    loading?: boolean;
    pagination: CommentTablePagination;
    onPageChange: (page: number, pageSize: number) => void;
}

/**
 * 评论管理表格 - 纯展示组件
 * 评论列表无新增按钮
 */
export function CommentTable({
    columns,
    dataSource,
    loading = false,
    pagination,
    onPageChange,
}: CommentTableProps) {
    return (
        <StandardTable<Comment>
            columns={columns}
            dataSource={dataSource}
            loading={loading}
            rowKey="id"
            scroll={{ x: 'max-content' }}
            pagination={{
                ...pagination,
                onPageChange,
            }}
        />
    );
}
