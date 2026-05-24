import { useEffect, useState, useCallback, useRef } from 'react';
import { Modal, Form, Input, message, Select, DatePicker } from 'antd';
import NiceModal, { useModal } from '@ebay/nice-modal-react';
import {
    Photo,
    photoCategoryOptions,
    type CreatePhotoRequest,
    type UpdatePhotoRequest,
} from '@blog/shared';
import { photoService } from '@/services/blog/photo';
import { DragUpload } from '@/components/Upload';
import type { CustomUploadFunction } from '@/components/Upload/DragUpload';
import dayjs from 'dayjs';

interface PhotoModalProps {
    type: 'create' | 'edit';
    photo?: Photo;
}

interface PhotoImageUploadProps {
    value?: string[];
    onChange?: (value: string[]) => void;
    photoId: string | number;
}

const photoTagOptions = [
    { label: '风景', value: '风景' },
    { label: '夕阳', value: '夕阳' },
    { label: '海边', value: '海边' },
    { label: '城市', value: '城市' },
    { label: '夜景', value: '夜景' },
    { label: '建筑', value: '建筑' },
    { label: '花卉', value: '花卉' },
];

function PhotoImageUpload({ onChange, value, photoId }: PhotoImageUploadProps) {
    const uploadImage = useCallback<CustomUploadFunction>(
        async (file) => {
            const rawFile = (file as { originFileObj?: File }).originFileObj ?? file;
            try {
                const result = await photoService.upload(rawFile as File, photoId);
                if (result?.code === 0) return result;
                return {
                    code: result?.code || 1,
                    message: result?.message || '上传失败',
                    data: { url: '' },
                };
            } catch (error) {
                const err = error as Error;
                return { code: 1, message: err.message || '上传失败', data: { url: '' } };
            }
        },
        [photoId],
    );

    return (
        <DragUpload
            value={value}
            onChange={(urls) => onChange?.(Array.isArray(urls) ? urls : [urls])}
            uploadFunction={uploadImage}
            multiple
            maxCount={5}
            listType="picture-wall"
            accept="image/*"
            placeholder="点击或拖拽上传相册图片（最多5张）"
            maxSize={10}
            height={200}
        />
    );
}

export const PhotoModal = NiceModal.create(({ type, photo }: PhotoModalProps) => {
    const modal = useModal();
    const [form] = Form.useForm();
    const [loading, setLoading] = useState(false);
    // 新建时生成临时 photoId 用于上传目录
    const photoIdRef = useRef(type === 'edit' && photo ? photo.id : `temp_${crypto.randomUUID()}`);
    const photoId = photoIdRef.current;

    useEffect(() => {
        if (modal.visible) {
            if (type === 'edit' && photo) {
                form.setFieldsValue({
                    ...photo,
                    date: photo.date ? dayjs(photo.date) : null,
                });
            } else {
                form.resetFields();
            }
        }
    }, [modal.visible, type, form, photo]);

    const handleCancel = useCallback(() => {
        form.resetFields();
        modal.hide();
    }, [form, modal]);

    const handleSubmit = useCallback(
        async (values: Record<string, unknown>) => {
            try {
                setLoading(true);

                const baseData = {
                    title: values.title as string,
                    description: values.description as string,
                    src: values.src as string[],
                    category: values.category as string,
                    location: values.location as string,
                    tags: (values.tags as string[]) ?? [],
                    date: values.date
                        ? dayjs(values.date as string).toISOString()
                        : new Date().toISOString(),
                };

                if (type === 'create') {
                    await photoService.createPhoto(baseData as CreatePhotoRequest);
                } else {
                    const updateData: UpdatePhotoRequest = { ...baseData, id: photo!.id };
                    await photoService.updatePhoto(updateData);
                }
                modal.resolve();
                modal.hide();
            } catch {
                message.error('操作失败');
            } finally {
                setLoading(false);
            }
        },
        [type, photo, modal],
    );

    return (
        <Modal
            title={type === 'create' ? '新增相册' : '编辑相册'}
            open={modal.visible}
            onOk={() => form.submit()}
            onCancel={handleCancel}
            confirmLoading={loading}
            width={500}
            afterClose={() => modal.remove()}
        >
            <Form form={form} layout="vertical" onFinish={handleSubmit}>
                <Form.Item
                    name="title"
                    label="相册名称"
                    rules={[{ required: true, message: '请输入相册名称' }]}
                >
                    <Input placeholder="请输入相册名称" />
                </Form.Item>
                <Form.Item
                    name="description"
                    label="相册描述"
                    rules={[{ required: true, message: '请输入相册描述' }]}
                >
                    <Input placeholder="请输入相册描述" />
                </Form.Item>
                <Form.Item
                    name="src"
                    label="相册图片"
                    rules={[{ required: true, message: '请上传相册图片' }]}
                >
                    <PhotoImageUpload photoId={photoId} />
                </Form.Item>
                <Form.Item
                    name="category"
                    label="相册分类"
                    rules={[{ required: true, message: '请选择相册分类' }]}
                >
                    <Select placeholder="请选择相册分类" options={photoCategoryOptions} />
                </Form.Item>
                <Form.Item
                    name="tags"
                    label="相册标签"
                    rules={[{ required: true, message: '请选择或者输入相册标签' }]}
                >
                    <Select
                        mode="tags"
                        placeholder="请选择或者输入相册标签"
                        options={photoTagOptions}
                    />
                </Form.Item>
                <Form.Item name="date" label="相册日期" hasFeedback>
                    <DatePicker placeholder="请选择相册日期" />
                </Form.Item>
                <Form.Item
                    name="location"
                    label="相册位置"
                    rules={[{ required: true, message: '请输入相册位置' }]}
                >
                    <Input placeholder="请输入相册位置" />
                </Form.Item>
            </Form>
        </Modal>
    );
});
