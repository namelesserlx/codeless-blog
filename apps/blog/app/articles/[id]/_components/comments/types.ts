import type { Comment } from '@blog/shared';

export interface CommentFormData {
    content: string;
    parentId?: string;
}

export interface CommentProps {
    comment: Comment;
    postId?: string;
    authorId?: number;
    onLike?: (commentId: string) => void;
    onReplyPublished?: (parentId: number, reply: Comment) => void;
    level?: number;
}

export interface CommentListProps {
    comments: Comment[];
    postId?: string;
    authorId?: number;
    onLike?: (commentId: string) => void;
    onReplyPublished?: (parentId: number, reply: Comment) => void;
    onLoadMore: () => void;
    hasMore: boolean;
    isLoading: boolean;
}

export interface CommentFormProps {
    onSubmit: (data: CommentFormData) => Promise<boolean> | boolean;
    placeholder?: string;
    buttonText?: string;
    isSubmitting?: boolean;
}
