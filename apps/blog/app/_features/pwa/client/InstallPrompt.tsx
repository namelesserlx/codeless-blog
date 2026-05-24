'use client';

import Image from 'next/image';
import { useEffect, useState } from 'react';
import { Download, Share, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Sheet, SheetContent, SheetDescription, SheetTitle } from '@/components/ui/sheet';
import { PWA_INSTALL_GUIDE_EVENT } from '@/app/_features/pwa/shared/constants';
import { isIOSDevice } from '@/app/_features/pwa/shared/device';

const DISMISS_STORAGE_KEY = 'pwa-install-dismissed';
const DISMISS_WINDOW_MS = 24 * 60 * 60 * 1000;

const iosSteps = ['点底部分享', '选“添加到主屏幕”', '确认后从桌面打开'];
type NavigatorWithStandalone = Navigator & {
    standalone?: boolean;
};

export function InstallPrompt() {
    const [showInstallPrompt, setShowInstallPrompt] = useState(false);
    const [isIOS, setIsIOS] = useState(false);
    const [isStandalone, setIsStandalone] = useState(false);

    useEffect(() => {
        const dismissedAt = localStorage.getItem(DISMISS_STORAGE_KEY);
        let wasDismissedRecently = false;

        if (dismissedAt) {
            const dismissedTime = parseInt(dismissedAt, 10);
            if (!Number.isNaN(dismissedTime) && Date.now() - dismissedTime < DISMISS_WINDOW_MS) {
                wasDismissedRecently = true;
            }
        }

        const iOS = isIOSDevice(navigator.userAgent);
        setIsIOS(iOS);

        const standaloneNavigator = window.navigator as NavigatorWithStandalone;
        const standalone =
            window.matchMedia('(display-mode: standalone)').matches ||
            standaloneNavigator.standalone === true;
        setIsStandalone(standalone);

        if (standalone || !iOS) {
            return;
        }

        const handleOpenInstallGuide = () => {
            setShowInstallPrompt(true);
        };

        window.addEventListener(PWA_INSTALL_GUIDE_EVENT, handleOpenInstallGuide);

        let timer: ReturnType<typeof setTimeout> | undefined;

        if (!wasDismissedRecently) {
            timer = setTimeout(() => {
                setShowInstallPrompt(true);
            }, 3000);
        }

        return () => {
            if (timer) {
                clearTimeout(timer);
            }
            window.removeEventListener(PWA_INSTALL_GUIDE_EVENT, handleOpenInstallGuide);
        };
    }, []);

    const handleDismiss = () => {
        setShowInstallPrompt(false);
        localStorage.setItem(DISMISS_STORAGE_KEY, Date.now().toString());
    };

    if (!isIOS || isStandalone) {
        return null;
    }

    return (
        <Sheet
            open={showInstallPrompt}
            onOpenChange={(open) => {
                if (!open) {
                    handleDismiss();
                    return;
                }
                setShowInstallPrompt(true);
            }}
        >
            <SheetContent
                side="bottom"
                className="!inset-x-0 z-[80] border-0 bg-transparent p-0 shadow-none [&>button]:hidden"
            >
                <SheetTitle className="sr-only">安装应用</SheetTitle>
                <SheetDescription className="sr-only">
                    安装到主屏幕，在移动端获得更接近原生应用的体验。
                </SheetDescription>

                <div
                    className="mx-auto w-[calc(100vw-1rem)] max-w-[23rem] pb-[calc(env(safe-area-inset-bottom,0px)+0.75rem)]"
                    onClick={(event) => event.stopPropagation()}
                >
                    <div className="relative overflow-hidden rounded-[30px] border border-slate-200 bg-white p-5 text-slate-950 shadow-[0_28px_72px_-28px_rgba(15,23,42,0.28)] dark:border-white/10 dark:bg-[#0a1120] dark:text-white dark:shadow-[0_28px_72px_-28px_rgba(2,8,23,0.72)]">
                        <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_top_left,rgba(56,189,248,0.12),transparent_34%),linear-gradient(180deg,rgba(240,249,255,0.95)_0%,rgba(255,255,255,1)_38%,rgba(255,255,255,1)_100%)] dark:bg-[radial-gradient(circle_at_top_left,rgba(56,189,248,0.2),transparent_34%),radial-gradient(circle_at_bottom_right,rgba(59,130,246,0.18),transparent_30%),linear-gradient(145deg,#0f172a_0%,#09101e_55%,#0b1324_100%)]" />
                        <div className="pointer-events-none absolute inset-x-6 top-0 h-px bg-gradient-to-r from-transparent via-sky-400/70 to-transparent dark:via-sky-300/80" />

                        <button
                            type="button"
                            onClick={handleDismiss}
                            className="absolute top-4 right-4 z-10 inline-flex h-10 w-10 items-center justify-center rounded-full border border-slate-300 bg-white text-slate-600 shadow-sm transition-colors hover:border-slate-400 hover:text-slate-800 dark:border-white/12 dark:bg-white/8 dark:text-white/70 dark:hover:bg-white/12 dark:hover:text-white"
                            aria-label="关闭"
                        >
                            <X size={18} />
                        </button>

                        <div className="relative flex items-start gap-3 pr-12">
                            <div className="h-14 w-14 shrink-0 overflow-hidden rounded-[18px] bg-white shadow-[0_14px_28px_-18px_rgba(56,189,248,0.35)] dark:bg-white/10 dark:shadow-[0_14px_28px_-18px_rgba(56,189,248,0.45)]">
                                <div className="relative h-full w-full">
                                    <Image
                                        src="/apple-touch-icon.png"
                                        alt="CodeLess's Blog"
                                        width={56}
                                        height={56}
                                        className="h-full w-full object-cover"
                                    />
                                </div>
                            </div>

                            <div className="min-w-0 flex-1">
                                <div className="mb-2 flex flex-wrap items-center gap-2">
                                    <span className="inline-flex items-center gap-1 rounded-full bg-sky-100 px-2.5 py-1 text-[11px] font-semibold tracking-[0.14em] text-sky-800 uppercase dark:bg-sky-400/14 dark:text-sky-200">
                                        <Download size={12} />
                                        PWA
                                    </span>
                                    <span className="text-[11px] font-medium tracking-[0.12em] text-slate-500 uppercase dark:text-white/45">
                                        安装到主屏幕
                                    </span>
                                </div>

                                <h3 className="text-[1.3rem] leading-[1.15] font-semibold tracking-[-0.03em] text-slate-950 sm:text-[1.45rem] dark:text-white">
                                    把博客固定到桌面
                                </h3>
                                <p className="mt-1.5 text-[12px] leading-5 text-slate-500 dark:text-white/45">
                                    添加到主屏幕后，像 App 一样直接打开。
                                </p>
                            </div>
                        </div>

                        <div className="relative mt-4 space-y-2.5">
                            {iosSteps.map((step, index) => (
                                <div
                                    key={step}
                                    className="flex min-h-[3.25rem] items-center gap-3 rounded-[22px] border border-slate-200 bg-slate-50 px-4 py-3 dark:border-white/10 dark:bg-white/6"
                                >
                                    <span className="inline-flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-primary/10 text-sm font-bold text-primary">
                                        {index + 1}
                                    </span>
                                    <div className="flex min-w-0 flex-1 items-center justify-between gap-3 text-[14px] leading-6 text-slate-700 dark:text-white/86">
                                        {index === 0 ? (
                                            <>
                                                <span className="min-w-0 truncate">{step}</span>
                                                <span className="inline-flex shrink-0 items-center gap-1.5 rounded-full bg-sky-100 px-3 py-1 text-xs font-semibold text-sky-700 dark:bg-sky-400/14 dark:text-sky-200">
                                                    <Share className="h-[0.95rem] w-[0.95rem] shrink-0" />
                                                    分享
                                                </span>
                                            </>
                                        ) : (
                                            <span className="min-w-0 truncate">{step}</span>
                                        )}
                                    </div>
                                </div>
                            ))}

                            <Button
                                type="button"
                                onClick={handleDismiss}
                                className="mt-2 h-12 w-full rounded-[22px] text-[15px] font-semibold"
                            >
                                知道了
                            </Button>
                        </div>

                        <div className="relative mt-3 text-center text-[11px] leading-5 text-slate-400 dark:text-white/45">
                            关闭后 24 小时内不再提醒。
                        </div>
                    </div>
                </div>
            </SheetContent>
        </Sheet>
    );
}
