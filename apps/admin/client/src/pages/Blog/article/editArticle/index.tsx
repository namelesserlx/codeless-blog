import React, { useState, useCallback, useMemo, useRef, memo } from 'react';
import { useParams, useNavigate } from 'react-router';
import {
    Card,
    Form,
    Input,
    Select,
    Switch,
    Button,
    Space,
    message,
    Spin,
    Tag,
    Row,
    Col,
    Typography,
    Tooltip,
    Dropdown,
} from 'antd';
import {
    SaveOutlined,
    ArrowLeftOutlined,
    EyeOutlined,
    SendOutlined,
    FullscreenOutlined,
    DownOutlined,
    RobotOutlined,
} from '@ant-design/icons';
import { useRequest } from 'ahooks';
import { clientEnv } from '@/config/env';
import { articleService } from '@/services/blog/article';
import {
    UpdateArticleRequest,
    CardType,
    CardTypeLabels,
    TagOption,
    type ArticleWithTags,
} from '@blog/shared';
import styles from './index.module.less';
import { ArticleCardImageUpload } from '../components/ArticleModal';
import {
    ArticleEditor,
    type ArticleEditorUpdateMeta,
    type ArticleTiptapEditor,
} from './ArticleEditor';
import {
    clearArticleEditDraft,
    readArticleEditDraft,
    writeArticleEditDraft,
} from './articleEditDraft';
import {
    articleEditorContentToText,
    isArticleEditorContentEmpty,
    parseStoredArticleContent,
    serializeArticleEditorContent,
    type ArticleEditorContent,
} from './articleEditorContent';
import { usePermission } from '@/hooks';
import useUserStore from '@/stores/user';

// 优化的ArticleCardImageUpload组件
const MemoizedArticleCardImageUpload = memo(ArticleCardImageUpload);
const { Title } = Typography;
const { Option } = Select;

function createEmptyArticleEditorContent(): ArticleEditorContent {
    return parseStoredArticleContent('');
}

interface ArticleFormData {
    title: string;
    summary?: string;
    published: boolean;
    isDraft: boolean;
    allowComments: boolean;
    cardType: CardType;
    cardImageUrl?: string;
    tagIds: number[];
}

function CustomSwitch(props: {
    checked?: boolean;
    onChange?: (checked: boolean) => void;
    disabled?: boolean;
    checkedChildren: React.ReactNode;
    unCheckedChildren: React.ReactNode;
    text: string;
}) {
    const { checked, onChange, disabled, checkedChildren, unCheckedChildren, text } = props;
    return (
        <Space>
            <Switch
                checked={checked}
                onChange={onChange}
                disabled={disabled}
                checkedChildren={checkedChildren}
                unCheckedChildren={unCheckedChildren}
            />
            <span>{text}</span>
        </Space>
    );
}

function EditArticle() {
    const { id } = useParams<{ id: string }>();
    const navigate = useNavigate();
    const [form] = Form.useForm<ArticleFormData>();
    const { hasPermission } = usePermission();
    const userInfo = useUserStore((state) => state.userInfo);
    const canWriteArticle = hasPermission('article:write');
    const canManageArticle = hasPermission('article:manage');
    const [editorContent, setEditorContentState] = useState<ArticleEditorContent>(
        createEmptyArticleEditorContent,
    );
    const editorContentRef = useRef(editorContent);
    const [editorContentEmpty, setEditorContentEmpty] = useState(() =>
        isArticleEditorContentEmpty(editorContent),
    );
    const editorInstanceRef = useRef<ArticleTiptapEditor | null>(null);
    const [summaryLoading, setSummaryLoading] = useState(false);
    const [selectedModel, setSelectedModel] = useState<'deepseek-v4-flash' | 'deepseek-v4-pro'>(
        'deepseek-v4-flash',
    );

    const recordEditorContentUpdate = useCallback((meta?: ArticleEditorUpdateMeta) => {
        setEditorContentEmpty((currentEmpty) => {
            const nextEmpty =
                meta?.isEmpty ?? isArticleEditorContentEmpty(editorContentRef.current);
            return currentEmpty === nextEmpty ? currentEmpty : nextEmpty;
        });
    }, []);

    const replaceEditorContent = useCallback((content: ArticleEditorContent) => {
        editorContentRef.current = content;
        setEditorContentState(content);
        setEditorContentEmpty(isArticleEditorContentEmpty(content));
    }, []);

    const getCurrentEditorContent = useCallback((): ArticleEditorContent => {
        return editorInstanceRef.current?.getJSON() ?? editorContentRef.current;
    }, []);

    const handleEmbeddedEditorReady = useCallback((editor: ArticleTiptapEditor) => {
        editorInstanceRef.current = editor;
    }, []);

    // 获取文章详情
    const {
        data: articleRes,
        loading: articleLoading,
        error: articleError,
    } = useRequest(
        () => {
            if (!id) throw new Error('文章ID不存在');
            return articleService.getArticleDetail(id);
        },
        {
            onSuccess: (res) => {
                const article = res.data;
                if (article) {
                    const draft = id ? readArticleEditDraft(id) : null;
                    const articleFormValues: ArticleFormData = {
                        title: article.title,
                        summary: article.summary,
                        published: article.published,
                        isDraft: article.isDraft,
                        allowComments: article.allowComments,
                        cardType: article.cardType,
                        cardImageUrl: article.cardImageUrl,
                        tagIds: article.tags.map((tag) => tag.id),
                    };

                    // 设置表单数据
                    form.setFieldsValue({
                        ...articleFormValues,
                        ...(draft?.formValues as Partial<ArticleFormData> | undefined),
                    });
                    // 设置编辑器内容
                    replaceEditorContent(
                        draft?.content ?? parseStoredArticleContent(article.content),
                    );
                }
            },
            onError: (error) => {
                message.error(`获取文章详情失败: ${error.message}`);
            },
        },
    );
    const article = articleRes?.data;
    const canEditOwnDraft =
        canWriteArticle &&
        article?.authorId === userInfo?.id &&
        article?.isDraft === true &&
        article?.published === false;
    const canSaveArticle = canManageArticle || canEditOwnDraft;
    const canPublishArticle = canManageArticle;

    // 获取标签选项
    const { data: tagOptionsRes } = useRequest(articleService.getTagOptions);
    const tagOptions = useMemo(() => tagOptionsRes?.data || [], [tagOptionsRes]);

    // 保存文章
    const { run: saveArticle, loading: saveLoading } = useRequest(
        (data: UpdateArticleRequest) => articleService.updateArticle(data),
        {
            manual: true,
            onSuccess: () => {
                if (id) {
                    clearArticleEditDraft(id);
                }
                message.success('保存成功');
            },
            onError: (error) => {
                message.error(`保存失败: ${error.message}`);
            },
        },
    );

    // 一键总结功能
    const handleGenerateSummary = useCallback(async () => {
        const plainText = articleEditorContentToText(getCurrentEditorContent());
        if (!plainText) {
            message.warning('请先输入文章内容');
            return;
        }

        setSummaryLoading(true);
        try {
            const res = await articleService.generateSummary({
                content: plainText,
                model: selectedModel,
            });
            if (res.data) {
                form.setFieldValue('summary', res.data.summary);
                message.success(
                    `摘要生成成功 (${selectedModel === 'deepseek-v4-flash' ? 'DeepSeek V4-Flash' : 'DeepSeek V4-Pro'})`,
                );
            } else {
                message.error('生成摘要失败');
            }
        } catch (error: unknown) {
            const errorMessage = error instanceof Error ? error.message : '生成摘要失败';
            message.error(`生成摘要失败: ${errorMessage}`);
        } finally {
            setSummaryLoading(false);
        }
    }, [form, getCurrentEditorContent, selectedModel]);

    // 处理表单提交
    const handleSubmit = useCallback(
        async (isDraftSave = false) => {
            try {
                const values = await form.validateFields();
                if (!id) {
                    message.error('文章ID不存在');
                    return;
                }

                const updateData: UpdateArticleRequest = {
                    id,
                    title: values.title,
                    content: serializeArticleEditorContent(getCurrentEditorContent()),
                    summary: values.summary,
                    allowComments: values.allowComments,
                    cardType: values.cardType,
                    cardImageUrl: values.cardImageUrl,
                    tagIds: values.tagIds,
                };

                if (canPublishArticle) {
                    updateData.published = isDraftSave ? false : values.published;
                    updateData.isDraft = isDraftSave ? true : values.isDraft;
                }

                await saveArticle(updateData);
            } catch (error) {
                console.error('表单验证失败:', error);
            }
        },
        [canPublishArticle, form, getCurrentEditorContent, id, saveArticle],
    );

    // 返回列表
    const handleBack = useCallback(() => {
        navigate('/blog/article');
    }, [navigate]);

    // 预览文章
    const handlePreview = useCallback(async () => {
        const blogPublicUrl = clientEnv.urls.blog;
        if (!id) {
            message.error('文章ID不存在');
            return;
        }
        if (!article) {
            message.error('文章详情未加载完成');
            return;
        }

        const values = form.getFieldsValue();
        const selectedTagIds = values.tagIds ?? article.tags.map((tag) => tag.id);
        const selectedTags = selectedTagIds
            .map((tagId) => tagOptions.find((tag) => tag.id === tagId))
            .filter((tag): tag is TagOption => Boolean(tag))
            .map((tag) => ({
                id: tag.id,
                name: tag.name,
            }));

        const previewArticle: ArticleWithTags = {
            ...article,
            title: values.title ?? article.title,
            content: serializeArticleEditorContent(getCurrentEditorContent()),
            summary: values.summary ?? article.summary,
            published: values.published ?? article.published,
            isDraft: values.isDraft ?? article.isDraft,
            allowComments: values.allowComments ?? article.allowComments,
            cardType: values.cardType ?? article.cardType,
            cardImageUrl: values.cardImageUrl ?? article.cardImageUrl,
            tags:
                selectedTags.length > 0 || selectedTagIds.length === 0
                    ? selectedTags
                    : article.tags,
            updatedAt: new Date().toISOString(),
        };

        try {
            const res = await articleService.createPreview(previewArticle);
            const previewUrl = `${blogPublicUrl}/articles/${id}?preview=true&previewToken=${encodeURIComponent(res.data.token)}`;
            window.open(previewUrl, '_blank', 'noopener,noreferrer');
        } catch (error) {
            const errorMessage = error instanceof Error ? error.message : '创建预览失败';
            message.error(errorMessage);
        }
    }, [article, form, getCurrentEditorContent, id, tagOptions]);

    // 发布文章
    const handlePublish = useCallback(async () => {
        try {
            const values = await form.validateFields();
            if (!id) {
                message.error('文章ID不存在');
                return;
            }

            const updateData: UpdateArticleRequest = {
                id,
                title: values.title,
                content: serializeArticleEditorContent(getCurrentEditorContent()),
                summary: values.summary,
                published: true,
                isDraft: false,
                allowComments: values.allowComments,
                cardType: values.cardType,
                cardImageUrl: values.cardImageUrl,
                tagIds: values.tagIds,
            };

            await saveArticle(updateData);
            form.setFieldValue('published', true);
            form.setFieldValue('isDraft', false);
        } catch (error) {
            console.error('发布失败:', error);
        }
    }, [form, getCurrentEditorContent, id, saveArticle]);

    // 进入全屏模式
    const handleEnterFullscreen = useCallback(() => {
        if (!id) {
            message.error('文章ID不存在');
            return;
        }

        writeArticleEditDraft(id, {
            content: getCurrentEditorContent(),
            formValues: form.getFieldsValue() as unknown as Record<string, unknown>,
            returnPath: `/blog/article/edit/${id}`,
        });
        navigate(`/blog/article/edit/${id}/fullscreen`, {
            state: {
                source: 'article-settings',
                returnPath: `/blog/article/edit/${id}`,
            },
        });
    }, [form, getCurrentEditorContent, id, navigate]);

    // 缓存卡片类型选项
    const cardTypeOptions = useMemo(() => {
        return Object.entries(CardTypeLabels).map(([key, label]) => ({
            label,
            value: key,
        }));
    }, []);

    if (articleLoading) {
        return (
            <div className={styles.loadingContainer}>
                <Spin size="large" description="加载文章中..." />
            </div>
        );
    }

    if (articleError || !article) {
        return (
            <div className={styles.errorContainer}>
                <Title level={4}>文章不存在或加载失败</Title>
                <Button type="primary" onClick={handleBack}>
                    返回列表
                </Button>
            </div>
        );
    }

    return (
        <div className={styles.editArticle}>
            {/* 顶部导航 */}
            <div className={styles.header}>
                <div className={styles.headerActions}>
                    <Space>
                        <Button icon={<ArrowLeftOutlined />} onClick={handleBack}>
                            返回
                        </Button>
                        <Button icon={<EyeOutlined />} onClick={() => void handlePreview()}>
                            预览
                        </Button>
                        {canSaveArticle && canPublishArticle && (
                            <Button onClick={() => handleSubmit(true)} loading={saveLoading}>
                                保存草稿
                            </Button>
                        )}
                        {canSaveArticle && (
                            <Button
                                type="primary"
                                onClick={() => handleSubmit()}
                                loading={saveLoading}
                            >
                                <SaveOutlined />
                                保存
                            </Button>
                        )}
                        {canSaveArticle && canPublishArticle && (
                            <Button
                                type="primary"
                                danger
                                icon={<SendOutlined />}
                                onClick={handlePublish}
                                loading={saveLoading}
                            >
                                发布
                            </Button>
                        )}
                    </Space>
                </div>
            </div>

            <div className={styles.content}>
                <Row gutter={16}>
                    {/* 主内容区 */}
                    <Col span={18}>
                        <Card className={styles.mainCard}>
                            <Form form={form} layout="vertical">
                                <Form.Item
                                    name="title"
                                    label="文章标题"
                                    rules={[{ required: true, message: '请输入文章标题' }]}
                                >
                                    <Input
                                        placeholder="请输入文章标题"
                                        size="large"
                                        className={styles.titleInput}
                                    />
                                </Form.Item>

                                <Form.Item
                                    name="summary"
                                    label={
                                        <Space>
                                            <span>文章摘要</span>
                                            <Dropdown
                                                menu={{
                                                    items: [
                                                        {
                                                            key: 'deepseek-v4-flash',
                                                            label: (
                                                                <Space>
                                                                    <RobotOutlined />
                                                                    <span>deepseek-v4-flash</span>
                                                                    <Tag color="blue">快速</Tag>
                                                                </Space>
                                                            ),
                                                            onClick: () =>
                                                                setSelectedModel(
                                                                    'deepseek-v4-flash',
                                                                ),
                                                        },
                                                        {
                                                            key: 'deepseek-v4-pro',
                                                            label: (
                                                                <Space>
                                                                    <RobotOutlined />
                                                                    <span>deepseek-v4-pro</span>
                                                                    <Tag color="gold">智能</Tag>
                                                                </Space>
                                                            ),
                                                            onClick: () =>
                                                                setSelectedModel('deepseek-v4-pro'),
                                                        },
                                                    ],
                                                    selectable: true,
                                                    selectedKeys: [selectedModel],
                                                }}
                                                disabled={editorContentEmpty || !canSaveArticle}
                                            >
                                                <Button
                                                    type="link"
                                                    size="small"
                                                    onClick={handleGenerateSummary}
                                                    loading={summaryLoading}
                                                    disabled={editorContentEmpty || !canSaveArticle}
                                                >
                                                    <RobotOutlined />
                                                    一键总结 (
                                                    {selectedModel === 'deepseek-v4-flash'
                                                        ? 'V4-Flash'
                                                        : 'V4-Pro'}
                                                    )
                                                    <DownOutlined />
                                                </Button>
                                            </Dropdown>
                                        </Space>
                                    }
                                >
                                    <Input.TextArea
                                        placeholder="请输入文章摘要，或使用AI一键总结"
                                        rows={3}
                                        maxLength={500}
                                        showCount
                                    />
                                </Form.Item>

                                <Form.Item
                                    label={
                                        <Space>
                                            <span>文章内容</span>
                                            <Tooltip title="全屏编辑 (按 ESC 退出)">
                                                <Button
                                                    type="text"
                                                    size="small"
                                                    icon={<FullscreenOutlined />}
                                                    onClick={handleEnterFullscreen}
                                                />
                                            </Tooltip>
                                        </Space>
                                    }
                                >
                                    <div className={styles.editorContainer}>
                                        <ArticleEditor
                                            content={editorContent}
                                            onUpdate={recordEditorContentUpdate}
                                            onReady={handleEmbeddedEditorReady}
                                            articleId={id}
                                            className={styles.editor}
                                            contentClassName={styles.editorContent1}
                                        />
                                    </div>
                                </Form.Item>
                            </Form>
                        </Card>
                    </Col>

                    {/* 侧边栏设置 */}
                    <Col span={6}>
                        <Space orientation="vertical" size="middle" style={{ width: '100%' }}>
                            {/* 发布设置 */}
                            <Card title="发布设置" size="small">
                                <Form form={form} layout="vertical">
                                    <Form.Item name="published" valuePropName="checked">
                                        <CustomSwitch
                                            checkedChildren="已发"
                                            unCheckedChildren="未发"
                                            disabled={!canPublishArticle}
                                            text="是否发布"
                                        />
                                    </Form.Item>

                                    <Form.Item name="isDraft" valuePropName="checked">
                                        <CustomSwitch
                                            checkedChildren="草稿"
                                            unCheckedChildren="正式"
                                            disabled={!canPublishArticle}
                                            text="当前状态"
                                        />
                                    </Form.Item>

                                    <Form.Item name="allowComments" valuePropName="checked">
                                        <CustomSwitch
                                            checkedChildren="允许"
                                            unCheckedChildren="禁止"
                                            text="允许评论"
                                        />
                                    </Form.Item>
                                </Form>
                            </Card>

                            {/* 卡片设置 */}
                            <Card title="卡片设置" size="small">
                                <Form form={form} layout="vertical">
                                    <Form.Item
                                        name="cardType"
                                        label="卡片类型"
                                        rules={[{ required: true, message: '请选择卡片类型' }]}
                                    >
                                        <Select placeholder="请选择卡片类型">
                                            {cardTypeOptions.map((option) => (
                                                <Option key={option.value} value={option.value}>
                                                    {option.label}
                                                </Option>
                                            ))}
                                        </Select>
                                    </Form.Item>

                                    <Form.Item name="cardImageUrl" label="卡片图片">
                                        <MemoizedArticleCardImageUpload articleId={id} />
                                    </Form.Item>
                                </Form>
                            </Card>

                            {/* 标签设置 */}
                            <Card title="标签设置" size="small">
                                <Form form={form} layout="vertical">
                                    <Form.Item name="tagIds" label="文章标签">
                                        <Select
                                            mode="multiple"
                                            placeholder="请选择标签"
                                            optionLabelProp="label"
                                        >
                                            {tagOptions.map((tag: TagOption) => (
                                                <Option
                                                    key={tag.id}
                                                    value={tag.id}
                                                    label={tag.name}
                                                >
                                                    <Tag color="blue">{tag.name}</Tag>
                                                </Option>
                                            ))}
                                        </Select>
                                    </Form.Item>
                                </Form>
                            </Card>

                            {/* 文章信息 */}
                            <Card title="文章信息" size="small">
                                <div className={styles.articleInfo}>
                                    <div className={styles.infoItem}>
                                        <span className={styles.label}>作者:</span>
                                        <span>
                                            {article.author.nickname || article.author.username}
                                        </span>
                                    </div>
                                    <div className={styles.infoItem}>
                                        <span className={styles.label}>创建时间:</span>
                                        <span>{new Date(article.createdAt).toLocaleString()}</span>
                                    </div>
                                    <div className={styles.infoItem}>
                                        <span className={styles.label}>更新时间:</span>
                                        <span>{new Date(article.updatedAt).toLocaleString()}</span>
                                    </div>
                                    <div className={styles.infoItem}>
                                        <span className={styles.label}>状态:</span>
                                        <Space>
                                            {article.published && <Tag color="green">已发布</Tag>}
                                            {article.isDraft && <Tag color="orange">草稿</Tag>}
                                            {!article.published && !article.isDraft && (
                                                <Tag color="red">未发布</Tag>
                                            )}
                                        </Space>
                                    </div>
                                </div>
                            </Card>
                        </Space>
                    </Col>
                </Row>
            </div>
        </div>
    );
}

export default EditArticle;
