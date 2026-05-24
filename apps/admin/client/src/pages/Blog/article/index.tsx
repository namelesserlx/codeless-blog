import { useState, useCallback, useMemo, useRef } from 'react';
import { Input, Button, Space, Tag, Avatar, message, Popconfirm, Image, Modal } from 'antd';
import {
    EditOutlined,
    DeleteOutlined,
    EyeOutlined,
    UserOutlined,
    SettingOutlined,
} from '@ant-design/icons';
import type { ColumnsType } from 'antd/es/table';
import NiceModal from '@ebay/nice-modal-react';
import { ArticleSearchFilters } from './components/ArticleSearchFilters';
import { ArticleTable } from './components/ArticleTable';
import { ArticleModal } from './components/ArticleModal';
import { clientEnv } from '@/config/env';
import { articleService } from '@/services/blog/article';
import {
    ArticleListRequest,
    ArticleListItem,
    CardType,
    CardTypeLabels,
    CardTypeColors,
    AuthorOption,
    ArticleExportItem,
} from '@blog/shared';
import { useRequest } from 'ahooks';
import { useNavigate, useSearchParams } from 'react-router';
import type { ChangeEvent } from 'react';
import JSZip from 'jszip';
import { usePermission } from '@/hooks';
import useUserStore from '@/stores/user';

/**
 * 文章管理页面 - 容器组件
 * 负责：数据拉取、业务逻辑（增删改、导入导出）
 */
const parseBooleanParam = (value: string | null): boolean | undefined => {
    if (value === 'true') return true;
    if (value === 'false') return false;
    return undefined;
};

const buildInitialSearchParams = (params: URLSearchParams): Partial<ArticleListRequest> => {
    const published = parseBooleanParam(params.get('published'));
    const isDraft = parseBooleanParam(params.get('isDraft'));

    return {
        ...(published !== undefined ? { published } : {}),
        ...(isDraft !== undefined ? { isDraft } : {}),
    };
};

function ArticlePageContainer() {
    const navigate = useNavigate();
    const { hasPermission } = usePermission();
    const userInfo = useUserStore((state) => state.userInfo);
    const [urlSearchParams] = useSearchParams();
    const initialSearchParams = useMemo(
        () => buildInitialSearchParams(urlSearchParams),
        [urlSearchParams],
    );
    const [searchParams, setSearchParams] =
        useState<Partial<ArticleListRequest>>(initialSearchParams);
    const [pagination, setPagination] = useState({
        currentPage: 1,
        pageSize: 10,
    });
    const [selectedRowKeys, setSelectedRowKeys] = useState<React.Key[]>([]);
    const [importModalVisible, setImportModalVisible] = useState(false);
    const [importJson, setImportJson] = useState('');
    const fileInputRef = useRef<HTMLInputElement | null>(null);
    const canWriteArticle = hasPermission('article:write');
    const canManageArticle = hasPermission('article:manage');

    const extractArticlesFromParsed = useCallback((parsed: unknown): ArticleExportItem[] => {
        if (Array.isArray(parsed)) {
            return parsed as ArticleExportItem[];
        }

        if (parsed && typeof parsed === 'object') {
            const obj = parsed as { articles?: unknown; originalId?: unknown; title?: unknown };

            if (Array.isArray(obj.articles)) {
                return obj.articles as ArticleExportItem[];
            }

            if (obj.originalId && typeof obj.originalId === 'string') {
                return [parsed as ArticleExportItem];
            }
        }

        throw new Error('JSON 结构不正确，应为文章数组、单个文章对象或 { articles: [] }');
    }, []);

    const {
        data: res,
        loading,
        refresh,
    } = useRequest(
        (params?: Partial<ArticleListRequest>) => {
            const requestParams: ArticleListRequest = {
                page: pagination.currentPage,
                pageSize: pagination.pageSize,
                ...searchParams,
                ...params,
            };
            return articleService.getArticleList(requestParams);
        },
        {
            refreshDeps: [pagination.currentPage, pagination.pageSize, searchParams],
            onSuccess: () => {
                message.success('获取文章列表成功');
            },
            onError: () => {
                message.error('获取文章列表失败');
            },
        },
    );

    const { data: authorOptionsRes } = useRequest(articleService.getAuthorOptions);
    const authorOptions = useMemo(() => {
        const list = (authorOptionsRes?.data || []) as AuthorOption[];
        return list.map((author) => ({
            label: author.nickname || author.username,
            value: author.id,
        }));
    }, [authorOptionsRes]);

    const { run: exportArticles, loading: exportLoading } = useRequest(
        articleService.exportArticles,
        {
            manual: true,
            onSuccess: (res) => {
                const data = (res?.data || []) as ArticleExportItem[];

                if (!Array.isArray(data) || data.length === 0) {
                    message.warning('没有可导出的文章数据');
                    return;
                }

                try {
                    data.forEach((item) => {
                        const safeTitle = (item.title || 'article').replace(/[\\/:*?"<>|]/g, '_');
                        const fileName = `${safeTitle}_${item.originalId}.json`;

                        const blob = new Blob([JSON.stringify(item, null, 2)], {
                            type: 'application/json;charset=utf-8',
                        });
                        const url = URL.createObjectURL(blob);
                        const a = document.createElement('a');
                        a.href = url;
                        a.download = fileName;
                        a.click();
                        URL.revokeObjectURL(url);
                    });

                    message.success(`导出文章成功，共 ${data.length} 篇`);
                } catch {
                    message.error('导出文章失败');
                }
            },
            onError: (error) => {
                const errorMessage = error instanceof Error ? error.message : '导出文章失败';
                message.error(errorMessage);
            },
        },
    );

    const { run: exportAllArticles, loading: exportAllLoading } = useRequest(
        articleService.exportAllArticles,
        {
            manual: true,
            onSuccess: async (res) => {
                const data = (res?.data || []) as ArticleExportItem[];

                if (!Array.isArray(data) || data.length === 0) {
                    message.warning('没有可导出的文章数据');
                    return;
                }

                try {
                    const zip = new JSZip();

                    data.forEach((item) => {
                        const safeTitle = (item.title || 'article').replace(/[\\/:*?"<>|]/g, '_');
                        const fileName = `${safeTitle}_${item.originalId}.json`;
                        zip.file(fileName, JSON.stringify(item, null, 2));
                    });

                    const blob = await zip.generateAsync({ type: 'blob' });
                    const url = URL.createObjectURL(blob);
                    const a = document.createElement('a');
                    a.href = url;
                    a.download = `blog-articles-${Date.now()}.zip`;
                    a.click();
                    URL.revokeObjectURL(url);

                    message.success(`导出全部文章成功，共 ${data.length} 篇`);
                } catch {
                    message.error('导出全部文章失败');
                }
            },
            onError: (error) => {
                const errorMessage = error instanceof Error ? error.message : '导出全部文章失败';
                message.error(errorMessage);
            },
        },
    );

    const { run: importArticles, loading: importLoading } = useRequest(
        articleService.importArticles,
        {
            manual: true,
            onSuccess: (res) => {
                const successCount = res?.data?.successCount ?? 0;
                const failCount = res?.data?.failCount ?? 0;
                message.success(`导入完成，成功 ${successCount} 篇，失败 ${failCount} 篇`);
                setImportModalVisible(false);
                setImportJson('');
                refresh();
            },
            onError: (error) => {
                const errorMessage = error instanceof Error ? error.message : '导入文章失败';
                message.error(errorMessage);
            },
        },
    );

    const { run: deleteArticle, loading: deleteLoading } = useRequest(
        articleService.deleteArticle,
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

    const { run: reindexSearch, loading: reindexSearchLoading } = useRequest(
        articleService.reindexSearch,
        {
            manual: true,
            onSuccess: () => {
                message.success('重新索引搜索成功');
            },
            onError: (error) => {
                const errorMessage = error instanceof Error ? error.message : '重新索引搜索失败';
                message.error(errorMessage);
            },
        },
    );

    const handleSearch = useCallback((values: Partial<ArticleListRequest>) => {
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
            await NiceModal.show(ArticleModal, {
                type: 'create',
            });
            refresh();
        } catch {
            // 用户取消操作
        }
    }, [refresh]);

    const handleDelete = useCallback(
        async (id: string) => {
            deleteArticle(id);
        },
        [deleteArticle],
    );

    const handleExport = useCallback(() => {
        if (!selectedRowKeys.length) {
            message.warning('请先选择要导出的文章');
            return;
        }
        exportArticles(selectedRowKeys as string[]);
    }, [exportArticles, selectedRowKeys]);

    const handleOpenImport = useCallback(() => {
        setImportModalVisible(true);
    }, []);

    const handleImportFileClick = useCallback(() => {
        if (fileInputRef.current) {
            fileInputRef.current.click();
        }
    }, []);

    const handleImportFileChange = useCallback(
        (event: ChangeEvent<HTMLInputElement>) => {
            const { files } = event.target;
            if (!files || files.length === 0) {
                return;
            }

            const readers: Promise<ArticleExportItem[]>[] = Array.from(files).map(
                (file: File) =>
                    new Promise<ArticleExportItem[]>((resolve, reject) => {
                        const reader = new FileReader();
                        reader.onload = () => {
                            try {
                                const text = String(reader.result ?? '');
                                const parsed = JSON.parse(text);
                                const articles = extractArticlesFromParsed(parsed);
                                resolve(articles);
                            } catch (error) {
                                reject(error);
                            }
                        };
                        reader.onerror = () => {
                            reject(reader.error || new Error('文件读取失败'));
                        };
                        reader.readAsText(file, 'utf-8');
                    }),
            );

            Promise.all(readers)
                .then((allArticles) => {
                    const merged = allArticles.flat();
                    if (!merged.length) {
                        message.warning('没有可导入的文章数据');
                        return;
                    }
                    importArticles({ articles: merged });
                })
                .catch((error) => {
                    const errorMessage =
                        error instanceof Error ? error.message : '解析 JSON 文件失败';
                    message.error(errorMessage);
                })
                .finally(() => {
                    event.target.value = '';
                });
        },
        [extractArticlesFromParsed, importArticles],
    );

    const handleImportSubmit = useCallback(() => {
        if (!importJson.trim()) {
            message.warning('请先粘贴 JSON 配置内容');
            return;
        }
        try {
            const parsed = JSON.parse(importJson);
            const articles = extractArticlesFromParsed(parsed);
            importArticles({ articles });
        } catch (error) {
            const errorMessage =
                error instanceof Error
                    ? error.message
                    : 'JSON 格式解析失败，请检查内容是否为有效的 JSON';
            message.error(errorMessage);
        }
    }, [extractArticlesFromParsed, importArticles, importJson]);

    const handlePreview = useCallback(async (record: ArticleListItem) => {
        const blogPublicUrl = clientEnv.urls.blog;

        try {
            const articleDetailRes = await articleService.getArticleDetail(record.id);
            const res = await articleService.createPreview(articleDetailRes.data);
            const previewUrl = `${blogPublicUrl}/articles/${record.id}?preview=true&previewToken=${encodeURIComponent(res.data.token)}`;
            window.open(previewUrl, '_blank', 'noopener,noreferrer');
        } catch (error) {
            const errorMessage = error instanceof Error ? error.message : '创建预览失败';
            message.error(errorMessage);
        }
    }, []);

    const handleReindexSearch = useCallback(() => {
        reindexSearch();
    }, [reindexSearch]);

    const columns: ColumnsType<ArticleListItem> = [
        {
            title: '封面',
            dataIndex: 'cardImageUrl',
            key: 'cardImageUrl',
            width: 80,
            render: (cardImageUrl: string) => (
                <Image
                    src={cardImageUrl || '/images/default-article.png'}
                    width={60}
                    height={40}
                    style={{ objectFit: 'cover', borderRadius: 4 }}
                    fallback="/images/default-article.png"
                />
            ),
        },
        {
            title: '标题',
            dataIndex: 'title',
            key: 'title',
            width: 200,
            ellipsis: true,
            render: (title: string) => <span title={title}>{title}</span>,
        },
        {
            title: '作者',
            dataIndex: 'author',
            key: 'author',
            width: 120,
            render: (author: ArticleListItem['author']) => (
                <Space>
                    <Avatar src={author.avatar} icon={<UserOutlined />} size="small" />
                    <span>{author.nickname || author.username}</span>
                </Space>
            ),
        },
        {
            title: '卡片类型',
            dataIndex: 'cardType',
            key: 'cardType',
            width: 100,
            render: (cardType: CardType) => (
                <Tag color={CardTypeColors[cardType]}>{CardTypeLabels[cardType]}</Tag>
            ),
        },
        {
            title: '标签',
            dataIndex: 'tags',
            key: 'tags',
            width: 150,
            render: (tags: ArticleListItem['tags']) => (
                <Space wrap>
                    {tags.slice(0, 3).map((tag) => (
                        <Tag key={tag.id} color="blue">
                            {tag.name}
                        </Tag>
                    ))}
                    {tags.length > 3 && <Tag>+{tags.length - 3}</Tag>}
                </Space>
            ),
        },
        {
            title: '状态',
            key: 'status',
            width: 120,
            render: (_, record) => (
                <Space orientation="vertical" size="small">
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
            width: 80,
            render: (allowComments: boolean) => (
                <Tag color={allowComments ? 'green' : 'red'}>{allowComments ? '允许' : '禁止'}</Tag>
            ),
        },
        {
            title: '创建时间',
            dataIndex: 'createdAt',
            key: 'createdAt',
            width: 180,
            render: (text: string) => new Date(text).toLocaleString(),
        },
        {
            title: '操作',
            key: 'action',
            width: 250,
            fixed: 'right',
            render: (_, record) => {
                const canEditOwnDraft =
                    canWriteArticle &&
                    record.authorId === userInfo?.id &&
                    record.isDraft &&
                    !record.published;
                const canOpenArticleEditor = canManageArticle || canEditOwnDraft;

                return (
                    <Space>
                        <Button
                            type="link"
                            icon={<EyeOutlined />}
                            onClick={() => void handlePreview(record)}
                        >
                            预览
                        </Button>
                        {canOpenArticleEditor && (
                            <Button
                                type="link"
                                icon={<EditOutlined />}
                                onClick={() =>
                                    navigate(`/blog/article/edit/${record.id}/fullscreen`, {
                                        state: {
                                            source: 'article-list',
                                            returnPath: '/blog/article',
                                        },
                                    })
                                }
                            >
                                编辑文章
                            </Button>
                        )}
                        {canManageArticle && (
                            <Button
                                type="link"
                                icon={<SettingOutlined />}
                                onClick={() => navigate(`/blog/article/edit/${record.id}`)}
                            >
                                设置文章
                            </Button>
                        )}
                        {canManageArticle && (
                            <Popconfirm
                                title="确定要删除这篇文章吗？"
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
                );
            },
        },
    ];

    const toolbar = (
        <Space>
            {canWriteArticle && (
                <Button type="primary" onClick={handleAdd}>
                    新增文章
                </Button>
            )}
            {canManageArticle && (
                <>
                    <Button
                        onClick={handleExport}
                        loading={exportLoading}
                        disabled={!selectedRowKeys.length}
                    >
                        导出选中文章(JSON)
                    </Button>
                    <Button onClick={() => exportAllArticles()} loading={exportAllLoading}>
                        导出全部文章(ZIP)
                    </Button>
                </>
            )}
            {canManageArticle && (
                <>
                    <Button onClick={handleImportFileClick}>从 JSON 文件导入</Button>
                    <Button onClick={handleOpenImport}>粘贴 JSON 导入</Button>
                </>
            )}
            {canManageArticle && (
                <Button type="primary" onClick={handleReindexSearch} loading={reindexSearchLoading}>
                    重新索引搜索
                </Button>
            )}
        </Space>
    );

    const tablePagination = {
        total: res?.data?.total || 0,
        current: pagination.currentPage,
        pageSize: pagination.pageSize,
    };

    return (
        <div>
            <ArticleSearchFilters
                key={urlSearchParams.toString() || 'article-search'}
                onSearch={handleSearch}
                onReset={handleReset}
                loading={loading}
                authorOptions={authorOptions}
                initialValues={initialSearchParams}
            />

            <ArticleTable
                columns={columns}
                dataSource={res?.data?.list || []}
                loading={loading}
                pagination={tablePagination}
                onPageChange={handlePageChange}
                toolbar={toolbar}
                rowSelection={
                    canManageArticle
                        ? {
                              selectedRowKeys,
                              onChange: setSelectedRowKeys,
                          }
                        : undefined
                }
            />

            <input
                ref={fileInputRef}
                type="file"
                accept=".json,application/json"
                style={{ display: 'none' }}
                multiple
                onChange={handleImportFileChange}
            />

            <Modal
                title="导入文章(JSON)"
                open={importModalVisible}
                onCancel={() => setImportModalVisible(false)}
                onOk={handleImportSubmit}
                confirmLoading={importLoading}
                width={800}
            >
                <Input.TextArea
                    rows={12}
                    value={importJson}
                    onChange={(e) => setImportJson(e.target.value)}
                    placeholder="请粘贴通过导出功能生成的 JSON 内容，支持直接为文章数组或 { articles: ArticleExportItem[] } 结构"
                />
            </Modal>
        </div>
    );
}

export default ArticlePageContainer;
