import { useCallback, useEffect, useMemo } from 'react';
import { Modal, Form, Input, Select, Switch, Button, message } from 'antd';
import NiceModal, { useModal } from '@ebay/nice-modal-react';
import { useRequest } from 'ahooks';
import { articleService } from '@/services/blog/article';
import { globalService } from '@/services/global';
import { ImageUpload } from '@/components/Upload';
import { createEmptyDocument } from '@namelesserlx/editor/core/model';
import type {
    CreateArticleRequest,
    UpdateArticleRequest,
    ArticleListItem,
    TagOption,
} from '@blog/shared';
import { CardTypeLabels } from '@blog/shared';
import type { UploadFile } from 'antd/es/upload/interface';
import type { CustomUploadFunction } from '@/components/Upload/ImageUpload';
import { usePermission } from '@/hooks';

const cardTypeOptions = Object.entries(CardTypeLabels).map(([key, label]) => ({
    label,
    value: key,
}));

const EMPTY_ARTICLE_CONTENT = JSON.stringify(createEmptyDocument());

export interface ArticleModalProps {
    type: 'create' | 'edit';
    article?: ArticleListItem;
}

interface ArticleCardImageUploadProps {
    value?: string;
    onChange?: (value: string) => void;
    articleId?: string;
}

export function ArticleCardImageUpload({
    onChange,
    value,
    articleId,
}: ArticleCardImageUploadProps) {
    const uploadImage = useCallback<CustomUploadFunction>(
        async (file: UploadFile) => {
            const rawFile =
                (file as UploadFile & { originFileObj?: File }).originFileObj ??
                (file as unknown as File);
            try {
                const result = await globalService.upload(rawFile, articleId);
                if (result?.code === 0) {
                    onChange?.(result?.data?.url);
                    return result;
                }
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
        [onChange, articleId],
    );

    return <ImageUpload type="picture-card" uploadFunction={uploadImage} value={value} />;
}

export const ArticleModal = NiceModal.create((props: ArticleModalProps) => {
    const { type, article } = props;
    const modal = useModal();
    const [form] = Form.useForm();
    const { hasPermission } = usePermission();

    const isEdit = type === 'edit';
    const title = isEdit ? '编辑文章' : '新增文章';
    const canManageArticle = hasPermission('article:manage');

    const { data: tagOptionsRes } = useRequest(articleService.getTagOptions, {
        onError: () => {
            message.error('获取标签选项失败');
        },
    });

    const tagOptions = useMemo(() => tagOptionsRes?.data || [], [tagOptionsRes]);

    const tagSelectOptions = useMemo(
        () =>
            (tagOptions as TagOption[]).map((tag) => ({
                label: tag.name,
                value: tag.id,
            })),
        [tagOptions],
    );

    const { run: createArticle, loading: createLoading } = useRequest(
        articleService.createArticle,
        {
            manual: true,
            onSuccess: () => {
                message.success('创建文章成功');
                modal.resolve();
                modal.hide();
            },
            onError: (error) => {
                const errorMessage = error instanceof Error ? error.message : '创建文章失败';
                message.error(errorMessage);
            },
        },
    );

    const { run: updateArticle, loading: updateLoading } = useRequest(
        articleService.updateArticle,
        {
            manual: true,
            onSuccess: () => {
                message.success('更新文章成功');
                modal.resolve();
                modal.hide();
            },
            onError: (error) => {
                const errorMessage = error instanceof Error ? error.message : '更新文章失败';
                message.error(errorMessage);
            },
        },
    );

    useEffect(() => {
        if (modal.visible) {
            if (isEdit && article) {
                form.setFieldsValue({
                    title: article.title,
                    published: article.published,
                    isDraft: article.isDraft,
                    allowComments: article.allowComments,
                    cardType: article.cardType,
                    cardImageUrl: article.cardImageUrl,
                    tagIds: article.tags.map((tag) => tag.id),
                });
            } else {
                form.setFieldsValue({
                    published: false,
                    isDraft: true,
                    allowComments: true,
                    cardType: 'LARGE_IMAGE',
                });
            }
        }
    }, [modal.visible, form, isEdit, article]);

    const handleSubmit = useCallback(async () => {
        try {
            const values = await form.validateFields();
            const submitValues = { ...values };

            if (!canManageArticle) {
                delete submitValues.published;
                delete submitValues.isDraft;
            }

            if (isEdit && article) {
                const updateData: UpdateArticleRequest = {
                    id: article.id,
                    ...submitValues,
                };
                updateArticle(updateData);
            } else {
                const createData: CreateArticleRequest = {
                    ...submitValues,
                    content: values.content || EMPTY_ARTICLE_CONTENT,
                    ...(!canManageArticle ? { published: false, isDraft: true } : {}),
                };
                createArticle(createData);
            }
            form.resetFields();
        } catch (error) {
            console.error('表单验证失败:', error);
        }
    }, [form, isEdit, article, canManageArticle, createArticle, updateArticle]);

    const handleCancel = useCallback(() => {
        modal.reject();
        modal.hide();
    }, [modal]);

    const loading = createLoading || updateLoading;

    return (
        <Modal
            title={title}
            open={modal.visible}
            onCancel={handleCancel}
            afterClose={() => modal.remove()}
            footer={[
                <Button key="cancel" onClick={handleCancel}>
                    取消
                </Button>,
                <Button key="submit" type="primary" loading={loading} onClick={handleSubmit}>
                    {isEdit ? '更新' : '创建'}
                </Button>,
            ]}
            width={800}
        >
            <Form form={form} layout="vertical" preserve={false}>
                <Form.Item
                    name="title"
                    label="文章标题"
                    rules={[
                        { required: true, message: '请输入文章标题' },
                        { max: 200, message: '标题不能超过200个字符' },
                    ]}
                >
                    <Input placeholder="请输入文章标题" />
                </Form.Item>
                <Form.Item name="cardType" label="卡片类型">
                    <Select placeholder="请选择卡片类型" options={cardTypeOptions} />
                </Form.Item>

                <Form.Item name="cardImageUrl" label="卡片图片">
                    <ArticleCardImageUpload articleId={isEdit ? article?.id : undefined} />
                </Form.Item>

                <Form.Item name="tagIds" label="文章标签">
                    <Select
                        mode="multiple"
                        placeholder="请选择文章标签"
                        allowClear
                        showSearch
                        filterOption={(input, option) =>
                            (option?.label ?? '')
                                .toString()
                                .toLowerCase()
                                .includes(input.toLowerCase())
                        }
                        options={tagSelectOptions}
                    />
                </Form.Item>

                <div style={{ display: 'flex', gap: 24 }}>
                    {canManageArticle && (
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
            </Form>
        </Modal>
    );
});
