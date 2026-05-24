import React, { forwardRef, useImperativeHandle } from 'react';
import { Form, Button, Space, Card } from 'antd';
import type { FormProps } from 'antd';
import { SearchOutlined, ReloadOutlined } from '@ant-design/icons';
import styles from './index.module.less';

export interface SearchFormRef {
    /** 重置表单 */
    resetFields: () => void;
    /** 设置表单值 */
    setFieldsValue: (values: Record<string, unknown>) => void;
    /** 获取表单值 */
    getFieldsValue: () => Record<string, unknown>;
    /** 触发表单提交（搜索） */
    submit: () => void;
}

export interface SearchFormProps {
    children: React.ReactNode;
    onSearch: (values: Record<string, unknown>) => void;
    onReset?: () => void;
    className?: string;
    loading?: boolean;
    initialValues?: object;
    layout?: FormProps['layout'];
    showCard?: boolean;
}

const SearchForm = forwardRef<SearchFormRef, SearchFormProps>(function SearchForm(
    {
        children,
        onSearch,
        onReset,
        className,
        loading = false,
        initialValues,
        layout = 'inline',
        showCard = true,
    },
    ref,
) {
    const [form] = Form.useForm();

    useImperativeHandle(ref, () => ({
        resetFields: () => form.resetFields(),
        setFieldsValue: (values) => form.setFieldsValue(values),
        getFieldsValue: () => form.getFieldsValue() as Record<string, unknown>,
        submit: () => form.submit(),
    }));

    const handleReset = () => {
        form.resetFields();
        onReset?.();
    };

    const formClassName = [
        'search-form',
        layout === 'vertical' ? 'search-form-vertical' : '',
        className || '',
    ]
        .filter(Boolean)
        .join(' ');

    const formNode = (
        <Form
            form={form}
            layout={layout}
            className={formClassName}
            onFinish={onSearch}
            initialValues={initialValues}
        >
            {children}
            <Form.Item
                className={`${styles.btnItem} ${layout === 'vertical' ? styles.btnItemVertical : ''}`.trim()}
            >
                <Space>
                    <Button
                        type="primary"
                        htmlType="submit"
                        icon={<SearchOutlined />}
                        loading={loading}
                    >
                        搜索
                    </Button>
                    <Button icon={<ReloadOutlined />} onClick={handleReset}>
                        重置
                    </Button>
                </Space>
            </Form.Item>
        </Form>
    );

    return (
        <div className={styles.searchContainer}>
            {showCard ? <Card className={styles.searchCard}>{formNode}</Card> : formNode}
        </div>
    );
});

export default SearchForm;
