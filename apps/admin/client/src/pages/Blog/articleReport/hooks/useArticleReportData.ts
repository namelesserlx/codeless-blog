import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useRequest } from 'ahooks';
import { message } from 'antd';
import type { ArticleReportListQuery, ArticleReportQuery } from '@blog/shared';
import { articleReportService } from '@/services/blog/articleReport';
import { buildArticleDetailOption } from '../chart-options';
import { buildRangeLabel } from '../date-range';
import {
    buildArticlePerformanceRows,
    buildAuthorOptions,
    buildOverviewMetrics,
    buildTagOptions,
} from '../page-data';
import type { ArticlePerformanceRow, ArticleReportFilters, TrendPoint } from '../types';

interface UseArticleReportDataParams {
    filters: ArticleReportFilters;
}

const ARTICLE_LIST_LIMIT = 50;

export function useArticleReportData({ filters }: UseArticleReportDataParams) {
    const [selectedArticleId, setSelectedArticleId] = useState('');
    const [articleListState, setArticleListState] = useState<{
        queryKey: string;
        rows: ArticlePerformanceRow[];
        total: number;
        nextCursor?: string;
        hasMore: boolean;
    }>({
        queryKey: '',
        rows: [],
        total: 0,
        hasMore: false,
    });
    const [articleTrendState, setArticleTrendState] = useState<{
        queryKey: string;
        articleId: string;
        points: TrendPoint[];
    }>({
        queryKey: '',
        articleId: '',
        points: [],
    });
    const listRequestIdRef = useRef(0);
    const trendRequestIdRef = useRef(0);

    const startDate = filters.selectedDateRange[0].format('YYYY-MM-DD');
    const endDate = filters.selectedDateRange[1].format('YYYY-MM-DD');
    const reportParams = useMemo<ArticleReportQuery>(
        () => ({
            startDate,
            endDate,
            authorId: filters.authorFilter ? Number(filters.authorFilter) : undefined,
            tagId: filters.tagFilter ? Number(filters.tagFilter) : undefined,
            keyword: filters.keyword || undefined,
        }),
        [endDate, filters.authorFilter, filters.keyword, filters.tagFilter, startDate],
    );
    const reportQueryKey = useMemo(() => JSON.stringify(reportParams), [reportParams]);

    const {
        data: overviewResponse,
        loading: overviewLoading,
        run: runOverviewRequest,
    } = useRequest(
        async (params: ArticleReportQuery, queryKey: string) => {
            const response = await articleReportService.getOverview(params);
            return {
                queryKey,
                response,
            };
        },
        {
            manual: true,
            onError: (error) => {
                const errorMessage =
                    error instanceof Error ? error.message : '获取文章报表总览失败';
                message.error(errorMessage);
            },
        },
    );

    const { loading: articleListLoading, run: runArticleListRequest } = useRequest(
        async (
            params: ArticleReportListQuery,
            queryKey: string,
            requestId: number,
            append: boolean,
        ) => {
            const response = await articleReportService.getArticleList(params);
            return {
                append,
                queryKey,
                requestId,
                response,
            };
        },
        {
            manual: true,
            onSuccess: ({ append, queryKey, requestId, response }) => {
                if (requestId !== listRequestIdRef.current) {
                    return;
                }

                const list = response.data;
                const nextRows = buildArticlePerformanceRows(list?.articles || []);

                setArticleListState((previousState) => ({
                    queryKey,
                    rows:
                        append && previousState.queryKey === queryKey
                            ? [...previousState.rows, ...nextRows]
                            : nextRows,
                    total: list?.pageInfo.total || 0,
                    nextCursor: list?.pageInfo.nextCursor,
                    hasMore: Boolean(list?.pageInfo.hasMore),
                }));
            },
            onError: (error) => {
                const errorMessage =
                    error instanceof Error ? error.message : '获取文章表现清单失败';
                message.error(errorMessage);
            },
        },
    );

    const { loading: selectedArticleTrendLoading, run: runArticleTrendRequest } = useRequest(
        async (
            articleId: string,
            params: ArticleReportQuery,
            queryKey: string,
            requestId: number,
        ) => {
            const response = await articleReportService.getArticleTrend(articleId, params);
            return {
                articleId,
                queryKey,
                requestId,
                response,
            };
        },
        {
            manual: true,
            onSuccess: ({ articleId, queryKey, requestId, response }) => {
                if (requestId !== trendRequestIdRef.current) {
                    return;
                }

                setArticleTrendState({
                    articleId,
                    queryKey,
                    points: response.data?.trend || [],
                });
            },
            onError: (error) => {
                const errorMessage =
                    error instanceof Error ? error.message : '获取单篇文章趋势失败';
                message.error(errorMessage);
            },
        },
    );

    useEffect(() => {
        const requestId = listRequestIdRef.current + 1;
        listRequestIdRef.current = requestId;
        trendRequestIdRef.current += 1;

        runOverviewRequest(reportParams, reportQueryKey);
        runArticleListRequest(
            {
                ...reportParams,
                limit: ARTICLE_LIST_LIMIT,
                sortBy: 'uv',
                sortOrder: 'desc',
            },
            reportQueryKey,
            requestId,
            false,
        );
    }, [reportParams, reportQueryKey, runArticleListRequest, runOverviewRequest]);

    const articleRows = useMemo(
        () => (articleListState.queryKey === reportQueryKey ? articleListState.rows : []),
        [articleListState.queryKey, articleListState.rows, reportQueryKey],
    );
    const listPageInfo = useMemo(
        () =>
            articleListState.queryKey === reportQueryKey
                ? {
                      total: articleListState.total,
                      nextCursor: articleListState.nextCursor,
                      hasMore: articleListState.hasMore,
                  }
                : {
                      total: 0,
                      nextCursor: undefined,
                      hasMore: false,
                  },
        [
            articleListState.hasMore,
            articleListState.nextCursor,
            articleListState.queryKey,
            articleListState.total,
            reportQueryKey,
        ],
    );

    const loadMoreArticles = useCallback(() => {
        if (articleListLoading || !listPageInfo.hasMore || !listPageInfo.nextCursor) {
            return;
        }

        runArticleListRequest(
            {
                ...reportParams,
                cursor: listPageInfo.nextCursor,
                limit: ARTICLE_LIST_LIMIT,
                sortBy: 'uv',
                sortOrder: 'desc',
            },
            reportQueryKey,
            listRequestIdRef.current,
            true,
        );
    }, [
        articleListLoading,
        listPageInfo.hasMore,
        listPageInfo.nextCursor,
        reportParams,
        reportQueryKey,
        runArticleListRequest,
    ]);

    const overview =
        overviewResponse?.queryKey === reportQueryKey ? overviewResponse.response.data : undefined;
    const authorOptions = useMemo(() => buildAuthorOptions(overview), [overview]);
    const tagOptions = useMemo(() => buildTagOptions(overview), [overview]);

    const resolvedSelectedId = useMemo(() => {
        if (articleRows.length === 0) return '';
        if (articleRows.some((a) => a.id === selectedArticleId)) return selectedArticleId;
        return articleRows[0].id;
    }, [articleRows, selectedArticleId]);

    const selectedArticle = useMemo(
        () => articleRows.find((item) => item.id === resolvedSelectedId) ?? null,
        [articleRows, resolvedSelectedId],
    );

    useEffect(() => {
        if (!resolvedSelectedId) {
            return;
        }

        const requestId = trendRequestIdRef.current + 1;
        trendRequestIdRef.current = requestId;
        runArticleTrendRequest(resolvedSelectedId, reportParams, reportQueryKey, requestId);
    }, [reportParams, reportQueryKey, resolvedSelectedId, runArticleTrendRequest]);

    const selectedArticleTrend = useMemo(
        () =>
            articleTrendState.queryKey === reportQueryKey &&
            articleTrendState.articleId === resolvedSelectedId
                ? articleTrendState.points
                : [],
        [
            articleTrendState.articleId,
            articleTrendState.points,
            articleTrendState.queryKey,
            reportQueryKey,
            resolvedSelectedId,
        ],
    );

    const rangeLabel = useMemo(
        () =>
            overview
                ? `${overview.startDate.slice(5).replace('-', '/')} - ${overview.endDate
                      .slice(5)
                      .replace('-', '/')}`
                : buildRangeLabel(filters.selectedDateRange),
        [filters.selectedDateRange, overview],
    );
    const overviewMetrics = useMemo(
        () => buildOverviewMetrics({ overview, rangeLabel }),
        [rangeLabel, overview],
    );
    const selectedArticleOption = useMemo(
        () => buildArticleDetailOption(selectedArticleTrend),
        [selectedArticleTrend],
    );

    return {
        authorOptions,
        tagOptions,
        articleRows,
        articleTotal: overview?.overview.current.articleCount || listPageInfo.total,
        selectedArticle,
        selectedArticleId: resolvedSelectedId,
        onArticleSelect: setSelectedArticleId,
        rangeLabel,
        overviewTrend: overview?.overview.trend || [],
        overviewMetrics,
        selectedArticleOption,
        selectedArticleTrendLoading,
        loadMoreArticles,
        hasMoreArticles: listPageInfo.hasMore,
        articleListLoading,
        loading: overviewLoading || (articleListLoading && articleRows.length === 0),
    };
}
