export interface ArticleReportQuery {
    startDate?: string;
    endDate?: string;
    authorId?: number;
    tagId?: number;
    keyword?: string;
}

export interface ArticleReportListQuery extends ArticleReportQuery {
    cursor?: string;
    limit?: number;
    sortBy?: 'uv' | 'comments' | 'likes' | 'updatedAt';
    sortOrder?: 'asc' | 'desc';
}

export interface ArticleReportOption {
    label: string;
    value: string;
}

export type ArticleReportStatus = '已发布' | '草稿' | '待发布';

export interface ArticleReportMetricSet {
    uv: number;
    comments: number;
    likeAdds: number;
}

export interface ArticleReportPoint extends ArticleReportMetricSet {
    date: string;
    label: string;
}

export interface ArticleReportTagItem {
    id: number;
    name: string;
}

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

export type ArticleReportListItem = Omit<ArticleReportItem, 'trend'>;

export interface ArticleReportOverviewCurrent extends ArticleReportMetricSet {
    articleCount: number;
    newArticleCount: number;
    uniqueAuthorCount: number;
    likes: number;
}

export interface ArticleReportOverviewPrevious extends ArticleReportMetricSet {
    newArticleCount: number;
}

export interface ArticleReportOverviewResponse {
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

export interface ArticleReportListResponse {
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

export interface ArticleReportArticleTrendResponse {
    articleId: string;
    startDate: string;
    endDate: string;
    trend: ArticleReportPoint[];
}

export interface ArticleReportResponse {
    startDate: string;
    endDate: string;
    authors: ArticleReportOption[];
    tags: ArticleReportOption[];
    overview: {
        current: ArticleReportOverviewCurrent;
        previous: ArticleReportOverviewPrevious;
        trend: ArticleReportPoint[];
    };
    articles: ArticleReportItem[];
    generatedAt: string;
}
