import { parseStoredArticleContent, type ArticleEditorContent } from './articleEditorContent';

const ARTICLE_EDIT_DRAFT_PREFIX = 'blog:article:edit-draft:';

export interface ArticleEditDraft {
    articleId: string;
    content: ArticleEditorContent;
    formValues?: Record<string, unknown>;
    returnPath?: string;
    updatedAt: number;
}

function getDraftStorageKey(articleId: string) {
    return `${ARTICLE_EDIT_DRAFT_PREFIX}${articleId}`;
}

function canUseSessionStorage() {
    return typeof window !== 'undefined' && typeof window.sessionStorage !== 'undefined';
}

function normalizeDraftContent(value: unknown): ArticleEditorContent | null {
    if (!value || typeof value !== 'object') {
        return null;
    }

    try {
        return parseStoredArticleContent(JSON.stringify(value));
    } catch {
        return null;
    }
}

function isRecord(value: unknown): value is Record<string, unknown> {
    return typeof value === 'object' && value !== null && !Array.isArray(value);
}

export function readArticleEditDraft(articleId: string): ArticleEditDraft | null {
    if (!canUseSessionStorage()) {
        return null;
    }

    try {
        const rawValue = window.sessionStorage.getItem(getDraftStorageKey(articleId));
        if (!rawValue) {
            return null;
        }

        const rawDraft = JSON.parse(rawValue) as unknown;
        if (!isRecord(rawDraft) || rawDraft.articleId !== articleId) {
            return null;
        }

        const content = normalizeDraftContent(rawDraft.content);
        if (!content) {
            return null;
        }

        return {
            articleId,
            content,
            formValues: isRecord(rawDraft.formValues) ? rawDraft.formValues : undefined,
            returnPath: typeof rawDraft.returnPath === 'string' ? rawDraft.returnPath : undefined,
            updatedAt: typeof rawDraft.updatedAt === 'number' ? rawDraft.updatedAt : 0,
        };
    } catch {
        return null;
    }
}

export function writeArticleEditDraft(
    articleId: string,
    draft: Pick<ArticleEditDraft, 'content' | 'formValues' | 'returnPath'>,
): ArticleEditDraft | null {
    if (!canUseSessionStorage()) {
        return null;
    }

    const nextDraft: ArticleEditDraft = {
        articleId,
        content: draft.content,
        formValues: draft.formValues,
        returnPath: draft.returnPath,
        updatedAt: Date.now(),
    };

    try {
        window.sessionStorage.setItem(getDraftStorageKey(articleId), JSON.stringify(nextDraft));
        return nextDraft;
    } catch {
        return null;
    }
}

export function clearArticleEditDraft(articleId: string) {
    if (!canUseSessionStorage()) {
        return;
    }

    window.sessionStorage.removeItem(getDraftStorageKey(articleId));
}
