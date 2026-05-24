'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import type { ChangeEvent, FormEvent } from 'react';
import { Camera, CheckCircle2, Loader2, Mail, Send, ShieldCheck, UserRound } from 'lucide-react';
import { toast } from 'sonner';
import { UserAvatar } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import { apiRequest } from '@/lib/client/api-client';
import { useAuth } from '@/context/auth-context';
import type { CurrentUserProfile, ResponseData } from '@blog/shared';

const EMAIL_REGEXP = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const MAX_AVATAR_SIZE = 2 * 1024 * 1024;

interface ProfileFormState {
    nickname: string;
    email: string;
    code: string;
}

function buildAuthHeaders(token: string) {
    return {
        Authorization: `Bearer ${token}`,
    };
}

export default function ProfilePage() {
    const { auth, updateAuthUser, handleOpenLoginDialog } = useAuth();
    const fileInputRef = useRef<HTMLInputElement | null>(null);
    const [profile, setProfile] = useState<CurrentUserProfile | null>(null);
    const [form, setForm] = useState<ProfileFormState>({
        nickname: '',
        email: '',
        code: '',
    });
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [uploading, setUploading] = useState(false);
    const [sendingCode, setSendingCode] = useState(false);
    const [countdown, setCountdown] = useState(0);

    const emailChanged = Boolean(profile && form.email.trim() !== profile.email);
    const displayName = profile?.nickname || auth?.user.nickname || auth?.user.username || '访客';

    const loadProfile = useCallback(async () => {
        if (!auth?.token) {
            setLoading(false);
            return;
        }

        setLoading(true);
        try {
            const result = await apiRequest<ResponseData<CurrentUserProfile>>({
                endpoint: '/api/auth/profile',
                method: 'GET',
                options: {
                    headers: buildAuthHeaders(auth.token),
                },
            });

            if (result.code !== 0 || !result.data) {
                throw new Error(result.message || '资料加载失败');
            }

            setProfile(result.data);
            setForm({
                nickname: result.data.nickname || '',
                email: result.data.email || '',
                code: '',
            });
            updateAuthUser({
                nickname: result.data.nickname,
                avatar: result.data.avatar,
            });
        } catch (error) {
            const message = error instanceof Error ? error.message : '资料加载失败';
            toast.error(message);
        } finally {
            setLoading(false);
        }
    }, [auth?.token, updateAuthUser]);

    useEffect(() => {
        void loadProfile();
    }, [loadProfile]);

    useEffect(() => {
        if (countdown <= 0) return;

        const timer = window.setTimeout(() => {
            setCountdown((value) => value - 1);
        }, 1000);

        return () => window.clearTimeout(timer);
    }, [countdown]);

    const canSave = useMemo(() => {
        if (!profile) return false;
        if (!form.nickname.trim()) return false;
        if (!EMAIL_REGEXP.test(form.email.trim())) return false;
        if (emailChanged && !form.code.trim()) return false;

        return form.nickname.trim() !== profile.nickname || emailChanged;
    }, [emailChanged, form.code, form.email, form.nickname, profile]);

    const handleSendCode = async () => {
        const email = form.email.trim();

        if (!EMAIL_REGEXP.test(email)) {
            toast.error('请输入有效的邮箱地址');
            return;
        }

        if (!emailChanged) {
            toast.info('邮箱没有变化');
            return;
        }

        setSendingCode(true);
        try {
            const result = await apiRequest<ResponseData<{ message: string; expiresIn: number }>>({
                endpoint: '/api/auth/send-email-code',
                method: 'POST',
                data: { email },
            });

            if (result.code !== 0) {
                throw new Error(result.message || '验证码发送失败');
            }

            toast.success(result.data.message || '验证码已发送');
            setCountdown(60);
        } catch (error) {
            const message = error instanceof Error ? error.message : '验证码发送失败';
            toast.error(message);
        } finally {
            setSendingCode(false);
        }
    };

    const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
        event.preventDefault();

        if (!auth?.token) {
            handleOpenLoginDialog(true);
            return;
        }

        if (!profile) return;

        if (!form.nickname.trim()) {
            toast.error('昵称不能为空');
            return;
        }

        if (!EMAIL_REGEXP.test(form.email.trim())) {
            toast.error('请输入有效的邮箱地址');
            return;
        }

        if (emailChanged && !form.code.trim()) {
            toast.error('请输入邮箱验证码');
            return;
        }

        setSaving(true);
        try {
            const result = await apiRequest<ResponseData<CurrentUserProfile>>({
                endpoint: '/api/auth/profile',
                method: 'POST',
                data: {
                    nickname: form.nickname.trim(),
                    email: form.email.trim(),
                    code: emailChanged ? form.code.trim() : undefined,
                },
                options: {
                    headers: buildAuthHeaders(auth.token),
                },
            });

            if (result.code !== 0 || !result.data) {
                throw new Error(result.message || '资料更新失败');
            }

            setProfile(result.data);
            setForm({
                nickname: result.data.nickname || '',
                email: result.data.email || '',
                code: '',
            });
            updateAuthUser({
                nickname: result.data.nickname,
                avatar: result.data.avatar,
            });
            toast.success('资料已更新');
        } catch (error) {
            const message = error instanceof Error ? error.message : '资料更新失败';
            toast.error(message);
        } finally {
            setSaving(false);
        }
    };

    const handleAvatarChange = async (event: ChangeEvent<HTMLInputElement>) => {
        const file = event.target.files?.[0];
        event.target.value = '';

        if (!file || !auth?.token) return;

        if (!file.type.startsWith('image/')) {
            toast.error('只能上传图片文件');
            return;
        }

        if (file.size > MAX_AVATAR_SIZE) {
            toast.error('头像不能超过 2MB');
            return;
        }

        const formData = new FormData();
        formData.append('avatar', file);

        setUploading(true);
        try {
            const result = await apiRequest<ResponseData<CurrentUserProfile>>({
                endpoint: '/api/auth/profile/avatar',
                method: 'POST',
                data: formData,
                options: {
                    headers: buildAuthHeaders(auth.token),
                },
            });

            if (result.code !== 0 || !result.data) {
                throw new Error(result.message || '头像更新失败');
            }

            setProfile(result.data);
            setForm((current) => ({
                ...current,
                nickname: result.data.nickname || '',
                email: result.data.email || '',
            }));
            updateAuthUser({
                nickname: result.data.nickname,
                avatar: result.data.avatar,
            });
            toast.success('头像已更新');
        } catch (error) {
            const message = error instanceof Error ? error.message : '头像更新失败';
            toast.error(message);
        } finally {
            setUploading(false);
        }
    };

    if (!auth?.token) {
        return (
            <main className="mx-auto flex min-h-[72vh] max-w-xl items-center px-4 py-16">
                <section className="w-full rounded-2xl border border-border bg-card p-8 text-center shadow-sm">
                    <UserRound className="mx-auto h-12 w-12 text-muted-foreground" />
                    <h1 className="mt-5 text-2xl font-bold text-foreground">个人中心</h1>
                    <p className="mt-3 text-sm leading-6 text-muted-foreground">
                        登录后可以维护头像、昵称和邮箱。
                    </p>
                    <Button className="mt-6" onClick={() => handleOpenLoginDialog(true)}>
                        登录账号
                    </Button>
                </section>
            </main>
        );
    }

    return (
        <main className="mx-auto w-full max-w-3xl px-4 py-10 md:py-14">
            <section className="rounded-2xl border border-border bg-card shadow-sm">
                <div className="border-b border-border px-5 py-5 md:px-8">
                    <h1 className="text-2xl font-bold text-foreground">个人中心</h1>
                    <p className="mt-2 text-sm text-muted-foreground">头像、昵称和邮箱</p>
                </div>

                {loading ? (
                    <div className="flex min-h-80 items-center justify-center">
                        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
                    </div>
                ) : (
                    <div className="grid gap-8 px-5 py-6 md:grid-cols-[180px_1fr] md:px-8 md:py-8">
                        <div className="flex flex-col items-center gap-4">
                            <UserAvatar
                                className="h-28 w-28"
                                src={profile?.avatar || auth?.user.avatar}
                                name={displayName}
                                imageAlt={displayName}
                                fallbackClassName="text-2xl"
                            />

                            <input
                                ref={fileInputRef}
                                type="file"
                                accept="image/*"
                                className="hidden"
                                onChange={handleAvatarChange}
                            />

                            <Button
                                type="button"
                                variant="outline"
                                size="sm"
                                disabled={uploading}
                                onClick={() => fileInputRef.current?.click()}
                            >
                                {uploading ? (
                                    <Loader2 className="h-4 w-4 animate-spin" />
                                ) : (
                                    <Camera className="h-4 w-4" />
                                )}
                                更换头像
                            </Button>
                        </div>

                        <form onSubmit={handleSubmit} className="space-y-5">
                            <div className="space-y-2">
                                <label
                                    htmlFor="profile-username"
                                    className="text-sm font-medium text-muted-foreground"
                                >
                                    用户名
                                </label>
                                <input
                                    id="profile-username"
                                    value={profile?.username || auth.user.username}
                                    disabled
                                    className="h-11 w-full rounded-lg border border-border bg-muted/40 px-3 text-sm text-muted-foreground outline-none"
                                />
                            </div>

                            <div className="space-y-2">
                                <label
                                    htmlFor="profile-nickname"
                                    className="text-sm font-medium text-muted-foreground"
                                >
                                    昵称
                                </label>
                                <div className="relative">
                                    <UserRound className="pointer-events-none absolute top-1/2 left-3 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                                    <input
                                        id="profile-nickname"
                                        value={form.nickname}
                                        onChange={(event) =>
                                            setForm((current) => ({
                                                ...current,
                                                nickname: event.target.value,
                                            }))
                                        }
                                        className="h-11 w-full rounded-lg border border-border bg-background pr-3 pl-10 text-sm transition outline-none focus:border-primary focus:ring-2 focus:ring-primary/20"
                                        placeholder="请输入昵称"
                                    />
                                </div>
                            </div>

                            <div className="space-y-2">
                                <label
                                    htmlFor="profile-email"
                                    className="text-sm font-medium text-muted-foreground"
                                >
                                    邮箱
                                </label>
                                <div className="relative">
                                    <Mail className="pointer-events-none absolute top-1/2 left-3 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                                    <input
                                        id="profile-email"
                                        type="email"
                                        value={form.email}
                                        onChange={(event) =>
                                            setForm((current) => ({
                                                ...current,
                                                email: event.target.value,
                                            }))
                                        }
                                        className="h-11 w-full rounded-lg border border-border bg-background pr-3 pl-10 text-sm transition outline-none focus:border-primary focus:ring-2 focus:ring-primary/20"
                                        placeholder="请输入邮箱"
                                    />
                                </div>
                            </div>

                            {emailChanged && (
                                <div className="space-y-2">
                                    <label
                                        htmlFor="profile-email-code"
                                        className="text-sm font-medium text-muted-foreground"
                                    >
                                        邮箱验证码
                                    </label>
                                    <div className="flex gap-2">
                                        <input
                                            id="profile-email-code"
                                            value={form.code}
                                            onChange={(event) =>
                                                setForm((current) => ({
                                                    ...current,
                                                    code: event.target.value,
                                                }))
                                            }
                                            className="h-11 min-w-0 flex-1 rounded-lg border border-border bg-background px-3 text-sm transition outline-none focus:border-primary focus:ring-2 focus:ring-primary/20"
                                            placeholder="6 位验证码"
                                        />
                                        <Button
                                            type="button"
                                            variant="outline"
                                            disabled={sendingCode || countdown > 0}
                                            onClick={handleSendCode}
                                            className="h-11 shrink-0"
                                        >
                                            {sendingCode ? (
                                                <Loader2 className="h-4 w-4 animate-spin" />
                                            ) : (
                                                <Send className="h-4 w-4" />
                                            )}
                                            {countdown > 0 ? `${countdown}s` : '发送'}
                                        </Button>
                                    </div>
                                </div>
                            )}

                            <div className="flex flex-col gap-3 border-t border-border pt-5 sm:flex-row sm:items-center sm:justify-between">
                                <div className="inline-flex items-center gap-2 text-sm text-muted-foreground">
                                    {emailChanged ? (
                                        <ShieldCheck className="h-4 w-4 text-sky-500" />
                                    ) : (
                                        <CheckCircle2 className="h-4 w-4 text-emerald-500" />
                                    )}
                                    <span>{emailChanged ? '邮箱变更需要验证' : '资料已同步'}</span>
                                </div>

                                <Button type="submit" disabled={!canSave || saving}>
                                    {saving && <Loader2 className="h-4 w-4 animate-spin" />}
                                    保存资料
                                </Button>
                            </div>
                        </form>
                    </div>
                )}
            </section>
        </main>
    );
}
