import bcrypt from 'bcryptjs';

const SALT_ROUNDS = 10;

export const crypto = {
    // 加密密码
    async hashPassword(password: string): Promise<string> {
        return bcrypt.hash(password, SALT_ROUNDS);
    },

    // 验证密码
    async comparePassword(password: string, hash: string): Promise<boolean> {
        return bcrypt.compare(password, hash);
    },
};
