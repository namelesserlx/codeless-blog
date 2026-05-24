import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { loadWorkspaceEnv, resolveAppEnv } from '@blog/shared/env';
// import { reactRouter } from '@react-router/dev/vite';
import path from 'path';

const currentAppEnv = resolveAppEnv();

loadWorkspaceEnv({
    appDir: __dirname,
    appEnv: currentAppEnv,
});

function requiredEnv(key: string) {
    const value = process.env[key]?.trim();

    if (!value) {
        throw new Error(`缺少 ${key} 环境变量配置`);
    }

    return value;
}

const browserEnv = {
    BLOG_PUBLIC_URL: requiredEnv('BLOG_PUBLIC_URL'),
    ADMIN_PUBLIC_URL: requiredEnv('ADMIN_PUBLIC_URL'),
    API_PUBLIC_URL: requiredEnv('API_PUBLIC_URL'),
};

// https://vitejs.dev/config/
export default defineConfig({
    plugins: [react()],
    define: {
        'import.meta.env.BLOG_PUBLIC_URL': JSON.stringify(browserEnv.BLOG_PUBLIC_URL),
        'import.meta.env.ADMIN_PUBLIC_URL': JSON.stringify(browserEnv.ADMIN_PUBLIC_URL),
        'import.meta.env.API_PUBLIC_URL': JSON.stringify(browserEnv.API_PUBLIC_URL),
    },
    resolve: {
        alias: {
            '@': path.resolve(__dirname, './src'),
            '@blog/shared': path.resolve(__dirname, '../../../packages/shared/src'),
        },
        dedupe: ['react', 'react-dom'],
    },
    optimizeDeps: {
        include: ['react', 'react-dom'],
    },
    build: {
        rollupOptions: {
            output: {
                entryFileNames: 'assets/js/[name]-[hash].js',
                chunkFileNames: 'assets/js/[name]-[hash].js',
                assetFileNames: (assetInfo) => {
                    const name = assetInfo.names?.[0] ?? '';
                    if (/\.(css|less|scss|sass)$/.test(name)) {
                        return 'assets/css/[name]-[hash][extname]';
                    }
                    if (/\.(png|jpe?g|gif|svg|ico|webp|avif)$/i.test(name)) {
                        return 'assets/images/[name]-[hash][extname]';
                    }
                    if (/\.(woff2?|eot|ttf|otf)$/i.test(name)) {
                        return 'assets/fonts/[name]-[hash][extname]';
                    }
                    return 'assets/[name]-[hash][extname]';
                },
            },
        },
    },
    css: {
        preprocessorOptions: {
            less: {
                javascriptEnabled: true,
            },
        },
    },
    server: {
        proxy: {
            '/api': {
                target: 'http://localhost:8000',
                changeOrigin: true,
            },
        },
        allowedHosts: true,
    },
});
