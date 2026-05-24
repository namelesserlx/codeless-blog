'use client';

import { useEffect } from 'react';
import {
    ThemeProvider as NextThemesProvider,
    useTheme,
    type ThemeProviderProps,
} from 'next-themes';

function ThemeRootSync() {
    const { resolvedTheme } = useTheme();

    useEffect(() => {
        if (resolvedTheme !== 'light' && resolvedTheme !== 'dark') {
            return;
        }

        const root = document.documentElement;
        root.setAttribute('data-theme', resolvedTheme);
        root.style.colorScheme = resolvedTheme;
    }, [resolvedTheme]);

    return null;
}

export function ThemeProvider({ children, ...props }: ThemeProviderProps) {
    return (
        <NextThemesProvider {...props}>
            <ThemeRootSync />
            {children}
        </NextThemesProvider>
    );
}
