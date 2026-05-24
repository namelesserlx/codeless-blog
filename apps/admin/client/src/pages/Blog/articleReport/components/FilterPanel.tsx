import { CalendarOutlined, ReadOutlined, TagsOutlined, UserOutlined } from '@ant-design/icons';
import { Col, DatePicker, Form, Input, Row, Select } from 'antd';
import SearchForm from '@/components/SearchForm';
import { PRESET_OPTIONS } from '../config';
import {
    ARTICLE_REPORT_MIN_DATE,
    ARTICLE_REPORT_TODAY,
    createPresetRangeByValue,
} from '../date-range';
import styles from '../index.module.less';
import type { ArticleReportFilterFormValues, SelectOption } from '../types';

const { RangePicker } = DatePicker;

interface FilterPanelProps {
    initialValues: ArticleReportFilterFormValues;
    authorOptions: SelectOption[];
    tagOptions: SelectOption[];
    loading: boolean;
    onSearch: (values: ArticleReportFilterFormValues) => void;
    onReset: () => void;
}

export function FilterPanel({
    initialValues,
    authorOptions,
    tagOptions,
    loading,
    onSearch,
    onReset,
}: FilterPanelProps) {
    const rangePresets = PRESET_OPTIONS.map((preset) => ({
        label: preset.label,
        value: createPresetRangeByValue(preset.value),
    }));

    return (
        <section className={styles.filterCard}>
            <SearchForm
                onSearch={(raw) => onSearch(raw as unknown as ArticleReportFilterFormValues)}
                onReset={onReset}
                loading={loading}
                initialValues={initialValues}
                layout="vertical"
                showCard={false}
                className={styles.filterForm}
            >
                <Row gutter={[14, 14]} className={styles.filterRow}>
                    <Col xs={24} md={12} xl={6}>
                        <Form.Item
                            name="selectedDateRange"
                            className={styles.filterField}
                            label={
                                <span className={styles.filterItemLabel}>
                                    <CalendarOutlined />
                                    日期范围
                                </span>
                            }
                        >
                            <RangePicker
                                className={styles.filterControl}
                                presets={rangePresets}
                                disabledDate={(current) =>
                                    !!current &&
                                    (current.isBefore(ARTICLE_REPORT_MIN_DATE, 'day') ||
                                        current.isAfter(ARTICLE_REPORT_TODAY, 'day'))
                                }
                            />
                        </Form.Item>
                    </Col>
                    <Col xs={24} md={12} xl={5}>
                        <Form.Item
                            name="authorFilter"
                            className={styles.filterField}
                            label={
                                <span className={styles.filterItemLabel}>
                                    <UserOutlined />
                                    作者
                                </span>
                            }
                        >
                            <Select
                                allowClear
                                placeholder="全部作者"
                                options={authorOptions}
                                className={styles.filterControl}
                            />
                        </Form.Item>
                    </Col>
                    <Col xs={24} md={12} xl={5}>
                        <Form.Item
                            name="tagFilter"
                            className={styles.filterField}
                            label={
                                <span className={styles.filterItemLabel}>
                                    <TagsOutlined />
                                    标签
                                </span>
                            }
                        >
                            <Select
                                allowClear
                                placeholder="全部标签"
                                options={tagOptions}
                                className={styles.filterControl}
                            />
                        </Form.Item>
                    </Col>
                    <Col xs={24} md={12} xl={8}>
                        <Form.Item
                            name="keyword"
                            className={styles.filterField}
                            label={
                                <span className={styles.filterItemLabel}>
                                    <ReadOutlined />
                                    关键词
                                </span>
                            }
                        >
                            <Input
                                allowClear
                                placeholder="搜索文章标题、摘要或标签"
                                className={styles.filterControl}
                            />
                        </Form.Item>
                    </Col>
                </Row>
            </SearchForm>
        </section>
    );
}
