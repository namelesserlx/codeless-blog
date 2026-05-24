import Router from '@koa/router';
import EmailTestController from '../../controllers/email/test';

const emailTestController = new EmailTestController();
const emailTestRouter = new Router({
    prefix: '/email',
});

// 获取邮件服务状态
emailTestRouter.get('/status', emailTestController.getEmailServiceStatus);

// 测试发送邮件
emailTestRouter.post('/test-send', emailTestController.testSendEmail);

// 测试评论审核通过邮件
emailTestRouter.post('/test-comment-approved', emailTestController.testCommentApprovedEmail);

export default emailTestRouter;
