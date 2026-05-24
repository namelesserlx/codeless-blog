import {
    getEditorContentText,
    normalizeEditorContent,
    type EditorValue,
} from '@namelesserlx/editor/core';
import { createEmptyDocument } from '@namelesserlx/editor/core/model';
import { ARTICLE_EDITOR_EXTENSIONS, ARTICLE_EDITOR_OPTIONS } from './articleEditorExtensions';

export type ArticleEditorContent = EditorValue<'json'>;

const ARTICLE_EDITOR_CONTENT_OPTIONS = {
    extensions: ARTICLE_EDITOR_EXTENSIONS,
    editorOptions: ARTICLE_EDITOR_OPTIONS,
};

export interface ArticleEditorHeading {
    id: string;
    level: number;
    text: string;
}

function isRecord(value: unknown): value is Record<string, unknown> {
    return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function getNodeContent(node: ArticleEditorContent): ArticleEditorContent[] {
    return Array.isArray(node.content) ? node.content : [];
}

function getNodeText(node: ArticleEditorContent): string {
    if (typeof node.text === 'string') {
        return node.text;
    }

    return getNodeContent(node).map(getNodeText).filter(Boolean).join(' ');
}

function getHeadingLevel(node: ArticleEditorContent): number {
    const attrs = isRecord(node.attrs) ? node.attrs : {};
    const level = attrs.level;

    return typeof level === 'number' && Number.isInteger(level) && level >= 1 && level <= 6
        ? level
        : 1;
}

export function parseStoredArticleContent(
    content: string | null | undefined,
): ArticleEditorContent {
    if (!content?.trim()) {
        return createEmptyDocument();
    }

    try {
        return normalizeEditorContent(JSON.parse(content), ARTICLE_EDITOR_CONTENT_OPTIONS);
    } catch {
        return createEmptyDocument();
    }
}

export function serializeArticleEditorContent(content: ArticleEditorContent): string {
    return JSON.stringify(normalizeEditorContent(content, ARTICLE_EDITOR_CONTENT_OPTIONS));
}

export function articleEditorContentToText(content: ArticleEditorContent): string {
    return getEditorContentText(content, ARTICLE_EDITOR_CONTENT_OPTIONS);
}

export function isArticleEditorContentEmpty(content: ArticleEditorContent): boolean {
    return articleEditorContentToText(content).length === 0;
}

export function extractHeadingsFromArticleEditorContent(
    content: ArticleEditorContent,
): ArticleEditorHeading[] {
    const headings: ArticleEditorHeading[] = [];

    function visit(node: ArticleEditorContent) {
        if (node.type === 'heading') {
            const text = getNodeText(node).trim();
            if (text) {
                const level = getHeadingLevel(node);
                headings.push({
                    id: `heading-${headings.length}-${level}`,
                    level,
                    text,
                });
            }
        }

        getNodeContent(node).forEach(visit);
    }

    visit(normalizeEditorContent(content, ARTICLE_EDITOR_CONTENT_OPTIONS));

    return headings;
}
