import { describe, expect, it } from 'vitest';
import { ARTICLE_EDITOR_EXTENSION_CONFIG } from '@/pages/Blog/article/editArticle/articleEditorExtensions';

describe('article editor extensions', () => {
    it('provides the required lowlight instance to CodeBlockPro', () => {
        const lowlight = ARTICLE_EDITOR_EXTENSION_CONFIG.codeBlock.lowlight;

        expect(typeof lowlight.highlight).toBe('function');
        expect(typeof lowlight.highlightAuto).toBe('function');
        expect(typeof lowlight.listLanguages).toBe('function');
        expect(lowlight.registered('javascript')).toBe(true);
        expect(lowlight.registered('js')).toBe(true);
    });

    it('exposes common languages in the code block language menu', () => {
        expect(
            ARTICLE_EDITOR_EXTENSION_CONFIG.codeBlock.languages.map((language) => language.value),
        ).toEqual([
            'javascript',
            'typescript',
            'json',
            'shell',
            'html',
            'css',
            'markdown',
            'sql',
            'yaml',
            'dockerfile',
            'python',
            'java',
            'go',
            'rust',
        ]);
    });
});
