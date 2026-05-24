import { CardType } from '@blog/shared';

export interface ArticleListItem {
    id: string;
    title: string;
    summary?: string | null;
    author: {
        id: number;
        username: string;
        nickname?: string | null;
        email: string;
        avatar?: string | null;
    };
    cardType: CardType | `${CardType}`;
    createdAt: string | Date;
    viewsCount?: number;
    likesCount?: number;
    commentsCount?: number;
    tags?: {
        id: number;
        name: string;
    }[];
    cardImageUrl?: string | null;
}

export interface ArticleCardProps {
    id: string;
    title: string;
    summary: string;
    author: {
        id: number;
        username: string;
        nickname?: string;
        email: string;
        avatar?: string;
    };
    cardType: CardType;
    blurDataUrl?: string; // 文章封面图片的模糊数据URL
    date: string; // 文章发布时间
    viewsCount?: number; // 文章阅读人数
    likesCount?: number; // 文章点赞人数
    commentsCount?: number; // 文章评论人数
    category?: {
        id: number;
        name: string;
    }[]; // 文章分类
    coverImage?: string; // 文章封面图片URL
    [key: string]: unknown;
}
