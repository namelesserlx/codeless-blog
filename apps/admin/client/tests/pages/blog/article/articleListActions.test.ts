import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';

const currentDir = dirname(fileURLToPath(import.meta.url));
const articleListSource = readFileSync(
    join(currentDir, '../../../../src/pages/Blog/article/index.tsx'),
    'utf8',
);

function getActionButtonBlock(label: string) {
    const labelIndex = articleListSource.indexOf(label);
    expect(labelIndex).toBeGreaterThanOrEqual(0);

    const buttonStart = articleListSource.lastIndexOf('<Button', labelIndex);
    const buttonEnd = articleListSource.indexOf('</Button>', labelIndex);

    expect(buttonStart).toBeGreaterThanOrEqual(0);
    expect(buttonEnd).toBeGreaterThan(labelIndex);

    return articleListSource.slice(buttonStart, buttonEnd);
}

describe('article list action routing', () => {
    it('routes edit article to the standalone fullscreen editor with a list return source', () => {
        const editButtonBlock = getActionButtonBlock('编辑文章');

        expect(editButtonBlock).toContain('navigate(`/blog/article/edit/${record.id}/fullscreen`,');
        expect(editButtonBlock).toContain("returnPath: '/blog/article'");
    });

    it('routes article settings to the full article edit page', () => {
        const settingButtonBlock = getActionButtonBlock('设置文章');

        expect(settingButtonBlock).toContain('navigate(`/blog/article/edit/${record.id}`)');
        expect(settingButtonBlock).not.toContain('handleEdit');
    });
});
