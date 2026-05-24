import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, expect, it } from 'vitest';

type SourceExpectation = {
    path: string;
    spanNames: string[];
};

const tracingCoverageExpectations: SourceExpectation[] = [
    {
        path: 'src/services/auth/login.ts',
        spanNames: [
            'auth.login.password',
            'auth.session.restore',
            'auth.login.check',
            'auth.token.refresh',
            'auth.login.email',
            'auth.captcha.read',
            'auth.user.load',
            'auth.password.verify',
            'auth.login.response.create',
            'auth.session.load',
            'auth.profile.load',
            'auth.token.issue',
        ],
    },
    {
        path: 'src/services/auth/oauth/github.ts',
        spanNames: [
            'auth.oauth.github.token.exchange',
            'auth.oauth.github.user.load',
            'auth.oauth.github.email.load',
            'auth.oauth.github.login',
        ],
    },
    {
        path: 'src/services/auth/oauth/google.ts',
        spanNames: [
            'auth.oauth.google.token.exchange',
            'auth.oauth.google.user.load',
            'auth.oauth.google.login',
        ],
    },
    {
        path: 'src/services/dashboard/index.ts',
        spanNames: ['dashboard.overview', 'dashboard.module.load'],
    },
    {
        path: 'src/services/dashboard/traffic.ts',
        spanNames: [
            'dashboard.traffic.fetch',
            'dashboard.traffic.pending-uv-scan',
            'dashboard.traffic.summary.load',
            'dashboard.traffic.trend.load',
            'dashboard.traffic.hot-articles.build',
        ],
    },
    {
        path: 'src/services/blog/article-report/index.ts',
        spanNames: [
            'article.report.get',
            'article.report.posts.load',
            'article.report.metrics.load',
        ],
    },
    {
        path: 'src/services/blog/article-report/repository.ts',
        spanNames: [
            'article.report.metrics.pending-uv-scan',
            'article.report.metrics.pending-like-scan',
            'article.report.metrics.load',
        ],
    },
    {
        path: 'src/services/search/article.ts',
        spanNames: [
            'search.article.index.one',
            'search.article.index.batch',
            'search.article.reindex',
            'search.article.query',
            'search.article.delete.one',
            'search.article.delete.batch',
        ],
    },
    {
        path: 'src/services/blog/article/index.ts',
        spanNames: [
            'article.create',
            'article.update',
            'article.delete',
            'article.batch',
            'article.summary.generate',
            'article.db.create',
            'article.db.update',
            'article.db.delete',
            'article.batch.db.apply',
            'article.search.sync',
            'article.summary.deepseek',
        ],
    },
    {
        path: 'src/services/blog/comment/index.ts',
        spanNames: [
            'comment.create',
            'comment.moderate',
            'comment.session.load',
            'comment.parent.validate',
            'comment.target.validate',
            'comment.db.create',
            'comment.moderate.db.load',
            'comment.moderate.db.update',
            'comment.email.notify',
        ],
    },
    {
        path: 'src/services/auth/oauth/github.ts',
        spanNames: ['auth.oauth.github.bind', 'auth.oauth.github.unbind'],
    },
    {
        path: 'src/services/auth/oauth/google.ts',
        spanNames: ['auth.oauth.google.bind', 'auth.oauth.google.unbind'],
    },
    {
        path: 'src/services/email/notification.ts',
        spanNames: ['email.delivery.required', 'email.delivery.immediate'],
    },
    {
        path: 'src/services/global/index.ts',
        spanNames: ['storage.upload', 'storage.delete'],
    },
];

function readSource(relativePath: string) {
    return readFileSync(resolve(__dirname, '../../', relativePath), 'utf8');
}

describe('P0 tracing coverage guardrails', () => {
    it('keeps the agreed P0 service spans in place', () => {
        for (const expectation of tracingCoverageExpectations) {
            const source = readSource(expectation.path);

            for (const spanName of expectation.spanNames) {
                expect(source, `${expectation.path} is missing ${spanName}`).toContain(spanName);
            }
        }
    });
});
