'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import { CodeBlockPro } from '@tiptap-codeless/extension-code-block-pro';
import { FileUpload } from '@tiptap-codeless/extension-file-upload';
import {
    createLowlightRegistry,
    type CreateEditorExtensionsOptions,
    type EditorHighlightLanguage,
} from '@namelesserlx/editor/core/extensions';
import { Editor, useEditorController } from '@namelesserlx/editor/react';
import { ReadonlyRenderer } from '@namelesserlx/editor/readonly';
import '@namelesserlx/editor/style.css';
import { useTheme } from 'next-themes';
import { parseStoredArticleContent, type StoredArticleContent } from '../content-format';
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
import styles from './ArticleContentRenderer.module.css';

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

interface Heading {
    level: number;
    text: string;
    id: string;
}

interface ArticleContentRendererProps {
    content: string;
    headings: Heading[];
}

const ARTICLE_CONTENT_EDITOR_OPTIONS: CreateEditorExtensionsOptions = {
    features: {
        codeBlock: false,
    },
};

const ARTICLE_CONTENT_EXTENSIONS = [
    CodeBlockPro.configure({
        lowlight: articleCodeLowlight,
        languages: ARTICLE_CODE_BLOCK_LANGUAGES,
        defaultLanguage: 'javascript',
        locale: 'zh-CN',
        theme: 'auto' as const,
    }),
    FileUpload.configure({
        ingest: {
            drop: false,
            paste: false,
        },
    }),
];

function isRecord(value: unknown): value is Record<string, unknown> {
    return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function applyCodeBlockTheme(
    node: StoredArticleContent,
    theme: 'auto' | 'dark',
): StoredArticleContent {
    const content = Array.isArray(node.content)
        ? node.content.map((child) => applyCodeBlockTheme(child, theme))
        : node.content;

    if (node.type !== 'codeBlockPro') {
        return content === node.content ? node : { ...node, content };
    }

    const attrs = isRecord(node.attrs) ? node.attrs : {};

    return {
        ...node,
        attrs: {
            ...attrs,
            theme,
        },
        content,
    };
}

export function ArticleContentRenderer({ content, headings }: ArticleContentRendererProps) {
    const containerRef = useRef<HTMLDivElement>(null);
    const articleContent = useMemo(() => parseStoredArticleContent(content), [content]);

    const { resolvedTheme } = useTheme();
    const [mounted, setMounted] = useState(false);

    useEffect(() => {
        setMounted(true);
    }, []);

    const isDark = mounted && resolvedTheme === 'dark';
    const renderedContent = useMemo(
        () => applyCodeBlockTheme(articleContent, isDark ? 'dark' : 'auto'),
        [articleContent, isDark],
    );
    const readonlyController = useEditorController({
        defaultContent: renderedContent,
        contentFormat: 'json',
        readonly: true,
        locale: 'zh-CN',
        contentClassName: styles.readonlyEditorContent,
        extensions: ARTICLE_CONTENT_EXTENSIONS,
        editorOptions: ARTICLE_CONTENT_EDITOR_OPTIONS,
        markdownPaste: false,
    });
    const readonlyEditor = readonlyController.editor;

    useEffect(() => {
        if (!readonlyEditor || readonlyEditor.isDestroyed) {
            return;
        }

        readonlyEditor.commands.setContent(renderedContent, { emitUpdate: false });
    }, [readonlyEditor, renderedContent]);

    useEffect(() => {
        const container = containerRef.current;
        if (!container) {
            return;
        }

        const applyHeadingIds = () => {
            const headingElements =
                container.querySelectorAll<HTMLHeadingElement>('h1, h2, h3, h4, h5, h6');

            headingElements.forEach((headingElement, index) => {
                const heading = headings[index];
                if (!heading?.id) {
                    return;
                }
                headingElement.id = heading.id;
            });
        };

        applyHeadingIds();

        const observer = new MutationObserver(() => {
            applyHeadingIds();
        });

        observer.observe(container, { childList: true, subtree: true });

        return () => {
            observer.disconnect();
        };
    }, [headings, renderedContent]);

    return (
        <div ref={containerRef} className={styles.readonlyWrapper}>
            <article
                className={`${styles.readonlyArticle} ${isDark ? 'nlx-editor-theme-dark' : ''}`}
            >
                <Editor
                    controller={readonlyController}
                    readonly
                    editorOptions={ARTICLE_CONTENT_EDITOR_OPTIONS}
                    className={styles.readonlyEditor}
                    style={{ display: readonlyController.isReady ? undefined : 'none' }}
                />
                {readonlyController.isReady ? null : (
                    <ReadonlyRenderer
                        content={renderedContent}
                        contentFormat="json"
                        extensions={ARTICLE_CONTENT_EXTENSIONS}
                        editorOptions={ARTICLE_CONTENT_EDITOR_OPTIONS}
                        className={`${styles.readonlyEditor} ${styles.readonlyEditorContent}`}
                    />
                )}
            </article>
        </div>
    );
}
