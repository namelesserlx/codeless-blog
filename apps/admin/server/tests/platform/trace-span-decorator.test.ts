import { describe, expect, it, vi } from 'vitest';

const tracingMocks = vi.hoisted(() => ({
    runWithSpan: vi.fn(async (_name: string, operation: () => unknown) => operation()),
}));

vi.mock('../../src/telemetry/tracing', () => tracingMocks);

describe('TraceSpan', () => {
    it('wraps a service method in the configured span and preserves context', async () => {
        const { TraceSpan } = await import('../../src/utils/decorators');

        class ExampleService {
            value = 'result';

            @TraceSpan('example.operation')
            async run(suffix: string) {
                return `${this.value}:${suffix}`;
            }
        }

        const result = await new ExampleService().run('ok');

        expect(result).toBe('result:ok');
        expect(tracingMocks.runWithSpan).toHaveBeenCalledOnce();
        expect(tracingMocks.runWithSpan).toHaveBeenCalledWith(
            'example.operation',
            expect.any(Function),
        );
    });

    it('passes attributes derived from method arguments to the span', async () => {
        const { TraceSpan } = await import('../../src/utils/decorators');

        class ExampleService {
            @TraceSpan('example.with-attributes', (id: number, enabled: boolean) => ({
                'example.id': id,
                'example.enabled': enabled,
            }))
            async run(_id: number, _enabled: boolean) {
                return 'ok';
            }
        }

        await new ExampleService().run(12, true);

        expect(tracingMocks.runWithSpan).toHaveBeenLastCalledWith(
            'example.with-attributes',
            expect.any(Function),
            {
                'example.id': 12,
                'example.enabled': true,
            },
        );
    });
});
