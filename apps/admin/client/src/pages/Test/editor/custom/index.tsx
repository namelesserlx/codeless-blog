import { useMemo, useState } from 'react';
import { useEditorController } from '@namelesserlx/editor/react/controller';
import { Editor } from '@namelesserlx/editor/react/editor';
import type { CreateEditorExtensionsOptions } from '@namelesserlx/editor/core/extensions';
import type { EditorValue } from '@namelesserlx/editor/core/model';

const INITIAL_CONTENT: EditorValue<'json'> = {
    type: 'doc',
    content: [
        {
            type: 'paragraph',
            content: [{ type: 'text', text: '这是 @namelesserlx/editor 的 JSON 测试页。' }],
        },
    ],
};

export function Component() {
    const [content, setContent] = useState<EditorValue<'json'>>(INITIAL_CONTENT);

    const editorOptions = useMemo<CreateEditorExtensionsOptions>(
        () => ({
            codeBlock: {
                defaultLanguage: 'javascript',
            },
        }),
        [],
    );

    const editor = useEditorController({
        defaultContent: INITIAL_CONTENT,
        editorOptions,
    });

    return (
        <div style={{ padding: 24 }}>
            <h3 style={{ marginBottom: 12 }}>@namelesserlx/editor 自定义封装测试</h3>
            <p style={{ marginBottom: 16, color: '#666' }}>
                路由：<code>/editor/custom</code>
            </p>

            <Editor controller={editor} style={{ minHeight: 420 }} />

            <button
                type="button"
                style={{ marginTop: 16 }}
                onClick={() => setContent(editor.getJSON())}
            >
                读取当前 JSON
            </button>

            <pre
                style={{
                    marginTop: 16,
                    padding: 12,
                    border: '1px solid #eee',
                    borderRadius: 6,
                    background: '#fafafa',
                    maxHeight: 240,
                    overflow: 'auto',
                    whiteSpace: 'pre-wrap',
                    wordBreak: 'break-all',
                }}
            >
                {JSON.stringify(content, null, 2)}
            </pre>
        </div>
    );
}
