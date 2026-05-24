import { MobileRight } from './mobile';
import { PadRight } from './pad';
import { PcRight } from './pc';
/**
 * 右侧功能区组件
 * 按元素尺寸分类组织，便于维护
 *
 * 性能说明：
 * - 使用独立div管理不同尺寸，性能无影响（仅CSS响应式类）
 * - 更清晰的结构有利于代码维护和优化
 * - 响应式类不会增加JS执行成本，只是CSS媒体查询
 *
 * Tailwind CSS 响应式断点：
 * - sm: 640px（小屏幕）
 * - md: 768px（中等屏幕/平板）
 * - lg: 1024px（大屏幕/桌面）
 * - xl: 1280px（超大屏幕）
 * - 2xl: 1536px（超超大屏幕）
 *
 * 尺寸分类：
 * - 移动端专用组（< 768px）：移动搜索、移动菜单
 * - 中大尺寸组（>= 768px）：搜索框（h-8 w-[70px]）+ 图标按钮（h-9 w-9）
 */
export function RightActions() {
    return (
        <>
            <MobileRight />
            <PadRight />
            <PcRight />
        </>
    );
}
