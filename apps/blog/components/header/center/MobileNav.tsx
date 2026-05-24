'use client';

import * as React from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { LogIn, LogOut, Menu, MoonStar, Smartphone, UserCircle, UserRound } from 'lucide-react';
import { PwaActions } from '@/app/_features/pwa/client/PwaActions';
import { cn } from '@/lib/shared/utils';
import {
    Sheet,
    SheetContent,
    SheetDescription,
    SheetHeader,
    SheetTitle,
    SheetTrigger,
} from '@/components/ui/sheet';
import { ThemeToggle } from '@/components/theme/ThemeToggle';
import { useAuth } from '@/context/auth-context';
import { UserAvatar } from '@/components/ui/avatar';
import { allNavLinks } from './nav-config';

const sectionLabelClass =
    'px-1 text-[11px] font-semibold uppercase tracking-[0.14em] text-muted-foreground';
const panelClass = 'rounded-xl border border-border bg-card';
const rowClass =
    'flex min-h-11 items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-colors';
const iconButtonClass =
    'appearance-none outline-none [-webkit-tap-highlight-color:transparent] touch-manipulation';

export function MobileNav() {
    const pathname = usePathname();
    const [open, setOpen] = React.useState(false);
    const { auth, handleLogout, handleOpenLoginDialog } = useAuth();
    const userName = auth?.user ? auth.user.nickname || auth.user.username : '访客状态';

    const handleLogin = () => {
        setOpen(false);
        handleOpenLoginDialog(true);
    };

    const handleSignOut = () => {
        setOpen(false);
        handleLogout();
    };
    const clearTapFocus = (event: React.PointerEvent<HTMLButtonElement>) => {
        event.currentTarget.blur();
    };

    return (
        <Sheet open={open} onOpenChange={setOpen}>
            <SheetTrigger asChild>
                <button
                    type="button"
                    onPointerUp={clearTapFocus}
                    className={cn(
                        'flex h-8 w-8 items-center justify-center rounded-full text-foreground/80 transition-colors hover:text-primary md:hidden',
                        iconButtonClass,
                    )}
                    aria-label="打开移动端菜单"
                >
                    <Menu size={24} />
                </button>
            </SheetTrigger>
            <SheetContent
                side="right"
                className="w-[280px] max-w-[82vw] border-l border-border bg-background p-0 shadow-xl sm:w-[320px] sm:max-w-[320px]"
            >
                <SheetHeader className="gap-1 border-b border-border px-4 pt-[calc(env(safe-area-inset-top)+16px)] pb-4 text-left">
                    <SheetTitle className="pr-10 text-left text-lg font-semibold">菜单</SheetTitle>
                    <SheetDescription className="pr-10 text-left">
                        导航、账号和常用设置
                    </SheetDescription>
                </SheetHeader>

                <div className="flex min-h-0 flex-1 flex-col overflow-y-auto overscroll-contain px-4 py-4 pb-[calc(env(safe-area-inset-bottom)+16px)]">
                    <section className="space-y-2">
                        <div className={sectionLabelClass}>账户</div>

                        <div className={cn(panelClass, 'px-3 py-2')}>
                            <div className="flex min-h-12 items-center gap-3">
                                {auth?.user ? (
                                    <UserAvatar
                                        className="shrink-0"
                                        src={auth.user.avatar}
                                        name={auth.user.nickname || auth.user.username}
                                        imageAlt={auth.user.nickname || auth.user.username}
                                    />
                                ) : (
                                    <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-slate-100 text-slate-500 dark:bg-slate-800 dark:text-slate-300">
                                        <UserRound className="h-4 w-4" />
                                    </div>
                                )}

                                <div className="min-w-0 flex-1">
                                    <p className="truncate text-sm font-semibold text-foreground">
                                        {userName}
                                    </p>
                                    <p className="truncate text-xs text-muted-foreground">
                                        {auth?.user ? '账号已登录' : '登录后有更多功能'}
                                    </p>
                                </div>

                                <button
                                    type="button"
                                    onPointerUp={clearTapFocus}
                                    onClick={auth?.user ? handleSignOut : handleLogin}
                                    className={cn(
                                        'flex h-9 w-9 shrink-0 items-center justify-center rounded-lg text-muted-foreground transition-colors hover:bg-interactive-hover hover:text-interactive-hover-foreground',
                                        iconButtonClass,
                                    )}
                                    aria-label={auth?.user ? '退出登录' : '立即登录'}
                                >
                                    {auth?.user ? (
                                        <LogOut className="h-4 w-4" />
                                    ) : (
                                        <LogIn className="h-4 w-4" />
                                    )}
                                </button>
                            </div>

                            {auth?.user && (
                                <Link
                                    href="/profile"
                                    onClick={() => setOpen(false)}
                                    className="mt-2 flex min-h-10 items-center gap-2 border-t border-border pt-2 text-sm font-medium text-foreground transition-colors hover:text-primary"
                                >
                                    <UserCircle className="h-4 w-4 text-muted-foreground" />
                                    <span>个人中心</span>
                                </Link>
                            )}
                        </div>
                    </section>

                    <section className="mt-5 space-y-2">
                        <div className={sectionLabelClass}>导航</div>

                        <nav aria-label="移动端导航" className={cn(panelClass, 'p-2')}>
                            {allNavLinks.map((link) => {
                                const isActive =
                                    pathname === link.href ||
                                    (link.href !== '/' && pathname?.startsWith(link.href));
                                const Icon = link.icon;

                                return (
                                    <Link
                                        key={link.href}
                                        href={link.href}
                                        onClick={() => setOpen(false)}
                                        aria-current={isActive ? 'page' : undefined}
                                        className={cn(
                                            rowClass,
                                            isActive
                                                ? 'bg-primary/10 text-primary'
                                                : 'text-foreground hover:bg-interactive-hover hover:text-interactive-hover-foreground',
                                        )}
                                    >
                                        <Icon className="h-4 w-4 shrink-0" />
                                        <span className="flex-1">{link.label}</span>
                                    </Link>
                                );
                            })}
                        </nav>
                    </section>

                    <section className="mt-5 space-y-2">
                        <div className={sectionLabelClass}>设置</div>

                        <div className={cn(panelClass, 'overflow-hidden')}>
                            <div className="flex items-center justify-between gap-3 px-3 py-3">
                                <div className="min-w-0">
                                    <div className="flex items-center gap-2 text-sm font-medium text-foreground">
                                        <MoonStar className="h-4 w-4 text-muted-foreground" />
                                        <span>主题外观</span>
                                    </div>
                                    <p className="mt-0.5 text-xs leading-5 text-muted-foreground">
                                        切换浅色或深色模式
                                    </p>
                                </div>
                                <div className="shrink-0">
                                    <ThemeToggle />
                                </div>
                            </div>

                            <div className="border-t border-border px-3 py-3">
                                <div className="flex items-center gap-2 text-sm font-medium text-foreground">
                                    <Smartphone className="h-4 w-4 text-muted-foreground" />
                                    <span>设备能力</span>
                                </div>
                                <p className="mt-0.5 text-xs leading-5 text-muted-foreground">
                                    可安装到桌面，也可以开启消息提醒。
                                </p>

                                <PwaActions
                                    onAction={() => setOpen(false)}
                                    className="mt-3 flex-col gap-1.5 [&>button]:min-h-10 [&>button]:w-full [&>button]:justify-start [&>button]:rounded-lg [&>button]:border [&>button]:border-border [&>button]:bg-background [&>button]:px-3 [&>button]:font-medium [&>button]:text-foreground [&>button]:hover:bg-interactive-hover [&>button]:hover:text-interactive-hover-foreground"
                                />
                            </div>
                        </div>
                    </section>
                </div>
            </SheetContent>
        </Sheet>
    );
}
