import CryptoJS from 'crypto-js';

const SECRET_KEY = 'your-secret-key'; // 建议使用环境变量

export const crypto = {
    encrypt(text: string): string {
        return CryptoJS.AES.encrypt(text, SECRET_KEY).toString();
    },

    decrypt(ciphertext: string): string {
        const bytes = CryptoJS.AES.decrypt(ciphertext, SECRET_KEY);
        return bytes.toString(CryptoJS.enc.Utf8);
    },

    // 用于密码加密的单向哈希
    hashPassword(password: string): string {
        return CryptoJS.SHA256(password).toString();
    },
};
