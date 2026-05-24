import React, { useState } from 'react';
import { Upload, Button, message, Input, Space } from 'antd';
import { UploadOutlined, PlusOutlined } from '@ant-design/icons';
import type { UploadFile, UploadProps } from 'antd/es/upload/interface';
import { ResponseData } from '@blog/shared';

// 自定义上传函数类型
export type CustomUploadFunction = (file: UploadFile) => Promise<ResponseData<{ url: string }>>;
type UploadRequestOptions = Parameters<NonNullable<UploadProps['customRequest']>>[0];

export interface ImageUploadProps {
    value?: string;
    onChange?: (value: string) => void;
    /**
     * 上传样式类型
     * - 'button': 按钮样式
     * - 'picture-card': 图片卡片样式
     * - 'input-button': 输入框+按钮组合样式
     */
    type?: 'button' | 'picture-card' | 'input-button';
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
     * 上传图片的类型
     */
    accept?: string | string[];
    /**
     * 上传图片的尺寸
     */
    size?: {
        width?: number;
        height?: number;
    };
}

const ImageUpload: React.FC<ImageUploadProps> = ({
    value,
    onChange,
    type = 'button',
    uploadFunction,
    disabled = false,
    placeholder = '请上传图片',
    maxSize = 5,
    className,
    accept,
    size,
}) => {
    const [loading, setLoading] = useState(false);

    // 上传前的校验（同步校验）
    const beforeUpload = (file: UploadFile) => {
        const isImage = file.type?.startsWith('image/');
        if (!isImage) {
            message.error('只能上传图片文件!');
            return false;
        }

        // 检查文件类型（兼容大小写）
        if (accept) {
            const acceptTypes = Array.isArray(accept) ? accept : [accept];
            const fileType = file.type?.toLowerCase() || '';
            const isAcceptedType = acceptTypes.some((type) => {
                const normalizedType = type.toLowerCase();
                // 如果传入的是 'png'，则检查 'image/png'
                return (
                    fileType.includes(normalizedType) ||
                    fileType.includes(`image/${normalizedType}`)
                );
            });

            if (!isAcceptedType) {
                message.error(`只能上传${acceptTypes.join('、')}类型的图片文件!`);
                return false;
            }
        }

        const isLtMaxSize = (file.size || 0) / 1024 / 1024 < maxSize;
        if (!isLtMaxSize) {
            message.error(`图片大小不能超过${maxSize}MB!`);
            return false;
        }

        return true;
    };

    // 检查图片尺寸（异步校验）
    const checkImageSize = (file: UploadFile): Promise<boolean> => {
        return new Promise((resolve) => {
            if (!size) {
                resolve(true);
                return;
            }

            const img = new Image();
            img.src = URL.createObjectURL(file as unknown as Blob);
            img.onload = () => {
                URL.revokeObjectURL(img.src); // 释放内存
                if (
                    (size.width && img.width !== size.width) ||
                    (size.height && img.height !== size.height)
                ) {
                    message.error(`图片尺寸必须为${size.width}px * ${size.height}px!`);
                    resolve(false);
                } else {
                    resolve(true);
                }
            };
            img.onerror = () => {
                URL.revokeObjectURL(img.src); // 释放内存
                message.error('图片加载失败!');
                resolve(false);
            };
        });
    };

    // 自定义上传请求
    const customRequest: NonNullable<UploadProps['customRequest']> = async ({
        file,
        onSuccess,
        onError,
    }: UploadRequestOptions) => {
        if (!uploadFunction) {
            message.error('未配置上传函数');
            onError?.(new Error('未配置上传函数'));
            return;
        }

        try {
            setLoading(true);
            const uploadFile = file as UploadFile;

            // 先检查图片尺寸
            const isSizeValid = await checkImageSize(uploadFile);
            if (!isSizeValid) {
                onError?.(new Error('图片尺寸不符合要求'));
                return;
            }

            const result = await uploadFunction(uploadFile);

            if (result.code === 0) {
                const imageUrl = result.data.url;
                onChange?.(imageUrl);
                onSuccess?.(result);
                message.success(result.message || '图片上传成功');
            } else {
                throw new Error(result.message || '上传失败');
            }
        } catch (error: unknown) {
            console.error('上传失败:', error);
            const uploadError = error instanceof Error ? error : new Error('未知错误');
            onError?.(uploadError);
            message.error(`上传失败: ${uploadError.message}`);
        } finally {
            setLoading(false);
        }
    };

    // 按钮样式的上传
    if (type === 'button') {
        return (
            <Upload
                beforeUpload={beforeUpload}
                showUploadList={false}
                customRequest={customRequest}
                disabled={disabled}
                className={className}
            >
                <Button icon={<UploadOutlined />} loading={loading} disabled={disabled}>
                    上传图片
                </Button>
            </Upload>
        );
    }

    // 输入框+按钮组合样式
    if (type === 'input-button') {
        return (
            <Space.Compact>
                <Input
                    value={value}
                    onChange={(e) => onChange?.(e.target.value)}
                    style={{ width: 'calc(100% - 80px)' }}
                    placeholder={placeholder || '请输入图片链接或上传图片'}
                    disabled={disabled}
                />
                <Upload
                    beforeUpload={beforeUpload}
                    showUploadList={false}
                    customRequest={customRequest}
                    disabled={disabled}
                    className={className}
                >
                    <Button icon={<UploadOutlined />} loading={loading} disabled={disabled}>
                        上传
                    </Button>
                </Upload>
            </Space.Compact>
        );
    }

    // 图片卡片样式的上传
    return (
        <Upload
            name="file"
            listType="picture-card"
            className={className}
            showUploadList={false}
            customRequest={customRequest}
            beforeUpload={beforeUpload}
            disabled={disabled}
        >
            {value ? (
                <img
                    src={value}
                    alt="uploaded"
                    style={{
                        width: '100%',
                        height: '100%',
                        objectFit: 'cover',
                    }}
                />
            ) : (
                <div>
                    <PlusOutlined />
                    <div style={{ marginTop: 8 }}>{loading ? '上传中...' : placeholder}</div>
                </div>
            )}
        </Upload>
    );
};

export default ImageUpload;
