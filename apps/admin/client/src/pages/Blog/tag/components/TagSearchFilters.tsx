import { Form, Input } from 'antd';
import SearchForm from '@/components/SearchForm';
import type { TagListRequest } from '@blog/shared';

export interface TagSearchFiltersProps {
    onSearch: (values: Partial<TagListRequest>) => void;
    onReset?: () => void;
    loading?: boolean;
}

/**
 * 标签管理搜索表单 - 纯展示组件
 */
export function TagSearchFilters({ onSearch, onReset, loading = false }: TagSearchFiltersProps) {
    return (
        <SearchForm onSearch={onSearch} onReset={onReset} loading={loading}>
            <Form.Item name="name" label="标签名称">
                <Input placeholder="请输入标签名称" />
            </Form.Item>
        </SearchForm>
    );
}
