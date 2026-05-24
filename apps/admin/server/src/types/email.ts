// 邮件类型枚举
export enum EmailType {
    COMMENT_APPROVED = 'comment_approved', // 评论审核通过
    COMMENT_REPLIED = 'comment_replied', // 评论被回复
    VERIFICATION_CODE = 'verification_code', // 邮箱验证码
    PASSWORD_RESET = 'password_reset', // 密码重置
    WELCOME = 'welcome', // 欢迎邮件
    DIAGNOSTIC = 'diagnostic', // 诊断邮件
}

// 基础邮件数据接口
export interface BaseEmailData {
    to: string;
    subject: string;
    type: EmailType;
    recipientName?: string;
}

// 评论审核通过邮件数据
export interface CommentApprovedEmailData extends BaseEmailData {
    type: EmailType.COMMENT_APPROVED;
    commentContent: string;
    articleTitle: string;
    articleUrl: string;
    commentUrl: string;
    authorName: string;
}

// 评论被回复邮件数据
export interface CommentRepliedEmailData extends BaseEmailData {
    type: EmailType.COMMENT_REPLIED;
    originalCommentContent: string;
    replyContent: string;
    articleTitle: string;
    articleUrl: string;
    commentUrl: string;
    replierName: string;
}

// 验证码邮件数据
export interface VerificationCodeEmailData extends BaseEmailData {
    type: EmailType.VERIFICATION_CODE;
    verificationCode: string;
    expiresInMinutes: number;
    purpose: 'login' | 'register' | 'reset_password';
}

// 密码重置邮件数据
export interface PasswordResetEmailData extends BaseEmailData {
    type: EmailType.PASSWORD_RESET;
    resetUrl: string;
    expiresInMinutes: number;
}

// 欢迎邮件数据
export interface WelcomeEmailData extends BaseEmailData {
    type: EmailType.WELCOME;
    username: string;
    loginUrl: string;
}

// 诊断邮件数据
export interface DiagnosticEmailData extends BaseEmailData {
    type: EmailType.DIAGNOSTIC;
    title: string;
    summary?: string;
    payload: string;
}

// 联合类型
export type EmailData =
    | CommentApprovedEmailData
    | CommentRepliedEmailData
    | VerificationCodeEmailData
    | PasswordResetEmailData
    | WelcomeEmailData
    | DiagnosticEmailData;

// 邮件发送结果
export interface EmailSendResult {
    success: boolean;
    messageId?: string;
    error?: string;
}

// 邮件队列项
export interface EmailQueueItem {
    id: string;
    data: EmailData;
    attempts: number;
    maxAttempts: number;
    createdAt: Date;
    scheduledAt?: Date;
}
