import { User } from '../types/system/user';

const USER_INFO_KEY = 'userInfo';

export const storage = {
    // 获取用户信息
    getUserInfo(): User | null {
        const userInfo = localStorage.getItem(USER_INFO_KEY);
        return userInfo ? JSON.parse(userInfo) : null;
    },

    // 设置用户信息
    setUserInfo(userInfo: User): void {
        localStorage.setItem(USER_INFO_KEY, JSON.stringify(userInfo));
    },

    // 更新用户信息（部分更新）
    updateUserInfo(partialUserInfo: Partial<User>): void {
        const currentUserInfo = this.getUserInfo();
        if (currentUserInfo) {
            this.setUserInfo({ ...currentUserInfo, ...partialUserInfo });
        }
    },

    // 清除用户信息
    clearUserInfo(): void {
        localStorage.removeItem(USER_INFO_KEY);
    },
};
