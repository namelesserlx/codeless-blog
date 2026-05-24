import { useState, useCallback, useMemo } from 'react';
import { Button, Space, Tag, message } from 'antd';
import { DeleteOutlined, CheckOutlined, CloseOutlined } from '@ant-design/icons';
import type { ColumnsType } from 'antd/es/table';
import { CommentSearchFilters } from './components/CommentSearchFilters';
import { CommentTable } from './components/CommentTable';
import { ArticleOption, AuthorOption, CommentListRequest, CommentStatus } from '@blog/shared';
import { useRequest } from 'ahooks';
import type { Comment } from '@blog/shared';
import dayjs from 'dayjs';
import { useSearchParams } from 'react-router';
import { commentService } from '@/services/blog/comment';
import { articleService } from '@/services/blog/article';
import styles from './index.module.less';
import { usePermission } from '@/hooks';

const buildInitialSearchParams = (params: URLSearchParams): Partial<CommentListRequest> => {
    const id = params.get('id');
    const status = params.get('status');

    const result: Partial<CommentListRequest> = {};

    if (id) {
        result.id = id;
    }

    if (status && Object.values(CommentStatus).includes(status as CommentStatus)) {
        result.status = status as CommentStatus;
    }

    return result;
};

/**
 * 评论管理页面 - 容器组件
 * 负责：数据拉取、业务逻辑（审核、拒绝、删除）
 */
function CommentPageContainer() {
    const [urlSearchParams] = useSearchParams();
    const { hasPermission } = usePermission();
    const initialSearchParams = useMemo(
        () => buildInitialSearchParams(urlSearchParams),
        [urlSearchParams],
    );
    const [searchParams, setSearchParams] =
        useState<Partial<CommentListRequest>>(initialSearchParams);
    const [pagination, setPagination] = useState({
        currentPage: 1,
        pageSize: 10,
    });
    const canEditComment = hasPermission('comment:edit');

    const {
        data: res,
        loading,
        refresh,
    } = useRequest(
        (params?: Partial<CommentListRequest>) => {
            const requestParams: CommentListRequest = {
                page: pagination.currentPage,
                pageSize: pagination.pageSize,
                ...searchParams,
                ...params,
            };
            return commentService.getCommentList(requestParams);
        },
        {
            refreshDeps: [pagination.currentPage, pagination.pageSize, searchParams],
            onSuccess: () => {
                message.success('获取评论列表成功');
            },
            onError: () => {
                message.error('获取评论列表失败');
            },
        },
    );

    const { data: articleOptionsRes } = useRequest(articleService.getArticleOptions);
    const articleOptions = useMemo(
        () =>
            (articleOptionsRes?.data ?? []).map((article: ArticleOption) => ({
                label: article.articleTitle,
                value: article.articleId,
            })),
        [articleOptionsRes],
    );

    const { data: authorOptionsRes } = useRequest(articleService.getAuthorOptions);
    const authorOptions = useMemo(
        () =>
            (authorOptionsRes?.data ?? []).map((author: AuthorOption) => ({
                label: author.nickname || author.username,
                value: author.id,
            })),
        [authorOptionsRes],
    );

    const handleSearch = useCallback((values: Partial<CommentListRequest>) => {
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

    const handleApprove = useCallback(
        async (record: Comment) => {
            await commentService.updateComment({
                id: record.id,
                status: CommentStatus.PUBLISHED,
            });
            message.success('审核通过');
            refresh();
        },
        [refresh],
    );

    const handleReject = useCallback(
        async (record: Comment) => {
            await commentService.updateComment({
                id: record.id,
                status: CommentStatus.REJECTED,
            });
            message.success('已拒绝');
            refresh();
        },
        [refresh],
    );

    const handleDelete = useCallback(
        async (record: Comment) => {
            await commentService.deleteComment(record.id);
            message.success('删除成功');
            refresh();
        },
        [refresh],
    );

    const columns: ColumnsType<Comment> = useMemo(
        () => [
            {
                title: '评论ID',
                dataIndex: 'id',
                key: 'id',
                width: 80,
            },
            {
                title: '评论文章',
                key: 'postId',
                width: 150,
                render: (_, row) => {
                    const comment = row as Comment & { post?: { title?: string } };
                    return <div>{comment.post?.title ?? comment.postTitle ?? '-'}</div>;
                },
            },
            {
                title: '评论内容',
                key: 'content',
                width: 200,
                render: (_, row) => <div>{row.content}</div>,
            },
            {
                title: '评论人',
                key: 'authorName',
                width: 120,
                render: (_, row) => <div>{row.author?.nickname || row.author?.username}</div>,
            },
            {
                title: '评论时间',
                dataIndex: 'createdAt',
                key: 'createdAt',
                width: 120,
                render: (createdAt: Date) => (
                    <div>{dayjs(createdAt).format('YYYY-MM-DD HH:mm:ss')}</div>
                ),
            },
            {
                title: '是否回复评论',
                dataIndex: 'parentId',
                key: 'parentId',
                width: 120,
                render: (parentId: number) => <div>{parentId ? '是' : '否'}</div>,
            },
            {
                title: '回复人',
                key: 'receiverId',
                width: 120,
                render: (_, row) => (
                    <div>{row.receiver?.nickname || row.receiver?.username || '-'}</div>
                ),
            },
            {
                title: '状态',
                dataIndex: 'status',
                key: 'status',
                width: 120,
                render: (status: CommentStatus) => (
                    <Tag color={status === CommentStatus.PUBLISHED ? 'green' : 'default'}>
                        {status}
                    </Tag>
                ),
            },
            {
                title: '操作',
                key: 'action',
                width: 120,
                fixed: 'right',
                render: (_, record) => (
                    <Space>
                        {canEditComment && (
                            <Space>
                                <Button
                                    type="link"
                                    icon={<CheckOutlined />}
                                    disabled={record.status === CommentStatus.PUBLISHED}
                                    onClick={() => handleApprove(record)}
                                >
                                    通过
                                </Button>
                                <Button
                                    type="link"
                                    danger
                                    icon={<CloseOutlined />}
                                    disabled={record.status === CommentStatus.REJECTED}
                                    onClick={() => handleReject(record)}
                                >
                                    拒绝
                                </Button>
                                <Button
                                    type="link"
                                    danger
                                    icon={<DeleteOutlined />}
                                    onClick={() => handleDelete(record)}
                                >
                                    删除
                                </Button>
                            </Space>
                        )}
                    </Space>
                ),
            },
        ],
        [canEditComment, handleApprove, handleReject, handleDelete],
    );

    return (
        <div className={styles.pageContainer}>
            <CommentSearchFilters
                key={urlSearchParams.toString() || 'comment-search'}
                onSearch={handleSearch}
                onReset={handleReset}
                loading={loading}
                articleOptions={articleOptions}
                authorOptions={authorOptions}
                initialValues={initialSearchParams}
            />
            <CommentTable
                columns={columns}
                dataSource={res?.data?.list ?? []}
                loading={loading}
                pagination={{
                    total: res?.data?.total ?? 0,
                    current: pagination.currentPage,
                    pageSize: pagination.pageSize,
                }}
                onPageChange={handlePageChange}
            />
        </div>
    );
}

export default CommentPageContainer;
