import { beforeEach, describe, expect, it, vi } from 'vitest';

const mockedEmailService = vi.hoisted(() => ({
    sendEmailWithRetry: vi.fn(),
    sendEmail: vi.fn(),
    isAvailable: vi.fn(),
    getQueueStatus: vi.fn(),
}));

vi.mock('../../src/utils/email/index', () => ({
    emailService: mockedEmailService,
}));

import { emailNotificationService } from '../../src/services/email/notification';

describe('email delivery contract', () => {
    beforeEach(() => {
        vi.clearAllMocks();
        mockedEmailService.sendEmailWithRetry.mockResolvedValue({
            success: true,
            messageId: 'msg-1',
        });
        mockedEmailService.isAvailable.mockReturnValue(true);
        mockedEmailService.getQueueStatus.mockReturnValue({
            total: 0,
            processing: false,
        });
    });

    it('sends verification emails through direct delivery instead of an in-memory queue', async () => {
        await emailNotificationService.sendVerificationCodeWithCode({
            email: 'tester@example.com',
            code: '123456',
            purpose: 'login',
        });

        expect(mockedEmailService.sendEmailWithRetry).toHaveBeenCalledWith(
            expect.objectContaining({
                to: 'tester@example.com',
                verificationCode: '123456',
            }),
            expect.objectContaining({
                throwOnFailure: true,
            }),
        );
    });

    it('reports a zero-length queue once queue state is removed from the process', () => {
        const status = emailNotificationService.getServiceStatus();

        expect(status.queueStatus).toEqual({
            total: 0,
            processing: false,
        });
    });
});
