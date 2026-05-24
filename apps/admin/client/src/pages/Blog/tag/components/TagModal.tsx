import { useEffect, useState, useCallback } from 'react';
import { Modal, Form, Input, message } from 'antd';
import NiceModal, { useModal } from '@ebay/nice-modal-react';
import { CreateTagRequest, UpdateTagRequest, TagWithStats } from '@blog/shared';
import { tagService } from '@/services/blog/tag';

interface TagModalProps {
    type: 'create' | 'edit';
    tag?: TagWithStats;
}

export const TagModal = NiceModal.create(({ type, tag }: TagModalProps) => {
    const modal = useModal();
    const [form] = Form.useForm();
    const [loading, setLoading] = useState(false);

    useEffect(() => {
        if (modal.visible && type === 'edit' && tag) {
            form.setFieldsValue({
                name: tag.name,
            });
        } else if (modal.visible && type === 'create') {
            form.resetFields();
        }
    }, [modal.visible, type, tag, form]);

    const handleSubmit = useCallback(async () => {
        try {
            const values = await form.validateFields();
            setLoading(true);

            if (type === 'create') {
                const createData: CreateTagRequest = {
                    name: values.name,
                };
                await tagService.createTag(createData);
                message.success('标签创建成功');
            } else {
                const updateData: UpdateTagRequest = {
                    id: tag!.id,
                    name: values.name,
                };
                await tagService.updateTag(updateData);
                message.success('标签更新成功');
            }

            modal.resolve(true);
            modal.hide();
        } catch (error: unknown) {
            const errorMessage = error instanceof Error ? error.message : '操作失败';
            message.error(errorMessage);
        } finally {
            setLoading(false);
        }
    }, [form, type, tag, modal]);

    const handleCancel = useCallback(() => {
        form.resetFields();
        modal.hide();
    }, [form, modal]);

    const validateTagName = useCallback(
        async (_: unknown, value: string) => {
            if (!value || !value.trim()) {
                return Promise.reject(new Error('请输入标签名称'));
            }

            const trimmedValue = value.trim();
            if (trimmedValue.length < 1) {
                return Promise.reject(new Error('标签名称不能为空'));
            }

            if (trimmedValue.length > 20) {
                return Promise.reject(new Error('标签名称不能超过20个字符'));
            }

            try {
                const excludeId = type === 'edit' && tag ? tag.id : undefined;
                const response = await tagService.checkTagName(trimmedValue, excludeId);
                if (!response.data.available) {
                    return Promise.reject(new Error('标签名称已存在'));
                }
            } catch (error) {
                console.warn('检查标签名称时发生错误:', error);
            }

            return Promise.resolve();
        },
        [type, tag],
    );

    return (
        <Modal
            title={type === 'create' ? '新增标签' : '编辑标签'}
            open={modal.visible}
            onOk={handleSubmit}
            onCancel={handleCancel}
            confirmLoading={loading}
            width={500}
            destroyOnClose
            afterClose={() => modal.remove()}
        >
            <Form form={form} layout="vertical" autoComplete="off">
                <Form.Item
                    name="name"
                    label="标签名称"
                    rules={[{ validator: validateTagName }]}
                    hasFeedback
                >
                    <Input placeholder="请输入标签名称（1-20个字符）" maxLength={20} showCount />
                </Form.Item>
            </Form>
        </Modal>
    );
});
