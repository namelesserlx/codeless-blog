'use client';

import { createContext, useContext, useState, useEffect, useCallback, ReactNode } from 'react';

/**
 * PWA 相关状态和方法的类型定义
 */
interface PwaContextType {
    /** 是否可安装 PWA */
    isInstallable: boolean;
    /** 是否已安装 PWA */
    isInstalled: boolean;
    /** 是否已挂载到客户端 */
    isMounted: boolean;
    /** 安装 PWA */
    handleInstall: () => Promise<void>;
}

const PwaContext = createContext<PwaContextType | undefined>(undefined);

interface PwaProviderProps {
    children: ReactNode;
}

interface BeforeInstallPromptEvent extends Event {
    prompt: () => Promise<void>;
    userChoice: Promise<{ outcome: 'accepted' | 'dismissed'; platform: string }>;
}

interface NavigatorWithStandalone extends Navigator {
    standalone?: boolean;
}

/**
 * PWA Provider 组件
 * 提供 PWA 安装相关的全局状态
 */
export function PwaProvider({ children }: PwaProviderProps) {
    const [isInstallable, setIsInstallable] = useState(false);
    const [isInstalled, setIsInstalled] = useState(false);
    const [deferredPrompt, setDeferredPrompt] = useState<BeforeInstallPromptEvent | null>(null);
    const [isMounted, setIsMounted] = useState(false);

    useEffect(() => {
        // 标记组件已挂载到客户端
        setIsMounted(true);

        // 检测是否已安装 PWA
        const standalone =
            window.matchMedia('(display-mode: standalone)').matches ||
            (window.navigator as NavigatorWithStandalone).standalone === true;
        setIsInstalled(standalone);

        // 监听 beforeinstallprompt 事件
        const handleBeforeInstallPrompt = (e: Event) => {
            const installPromptEvent = e as BeforeInstallPromptEvent;
            installPromptEvent.preventDefault();
            setDeferredPrompt(installPromptEvent);
            setIsInstallable(true);
        };

        window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt);

        return () => {
            window.removeEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
        };
    }, []);

    /**
     * 处理 PWA 安装
     */
    const handleInstall = useCallback(async () => {
        if (!deferredPrompt) return;

        deferredPrompt.prompt();
        const { outcome } = await deferredPrompt.userChoice;

        if (outcome === 'accepted') {
            setIsInstallable(false);
            setIsInstalled(true);
        }

        setDeferredPrompt(null);
    }, [deferredPrompt]);

    const value: PwaContextType = {
        isInstallable,
        isInstalled,
        isMounted,
        handleInstall,
    };

    return <PwaContext.Provider value={value}>{children}</PwaContext.Provider>;
}

/**
 * 使用 PWA Context 的 Hook
 * @throws {Error} 如果不在 PwaProvider 内使用会抛出错误
 */
export function usePwa() {
    const context = useContext(PwaContext);
    if (context === undefined) {
        throw new Error('usePwa must be used within a PwaProvider');
    }
    return context;
}
