import { Logo } from '@/components/header/left/logo';
import { Navigation } from '@/components/header/center/navigation';
import { RightActions } from '@/components/header/right/RightActions';

export function Header() {
    return (
        <header className="sticky top-0 z-40 w-full border-b border-white/10 bg-gradient-to-b from-white/80 via-white/60 to-white/40 py-4 shadow-[0_8px_32px_0_rgba(31,38,135,0.37)] backdrop-blur-xl backdrop-saturate-150 transition-all duration-200 before:absolute before:inset-0 before:bg-gradient-to-r before:from-transparent before:via-white/10 before:to-transparent before:opacity-0 before:transition-opacity before:duration-500 hover:before:opacity-100 dark:border-white/5 dark:from-gray-900/80 dark:via-gray-900/60 dark:to-gray-900/40 dark:shadow-[0_8px_32px_0_rgba(0,0,0,0.5)]">
            <div className="relative z-1 mx-auto flex w-full items-center justify-between px-4 md:px-6 lg:px-8">
                {/* 左侧Logo区域 */}
                <div className="flex items-center">
                    <Logo />
                </div>

                {/* 中间导航区域 - 仅在中等屏幕及以上显示，绝对居中 */}
                <div className="absolute left-1/2 -translate-x-1/2">
                    <Navigation />
                </div>

                {/* 右侧功能区 - 按尺寸分类组织 */}
                <RightActions />
            </div>
        </header>
    );
}
