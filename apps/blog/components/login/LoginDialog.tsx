'use client';

import React, { useEffect, useMemo, useState, useContext } from 'react';
import Image from 'next/image';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Separator } from '@/components/ui/separator';
import { GitHubIcon as Github } from '@/components/icons/GitHubIcon';
import { toast } from 'sonner';
import {
    Mail,
    ShieldCheck,
    User2,
    LockKeyhole,
    Send,
    Timer,
    CheckCircle,
    ArrowLeft,
} from 'lucide-react';
import { apiRequest } from '@/lib/client/api-client';
import { oauthPublicConfig } from '@/config/services/oauth';
import type { ResponseData, LoginResponse } from '@blog/shared';
import { useAuth } from '@/context/auth-context';
import { RegisterDialog } from './RegisterDialog';

interface LoginContextValue {
    forgotPasswordOpen: boolean;
    registerDialogOpen: boolean;
    setForgotPasswordOpen: (open: boolean) => void;
    setRegisterDialogOpen: (open: boolean) => void;
    onOpenChange: (open: boolean) => void;
}

const noopBooleanSetter: (open: boolean) => void = () => undefined;

const LoginContext = React.createContext<LoginContextValue>({
    forgotPasswordOpen: false,
    registerDialogOpen: false,
    setForgotPasswordOpen: noopBooleanSetter,
    setRegisterDialogOpen: noopBooleanSetter,
    onOpenChange: noopBooleanSetter,
});

interface LoginDialogProps {
    open: boolean;
    onOpenChange: (open: boolean) => void;
}

type CaptchaResponse = ResponseData<string>;

type EmailCodeResponse = ResponseData<{ message: string; expiresIn: number }>;

type ForgotPasswordResponse = ResponseData<{ message: string; expiresIn: number }>;

interface AccountLoginForm {
    username: string;
    password: string;
    captcha: string;
}

interface EmailLoginForm {
    email: string;
    code: string;
}

type TabKey = 'account' | 'email';

interface LoginFormProps {
    open: boolean;
    activeTab: TabKey;
    loading: boolean;
    setLoading: (loading: boolean) => void;
    onOpenChange: (open: boolean) => void;
}

let captchaRequestPromise: Promise<CaptchaResponse> | null = null;

async function requestCaptcha() {
    if (!captchaRequestPromise) {
        captchaRequestPromise = apiRequest<CaptchaResponse>({
            endpoint: '/api/auth/captcha',
            method: 'GET',
            options: { credentials: 'include' },
        }).finally(() => {
            captchaRequestPromise = null;
        });
    }

    return captchaRequestPromise;
}

// 忘记密码对话框组件
function ForgotPasswordDialog() {
    const { forgotPasswordOpen, setForgotPasswordOpen, onOpenChange } = useContext(LoginContext);
    const [loading, setLoading] = useState(false);
    const [success, setSuccess] = useState(false);
    const [email, setEmail] = useState('');

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();

        if (!email) {
            toast.error('请输入邮箱地址');
            return;
        }

        if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
            toast.error('请输入有效的邮箱地址');
            return;
        }

        setLoading(true);

        try {
            const result = await apiRequest<ForgotPasswordResponse>({
                endpoint: '/api/auth/send-reset-email',
                method: 'POST',
                data: { email },
            });

            if (result.code !== 0) {
                throw new Error(result.message || '发送重置邮件失败');
            }

            setSuccess(true);
            toast.success(result.data.message);
        } catch (err) {
            const message = err instanceof Error ? err.message : '发送重置邮件失败';
            toast.error(message);
        } finally {
            setLoading(false);
        }
    };

    const handleClose = () => {
        setEmail('');
        setSuccess(false);
        setLoading(false);
        setForgotPasswordOpen(false);
        onOpenChange(true);
    };

    return (
        <Dialog open={forgotPasswordOpen} onOpenChange={handleClose}>
            <DialogContent className="sm:max-w-md">
                <DialogHeader className="space-y-3">
                    <DialogTitle className="flex items-center gap-3 text-xl font-bold">
                        <div className="flex h-10 w-10 items-center justify-center rounded-full bg-primary/10 text-primary">
                            <LockKeyhole className="h-6 w-6" />
                        </div>
                        <span className="bg-gradient-to-r from-gray-900 to-gray-600 bg-clip-text text-transparent dark:from-gray-100 dark:to-gray-400">
                            重置密码
                        </span>
                    </DialogTitle>
                </DialogHeader>

                {success ? (
                    <div className="space-y-6 py-4">
                        <div className="space-y-4 text-center">
                            <CheckCircle className="mx-auto h-16 w-16 text-green-500" />
                            <div className="space-y-2">
                                <h3 className="text-lg font-semibold text-foreground">
                                    邮件已发送
                                </h3>
                                <p className="text-sm text-muted-foreground">
                                    我们已向 <span className="font-medium">{email}</span>{' '}
                                    发送了密码重置邮件
                                </p>
                                <p className="text-xs text-muted-foreground">
                                    请检查您的邮箱并点击邮件中的链接来重置密码
                                </p>
                            </div>
                        </div>
                        <div className="space-y-3">
                            <Button onClick={handleClose} className="w-full">
                                知道了
                            </Button>
                            <div className="text-center">
                                <button
                                    type="button"
                                    onClick={() => setSuccess(false)}
                                    className="text-sm text-muted-foreground transition-colors hover:text-foreground"
                                >
                                    重新发送
                                </button>
                            </div>
                        </div>
                    </div>
                ) : (
                    <form onSubmit={handleSubmit} className="space-y-6">
                        <div className="space-y-4">
                            <p className="text-sm text-muted-foreground">
                                请输入您的邮箱地址，我们将向您发送密码重置链接
                            </p>
                            <div className="space-y-2">
                                <label
                                    htmlFor="forgot-password-email"
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
                                        id="forgot-password-email"
                                        name="email"
                                        autoComplete="email"
                                        className="h-11 w-full rounded-lg border border-input bg-background pr-4 pl-11 text-sm shadow-sm transition-all duration-200 outline-none focus:border-primary focus:ring-2 focus:ring-primary/20"
                                        placeholder="请输入注册时使用的邮箱"
                                        value={email}
                                        onChange={(e) => setEmail(e.target.value)}
                                        required
                                    />
                                </div>
                            </div>
                        </div>

                        <div className="space-y-3">
                            <Button type="submit" disabled={loading} className="w-full">
                                {loading ? (
                                    <div className="flex items-center justify-center gap-2">
                                        <div className="h-4 w-4 animate-spin rounded-full border-b-2 border-white"></div>
                                        发送中...
                                    </div>
                                ) : (
                                    '发送重置邮件'
                                )}
                            </Button>
                            <Button
                                type="button"
                                variant="outline"
                                onClick={handleClose}
                                className="w-full"
                            >
                                <ArrowLeft className="mr-2 h-4 w-4" />
                                返回登录
                            </Button>
                        </div>
                    </form>
                )}
            </DialogContent>
        </Dialog>
    );
}

// 注册和忘记密码组件
function RegisterAndForgotPassword({ onSwitchToRegister }: { onSwitchToRegister?: () => void }) {
    const { setForgotPasswordOpen, setRegisterDialogOpen, onOpenChange } = useContext(LoginContext);
    const handleForgotPassword = () => {
        setForgotPasswordOpen(true);
        onOpenChange(false);
    };

    const handleSwitchToRegister = () => {
        setRegisterDialogOpen(true);
        onSwitchToRegister?.();
    };

    return (
        <>
            <div className="mt-3 flex items-center justify-between text-sm">
                <button
                    type="button"
                    className="text-primary transition-colors hover:text-primary/80"
                    onClick={handleForgotPassword}
                >
                    忘记密码？
                </button>
                <button
                    type="button"
                    className="text-primary transition-colors hover:text-primary/80"
                    onClick={handleSwitchToRegister}
                >
                    还没有账号？立即注册
                </button>
            </div>
        </>
    );
}

// 账号密码登录
function AccountLoginForm({ open, activeTab, loading, setLoading, onOpenChange }: LoginFormProps) {
    const { handleLogin } = useAuth();
    const [captchaSvg, setCaptchaSvg] = useState<string>('');
    const [accountForm, setAccountForm] = useState<AccountLoginForm>({
        username: '',
        password: '',
        captcha: '',
    });

    const captchaUrl = useMemo(
        () =>
            captchaSvg
                ? URL.createObjectURL(new Blob([captchaSvg], { type: 'image/svg+xml' }))
                : '',
        [captchaSvg],
    );

    const resetAccountForm = () => {
        setCaptchaSvg('');
        setAccountForm({
            username: '',
            password: '',
            captcha: '',
        });
    };

    const fetchCaptcha = async (force = false) => {
        try {
            const data = force
                ? await apiRequest<CaptchaResponse>({
                      endpoint: '/api/auth/captcha',
                      method: 'GET',
                      options: { credentials: 'include' },
                  })
                : await requestCaptcha();

            if (data.code === 0) {
                setCaptchaSvg(data.data);
            } else {
                toast.error(data.message || '获取验证码失败');
            }
        } catch {
            toast.error('获取验证码失败');
        }
    };

    const handleAccountLogin = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!accountForm.username || !accountForm.password || !accountForm.captcha) {
            toast.error('请填写完整信息');
            return;
        }
        try {
            setLoading(true);
            const data = await apiRequest<ResponseData<LoginResponse>>({
                endpoint: '/api/auth/login',
                method: 'POST',
                data: accountForm,
                options: { credentials: 'include' },
            });
            if (data.code !== 0 || !data.data) {
                await fetchCaptcha(true);
                toast.error(data.message || '登录失败');
                return;
            }

            handleLogin(data.data);

            toast.success('登录成功');
            onOpenChange(false);
        } catch (err) {
            const message = err instanceof Error ? err.message : '登录失败';
            toast.error(message);
            await fetchCaptcha(true);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        if (open && activeTab === 'account' && !captchaSvg) {
            void fetchCaptcha();
        }
    }, [open, activeTab, captchaSvg]);

    useEffect(() => {
        if (!open) {
            resetAccountForm();
        }
    }, [open]);

    useEffect(() => {
        return () => {
            if (captchaUrl) {
                URL.revokeObjectURL(captchaUrl);
            }
        };
    }, [captchaUrl]);

    return (
        <form onSubmit={handleAccountLogin} className="mt-1.5 space-y-4">
            <div className="space-y-2">
                <label
                    htmlFor="account-username"
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
                        id="account-username"
                        name="username"
                        autoComplete="username"
                        className="h-11 w-full rounded-lg border border-input bg-background pr-4 pl-11 text-sm shadow-sm transition-all duration-200 outline-none focus:border-primary focus:ring-2 focus:ring-primary/20"
                        placeholder="请输入用户名"
                        value={accountForm.username}
                        onChange={(e) =>
                            setAccountForm((s) => ({ ...s, username: e.target.value }))
                        }
                    />
                </div>
            </div>
            <div className="space-y-2">
                <label
                    htmlFor="account-password"
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
                        type="password"
                        id="account-password"
                        name="password"
                        autoComplete="current-password"
                        className="h-11 w-full rounded-lg border border-input bg-background pr-4 pl-11 text-sm shadow-sm transition-all duration-200 outline-none focus:border-primary focus:ring-2 focus:ring-primary/20"
                        placeholder="请输入密码"
                        value={accountForm.password}
                        onChange={(e) =>
                            setAccountForm((s) => ({ ...s, password: e.target.value }))
                        }
                    />
                </div>
            </div>
            <div className="space-y-2">
                <label
                    htmlFor="account-captcha"
                    className="text-sm font-medium text-muted-foreground"
                >
                    验证码
                </label>
                <div className="flex items-center gap-3">
                    <div className="group relative flex-1">
                        <ShieldCheck
                            className="pointer-events-none absolute top-1/2 left-3 -translate-y-1/2 text-muted-foreground/60 transition-colors group-focus-within:text-primary"
                            size={18}
                        />
                        <input
                            id="account-captcha"
                            name="captcha"
                            autoComplete="off"
                            className="h-11 w-full rounded-lg border border-input bg-background pr-4 pl-11 text-sm shadow-sm transition-all duration-200 outline-none focus:border-primary focus:ring-2 focus:ring-primary/20"
                            placeholder="请输入验证码"
                            value={accountForm.captcha}
                            onChange={(e) =>
                                setAccountForm((s) => ({
                                    ...s,
                                    captcha: e.target.value,
                                }))
                            }
                        />
                    </div>
                    <button
                        type="button"
                        onClick={() => {
                            void fetchCaptcha(true);
                        }}
                        className="flex h-11 w-24 items-center justify-center rounded-lg border transition-colors hover:bg-muted/50"
                        aria-label="刷新验证码"
                    >
                        {captchaUrl ? (
                            <Image
                                src={captchaUrl}
                                alt="验证码"
                                width={96}
                                height={44}
                                unoptimized
                                className="h-full w-full object-contain"
                            />
                        ) : (
                            <span className="text-xs text-muted-foreground">获取验证码</span>
                        )}
                    </button>
                </div>
            </div>

            <Button
                type="submit"
                className="mt-3 h-11 w-full text-base hover:bg-primary/70"
                disabled={loading}
            >
                {loading ? '登录中...' : '登录'}
            </Button>
        </form>
    );
}

// 邮箱登录
function EmailLoginForm({ open, activeTab, loading, setLoading, onOpenChange }: LoginFormProps) {
    const { handleLogin } = useAuth();

    const [emailForm, setEmailForm] = useState<EmailLoginForm>({ email: '', code: '' });
    const [countdown, setCountdown] = useState(0);

    const sendEmailCode = async () => {
        if (!emailForm.email) {
            toast.error('请输入邮箱地址');
            return;
        }

        if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(emailForm.email)) {
            toast.error('请输入有效的邮箱地址');
            return;
        }

        try {
            setLoading(true);
            const data = await apiRequest<EmailCodeResponse>({
                endpoint: '/api/auth/send-email-code',
                method: 'POST',
                data: { email: emailForm.email },
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
    const handleEmailLogin = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!emailForm.email || !emailForm.code) {
            toast.error('请填写邮箱和验证码');
            return;
        }
        try {
            setLoading(true);
            const data = await apiRequest<ResponseData<LoginResponse>>({
                endpoint: '/api/auth/email-login',
                method: 'POST',
                data: emailForm,
                options: { credentials: 'include' },
            });
            if (data.code !== 0 || !data.data) {
                toast.error(data.message || '登录失败');
                return;
            }

            handleLogin(data.data);

            toast.success('登录成功');
            onOpenChange(false);
        } catch (err) {
            const message = err instanceof Error ? err.message : '登录失败';
            toast.error(message);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        if (open && activeTab === 'email') {
            setEmailForm({ email: '', code: '' });
            setCountdown(0);
        }
    }, [open, activeTab]);

    return (
        <form onSubmit={handleEmailLogin} className="mt-6 space-y-4">
            <div className="space-y-2">
                <label
                    htmlFor="email-login-email"
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
                        id="email-login-email"
                        name="email"
                        autoComplete="email"
                        className="h-11 w-full rounded-lg border border-input bg-background pr-4 pl-11 text-sm shadow-sm transition-all duration-200 outline-none focus:border-primary focus:ring-2 focus:ring-primary/20"
                        placeholder="请输入邮箱地址"
                        value={emailForm.email}
                        onChange={(e) => setEmailForm((s) => ({ ...s, email: e.target.value }))}
                    />
                </div>
            </div>
            <div className="space-y-2">
                <label
                    htmlFor="email-login-code"
                    className="text-sm font-medium text-muted-foreground"
                >
                    验证码
                </label>
                <div className="flex items-center gap-3">
                    <div className="group relative flex-1">
                        <ShieldCheck
                            className="pointer-events-none absolute top-1/2 left-3 -translate-y-1/2 text-muted-foreground/60 transition-colors group-focus-within:text-primary"
                            size={18}
                        />
                        <input
                            id="email-login-code"
                            name="emailCode"
                            autoComplete="one-time-code"
                            inputMode="numeric"
                            className="h-11 w-full rounded-lg border border-input bg-background pr-4 pl-11 text-sm shadow-sm transition-all duration-200 outline-none focus:border-primary focus:ring-2 focus:ring-primary/20"
                            placeholder="请输入6位验证码"
                            value={emailForm.code}
                            maxLength={6}
                            onChange={(e) => setEmailForm((s) => ({ ...s, code: e.target.value }))}
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

            <Button
                type="submit"
                className="mt-3 h-11 w-full text-base hover:bg-primary/50"
                disabled={loading}
            >
                {loading ? '登录中...' : '登录'}
            </Button>
        </form>
    );
}

// OAuth登录
function OAuthLogin({ loading }: { loading: boolean }) {
    const handleGithubLogin = () => {
        if (loading) return;

        // 使用用户侧GitHub OAuth应用直接构建授权URL
        const clientId = oauthPublicConfig.github.clientId;
        const redirectUri = oauthPublicConfig.redirectUrl;
        const state = JSON.stringify({
            source: 'github',
            action: 'login',
        });

        if (!clientId) {
            toast.error('GitHub OAuth配置错误');
            return;
        }
        const params = new URLSearchParams({
            client_id: clientId,
            redirect_uri: redirectUri,
            scope: 'user',
            state: state,
        });

        const authUrl = `https://github.com/login/oauth/authorize?${params.toString()}`;
        window.location.href = authUrl;
    };

    const handleGoogleLogin = () => {
        if (loading) return;
        const clientId = oauthPublicConfig.google.clientId;
        const redirectUri = oauthPublicConfig.redirectUrl;
        // 直接跳转到管理侧Google OAuth授权页面，减少重定向跳转
        if (!clientId) {
            toast.error('google OAuth配置错误');
            return;
        }
        const state = JSON.stringify({
            source: 'google',
            action: 'login',
        });
        const params = new URLSearchParams({
            client_id: clientId,
            redirect_uri: redirectUri,
            state: state,
            response_type: 'code',
            scope: 'https://www.googleapis.com/auth/userinfo.profile https://www.googleapis.com/auth/userinfo.email',
        });
        const authUrl = `https://accounts.google.com/o/oauth2/v2/auth?${params.toString()}`;
        window.location.href = authUrl;
    };

    return (
        <div className="flex items-center justify-center gap-6">
            <Button
                variant="outline"
                size="icon"
                className="h-12 w-12 rounded-full transition-all duration-200 hover:bg-muted/50"
                onClick={handleGithubLogin}
                disabled={loading}
                title="使用GitHub登录"
            >
                <Github className="h-6 w-6" />
            </Button>
            <Button
                variant="outline"
                size="icon"
                className="h-12 w-12 rounded-full transition-all duration-200 hover:bg-muted/50"
                onClick={handleGoogleLogin}
                disabled={loading}
                title="使用Google登录"
            >
                <svg className="h-6 w-6" viewBox="0 0 24 24">
                    <path
                        fill="#4285F4"
                        d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                    />
                    <path
                        fill="#34A853"
                        d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                    />
                    <path
                        fill="#FBBC05"
                        d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
                    />
                    <path
                        fill="#EA4335"
                        d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
                    />
                </svg>
            </Button>
        </div>
    );
}

export function LoginDialog({ open, onOpenChange }: LoginDialogProps) {
    const [activeTab, setActiveTab] = useState<TabKey>('account');
    const [loading, setLoading] = useState(false);
    const [registerDialogOpen, setRegisterDialogOpen] = useState(false);
    const [forgotPasswordOpen, setForgotPasswordOpen] = useState(false);
    const handleSwitchTab = (key: TabKey) => {
        setActiveTab(key);
    };

    const handleSwitchToRegister = () => {
        setRegisterDialogOpen(true);
    };

    const handleSwitchToLogin = () => {
        setRegisterDialogOpen(false);
        onOpenChange(true);
    };

    return (
        <LoginContext.Provider
            value={{
                forgotPasswordOpen,
                registerDialogOpen,
                setForgotPasswordOpen,
                setRegisterDialogOpen,
                onOpenChange,
            }}
        >
            <Dialog open={open} onOpenChange={onOpenChange}>
                <DialogContent className="sm:max-w-md">
                    <DialogHeader className="space-y-3">
                        <DialogTitle className="flex items-center justify-center gap-3 text-xl font-bold">
                            <div className="flex h-10 w-10 items-center justify-center rounded-full bg-primary/10 text-primary">
                                <ShieldCheck className="h-6 w-6" />
                            </div>
                            <span className="bg-gradient-to-r from-gray-900 to-gray-600 bg-clip-text text-transparent dark:from-gray-100 dark:to-gray-400">
                                登录到CodeLess&apos;s Blog
                            </span>
                        </DialogTitle>
                    </DialogHeader>

                    {/* 滑动指示器 */}
                    <div className="relative rounded-lg border border-border/50 bg-muted/50 p-1 text-sm dark:border-slate-700/50 dark:bg-slate-800/50">
                        <div
                            className="absolute inset-1 rounded-md bg-background shadow-sm transition-transform duration-300 ease-in-out will-change-transform dark:bg-slate-700 dark:shadow-lg"
                            style={{
                                width: 'calc(50% - 4px)',
                                transform: `translateX(${activeTab === 'account' ? '0%' : '100%'})`,
                            }}
                        />
                        {/* 按钮容器 */}
                        <div className="relative z-10 grid grid-cols-2">
                            <button
                                className={`rounded-md px-3 py-2.5 font-medium transition-colors duration-200 outline-none focus:outline-none focus-visible:outline-none ${
                                    activeTab === 'account'
                                        ? 'text-foreground dark:text-slate-100'
                                        : 'text-muted-foreground hover:text-foreground dark:text-slate-400 dark:hover:text-slate-200'
                                }`}
                                onClick={() => handleSwitchTab('account')}
                            >
                                账号登录
                            </button>
                            <button
                                className={`rounded-md px-3 py-2.5 font-medium transition-colors duration-200 outline-none focus:outline-none focus-visible:outline-none ${
                                    activeTab === 'email'
                                        ? 'text-foreground dark:text-slate-100'
                                        : 'text-muted-foreground hover:text-foreground dark:text-slate-400 dark:hover:text-slate-200'
                                }`}
                                onClick={() => handleSwitchTab('email')}
                            >
                                邮箱登录
                            </button>
                        </div>
                    </div>

                    {activeTab === 'account' ? (
                        <AccountLoginForm
                            open={open}
                            activeTab={activeTab}
                            loading={loading}
                            setLoading={setLoading}
                            onOpenChange={onOpenChange}
                        />
                    ) : (
                        <EmailLoginForm
                            open={open}
                            activeTab={activeTab}
                            loading={loading}
                            setLoading={setLoading}
                            onOpenChange={onOpenChange}
                        />
                    )}
                    <RegisterAndForgotPassword onSwitchToRegister={handleSwitchToRegister} />

                    <div className="relative my-3">
                        <div className="absolute inset-0 flex items-center">
                            <Separator className="w-full" />
                        </div>
                        <div className="relative flex justify-center text-xs uppercase">
                            <span className="bg-muted px-2 text-muted-foreground">
                                或使用以下方式登录/注册
                            </span>
                        </div>
                    </div>
                    <div className="space-y-3">
                        <OAuthLogin loading={loading} />
                    </div>
                </DialogContent>
            </Dialog>

            <RegisterDialog
                open={registerDialogOpen}
                onOpenChange={setRegisterDialogOpen}
                onSwitchToLogin={handleSwitchToLogin}
            />
            <ForgotPasswordDialog />
        </LoginContext.Provider>
    );
}
