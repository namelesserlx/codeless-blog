import { Form, Input, Select } from 'antd';
import SearchForm from '@/components/SearchForm';
import type { SnippetListRequest } from '@blog/shared';

const publishedOptions = [
    { label: '已发布', value: true },
    { label: '未发布', value: false },
];

const draftOptions = [
    { label: '草稿', value: true },
    { label: '正式', value: false },
];

export interface SnippetSearchFiltersProps {
    onSearch: (values: Partial<SnippetListRequest>) => void;
    onReset?: () => void;
    loading?: boolean;
    initialValues?: Partial<SnippetListRequest>;
}

/**
 * 片段管理搜索表单 - 纯展示组件
 */
export function SnippetSearchFilters({
    onSearch,
    onReset,
    loading = false,
    initialValues,
}: SnippetSearchFiltersProps) {
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
            <Form.Item name="published" label="发布状态">
                <Select placeholder="请选择发布状态" allowClear options={publishedOptions} />
            </Form.Item>
            <Form.Item name="isDraft" label="草稿状态">
                <Select placeholder="请选择草稿状态" allowClear options={draftOptions} />
            </Form.Item>
        </SearchForm>
    );
}
