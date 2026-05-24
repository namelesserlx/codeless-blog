interface EditorJsonNode {
    type?: string;
    text?: unknown;
    content?: unknown;
}

function isEditorJsonNode(value: unknown): value is EditorJsonNode {
    return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function getNodeText(node: EditorJsonNode): string {
    if (typeof node.text === 'string') {
        return node.text;
    }

    if (!Array.isArray(node.content)) {
        return '';
    }

    return node.content.filter(isEditorJsonNode).map(getNodeText).filter(Boolean).join(' ');
}

export function storedEditorContentToText(content: string | null | undefined): string {
    if (!content?.trim()) {
        return '';
    }

    try {
        const parsed = JSON.parse(content);

        if (!isEditorJsonNode(parsed) || parsed.type !== 'doc') {
            return '';
        }

        return getNodeText(parsed).replace(/\s+/g, ' ').trim();
    } catch {
        return '';
    }
}
