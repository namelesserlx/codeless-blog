import type { ComponentType, ElementType } from 'react';

/** 路由节点的菜单/权限/面包屑元数据 */
export interface RouteMeta {
    /** 菜单与面包屑显示标题（有 meta 时必填） */
    title: string;
    /** 侧边菜单图标 */
    icon?: ElementType;
    /** 是否在侧边菜单中显示 */
    showInMenu?: boolean;
    /** 是否出现在面包屑中 */
    showInBreadcrumb?: boolean;
    /** 同级排序权重（越小越靠前） */
    order?: number;
    /** 对应后端的权限 code */
    code?: string;
    /** 权限类型 */
    permissionType?: 'DIRECTORY' | 'MENU' | 'BUTTON';
}

/** 应用路由节点——同时承载 React Router 结构与菜单/权限元数据 */
export interface AppRoute {
    /** 相对路由路径 */
    path: string;
    /** 菜单/面包屑/权限元数据 */
    meta?: RouteMeta;
    /** 页面组件懒加载函数，支持 default 导出与 Component 命名导出 */
    component?: () => Promise<
        | { default: ComponentType }
        | { Component: ComponentType }
        | { default?: ComponentType; Component?: ComponentType }
    >;
    /** 子路由 */
    children?: AppRoute[];
}

/** 侧边菜单节点 */
export interface MenuItem {
    /** 唯一标识（完整路由路径，如 /blog/article） */
    key: string;
    /** 显示文本 */
    label: string;
    /** 菜单图标 */
    icon?: ElementType;
    /** 子菜单 */
    children?: MenuItem[];
    /** 排序权重，仅用于生成阶段 */
    order?: number;
}
