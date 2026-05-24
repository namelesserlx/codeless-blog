import { describe, expect, it } from 'vitest';
import { isPublicRoute, publicRouteMatchers } from '../../src/config/public-routes';

describe('public-routes', () => {
    it('should include core public routes', () => {
        expect(publicRouteMatchers).toContain('/api/auth/login');
        expect(publicRouteMatchers).toContain('/api/auth/checkLogin');
        expect(publicRouteMatchers).toContain('/api/auth/refresh');
        expect(publicRouteMatchers).toContain('/health');
        expect(publicRouteMatchers).not.toContain('/api/global/upload');
    });

    it('should return true for exact-match public routes', () => {
        expect(isPublicRoute('/api/auth/login')).toBe(true);
        expect(isPublicRoute('/api/auth/checkLogin')).toBe(true);
        expect(isPublicRoute('/api/auth/refresh')).toBe(true);
        expect(isPublicRoute('/swagger')).toBe(true);
    });

    it('should return true for regex-based public routes', () => {
        expect(isPublicRoute('/api/blog/articles/preview/hello-world')).toBe(true);
    });

    it('should return false for protected or partially matched routes', () => {
        expect(isPublicRoute('/api/system/user/list')).toBe(false);
        expect(isPublicRoute('/api/blog/comments/create')).toBe(false);
        expect(isPublicRoute('/api/global/upload')).toBe(false);
        expect(isPublicRoute('/api/auth/login/extra')).toBe(false);
        expect(isPublicRoute('/api/blog/articles/preview/hello-world/extra')).toBe(false);
    });
});
