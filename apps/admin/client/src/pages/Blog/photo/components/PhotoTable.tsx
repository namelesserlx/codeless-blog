import type { ColumnsType } from 'antd/es/table';
import StandardTable from '@/components/StandardTable';
import type { Photo } from '@blog/shared';
import type { ReactNode } from 'react';

export interface PhotoTablePagination {
    total: number;
    current: number;
    pageSize: number;
}

export interface PhotoTableProps {
    columns: ColumnsType<Photo>;
    dataSource: Photo[];
    loading?: boolean;
    pagination: PhotoTablePagination;
    onPageChange: (page: number, pageSize: number) => void;
    /** 自定义工具栏（新增、导出、导入等按钮） */
    toolbar?: ReactNode;
    rowSelection?: {
        selectedRowKeys: React.Key[];
        onChange: (keys: React.Key[]) => void;
    };
}

/**
 * 相册管理表格 - 纯展示组件
 */
export function PhotoTable({
    columns,
    dataSource,
    loading = false,
    pagination,
    onPageChange,
    toolbar,
    rowSelection,
}: PhotoTableProps) {
    return (
        <StandardTable<Photo>
            columns={columns}
            dataSource={dataSource}
            loading={loading}
            rowKey="id"
            scroll={{ x: 'max-content' }}
            toolbar={toolbar}
            pagination={{
                ...pagination,
                onPageChange,
            }}
            rowSelection={rowSelection}
        />
    );
}
