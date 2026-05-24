import { describe, expect, it } from 'vitest';
import { healthRouter } from '../../src/routes/health';

describe('health route', () => {
    it('registers a GET /health endpoint', () => {
        const healthLayer = healthRouter.stack.find((layer) => layer.path === '/health');

        expect(healthLayer).toBeDefined();
        expect(healthLayer?.methods).toContain('GET');
    });
});
