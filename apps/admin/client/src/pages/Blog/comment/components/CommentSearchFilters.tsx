import { Form, Input, Select } from 'antd';
import SearchForm from '@/components/SearchForm';
import type { CommentListRequest } from '@blog/shared';
import { commentStatusOptions } from '@blog/shared';

export interface SelectOption {
    label: string;
    value: string | number;
}

export interface CommentSearchFiltersProps {
    onSearch: (values: Partial<CommentListRequest>) => void;
    onReset?: () => void;
    loading?: boolean;
    articleOptions: SelectOption[];
    authorOptions: SelectOption[];
    initialValues?: Partial<CommentListRequest>;
}

/**
 * 评论管理搜索表单 - 纯展示组件
 */
export function CommentSearchFilters({
    onSearch,
    onReset,
    loading = false,
    articleOptions,
    authorOptions,
    initialValues,
}: CommentSearchFiltersProps) {
    return (
        <SearchForm
            onSearch={onSearch}
            onReset={onReset}
            loading={loading}
            initialValues={initialValues as Record<string, unknown> | undefined}
        >
            <Form.Item name="id" label="评论ID">
                <Input placeholder="请输入评论ID" />
            </Form.Item>
            <Form.Item name="postId" label="所属文章">
                <Select placeholder="请选择文章" allowClear options={articleOptions} />
            </Form.Item>
            <Form.Item name="authorId" label="评论人">
                <Select placeholder="请选择作者" allowClear options={authorOptions} />
            </Form.Item>
            <Form.Item name="status" label="状态">
                <Select placeholder="请选择状态" options={commentStatusOptions} />
            </Form.Item>
        </SearchForm>
    );
}
