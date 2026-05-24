import { request, summary, tags, prefix, body } from 'koa-swagger-decorator';
import type { Context } from 'koa';
import { Response } from '../../utils/response';
import { emailNotificationService } from '../../services/email/notification';
import { ControllerErrorHandler } from '../../utils/decorators';
import { ValidationError } from '../../types/errors';

const tag = tags(['邮件测试']);

@prefix('/email')
export default class EmailTestController {
    @request('get', '/status')
    @summary('获取邮件服务状态')
    @tag
    @ControllerErrorHandler
    async getEmailServiceStatus(ctx: Context) {
        const status = emailNotificationService.getServiceStatus();
        ctx.body = Response.success(status, '获取邮件服务状态成功');
    }

    @request('post', '/test-send')
    @summary('测试发送邮件')
    @tag
    @body({
        email: { type: 'string', required: true, description: '收件人邮箱' },
        type: {
            type: 'string',
            required: false,
            default: 'verification_code',
            description: '邮件类型',
        },
    })
    @ControllerErrorHandler
    async testSendEmail(ctx: Context) {
        const { email, type = 'verification_code' } = ctx.request.body as {
            email: string;
            type?: 'verification_code' | 'welcome';
        };

        if (!email) {
            throw new ValidationError('请提供收件人邮箱');
        }

        if (type === 'verification_code') {
            const code = await emailNotificationService.sendVerificationCode({
                email,
                userName: '测试用户',
                purpose: 'login',
                expiresInMinutes: 10,
            });

            ctx.body = Response.success(
                { verificationCode: code },
                `测试验证码邮件已发送到 ${email}`,
            );
            return;
        }

        if (type === 'welcome') {
            await emailNotificationService.sendWelcomeEmail({
                email,
                username: '测试用户',
            });

            ctx.body = Response.success(null, `测试欢迎邮件已发送到 ${email}`);
            return;
        }

        throw new ValidationError('不支持的邮件类型');
    }

    @request('post', '/test-comment-approved')
    @summary('测试评论审核通过邮件')
    @tag
    @body({
        email: { type: 'string', required: true, description: '收件人邮箱' },
        userName: { type: 'string', required: false, default: '测试用户', description: '用户名' },
        commentContent: {
            type: 'string',
            required: false,
            default: '这是一条测试评论内容',
            description: '评论内容',
        },
        articleTitle: {
            type: 'string',
            required: false,
            default: '测试文章标题',
            description: '文章标题',
        },
    })
    @ControllerErrorHandler
    async testCommentApprovedEmail(ctx: Context) {
        const {
            email,
            userName = '测试用户',
            commentContent = '这是一条测试评论内容，用于验证邮件发送功能是否正常工作。',
            articleTitle = '测试文章标题',
        } = ctx.request.body as {
            email: string;
            userName?: string;
            commentContent?: string;
            articleTitle?: string;
        };

        if (!email) {
            throw new ValidationError('请提供收件人邮箱');
        }

        await emailNotificationService.sendCommentApprovedNotification({
            userEmail: email,
            userName,
            commentContent,
            articleTitle,
            articleId: 'test-article-123',
            commentId: 1,
        });

        ctx.body = Response.success(null, `测试评论审核通过邮件已发送到 ${email}`);
    }
}
