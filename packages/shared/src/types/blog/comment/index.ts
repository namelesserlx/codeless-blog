export interface Comment {
    id: number; // 评论ID
    content: string; // 评论内容
    createdAt: Date; // 创建时间
    updatedAt: Date; // 更新时间
    status: CommentStatus; // 评论状态
    ip?: string; // 评论IP地址
    userAgent?: string; // 评论用户代理
    location?: string; // 评论位置
    device?: string; // 评论设备
    likeCount: number; // 点赞数
    isEdited: boolean; // 是否编辑
    editedAt?: Date; // 编辑时间
    authorId: number; // 评论者ID
    authorName?: string; // 评论者名称
    receiverId?: number; // 接收者ID
    receiverName?: string; // 接收者名称
    postId?: string; // 文章ID
    postTitle?: string; // 文章标题
    snippetId?: string; // 片段ID
    snippetTitle?: string; // 片段标题
    parentId?: number; // 父评论ID

    // 关联数据
    author: {
        id: number;
        username: string;
        nickname: string;
        avatar?: string;
        address?: string;
    };
    receiver?: {
        id: number;
        username: string;
        nickname: string;
    };
    replies?: Comment[];
    _count?: {
        replies: number;
        likes: number;
    };
}

export enum CommentStatus {
    PUBLISHED = 'PUBLISHED',
    PENDING = 'PENDING',
    REJECTED = 'REJECTED',
    DELETED = 'DELETED',
}

export const commentStatusOptions = [
    { label: '已审核', value: CommentStatus.PUBLISHED },
    { label: '未审核', value: CommentStatus.PENDING },
    { label: '已拒绝', value: CommentStatus.REJECTED },
    { label: '已删除', value: CommentStatus.DELETED },
];

export interface CreateCommentRequest {
    content: string; // 评论内容
    postId?: string; // 文章ID
    snippetId?: string; // 片段ID
    parentId?: number; // 父评论ID
    receiverId?: number; //
    ip?: string;
    address?: string;
    userAgent?: string;
    location?: string;
    device?: string;
}

export interface CommentListRequest {
    page: number;
    pageSize: number;
    id?: number | string;
    keyword?: string;
    postId?: string;
    snippetId?: string;
    authorId?: number;
    status?: CommentStatus;
    startTime?: string;
    endTime?: string;
}

export interface UpdateCommentRequest {
    id: number | number[];
    content?: string;
    status?: CommentStatus;
}

export interface GetCommentsRequest {
    postId?: string;
    snippetId?: string;
    status?: CommentStatus;
    page?: number;
    limit?: number;
}

export interface GetCommentsResponse {
    comments: Comment[];
    pagination: {
        page: number;
        limit: number;
        total: number;
        totalPages: number;
    };
}

export interface CommentLike {
    id: number;
    commentId: number;
    userId: number;
    createdAt: Date;
}

export interface CommentStats {
    total: number;
    published: number;
    pending: number;
    rejected: number;
    deleted: number;
}

export interface ToggleCommentLikeResponse {
    liked: boolean;
    likeCount: number;
}

export interface CommentLikeInfo {
    likeCount: number;
    isLiked: boolean;
}

export interface CommentListResponse {
    list: Comment[];
    total: number;
    page: number;
    pageSize: number;
}
