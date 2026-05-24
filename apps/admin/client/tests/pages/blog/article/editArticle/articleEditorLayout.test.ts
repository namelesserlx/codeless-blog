import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';

const currentDir = dirname(fileURLToPath(import.meta.url));
const articleEditorDir = join(currentDir, '../../../../../src/pages/Blog/article/editArticle');
const source = readFileSync(join(articleEditorDir, 'index.tsx'), 'utf8');
const editorSource = readFileSync(join(articleEditorDir, 'ArticleEditor.tsx'), 'utf8');
const fullscreenSource = readFileSync(join(articleEditorDir, 'fullscreen.tsx'), 'utf8');
const routeSource = readFileSync(
    join(currentDir, '../../../../../src/config/admin-routes.ts'),
    'utf8',
);
const styles = readFileSync(join(articleEditorDir, 'index.module.less'), 'utf8');
const fullscreenContentBlock = styles.match(/\.fullscreenEditorContent\s*\{[^}]*\}/)?.[0] ?? '';

describe('article editor layout wiring', () => {
    it('keeps the embedded editor content padded inside its border', () => {
        expect(styles).toContain('.editorContent1');
        expect(styles).toContain('padding: 24px 28px;');
        expect(styles).toContain('box-sizing: border-box;');
    });

    it('opens fullscreen editing as a standalone route instead of an Ant Design modal', () => {
        expect(routeSource).toContain("path: 'blog/article/edit/:id/fullscreen'");
        expect(source).toContain('writeArticleEditDraft');
        expect(source).toContain('navigate(`/blog/article/edit/${id}/fullscreen`,');
        expect(source).toContain("source: 'article-settings'");
        expect(source).not.toContain('NiceModal');
        expect(source).not.toContain('<Modal');
    });

    it('keeps the standalone fullscreen editor on the same viewport-owned chrome', () => {
        expect(fullscreenSource).toContain('styles.fullscreenEditorInstance');
        expect(fullscreenSource).toContain('styles.fullscreenEditor');
        expect(styles).toContain('.fullscreenEditorInstance');
        expect(styles).toContain('max-width: 100vw');
    });

    it('uses a plain back icon for leaving the standalone fullscreen page', () => {
        expect(fullscreenSource).toContain('ArrowLeftOutlined');
        expect(fullscreenSource).toContain('icon={<ArrowLeftOutlined />}');
        expect(fullscreenSource).toContain('useLocation');
        expect(fullscreenSource).toContain('navigate(returnPath,');
        expect(fullscreenSource).toContain('{ replace: true }');
        expect(fullscreenSource).not.toContain('navigate(-1)');
        expect(fullscreenSource).not.toContain('FullscreenExitOutlined');
        expect(fullscreenSource).not.toContain('退出全屏 (ESC)');
        expect(fullscreenSource).not.toContain('<Tooltip');
    });

    it('hides floating editor menus before navigating away from fullscreen', () => {
        expect(fullscreenSource).toContain('hideEditorFloatingUiBeforeRouteLeave');
        expect(fullscreenSource).toContain("pluginKey?.startsWith('bubbleMenu')");
        expect(fullscreenSource).toContain("transaction.setMeta(plugin, 'hide')");
        expect(fullscreenSource).toContain("transaction.setMeta('hideDragHandle', true)");
        expect(fullscreenSource).toContain('detachEditorNodeViewsBeforeRouteLeave');
        expect(fullscreenSource).toContain('nodeViews: {}');
        expect(fullscreenSource).toContain('setEditorMounted(false)');
        expect(fullscreenSource).toContain('window.requestAnimationFrame');
    });

    it('uses the JSON editor content element for fullscreen heading navigation', () => {
        expect(fullscreenSource).toContain('[data-nameless-editor-content="true"]');
        expect(source).not.toContain('.ProseMirror[class*="fullscreenEditorContent"]');
    });

    it('keeps fullscreen editing visually unframed instead of a paper preview', () => {
        expect(fullscreenContentBlock).toContain('border: none;');
        expect(fullscreenContentBlock).not.toContain('border-radius:');
        expect(fullscreenContentBlock).not.toContain('padding: 48px 72px;');
    });

    it('lifts codeless floating controls above the standalone fullscreen page', () => {
        expect(fullscreenSource).toContain('article-editor-fullscreen-active');
        expect(fullscreenSource).toContain('document.body.classList.add(FULLSCREEN_BODY_CLASS)');
        expect(styles).toContain(
            ':global(body.article-editor-fullscreen-active .tiptap-drag-handle-container)',
        );
        expect(styles).toContain('z-index: 10010 !important;');
    });

    it('defers fullscreen JSON reads until the user pauses typing or exits', () => {
        expect(fullscreenSource).toContain('window.setTimeout');
        expect(fullscreenSource).toContain('fullscreenEditorRef.current?.getJSON()');
        expect(fullscreenSource).toContain('scheduleContentSync');
        expect(fullscreenSource).not.toContain('onChange={setEditorContent}');
    });

    it('quietly autosaves fullscreen content to the server every five seconds', () => {
        expect(fullscreenSource).toContain('const AUTO_SAVE_INTERVAL_MS = 5000');
        expect(fullscreenSource).toContain('window.setInterval');
        expect(fullscreenSource).toContain('articleService.updateArticle');
        expect(fullscreenSource).toContain('serializeArticleEditorContent');
        expect(fullscreenSource).toContain('lastAutoSavedContentRef');
    });

    it('supports manual fullscreen save from Ctrl+S and Cmd+S', () => {
        expect(fullscreenSource).toContain('manualSaveContent');
        expect(fullscreenSource).toContain("event.key.toLowerCase() === 's'");
        expect(fullscreenSource).toContain('(event.ctrlKey || event.metaKey)');
        expect(fullscreenSource).toContain('event.preventDefault()');
        expect(fullscreenSource).toContain('message.success');
        expect(fullscreenSource).toContain('message.error');
    });

    it('does not feed every editor input back into the embedded editor value prop', () => {
        expect(source).toContain('editorContentRef.current');
        expect(source).toContain('recordEditorContentUpdate');
        expect(source).not.toContain('onChange={setEditorContent}');
    });

    it('uses controller metadata instead of returning full JSON on every input', () => {
        expect(editorSource).toContain('useEditorController');
        expect(editorSource).toContain('onUpdate');
        expect(source).toContain(
            'meta?.isEmpty ?? isArticleEditorContentEmpty(editorContentRef.current)',
        );
        expect(source).not.toContain('outputFormat="json"');
        expect(source).not.toContain('debounceMs={120}');
    });

    it('keeps package chrome UI while leaving slash commands to business codeless extensions', () => {
        expect(editorSource).toContain("locale: 'zh-CN'");
        expect(editorSource).toContain('toolbar: true');
        expect(editorSource).toContain('bubbleMenu: true');
        expect(editorSource).not.toContain('slashMenu:');
        expect(editorSource).toContain('linkPopover: true');
        expect(editorSource).toContain('colorPicker: true');
        expect(editorSource).toContain('ARTICLE_EDITOR_EXTENSIONS');
        expect(editorSource).toContain('@namelesserlx/editor/style.css');
    });
});
