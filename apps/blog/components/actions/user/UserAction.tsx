'use client';

import { usePwa } from '@/app/_features/pwa/client/PwaProvider';
import { PWA_INSTALL_GUIDE_EVENT } from '@/app/_features/pwa/shared/constants';
import { isIOSDevice } from '@/app/_features/pwa/shared/device';
import { useAuth } from '@/context/auth-context';
import { LogOut, LogIn, User, ChevronDown, Settings, Download, UserCircle } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { UserAvatar } from '@/components/ui/avatar';
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuLabel,
    DropdownMenuSeparator,
    DropdownMenuTrigger,
} from '@/components/ui/DropdownMenu';
import { ThemeToggle } from '@/components/theme/ThemeToggle';

export function UserAction() {
    const { auth, handleLogout, handleOpenLoginDialog, handleOpenAdminSystem, hasAdminAccess } =
        useAuth();
    const router = useRouter();
    const { isInstalled, handleInstall } = usePwa();
    const isIOSClient = typeof navigator !== 'undefined' && isIOSDevice(navigator.userAgent);
    const handleOpenInstall = () => {
        if (isIOSClient) {
            window.dispatchEvent(new Event(PWA_INSTALL_GUIDE_EVENT));
            return;
        }

        void handleInstall();
    };
    const triggerClassName =
        'ml-2 flex cursor-pointer appearance-none items-center gap-2 rounded-lg border-0 bg-transparent px-3 py-2 outline-none transition-colors hover:bg-gray-100 focus:outline-none active:outline-none dark:hover:bg-gray-800 [&_*]:cursor-pointer';
    const displayName = auth?.user ? auth.user.nickname || auth.user.username : '';

    const handleOpenProfile = () => {
        router.push('/profile');
    };

    return (
        <>
            {auth?.user ? (
                <DropdownMenu modal={false}>
                    <DropdownMenuTrigger asChild>
                        <button type="button" className={triggerClassName}>
                            <UserAvatar src={auth.user.avatar} name={displayName} fallback="用" />
                            <span className="text-sm">{displayName}</span>
                            <ChevronDown className="h-4 w-4 text-foreground/60" />
                        </button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end" className="w-56 border-border/50 bg-popover">
                        <DropdownMenuLabel>我的账户</DropdownMenuLabel>
                        <DropdownMenuSeparator />
                        <DropdownMenuItem onClick={handleOpenProfile}>
                            <UserCircle className="mr-2 h-4 w-4" />
                            <span>个人中心</span>
                        </DropdownMenuItem>
                        {hasAdminAccess && (
                            <DropdownMenuItem onClick={handleOpenAdminSystem}>
                                <User className="mr-2 h-4 w-4" />
                                <span>管理后台</span>
                            </DropdownMenuItem>
                        )}
                        <div className="flex cursor-default items-center justify-between gap-2 rounded-sm px-2 py-1.5 text-sm transition-[background-color,color] outline-none select-none hover:bg-interactive-hover hover:text-interactive-hover-foreground">
                            <div className="flex items-center">
                                <Settings className="mr-2 h-4 w-4" />
                                <span>主题设置</span>
                            </div>
                            <ThemeToggle />
                        </div>
                        {!isInstalled && (
                            <DropdownMenuItem onClick={handleOpenInstall}>
                                <Download className="mr-2 h-4 w-4" />
                                <span>安装应用</span>
                            </DropdownMenuItem>
                        )}
                        <DropdownMenuSeparator />
                        <DropdownMenuItem
                            onClick={handleLogout}
                            className="text-red-600 dark:text-red-400"
                        >
                            <LogOut className="mr-2 h-4 w-4" />
                            <span>退出登录</span>
                        </DropdownMenuItem>
                    </DropdownMenuContent>
                </DropdownMenu>
            ) : (
                <DropdownMenu modal={false}>
                    <DropdownMenuTrigger asChild>
                        <button type="button" className={triggerClassName}>
                            <div className="flex h-8 w-8 items-center justify-center rounded-full bg-gray-200 dark:bg-gray-700">
                                <User className="h-4 w-4 text-foreground/60" />
                            </div>
                            <ChevronDown className="h-4 w-4 text-foreground/60" />
                        </button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end" className="w-56 border-border/50 bg-popover">
                        <DropdownMenuLabel>访客菜单</DropdownMenuLabel>
                        <DropdownMenuSeparator />
                        <DropdownMenuItem onClick={() => handleOpenLoginDialog(true)}>
                            <LogIn className="mr-2 h-4 w-4" />
                            <span>登录</span>
                        </DropdownMenuItem>
                        <DropdownMenuSeparator />
                        <div className="flex cursor-default items-center justify-between gap-2 rounded-sm px-2 py-1.5 text-sm transition-[background-color,color] outline-none select-none hover:bg-interactive-hover hover:text-interactive-hover-foreground">
                            <div className="flex items-center">
                                <Settings className="mr-2 h-4 w-4" />
                                <span>主题设置</span>
                            </div>
                            <ThemeToggle />
                        </div>
                        {!isInstalled && (
                            <DropdownMenuItem onClick={handleOpenInstall}>
                                <Download className="mr-2 h-4 w-4" />
                                <span>安装应用</span>
                            </DropdownMenuItem>
                        )}
                    </DropdownMenuContent>
                </DropdownMenu>
            )}
        </>
    );
}
