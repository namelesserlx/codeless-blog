import Router from '@koa/router';
import { commentController } from '../../../controllers/blog/comment';

const commentRouter = new Router({
    prefix: '/blog/comments',
});
// 获取评论列表（分页）
commentRouter.get('/list', commentController.getCommentPage);

// 获取评论列表（公开接口）
commentRouter.get('/', commentController.getComments);

// 获取评论统计（公开接口）
commentRouter.get('/stats', commentController.getCommentStats);

// 创建评论（需要登录）
commentRouter.post('/create', commentController.createComment);

// 更新评论（需要登录）
commentRouter.post('/update', commentController.updateComment);

// 审核评论（后台内容权限）
commentRouter.post('/moderate', commentController.moderateComment);

// 删除评论（需要登录）
commentRouter.post('/delete', commentController.deleteComment);

export default commentRouter;
