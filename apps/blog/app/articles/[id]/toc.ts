import type { StoredArticleContent } from './content-format';
import { parseStoredArticleContent } from './content-format';

export interface ArticleHeading {
    level: number;
    text: string;
    id: string;
}

function getNodeContent(node: StoredArticleContent): StoredArticleContent[] {
    return Array.isArray(node.content) ? node.content : [];
}

function getNodeText(node: StoredArticleContent): string {
    if (typeof node.text === 'string') {
        return node.text;
    }

    return getNodeContent(node).map(getNodeText).filter(Boolean).join(' ');
}

function getHeadingLevel(node: StoredArticleContent): number {
    const level = node.attrs?.level;

    return typeof level === 'number' && Number.isInteger(level) && level >= 1 && level <= 6
        ? level
        : 1;
}

function createHeadingId(text: string): string {
    return text
        .toLowerCase()
        .replace(/[^a-z0-9\u4e00-\u9fa5]/g, '-')
        .replace(/-+/g, '-')
        .replace(/^-|-$/g, '');
}

export function extractTableOfContents(content: string): ArticleHeading[] {
    const document = parseStoredArticleContent(content);
    const headings: ArticleHeading[] = [];

    function visit(node: StoredArticleContent) {
        if (node.type === 'heading') {
            const text = getNodeText(node).trim();
            if (text) {
                headings.push({
                    id: createHeadingId(text),
                    level: getHeadingLevel(node),
                    text,
                });
            }
        }

        getNodeContent(node).forEach(visit);
    }

    visit(document);

    return headings;
}
