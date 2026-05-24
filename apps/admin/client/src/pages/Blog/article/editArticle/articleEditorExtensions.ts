import { CodeBlockPro } from '@tiptap-codeless/extension-code-block-pro';
import { DragHandle } from '@tiptap-codeless/extension-drag-handle';
import {
    FileUpload,
    type FileKind,
    type StoredAsset,
    type UploadHandler,
} from '@tiptap-codeless/extension-file-upload';
import {
    createLowlightRegistry,
    type CreateEditorExtensionsOptions,
    type EditorHighlightLanguage,
} from '@namelesserlx/editor/core/extensions';
import { sanitizeUrl, type UrlPolicy } from '@namelesserlx/editor/security';
import { globalService } from '@/services/global';
import bash from 'highlight.js/lib/languages/bash';
import css from 'highlight.js/lib/languages/css';
import dockerfile from 'highlight.js/lib/languages/dockerfile';
import go from 'highlight.js/lib/languages/go';
import java from 'highlight.js/lib/languages/java';
import javascript from 'highlight.js/lib/languages/javascript';
import json from 'highlight.js/lib/languages/json';
import markdown from 'highlight.js/lib/languages/markdown';
import python from 'highlight.js/lib/languages/python';
import rust from 'highlight.js/lib/languages/rust';
import sql from 'highlight.js/lib/languages/sql';
import typescript from 'highlight.js/lib/languages/typescript';
import xml from 'highlight.js/lib/languages/xml';
import yaml from 'highlight.js/lib/languages/yaml';

const ARTICLE_CODE_LANGUAGES: EditorHighlightLanguage[] = [
    {
        name: 'javascript',
        label: 'JavaScript',
        aliases: ['js', 'jsx'],
        grammar: javascript,
    },
    {
        name: 'typescript',
        label: 'TypeScript',
        aliases: ['ts', 'tsx'],
        grammar: typescript,
    },
    {
        name: 'json',
        label: 'JSON',
        grammar: json,
    },
    {
        name: 'shell',
        label: 'Shell',
        aliases: ['bash', 'sh', 'zsh'],
        grammar: bash,
    },
    {
        name: 'html',
        label: 'HTML',
        aliases: ['xml'],
        grammar: xml,
    },
    {
        name: 'css',
        label: 'CSS',
        grammar: css,
    },
    {
        name: 'markdown',
        label: 'Markdown',
        aliases: ['md'],
        grammar: markdown,
    },
    {
        name: 'sql',
        label: 'SQL',
        aliases: ['mysql', 'postgres', 'postgresql'],
        grammar: sql,
    },
    {
        name: 'yaml',
        label: 'YAML',
        aliases: ['yml'],
        grammar: yaml,
    },
    {
        name: 'dockerfile',
        label: 'Dockerfile',
        aliases: ['docker'],
        grammar: dockerfile,
    },
    {
        name: 'python',
        label: 'Python',
        aliases: ['py'],
        grammar: python,
    },
    {
        name: 'java',
        label: 'Java',
        grammar: java,
    },
    {
        name: 'go',
        label: 'Go',
        aliases: ['golang'],
        grammar: go,
    },
    {
        name: 'rust',
        label: 'Rust',
        aliases: ['rs'],
        grammar: rust,
    },
];

const ARTICLE_ASSET_URL_POLICY: UrlPolicy = {
    allowedProtocols: ['http:', 'https:'],
    allowRelativeUrls: true,
    allowProtocolRelativeUrls: false,
};

const articleCodeLowlight = createLowlightRegistry(ARTICLE_CODE_LANGUAGES);
const ARTICLE_CODE_BLOCK_LANGUAGES = [
    ...ARTICLE_CODE_LANGUAGES.map((language) => ({
        value: language.name,
        label: language.label ?? language.name,
        aliases: language.aliases,
    })),
    {
        value: 'mermaid',
        label: 'Mermaid',
        aliases: ['mmd', 'mid'],
    },
];

function sanitizeArticleAssetUrl(value: unknown): string | null {
    return typeof value === 'string' ? sanitizeUrl(value, ARTICLE_ASSET_URL_POLICY) : null;
}

function resolveUploadAssetKind(mimeType: string): FileKind {
    if (mimeType.startsWith('image/')) {
        return 'image';
    }

    if (mimeType.startsWith('video/')) {
        return 'video';
    }

    return 'file';
}

export function createArticleUploadHandler(articleId?: string | number): UploadHandler {
    return async (files) => {
        const assets = await Promise.all(
            files.map(async (file): Promise<StoredAsset> => {
                const response = await globalService.upload(file, articleId);
                const url = sanitizeArticleAssetUrl(response.data.url);

                if (!url) {
                    throw new Error('上传接口返回了不安全的资源地址');
                }
                return {
                    kind: resolveUploadAssetKind(file.type),
                    url: response.data.url,
                    name: file.name,
                    mimeType: file.type,
                    size: file.size,
                };
            }),
        );

        return { assets };
    };
}

export const uploadArticleAssets: UploadHandler = createArticleUploadHandler();

export const ARTICLE_EDITOR_EXTENSION_CONFIG = {
    codeBlock: {
        lowlight: articleCodeLowlight,
        languages: ARTICLE_CODE_BLOCK_LANGUAGES,
        locale: 'zh-CN',
        defaultLanguage: 'javascript',
        theme: 'auto' as const,
    },
    dragHandle: {
        insertMenu: {
            trigger: '/',
        },
    },
    fileUpload: {
        storage: {
            mode: 'custom',
            upload: uploadArticleAssets,
        },
        ui: {
            bubbleMenu: {
                enabled: true,
                zIndex: 10020,
            },
        },
    },
};

export const ARTICLE_EDITOR_OPTIONS: CreateEditorExtensionsOptions = {
    features: {
        codeBlock: false,
    },
};

export function createArticleEditorExtensions(articleId?: string | number) {
    return [
        CodeBlockPro.configure(ARTICLE_EDITOR_EXTENSION_CONFIG.codeBlock),
        DragHandle.configure(ARTICLE_EDITOR_EXTENSION_CONFIG.dragHandle),
        FileUpload.configure({
            ...ARTICLE_EDITOR_EXTENSION_CONFIG.fileUpload,
            storage: {
                ...ARTICLE_EDITOR_EXTENSION_CONFIG.fileUpload.storage,
                upload: createArticleUploadHandler(articleId),
            },
        }),
    ];
}

export const ARTICLE_EDITOR_EXTENSIONS = createArticleEditorExtensions();
