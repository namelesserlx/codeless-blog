import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, expect, it } from 'vitest';

describe('avatar cleanup policy', () => {
    it('does not delete previous avatar files from the upload request path', () => {
        const source = readFileSync(
            resolve(__dirname, '../../src/services/system/user/index.ts'),
            'utf8',
        );
        const updateAvatarBody = source.match(
            /async updateAvatar\([\s\S]*?\n {4}}\n\n {4}\/\/ 批量操作/,
        )?.[0];

        expect(updateAvatarBody).toBeDefined();
        expect(updateAvatarBody).not.toContain('getStorage().delete');
    });
});
