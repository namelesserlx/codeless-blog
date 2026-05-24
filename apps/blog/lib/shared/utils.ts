import { ArticleCardProps, ArticleListItem } from '@/types';
import { type ClassValue, clsx } from 'clsx';
import { twMerge } from 'tailwind-merge';

/**
 * 合并多个类名，并解决Tailwind类名冲突
 * 用于组件变体和条件类名
 */
export function cn(...inputs: ClassValue[]) {
    return twMerge(clsx(inputs));
}

/**
 * 将从数据库获取的文章数据转换为所需的数据
 * @param article 文章数据
 * @returns 转换后的数据
 */
export function transformArticleData(article: ArticleListItem): ArticleCardProps {
    return {
        id: article.id,
        title: article.title,
        summary: article.summary || '',
        author: {
            id: article.author.id,
            username: article.author.username,
            nickname: article.author.nickname ?? undefined,
            email: article.author.email,
            avatar: article.author.avatar ?? undefined,
        },
        cardType: article.cardType as ArticleCardProps['cardType'],
        date: new Date(article.createdAt).toLocaleDateString('zh-CN'),
        viewsCount: article.viewsCount,
        likesCount: article.likesCount,
        commentsCount: article.commentsCount,
        category: article.tags || [],
        coverImage: article.cardImageUrl ?? undefined,
    };
}
