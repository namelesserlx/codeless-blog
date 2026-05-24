import { expect, test } from '@playwright/test';

test.describe('public route smoke', () => {
    test('loads the key public routes', async ({ page }) => {
        await page.goto('/');
        await expect(page.getByRole('link', { name: '博客' })).toBeVisible();
        await expect(page.getByRole('button', { name: '搜索 (⌘K)' })).toBeVisible();

        await page.goto('/articles');
        await expect(page.getByRole('heading', { name: '博客文章' })).toBeVisible();

        await page.goto('/tags');
        await expect(page.getByRole('heading', { name: '标签云' })).toBeVisible();

        await page.goto('/photos');
        await expect(page.getByRole('heading', { name: '时光相册' })).toBeVisible();

        await page.goto('/snippets');
        await expect(page.getByRole('heading', { name: '片段' })).toBeVisible();
    });

    test('can open an article detail page from the article list', async ({ page }) => {
        await page.goto('/articles');

        const firstArticleLink = page.locator('main article a[href^="/articles/"]').first();
        await expect(firstArticleLink).toBeVisible();

        await firstArticleLink.click();

        await expect(page).toHaveURL(/\/articles\/.+/);
        await expect(page.locator('main h1').first()).toBeVisible();
    });

    test('can navigate from tags to a filtered article list', async ({ page }) => {
        await page.goto('/tags');

        const firstTagLink = page.locator('main a[href^="/articles?tag="]').first();
        await expect(firstTagLink).toBeVisible();

        await firstTagLink.click();

        await expect(page).toHaveURL(/\/articles\?tag=/);
        await expect(page.getByText('标签筛选:')).toBeVisible();
    });

    test('opens the search modal from the desktop header', async ({ page }) => {
        await page.goto('/');

        await page.getByRole('button', { name: '搜索 (⌘K)' }).click();

        await expect(page.getByPlaceholder('搜索文章、标签...')).toBeVisible();
    });
});

test.describe('auth smoke', () => {
    test.use({ viewport: { width: 390, height: 844 } });

    test('opens login and register dialogs from the mobile menu', async ({ page }) => {
        await page.goto('/');

        await page.getByRole('button', { name: '打开移动端菜单' }).click();
        await page.getByRole('button', { name: '立即登录' }).click();

        await expect(page.getByRole('heading', { name: /登录到CodeLess.*Blog/ })).toBeVisible();

        await page.getByText('还没有账号？立即注册').click();

        await expect(page.getByRole('heading', { name: /注册到CodeLess.*Blog/ })).toBeVisible();
    });

    test('shows the reset-password fallback state without a token', async ({ page }) => {
        await page.goto('/auth/reset-password');

        await expect(page.getByRole('heading', { name: '令牌验证失败' })).toBeVisible();
        await expect(page.getByText('缺少重置令牌，请检查邮件中的链接')).toBeVisible();
    });
});
