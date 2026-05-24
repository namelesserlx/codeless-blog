import { useCallback, useEffect, useRef } from 'react';
import { Modal, Form, Switch, message, Input } from 'antd';
import NiceModal, { useModal } from '@ebay/nice-modal-react';
import { useRequest } from 'ahooks';
import { snippetService } from '@/services/blog/snippet';
import { DragUpload } from '@/components/Upload';
import type { CustomUploadFunction } from '@/components/Upload/DragUpload';
import type { Snippet, UpdateSnippetRequest, CreateSnippetRequest } from '@blog/shared';
import { usePermission } from '@/hooks';

export interface SnippetModalProps {
    type: 'create' | 'edit';
    snippet?: Snippet;
}

interface SnippetUploadProps {
    value?: string | string[];
    onChange?: (value: string | string[]) => void;
    snippetId: string;
}

function SnippetImageUpload({ onChange, value, snippetId }: SnippetUploadProps) {
    const uploadImage = useCallback<CustomUploadFunction>(
        async (file) => {
            const rawFile = (file as { originFileObj?: File }).originFileObj ?? file;
            try {
                const result = await snippetService.upload('image', rawFile as File, snippetId);
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
        [snippetId],
    );

    return (
        <DragUpload
            value={value}
            onChange={(urls) => onChange?.(Array.isArray(urls) ? urls : [urls])}
            uploadFunction={uploadImage}
            multiple
            maxCount={9}
            listType="picture-wall"
            accept="image/*"
            placeholder="点击或拖拽上传相册图片（最多9张）"
            maxSize={10}
            height={100}
        />
    );
}

function SnippetVideoUpload({ onChange, value, snippetId }: SnippetUploadProps) {
    const uploadVideo = useCallback<CustomUploadFunction>(
        async (file) => {
            const rawFile = (file as { originFileObj?: File }).originFileObj ?? file;
            try {
                const result = await snippetService.upload('video', rawFile as File, snippetId);
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
        [snippetId],
    );

    return (
        <DragUpload
            value={value}
            onChange={(urls) => onChange?.(Array.isArray(urls) ? urls : [urls])}
            uploadFunction={uploadVideo}
            multiple
            maxCount={1}
            listType="picture-wall"
            accept="video/*"
            placeholder="点击或拖拽上传视频"
            maxSize={10}
            height={100}
        />
    );
}

function SnippetVideoPosterUpload({ onChange, value, snippetId }: SnippetUploadProps) {
    const uploadImage = useCallback<CustomUploadFunction>(
        async (file) => {
            const rawFile = (file as { originFileObj?: File }).originFileObj ?? file;
            try {
                const result = await snippetService.upload('image', rawFile as File, snippetId);
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
        [snippetId],
    );

    return (
        <DragUpload
            value={value}
            onChange={(url) => onChange?.(Array.isArray(url) ? url[0] || '' : url)}
            uploadFunction={uploadImage}
            maxCount={1}
            listType="picture-wall"
            accept="image/*"
            placeholder="点击或拖拽上传视频封面"
            maxSize={10}
            height={100}
        />
    );
}

export const SnippetModal = NiceModal.create((props: SnippetModalProps) => {
    const { type, snippet } = props;
    const modal = useModal();
    const [form] = Form.useForm();
    const { hasPermission } = usePermission();

    const isEdit = type === 'edit';
    const title = isEdit ? '编辑片段' : '新增片段';
    const canEditSnippet = hasPermission('snippet:edit');
    // 新建时客户端生成 UUID 作为 snippetId，上传和创建使用同一个 ID
    const snippetIdRef = useRef(isEdit && snippet ? snippet.id : crypto.randomUUID());
    const snippetId = snippetIdRef.current;

    const { run: createSnippet } = useRequest(snippetService.createSnippet, {
        manual: true,
        onSuccess: () => {
            message.success('创建片段成功');
            modal.resolve();
            modal.hide();
        },
        onError: (error) => {
            const errorMessage = error instanceof Error ? error.message : '创建片段失败';
            message.error(errorMessage);
        },
    });

    const { run: updateSnippet } = useRequest(snippetService.updateSnippet, {
        manual: true,
        onSuccess: () => {
            message.success('更新片段成功');
            modal.resolve();
            modal.hide();
        },
        onError: (error) => {
            const errorMessage = error instanceof Error ? error.message : '更新片段失败';
            message.error(errorMessage);
        },
    });

    useEffect(() => {
        if (modal.visible) {
            if (isEdit && snippet) {
                form.setFieldsValue({
                    content: snippet.content,
                    published: snippet.published,
                    isDraft: snippet.isDraft,
                    allowComments: snippet.allowComments,
                    images: snippet.images,
                    video: snippet.video,
                    videoPoster: snippet.videoPoster || undefined,
                });
            } else {
                form.setFieldsValue({
                    published: false,
                    isDraft: true,
                    allowComments: true,
                    images: [],
                    video: [],
                    videoPoster: undefined,
                });
            }
        }
    }, [modal.visible, form, isEdit, snippet]);

    const handleSubmit = useCallback(
        async (values: CreateSnippetRequest) => {
            try {
                const submitValues = { ...values };

                if (!canEditSnippet) {
                    delete submitValues.published;
                    delete submitValues.isDraft;
                }

                if (isEdit && snippet) {
                    const updateData: UpdateSnippetRequest = { id: snippet.id, ...submitValues };
                    updateSnippet(updateData);
                } else {
                    // 新建时传入客户端生成的 ID
                    createSnippet({
                        ...submitValues,
                        id: snippetId,
                        ...(!canEditSnippet ? { published: false, isDraft: true } : {}),
                    } as CreateSnippetRequest);
                }
                form.resetFields();
            } catch (error) {
                console.error('表单验证失败:', error);
            }
        },
        [canEditSnippet, form, isEdit, snippet, snippetId, createSnippet, updateSnippet],
    );

    const handleCancel = useCallback(() => {
        modal.reject();
        modal.hide();
    }, [modal]);

    return (
        <Modal
            title={title}
            open={modal.visible}
            onCancel={handleCancel}
            afterClose={() => modal.remove()}
            onOk={() => form.submit()}
            width={800}
        >
            <Form form={form} layout="vertical" onFinish={handleSubmit}>
                <div style={{ display: 'flex', gap: 24 }}>
                    {canEditSnippet && (
                        <>
                            <Form.Item name="published" label="发布状态" valuePropName="checked">
                                <Switch checkedChildren="已发布" unCheckedChildren="未发布" />
                            </Form.Item>

                            <Form.Item name="isDraft" label="草稿状态" valuePropName="checked">
                                <Switch checkedChildren="草稿" unCheckedChildren="正式" />
                            </Form.Item>
                        </>
                    )}

                    <Form.Item name="allowComments" label="允许评论" valuePropName="checked">
                        <Switch checkedChildren="允许" unCheckedChildren="禁止" />
                    </Form.Item>
                </div>
                <Form.Item
                    name="content"
                    label="内容"
                    rules={[{ required: true, message: '请输入内容' }]}
                >
                    <Input.TextArea rows={5} />
                </Form.Item>
                <Form.Item name="images" label="图片" wrapperCol={{ span: 12 }}>
                    <SnippetImageUpload snippetId={snippetId} />
                </Form.Item>
                <Form.Item
                    name="video"
                    label="视频"
                    wrapperCol={{ span: 12 }}
                    extra="视频片段只上传视频文件即可，封面请使用下面的“视频封面”，不要再放到图片区。"
                >
                    <SnippetVideoUpload snippetId={snippetId} />
                </Form.Item>
                <Form.Item
                    name="videoPoster"
                    label="视频封面"
                    wrapperCol={{ span: 12 }}
                    extra="仅用作前台视频封面/缩略图，不会作为片段图片额外展示。"
                >
                    <SnippetVideoPosterUpload snippetId={snippetId} />
                </Form.Item>
            </Form>
        </Modal>
    );
});
