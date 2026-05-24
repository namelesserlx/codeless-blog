import { logger } from '../utils/logger';
import { env } from './env';

export interface EmailConfig {
    smtp: {
        host: string;
        port: number;
        secure: boolean;
        auth: {
            user: string | undefined;
            pass: string | undefined;
        };
    };
    from: {
        name: string;
        address: string | undefined;
    };
    templates: {
        baseUrl: string; // 网站基础URL，用于邮件中的链接
    };
}

export const emailConfig: EmailConfig = {
    smtp: {
        host: env.email.smtp.host,
        port: env.email.smtp.port,
        secure: env.email.smtp.secure,
        auth: {
            user: env.email.smtp.user,
            pass: env.email.smtp.pass,
        },
    },
    from: {
        name: env.email.from.name,
        address: env.email.from.address ?? env.email.smtp.user,
    },
    templates: {
        baseUrl: env.urls.blog,
    },
};

// 验证邮件配置
export function validateEmailConfig(): boolean {
    if (!emailConfig.smtp.auth.user || !emailConfig.smtp.auth.pass || !emailConfig.from.address) {
        logger.warn(
            '邮件服务未正确配置，请检查 SMTP_USER、SMTP_PASS 或 EMAIL_FROM_ADDRESS 环境变量',
        );
        return false;
    }
    return true;
}
