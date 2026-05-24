'use client';

import { LoginResponse, ResponseData } from '@blog/shared';
import { createContext, useContext, useState, useEffect, useCallback, ReactNode } from 'react';
import { publicEnv } from '@/config/public-env';
import { apiRequest } from '@/lib/client/api-client';
import { LoginDialog } from '@/components/login/LoginDialog';

interface AuthContextType {
    auth: LoginResponse | null;
    handleLogin: (auth: LoginResponse) => void;
    handleLogout: () => void;
    updateAuthUser: (user: Partial<LoginResponse['user']>) => void;
    handleOpenAdminSystem: () => void;
    handleOpenLoginDialog: (open: boolean) => void;
    hasAdminAccess: boolean;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

interface AuthProviderProps {
    children: ReactNode;
}

const AUTH_STORAGE_KEY = 'blog_auth';

const readStoredAuth = (): LoginResponse | null => {
    try {
        const authStr = localStorage.getItem(AUTH_STORAGE_KEY);
        return authStr ? (JSON.parse(authStr) as LoginResponse) : null;
    } catch (error) {
        console.error('Failed to parse auth data from localStorage:', error);
        return null;
    }
};

const clearStoredAuth = () => {
    localStorage.removeItem(AUTH_STORAGE_KEY);
};

const persistAuth = (auth: LoginResponse) => {
    localStorage.setItem(AUTH_STORAGE_KEY, JSON.stringify(auth));
};

export function AuthProvider({ children }: AuthProviderProps) {
    const [auth, setAuth] = useState<LoginResponse | null>(null);
    const [isOpen, setIsOpen] = useState(false);
    const hasAdminAccess =
        auth?.user.permissions?.some((permission) => permission.code === 'dashboard') === true;
    const handleOpenLoginDialog = useCallback((open: boolean) => {
        setIsOpen(open);
    }, []);

    const restoreAuthSession = useCallback(async () => {
        try {
            const storedAuth = readStoredAuth();
            const headers = storedAuth?.token
                ? {
                      Authorization: `Bearer ${storedAuth.token}`,
                  }
                : undefined;

            const res = await apiRequest<ResponseData<LoginResponse>>({
                endpoint: '/api/auth/checkLogin',
                method: 'GET',
                options: {
                    headers,
                },
            });

            if (res.code === 0 && res.data?.token && res.data.user) {
                persistAuth(res.data);
                setAuth(res.data);
            } else {
                clearStoredAuth();
                setAuth(null);
            }
        } catch {
            clearStoredAuth();
            setAuth(null);
        }
    }, []);

    useEffect(() => {
        let cancelled = false;

        const restoreWhenIdle = () => {
            if (!cancelled) {
                void restoreAuthSession();
            }
        };

        if (typeof requestIdleCallback === 'function') {
            const idleId = requestIdleCallback(restoreWhenIdle, { timeout: 2000 });

            // 监听 storage 事件，以便在其他标签页中的变化也能同步
            const handleStorageChange = (e: StorageEvent) => {
                if (e.key === AUTH_STORAGE_KEY) {
                    void restoreAuthSession();
                }
            };

            window.addEventListener('storage', handleStorageChange);
            return () => {
                cancelled = true;
                cancelIdleCallback(idleId);
                window.removeEventListener('storage', handleStorageChange);
            };
        }

        const timer = setTimeout(restoreWhenIdle, 1000);

        const handleStorageChange = (e: StorageEvent) => {
            if (e.key === AUTH_STORAGE_KEY) {
                void restoreAuthSession();
            }
        };
        window.addEventListener('storage', handleStorageChange);

        return () => {
            cancelled = true;
            clearTimeout(timer);
            window.removeEventListener('storage', handleStorageChange);
        };
    }, [restoreAuthSession]);

    const handleLogin = useCallback((auth: LoginResponse) => {
        setIsOpen(true);
        persistAuth(auth);
        setAuth(auth);
    }, []);

    const handleLogout = useCallback(async () => {
        try {
            await apiRequest<ResponseData<null>>({
                endpoint: '/api/auth/logout',
                method: 'POST',
            });
        } catch (error) {
            console.warn('Failed to logout from server:', error);
        }

        clearStoredAuth();
        setAuth(null);
    }, []);

    const updateAuthUser = useCallback((user: Partial<LoginResponse['user']>) => {
        setAuth((currentAuth) => {
            if (!currentAuth) return currentAuth;

            const nextAuth = {
                ...currentAuth,
                user: {
                    ...currentAuth.user,
                    ...user,
                },
            };
            persistAuth(nextAuth);
            return nextAuth;
        });
    }, []);

    const handleOpenAdminSystem = useCallback(() => {
        if (!hasAdminAccess || !auth) {
            return;
        }

        const adminUrl = publicEnv.urls.admin;

        if (publicEnv.app.isDevelopment) {
            const payload = btoa(encodeURIComponent(JSON.stringify(auth)));
            window.open(`${adminUrl}/dashboard?payload=${payload}`, '_blank');
            return;
        }

        window.open(`${adminUrl}/dashboard`, '_blank');
    }, [auth, hasAdminAccess]);

    const value = {
        auth,
        handleLogin,
        handleLogout,
        updateAuthUser,
        handleOpenAdminSystem,
        handleOpenLoginDialog,
        hasAdminAccess,
    };

    return (
        <AuthContext.Provider value={value}>
            {children}
            <LoginDialog
                open={isOpen}
                onOpenChange={(o) => {
                    setIsOpen(o);
                }}
            />
        </AuthContext.Provider>
    );
}

export function useAuth() {
    const context = useContext(AuthContext);
    if (context === undefined) {
        throw new Error('useAuth must be used within an AuthProvider');
    }
    return context;
}
