import type { ColumnsType } from 'antd/es/table';
import StandardTable from '@/components/StandardTable';
import type { ArticleListItem } from '@blog/shared';
import type { ReactNode } from 'react';

export interface ArticleTablePagination {
    total: number;
    current: number;
    pageSize: number;
}

export interface ArticleTableProps {
    columns: ColumnsType<ArticleListItem>;
    dataSource: ArticleListItem[];
    loading?: boolean;
    pagination: ArticleTablePagination;
    onPageChange: (page: number, pageSize: number) => void;
    toolbar?: ReactNode;
    rowSelection?: {
        selectedRowKeys: React.Key[];
        onChange: (keys: React.Key[]) => void;
    };
}

/**
 * 文章管理表格 - 纯展示组件
 */
export function ArticleTable({
    columns,
    dataSource,
    loading = false,
    pagination,
    onPageChange,
    toolbar,
    rowSelection,
}: ArticleTableProps) {
    return (
        <StandardTable<ArticleListItem>
            columns={columns}
            dataSource={dataSource}
            loading={loading}
            rowKey="id"
            scroll={{ x: 'max-content' }}
            toolbar={toolbar}
            pagination={{
                total: pagination.total,
                current: pagination.current,
                pageSize: pagination.pageSize,
                onPageChange,
            }}
            rowSelection={rowSelection}
        />
    );
}
