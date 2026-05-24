import { Layout, Menu } from 'antd';
import type { MenuProps } from 'antd';
import { useLocation, useNavigate } from 'react-router';
import { useMemo, useCallback, useEffect, useState, useRef, createElement } from 'react';
import type { ReactNode } from 'react';
import { getMenuItems } from '@/utils/menu';
import type { MenuItem } from '@/types/route';
import useUserStore from '@/stores/user';
import styles from './index.module.less';

/** Ant Design Menu 所需的菜单节点结构（icon 已由 ElementType 转为 ReactNode） */
interface AntMenuItem {
    key: string;
    label: string;
    icon?: ReactNode;
    children?: AntMenuItem[];
}

const { Sider } = Layout;

interface BasicSiderProps {
    collapsed: boolean;
}

function BasicSider({ collapsed }: BasicSiderProps) {
    const location = useLocation();
    const navigate = useNavigate();
    const userInfo = useUserStore((state) => state.userInfo);

    const toAntMenuItems = useCallback((items: MenuItem[]): AntMenuItem[] => {
        return items.map((item) => ({
            key: item.key,
            label: item.label,
            icon: item.icon ? createElement(item.icon) : undefined,
            children: item.children ? toAntMenuItems(item.children) : undefined,
        }));
    }, []);

    // 菜单项随用户权限动态更新（userInfo 变化意味着权限可能变化，需要重算）
    // eslint-disable-next-line react-hooks/exhaustive-deps
    const menuItems = useMemo(() => toAntMenuItems(getMenuItems()), [userInfo, toAntMenuItems]);

    // 在菜单树中递归查找与 pathname 完全匹配的 key
    const findExactKey = useCallback((items: AntMenuItem[], pathname: string): string | null => {
        for (const item of items) {
            if (item.key === pathname) return item.key;
            if (item.children) {
                const found = findExactKey(item.children, pathname);
                if (found) return found;
            }
        }
        return null;
    }, []);

    // 在叶子节点中查找前缀匹配（如 /blog/article/edit/1 → /blog/article）
    const findPrefixKey = useCallback((items: AntMenuItem[], pathname: string): string | null => {
        for (const item of items) {
            if (item.children) {
                const found = findPrefixKey(item.children, pathname);
                if (found) return found;
            } else if (pathname.startsWith(item.key + '/')) {
                return item.key;
            }
        }
        return null;
    }, []);

    // 当前高亮的菜单 key：精确匹配 → 前缀匹配 → 空（不高亮任何菜单项）
    const selectedKeys = useMemo((): string[] => {
        const pathname = location.pathname;
        const exact = findExactKey(menuItems, pathname);
        if (exact) return [exact];
        const prefix = findPrefixKey(menuItems, pathname);
        if (prefix) return [prefix];
        return [];
    }, [menuItems, location.pathname, findExactKey, findPrefixKey]);

    // 根据当前路径计算应该展开哪些父级菜单
    const calcOpenKeys = useCallback(
        (pathname: string): string[] => {
            return menuItems
                .filter((item) =>
                    item.children?.some(
                        (child) => pathname === child.key || pathname.startsWith(child.key + '/'),
                    ),
                )
                .map((item) => item.key);
        },
        [menuItems],
    );

    // 受控的展开状态：路由跳转时自动同步，用户手动展开/收起时也能响应
    const [openKeys, setOpenKeys] = useState<string[]>(() => calcOpenKeys(location.pathname));

    // 标记是否为程序化更新，避免 Menu 在收到新 openKeys 后触发 onOpenChange 导致的重复 setState
    const isProgrammaticUpdateRef = useRef(false);

    useEffect(() => {
        isProgrammaticUpdateRef.current = true;
        const next = calcOpenKeys(location.pathname);
        setOpenKeys((prev) =>
            prev.length === next.length && prev.every((k, i) => k === next[i]) ? prev : next,
        );
    }, [location.pathname, calcOpenKeys]);

    useEffect(() => {
        isProgrammaticUpdateRef.current = false;
    });

    const handleOpenChange = useCallback((keys: string[]) => {
        if (isProgrammaticUpdateRef.current) return;
        setOpenKeys(keys);
    }, []);

    const handleMenuClick = useCallback(
        (key: string) => {
            navigate(key);
        },
        [navigate],
    );
    return (
        <Sider
            trigger={null}
            collapsible
            collapsed={collapsed}
            className={styles.sider}
            width={240}
            collapsedWidth={64}
        >
            <div className={styles.logo}>
                {!collapsed ? (
                    <>
                        <img className={styles.logoImg} src="/logo.png" alt="logo" />
                        <span>{"CodeLess's"} Blog</span>
                    </>
                ) : (
                    <img className={styles.logoImg} src="/logo.png" alt="logo" />
                )}
            </div>
            <Menu
                theme="light"
                mode="inline"
                selectedKeys={selectedKeys}
                openKeys={openKeys}
                onOpenChange={handleOpenChange}
                items={menuItems as MenuProps['items']}
                onClick={({ key }) => handleMenuClick(key)}
                className={styles.menu}
            />
        </Sider>
    );
}

export default BasicSider;
