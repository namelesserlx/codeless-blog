import { Form, Input, Select, DatePicker } from 'antd';
import SearchForm from '@/components/SearchForm';
import { photoCategoryOptions } from '@blog/shared';
import type { PhotoListRequest } from '@blog/shared';

export interface PhotoSearchFiltersProps {
    onSearch: (values: Partial<PhotoListRequest>) => void;
    onReset?: () => void;
    loading?: boolean;
}

/**
 * 相册管理搜索表单 - 纯展示组件
 */
export function PhotoSearchFilters({
    onSearch,
    onReset,
    loading = false,
}: PhotoSearchFiltersProps) {
    return (
        <SearchForm onSearch={onSearch} onReset={onReset} loading={loading}>
            <Form.Item name="title" label="相册名称">
                <Input placeholder="请输入相册名称" />
            </Form.Item>
            <Form.Item name="category" label="相册分类">
                <Select placeholder="请选择相册分类" options={photoCategoryOptions} />
            </Form.Item>
            <Form.Item name="tags" label="相册标签">
                <Input placeholder="请输入相册标签" />
            </Form.Item>
            <Form.Item name="location" label="相册位置">
                <Input placeholder="请输入相册位置" />
            </Form.Item>
            <Form.Item name="date" label="时间范围">
                <DatePicker.RangePicker format="YYYY-MM-DD" />
            </Form.Item>
        </SearchForm>
    );
}
