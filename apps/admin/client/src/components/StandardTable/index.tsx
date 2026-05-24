import { Table, Card, Button } from 'antd';
import { PlusOutlined } from '@ant-design/icons';
import type { TableProps } from 'antd';
import type { ReactNode } from 'react';
import styles from './index.module.less';

/** 分页配置 */
export interface StandardTablePagination {
    total: number;
    current: number;
    pageSize: number;
    onPageChange: (page: number, pageSize: number) => void;
}

interface StandardTableProps<T> extends Omit<TableProps<T>, 'pagination'> {
    /** 表格上方工具栏，使用 StandardTable.AddButton 或自定义内容 */
    toolbar?: ReactNode;
    /** 分页配置（新 API），与 total/current/pageSize/onPageChange 二选一 */
    pagination?: StandardTablePagination;
    /**
     * @deprecated 使用 toolbar 传入 StandardTable.AddButton 替代
     * 为保持兼容暂保留，与 toolbar 同时存在时 toolbar 优先
     */
    showAdd?: boolean;
    /**
     * @deprecated 使用 StandardTable.AddButton 的 text 属性
     */
    addText?: string;
    /**
     * @deprecated 使用 StandardTable.AddButton 的 onClick 属性
     */
    onAdd?: () => void;
    /**
     * @deprecated 使用 pagination 对象
     */
    total?: number;
    /**
     * @deprecated 使用 pagination 对象
     */
    current?: number;
    /**
     * @deprecated 使用 pagination 对象
     */
    pageSize?: number;
    /**
     * @deprecated 使用 pagination 对象
     */
    onPageChange?: (page: number, pageSize: number) => void;
}

function StandardTableInner<T extends object>({
    toolbar,
    pagination: paginationProp,
    showAdd = false,
    addText = '新增',
    onAdd,
    total: totalLegacy,
    current: currentLegacy,
    pageSize: pageSizeLegacy,
    onPageChange: onPageChangeLegacy,
    ...tableProps
}: StandardTableProps<T>) {
    const pagination: StandardTablePagination = paginationProp ?? {
        total: totalLegacy ?? 0,
        current: currentLegacy ?? 1,
        pageSize: pageSizeLegacy ?? 10,
        onPageChange: onPageChangeLegacy ?? (() => {}),
    };

    const toolbarContent =
        toolbar ??
        (showAdd && onAdd ? <StandardTable.AddButton text={addText} onClick={onAdd} /> : null);

    return (
        <div className={styles.tableContainer}>
            <Card className={styles.tableCard}>
                {toolbarContent && <div className={styles.tableHeader}>{toolbarContent}</div>}
                <Table
                    {...tableProps}
                    pagination={
                        pagination.total > 0
                            ? {
                                  total: pagination.total,
                                  current: pagination.current,
                                  pageSize: pagination.pageSize,
                                  showSizeChanger: true,
                                  showQuickJumper: true,
                                  showTotal: (t) => `共 ${t} 条记录`,
                                  onChange: pagination.onPageChange,
                              }
                            : false
                    }
                />
            </Card>
        </div>
    );
}

export interface AddButtonProps {
    text?: string;
    onClick: () => void;
    icon?: ReactNode;
}

/** 新增按钮 - 显式变体，替代 showAdd 布尔 */
function AddButton({ text = '新增', onClick, icon }: AddButtonProps) {
    return (
        <Button type="primary" icon={icon ?? <PlusOutlined />} onClick={onClick}>
            {text}
        </Button>
    );
}

const StandardTable = Object.assign(StandardTableInner, {
    AddButton,
});

export default StandardTable;
