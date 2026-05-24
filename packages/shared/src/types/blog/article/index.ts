// 卡片类型枚举
export enum CardType {
    LARGE_IMAGE = 'LARGE_IMAGE',
    SMALL_IMAGE = 'SMALL_IMAGE',
}

// 卡片类型标签映射
export const CardTypeLabels = {
    [CardType.LARGE_IMAGE]: '大头图',
    [CardType.SMALL_IMAGE]: '小头图',
} as const;

// 卡片类型颜色映射
export const CardTypeColors = {
    [CardType.LARGE_IMAGE]: 'blue',
    [CardType.SMALL_IMAGE]: 'green',
} as const;

// 文章基础信息
export interface Article {
    id: string;
    title: string;
    content: string;
    summary?: string; // 文章摘要/简介
    published: boolean;
    isDraft: boolean;
    allowComments: boolean;
    cardType: CardType;
    cardImageUrl?: string;
    authorId: number;
    createdAt: string;
    updatedAt: string;
}

export interface ArticleOption {
    articleId: string;
    articleTitle: string;
}

// 带有作者信息的文章
export interface ArticleWithAuthor extends Article {
    author: {
        id: number;
        username: string;
        nickname?: string;
        email: string;
        avatar?: string;
    };
}

// 带有标签的文章
export interface ArticleWithTags extends ArticleWithAuthor {
    tags: {
        id: number;
        name: string;
    }[];
}

// 文章列表项：列表接口不返回正文，避免大正文消耗带宽
export type ArticleListItem = Omit<ArticleWithTags, 'content'>;

// 有关文章的所有数据
export interface ArticleAllData extends Article {
    author: {
        id: number;
        username: string;
        nickname?: string;
        email: string;
        avatar?: string;
    };
    tags: {
        id: number;
        name: string;
    }[];
    commentsCount?: number;
    likesCount?: number;
    viewsCount?: number;
    currentVisitorReadTime?: number;
    isLikedByCurrentVisitor?: boolean;
}

// 文章列表查询参数
export interface ArticleListRequest {
    page: number;
    pageSize: number;
    keyword?: string;
    title?: string;
    authorId?: number;
    published?: boolean;
    isDraft?: boolean;
    cardType?: CardType;
    startTime?: string;
    endTime?: string;
}

// 文章列表响应
export interface ArticleListResponse {
    list: ArticleListItem[];
    total: number;
    page: number;
    pageSize: number;
}

// 创建文章请求
export interface CreateArticleRequest {
    title: string;
    content: string;
    summary?: string; // 文章摘要
    published?: boolean;
    isDraft?: boolean;
    allowComments?: boolean;
    cardType?: CardType;
    cardImageUrl?: string;
    tagIds?: number[];
}

// 更新文章请求
export interface UpdateArticleRequest {
    id: string;
    title?: string;
    content?: string;
    summary?: string; // 文章摘要
    published?: boolean;
    isDraft?: boolean;
    allowComments?: boolean;
    cardType?: CardType;
    cardImageUrl?: string;
    tagIds?: number[];
}

// 文章详情响应
export type ArticleDetailResponse = ArticleWithTags;

// 批量操作请求
export interface ArticleBatchOperationRequest {
    ids: string[];
    action: 'delete' | 'publish' | 'unpublish' | 'draft' | 'undraft';
}

// 文章统计信息
export interface ArticleStatsResponse {
    total: number;
    published: number;
    draft: number;
    unpublished: number;
}

// 标签选项
export interface TagOption {
    id: number;
    name: string;
}

// 作者选项
export interface AuthorOption {
    id: number;
    username: string;
    nickname?: string;
}

// 一键总结请求
export interface GenerateSummaryRequest {
    content: string;
    model?: 'deepseek-v4-flash' | 'deepseek-v4-pro';
}

// 一键总结响应
export interface GenerateSummaryResponse {
    summary: string;
}

/**
 * 文章导出条目
 * 导出时会携带原始 ID 及创建/更新时间，便于追踪，但导入时不强制使用这些字段
 */
export interface ArticleExportItem extends CreateArticleRequest {
    /**
     * 原始文章 ID（来自 Post.id）
     */
    originalId: string;
    /**
     * 原始创建时间（ISO 字符串）
     */
    createdAt: string;
    /**
     * 原始更新时间（ISO 字符串）
     */
    updatedAt: string;
}

/**
 * 文章导出响应：直接返回导出条目数组，方便作为 JSON 文件保存
 */
export type ArticleExportResponse = ArticleExportItem[];

/**
 * 文章导入请求
 */
export interface ArticleImportRequest {
    articles: ArticleExportItem[];
}

/**
 * 单条文章导入结果
 */
export interface ArticleImportResultItem {
    /**
     * 导出时的原始文章 ID
     */
    originalId: string;
    /**
     * 新创建的文章 ID（如果导入成功）
     */
    newId?: string;
    /**
     * 文章标题
     */
    title: string;
    /**
     * 是否导入成功
     */
    success: boolean;
    /**
     * 导入失败时的错误信息
     */
    errorMessage?: string;
}

/**
 * 文章导入响应
 */
export interface ArticleImportResponse {
    /**
     * 本次导入的文章总数
     */
    total: number;
    /**
     * 导入成功数量
     */
    successCount: number;
    /**
     * 导入失败数量
     */
    failCount: number;
    /**
     * 每条文章的导入结果
     */
    results: ArticleImportResultItem[];
}

/**
 * 创建文章预览请求
 */
export interface CreateArticlePreviewRequest {
    article: ArticleDetailResponse;
}

/**
 * 创建文章预览响应
 */
export interface CreateArticlePreviewResponse {
    token: string;
    expiresAt: string;
}
