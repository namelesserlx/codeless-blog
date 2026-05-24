import { MetadataRoute } from 'next';

export default function manifest(): MetadataRoute.Manifest {
    return {
        name: "CodeLess's Blog",
        short_name: 'CodeLess Blog',
        description: '以代码为笔，记录技术人生',
        start_url: '/',
        display: 'standalone',
        background_color: '#ffffff',
        theme_color: '#000000',
        categories: ['blog', 'technology', 'coding'],
        lang: 'zh-CN',
        orientation: 'portrait',
        scope: '/',
        icons: [
            {
                src: '/pwa-192.png',
                sizes: '192x192',
                type: 'image/png',
                purpose: 'any',
            },
            {
                src: '/pwa-384.png',
                sizes: '384x384',
                type: 'image/png',
                purpose: 'any',
            },
            {
                src: '/pwa-512.png',
                sizes: '512x512',
                type: 'image/png',
                purpose: 'any',
            },
            {
                src: '/mac-icon-1024.png',
                sizes: '1024x1024',
                type: 'image/png',
                purpose: 'any',
            },
            {
                src: '/maskable-512.png',
                sizes: '512x512',
                type: 'image/png',
                purpose: 'maskable',
            },
        ],
        shortcuts: [
            {
                name: '文章',
                short_name: 'Articles',
                description: '浏览所有文章',
                url: '/articles',
                icons: [{ src: '/pwa-192.png', sizes: '192x192', type: 'image/png' }],
            },
            {
                name: '代码片段',
                short_name: 'Snippets',
                description: '浏览代码片段',
                url: '/snippets',
                icons: [{ src: '/pwa-192.png', sizes: '192x192', type: 'image/png' }],
            },
            {
                name: '标签',
                short_name: 'Tags',
                description: '浏览标签',
                url: '/tags',
                icons: [{ src: '/pwa-192.png', sizes: '192x192', type: 'image/png' }],
            },
        ],
    };
}
