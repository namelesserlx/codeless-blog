// 片段基础信息
export interface Snippet {
    id: string;
    title?: string;
    content: string;
    published: boolean;
    isDraft: boolean;
    allowComments: boolean;
    images?: string[]; // 图片 URL 列表
    video?: string[]; // 视频URL
    videoPoster?: string | null; // 视频封面 URL
    authorId: number;
    createdAt: string;
    updatedAt: string;
}

// 片段列表查询参数
export interface SnippetListRequest {
    page: number;
    pageSize: number;
    id?: string;
    keyword?: string;
    title?: string;
    authorId?: number;
    published?: boolean;
    isDraft?: boolean;
    startTime?: string;
    endTime?: string;
    tag?: string; // 标签过滤
}

// 创建片段请求
export interface CreateSnippetRequest {
    title?: string;
    content: string;
    published?: boolean;
    isDraft?: boolean;
    allowComments?: boolean;
    images?: string[]; // 图片 URL 列表
    video?: string[]; // 视频 URL 列表
    videoPoster?: string; // 视频封面 URL
}

// 片段列表响应
export interface SnippetListResponse {
    list: Snippet[];
    total: number;
    page: number;
    pageSize: number;
}

// 更新片段请求
export interface UpdateSnippetRequest extends CreateSnippetRequest {
    id: string;
}

// 点赞请求
export interface SnippetLikeRequest {
    visitorId: string;
}

// 点赞响应
export interface SnippetLikeResponse {
    ok: boolean;
    liked: boolean;
    count: number;
}

// 浏览记录请求
export interface SnippetViewRequest {
    visitorId: string;
}

// 浏览记录响应
export interface SnippetViewResponse {
    ok: boolean;
}

// 阅读时长记录请求
export interface SnippetReadTimeRequest {
    visitorId: string;
    deltaSeconds: number;
}

// 阅读时长记录响应
export interface SnippetReadTimeResponse {
    ok: boolean;
}

// 媒体解析结果
export interface ParsedMedia {
    images: string[];
    videos: string[];
    textContent: string;
}
