export interface HomeStats {
    articleCount: number;
    viewCount: number;
    likeCount: number;
}

export interface HomeArticle {
    id: string;
    title: string;
    summary: string;
    date: string;
    viewsCount?: number;
    commentsCount?: number;
    category?: Array<{
        id: number;
        name: string;
    }>;
    coverImage?: string;
    blurDataUrl?: string;
    cardType?: string;
}

export interface SidebarData {
    popularPosts: Array<{
        id: string;
        title: string;
        viewCount: number;
    }>;
    tags: Array<{
        id: number;
        name: string;
        count: number;
    }>;
}

export interface HomeProject {
    id: string;
    title: string;
    description: string | null;
    tags: string[];
    link: string;
    stars: number;
    forks: number;
    updatedAt: string;
}

export interface HomePageContentProps {
    homeStats: HomeStats;
    articles: HomeArticle[];
    sidebarData: SidebarData;
}
