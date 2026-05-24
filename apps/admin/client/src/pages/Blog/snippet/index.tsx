import { useState, useCallback, useMemo } from 'react';
import { Button, Space, Tag, message, Popconfirm } from 'antd';
import { EditOutlined, DeleteOutlined } from '@ant-design/icons';
import type { ColumnsType } from 'antd/es/table';
import NiceModal from '@ebay/nice-modal-react';
import { SnippetSearchFilters } from './components/SnippetSearchFilters';
import { SnippetTable } from './components/SnippetTable';
import { SnippetModal } from './components/SnippetModal';
import { snippetService } from '@/services/blog/snippet';
import { SnippetListRequest, Snippet } from '@blog/shared';
import { useRequest } from 'ahooks';
import { useSearchParams } from 'react-router';
import styles from './index.module.less';
import { usePermission } from '@/hooks';

const parseBooleanParam = (value: string | null): boolean | undefined => {
    if (value === 'true') return true;
    if (value === 'false') return false;
    return undefined;
};

const buildInitialSearchParams = (params: URLSearchParams): Partial<SnippetListRequest> => {
    const id = params.get('id');
    const published = parseBooleanParam(params.get('published'));
    const isDraft = parseBooleanParam(params.get('isDraft'));

    return {
        ...(id ? { id } : {}),
        ...(published !== undefined ? { published } : {}),
        ...(isDraft !== undefined ? { isDraft } : {}),
    };
};

/**
 * 片段管理页面 - 容器组件
 * 负责：数据拉取、业务逻辑（增删改）
 */
function SnippetPageContainer() {
    const [urlSearchParams] = useSearchParams();
    const { hasPermission } = usePermission();
    const initialSearchParams = useMemo(
        () => buildInitialSearchParams(urlSearchParams),
        [urlSearchParams],
    );
    const [searchParams, setSearchParams] =
        useState<Partial<SnippetListRequest>>(initialSearchParams);
    const [pagination, setPagination] = useState({
        currentPage: 1,
        pageSize: 10,
    });
    const canEditSnippet = hasPermission('snippet:edit');

    const {
        data: res,
        loading,
        refresh,
    } = useRequest(
        (params?: Partial<SnippetListRequest>) => {
            const requestParams: SnippetListRequest = {
                page: pagination.currentPage,
                pageSize: pagination.pageSize,
                ...searchParams,
                ...params,
            };
            return snippetService.getSnippetList(requestParams);
        },
        {
            refreshDeps: [pagination.currentPage, pagination.pageSize, searchParams],
            onSuccess: () => {
                message.success('获取片段列表成功');
            },
            onError: () => {
                message.error('获取片段列表失败');
            },
        },
    );

    const { run: deleteSnippet, loading: deleteLoading } = useRequest(
        snippetService.deleteSnippet,
        {
            manual: true,
            onSuccess: () => {
                message.success('删除成功');
                refresh();
            },
            onError: (error) => {
                const errorMessage = error instanceof Error ? error.message : '删除失败';
                message.error(errorMessage);
            },
        },
    );

    const handleSearch = useCallback((values: Partial<SnippetListRequest>) => {
        setSearchParams(values);
        setPagination((prev) => ({ ...prev, currentPage: 1 }));
    }, []);

    const handleReset = useCallback(() => {
        setSearchParams({});
        setPagination((prev) => ({ ...prev, currentPage: 1 }));
    }, []);

    const handlePageChange = useCallback((page: number, pageSize: number) => {
        setPagination({
            currentPage: page,
            pageSize,
        });
    }, []);

    const handleAdd = useCallback(async () => {
        try {
            await NiceModal.show(SnippetModal, {
                type: 'create',
            });
            refresh();
        } catch {
            // 用户取消操作
        }
    }, [refresh]);

    const handleEdit = useCallback(
        async (record: Snippet) => {
            try {
                await NiceModal.show(SnippetModal, {
                    type: 'edit',
                    snippet: record,
                });
                refresh();
            } catch {
                // 用户取消操作
            }
        },
        [refresh],
    );

    const handleDelete = useCallback(
        async (id: string) => {
            deleteSnippet(id);
        },
        [deleteSnippet],
    );

    const columns: ColumnsType<Snippet> = useMemo(
        () => [
            {
                title: '内容',
                dataIndex: 'content',
                width: 500,
                key: 'content',
            },
            {
                title: '状态',
                key: 'status',
                render: (_, record) => (
                    <Space direction="vertical" size="small">
                        <Tag color={record.published ? 'green' : 'orange'}>
                            {record.published ? '已发布' : '未发布'}
                        </Tag>
                        {record.isDraft && <Tag color="gray">草稿</Tag>}
                    </Space>
                ),
            },
            {
                title: '评论',
                dataIndex: 'allowComments',
                key: 'allowComments',
                render: (allowComments: boolean) => (
                    <Tag color={allowComments ? 'green' : 'red'}>
                        {allowComments ? '允许' : '禁止'}
                    </Tag>
                ),
            },
            {
                title: '创建时间',
                dataIndex: 'createdAt',
                key: 'createdAt',
                render: (text: string) => new Date(text).toLocaleString(),
            },
            {
                title: '操作',
                key: 'action',
                fixed: 'right',
                render: (_, record) => (
                    <Space>
                        {canEditSnippet && (
                            <Button
                                type="link"
                                icon={<EditOutlined />}
                                onClick={() => handleEdit(record)}
                            >
                                编辑片段
                            </Button>
                        )}
                        {canEditSnippet && (
                            <Popconfirm
                                title="确定要删除这个片段吗？"
                                onConfirm={() => handleDelete(record.id)}
                                okText="确定"
                                cancelText="取消"
                            >
                                <Button
                                    type="link"
                                    danger
                                    icon={<DeleteOutlined />}
                                    loading={deleteLoading}
                                >
                                    删除
                                </Button>
                            </Popconfirm>
                        )}
                    </Space>
                ),
            },
        ],
        [canEditSnippet, handleEdit, handleDelete, deleteLoading],
    );

    return (
        <div className={styles.pageContainer}>
            <SnippetSearchFilters
                key={urlSearchParams.toString() || 'snippet-search'}
                onSearch={handleSearch}
                onReset={handleReset}
                loading={loading}
                initialValues={initialSearchParams}
            />
            <SnippetTable
                columns={columns}
                dataSource={res?.data?.list ?? []}
                loading={loading}
                pagination={{
                    total: res?.data?.total ?? 0,
                    current: pagination.currentPage,
                    pageSize: pagination.pageSize,
                }}
                onPageChange={handlePageChange}
                addButton={canEditSnippet ? { text: '新增片段', onClick: handleAdd } : null}
            />
        </div>
    );
}

export default SnippetPageContainer;
