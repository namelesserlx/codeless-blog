import { normalizePaletteColors } from '@namelesserlx/editor/core';
import {
    createEmptyDocument,
    normalizeEditorJson,
    type EditorValue,
} from '@namelesserlx/editor/core/model';

export type StoredArticleContent = EditorValue<'json'>;

const ARTICLE_CONTENT_CUSTOM_NODE_TYPES = [
    'codeBlockPro',
    'uploadImage',
    'uploadVideo',
    'uploadFileCard',
];

function getNodeContent(node: StoredArticleContent): StoredArticleContent[] {
    return Array.isArray(node.content) ? node.content : [];
}

function getNodeText(node: StoredArticleContent): string {
    if (typeof node.text === 'string') {
        return node.text;
    }

    return getNodeContent(node).map(getNodeText).filter(Boolean).join(' ');
}

export function parseStoredArticleContent(
    content: string | null | undefined,
): StoredArticleContent {
    if (!content?.trim()) {
        return createEmptyDocument();
    }

    try {
        return normalizePaletteColors(
            normalizeEditorJson(JSON.parse(content), {
                customNodeTypes: ARTICLE_CONTENT_CUSTOM_NODE_TYPES,
            }),
        );
    } catch {
        return createEmptyDocument();
    }
}

export function storedArticleContentToText(content: string | null | undefined): string {
    return getNodeText(parseStoredArticleContent(content)).replace(/\s+/g, ' ').trim();
}
