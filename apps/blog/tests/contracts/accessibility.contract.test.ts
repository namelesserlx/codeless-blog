import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { fromBlogApp } from '../test-paths';

const registerDialogPath = fromBlogApp('components', 'login', 'RegisterDialog.tsx');
const loginDialogPath = fromBlogApp('components', 'login', 'LoginDialog.tsx');
const commentFormPath = fromBlogApp(
    'app',
    'articles',
    '[id]',
    '_components',
    'comments',
    'CommentForm.tsx',
);

describe('accessibility contracts', () => {
    it('adds semantic ids and autocomplete metadata to the register form', () => {
        const source = readFileSync(registerDialogPath, 'utf8');

        expect(source.includes('htmlFor="register-username"')).toBe(true);
        expect(source.includes('id="register-username"')).toBe(true);
        expect(source.includes('name="username"')).toBe(true);
        expect(source.includes('autoComplete="username"')).toBe(true);
        expect(source.includes('id="register-email"')).toBe(true);
        expect(source.includes('autoComplete="email"')).toBe(true);
        expect(source.includes('id="register-password"')).toBe(true);
        expect(source.includes('autoComplete="new-password"')).toBe(true);
    });

    it('adds semantic ids and autocomplete metadata to login forms', () => {
        const source = readFileSync(loginDialogPath, 'utf8');

        expect(source.includes('htmlFor="account-username"')).toBe(true);
        expect(source.includes('id="account-username"')).toBe(true);
        expect(source.includes('autoComplete="username"')).toBe(true);
        expect(source.includes('id="account-password"')).toBe(true);
        expect(source.includes('autoComplete="current-password"')).toBe(true);
        expect(source.includes('id="email-login-email"')).toBe(true);
        expect(source.includes('autoComplete="email"')).toBe(true);
        expect(source.includes('id="email-login-code"')).toBe(true);
        expect(source.includes('autoComplete="one-time-code"')).toBe(true);
    });

    it('adds a labeled textarea contract to the comment form', () => {
        const source = readFileSync(commentFormPath, 'utf8');

        expect(source.includes('htmlFor="comment-content"')).toBe(true);
        expect(source.includes('id="comment-content"')).toBe(true);
        expect(source.includes('name="content"')).toBe(true);
    });
});
