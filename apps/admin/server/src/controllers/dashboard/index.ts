import { query, request, summary, tags, prefix } from 'koa-swagger-decorator';
import type { Context } from 'koa';
import { isDashboardRange, type DashboardRange } from '@blog/shared';
import { dashboardService } from '../../services/dashboard';
import { Response } from '../../utils/response';
import { ControllerErrorHandler, RequirePermission } from '../../utils/decorators';

const tag = tags(['控制台']);
const requireDashboardPermission = RequirePermission({ permissions: 'dashboard' });

@prefix('/dashboard')
export default class DashboardController {
    @request('get', '/overview')
    @summary('获取控制台总览')
    @tag
    @query({
        range: { type: 'string', required: false, enum: ['today', '7d', '30d'], default: '7d' },
        startDate: { type: 'string', required: false },
        endDate: { type: 'string', required: false },
    })
    @requireDashboardPermission
    @ControllerErrorHandler
    async getOverview(ctx: Context) {
        const {
            range = '7d',
            startDate,
            endDate,
        } = ctx.query as {
            range?: string;
            startDate?: string;
            endDate?: string;
        };
        const safeRange: DashboardRange = isDashboardRange(range) ? range : '7d';

        const result = await dashboardService.getOverview({
            range: safeRange,
            startDate,
            endDate,
        });
        ctx.body = Response.success(result, '获取控制台数据成功');
    }
}

export const dashboardController = new DashboardController();
