import type { ColumnsType } from 'antd/es/table';
import StandardTable from '@/components/StandardTable';
import type { Snippet } from '@blog/shared';

export interface SnippetTablePagination {
    total: number;
    current: number;
    pageSize: number;
}

export interface SnippetTableAddButton {
    text: string;
    onClick: () => void;
}

export interface SnippetTableProps {
    columns: ColumnsType<Snippet>;
    dataSource: Snippet[];
    loading?: boolean;
    pagination: SnippetTablePagination;
    onPageChange: (page: number, pageSize: number) => void;
    addButton?: SnippetTableAddButton | null;
}

/**
 * 片段管理表格 - 纯展示组件
 */
export function SnippetTable({
    columns,
    dataSource,
    loading = false,
    pagination,
    onPageChange,
    addButton,
}: SnippetTableProps) {
    return (
        <StandardTable<Snippet>
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
