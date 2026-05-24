import { create } from 'zustand';
import { authService } from '@/services/auth';
import { userService } from '@/services/system/user';
import {
    ResponseCode,
    LoginUserInfo,
    PermissionInfo,
    UserState,
    UpdateUserRequest,
    UserStatus,
} from '@blog/shared';
import { authStorage } from '@/utils/authStorage';

interface UserStore extends UserState {
    updateUserInfo: (user: Partial<LoginUserInfo>) => Promise<void>;
    login: (username: string, password: string, captcha: string) => Promise<void>;
    githubLogin: (code: string) => Promise<void>;
    bindGithub: (code: string) => Promise<void>;
    unbindGithub: () => Promise<void>;
    googleLogin: (code: string) => Promise<void>;
    bindGoogle: (code: string) => Promise<void>;
    unbindGoogle: () => Promise<void>;
    logout: () => Promise<void>;
    hasPermission: (permission?: string | string[]) => boolean;
    initUserInfo: () => void;
}

function derivePermissions(user: LoginUserInfo | null): string[] {
    return user?.permissions?.map((p: PermissionInfo) => p.code) ?? [];
}

function ensureAdminAccess(user: LoginUserInfo): void {
    if (!user.permissions?.some((permission) => permission.code === 'dashboard')) {
        throw new Error('当前账号没有管理后台权限');
    }
}

function getInitialState(): UserState {
    const userInfo = authStorage.getUserInfo();
    return {
        userInfo,
        permissions: derivePermissions(userInfo),
    };
}

const useUserStore = create<UserStore>((set, get) => ({
    ...getInitialState(),

    updateUserInfo: async (user) => {
        const currentUserInfo = get().userInfo;
        if (!currentUserInfo) return;

        const updateData: UpdateUserRequest = { id: currentUserInfo.id };

        if (user.username !== undefined) updateData.username = user.username;
        if (user.email !== undefined) updateData.email = user.email;
        if (user.nickname !== undefined) updateData.nickname = user.nickname;
        if (user.avatar !== undefined) updateData.avatar = user.avatar;
        if (user.bio !== undefined) updateData.bio = user.bio;
        if (user.address !== undefined) updateData.address = user.address;
        if (user.phone !== undefined) updateData.phone = user.phone;
        if (user.status !== undefined) updateData.status = user.status as UserStatus;

        const res = await userService.updateUser(updateData);
        if (res.code === ResponseCode.SUCCESS && res.data) {
            const updatedUserInfo: LoginUserInfo = {
                ...currentUserInfo,
                ...res.data,
            };
            authStorage.setUserInfo(updatedUserInfo);
            set({
                userInfo: updatedUserInfo,
                permissions: derivePermissions(updatedUserInfo),
            });
        }
    },

    login: async (username, password, captcha) => {
        const res = await authService.login({ username, password, captcha });
        if (res.code === ResponseCode.SUCCESS && res.data) {
            const { token, user } = res.data;
            ensureAdminAccess(user);
            authStorage.setToken(token);
            authStorage.setUserInfo(user);
            set({
                userInfo: user,
                permissions: derivePermissions(user),
            });
        }
    },

    githubLogin: async (code) => {
        const res = await authService.githubLogin(code);
        if (res.code === ResponseCode.SUCCESS && res.data) {
            const { token, user } = res.data;
            ensureAdminAccess(user);
            authStorage.setToken(token);
            authStorage.setUserInfo(user);
            set({
                userInfo: user,
                permissions: derivePermissions(user),
            });
        }
    },

    bindGithub: async (code) => {
        const res = await authService.bindGithub(code);
        if (res.code === ResponseCode.SUCCESS) {
            const prev = get().userInfo;
            if (prev && res.data) {
                const updated: LoginUserInfo = { ...prev, ...res.data };
                authStorage.setUserInfo(updated);
                set({ userInfo: updated, permissions: derivePermissions(updated) });
            }
        }
    },

    unbindGithub: async () => {
        const res = await authService.unbindGithub();
        if (res.code === ResponseCode.SUCCESS) {
            const prev = get().userInfo;
            if (prev) {
                const updated: LoginUserInfo = { ...prev, githubId: undefined };
                authStorage.setUserInfo(updated);
                set({ userInfo: updated, permissions: derivePermissions(updated) });
            }
        }
    },

    googleLogin: async (code) => {
        const res = await authService.googleLogin(code);
        if (res.code === ResponseCode.SUCCESS && res.data) {
            const { token, user } = res.data;
            ensureAdminAccess(user);
            authStorage.setToken(token);
            authStorage.setUserInfo(user);
            set({
                userInfo: user,
                permissions: derivePermissions(user),
            });
        }
    },

    bindGoogle: async (code) => {
        const res = await authService.bindGoogle(code);
        if (res.code === ResponseCode.SUCCESS) {
            const prev = get().userInfo;
            if (prev && res.data) {
                const updated: LoginUserInfo = { ...prev, ...res.data };
                authStorage.setUserInfo(updated);
                set({ userInfo: updated, permissions: derivePermissions(updated) });
            }
        }
    },

    unbindGoogle: async () => {
        const res = await authService.unbindGoogle();
        if (res.code === ResponseCode.SUCCESS) {
            const prev = get().userInfo;
            if (prev) {
                const updated: LoginUserInfo = { ...prev, googleId: undefined };
                authStorage.setUserInfo(updated);
                set({ userInfo: updated, permissions: derivePermissions(updated) });
            }
        }
    },

    logout: async () => {
        await authService.logout();
        authStorage.clearToken();
        authStorage.clearUserInfo();
        set({ userInfo: null, permissions: [] });
    },

    hasPermission: (permission) => {
        const { permissions } = get();
        if (!permission) return true;
        const required = Array.isArray(permission) ? permission : [permission];
        return required.every((p) => permissions.includes(p));
    },

    initUserInfo: () => {
        set(getInitialState());
    },
}));

export default useUserStore;
