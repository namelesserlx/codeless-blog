import { describe, expect, it } from 'vitest';
import { createRequestError, getResponseStatus, getResponseMessage } from './request-errors';

describe('request error helpers', () => {
    it('prefers backend response message over axios default error text', () => {
        const error = {
            message: 'Request failed with status code 400',
            response: {
                status: 400,
                data: {
                    code: 400,
                    data: null,
                    message: '验证码错误',
                },
            },
        };

        expect(getResponseStatus(error)).toBe(400);
        expect(getResponseMessage(error, '网络错误')).toBe('验证码错误');
    });

    it('falls back to generic message when backend payload is missing', () => {
        const error = {
            message: 'Network Error',
        };

        expect(getResponseStatus(error)).toBeUndefined();
        expect(getResponseMessage(error, '网络错误')).toBe('Network Error');
    });

    it('creates an Error object that preserves response status and code', () => {
        const requestError = createRequestError('权限不足', {
            status: 403,
            code: 403,
        });

        expect(requestError).toBeInstanceOf(Error);
        expect(requestError.message).toBe('权限不足');
        expect(requestError.status).toBe(403);
        expect(requestError.code).toBe(403);
    });
});
