import nodemailer from 'nodemailer';
import { emailConfig, validateEmailConfig } from '../../config/email';
import { EmailData, EmailSendResult } from '../../types/email';
import { BusinessError, ErrorCode } from '../../types/errors';
import { EmailTemplateGenerator } from './templates';
import { logger } from '../logger';

interface EmailRetryOptions {
    maxAttempts?: number;
    throwOnFailure?: boolean;
}

export class EmailService {
    // 邮件传输器
    private transporter: nodemailer.Transporter | null = null;
    // 是否配置
    private isConfigured = false;

    constructor() {
        this.initializeTransporter();
    }

    /**
     * 初始化邮件传输器
     */
    private initializeTransporter(): void {
        try {
            this.isConfigured = validateEmailConfig();

            if (!this.isConfigured) {
                logger.warn('邮件服务未配置，邮件发送功能将被禁用');
                return;
            }

            const user = emailConfig.smtp.auth.user;
            const pass = emailConfig.smtp.auth.pass;

            if (!user || !pass) {
                logger.warn('邮件服务认证配置不完整，邮件发送功能将被禁用');
                this.isConfigured = false;
                return;
            }

            this.transporter = nodemailer.createTransport({
                host: emailConfig.smtp.host,
                port: emailConfig.smtp.port,
                secure: emailConfig.smtp.secure,
                auth: {
                    user,
                    pass,
                },
                pool: true, // 使用连接池
                maxConnections: 5, // 最大连接数
                maxMessages: 100, // 最大消息数
                rateLimit: 10, // 每秒最多发送10封邮件
            });

            // 验证连接
            this.verifyConnection();
        } catch (error) {
            logger.error('邮件服务初始化失败', error);
            this.isConfigured = false;
        }
    }

    /**
     * 验证邮件服务连接
     */
    private async verifyConnection(): Promise<void> {
        if (!this.transporter || !this.isConfigured) {
            return;
        }

        try {
            await this.transporter.verify();
            logger.info('邮件服务连接验证成功');
        } catch (error) {
            logger.error('邮件服务连接验证失败', error);
            this.isConfigured = false;
        }
    }

    /**
     * 发送邮件
     */
    async sendEmail(emailData: EmailData): Promise<EmailSendResult> {
        if (!this.isConfigured || !this.transporter) {
            logger.warn('邮件服务未配置，跳过邮件发送');
            return { success: false, error: '邮件服务未配置' };
        }

        try {
            const fromAddress = emailConfig.from.address;

            if (!fromAddress) {
                logger.warn('邮件发件地址未配置，跳过邮件发送');
                return { success: false, error: '邮件服务未配置' };
            }

            // 生成邮件模板
            const { subject, html } = EmailTemplateGenerator.generate(emailData);

            // 发送邮件
            const info = await this.transporter.sendMail({
                from: {
                    name: emailConfig.from.name,
                    address: fromAddress,
                },
                to: emailData.to,
                subject: subject,
                html: html,
            });

            logger.info(
                `邮件发送成功:action:${emailData.type} ${info.messageId} -> ${emailData.to}`,
            );

            return {
                success: true,
                messageId: info.messageId,
            };
        } catch (error) {
            logger.error('邮件发送失败', error);
            return {
                success: false,
                error: error instanceof Error ? error.message : '未知错误',
            };
        }
    }

    /**
     * 直接发送邮件，必要时做有限重试
     */
    async sendEmailWithRetry(
        emailData: EmailData,
        options: EmailRetryOptions = {},
    ): Promise<EmailSendResult> {
        const { maxAttempts = 3, throwOnFailure = false } = options;

        let lastResult: EmailSendResult = {
            success: false,
            error: '邮件发送失败',
        };

        for (let attempt = 1; attempt <= maxAttempts; attempt++) {
            lastResult = await this.sendEmail(emailData);

            if (lastResult.success) {
                return lastResult;
            }

            logger.warn('邮件发送失败，准备重试', {
                attempt,
                maxAttempts,
                type: emailData.type,
                to: emailData.to,
                error: lastResult.error,
            });

            if (attempt < maxAttempts) {
                await new Promise((resolve) => setTimeout(resolve, attempt * 200));
            }
        }

        if (throwOnFailure) {
            throw new BusinessError(ErrorCode.UNKNOWN_ERROR, '邮件发送失败', {
                source: 'EmailService.sendEmailWithRetry',
                type: emailData.type,
                to: emailData.to,
                cause: lastResult.error || '邮件发送失败',
            });
        }

        return lastResult;
    }

    /**
     * 获取队列状态
     */
    getQueueStatus(): { total: number; processing: boolean } {
        return {
            total: 0,
            processing: false,
        };
    }

    /**
     * 清空队列
     */
    clearQueue(): void {
        logger.info('邮件服务已使用直接发送模式，无进程内队列需要清空');
    }

    /**
     * 检查服务是否可用
     */
    isAvailable(): boolean {
        return this.isConfigured && this.transporter !== null;
    }

    /**
     * 关闭邮件服务
     */
    async close(): Promise<void> {
        if (this.transporter) {
            this.transporter.close();
            this.transporter = null;
        }
    }
}

// 导出单例实例
export const emailService = new EmailService();
