import {
    EmailType,
    EmailData,
    CommentApprovedEmailData,
    CommentRepliedEmailData,
    DiagnosticEmailData,
    VerificationCodeEmailData,
    PasswordResetEmailData,
    WelcomeEmailData,
} from '../../types/email';
import { BusinessError, ErrorCode } from '../../types/errors';

// 基础邮件样式
const baseStyles = `
    <style>
            body {
                font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
                line-height: 1.6;
                color: #333;
                max-width: 600px;
                margin: 0 auto;
                padding: 20px;
                background-color: #f4f4f4;
            }
            .email-container {
                background-color: white;
                padding: 30px;
                border-radius: 10px;
                box-shadow: 0 2px 10px rgba(0, 0, 0, 0.1);
            }
            .header {
                border-bottom: 2px solid #1890ff;
                padding-bottom: 20px;
                margin-bottom: 30px;
            }
            .logo {
                font-size: 24px;
                font-weight: bold;
                color: #1890ff;
            }
            .content {
                margin-bottom: 30px;
            }
            .highlight {
                background-color: #f8fafc;
                padding: 15px;
                border-left: 4px solid #1890ff;
                margin: 20px 0;
                border-radius: 0 5px 5px 0;
            }
            .button {
                display: inline-block;
                background-color: #1890ff;
                color: white;
                padding: 12px 24px;
                text-decoration: none;
                border-radius: 5px;
                font-weight: bold;
                margin: 20px 0;
            }
            .footer {
                border-top: 1px solid #e5e7eb;
                padding-top: 20px;
                font-size: 14px;
                color: #6b7280; 
                text-align: center;
            }
            .code {
                font-family: 'Courier New', monospace;
                font-size: 24px;
                font-weight: bold;
                color: #1890ff;
                letter-spacing: 2px;
                text-align: center;
                padding: 20px;
                border: 2px dashed #1890ff;
                border-radius: 5px;
                margin: 20px 0;
            }
        </style>
`;

// 基础邮件结构
function wrapEmailTemplate(content: string, recipientName?: string): string {
    return `
        <!DOCTYPE html>
        <html>
        <head>
            <meta charset="utf-8">
            <meta name="viewport" content="width=device-width, initial-scale=1.0">
            ${baseStyles}
        </head>
        <body>
            <div class="email-container">
                <div class="header">
                    <div class="logo">📝 CodeLess'sBlog</div>
                </div>
                <div class="content">
                    ${recipientName ? `<p>亲爱的 ${recipientName}，</p>` : '<p>您好，</p>'}
                    ${content}
                </div>
                <div class="footer">
                    <p>这是一封系统自动发送的邮件，请勿回复。</p>
                    <p>&copy; 2025 CodeLess'sBlog. 保留所有权利。</p>
                </div>
            </div>
        </body>
        </html>
    `;
}

function escapeHtml(content: string): string {
    return content
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&#39;');
}

// 评论审核通过邮件模板
function generateCommentApprovedTemplate(data: CommentApprovedEmailData): string {
    const content = `
        <h2>🎉 您的评论已通过审核</h2>
        <p>恭喜！您在文章《<strong>${data.articleTitle}</strong>》下的评论已通过审核并发布。</p>
        
        <div class="highlight">
            <strong>您的评论内容：</strong><br>
            ${data.commentContent}
        </div>
        
        <p>感谢您的参与和分享！您的评论已经对其他读者可见。</p>
        
        <a href="${data.commentUrl}" class="button">查看您的评论</a>
        
        <p>您还可以：</p>
        <ul>
            <li><a href="${data.articleUrl}">阅读完整文章</a></li>
            <li>继续参与讨论，发表更多精彩评论</li>
        </ul>
    `;

    return wrapEmailTemplate(content, data.recipientName);
}

// 评论被回复邮件模板
function generateCommentRepliedTemplate(data: CommentRepliedEmailData): string {
    const content = `
        <h2>💬 您收到了新的回复</h2>
        <p><strong>${data.replierName}</strong> 回复了您在文章《<strong>${data.articleTitle}</strong>》下的评论。</p>
        
        <div class="highlight">
            <strong>您的原评论：</strong><br>
            ${data.originalCommentContent}
        </div>
        
        <div class="highlight">
            <strong>${data.replierName} 的回复：</strong><br>
            ${data.replyContent}
        </div>
        
        <a href="${data.commentUrl}" class="button">查看回复详情</a>
        
        <p>快去看看并继续对话吧！</p>
    `;

    return wrapEmailTemplate(content, data.recipientName);
}

// 验证码邮件模板
function generateVerificationCodeTemplate(data: VerificationCodeEmailData): string {
    const purposeText = {
        login: '登录',
        register: '注册',
        reset_password: '重置密码',
    }[data.purpose];

    const content = `
        <h2>🔐 邮箱验证码</h2>
        <p>您正在进行${purposeText}操作，请使用以下验证码完成验证：</p>
        
        <div class="code">${data.verificationCode}</div>
        
        <p><strong>重要提醒：</strong></p>
        <ul>
            <li>验证码有效期为 <strong>${data.expiresInMinutes} 分钟</strong></li>
            <li>请勿将验证码告诉他人</li>
            <li>如果您没有进行此操作，请忽略此邮件</li>
        </ul>
    `;

    return wrapEmailTemplate(content, data.recipientName);
}

// 密码重置邮件模板
function generatePasswordResetTemplate(data: PasswordResetEmailData): string {
    const content = `
        <h2>🔑 密码重置</h2>
        <p>我们收到了您的密码重置请求。请点击下面的按钮设置新密码：</p>
        
        <a href="${data.resetUrl}" class="button">重置密码</a>
        
        <p><strong>重要提醒：</strong></p>
        <ul>
            <li>重置链接有效期为 <strong>${data.expiresInMinutes} 分钟</strong></li>
            <li>如果您没有请求重置密码，请忽略此邮件</li>
            <li>为了账户安全，请设置一个强密码</li>
        </ul>
        
        <p>如果按钮无法点击，请复制以下链接到浏览器打开：</p>
        <p style="word-break: break-all; color: #4f46e5;">${data.resetUrl}</p>
    `;

    return wrapEmailTemplate(content, data.recipientName);
}

// 欢迎邮件模板
function generateWelcomeTemplate(data: WelcomeEmailData): string {
    const content = `
        <h2>🎊 欢迎加入我们的博客社区！</h2>
        <p>欢迎 <strong>${data.username}</strong>！您已成功注册博客账户。</p>
        
        <p>在这里，您可以：</p>
        <ul>
            <li>📖 阅读精彩的文章和代码片段</li>
            <li>💬 参与讨论，发表评论</li>
            <li>👍 为喜欢的内容点赞</li>
            <li>📝 分享您的想法和见解</li>
        </ul>
        
        <a href="${data.loginUrl}" class="button">立即开始探索</a>
        
        <p>期待您的参与！如有任何问题，随时联系我们。</p>
    `;

    return wrapEmailTemplate(content, data.recipientName);
}

// 诊断邮件模板
function generateDiagnosticTemplate(data: DiagnosticEmailData): string {
    const content = `
        <h2>${escapeHtml(data.title)}</h2>
        ${
            data.summary
                ? `<p>${escapeHtml(data.summary)}</p>`
                : '<p>以下是本次诊断事件的详细信息。</p>'
        }

        <div class="highlight">
            <pre style="margin: 0; white-space: pre-wrap; word-break: break-word; font-size: 13px;">${escapeHtml(
                data.payload,
            )}</pre>
        </div>
    `;

    return wrapEmailTemplate(content, data.recipientName);
}

// 邮件模板生成器
export class EmailTemplateGenerator {
    static generate(data: EmailData): { subject: string; html: string } {
        let html: string;
        const subject: string = data.subject;

        switch (data.type) {
            case EmailType.COMMENT_APPROVED:
                html = generateCommentApprovedTemplate(data as CommentApprovedEmailData);
                break;
            case EmailType.COMMENT_REPLIED:
                html = generateCommentRepliedTemplate(data as CommentRepliedEmailData);
                break;
            case EmailType.VERIFICATION_CODE:
                html = generateVerificationCodeTemplate(data as VerificationCodeEmailData);
                break;
            case EmailType.PASSWORD_RESET:
                html = generatePasswordResetTemplate(data as PasswordResetEmailData);
                break;
            case EmailType.WELCOME:
                html = generateWelcomeTemplate(data as WelcomeEmailData);
                break;
            case EmailType.DIAGNOSTIC:
                html = generateDiagnosticTemplate(data as DiagnosticEmailData);
                break;
            default:
                throw new BusinessError(
                    ErrorCode.UNSUPPORTED_OPERATION,
                    `不支持的邮件类型: ${(data as { type?: string }).type}`,
                );
        }

        return { subject, html };
    }
}
