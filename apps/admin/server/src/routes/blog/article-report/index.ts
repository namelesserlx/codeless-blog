import Router from '@koa/router';
import { articleReportController } from '../../../controllers/blog/article-report';

export const articleReportRouter = new Router({
    prefix: '/blog/article-report',
});

articleReportRouter.get('/', articleReportController.getReport);
articleReportRouter.get('/overview', articleReportController.getOverview);
articleReportRouter.get('/articles', articleReportController.getArticleList);
articleReportRouter.get('/articles/:articleId/trend', articleReportController.getArticleTrend);
