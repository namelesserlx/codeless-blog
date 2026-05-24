import { describe, expect, it } from 'vitest';
import { storedEditorContentToText } from '../../src/utils/editor-content';

const STORED_JSON = JSON.stringify({
    type: 'doc',
    content: [
        {
            type: 'heading',
            attrs: { level: 2 },
            content: [{ type: 'text', text: 'Searchable heading' }],
        },
        {
            type: 'paragraph',
            content: [
                { type: 'text', text: 'Searchable body' },
                { type: 'hardBreak' },
                { type: 'text', text: 'with break' },
            ],
        },
    ],
});

describe('storedEditorContentToText', () => {
    it('extracts plain searchable text from TipTap JSON content', () => {
        expect(storedEditorContentToText(STORED_JSON)).toBe(
            'Searchable heading Searchable body with break',
        );
    });

    it('does not index legacy HTML tags as article text', () => {
        expect(storedEditorContentToText('<h2>Legacy HTML</h2><p>x</p>')).toBe('');
    });
});
