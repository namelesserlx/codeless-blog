import 'server-only';

import { Meilisearch } from 'meilisearch';
import { meiliSearchConfig } from '@/config/services/meilisearch';

let meiliClient: Meilisearch | null = null;

/**
 * 获取 MeiliSearch 客户端（仅在服务端使用）
 */
export function getMeiliClient() {
    if (!meiliSearchConfig.host && !meiliSearchConfig.apiKey) {
        return null;
    }

    if (!meiliSearchConfig.host) {
        throw new Error('[config/meilisearch] MEILI_SEARCH_KEY is set but MEILI_URL is missing');
    }

    if (!meiliSearchConfig.apiKey) {
        throw new Error('[config/meilisearch] MEILI_URL is set but MEILI_SEARCH_KEY is missing');
    }

    if (!meiliClient) {
        meiliClient = new Meilisearch({
            host: meiliSearchConfig.host,
            apiKey: meiliSearchConfig.apiKey,
        });
    }

    return meiliClient;
}

export function isMeiliSearchEnabled() {
    return meiliSearchConfig.isConfigured;
}

/**
 * 文章搜索索引
 */
export function getArticlesSearchIndex() {
    const client = getMeiliClient();
    return client ? client.index(meiliSearchConfig.articleIndexName) : null;
}
