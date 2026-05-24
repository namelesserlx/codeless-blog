import { useState, useEffect, useCallback } from 'react';
import { useDebounce } from './useDebounce';

/**
 * 搜索结果项接口
 */
export interface SearchResultItem {
    id: string;
    title: string;
    summary: string | null;
    // 注意：content 不在原始数据中，只在 _formatted 中作为裁剪后的片段
    authorName: string;
    authorNickname: string | null;
    tags: Array<{ id: number; name: string }>;
    cardImageUrl: string | null;
    createdAt: number;
    updatedAt: number;
    _formatted?: {
        title?: string;
        summary?: string; // 裁剪后的摘要（包含高亮）
        content?: string; // 裁剪后的内容片段（包含高亮）
    };
    _matchesPosition?: Record<string, unknown>;
}

/**
 * 搜索响应接口
 */
interface SearchResponse {
    success: boolean;
    data?: {
        hits: SearchResultItem[];
        total: number;
        limit: number;
        offset: number;
        processingTimeMs: number;
    };
    error?: string;
}

/**
 * 搜索建议响应接口
 */
interface SuggestionsResponse {
    success: boolean;
    data?: SearchResultItem[];
    error?: string;
}

let suggestionsCache: SearchResultItem[] | null = null;
let suggestionsRequest: Promise<SearchResultItem[]> | null = null;

async function requestSuggestions() {
    if (suggestionsCache) {
        return suggestionsCache;
    }

    if (!suggestionsRequest) {
        suggestionsRequest = fetch('/api/search/suggestions?limit=5')
            .then(async (response) => {
                const data: SuggestionsResponse = await response.json();

                if (!response.ok || !data.success || !data.data) {
                    throw new Error(data.error || '获取搜索建议失败');
                }

                suggestionsCache = data.data;
                return data.data;
            })
            .finally(() => {
                suggestionsRequest = null;
            });
    }

    return suggestionsRequest;
}

/**
 * 搜索 Hook
 */
export function useSearch(enabled = false) {
    const [query, setQuery] = useState('');
    const [results, setResults] = useState<SearchResultItem[]>([]);
    const [suggestions, setSuggestions] = useState<SearchResultItem[]>([]);
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const debouncedQuery = useDebounce(query, 300);

    /**
     * 获取搜索建议
     */
    const fetchSuggestions = useCallback(async () => {
        if (!enabled) {
            return;
        }

        try {
            const data = await requestSuggestions();
            setSuggestions(data);
        } catch (err) {
            console.error('获取搜索建议失败:', err);
        }
    }, [enabled]);

    /**
     * 搜索文章
     */
    const searchArticles = useCallback(async (searchQuery: string) => {
        if (!searchQuery.trim()) {
            setResults([]);
            return;
        }

        setIsLoading(true);
        setError(null);

        try {
            const response = await fetch(
                `/api/search?q=${encodeURIComponent(searchQuery)}&limit=20`,
            );
            const data: SearchResponse = await response.json();

            if (data.success && data.data) {
                setResults(data.data.hits);
            } else {
                setError(data.error || '搜索失败');
                setResults([]);
            }
        } catch (err) {
            console.error('搜索失败:', err);
            setError('搜索服务暂时不可用');
            setResults([]);
        } finally {
            setIsLoading(false);
        }
    }, []);

    /**
     * 按标签搜索
     */
    const searchByTag = useCallback(async (tag: string) => {
        setIsLoading(true);
        setError(null);

        try {
            const response = await fetch(
                `/api/search/tags?tag=${encodeURIComponent(tag)}&limit=20`,
            );
            const data: SearchResponse = await response.json();

            if (data.success && data.data) {
                setResults(data.data.hits);
            } else {
                setError(data.error || '搜索失败');
                setResults([]);
            }
        } catch (err) {
            console.error('按标签搜索失败:', err);
            setError('搜索服务暂时不可用');
            setResults([]);
        } finally {
            setIsLoading(false);
        }
    }, []);

    // 当防抖查询变化时执行搜索
    useEffect(() => {
        searchArticles(debouncedQuery);
    }, [debouncedQuery, searchArticles]);

    // 初始加载建议
    useEffect(() => {
        if (!enabled) {
            return;
        }

        void fetchSuggestions();
    }, [enabled, fetchSuggestions]);

    return {
        query,
        setQuery,
        results,
        suggestions,
        isLoading,
        error,
        searchByTag,
    };
}
