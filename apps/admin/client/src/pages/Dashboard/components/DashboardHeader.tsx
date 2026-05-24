import { useState } from 'react';
import { DatePicker, Typography } from 'antd';
import classNames from 'classnames';
import type { DashboardRange } from '@blog/shared';
import useUserStore from '@/stores/user';
import { getDashboardPresetRange } from '../dashboard-date-range';
import { dashboardRangeOptions } from '../dashboard-config';
import type { DashboardDateRange } from '../types';
import styles from '../index.module.less';

const { Title } = Typography;
const { RangePicker } = DatePicker;

const getGreeting = (date: Date): string => {
    const hour = date.getHours();

    if (hour < 12) return '早上好';
    if (hour < 18) return '下午好';
    return '晚上好';
};

const formatDateText = (date: Date): string => {
    return new Intl.DateTimeFormat('zh-CN', {
        year: 'numeric',
        month: 'long',
        day: 'numeric',
        weekday: 'long',
    }).format(date);
};

interface DashboardHeaderProps {
    selectedDateRange: DashboardDateRange;
    onRangeChange: (range: DashboardRange) => void;
    onDateRangeChange: (dates: DashboardDateRange | null) => void;
}

export function DashboardHeader({
    selectedDateRange,
    onRangeChange,
    onDateRangeChange,
}: DashboardHeaderProps) {
    const nickname = useUserStore((state) => state.userInfo?.nickname ?? '管理员');
    const [mountedAt] = useState(() => new Date());
    const greeting = getGreeting(mountedAt);
    const dateText = formatDateText(mountedAt);
    const selectedPresetRange = getDashboardPresetRange(selectedDateRange);

    return (
        <div className={styles.dashboardHeader}>
            <div className={styles.headerMain}>
                <span className={styles.greetingIcon}>👏🏻</span>
                <div>
                    <Title level={3} className={styles.pageTitle}>
                        {greeting}，{nickname}
                    </Title>
                    <p className={styles.pageSubtitle}>{dateText}，祝你工作顺利。</p>
                </div>
            </div>

            <div className={styles.toolbar}>
                <div className={styles.periodSwitcher}>
                    {dashboardRangeOptions.map((item) => (
                        <button
                            type="button"
                            key={item.value}
                            className={classNames(styles.periodButton, {
                                [styles.periodButtonActive]: item.value === selectedPresetRange,
                            })}
                            onClick={() => onRangeChange(item.value)}
                        >
                            {item.label}
                        </button>
                    ))}
                </div>
                <span className={styles.toolbarDivider} />
                <RangePicker
                    bordered={false}
                    className={classNames(styles.rangePicker, {
                        [styles.rangePickerActive]: selectedPresetRange === null,
                    })}
                    value={selectedDateRange}
                    onChange={(dates) => {
                        if (!dates || dates.length !== 2 || !dates[0] || !dates[1]) {
                            onDateRangeChange(null);
                            return;
                        }

                        onDateRangeChange([dates[0], dates[1]]);
                    }}
                    placeholder={['开始日期', '结束日期']}
                />
            </div>
        </div>
    );
}
