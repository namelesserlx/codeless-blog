// 标签基础信息
export interface Tag {
    id: number;
    name: string;
}

// 带统计信息的标签
export interface TagWithStats extends Tag {
    _count: {
        posts: number;
    };
}

// 标签列表查询请求
export interface TagListRequest {
    page?: number;
    pageSize?: number;
    name?: string;
    startTime?: string;
    endTime?: string;
}

// 标签列表响应
export interface TagListResponse {
    list: TagWithStats[];
    total: number;
    page: number;
    pageSize: number;
}

// 创建标签请求
export interface CreateTagRequest {
    name: string;
}

// 更新标签请求
export interface UpdateTagRequest {
    id: number;
    name: string;
}

// 批量操作请求
export interface BatchTagOperationRequest {
    ids: number[];
    action: 'delete';
}
