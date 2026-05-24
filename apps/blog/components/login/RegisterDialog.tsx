'use client';

import { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { toast } from 'sonner';
import {
    Mail,
    ShieldCheck,
    User2,
    LockKeyhole,
    Send,
    Timer,
    Eye,
    EyeOff,
    UserPlus,
    UserRoundPen,
} from 'lucide-react';
import { apiRequest } from '@/lib/client/api-client';
import type { ResponseData, RegisterRequest } from '@blog/shared';

interface RegisterDialogProps {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    onSwitchToLogin?: () => void;
}

type EmailCodeResponse = ResponseData<{ message: string; expiresIn: number }>;

export function RegisterDialog({ open, onOpenChange, onSwitchToLogin }: RegisterDialogProps) {
    const [loading, setLoading] = useState(false);
    const [countdown, setCountdown] = useState(0);
    const [showPassword, setShowPassword] = useState(false);
    const [showConfirmPassword, setShowConfirmPassword] = useState(false);
    const [registerForm, setRegisterForm] = useState<RegisterRequest>({
        username: '',
        nickname: '',
        email: '',
        password: '',
        confirmPassword: '',
        code: '',
    });
    const sendEmailCode = async () => {
        if (!registerForm.email) {
            toast.error('请输入邮箱地址');
            return;
        }

        if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(registerForm.email)) {
            toast.error('请输入有效的邮箱地址');
            return;
        }

        try {
            setLoading(true);
            const data = await apiRequest<EmailCodeResponse>({
                endpoint: '/api/auth/send-email-code',
                method: 'POST',
                data: { email: registerForm.email },
                options: { credentials: 'include' },
            });

            if (data.code === 0) {
                toast.success(data.data.message);
                setCountdown(60);

                // 启动倒计时
                const timer = setInterval(() => {
                    setCountdown((prev) => {
                        if (prev <= 1) {
                            clearInterval(timer);
                            return 0;
                        }
                        return prev - 1;
                    });
                }, 1000);
            } else {
                toast.error(data.message || '发送验证码失败');
            }
        } catch (err) {
            const message = err instanceof Error ? err.message : '发送验证码失败';
            toast.error(message);
        } finally {
            setLoading(false);
        }
    };

    const handleRegister = async (e: React.FormEvent) => {
        e.preventDefault();

        if (
            !registerForm.username ||
            !registerForm.nickname ||
            !registerForm.email ||
            !registerForm.password ||
            !registerForm.confirmPassword ||
            !registerForm.code
        ) {
            toast.error('请填写完整信息');
            return;
        }

        if (registerForm.password !== registerForm.confirmPassword) {
            toast.error('两次输入的密码不一致');
            return;
        }

        if (registerForm.password.length < 6) {
            toast.error('密码长度至少6位');
            return;
        }

        try {
            setLoading(true);
            const data = await apiRequest<ResponseData<unknown>>({
                endpoint: '/api/auth/register',
                method: 'POST',
                data: {
                    username: registerForm.username,
                    nickname: registerForm.nickname,
                    email: registerForm.email,
                    password: registerForm.password,
                    code: registerForm.code,
                },
                options: { credentials: 'include' },
            });

            if (data.code === 0) {
                toast.success('注册成功！请登录');
                onOpenChange(false);
                onSwitchToLogin?.();
            } else {
                toast.error(data.message || '注册失败');
            }
        } catch (err) {
            const message = err instanceof Error ? err.message : '注册失败';
            toast.error(message);
        } finally {
            setLoading(false);
        }
    };

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="sm:max-w-md">
                <DialogHeader className="space-y-3">
                    <DialogTitle className="flex items-center justify-center gap-3 text-xl font-bold">
                        <div className="flex h-10 w-10 items-center justify-center rounded-full bg-primary/10 text-primary">
                            <UserPlus className="h-6 w-6" />
                        </div>
                        <span className="bg-gradient-to-r from-gray-900 to-gray-600 bg-clip-text text-transparent dark:from-gray-100 dark:to-gray-400">
                            注册到CodeLess&apos;sBlog
                        </span>
                    </DialogTitle>
                </DialogHeader>

                <form onSubmit={handleRegister} className="space-y-4">
                    {/* 用户名 */}
                    <div className="space-y-2">
                        <label
                            htmlFor="register-username"
                            className="text-sm font-medium text-muted-foreground"
                        >
                            用户名
                        </label>
                        <div className="group relative">
                            <User2
                                className="pointer-events-none absolute top-1/2 left-3 -translate-y-1/2 text-muted-foreground/60 transition-colors group-focus-within:text-primary"
                                size={18}
                            />
                            <input
                                id="register-username"
                                name="username"
                                autoComplete="username"
                                className="h-11 w-full rounded-lg border border-input bg-background pr-4 pl-11 text-sm shadow-sm transition-all duration-200 outline-none focus:border-primary focus:ring-2 focus:ring-primary/20"
                                placeholder="请输入用户名"
                                value={registerForm.username}
                                onChange={(e) =>
                                    setRegisterForm((s) => ({ ...s, username: e.target.value }))
                                }
                            />
                        </div>
                    </div>
                    {/* 改为昵称 */}
                    <div className="space-y-2">
                        <label
                            htmlFor="register-nickname"
                            className="text-sm font-medium text-muted-foreground"
                        >
                            昵称
                        </label>
                        <div className="group relative">
                            <UserRoundPen
                                className="pointer-events-none absolute top-1/2 left-3 -translate-y-1/2 text-muted-foreground/60 transition-colors group-focus-within:text-primary"
                                size={18}
                            />

                            <input
                                id="register-nickname"
                                name="nickname"
                                autoComplete="nickname"
                                className="h-11 w-full rounded-lg border border-input bg-background pr-4 pl-11 text-sm shadow-sm transition-all duration-200 outline-none focus:border-primary focus:ring-2 focus:ring-primary/20"
                                placeholder="请输入昵称"
                                value={registerForm.nickname}
                                onChange={(e) =>
                                    setRegisterForm((s) => ({ ...s, nickname: e.target.value }))
                                }
                            />
                        </div>
                    </div>
                    {/* 邮箱 */}
                    <div className="space-y-2">
                        <label
                            htmlFor="register-email"
                            className="text-sm font-medium text-muted-foreground"
                        >
                            邮箱地址
                        </label>
                        <div className="group relative">
                            <Mail
                                className="pointer-events-none absolute top-1/2 left-3 -translate-y-1/2 text-muted-foreground/60 transition-colors group-focus-within:text-primary"
                                size={18}
                            />
                            <input
                                type="email"
                                id="register-email"
                                name="email"
                                autoComplete="email"
                                className="h-11 w-full rounded-lg border border-input bg-background pr-4 pl-11 text-sm shadow-sm transition-all duration-200 outline-none focus:border-primary focus:ring-2 focus:ring-primary/20"
                                placeholder="请输入邮箱地址"
                                value={registerForm.email}
                                onChange={(e) =>
                                    setRegisterForm((s) => ({ ...s, email: e.target.value }))
                                }
                            />
                        </div>
                    </div>

                    {/* 邮箱验证码 */}
                    <div className="space-y-2">
                        <label
                            htmlFor="register-email-code"
                            className="text-sm font-medium text-muted-foreground"
                        >
                            邮箱验证码
                        </label>
                        <div className="flex items-center gap-3">
                            <div className="group relative flex-1">
                                <ShieldCheck
                                    className="pointer-events-none absolute top-1/2 left-3 -translate-y-1/2 text-muted-foreground/60 transition-colors group-focus-within:text-primary"
                                    size={18}
                                />
                                <input
                                    id="register-email-code"
                                    name="emailCode"
                                    autoComplete="one-time-code"
                                    inputMode="numeric"
                                    className="h-11 w-full rounded-lg border border-input bg-background pr-4 pl-11 text-sm shadow-sm transition-all duration-200 outline-none focus:border-primary focus:ring-2 focus:ring-primary/20"
                                    placeholder="请输入6位验证码"
                                    value={registerForm.code}
                                    maxLength={6}
                                    onChange={(e) =>
                                        setRegisterForm((s) => ({
                                            ...s,
                                            code: e.target.value,
                                        }))
                                    }
                                />
                            </div>
                            <Button
                                type="button"
                                variant="outline"
                                onClick={sendEmailCode}
                                disabled={countdown > 0 || loading}
                                className="h-11 w-24 text-xs"
                            >
                                {countdown > 0 ? (
                                    <div className="flex items-center gap-1">
                                        <Timer size={14} />
                                        {countdown}s
                                    </div>
                                ) : (
                                    <div className="flex items-center gap-1">
                                        <Send size={14} />
                                        发送
                                    </div>
                                )}
                            </Button>
                        </div>
                    </div>

                    {/* 密码 */}
                    <div className="space-y-2">
                        <label
                            htmlFor="register-password"
                            className="text-sm font-medium text-muted-foreground"
                        >
                            密码
                        </label>
                        <div className="group relative">
                            <LockKeyhole
                                className="pointer-events-none absolute top-1/2 left-3 -translate-y-1/2 text-muted-foreground/60 transition-colors group-focus-within:text-primary"
                                size={18}
                            />
                            <input
                                type={showPassword ? 'text' : 'password'}
                                id="register-password"
                                name="password"
                                autoComplete="new-password"
                                className="h-11 w-full rounded-lg border border-input bg-background pr-12 pl-11 text-sm shadow-sm transition-all duration-200 outline-none focus:border-primary focus:ring-2 focus:ring-primary/20"
                                placeholder="请输入密码（至少6位）"
                                value={registerForm.password}
                                onChange={(e) =>
                                    setRegisterForm((s) => ({ ...s, password: e.target.value }))
                                }
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
                        <label
                            htmlFor="register-confirm-password"
                            className="text-sm font-medium text-muted-foreground"
                        >
                            确认密码
                        </label>
                        <div className="group relative">
                            <LockKeyhole
                                className="pointer-events-none absolute top-1/2 left-3 -translate-y-1/2 text-muted-foreground/60 transition-colors group-focus-within:text-primary"
                                size={18}
                            />
                            <input
                                type={showConfirmPassword ? 'text' : 'password'}
                                id="register-confirm-password"
                                name="confirmPassword"
                                autoComplete="new-password"
                                className="h-11 w-full rounded-lg border border-input bg-background pr-12 pl-11 text-sm shadow-sm transition-all duration-200 outline-none focus:border-primary focus:ring-2 focus:ring-primary/20"
                                placeholder="请再次输入密码"
                                value={registerForm.confirmPassword}
                                onChange={(e) =>
                                    setRegisterForm((s) => ({
                                        ...s,
                                        confirmPassword: e.target.value,
                                    }))
                                }
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

                    <Button
                        type="submit"
                        className="mt-6 h-11 w-full text-base hover:bg-primary/70"
                        disabled={loading}
                    >
                        {loading ? '注册中...' : '注册'}
                    </Button>
                </form>

                {/* 登录入口 */}
                <div className="mt-4 text-center">
                    <span className="text-sm text-muted-foreground">
                        已有账户？
                        <button
                            type="button"
                            className="ml-1 text-primary transition-colors hover:text-primary/80"
                            onClick={() => {
                                onOpenChange(false);
                                onSwitchToLogin?.();
                            }}
                        >
                            立即登录
                        </button>
                    </span>
                </div>
            </DialogContent>
        </Dialog>
    );
}
