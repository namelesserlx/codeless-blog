'use client';

import { Suspense } from 'react';
import { useEffect, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { toast } from 'sonner';
import { apiRequest } from '@/lib/client/api-client';
import { useAuth } from '@/context/auth-context';
import type { ResponseData, LoginResponse } from '@blog/shared';

// 分离出使用 useSearchParams 的组件
function AuthCallbackHandler() {
    const router = useRouter();
    const searchParams = useSearchParams();
    const { handleLogin } = useAuth();
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        const handleCallback = async () => {
            try {
                const code = searchParams.get('code');
                const stateParam = searchParams.get('state');
                console.log('state', stateParam);

                let state: { source?: string } = {};
                if (stateParam) {
                    try {
                        state = JSON.parse(stateParam);
                    } catch (parseError) {
                        console.error('解析state参数失败:', parseError);
                        throw new Error('无效的状态参数');
                    }
                }

                const { source } = state;

                if (!code) {
                    throw new Error('未获取到授权码');
                }

                if (!source || !['github', 'google'].includes(source)) {
                    throw new Error('不支持的授权来源');
                }

                // 根据不同的授权来源调用对应的API
                let result: ResponseData<LoginResponse>;

                if (source === 'github') {
                    result = await apiRequest<ResponseData<LoginResponse>>({
                        endpoint: '/api/oauth/github/login',
                        method: 'POST',
                        data: { code, source: 'next' },
                    });
                } else {
                    result = await apiRequest<ResponseData<LoginResponse>>({
                        endpoint: '/api/oauth/google/login',
                        method: 'POST',
                        data: { code, source: 'next' },
                    });
                }

                if (result.code !== 0 || !result.data) {
                    throw new Error(result.message || '登录失败');
                }

                // 登录成功，更新认证状态
                handleLogin(result.data);

                toast.success(`${source === 'github' ? 'GitHub' : 'Google'} 登录成功`);

                // 跳转到首页
                router.replace('/');
            } catch (err) {
                console.error('OAuth 回调处理失败:', err);
                const message = err instanceof Error ? err.message : '登录失败';
                setError(message);
                toast.error(message);

                // 3秒后跳转到首页
                setTimeout(() => {
                    router.replace('/');
                }, 3000);
            } finally {
                setLoading(false);
            }
        };

        handleCallback();
    }, [searchParams, router, handleLogin]);

    if (loading) {
        return (
            <div className="flex min-h-screen items-center justify-center">
                <div className="space-y-4 text-center">
                    <div className="mx-auto h-12 w-12 animate-spin rounded-full border-b-2 border-primary"></div>
                    <p className="text-muted-foreground">正在处理登录...</p>
                </div>
            </div>
        );
    }

    if (error) {
        return (
            <div className="flex min-h-screen items-center justify-center">
                <div className="max-w-md space-y-4 text-center">
                    <div className="text-6xl text-red-500">⚠️</div>
                    <h1 className="text-2xl font-bold text-foreground">登录失败</h1>
                    <p className="text-muted-foreground">{error}</p>
                    <p className="text-sm text-muted-foreground">将在3秒后自动跳转到首页...</p>
                </div>
            </div>
        );
    }

    return (
        <div className="flex min-h-screen items-center justify-center">
            <div className="space-y-4 text-center">
                <div className="text-6xl text-green-500">✅</div>
                <h1 className="text-2xl font-bold text-foreground">登录成功</h1>
                <p className="text-muted-foreground">正在跳转...</p>
            </div>
        </div>
    );
}

// Suspense fallback 组件
function AuthCallbackFallback() {
    return (
        <div className="flex min-h-screen items-center justify-center">
            <div className="space-y-4 text-center">
                <div className="mx-auto h-12 w-12 animate-spin rounded-full border-b-2 border-primary"></div>
                <p className="text-muted-foreground">正在初始化登录处理...</p>
            </div>
        </div>
    );
}

// 主组件，用 Suspense 包装使用 useSearchParams 的组件
export default function AuthCallbackPage() {
    return (
        <Suspense fallback={<AuthCallbackFallback />}>
            <AuthCallbackHandler />
        </Suspense>
    );
}
