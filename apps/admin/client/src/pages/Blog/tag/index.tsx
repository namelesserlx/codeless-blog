import { useState, useCallback, useMemo } from 'react';
import { Button, Space, Tag, Popconfirm, message } from 'antd';
import { EditOutlined, DeleteOutlined, TagOutlined } from '@ant-design/icons';
import type { ColumnsType } from 'antd/es/table';
import NiceModal from '@ebay/nice-modal-react';
import { TagSearchFilters } from './components/TagSearchFilters';
import { TagTable } from './components/TagTable';
import { TagModal } from './components/TagModal';
import { tagService } from '@/services/blog/tag';
import { TagListRequest, TagWithStats } from '@blog/shared';
import { useRequest } from 'ahooks';
import styles from './index.module.less';
import { usePermission } from '@/hooks';

/**
 * 标签管理页面 - 容器组件
 * 负责：数据拉取、业务逻辑（增删改查）
 */
function TagPageContainer() {
    const { hasPermission } = usePermission();
    const [searchParams, setSearchParams] = useState<Partial<TagListRequest>>({});
    const [pagination, setPagination] = useState({
        currentPage: 1,
        pageSize: 10,
    });
    const canEditTag = hasPermission('tag:edit');

    const {
        data: res,
        loading,
        refresh,
    } = useRequest(
        (params?: Partial<TagListRequest>) => {
            const requestParams: TagListRequest = {
                page: pagination.currentPage,
                pageSize: pagination.pageSize,
                ...searchParams,
                ...params,
            };
            return tagService.getTagList(requestParams);
        },
        {
            refreshDeps: [pagination.currentPage, pagination.pageSize, searchParams],
            onSuccess: () => {
                message.success('获取标签列表成功');
            },
            onError: () => {
                message.error('获取标签列表失败');
            },
        },
    );

    const { run: deleteTag, loading: deleteLoading } = useRequest(tagService.deleteTag, {
        manual: true,
        onSuccess: () => {
            message.success('删除成功');
            refresh();
        },
        onError: (error) => {
            const errorMessage = error instanceof Error ? error.message : '删除失败';
            message.error(errorMessage);
        },
    });

    const handleSearch = useCallback((values: Partial<TagListRequest>) => {
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
            await NiceModal.show(TagModal, {
                type: 'create',
            });
            refresh();
        } catch {
            // 用户取消操作
        }
    }, [refresh]);

    const handleEdit = useCallback(
        async (record: TagWithStats) => {
            try {
                await NiceModal.show(TagModal, {
                    type: 'edit',
                    tag: record,
                });
                refresh();
            } catch {
                // 用户取消操作
            }
        },
        [refresh],
    );

    const handleDelete = useCallback(
        async (id: number) => {
            deleteTag(id);
        },
        [deleteTag],
    );

    const columns: ColumnsType<TagWithStats> = useMemo(
        () => [
            {
                title: 'ID',
                dataIndex: 'id',
                key: 'id',
                width: 80,
            },
            {
                title: '标签名称',
                dataIndex: 'name',
                key: 'name',
                width: 200,
                render: (name: string) => (
                    <Tag icon={<TagOutlined />} color="blue">
                        {name}
                    </Tag>
                ),
            },
            {
                title: '关联文章数',
                dataIndex: '_count',
                key: 'postCount',
                width: 120,
                render: (_count: TagWithStats['_count']) => (
                    <Tag color={_count.posts > 0 ? 'green' : 'default'}>{_count.posts} 篇</Tag>
                ),
            },
            {
                title: '操作',
                key: 'action',
                width: 160,
                fixed: 'right',
                render: (_, record) => (
                    <Space>
                        {canEditTag && (
                            <Button
                                type="link"
                                icon={<EditOutlined />}
                                onClick={() => handleEdit(record)}
                            >
                                编辑
                            </Button>
                        )}
                        {canEditTag && (
                            <Popconfirm
                                title={`确定要删除标签 "${record.name}" 吗？`}
                                description={
                                    record._count.posts > 0
                                        ? `该标签关联了 ${record._count.posts} 篇文章，删除后将解除关联关系。`
                                        : '删除后将无法恢复。'
                                }
                                onConfirm={() => handleDelete(record.id)}
                                okText="确定"
                                cancelText="取消"
                                disabled={record._count.posts > 0}
                            >
                                <Button
                                    type="link"
                                    danger
                                    icon={<DeleteOutlined />}
                                    loading={deleteLoading}
                                    disabled={record._count.posts > 0}
                                >
                                    删除
                                </Button>
                            </Popconfirm>
                        )}
                    </Space>
                ),
            },
        ],
        [canEditTag, handleEdit, handleDelete, deleteLoading],
    );

    return (
        <div className={styles.pageContainer}>
            <TagSearchFilters onSearch={handleSearch} onReset={handleReset} loading={loading} />
            <TagTable
                columns={columns}
                dataSource={res?.data?.list ?? []}
                loading={loading}
                pagination={{
                    total: res?.data?.total ?? 0,
                    current: pagination.currentPage,
                    pageSize: pagination.pageSize,
                }}
                onPageChange={handlePageChange}
                addButton={canEditTag ? { text: '新增标签', onClick: handleAdd } : null}
            />
        </div>
    );
}

export { TagPageContainer as Component };
export default TagPageContainer;
