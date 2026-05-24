import { useState, useCallback, useMemo, useRef } from 'react';
import { Button, Space, Input, Modal, message, Popconfirm, Image } from 'antd';
import { EditOutlined, DeleteOutlined } from '@ant-design/icons';
import type { ColumnsType } from 'antd/es/table';
import NiceModal from '@ebay/nice-modal-react';
import { PhotoSearchFilters } from './components/PhotoSearchFilters';
import { PhotoTable } from './components/PhotoTable';
import { PhotoModal } from './components/PhotoModal';
import { photoService } from '@/services/blog/photo';
import { photoCategoryOptions, PhotoListRequest, PhotoExportItem, type Photo } from '@blog/shared';
import { useRequest } from 'ahooks';
import { valueToTags } from '@/utils';
import dayjs from 'dayjs';
import type { ChangeEvent } from 'react';
import JSZip from 'jszip';
import styles from './index.module.less';
import { usePermission } from '@/hooks';

/**
 * 相册管理页面 - 容器组件
 * 负责：数据拉取、业务逻辑（增删改、导入导出）
 */
function PhotoPageContainer() {
    const { hasPermission } = usePermission();
    const [searchParams, setSearchParams] = useState<Partial<PhotoListRequest>>({});
    const [pagination, setPagination] = useState({
        currentPage: 1,
        pageSize: 10,
    });
    const [selectedRowKeys, setSelectedRowKeys] = useState<React.Key[]>([]);
    const [importModalVisible, setImportModalVisible] = useState(false);
    const [importJson, setImportJson] = useState('');
    const fileInputRef = useRef<HTMLInputElement | null>(null);
    const canEditPhoto = hasPermission('photo:edit');

    const extractPhotosFromParsed = useCallback((parsed: unknown): PhotoExportItem[] => {
        if (Array.isArray(parsed)) {
            return parsed as PhotoExportItem[];
        }

        if (parsed && typeof parsed === 'object') {
            const obj = parsed as { photos?: unknown; originalId?: unknown };

            if (Array.isArray(obj.photos)) {
                return obj.photos as PhotoExportItem[];
            }

            if (
                obj.originalId &&
                (typeof obj.originalId === 'number' || typeof obj.originalId === 'string')
            ) {
                return [parsed as PhotoExportItem];
            }
        }

        throw new Error('JSON 结构不正确，应为相册数组、单个相册对象或 { photos: [] }');
    }, []);

    const {
        data: res,
        loading,
        refresh,
    } = useRequest(
        (params?: Partial<PhotoListRequest>) => {
            const requestParams: PhotoListRequest = {
                page: pagination.currentPage,
                pageSize: pagination.pageSize,
                ...searchParams,
                ...params,
            };
            return photoService.getPhotoList(requestParams);
        },
        {
            refreshDeps: [pagination.currentPage, pagination.pageSize, searchParams],
            onSuccess: () => {
                message.success('获取相册列表成功');
            },
            onError: () => {
                message.error('获取相册列表失败');
            },
        },
    );

    const { run: deletePhoto, loading: deleteLoading } = useRequest(photoService.deletePhoto, {
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

    const { run: exportPhotos, loading: exportLoading } = useRequest(photoService.exportPhotos, {
        manual: true,
        onSuccess: (res) => {
            const data = (res?.data || []) as PhotoExportItem[];

            if (!Array.isArray(data) || data.length === 0) {
                message.warning('没有可导出的相册数据');
                return;
            }

            try {
                data.forEach((item) => {
                    const safeTitle = (item.title || 'album').replace(/[\\/:*?"<>|]/g, '_');
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

                message.success(`导出相册成功，共 ${data.length} 个`);
            } catch {
                message.error('导出相册失败');
            }
        },
        onError: (error) => {
            const errorMessage = error instanceof Error ? error.message : '导出相册失败';
            message.error(errorMessage);
        },
    });

    const { run: exportAllPhotos, loading: exportAllLoading } = useRequest(
        photoService.exportAllPhotos,
        {
            manual: true,
            onSuccess: async (res) => {
                const data = (res?.data || []) as PhotoExportItem[];

                if (!Array.isArray(data) || data.length === 0) {
                    message.warning('没有可导出的相册数据');
                    return;
                }

                try {
                    const zip = new JSZip();

                    data.forEach((item) => {
                        const safeTitle = (item.title || 'album').replace(/[\\/:*?"<>|]/g, '_');
                        const fileName = `${safeTitle}_${item.originalId}.json`;
                        zip.file(fileName, JSON.stringify(item, null, 2));
                    });

                    const blob = await zip.generateAsync({ type: 'blob' });
                    const url = URL.createObjectURL(blob);
                    const a = document.createElement('a');
                    a.href = url;
                    a.download = `blog-photos-${Date.now()}.zip`;
                    a.click();
                    URL.revokeObjectURL(url);

                    message.success(`导出全部相册成功，共 ${data.length} 个`);
                } catch {
                    message.error('导出全部相册失败');
                }
            },
            onError: (error) => {
                const errorMessage = error instanceof Error ? error.message : '导出全部相册失败';
                message.error(errorMessage);
            },
        },
    );

    const { run: importPhotos, loading: importLoading } = useRequest(photoService.importPhotos, {
        manual: true,
        onSuccess: (res) => {
            const successCount = res?.data?.successCount ?? 0;
            const failCount = res?.data?.failCount ?? 0;
            message.success(`导入完成，成功 ${successCount} 个，失败 ${failCount} 个`);
            setImportModalVisible(false);
            setImportJson('');
            refresh();
        },
        onError: (error) => {
            const errorMessage = error instanceof Error ? error.message : '导入相册失败';
            message.error(errorMessage);
        },
    });

    const handleSearch = useCallback((values: Partial<PhotoListRequest>) => {
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
            await NiceModal.show(PhotoModal, {
                type: 'create',
            });
            refresh();
        } catch {
            // 用户取消操作
        }
    }, [refresh]);

    const handleEdit = useCallback(
        async (record: Photo) => {
            try {
                await NiceModal.show(PhotoModal, {
                    type: 'edit',
                    photo: record,
                });
                refresh();
            } catch {
                // 用户取消操作
            }
        },
        [refresh],
    );

    const handleDelete = useCallback(
        (id: number) => {
            deletePhoto(id);
        },
        [deletePhoto],
    );

    const handleExportSelected = useCallback(() => {
        if (!selectedRowKeys.length) {
            message.warning('请先选择要导出的相册');
            return;
        }
        exportPhotos(selectedRowKeys as number[]);
    }, [exportPhotos, selectedRowKeys]);

    const handleOpenImport = useCallback(() => {
        setImportModalVisible(true);
    }, []);

    const handleImportFileClick = useCallback(() => {
        fileInputRef.current?.click();
    }, []);

    const handleImportFileChange = useCallback(
        (event: ChangeEvent<HTMLInputElement>) => {
            const { files } = event.target;
            if (!files || files.length === 0) {
                return;
            }

            const readers: Promise<PhotoExportItem[]>[] = Array.from(files).map(
                (file: File) =>
                    new Promise<PhotoExportItem[]>((resolve, reject) => {
                        const reader = new FileReader();
                        reader.onload = () => {
                            try {
                                const text = String(reader.result ?? '');
                                const parsed = JSON.parse(text);
                                const photos = extractPhotosFromParsed(parsed);
                                resolve(photos);
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
                .then((allPhotos) => {
                    const merged = allPhotos.flat();
                    if (!merged.length) {
                        message.warning('没有可导入的相册数据');
                        return;
                    }
                    importPhotos({ photos: merged });
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
        [extractPhotosFromParsed, importPhotos],
    );

    const handleImportSubmit = useCallback(() => {
        if (!importJson.trim()) {
            message.warning('请先粘贴 JSON 配置内容');
            return;
        }
        try {
            const parsed = JSON.parse(importJson);
            const photos = extractPhotosFromParsed(parsed);
            importPhotos({ photos });
        } catch (error) {
            const errorMessage =
                error instanceof Error
                    ? error.message
                    : 'JSON 格式解析失败，请检查内容是否为有效的 JSON';
            message.error(errorMessage);
        }
    }, [extractPhotosFromParsed, importJson, importPhotos]);

    const columns: ColumnsType<Photo> = useMemo(
        () => [
            {
                title: '相册名称',
                dataIndex: 'title',
                key: 'title',
                width: 200,
            },
            {
                title: '相册图片',
                dataIndex: 'src',
                key: 'src',
                render: (src: string | string[]) => {
                    if (Array.isArray(src)) {
                        return (
                            <Space>
                                {src.map((url) => (
                                    <Image key={url} src={url} width={150} height={150} />
                                ))}
                            </Space>
                        );
                    }
                    return <Image src={src} width={100} height={100} />;
                },
            },
            {
                title: '相册描述',
                dataIndex: 'description',
                key: 'description',
                width: 200,
            },
            {
                title: '相册分类',
                dataIndex: 'category',
                key: 'category',
                width: 100,
                render: (category: string) => valueToTags(photoCategoryOptions, category),
            },
            {
                title: '相册标签',
                dataIndex: 'tags',
                key: 'tags',
                width: 200,
            },
            {
                title: '相册日期',
                dataIndex: 'date',
                key: 'date',
                width: 200,
                render: (date: string) => dayjs(date).format('YYYY-MM-DD'),
            },
            {
                title: '相册位置',
                dataIndex: 'location',
                key: 'location',
                width: 200,
            },
            {
                title: '操作',
                key: 'action',
                width: 160,
                fixed: 'right',
                render: (_, record) => (
                    <Space>
                        {canEditPhoto && (
                            <Button
                                type="link"
                                icon={<EditOutlined />}
                                onClick={() => handleEdit(record)}
                            >
                                编辑
                            </Button>
                        )}
                        {canEditPhoto && (
                            <Popconfirm
                                title={`确定要删除相册 "${record.title}" 吗？`}
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
        [canEditPhoto, handleEdit, handleDelete, deleteLoading],
    );

    const toolbar = (
        <Space>
            {canEditPhoto && (
                <Button type="primary" onClick={handleAdd}>
                    新增相册
                </Button>
            )}
            {canEditPhoto && (
                <>
                    <Button
                        onClick={handleExportSelected}
                        loading={exportLoading}
                        disabled={!selectedRowKeys.length}
                    >
                        导出选中相册(JSON)
                    </Button>
                    <Button onClick={() => exportAllPhotos()} loading={exportAllLoading}>
                        导出全部相册(ZIP)
                    </Button>
                </>
            )}
            {canEditPhoto && (
                <>
                    <Button onClick={handleImportFileClick}>从 JSON 文件导入</Button>
                    <Button onClick={handleOpenImport}>粘贴 JSON 导入</Button>
                </>
            )}
        </Space>
    );

    const rowSelection = canEditPhoto
        ? {
              selectedRowKeys,
              onChange: (keys: React.Key[]) => {
                  setSelectedRowKeys(keys);
              },
          }
        : undefined;

    return (
        <div className={styles.pageContainer}>
            <PhotoSearchFilters onSearch={handleSearch} onReset={handleReset} loading={loading} />

            <PhotoTable
                columns={columns}
                dataSource={res?.data?.list ?? []}
                loading={loading}
                pagination={{
                    total: res?.data?.total ?? 0,
                    current: pagination.currentPage,
                    pageSize: pagination.pageSize,
                }}
                onPageChange={handlePageChange}
                toolbar={toolbar}
                rowSelection={rowSelection}
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
                title="导入相册(JSON)"
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
                    placeholder="请粘贴通过导出功能生成的 JSON 内容，支持直接为相册数组、单个相册对象或 { photos: PhotoExportItem[] } 结构"
                />
            </Modal>
        </div>
    );
}

export default PhotoPageContainer;
