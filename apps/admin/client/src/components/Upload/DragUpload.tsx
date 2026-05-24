import React, { useState, useEffect, useRef } from 'react';
import { Upload, message, Image } from 'antd';
import { InboxOutlined } from '@ant-design/icons';
import type { UploadFile, UploadProps } from 'antd/es/upload/interface';
import { ResponseData } from '@blog/shared';

const { Dragger } = Upload;

// 自定义上传函数类型
export type CustomUploadFunction = (file: UploadFile) => Promise<ResponseData<{ url: string }>>;

export interface DragUploadProps {
    value?: string | string[];
    onChange?: (value: string | string[]) => void;
    /**
     * 是否支持多文件上传
     */
    multiple?: boolean;
    /**
     * 最大上传数量
     */
    maxCount?: number;
    /**
     * 上传样式类型
     * - 'auto': 自动识别文件类型，图片显示照片墙，其他文件显示列表
     * - 'picture-wall': 强制照片墙样式
     * - 'list': 强制列表样式
     */
    listType?: 'auto' | 'picture-wall' | 'list';
    /**
     * 自定义上传函数
     */
    uploadFunction?: CustomUploadFunction;
    /**
     * 是否禁用
     */
    disabled?: boolean;
    /**
     * 占位符文本
     */
    placeholder?: string;
    /**
     * 最大文件大小(MB)
     */
    maxSize?: number;
    /**
     * 自定义样式类名
     */
    className?: string;
    /**
     * 接受的文件类型
     */
    accept?: string;
    /**
     * 拖拽区域高度
     */
    height?: number;
    /**
     * 是否显示上传列表
     */
    showUploadList?: boolean;
    /**
     * 上传前的钩子
     */
    beforeUpload?: (file: UploadFile, fileList: UploadFile[]) => boolean | Promise<boolean>;
}

const DragUpload: React.FC<DragUploadProps> = ({
    value,
    onChange,
    multiple = false,
    maxCount = 1,
    listType = 'auto',
    uploadFunction,
    disabled = false,
    placeholder = '点击或拖拽上传文件',
    maxSize = 10,
    className,
    accept,
    height = 180,
    showUploadList = true,
    beforeUpload,
}) => {
    const [fileList, setFileList] = useState<UploadFile[]>([]);
    const [previewImage, setPreviewImage] = useState<string>('');
    const [previewVisible, setPreviewVisible] = useState(false);
    const isUploadingRef = useRef(false); // 用于跟踪是否正在上传

    // 处理初始值
    useEffect(() => {
        // 如果正在上传过程中，不要重置文件列表
        if (isUploadingRef.current) {
            return;
        }
        if (value) {
            const urls = Array.isArray(value) ? value : [value];
            const initialFileList: UploadFile[] = urls.filter(Boolean).map((url, index) => ({
                uid: `initial-${index}`,
                name: url.split('/').pop() || `file-${index}`,
                status: 'done',
                url: url,
            }));
            setFileList(initialFileList);
        } else {
            setFileList([]);
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

    // 更新父组件的值
    const updateParentValue = (newFileList: UploadFile[]) => {
        const urls = newFileList
            .filter((item) => item.status === 'done' && item.url)
            .map((item) => item.url!);

        if (multiple) {
            onChange?.(urls);
        } else {
            onChange?.(urls[0] || '');
        }
    };

    // 判断是否为图片文件
    const isImageFile = (file: UploadFile) => {
        return (
            file.type?.startsWith('image/') ||
            /\.(jpg|jpeg|png|gif|bmp|webp)$/i.test(file.name || '')
        );
    };

    // 获取实际的列表类型
    const getActualListType = (): UploadProps['listType'] => {
        if (listType === 'picture-wall') return 'picture-card';
        if (listType === 'list') return 'text';

        // auto 模式：如果有图片文件则使用照片墙，否则使用列表
        if (fileList.some((file) => isImageFile(file))) {
            return 'picture-card';
        }
        return 'text';
    };

    // 默认的上传前校验
    const defaultBeforeUpload = (file: UploadFile) => {
        // 检查文件大小
        const isLtMaxSize = (file.size || 0) / 1024 / 1024 < maxSize;
        if (!isLtMaxSize) {
            message.error(`文件大小不能超过${maxSize}MB!`);
            return false;
        }

        return true;
    };

    // 合并的上传前校验
    const handleBeforeUpload = async (file: UploadFile, files: UploadFile[]) => {
        // 标记开始上传
        isUploadingRef.current = true;

        // 执行默认校验
        if (!defaultBeforeUpload(file)) {
            isUploadingRef.current = false;
            return false;
        }

        // 执行自定义校验
        if (beforeUpload) {
            const result = await beforeUpload(file, files);
            if (!result) {
                isUploadingRef.current = false;
                return false;
            }
        }

        return true;
    };

    // 自定义上传请求
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const customRequest = ({ file, onSuccess, onError }: any) => {
        if (!uploadFunction) {
            message.error('未配置上传函数');
            onError?.(new Error('未配置上传函数'));
            return;
        }

        uploadFunction(file as UploadFile)
            .then((result) => {
                if (result.code === 0) {
                    const fileUrl = result.data.url;

                    // 创建响应对象，包含url信息
                    const response = {
                        ...result,
                        url: fileUrl,
                    };
                    // 调用成功回调，传入响应和文件对象
                    onSuccess?.(response, file);
                    message.success(result.message || '文件上传成功');
                } else {
                    throw new Error(result.message || '上传失败');
                }
            })
            .catch((error) => {
                const errorMessage = error instanceof Error ? error.message : '未知错误';
                onError?.(error instanceof Error ? error : new Error(errorMessage));
                message.error('上传失败: ' + errorMessage);
            });
    };

    // 处理文件列表变化
    const handleChange: UploadProps['onChange'] = ({ fileList: newFileList, file }) => {
        // 处理文件上传成功的情况，从 response 中提取 URL
        const updatedFileList = newFileList.map((fileItem) => {
            if (fileItem.status === 'done' && fileItem.response && !fileItem.url) {
                const extractedUrl = fileItem.response.data?.url;
                return {
                    ...fileItem,
                    url: extractedUrl,
                };
            }
            return fileItem;
        });

        // 更新文件列表状态
        setFileList(updatedFileList);

        // 当文件上传完成或被删除时，更新父组件的值
        if (file.status === 'done' || file.status === 'removed') {
            updateParentValue(updatedFileList);

            // 检查是否所有文件都已上传完成
            const hasUploadingFiles = updatedFileList.some((f) => f.status === 'uploading');
            if (!hasUploadingFiles) {
                isUploadingRef.current = false;
            }
        }
    };

    // 处理文件删除
    const handleRemove = (file: UploadFile) => {
        const newFileList = fileList.filter((item) => item.uid !== file.uid);
        setFileList(newFileList);
        updateParentValue(newFileList);
        return true;
    };

    // 处理文件预览
    const handlePreview = (file: UploadFile) => {
        if (file.url) {
            if (isImageFile(file)) {
                // 图片文件，使用 Ant Design 的 Image 预览
                setPreviewImage(file.url);
                setPreviewVisible(true);
            } else {
                // 非图片文件，下载或打开
                window.open(file.url, '_blank');
            }
        }
    };

    // 自定义上传列表操作
    const uploadListProps = showUploadList
        ? {
              showPreviewIcon: true,
              showRemoveIcon: !disabled,
              onPreview: handlePreview,
              onRemove: handleRemove,
          }
        : false;

    const actualListType = getActualListType();

    return (
        <div className={className}>
            <Dragger
                name="file"
                multiple={multiple}
                maxCount={maxCount}
                listType={actualListType}
                fileList={fileList}
                customRequest={customRequest}
                beforeUpload={handleBeforeUpload}
                onChange={handleChange}
                onRemove={handleRemove}
                onPreview={handlePreview}
                disabled={disabled}
                accept={accept}
                showUploadList={uploadListProps}
                style={{
                    minHeight: height,
                    ...(actualListType === 'picture-card' ? {} : { height }),
                }}
            >
                <div
                    style={{
                        padding: '10px',
                        display: 'flex',
                        flexDirection: 'column',
                        alignItems: 'center',
                        justifyContent: 'center',
                        minHeight: height - 40,
                    }}
                >
                    <p className="ant-upload-drag-icon">
                        <InboxOutlined style={{ fontSize: '36px', color: '#1890ff' }} />
                    </p>
                    <p className="ant-upload-text">{placeholder}</p>
                    <p className="ant-upload-hint" style={{ color: '#999', margin: 0 }}>
                        {multiple
                            ? `支持单个或批量上传，最多${maxCount}个文件`
                            : '支持单个文件上传'}
                        {maxSize && `，文件大小不超过${maxSize}MB`}
                    </p>
                </div>
            </Dragger>

            {/* 隐藏的图片预览组件 */}
            {previewImage && (
                <Image
                    src={previewImage}
                    style={{ display: 'none' }}
                    preview={{
                        visible: previewVisible,
                        onVisibleChange: (visible) => setPreviewVisible(visible),
                    }}
                />
            )}
        </div>
    );
};

export default DragUpload;
