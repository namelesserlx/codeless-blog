'use client';

import { useEffect, useState } from 'react';
import dynamic from 'next/dynamic';

const ScrollToTop = dynamic(
    () => import('@/app/_components/ScrollToTop').then((module) => module.ScrollToTop),
    { ssr: false },
);
const Toaster = dynamic(() => import('@/components/ui/sonner').then((module) => module.Toaster), {
    ssr: false,
});
const InstallPrompt = dynamic(
    () => import('@/app/_features/pwa/client/InstallPrompt').then((module) => module.InstallPrompt),
    {
        ssr: false,
    },
);

export function LayoutClientEffects() {
    const [showDeferredPwaUi, setShowDeferredPwaUi] = useState(false);

    useEffect(() => {
        let cancelled = false;

        const revealPwaUi = () => {
            if (!cancelled) {
                setShowDeferredPwaUi(true);
            }
        };

        if (typeof requestIdleCallback === 'function') {
            const idleId = requestIdleCallback(revealPwaUi, { timeout: 2500 });

            return () => {
                cancelled = true;
                cancelIdleCallback(idleId);
            };
        }

        const timer = setTimeout(revealPwaUi, 1500);

        return () => {
            cancelled = true;
            clearTimeout(timer);
        };
    }, []);

    return (
        <>
            <ScrollToTop />
            <Toaster />
            {showDeferredPwaUi ? (
                <>
                    <InstallPrompt />
                </>
            ) : null}
        </>
    );
}
