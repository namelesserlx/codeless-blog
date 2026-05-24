'use client';

import { Suspense } from 'react';
import { useEffect, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { toast } from 'sonner';
import { apiRequest } from '@/lib/client/api-client';
import { Eye, EyeOff, LockKeyhole, CheckCircle } from 'lucide-react';
import type { ResponseData } from '@blog/shared';

interface ResetPasswordFormData {
    newPassword: string;
    confirmPassword: string;
}

interface TokenVerificationData {
    email: string;
    userId: number;
}

// 分离出使用 useSearchParams 的组件
function ResetPasswordHandler() {
    const router = useRouter();
    const searchParams = useSearchParams();
    const [loading, setLoading] = useState(false);
    const [verifying, setVerifying] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [success, setSuccess] = useState(false);
    const [showPassword, setShowPassword] = useState(false);
    const [showConfirmPassword, setShowConfirmPassword] = useState(false);
    const [tokenData, setTokenData] = useState<TokenVerificationData | null>(null);
    const [formData, setFormData] = useState<ResetPasswordFormData>({
        newPassword: '',
        confirmPassword: '',
    });

    const token = searchParams.get('token');

    useEffect(() => {
        const verifyToken = async () => {
            if (!token) {
                setError('缺少重置令牌，请检查邮件中的链接');
                setVerifying(false);
                return;
            }

            try {
                const result = await apiRequest<ResponseData<TokenVerificationData>>({
                    endpoint: '/api/auth/verify-reset-token',
                    method: 'POST',
                    data: { token },
                });

                if (result.code !== 0 || !result.data) {
                    throw new Error(result.message || '令牌验证失败');
                }

                setTokenData(result.data);
            } catch (err) {
                const message = err instanceof Error ? err.message : '令牌验证失败';
                setError(message);
                toast.error(message);
            } finally {
                setVerifying(false);
            }
        };

        verifyToken();
    }, [token]);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();

        if (!token || !tokenData) {
            toast.error('重置令牌无效');
            return;
        }

        // 验证表单
        if (!formData.newPassword || !formData.confirmPassword) {
            toast.error('请填写完整信息');
            return;
        }

        if (formData.newPassword.length < 6) {
            toast.error('密码长度不能小于6位');
            return;
        }

        if (formData.newPassword !== formData.confirmPassword) {
            toast.error('两次输入的密码不一致');
            return;
        }

        setLoading(true);

        try {
            const result = await apiRequest<ResponseData<string>>({
                endpoint: '/api/auth/reset-password',
                method: 'POST',
                data: {
                    token,
                    newPassword: formData.newPassword,
                },
            });

            if (result.code !== 0) {
                throw new Error(result.message || '密码重置失败');
            }

            setSuccess(true);
            toast.success('密码重置成功！即将跳转到首页...');

            // 3秒后跳转到首页
            setTimeout(() => {
                router.replace('/');
            }, 3000);
        } catch (err) {
            const message = err instanceof Error ? err.message : '密码重置失败';
            toast.error(message);
        } finally {
            setLoading(false);
        }
    };

    const handleInputChange = (field: keyof ResetPasswordFormData, value: string) => {
        setFormData((prev) => ({ ...prev, [field]: value }));
    };

    if (verifying) {
        return (
            <div className="flex h-full items-center justify-center bg-gradient-to-br">
                <div className="w-full max-w-md space-y-6 rounded-2xl bg-white p-8 shadow-xl dark:bg-gray-800 dark:shadow-2xl dark:ring-1 dark:shadow-black/50 dark:ring-gray-700/50">
                    <div className="space-y-4 text-center">
                        <div className="mx-auto h-12 w-12 animate-spin rounded-full border-b-2 border-primary"></div>
                        <p className="text-muted-foreground">正在验证重置令牌...</p>
                    </div>
                </div>
            </div>
        );
    }

    if (error) {
        return (
            <div className="flex h-full items-center justify-center bg-gradient-to-br">
                <div className="w-full max-w-md space-y-6 rounded-2xl bg-white p-8 shadow-xl dark:bg-gray-800 dark:shadow-2xl dark:ring-1 dark:shadow-black/50 dark:ring-gray-700/50">
                    <div className="space-y-4 text-center">
                        <div className="text-6xl text-red-500">⚠️</div>
                        <h1 className="text-2xl font-bold text-foreground">令牌验证失败</h1>
                        <p className="text-muted-foreground">{error}</p>
                        <button
                            onClick={() => router.replace('/')}
                            className="rounded-lg bg-primary px-6 py-2 text-white transition-colors hover:bg-primary/90"
                        >
                            返回首页
                        </button>
                    </div>
                </div>
            </div>
        );
    }

    if (success) {
        return (
            <div className="flex h-full items-center justify-center bg-gradient-to-br">
                <div className="w-full max-w-md space-y-6 rounded-2xl bg-white p-8 shadow-xl dark:bg-gray-800 dark:shadow-2xl dark:ring-1 dark:shadow-black/50 dark:ring-gray-700/50">
                    <div className="space-y-4 text-center">
                        <CheckCircle className="mx-auto h-16 w-16 text-green-500" />
                        <h1 className="text-2xl font-bold text-foreground">密码重置成功</h1>
                        <p className="text-muted-foreground">
                            您的密码已成功重置，请使用新密码登录
                        </p>
                        <p className="text-sm text-muted-foreground">将在3秒后自动跳转到首页...</p>
                    </div>
                </div>
            </div>
        );
    }

    return (
        <div className="flex h-full items-center justify-center bg-gradient-to-br">
            <div className="w-full max-w-md space-y-6 rounded-2xl bg-white p-8 shadow-xl dark:bg-gray-800 dark:shadow-2xl dark:ring-1 dark:shadow-black/50 dark:ring-gray-700/50">
                <div className="space-y-2 text-center">
                    <h1 className="text-2xl font-bold text-foreground">重置密码</h1>
                    <p className="text-muted-foreground">
                        为账号 <span className="font-medium">{tokenData?.email}</span> 设置新密码
                    </p>
                </div>

                <form onSubmit={handleSubmit} className="space-y-4">
                    {/* 新密码 */}
                    <div className="space-y-2">
                        <label className="text-sm font-medium text-muted-foreground">新密码</label>
                        <div className="group relative">
                            <LockKeyhole
                                className="pointer-events-none absolute top-1/2 left-3 -translate-y-1/2 text-muted-foreground/60 transition-colors group-focus-within:text-primary"
                                size={18}
                            />
                            <input
                                type={showPassword ? 'text' : 'password'}
                                className="h-11 w-full rounded-lg border border-input bg-background pr-12 pl-11 text-sm shadow-sm transition-all duration-200 outline-none focus:border-primary focus:ring-2 focus:ring-primary/20"
                                placeholder="请输入新密码（至少6位）"
                                value={formData.newPassword}
                                onChange={(e) => handleInputChange('newPassword', e.target.value)}
                                required
                            />
                            <button
                                type="button"
                                onClick={() => setShowPassword(!showPassword)}
                                className="absolute top-1/2 right-3 -translate-y-1/2 text-muted-foreground transition-colors hover:text-primary"
                                aria-label={showPassword ? '隐藏密码' : '显示密码'}
                            >
                                {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                            </button>
                        </div>
                    </div>

                    {/* 确认密码 */}
                    <div className="space-y-2">
                        <label className="text-sm font-medium text-muted-foreground">
                            确认新密码
                        </label>
                        <div className="group relative">
                            <LockKeyhole
                                className="pointer-events-none absolute top-1/2 left-3 -translate-y-1/2 text-muted-foreground/60 transition-colors group-focus-within:text-primary"
                                size={18}
                            />
                            <input
                                type={showConfirmPassword ? 'text' : 'password'}
                                className="h-11 w-full rounded-lg border border-input bg-background pr-12 pl-11 text-sm shadow-sm transition-all duration-200 outline-none focus:border-primary focus:ring-2 focus:ring-primary/20"
                                placeholder="请再次输入新密码"
                                value={formData.confirmPassword}
                                onChange={(e) =>
                                    handleInputChange('confirmPassword', e.target.value)
                                }
                                required
                            />
                            <button
                                type="button"
                                onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                                className="absolute top-1/2 right-3 -translate-y-1/2 text-muted-foreground transition-colors hover:text-primary"
                                aria-label={showConfirmPassword ? '隐藏密码' : '显示密码'}
                            >
                                {showConfirmPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                            </button>
                        </div>
                    </div>

                    {/* 密码提示 */}
                    <div className="space-y-1 text-xs text-muted-foreground">
                        <p className="flex items-center gap-2">
                            <span className="h-1.5 w-1.5 rounded-full bg-gray-400"></span>
                            密码长度至少6位
                        </p>
                        <p className="flex items-center gap-2">
                            <span className="h-1.5 w-1.5 rounded-full bg-gray-400"></span>
                            建议包含字母、数字和特殊字符
                        </p>
                    </div>

                    {/* 提交按钮 */}
                    <button
                        type="submit"
                        disabled={loading}
                        className="h-11 w-full rounded-lg bg-primary font-medium text-white transition-colors hover:bg-primary/90 disabled:cursor-not-allowed disabled:bg-primary/50"
                    >
                        {loading ? (
                            <div className="flex items-center justify-center gap-2">
                                <div className="h-4 w-4 animate-spin rounded-full border-b-2 border-white"></div>
                                重置中...
                            </div>
                        ) : (
                            '重置密码'
                        )}
                    </button>
                </form>

                <div className="text-center">
                    <button
                        type="button"
                        onClick={() => router.replace('/')}
                        className="text-sm text-muted-foreground transition-colors hover:text-foreground"
                    >
                        返回首页
                    </button>
                </div>
            </div>
        </div>
    );
}

// Suspense fallback 组件
function ResetPasswordFallback() {
    return (
        <div className="flex h-full items-center justify-center bg-gradient-to-br">
            <div className="w-full max-w-md space-y-6 rounded-2xl bg-white p-8 shadow-xl dark:bg-gray-800 dark:shadow-2xl dark:ring-1 dark:shadow-black/50 dark:ring-gray-700/50">
                <div className="space-y-4 text-center">
                    <div className="mx-auto h-12 w-12 animate-spin rounded-full border-b-2 border-primary"></div>
                    <p className="text-muted-foreground">正在初始化重置页面...</p>
                </div>
            </div>
        </div>
    );
}

// 主组件，用 Suspense 包装使用 useSearchParams 的组件
export default function ResetPasswordPage() {
    return (
        <Suspense fallback={<ResetPasswordFallback />}>
            <ResetPasswordHandler />
        </Suspense>
    );
}
