'use client';

import * as React from 'react';
import { Settings } from 'lucide-react';
import { PwaActions } from '@/app/_features/pwa/client/PwaActions';
import { cn } from '@/lib/shared/utils';
import { ThemeToggle } from '@/components/theme/ThemeToggle';

/**
 * 设置下拉菜单组件
 * 用于 pad 尺寸（md ~ 2xl）下的设置功能
 * 包含 PWA 操作和主题切换
 *
 * 性能优化：
 * - 使用 CSS transform 进行旋转动画（GPU 加速）
 * - 使用 will-change 提示浏览器优化
 * - 使用 useCallback 避免不必要的重渲染
 */
export function SettingsDropdown() {
    const [isOpen, setIsOpen] = React.useState(false);
    const [rotation, setRotation] = React.useState(0);
    const dropdownRef = React.useRef<HTMLDivElement>(null);
    const iconRef = React.useRef<SVGSVGElement>(null);
    const closeTimerRef = React.useRef<NodeJS.Timeout | null>(null);

    // 清除关闭定时器
    const clearCloseTimer = React.useCallback(() => {
        if (closeTimerRef.current) {
            clearTimeout(closeTimerRef.current);
            closeTimerRef.current = null;
        }
    }, []);

    // 处理外部点击关闭
    React.useEffect(() => {
        function handleClickOutside(event: MouseEvent) {
            if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
                setIsOpen(false);
            }
        }

        if (isOpen) {
            document.addEventListener('mousedown', handleClickOutside);
        }

        return () => {
            document.removeEventListener('mousedown', handleClickOutside);
        };
    }, [isOpen]);

    // 清理定时器
    React.useEffect(() => {
        return () => {
            clearCloseTimer();
        };
    }, [clearCloseTimer]);

    // 旋转动画函数
    const triggerRotation = React.useCallback(() => {
        setRotation((prev) => prev + 360);
    }, []);

    // 处理点击
    const handleClick = React.useCallback(() => {
        clearCloseTimer();
        triggerRotation();
        setIsOpen((prev) => !prev);
    }, [triggerRotation, clearCloseTimer]);

    // 处理悬浮打开
    const handleMouseEnter = React.useCallback(() => {
        clearCloseTimer();
        if (!isOpen) {
            triggerRotation();
            setIsOpen(true);
        }
    }, [isOpen, triggerRotation, clearCloseTimer]);

    // 处理鼠标离开（延迟关闭，避免误触）
    const handleMouseLeave = React.useCallback(() => {
        clearCloseTimer();
        // 延迟关闭，给用户时间移动到下拉菜单
        closeTimerRef.current = setTimeout(() => {
            setIsOpen(false);
            closeTimerRef.current = null;
        }, 200);
    }, [clearCloseTimer]);

    return (
        <div
            className="relative"
            ref={dropdownRef}
            onMouseEnter={handleMouseEnter}
            onMouseLeave={handleMouseLeave}
        >
            <button
                type="button"
                onClick={handleClick}
                className={cn(
                    'text-muted-foreground hover:text-primary',
                    'flex h-9 w-9 items-center justify-center rounded-lg',
                    'transition-colors duration-200',
                )}
                aria-label="设置"
                aria-expanded={isOpen}
                aria-haspopup="true"
            >
                <Settings
                    ref={iconRef}
                    size={24}
                    className="transition-transform duration-700 ease-out will-change-transform"
                    style={{
                        transform: `rotate(${rotation}deg)`,
                    }}
                />
            </button>

            {/* 下拉菜单内容 */}
            {isOpen && (
                <div
                    className={cn(
                        'absolute top-full right-0 mt-2 rounded-xl border border-border/50',
                        'bg-background/95 shadow-lg ring-1 ring-black/5 dark:ring-white/10',
                        'z-50 backdrop-blur-sm',
                        'animate-in duration-200 fade-in-0 zoom-in-95',
                        'min-w-[200px]',
                    )}
                    role="menu"
                    aria-orientation="vertical"
                    onMouseEnter={clearCloseTimer}
                >
                    <div className="space-y-1 p-2">
                        {/* PWA 操作区域 */}
                        <div className="px-2 py-1.5 [&>div]:flex [&>div]:flex-col [&>div]:gap-2 [&>div>button]:w-full [&>div>button]:justify-start">
                            <PwaActions />
                        </div>

                        {/* 分隔线 */}
                        <div className="my-1 h-px bg-border/50" />

                        {/* 主题切换区域 */}
                        <div className="flex items-center justify-between px-2 py-1.5">
                            <span className="text-sm text-muted-foreground">主题</span>
                            <ThemeToggle />
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
