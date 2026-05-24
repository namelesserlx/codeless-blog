import { Form, Input, Select } from 'antd';
import SearchForm from '@/components/SearchForm';
import type { UserListRequest } from '@blog/shared';

export interface StatusOption {
    label: string;
    value: string;
}

export interface UserSearchFiltersProps {
    onSearch: (values: Partial<UserListRequest>) => void;
    onReset?: () => void;
    loading?: boolean;
    statusOptions: StatusOption[];
}

/**
 * 用户管理搜索表单 - 纯展示组件
 * 负责用户名、邮箱、昵称、状态的筛选 UI
 */
export function UserSearchFilters({
    onSearch,
    onReset,
    loading = false,
    statusOptions,
}: UserSearchFiltersProps) {
    return (
        <SearchForm onSearch={onSearch} onReset={onReset} loading={loading}>
            <Form.Item name="username" label="用户名">
                <Input placeholder="请输入用户名" />
            </Form.Item>
            <Form.Item name="email" label="邮箱">
                <Input placeholder="请输入邮箱" />
            </Form.Item>
            <Form.Item name="nickname" label="昵称">
                <Input placeholder="请输入昵称" />
            </Form.Item>
            <Form.Item name="status" label="状态">
                <Select placeholder="请选择状态" allowClear options={statusOptions} />
            </Form.Item>
        </SearchForm>
    );
}
