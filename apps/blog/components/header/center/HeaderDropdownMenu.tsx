'use client';

import * as React from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { cn } from '@/lib/shared/utils';
import { ChevronDown } from 'lucide-react';

interface HeaderDropdownMenuItem {
    href: string;
    label: string;
}

interface HeaderDropdownMenuProps {
    /** 菜单项列表 */
    items: HeaderDropdownMenuItem[];
    /** 按钮文本 */
    buttonText: string;
    /** 是否当前在菜单项中 */
    isInMenu?: boolean;
    /** 下拉菜单宽度类名 */
    menuWidth?: string;
}

export function HeaderDropdownMenu({
    items,
    buttonText,
    isInMenu = false,
    menuWidth = 'w-40',
}: HeaderDropdownMenuProps) {
    const pathname = usePathname();
    const [isOpen, setIsOpen] = React.useState(false);
    const dropdownRef = React.useRef<HTMLDivElement>(null);

    // 检查当前路径是否在菜单项中
    const isCurrentInMenu = React.useMemo(() => {
        return items.some(
            (item) =>
                pathname === item.href || (item.href !== '/' && pathname?.startsWith(item.href)),
        );
    }, [pathname, items]);

    // 处理外部点击
    React.useEffect(() => {
        function handleClickOutside(event: MouseEvent) {
            if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
                setIsOpen(false);
            }
        }

        document.addEventListener('mousedown', handleClickOutside);
        return () => {
            document.removeEventListener('mousedown', handleClickOutside);
        };
    }, []);

    return (
        <div className="relative" ref={dropdownRef}>
            <button
                onClick={() => setIsOpen(!isOpen)}
                className={cn(
                    'flex items-center px-3 py-2 text-sm font-medium transition-all duration-200',
                    'rounded-md hover:bg-interactive-hover',
                    isInMenu || isCurrentInMenu
                        ? 'text-primary'
                        : 'text-muted-foreground hover:text-interactive-hover-foreground',
                )}
            >
                {buttonText}
                <ChevronDown
                    className={cn(
                        'ml-1 h-3.5 w-3.5 transition-transform duration-200',
                        isOpen && 'rotate-180',
                    )}
                />
            </button>

            {/* 下拉菜单内容 */}
            {isOpen && (
                <div
                    className={cn(
                        'absolute top-full right-0 mt-2 rounded-xl border border-border/50',
                        'bg-background/95 shadow-lg ring-1 ring-black/5 backdrop-blur-sm',
                        'z-150 animate-in duration-200 fade-in-0 zoom-in-95',
                        menuWidth,
                    )}
                >
                    <div className="p-1">
                        {items.map((item) => {
                            const isActive =
                                pathname === item.href ||
                                (item.href !== '/' && pathname?.startsWith(item.href));

                            return (
                                <Link
                                    key={item.href}
                                    href={item.href}
                                    onClick={() => setIsOpen(false)}
                                    className={cn(
                                        'flex items-center rounded-lg px-3 py-2.5 text-sm transition-all duration-150',
                                        'hover:bg-interactive-hover hover:text-interactive-hover-foreground',
                                        isActive
                                            ? 'bg-primary/10 font-medium text-primary'
                                            : 'text-muted-foreground',
                                    )}
                                >
                                    <span className="truncate">{item.label}</span>
                                </Link>
                            );
                        })}
                    </div>
                </div>
            )}
        </div>
    );
}
