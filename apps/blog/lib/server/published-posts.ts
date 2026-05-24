import 'server-only';

export const PUBLISHED_POST_SEARCH_FILTERS = ['published = true', 'isDraft = false'] as const;

export function normalizeTagName(tagName?: string | null) {
    const normalizedTagName = tagName?.trim();

    return normalizedTagName ? normalizedTagName : undefined;
}

export function buildPublishedPostWhere(tagName?: string | null) {
    const normalizedTagName = normalizeTagName(tagName);

    if (!normalizedTagName) {
        return {
            published: true,
            isDraft: false,
        };
    }

    return {
        published: true,
        isDraft: false,
        tags: {
            some: {
                name: normalizedTagName,
            },
        },
    };
}

export function buildPublishedPostSearchFilters(extraFilters: string[] = []) {
    return [...extraFilters, ...PUBLISHED_POST_SEARCH_FILTERS];
}

export function isPublishedPost(post: { published: boolean; isDraft: boolean | null }) {
    return post.published && !post.isDraft;
}
