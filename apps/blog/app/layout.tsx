import './globals.css';
import type { Metadata, Viewport } from 'next';
import localFont from 'next/font/local';
import { Header } from '@/components/header';
import { ThemeProvider } from '@/app/_providers/ThemeProvider';
import { AuthProvider } from '@/context/auth-context';
import { PwaProvider } from '@/app/_features/pwa/client/PwaProvider';
import { Main } from '@/components/main';
import { Footer } from '@/components/footer';
import { LayoutClientEffects } from '@/components/layout/LayoutClientEffects';
import { getConfiguredSiteUrl } from '@/config/site-config';
// 使用本地字体替代Google字体，但只在特定元素使用
const ibmPlexSans = localFont({
    variable: '--font-ibm-plex-sans',
    display: 'swap',
    // 由于我们使用的是可变字体，只需引用主字体文件
    src: [
        {
            path: '../public/fonts/IBMPlexSans-VariableFont_wdth,wght.ttf',
            style: 'normal',
        },
        {
            path: '../public/fonts/IBMPlexSans-Italic-VariableFont_wdth,wght.ttf',
            style: 'italic',
        },
    ],
});

const configuredSiteUrl = getConfiguredSiteUrl();

export const metadata: Metadata = {
    title: "CodeLess's Blog",
    description: '以代码为笔，记录技术人生',
    metadataBase: new URL(configuredSiteUrl),
    manifest: '/manifest.webmanifest',
    robots: {
        index: true,
        follow: true,
        googleBot: {
            index: true,
            follow: true,
            'max-image-preview': 'large',
            'max-snippet': -1,
            'max-video-preview': -1,
        },
    },
    appleWebApp: {
        capable: true,
        statusBarStyle: 'default',
        title: "CodeLess's Blog",
    },
    icons: {
        icon: [{ url: '/favicon.ico', sizes: 'any' }],
        apple: [
            { url: '/apple-touch-icon.png', sizes: '180x180', type: 'image/png' },
            { url: '/apple-touch-167.png', sizes: '167x167', type: 'image/png' },
            { url: '/apple-touch-152.png', sizes: '152x152', type: 'image/png' },
        ],
    },
};

// Next.js 15 要求将 viewport 和 themeColor 从 metadata 中分离出来
export const viewport: Viewport = {
    width: 'device-width',
    initialScale: 1,
    maximumScale: 5,
    userScalable: true,
    themeColor: [
        { media: '(prefers-color-scheme: light)', color: '#ffffff' },
        { media: '(prefers-color-scheme: dark)', color: '#000000' },
    ],
};

// 导出字体变量以便在页面中使用
export { ibmPlexSans };

export default function RootLayout({ children }: { children: React.ReactNode }) {
    return (
        <html lang="zh-CN" className={ibmPlexSans.variable} suppressHydrationWarning>
            <body className="grid min-h-screen grid-rows-[auto_1fr_auto]">
                <ThemeProvider attribute="class" defaultTheme="system" enableSystem>
                    <AuthProvider>
                        <PwaProvider>
                            <Header />
                            <Main>{children}</Main>
                            <Footer />
                            <LayoutClientEffects />
                        </PwaProvider>
                    </AuthProvider>
                </ThemeProvider>
            </body>
        </html>
    );
}
