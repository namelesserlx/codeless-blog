import Router from '@koa/router';
import { dashboardController } from '../../controllers/dashboard';

export const dashboardRouter = new Router({
    prefix: '/dashboard',
});

dashboardRouter.get('/overview', dashboardController.getOverview);
