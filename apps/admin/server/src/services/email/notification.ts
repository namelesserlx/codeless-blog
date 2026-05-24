import { emailService } from '../../utils/email/index';
import {
    EmailType,
    CommentApprovedEmailData,
    CommentRepliedEmailData,
    VerificationCodeEmailData,
    PasswordResetEmailData,
    WelcomeEmailData,
} from '../../types/email';
import { emailConfig } from '../../config/email';
import { nanoid } from 'nanoid';
import { logger } from '../../utils/logger';
import { ServiceErrorHandler, TraceSpan } from '../../utils/decorators';

export class EmailNotificationService {
    private buildVerificationCodeSubject(
        purpose: 'login' | 'register' | 'reset_password',
        code: string,
    ) {
        const purposeSubject = {
            login: '登录验证码',
            register: '注册验证码',
            reset_password: '密码重置验证码',
        }[purpose];

        return `🔐 ${purposeSubject} - ${code}`;
    }

    @TraceSpan(
        'email.delivery.required',
        (emailData: Parameters<typeof emailService.sendEmail>[0]) => ({
            'email.type': emailData.type,
            'email.has_recipient': Boolean(emailData.to),
        }),
    )
    private async deliverRequiredEmail(emailData: Parameters<typeof emailService.sendEmail>[0]) {
        await emailService.sendEmailWithRetry(emailData, {
            maxAttempts: 3,
            throwOnFailure: true,
        });
    }

    private dispatchBestEffortEmail(
        emailData: Parameters<typeof emailService.sendEmail>[0],
        description: string,
    ) {
        void emailService
            .sendEmailWithRetry(emailData, {
                maxAttempts: 3,
                throwOnFailure: false,
            })
            .then((result) => {
                if (result.success) {
                    logger.info(`${description}发送成功`, {
                        type: emailData.type,
                        to: emailData.to,
                    });
                    return;
                }

                logger.warn(`${description}发送失败`, {
                    type: emailData.type,
                    to: emailData.to,
                    error: result.error,
                });
            })
            .catch((error) => {
                logger.error(`${description}发送异常`, {
                    type: emailData.type,
                    to: emailData.to,
                    error: error instanceof Error ? error.message : String(error),
                });
            });
    }

    /**
     * 发送评论审核通过通知
     */
    @ServiceErrorHandler
    async sendCommentApprovedNotification(params: {
        userEmail: string;
        userName: string;
        commentContent: string;
        articleTitle: string;
        articleId: string;
        commentId: number;
    }): Promise<void> {
        try {
            const { userEmail, userName, commentContent, articleTitle, articleId, commentId } =
                params;

            const articleUrl = `${emailConfig.templates.baseUrl}/articles/${articleId}`;
            const commentUrl = `${articleUrl}#comment-${commentId}`;

            const emailData: CommentApprovedEmailData = {
                to: userEmail,
                subject: `🎉 您的评论已通过审核 - ${articleTitle}`,
                type: EmailType.COMMENT_APPROVED,
                recipientName: userName,
                commentContent,
                articleTitle,
                articleUrl,
                commentUrl,
                authorName: userName,
            };

            this.dispatchBestEffortEmail(emailData, '评论审核通过邮件');
        } catch (error) {
            logger.error('发送评论审核通过通知失败', {
                error: error instanceof Error ? error.message : String(error),
            });
        }
    }

    /**
     * 发送评论回复通知
     */
    @ServiceErrorHandler
    async sendCommentReplyNotification(params: {
        recipientEmail: string; // 接收者邮箱
        recipientName: string; // 接收者昵称
        originalCommentContent: string; // 原始评论内容
        replyContent: string; // 回复内容
        replierName: string; // 回复者昵称
        articleTitle: string; // 文章标题
        articleId: string; // 文章ID
        commentId: number; // 评论ID
    }): Promise<void> {
        try {
            const {
                recipientEmail,
                recipientName,
                originalCommentContent,
                replyContent,
                replierName,
                articleTitle,
                articleId,
                commentId,
            } = params;

            const articleUrl = `${emailConfig.templates.baseUrl}/articles/${articleId}`;
            const commentUrl = `${articleUrl}#comment-${commentId}`;

            const emailData: CommentRepliedEmailData = {
                to: recipientEmail,
                subject: `💬 您收到了新的回复 - ${articleTitle}`,
                type: EmailType.COMMENT_REPLIED,
                recipientName,
                originalCommentContent,
                replyContent,
                articleTitle,
                articleUrl,
                commentUrl,
                replierName,
            };

            this.dispatchBestEffortEmail(emailData, '评论回复邮件');
        } catch (error) {
            logger.error('发送评论回复通知失败', {
                error: error instanceof Error ? error.message : String(error),
            });
        }
    }

    /**
     * 发送评论人工审核提醒
     */
    @ServiceErrorHandler
    async sendCommentReviewRequiredNotification(params: {
        recipientEmail: string;
        recipientName?: string;
        commentId: number;
        authorName: string;
        commentContent: string;
        targetTitle: string;
        targetType: 'article' | 'snippet';
        reviewUrl: string;
        moderationReason: string;
        moderationNote?: string;
    }): Promise<void> {
        const payload = [
            `评论 ID: ${params.commentId}`,
            `评论作者: ${params.authorName}`,
            `内容类型: ${params.targetType === 'article' ? '文章' : '片段'}`,
            `内容标题: ${params.targetTitle}`,
            `模型结论: ${params.moderationReason}`,
            params.moderationNote ? `模型说明: ${params.moderationNote}` : '',
            '',
            '评论内容:',
            params.commentContent,
            '',
            `审核入口: ${params.reviewUrl}`,
        ]
            .filter(Boolean)
            .join('\n');

        this.dispatchBestEffortEmail(
            {
                to: params.recipientEmail,
                subject: `评论需要人工审核 - ${params.targetTitle}`,
                type: EmailType.DIAGNOSTIC,
                recipientName: params.recipientName || '超级管理员',
                title: '评论需要人工审核',
                summary: 'DeepSeek 无法高置信度判断这条评论，请进入后台确认。',
                payload,
            },
            '评论人工审核提醒邮件',
        );
    }

    /**
     * 发送邮箱验证码
     */
    @ServiceErrorHandler
    async sendVerificationCode(params: {
        email: string;
        userName?: string;
        purpose: 'login' | 'register' | 'reset_password';
        expiresInMinutes?: number;
    }): Promise<string> {
        try {
            const { email, userName, purpose, expiresInMinutes = 10 } = params;

            // 生成6位数字验证码
            const verificationCode = Math.floor(100000 + Math.random() * 900000).toString();

            const emailData: VerificationCodeEmailData = {
                to: email,
                subject: this.buildVerificationCodeSubject(purpose, verificationCode),
                type: EmailType.VERIFICATION_CODE,
                recipientName: userName,
                verificationCode,
                expiresInMinutes,
                purpose,
            };

            await this.deliverRequiredEmail(emailData);

            return verificationCode;
        } catch (error) {
            logger.error('发送验证码失败', {
                error: error instanceof Error ? error.message : String(error),
            });
            throw error;
        }
    }

    /**
     * 发送指定的邮箱验证码
     */
    @ServiceErrorHandler
    async sendVerificationCodeWithCode(params: {
        email: string;
        code: string;
        userName?: string;
        purpose: 'login' | 'register' | 'reset_password';
        expiresInMinutes?: number;
    }): Promise<void> {
        try {
            const { email, code, userName, purpose, expiresInMinutes = 10 } = params;

            const emailData: VerificationCodeEmailData = {
                to: email,
                subject: this.buildVerificationCodeSubject(purpose, code),
                type: EmailType.VERIFICATION_CODE,
                recipientName: userName,
                verificationCode: code,
                expiresInMinutes,
                purpose,
            };

            await this.deliverRequiredEmail(emailData);
        } catch (error) {
            logger.error('发送验证码失败', {
                error: error instanceof Error ? error.message : String(error),
            });
            throw error;
        }
    }

    /**
     * 发送密码重置邮件
     */
    @ServiceErrorHandler
    async sendPasswordResetEmail(params: {
        email: string;
        userName: string;
        resetToken: string;
        expiresInMinutes?: number;
    }): Promise<void> {
        try {
            const { email, userName, resetToken, expiresInMinutes = 30 } = params;

            const resetUrl = `${emailConfig.templates.baseUrl}/auth/reset-password?token=${resetToken}`;

            const emailData: PasswordResetEmailData = {
                to: email,
                subject: '🔑 密码重置 - 博客系统',
                type: EmailType.PASSWORD_RESET,
                recipientName: userName,
                resetUrl,
                expiresInMinutes,
            };

            await this.deliverRequiredEmail(emailData);
        } catch (error) {
            logger.error('发送密码重置邮件失败', {
                error: error instanceof Error ? error.message : String(error),
            });
            throw error;
        }
    }

    /**
     * 发送欢迎邮件
     */
    @ServiceErrorHandler
    async sendWelcomeEmail(params: { email: string; username: string }): Promise<void> {
        try {
            const { email, username } = params;

            const loginUrl = `${emailConfig.templates.baseUrl}/auth/login`;

            const emailData: WelcomeEmailData = {
                to: email,
                subject: "🎊 欢迎加入CodeLess'sBlog！",
                type: EmailType.WELCOME,
                recipientName: username,
                username,
                loginUrl,
            };

            this.dispatchBestEffortEmail(emailData, '欢迎邮件');
        } catch (error) {
            logger.error('发送欢迎邮件失败', {
                error: error instanceof Error ? error.message : String(error),
            });
        }
    }

    /**
     * 立即发送邮件（不使用队列）
     */
    @TraceSpan('email.delivery.immediate', (emailData: any) => ({
        'email.type': emailData?.type || 'unknown',
        'email.has_recipient': Boolean(emailData?.to),
    }))
    @ServiceErrorHandler
    async sendEmailImmediately(emailData: any): Promise<boolean> {
        try {
            const result = await emailService.sendEmail(emailData);
            return result.success;
        } catch (error) {
            logger.error('立即发送邮件失败', {
                error: error instanceof Error ? error.message : String(error),
            });
            return false;
        }
    }

    /**
     * 检查邮件服务状态
     */
    getServiceStatus(): {
        available: boolean;
        queueStatus: { total: number; processing: boolean };
    } {
        return {
            available: emailService.isAvailable(),
            queueStatus: emailService.getQueueStatus(),
        };
    }

    /**
     * 生成随机验证码
     */
    generateVerificationCode(length: number = 6): string {
        const chars = '0123456789';
        let code = '';
        for (let i = 0; i < length; i++) {
            code += chars.charAt(Math.floor(Math.random() * chars.length));
        }
        return code;
    }

    /**
     * 生成重置令牌
     */
    generateResetToken(): string {
        return nanoid(32);
    }
}

// 导出单例实例
export const emailNotificationService = new EmailNotificationService();
