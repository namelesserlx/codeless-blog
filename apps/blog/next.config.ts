import path from 'node:path';
import { networkInterfaces } from 'node:os';
import { loadWorkspaceEnv, resolveAppEnv } from '@blog/shared/env';
import type { NextConfig } from 'next';

const appDir = process.cwd();
const workspaceRoot = path.resolve(appDir, '../..');

function getAllowedDevOrigins() {
    const interfaces = networkInterfaces();
    const hosts = new Set<string>();

    for (const entries of Object.values(interfaces)) {
        for (const entry of entries ?? []) {
            if (entry.family === 'IPv4' && !entry.internal) {
                hosts.add(entry.address);
            }
        }
    }

    return [...hosts];
}

loadWorkspaceEnv({
    appDir,
    appEnv: resolveAppEnv(),
});

const nextConfig: NextConfig = {
    reactStrictMode: true,
    allowedDevOrigins: getAllowedDevOrigins(),
    env: {
        BLOG_PUBLIC_URL: process.env.BLOG_PUBLIC_URL,
        ADMIN_PUBLIC_URL: process.env.ADMIN_PUBLIC_URL,
        API_PUBLIC_URL: process.env.API_PUBLIC_URL,
        NEXT_PUBLIC_GITHUB_CLIENT_ID: process.env.NEXT_PUBLIC_GITHUB_CLIENT_ID,
        NEXT_PUBLIC_GOOGLE_CLIENT_ID: process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID,
    },
    output: 'standalone',
    outputFileTracingRoot: workspaceRoot,
    transpilePackages: ['@blog/db'],
    turbopack: {
        root: workspaceRoot,
    },
    images: {
        remotePatterns: [
            {
                protocol: 'https',
                hostname: 'www.example.com',
                port: '',
                pathname: '/**',
            },
            {
                protocol: 'https',
                hostname: 'images.unsplash.com',
                port: '',
                pathname: '/**',
            },
        ],
    },
    async headers() {
        return [
            {
                source: '/(.*)',
                headers: [
                    {
                        key: 'X-Content-Type-Options',
                        value: 'nosniff',
                    },
                    {
                        key: 'X-Frame-Options',
                        value: 'DENY',
                    },
                    {
                        key: 'Referrer-Policy',
                        value: 'strict-origin-when-cross-origin',
                    },
                ],
            },
        ];
    },
};

export default nextConfig;
