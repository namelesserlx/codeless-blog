import { MeiliSearch } from 'meilisearch';
import { env } from '../config/env';
import { BusinessError, ErrorCode } from '../types/errors';
import { logger } from '../utils/logger';

const meiliHost = env.meilisearch.host;
const meiliAdminKey = env.meilisearch.adminKey;

export const meiliSearchConfig = {
    host: meiliHost,
    apiKey: meiliAdminKey,
    isConfigured: Boolean(meiliHost && meiliAdminKey),
    articleIndexName: 'articles',
    tagIndexName: 'tags',
} as const;

let meiliClient: MeiliSearch | null = null;

/**
 * 索引名称常量
 */
export const SEARCH_INDEXES = {
    ARTICLES: meiliSearchConfig.articleIndexName,
    TAGS: meiliSearchConfig.tagIndexName,
} as const;

/**
 * 文章搜索文档接口
 */
export interface ArticleSearchDocument {
    id: string;
    title: string;
    content: string;
    summary: string | null;
    authorId: number;
    authorName: string;
    authorNickname: string | null;
    tags: Array<{ id: number; name: string }>;
    tagNames: string[];
    cardImageUrl: string | null;
    published: boolean;
    isDraft: boolean;
    allowComments: boolean;
    createdAt: number; // 时间戳
    updatedAt: number; // 时间戳
}

/**
 * 获取 MeiliSearch 客户端（仅在完整配置后启用）
 */
export function getMeiliClient() {
    if (!meiliSearchConfig.host && !meiliSearchConfig.apiKey) {
        return null;
    }

    if (!meiliSearchConfig.host) {
        throw new BusinessError(
            ErrorCode.UNKNOWN_ERROR,
            '[config/meilisearch] MEILI_ADMIN_KEY is set but MEILI_URL is missing',
        );
    }

    if (!meiliSearchConfig.apiKey) {
        throw new BusinessError(
            ErrorCode.UNKNOWN_ERROR,
            '[config/meilisearch] MEILI_URL is set but MEILI_ADMIN_KEY is missing',
        );
    }

    if (!meiliClient) {
        meiliClient = new MeiliSearch({
            host: meiliSearchConfig.host,
            apiKey: meiliSearchConfig.apiKey,
        });
    }

    return meiliClient;
}

export function isMeiliSearchEnabled() {
    return meiliSearchConfig.isConfigured;
}

export function getArticlesSearchIndex() {
    const client = getMeiliClient();
    return client ? client.index(SEARCH_INDEXES.ARTICLES) : null;
}

/**
 * 初始化 MeiliSearch 索引
 */
export async function initSearchIndexes(): Promise<void> {
    try {
        const articlesIndex = getArticlesSearchIndex();
        if (!articlesIndex) {
            throw new BusinessError(
                ErrorCode.UNKNOWN_ERROR,
                '[config/meilisearch] MeiliSearch is not configured for the admin server',
            );
        }

        // 配置可搜索字段
        await articlesIndex.updateSearchableAttributes([
            'title', // 标题最重要
            'summary', // 摘要其次
            'content', // 内容
            'tagNames', // 标签名称
            'authorName', // 作者名
            'authorNickname', // 作者昵称
        ]);

        // 配置过滤字段
        await articlesIndex.updateFilterableAttributes([
            'published',
            'isDraft',
            'authorId',
            'tagNames',
            'createdAt',
            'updatedAt',
        ]);

        // 配置排序字段
        await articlesIndex.updateSortableAttributes(['createdAt', 'updatedAt']);

        // 配置显示字段
        await articlesIndex.updateDisplayedAttributes([
            'id',
            'title',
            'summary',
            'content', // 添加 content 字段以支持内容搜索和显示
            'authorName',
            'authorNickname',
            'tags',
            'cardImageUrl',
            'published',
            'createdAt',
            'updatedAt',
        ]);

        // 配置排名规则
        await articlesIndex.updateRankingRules([
            'words',
            'typo',
            'proximity',
            'attribute',
            'sort',
            'exactness',
        ]);

        // 配置分词器（支持中文）
        await articlesIndex.updateSettings({
            pagination: {
                maxTotalHits: 1000,
            },
        });

        logger.info('MeiliSearch 索引初始化成功');
    } catch (error) {
        logger.error('MeiliSearch 索引初始化失败', error);
        throw error;
    }
}
