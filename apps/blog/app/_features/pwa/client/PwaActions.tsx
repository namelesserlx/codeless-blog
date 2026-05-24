'use client';

import type { PointerEvent } from 'react';
import { Download, Share } from 'lucide-react';
import { usePwa } from '@/app/_features/pwa/client/PwaProvider';
import { PWA_INSTALL_GUIDE_EVENT } from '@/app/_features/pwa/shared/constants';
import { isIOSDevice } from '@/app/_features/pwa/shared/device';
import { cn } from '@/lib/shared/utils';

interface PwaActionsProps {
    className?: string;
    onAction?: () => void;
}

/**
 * PWA 操作按钮组件
 * 提供安装入口和 iOS 安装指引
 */
export function PwaActions({ className = '', onAction }: PwaActionsProps) {
    const { isInstallable, isInstalled, isMounted, handleInstall } = usePwa();

    if (isInstalled) {
        return null;
    }

    const buttonClass =
        'text-foreground/80 hover:text-primary flex min-h-9 items-center gap-2 rounded-lg px-2.5 py-2 text-sm transition-colors appearance-none outline-none [-webkit-tap-highlight-color:transparent] touch-manipulation';
    const iconClass = 'h-4 w-4 shrink-0';
    const iosIconClass = 'h-[1.05rem] w-[1.05rem] shrink-0';
    const isIOSClient =
        isMounted && typeof navigator !== 'undefined' && isIOSDevice(navigator.userAgent);
    const runAfterParentClose = (callback: () => void) => {
        onAction?.();

        if (onAction) {
            window.setTimeout(callback, 180);
            return;
        }

        callback();
    };
    const clearTapFocus = (event: PointerEvent<HTMLButtonElement>) => {
        event.currentTarget.blur();
    };

    return (
        <div className={cn('flex items-center gap-2', className)}>
            {/* 安装按钮 - 仅在可安装且未安装时显示 */}
            {isInstallable && !isInstalled && (
                <button
                    type="button"
                    onPointerUp={clearTapFocus}
                    onClick={() => {
                        runAfterParentClose(() => {
                            void handleInstall();
                        });
                    }}
                    className={buttonClass}
                    aria-label="安装应用"
                    title="安装到设备"
                >
                    <Download className={iconClass} />
                    <span>安装</span>
                </button>
            )}

            {/* iOS设备的安装提示 */}
            {isIOSClient && !isInstalled && (
                <button
                    type="button"
                    onPointerUp={clearTapFocus}
                    onClick={() => {
                        runAfterParentClose(() => {
                            window.dispatchEvent(new Event(PWA_INSTALL_GUIDE_EVENT));
                        });
                    }}
                    className={buttonClass}
                    aria-label="安装指南"
                    title="查看iOS安装指南"
                >
                    <Share className={iosIconClass} />
                    <span>安装</span>
                </button>
            )}
        </div>
    );
}
