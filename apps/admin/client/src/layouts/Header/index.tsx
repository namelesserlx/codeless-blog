import { Layout, Dropdown, message, Avatar, Breadcrumb } from 'antd';
import {
    UserOutlined,
    MenuFoldOutlined,
    MenuUnfoldOutlined,
    LogoutOutlined,
} from '@ant-design/icons';
import { createElement, useCallback, useMemo } from 'react';
import { useNavigate, Link, useLocation } from 'react-router';
import useUserStore from '@/stores/user';
import { storage } from '@blog/shared';
import { generateBreadcrumbItems } from '@/utils/breadcrumb';
import type { MenuProps } from 'antd';
import styles from './index.module.less';

interface HeaderProps {
    collapsed: boolean;
    onToggle: () => void;
}

const { Header } = Layout;

export default function BasicHeader({ collapsed, onToggle }: HeaderProps) {
    // 细粒度 selector：只订阅真正用到的字段，避免其他 store 字段变化触发无关 re-render
    const userInfo = useUserStore((state) => state.userInfo);
    const logout = useUserStore((state) => state.logout);
    const navigate = useNavigate();
    const location = useLocation();

    const logOut = useCallback(async () => {
        try {
            logout();
            storage.clearUserInfo();
            message.success('退出登录成功');
            navigate('/login');
        } catch (error) {
            message.error(error instanceof Error ? error.message : '退出登录失败');
        }
    }, [logout, navigate]);

    // 面包屑仅在路径变化时重新计算
    const breadcrumbItems = useMemo(() => {
        return generateBreadcrumbItems(location.pathname).map((item, index, arr) => {
            if (item.href && index !== arr.length - 1) {
                return { title: <Link to={item.href}>{item.title}</Link> };
            }
            return { title: item.title };
        });
    }, [location.pathname]);

    // 下拉菜单配置稳定，仅在 logOut/navigate 引用变化时重算
    const dropdownItems = useMemo(
        (): MenuProps['items'] => [
            {
                key: 'profile',
                label: '个人中心',
                icon: <UserOutlined />,
                onClick: () => navigate('/profile'),
            },
            { type: 'divider' },
            {
                key: 'logout',
                label: '退出登录',
                icon: <LogoutOutlined />,
                onClick: logOut,
            },
        ],
        [navigate, logOut],
    );
    if (!userInfo) {
        return null;
    }

    return (
        <Header className={styles.header}>
            <div className={styles.left}>
                {createElement(collapsed ? MenuUnfoldOutlined : MenuFoldOutlined, {
                    className: styles.trigger,
                    onClick: onToggle,
                })}
                <Breadcrumb className={styles.breadcrumb} items={breadcrumbItems} />
            </div>
            <div className={styles.userInfo}>
                <div className={styles.userDetail}>
                    <Avatar size={32} src={userInfo.avatar} icon={<UserOutlined />} />
                    <Dropdown menu={{ items: dropdownItems }} placement="bottomRight" arrow>
                        <div className={styles.userText}>
                            <div className={styles.userName}>{userInfo.nickname}</div>
                        </div>
                    </Dropdown>
                </div>
            </div>
        </Header>
    );
}
