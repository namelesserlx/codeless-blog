export interface SnippetAuthor {
    id: number;
    username: string;
    nickname?: string | null;
    avatar?: string | null;
}

export interface SnippetMediaItem {
    id: string;
    type: 'image' | 'video';
    url: string;
    posterUrl?: string;
    aspectRatio?: number;
}

export interface SnippetListItem {
    id: string;
    title?: string | null;
    content: string;
    excerpt: string;
    createdAt: string;
    updatedAt: string;
    relativeCreatedAt: string;
    author: SnippetAuthor;
    media: SnippetMediaItem[];
    likesCount: number;
    commentsCount: number;
    viewsCount: number;
}

export interface SnippetPagination {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
}

export interface SnippetListResponse {
    snippets: SnippetListItem[];
    pagination: SnippetPagination;
}

export interface SnippetCommentItem {
    id: number;
    content: string;
    createdAt: string;
    author: {
        id: number;
        username: string;
        nickname?: string | null;
        avatar?: string | null;
    };
}
