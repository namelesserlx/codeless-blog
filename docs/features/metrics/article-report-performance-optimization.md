# 文章报表性能优化方案

> **状态**：待执行
>
> **日期**：2026-05-05
>
> **适用范围**：`apps/admin/client` 文章报表页面、`apps/admin/server` 文章报表接口、`packages/shared` 报表契约、`packages/db` 指标相关索引。

## 一、背景

线上测试环境中，`www.example.com` 已通过 Nginx gzip 与 `/assets/` 代理缓存显著改善静态资源加载速度。配置层面问题基本收敛后，文章报表页面仍存在应用层性能瓶颈：

- 文章报表接口返回时间偏长。
- `/blog/article-report` 一次返回约 500 篇文章。
- 每篇文章携带单篇趋势数组，接口体积、前端 JS 对象数量和内存占用都偏高。
- 页面一次性渲染完整文章表现清单，滚动与交互有卡顿。
- Admin Client 构建产物中仍存在大 chunk，例如完整 ECharts chunk 超过 1 MB。

本文档记录已确认的根因、优化目标和分阶段执行清单。

## 二、当前现象与证据

### 2.1 接口响应偏重

浏览器 Network 中 `/api/blog/article-report` 响应数据结构包含：

- `overview`
- `articles`
- `authors`
- `tags`

其中 `articles` 一次返回 500 条，并按 `[0...99]`、`[100...199]` 等分组展示。每条文章又包含：

- 基本信息：`id`、`title`、`summary`、`author`、`tags`
- 当前周期指标：`current`
- 上一周期指标：`previous`
- 单篇趋势：`trend`

当前共享契约位置：

- `packages/shared/src/types/blog/articleReport/index.ts`

关键字段：

```ts
export interface ArticleReportItem {
    id: string;
    title: string;
    summary: string;
    authorId: number;
    author: string;
    status: ArticleReportStatus;
    tags: ArticleReportTagItem[];
    publishedAt: string;
    updatedAt: string;
    coverTone: string;
    currentLikes: number;
    current: ArticleReportMetricSet;
    previous: ArticleReportMetricSet;
    trend: ArticleReportPoint[];
}
```

### 2.2 服务端构造了全量单篇趋势

当前服务端在 `getReport` 中对所有匹配文章逐篇构造 `trend`：

- `apps/admin/server/src/services/blog/article-report/index.ts`

关键逻辑：

```ts
const articles: ArticleReportItem[] = posts.map((post) => {
    const trend: ArticleReportPoint[] = buckets.map((bucket) => {
        const uv = metrics.viewMetrics.trend.get(post.id)?.get(bucket.key) || 0;
        const comments = metrics.commentMetrics.trend.get(post.id)?.get(bucket.key) || 0;
        const likeAdds = metrics.likeMetrics.trend.get(post.id)?.get(bucket.key) || 0;

        const point: ArticleReportPoint = {
            date: bucket.key,
            label: bucket.label,
            uv,
            comments,
            likeAdds,
        };

        addMetricSet(overviewTrendMap.get(bucket.key)!, point);
        return point;
    });

    return {
        // ...
        trend,
    };
});
```

以 500 篇、30 天范围估算，单次接口至少会创建并传输 `500 * 30 = 15000` 个趋势点，还不包含每个点的字符串字段和对象开销。

### 2.3 前端把 trend 留在表格行对象中

当前前端将每篇文章的 `trend` 原样放入 `ArticlePerformanceRow`：

- `apps/admin/client/src/pages/Blog/articleReport/page-data.ts`

关键逻辑：

```ts
export function buildArticlePerformanceRows(
    articles: ArticleReportApiItem[],
): ArticlePerformanceRow[] {
    return articles
        .map((article) => {
            return {
                id: article.id,
                title: article.title,
                summary: article.summary,
                author: article.author,
                status: article.status,
                tags: article.tags.map((tag) => tag.name),
                updatedAt: article.updatedAt,
                publishedAt: article.publishedAt,
                rangeUv: article.current.uv,
                rangeComments: article.current.comments,
                currentLikes: article.currentLikes,
                uvDelta: calculateDelta(article.current.uv, article.previous.uv),
                trend: article.trend,
                coverTone: article.coverTone,
            };
        })
        .sort((left, right) => right.rangeUv - left.rangeUv);
}
```

这使得表格数据源本身也携带了大量图表数据。

### 2.4 表格一次性渲染所有行

当前 `TablePanel` 关闭分页，并且没有虚拟滚动：

- `apps/admin/client/src/pages/Blog/articleReport/components/TablePanel.tsx`

关键配置：

```tsx
<Table<ArticlePerformanceRow>
    rowKey="id"
    columns={columns}
    dataSource={articleRows}
    pagination={false}
    scroll={{ x: 1080 }}
/>
```

500 行会一次性渲染文章标题、摘要、作者、状态、标签、指标和趋势 badge。行内 Tag、摘要和复杂样式会放大 DOM 与 layout 成本。

### 2.5 构建产物存在大 chunk

已观察到构建输出中存在大文件：

```text
dist/assets/js/EChart-Bb-vnkrG.js      1,121.08 kB │ gzip: 371.99 kB
dist/assets/js/index-Y2n6Apao.js         557.89 kB │ gzip: 189.52 kB
dist/assets/js/index-CZ8jlzAp.js         547.27 kB │ gzip: 165.95 kB
```

当前图表组件完整引入 ECharts：

- `apps/admin/client/src/pages/Dashboard/components/EChart.tsx`
- `apps/admin/client/src/pages/Dashboard/chart-options.ts`

关键逻辑：

```ts
import * as echarts from 'echarts';
```

Dashboard 与文章报表目前只使用折线图、仪表盘、网格、提示框和 SVG renderer，不需要完整 ECharts 包。

## 三、根因总结

| 优先级 | 根因                     | 影响                                                               |
| ------ | ------------------------ | ------------------------------------------------------------------ |
| P0     | 报表接口返回全量文章     | 网络传输、JSON 解析、内存占用和前端对象构造成本高                  |
| P0     | 每篇文章携带趋势数组     | 500 篇文章会生成大量趋势点，单篇详情数据提前传输，收益很低         |
| P0     | 表格无分批加载与虚拟滚动 | 500 行一次性渲染，DOM、样式计算和滚动性能差                        |
| P1     | ECharts 完整引入         | 图表 chunk 体积过大，首进图表页面成本高                            |
| P1     | Redis pending 指标扫描   | 报表接口每次扫描 `post:*` 类 key，随着数据增长会越来越慢           |
| P2     | 指标查询缺少复合索引     | 按 `postId + date/status` 过滤和聚合时，数据库无法充分利用查询模式 |

## 四、优化目标

### 4.1 用户体验目标

- 文章报表首屏可交互时间明显下降。
- 表格滚动和筛选交互无明显卡顿。
- 点击文章行后再加载单篇详情趋势，不阻塞首屏。

### 4.2 接口目标

- 默认列表接口只返回当前滚动批次数据。
- 默认列表不返回单篇 `trend`。
- 单篇趋势由独立接口按需加载。
- 总览数据与列表数据解耦，避免为了展示总览而加载完整文章列表。

### 4.3 构建目标

- ECharts chunk 明显下降。
- 首屏入口 chunk 不再被无关测试页、编辑器或大型图表库拖大。
- 保持 Vite hash 静态资源可缓存。

## 五、推荐改造方案

### 5.1 接口拆分

建议将现有单接口拆成三个读模型：

#### 5.1.1 总览接口

```text
GET /api/blog/article-report/overview
```

职责：

- 返回筛选范围内的全局指标卡片数据。
- 返回全部文章汇总趋势。
- 返回筛选器 options：作者、标签。
- 不返回文章清单。
- 不返回单篇趋势。

建议响应：

```ts
interface ArticleReportOverviewResponse {
    startDate: string;
    endDate: string;
    authors: ArticleReportOption[];
    tags: ArticleReportOption[];
    overview: {
        current: ArticleReportOverviewCurrent;
        previous: ArticleReportOverviewPrevious;
        trend: ArticleReportPoint[];
    };
    generatedAt: string;
}
```

#### 5.1.2 列表接口

```text
GET /api/blog/article-report/articles
```

职责：

- 返回文章表现清单。
- 支持服务端分批加载、排序、筛选。
- 不返回单篇趋势。

建议查询参数：

```ts
interface ArticleReportListQuery extends ArticleReportQuery {
    cursor?: string;
    limit?: number;
    sortBy?: 'uv' | 'comments' | 'likes' | 'updatedAt';
    sortOrder?: 'asc' | 'desc';
}
```

建议响应：

```ts
interface ArticleReportListResponse {
    startDate: string;
    endDate: string;
    pageInfo: {
        limit: number;
        total: number;
        nextCursor?: string;
        hasMore: boolean;
    };
    articles: ArticleReportListItem[];
}

interface ArticleReportListItem {
    id: string;
    title: string;
    summary: string;
    authorId: number;
    author: string;
    status: ArticleReportStatus;
    tags: ArticleReportTagItem[];
    publishedAt: string;
    updatedAt: string;
    coverTone: string;
    currentLikes: number;
    current: ArticleReportMetricSet;
    previous: ArticleReportMetricSet;
}
```

#### 5.1.3 单篇趋势接口

```text
GET /api/blog/article-report/articles/:articleId/trend
```

职责：

- 点击某篇文章或进入详情区时按需加载。
- 只返回该文章在当前筛选范围内的趋势。

建议响应：

```ts
interface ArticleReportArticleTrendResponse {
    articleId: string;
    startDate: string;
    endDate: string;
    trend: ArticleReportPoint[];
}
```

### 5.2 前端数据流调整

当前：

```text
useArticleReportData
  -> getReport
  -> overview + articles + every article trend
  -> buildArticlePerformanceRows
  -> TablePanel renders all rows
  -> DetailPanel uses selectedArticle.trend
```

建议：

```text
useArticleReportOverview
  -> getOverview
  -> FilterPanel / MetricCards / OverviewPanel

useArticleReportList
  -> getArticleList
  -> TablePanel with infinite scroll + virtual table

useArticleReportArticleTrend
  -> getArticleTrend(selectedArticleId)
  -> DetailPanel
```

前端状态建议：

- `filters`：日期、作者、标签、关键词。
- `listCursor`：下一批数据的游标。
- `listLimit`：每批加载数量，建议默认 `30` 或 `50`。
- `hasMore`：是否还有下一批。
- `isLoadingMore`：是否正在加载下一批，避免重复触发。
- `sorter`：sortBy、sortOrder。
- `selectedArticleId`：当前选中文章。
- `selectedArticleSummary`：从列表行中读取，用于详情标题和卡片展示。
- `selectedArticleTrend`：单独接口返回。

### 5.3 滚动加载结合虚拟滚动

文章表现清单不使用 Ant Design 的分页控件，推荐采用“服务端分批 + 前端追加 + 表格虚拟滚动”：

- 首次请求只加载 `30` 或 `50` 条。
- 滚动接近底部时，根据 `nextCursor` 请求下一批。
- 新批次追加到 `articleRows`，筛选或排序变化时清空列表并重新加载。
- Table 只渲染可视区域附近的行，避免 500 行同时进入 DOM。
- 接口仍然要做服务端分批，虚拟滚动不能替代接口瘦身。

Ant Design Table 建议配置方向：

```tsx
<Table<ArticlePerformanceRow>
    rowKey="id"
    columns={columns}
    dataSource={articleRows}
    loading={initialLoading}
    pagination={false}
    virtual
    scroll={{
        x: 1080,
        y: 560,
    }}
    onChange={(_, __, sorter) => {
        // 同步 sorter，重置 cursor 和 articleRows，然后重新加载第一批
    }}
    onScroll={(event) => {
        const target = event.currentTarget;
        const distanceToBottom = target.scrollHeight - target.scrollTop - target.clientHeight;

        if (distanceToBottom < 240 && hasMore && !isLoadingMore) {
            loadMore();
        }
    }}
/>
```

Ant Design Table 虚拟滚动要求：

- `virtual`
- `scroll.x` 为 number
- `scroll.y` 为 number

注意事项：

- `pagination={false}`，不要展示分页控件。
- 表格行高度尽量稳定，摘要、标签等内容需要限制行数，否则虚拟滚动计算和滚动体验容易抖动。
- 如果使用自定义 `components.body.row` 或 `components.body.wrapper`，需要正确透传 `ref`。
- `onScroll` 触发时要用 `isLoadingMore` 和 `hasMore` 做保护，避免滚动到底部连续打接口。
- 筛选、排序、日期范围变化后，要中断或忽略上一轮请求结果，避免旧数据追加到新列表。

### 5.4 ECharts 按需引入

当前完整引入：

```ts
import * as echarts from 'echarts';
```

建议新增局部注册模块，例如：

```ts
import { use, type ComposeOption } from 'echarts/core';
import {
    GaugeChart,
    LineChart,
    type GaugeSeriesOption,
    type LineSeriesOption,
} from 'echarts/charts';
import {
    AxisPointerComponent,
    GridComponent,
    TooltipComponent,
    type GridComponentOption,
    type TooltipComponentOption,
} from 'echarts/components';
import { SVGRenderer } from 'echarts/renderers';

use([LineChart, GaugeChart, GridComponent, TooltipComponent, AxisPointerComponent, SVGRenderer]);

export type AdminEChartsOption = ComposeOption<
    LineSeriesOption | GaugeSeriesOption | GridComponentOption | TooltipComponentOption
>;
```

然后 `EChart.tsx` 使用：

```ts
import { init, type ECharts } from 'echarts/core';
```

预期收益：

- 显著降低 `EChart-*.js` chunk。
- Dashboard 与文章报表共用轻量图表运行时。
- 避免未使用图表类型进入生产构建。

### 5.5 Redis pending 指标优化

当前报表接口会扫描：

- `post:*:uv:*`
- `post:*:like`

位置：

- `apps/admin/server/src/services/blog/article-report/repository.ts`

问题：

- Redis key 越多，扫描越慢。
- 扫描发生在用户请求链路中，会直接影响接口响应时间。

推荐方向：

1. 优先依赖 metrics worker 定时落库，报表读取 MySQL 聚合结果。
2. 如果报表必须包含 pending 数据，维护更可定位的 pending 索引 key，例如：
    - `metrics:pending:posts`
    - `metrics:pending:uv:{yyyymmdd}`
    - `metrics:pending:likes`
3. 报表接口只读取相关日期和相关 postId 的 pending 数据，不再全局 scan。

### 5.6 数据库索引优化

当前指标表已有部分单列索引，但报表查询多为复合条件。

建议新增复合索引：

```prisma
model PostViewDaily {
  // ...
  @@index([postId, viewedAt])
}

model Comment {
  // ...
  @@index([postId, status, createdAt])
}

model PostLike {
  // ...
  @@index([postId, createdAt])
}

model Post {
  // ...
  @@index([authorId, updatedAt])
  @@index([updatedAt])
}
```

索引用途：

- `PostViewDaily(postId, viewedAt)`：按文章和日期范围聚合 UV。
- `Comment(postId, status, createdAt)`：按文章、状态、日期范围聚合评论。
- `PostLike(postId, createdAt)`：按文章和日期范围聚合点赞新增。
- `Post(authorId, updatedAt)`：作者筛选与默认排序。

## 六、执行清单

### P0：解决文章报表卡顿

- [ ] 在 `packages/shared/src/types/blog/articleReport/index.ts` 新增 overview/list/detail 三类响应契约。
- [ ] 在 `apps/admin/server/src/controllers/blog/article-report/index.ts` 拆分路由。
- [ ] 在 `apps/admin/server/src/services/blog/article-report/` 拆分 overview/list/detail service 方法。
- [ ] 在 `apps/admin/server/src/services/blog/article-report/repository.ts` 为列表查询增加 `limit/cursor/orderBy`。
- [ ] 文章列表响应移除 `trend` 字段。
- [ ] 单篇趋势改为按 `articleId` 按需查询。
- [ ] 在 `apps/admin/client/src/services/blog/articleReport.ts` 拆分 service 方法。
- [ ] 在 `apps/admin/client/src/pages/Blog/articleReport/hooks/` 拆分 overview/list/detail hooks。
- [ ] 在 `TablePanel` 启用滚动加载和 Ant Design Table `virtual`。
- [ ] 筛选、排序和日期范围变化时重置滚动列表与 cursor。
- [ ] 在 `DetailPanel` 中增加单篇趋势加载态。
- [ ] 验证默认 30 天、500 篇数据下，首屏接口不再返回 500 份趋势数组。

### P1：降低构建体积和图表成本

- [ ] 新增轻量 ECharts 注册模块。
- [ ] 将 `EChart.tsx` 从 `echarts` 完整入口切换到 `echarts/core`。
- [ ] 将 Dashboard 与文章报表 chart option 类型收敛到按需 option。
- [ ] 确认 `EChart-*.js` chunk 明显下降。
- [ ] 校验虚拟滚动下摘要、标签和操作列不会造成行高抖动。

### P2：长期报表稳定性

- [ ] 补充 Prisma 复合索引。
- [ ] 评估 metrics worker 是否能覆盖报表所需实时性。
- [ ] 优化 Redis pending 数据读取方式，减少请求链路中的全局 scan。
- [ ] 为 article report service 补充单元测试或集成测试。
- [ ] 使用 bundle visualizer 分析大 chunk 真实来源。
- [ ] 将生产环境无关的 `/editor`、`/editor/custom` 测试路由改为 dev-only 注册。

## 七、验证方案

### 7.1 接口验证

推荐对比改造前后：

```bash
curl -w '\nsize=%{size_download}\ntime_starttransfer=%{time_starttransfer}\ntime_total=%{time_total}\n' \
  -o /tmp/article-report.json \
  'https://www.example.com/api/blog/article-report?startDate=2026-04-06&endDate=2026-05-05'
```

改造后需要分别验证：

```bash
curl -w '\nsize=%{size_download}\ntime_total=%{time_total}\n' \
  -o /tmp/article-report-overview.json \
  'https://www.example.com/api/blog/article-report/overview?startDate=2026-04-06&endDate=2026-05-05'

curl -w '\nsize=%{size_download}\ntime_total=%{time_total}\n' \
  -o /tmp/article-report-list.json \
  'https://www.example.com/api/blog/article-report/articles?startDate=2026-04-06&endDate=2026-05-05&limit=50'
```

验收点：

- 列表接口响应体明显小于旧接口。
- 列表接口不包含 `articles[].trend`。
- 列表接口返回 `pageInfo.hasMore` 和 `pageInfo.nextCursor`，滚动加载下一批时使用 `nextCursor`。
- 总览接口不包含文章列表。
- 单篇趋势接口只返回一篇文章的趋势数组。

### 7.2 前端验证

浏览器 DevTools 中观察：

- `article-report/overview` 请求时间。
- `article-report/articles` 请求时间和大小。
- 点击文章行后是否再触发单篇趋势请求。
- Performance 面板中表格渲染长任务是否减少。
- Memory 面板中切换筛选后是否出现明显堆积。

### 7.3 构建验证

```bash
pnpm --filter @blog/client build
```

验收点：

- 构建成功。
- `EChart-*.js` chunk 明显小于当前完整 ECharts chunk。
- 不引入新的大于 500 kB 的页面级 chunk。

### 7.4 服务端验证

```bash
pnpm --filter @blog/server test
pnpm --filter @blog/server build
```

验收点：

- 原有服务端测试通过。
- 新增或调整的 article report 测试通过。
- 服务端构建通过。

### 7.5 数据库验证

新增索引后执行：

```bash
pnpm db:generate
pnpm db:migrate:dev
```

上线前使用 staging 数据检查：

- 30 天范围默认报表。
- 作者筛选。
- 标签筛选。
- 关键词筛选。
- 无数据筛选。
- 点击单篇文章查看趋势。

## 八、风险与注意事项

- 接口拆分会改变前后端契约，需要保持旧接口兼容或一次性同步发布。
- 如果文章列表按 UV 排序，服务端需要在指标聚合后排序，再生成下一批游标；不能简单按 `updatedAt` 拉一批后在前端排序。
- 滚动加载需要处理重复触发、筛选切换竞态和请求取消，否则容易出现重复行或旧筛选结果混入新列表。
- 虚拟滚动对表格行高度更敏感，摘要和标签建议做行数限制。
- 单篇趋势按需加载后，详情区需要处理 loading、error 和切换竞态。
- ECharts 按需引入需要确认 Dashboard 仪表盘、文章报表折线图、tooltip、areaStyle 都正常渲染。
- Redis pending 数据如果从请求链路移除，报表实时性会取决于 metrics worker flush 周期。

## 九、推荐落地顺序

1. 拆分接口契约，明确 overview/list/detail 三个读模型。
2. 服务端列表接口增加分批加载、游标和排序。
3. 前端表格启用滚动加载和虚拟滚动。
4. 单篇详情趋势改为按需加载。
5. ECharts 改为按需引入。
6. 增加 Prisma 复合索引。
7. 优化 Redis pending 数据读取方式。
8. 做 bundle visualizer 和生产测试路由治理。

这个顺序优先解决真实卡顿，再处理构建体积，最后做长期稳定性治理。
