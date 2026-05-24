import { memo, useEffect, useMemo, useRef } from 'react';
import {
    useEditorController,
    type EditorController,
    type EditorUpdateMeta,
} from '@namelesserlx/editor/react/controller';
import { Editor } from '@namelesserlx/editor/react/editor';
import '@namelesserlx/editor/style.css';
import {
    ARTICLE_EDITOR_EXTENSIONS,
    ARTICLE_EDITOR_OPTIONS,
    createArticleEditorExtensions,
} from './articleEditorExtensions';
import type { ArticleEditorContent } from './articleEditorContent';

export type ArticleTiptapEditor = NonNullable<EditorController['editor']>;
export type ArticleEditorUpdateMeta = Pick<EditorUpdateMeta, 'isEmpty'>;

interface ArticleEditorProps {
    content: ArticleEditorContent;
    onUpdate: (meta?: ArticleEditorUpdateMeta) => void;
    onReady?: (editor: ArticleTiptapEditor) => void;
    articleId?: string | number;
    className?: string;
    contentClassName?: string;
}

const ArticleEditorBase: React.FC<ArticleEditorProps> = ({
    content,
    onUpdate,
    onReady,
    articleId,
    className,
    contentClassName,
}) => {
    const appliedContentRef = useRef(content);
    const extensions = useMemo(
        () =>
            articleId == null
                ? ARTICLE_EDITOR_EXTENSIONS
                : createArticleEditorExtensions(articleId),
        [articleId],
    );
    const controller = useEditorController({
        defaultContent: content,
        contentFormat: 'json',
        locale: 'zh-CN',
        onUpdate,
        onReady,
        contentClassName,
        extensions,
        editorOptions: ARTICLE_EDITOR_OPTIONS,
    });

    useEffect(() => {
        if (appliedContentRef.current === content) {
            return;
        }

        appliedContentRef.current = content;
        controller.setContent(content, { format: 'json', emitUpdate: false });
        controller.markClean();
    }, [content, controller]);

    return (
        <Editor
            controller={controller}
            className={className}
            contentClassName={contentClassName}
            editorOptions={ARTICLE_EDITOR_OPTIONS}
            ui={{
                toolbar: true,
                bubbleMenu: true,
                linkPopover: true,
                colorPicker: true,
            }}
        />
    );
};

export const ArticleEditor = memo(ArticleEditorBase);
ArticleEditor.displayName = 'ArticleEditor';
