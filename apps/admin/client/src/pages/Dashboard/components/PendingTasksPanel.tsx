import { ClockCircleOutlined } from '@ant-design/icons';
import { Col, Empty } from 'antd';
import classNames from 'classnames';
import { useNavigate } from 'react-router';
import { CommentStatus, DashboardTaskType, DashboardTaskTypeLabels } from '@blog/shared';
import type { TaskItem, TaskPriority } from '../types';
import styles from '../index.module.less';

interface PendingTasksPanelProps {
    tasks: TaskItem[];
}

function getPriorityClassName(priority: TaskPriority) {
    if (priority === '高') return styles.priorityHigh;
    if (priority === '中') return styles.priorityMedium;
    return styles.priorityLow;
}

const TASK_ACTIONS: Record<DashboardTaskType, (task: TaskItem) => { label: string; href: string }> =
    {
        [DashboardTaskType.COMMENT_REVIEW]: (task) => ({
            label: '去审核',
            href: `/blog/comment?status=${CommentStatus.PENDING}&id=${task.targetId}`,
        }),
        [DashboardTaskType.ARTICLE_DRAFT_PUBLISH]: (task) => ({
            label: '去编辑',
            href: `/blog/article/edit/${task.targetId}`,
        }),
        [DashboardTaskType.SNIPPET_DRAFT_PUBLISH]: (task) => ({
            label: '去编辑',
            href: `/blog/snippet?id=${task.targetId}`,
        }),
    };

export function PendingTasksPanel({ tasks }: PendingTasksPanelProps) {
    const navigate = useNavigate();

    return (
        <Col xs={24} lg={8}>
            <section className={classNames(styles.panel, styles.taskPanel)}>
                <div className={styles.panelHeader}>
                    <div className={styles.panelTitle}>
                        <ClockCircleOutlined />
                        <span>待处理事项（实时）</span>
                    </div>
                    <span className={styles.panelExtra}>{tasks.length} 项</span>
                </div>

                <div className={styles.taskListScroller}>
                    {tasks.length > 0 ? (
                        <ul className={styles.taskList}>
                            {tasks.map((task) => {
                                const action = TASK_ACTIONS[task.type](task);

                                return (
                                    <li key={task.id} className={styles.taskItem}>
                                        <div className={styles.taskMain}>
                                            <div className={styles.taskHeading}>
                                                <span className={styles.taskTitle}>
                                                    {task.title}
                                                </span>
                                                <span
                                                    className={classNames(
                                                        styles.priorityBadge,
                                                        getPriorityClassName(task.priority),
                                                    )}
                                                >
                                                    {task.priority}
                                                </span>
                                            </div>
                                            <div className={styles.taskBody}>
                                                <span className={styles.taskType}>
                                                    {DashboardTaskTypeLabels[task.type]}
                                                </span>
                                                <span className={styles.taskDesc}>
                                                    {task.description}
                                                </span>
                                            </div>
                                        </div>
                                        <button
                                            type="button"
                                            className={styles.taskAction}
                                            onClick={() => navigate(action.href)}
                                        >
                                            {action.label}
                                        </button>
                                    </li>
                                );
                            })}
                        </ul>
                    ) : (
                        <div className={styles.taskEmpty}>
                            <Empty
                                image={Empty.PRESENTED_IMAGE_SIMPLE}
                                description="暂无待处理事项"
                            />
                        </div>
                    )}
                </div>
            </section>
        </Col>
    );
}
