import { Form, Input, Select } from 'antd';
import SearchForm from '@/components/SearchForm';
import type { ArticleListRequest } from '@blog/shared';
import { CardTypeLabels } from '@blog/shared';
const publishedOptions = [
    { label: '已发布', value: true },
    { label: '未发布', value: false },
];

const draftOptions = [
    { label: '草稿', value: true },
    { label: '正式', value: false },
];

const cardTypeOptions = Object.entries(CardTypeLabels).map(([value, label]) => ({
    label,
    value,
}));

export interface ArticleSearchFiltersProps {
    onSearch: (values: Partial<ArticleListRequest>) => void;
    onReset?: () => void;
    loading?: boolean;
    authorOptions: { label: string; value: number }[];
    initialValues?: Partial<ArticleListRequest>;
}

/**
 * 文章管理搜索表单 - 纯展示组件
 */
export function ArticleSearchFilters({
    onSearch,
    onReset,
    loading = false,
    authorOptions,
    initialValues,
}: ArticleSearchFiltersProps) {
    return (
        <SearchForm
            onSearch={onSearch}
            onReset={onReset}
            loading={loading}
            initialValues={initialValues as Record<string, unknown> | undefined}
        >
            <Form.Item name="keyword" label="关键词">
                <Input placeholder="搜索标题或内容" />
            </Form.Item>
            <Form.Item name="title" label="标题">
                <Input placeholder="请输入文章标题" />
            </Form.Item>
            <Form.Item name="authorId" label="作者">
                <Select placeholder="请选择作者" allowClear options={authorOptions} />
            </Form.Item>
            <Form.Item name="cardType" label="卡片类型">
                <Select placeholder="请选择卡片类型" allowClear options={cardTypeOptions} />
            </Form.Item>
            <Form.Item name="published" label="发布状态">
                <Select placeholder="请选择发布状态" allowClear options={publishedOptions} />
            </Form.Item>
            <Form.Item name="isDraft" label="草稿状态">
                <Select placeholder="请选择草稿状态" allowClear options={draftOptions} />
            </Form.Item>
        </SearchForm>
    );
}
