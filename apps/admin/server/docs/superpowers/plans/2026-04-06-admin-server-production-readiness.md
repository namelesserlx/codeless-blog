# Admin Server Production Readiness Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Harden `apps/admin/server` for production by closing authorization gaps, removing unsafe public surfaces, aligning runtime behavior with HTTP/API contracts, and adding verification coverage for the highest-risk backend flows.

**Architecture:** Keep the existing `routes -> controllers -> services` structure, but introduce a few narrow cross-cutting helpers so security, status handling, query parsing, uploads, and app bootstrap are no longer duplicated ad hoc. Avoid large feature redesigns before launch; focus on risk removal, deterministic behavior, and testable boundaries.

**Tech Stack:** Koa 3, TypeScript, Prisma, Redis, MeiliSearch, Vitest, `@blog/shared`

---

## Planned File Structure

- Create: `apps/admin/server/src/create-app.ts`
  Responsibility: compose the Koa application without binding a port so HTTP behavior can be tested.
- Create: `apps/admin/server/src/config/security.ts`
  Responsibility: read and validate required security env vars, remove `default-secret` fallback.
- Create: `apps/admin/server/src/lib/upload.ts`
  Responsibility: centralize `multer` limits and file filtering rules.
- Create: `apps/admin/server/src/utils/request.ts`
  Responsibility: parse boolean/number query parameters without `Boolean('false')` bugs.
- Create: `apps/admin/server/tests/platform/app-bootstrap.test.ts`
  Responsibility: verify the app can be created in tests without starting a real server.
- Create: `apps/admin/server/tests/platform/http-status-contract.test.ts`
  Responsibility: guard non-200 responses for auth and validation failures.
- Create: `apps/admin/server/tests/platform/permission-coverage.test.ts`
  Responsibility: pin sensitive admin routes behind explicit permission checks.
- Create: `apps/admin/server/tests/platform/upload-guard.test.ts`
  Responsibility: verify upload limits and forbidden file types.
- Create: `apps/admin/server/tests/auth/security.test.ts`
  Responsibility: verify JWT secret/env validation behavior.
- Modify: `apps/admin/server/src/app.ts`
- Modify: `apps/admin/server/src/middlewares/auth.ts`
- Modify: `apps/admin/server/src/config/public-routes.ts`
- Modify: `apps/admin/server/src/routes/index.ts`
- Modify: `apps/admin/server/src/routes/global.ts`
- Modify: `apps/admin/server/src/routes/blog/photo/index.ts`
- Modify: `apps/admin/server/src/routes/blog/snippet/index.ts`
- Modify: `apps/admin/server/src/routes/email/test.ts`
- Modify: `apps/admin/server/src/controllers/auth/login.ts`
- Modify: `apps/admin/server/src/controllers/auth/oauth/google.ts`
- Modify: `apps/admin/server/src/controllers/auth/oauth/github.ts`
- Modify: `apps/admin/server/src/controllers/auth/oauth/base.ts`
- Modify: `apps/admin/server/src/controllers/system/permission/index.ts`
- Modify: `apps/admin/server/src/controllers/system/role/index.ts`
- Modify: `apps/admin/server/src/controllers/blog/article/index.ts`
- Modify: `apps/admin/server/src/controllers/blog/comment/index.ts`
- Modify: `apps/admin/server/src/controllers/blog/snippet/index.ts`
- Modify: `apps/admin/server/src/controllers/blog/photo/index.ts`
- Modify: `apps/admin/server/src/controllers/dashboard/index.ts`
- Modify: `apps/admin/server/src/controllers/email/test.ts`
- Modify: `apps/admin/server/src/services/auth/session-manager.ts`
- Modify: `apps/admin/server/src/utils/auth.ts`
- Modify: `apps/admin/server/src/services/blog/comment/index.ts`
- Modify: `apps/admin/server/src/services/blog/article/preview.ts`
- Modify: `apps/admin/server/src/utils/email/index.ts`
- Modify: `apps/admin/server/src/services/email/notification.ts`
- Modify: `apps/admin/server/src/config/swagger.ts`
- Modify: `apps/admin/server/src/utils/logger.ts`
- Modify: `apps/admin/server/src/config/email.ts`
- Modify: `apps/admin/server/src/config/cos.ts`
- Modify: `apps/admin/server/tsconfig.json`
- Modify: `apps/admin/server/package.json`

## Scope Notes

- This plan deliberately prioritizes launch blockers over cosmetic cleanup.
- Directory renames like `articleReport -> article-report` are real consistency work, but they should happen only after the launch gate passes because they touch imports broadly.
- The two hardest problems in this service are authorization coverage and process-local state. Fix those before polishing naming or docs.

### Task 1: Create a Testable App Bootstrap

**Files:**

- Create: `apps/admin/server/src/create-app.ts`
- Modify: `apps/admin/server/src/app.ts`
- Test: `apps/admin/server/tests/platform/app-bootstrap.test.ts`

- [ ] **Step 1: Write the failing bootstrap test**

```ts
import { describe, expect, it } from 'vitest';
import { createApp } from '../../src/create-app';

describe('createApp', () => {
    it('creates a Koa app without binding a network port', () => {
        const app = createApp();

        expect(app).toBeDefined();
        expect(typeof app.callback()).toBe('function');
    });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `pnpm --filter @blog/server test -- tests/platform/app-bootstrap.test.ts`
Expected: FAIL with `Cannot find module '../../src/create-app'` or `createApp is not exported`

- [ ] **Step 3: Extract app composition into `createApp`**

```ts
// apps/admin/server/src/create-app.ts
import Koa from 'koa';
import bodyParser from 'koa-bodyparser';
import logger from 'koa-logger';
import router from './routes';
import swaggerRouter from './config/swagger';
import { jwtAuth } from './middlewares/auth';
import { corsMiddleware } from './middlewares/cors';
import { transformDateMiddleware } from './middlewares/transform';
import { errorHandler, notFoundHandler } from './middlewares/error-handler';

export function createApp() {
    const app = new Koa();

    app.use(errorHandler());
    app.use(logger());
    app.use(corsMiddleware());
    app.use(bodyParser());
    app.use(transformDateMiddleware);
    app.use(swaggerRouter.routes());
    app.use(swaggerRouter.allowedMethods());
    app.use(jwtAuth);
    app.use(router.routes());
    app.use(router.allowedMethods());
    app.use(notFoundHandler());

    return app;
}
```

- [ ] **Step 4: Point `src/app.ts` at the factory**

```ts
// apps/admin/server/src/app.ts
import 'module-alias/register';
import { createApp } from './create-app';
import { getServerPort, startKoaServer } from './utils/port';
import { registerWebSocketServer } from './lib/websocket';
import { dashboardChannel } from './services/dashboard/websocket';

const app = createApp();
const PORT = getServerPort();
const server = startKoaServer(app, PORT);
registerWebSocketServer(server, [dashboardChannel]);

export default app;
```

- [ ] **Step 5: Run the bootstrap test again**

Run: `pnpm --filter @blog/server test -- tests/platform/app-bootstrap.test.ts`
Expected: PASS

- [ ] **Step 6: Commit**

```bash
git add apps/admin/server/src/create-app.ts apps/admin/server/src/app.ts apps/admin/server/tests/platform/app-bootstrap.test.ts
git commit -m "🧪 test(server): make koa app testable via createApp"
```

### Task 2: Remove Secret Fallbacks and Normalize Security Config

**Files:**

- Create: `apps/admin/server/src/config/security.ts`
- Modify: `apps/admin/server/src/services/auth/session-manager.ts`
- Modify: `apps/admin/server/src/utils/auth.ts`
- Modify: `apps/admin/server/src/middlewares/auth.ts`
- Test: `apps/admin/server/tests/auth/security.test.ts`

- [ ] **Step 1: Write the failing security config test**

```ts
import { describe, expect, it, vi } from 'vitest';

describe('security config', () => {
    it('throws when JWT_SECRET is missing', async () => {
        vi.stubEnv('JWT_SECRET', '');

        await expect(import('../../src/config/security')).rejects.toThrow('JWT_SECRET is required');
    });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `pnpm --filter @blog/server test -- tests/auth/security.test.ts`
Expected: FAIL because the module does not exist or because the service still uses `default-secret`

- [ ] **Step 3: Create a single security config source**

```ts
// apps/admin/server/src/config/security.ts
const requireEnv = (key: string): string => {
    const value = process.env[key]?.trim();
    if (!value) {
        throw new Error(`${key} is required`);
    }
    return value;
};

export const securityConfig = {
    jwtSecret: requireEnv('JWT_SECRET'),
    cookieDomain: process.env.COOKIE_DOMAIN?.trim() || undefined,
};
```

- [ ] **Step 4: Replace scattered direct reads**

```ts
// apps/admin/server/src/services/auth/session-manager.ts
import { securityConfig } from '../../config/security';
return jwt.sign(payload, securityConfig.jwtSecret);

// apps/admin/server/src/utils/auth.ts
import { securityConfig } from '../config/security';
return jwt.verify(token, securityConfig.jwtSecret) as JwtPayload;

// apps/admin/server/src/middlewares/auth.ts
import { securityConfig } from '../config/security';
const decoded = jwt.verify(token, securityConfig.jwtSecret) as JwtPayload;
```

- [ ] **Step 5: Re-run the security test**

Run: `pnpm --filter @blog/server test -- tests/auth/security.test.ts`
Expected: PASS

- [ ] **Step 6: Commit**

```bash
git add apps/admin/server/src/config/security.ts apps/admin/server/src/services/auth/session-manager.ts apps/admin/server/src/utils/auth.ts apps/admin/server/src/middlewares/auth.ts apps/admin/server/tests/auth/security.test.ts
git commit -m "🐞 fix(server): remove jwt secret fallback"
```

### Task 3: Lock Down Admin Permissions and Split Unsafe Comment Mutation

**Files:**

- Modify: `apps/admin/server/src/controllers/system/permission/index.ts`
- Modify: `apps/admin/server/src/controllers/system/role/index.ts`
- Modify: `apps/admin/server/src/controllers/blog/article/index.ts`
- Modify: `apps/admin/server/src/controllers/blog/snippet/index.ts`
- Modify: `apps/admin/server/src/controllers/blog/photo/index.ts`
- Modify: `apps/admin/server/src/controllers/dashboard/index.ts`
- Modify: `apps/admin/server/src/controllers/blog/comment/index.ts`
- Modify: `apps/admin/server/src/services/blog/comment/index.ts`
- Modify: `apps/admin/server/src/routes/blog/comment/index.ts`
- Test: `apps/admin/server/tests/platform/permission-coverage.test.ts`

- [ ] **Step 1: Write the failing permission coverage test**

```ts
import fs from 'node:fs';
import path from 'node:path';
import { describe, expect, it } from 'vitest';

const read = (file: string) => fs.readFileSync(path.resolve(process.cwd(), file), 'utf8');

describe('permission coverage', () => {
    it('protects sensitive controllers with explicit permission guards', () => {
        expect(read('src/controllers/system/permission/index.ts')).toContain('@RequirePermission');
        expect(read('src/controllers/system/role/index.ts')).toContain('@RequirePermission');
        expect(read('src/controllers/blog/article/index.ts')).toContain('@RequirePermission');
        expect(read('src/controllers/dashboard/index.ts')).toContain('@RequirePermission');
    });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `pnpm --filter @blog/server test -- tests/platform/permission-coverage.test.ts`
Expected: FAIL because several controllers currently have no permission guards

- [ ] **Step 3: Add explicit guards to sensitive admin endpoints**

```ts
// apps/admin/server/src/controllers/system/permission/index.ts
import { ControllerErrorHandler, RequirePermission } from '../../../utils/decorators';

@RequirePermission({ permissions: 'permission:read' })
async getPermissionList(ctx: Context) {}

@RequirePermission({ permissions: 'permission:create' })
async createPermission(ctx: Context) {}

@RequirePermission({ permissions: 'permission:update' })
async updatePermission(ctx: Context) {}

@RequirePermission({ permissions: 'permission:delete' })
async deletePermission(ctx: Context) {}
```

- [ ] **Step 4: Split comment editing from comment moderation**

```ts
// apps/admin/server/src/routes/blog/comment/index.ts
commentRouter.post('/update-own', commentController.updateOwnComment);
commentRouter.post('/moderate', commentController.moderateComment);

// apps/admin/server/src/controllers/blog/comment/index.ts
@ControllerErrorHandler
async updateOwnComment(ctx: Context) {
    const { id, content } = ctx.request.body as { id: number; content: string };
    const authorId = ctx.state.user?.id;
    const comment = await commentService.updateOwnComment({ id, content, authorId });
    ctx.body = Response.success(comment, '评论更新成功');
}

@RequirePermission({ permissions: 'comment:moderate' })
@ControllerErrorHandler
async moderateComment(ctx: Context) {
    const { id, status } = ctx.request.body as { id: number | number[]; status: CommentStatus };
    const comment = await commentService.moderateComment({ id, status });
    ctx.body = Response.success(comment, '评论审核成功');
}
```

- [ ] **Step 5: Guard service methods by intent instead of mixed behavior**

```ts
// apps/admin/server/src/services/blog/comment/index.ts
async updateOwnComment(params: { id: number; content: string; authorId: number }) {
    const comment = await prisma.comment.findUnique({ where: { id: params.id } });
    if (!comment || comment.authorId !== params.authorId) {
        throw new Error('只能修改自己的评论');
    }
    return prisma.comment.update({
        where: { id: params.id },
        data: { content: params.content, isEdited: true, editedAt: new Date() },
    });
}

async moderateComment(params: { id: number | number[]; status: CommentStatus }) {
    // keep existing moderation logic here
}
```

- [ ] **Step 6: Re-run the permission coverage test**

Run: `pnpm --filter @blog/server test -- tests/platform/permission-coverage.test.ts`
Expected: PASS

- [ ] **Step 7: Commit**

```bash
git add apps/admin/server/src/controllers/system/permission/index.ts apps/admin/server/src/controllers/system/role/index.ts apps/admin/server/src/controllers/blog/article/index.ts apps/admin/server/src/controllers/blog/snippet/index.ts apps/admin/server/src/controllers/blog/photo/index.ts apps/admin/server/src/controllers/dashboard/index.ts apps/admin/server/src/controllers/blog/comment/index.ts apps/admin/server/src/services/blog/comment/index.ts apps/admin/server/src/routes/blog/comment/index.ts apps/admin/server/tests/platform/permission-coverage.test.ts
git commit -m "🐞 fix(server): harden permission boundaries"
```

### Task 4: Close Public/Test Upload Surfaces and Add Upload Limits

**Files:**

- Create: `apps/admin/server/src/lib/upload.ts`
- Modify: `apps/admin/server/src/config/public-routes.ts`
- Modify: `apps/admin/server/src/routes/global.ts`
- Modify: `apps/admin/server/src/routes/blog/photo/index.ts`
- Modify: `apps/admin/server/src/routes/blog/snippet/index.ts`
- Modify: `apps/admin/server/src/routes/system/user/index.ts`
- Modify: `apps/admin/server/src/routes/email/test.ts`
- Modify: `apps/admin/server/src/routes/index.ts`
- Test: `apps/admin/server/tests/platform/upload-guard.test.ts`

- [ ] **Step 1: Write the failing upload guard test**

```ts
import fs from 'node:fs';
import path from 'node:path';
import { describe, expect, it } from 'vitest';

describe('upload guards', () => {
    it('does not keep global upload in public routes', () => {
        const source = fs.readFileSync(
            path.resolve(process.cwd(), 'src/config/public-routes.ts'),
            'utf8',
        );
        expect(source).not.toContain("'/api/global/upload'");
    });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `pnpm --filter @blog/server test -- tests/platform/upload-guard.test.ts`
Expected: FAIL because `/api/global/upload` is still public

- [ ] **Step 3: Centralize `multer` limits**

```ts
// apps/admin/server/src/lib/upload.ts
import multer from '@koa/multer';

const MAX_UPLOAD_SIZE = 10 * 1024 * 1024;
const ALLOWED_MIME_TYPES = new Set([
    'image/jpeg',
    'image/png',
    'image/webp',
    'image/gif',
    'video/mp4',
]);

export const guardedUpload = multer({
    limits: { fileSize: MAX_UPLOAD_SIZE, files: 1 },
    fileFilter: (_req, file, cb) => {
        cb(ALLOWED_MIME_TYPES.has(file.mimetype) ? null : new Error('不支持的文件类型'), true);
    },
});
```

- [ ] **Step 4: Replace raw `multer()` calls and remove anonymous upload**

```ts
// apps/admin/server/src/routes/global.ts
import { guardedUpload } from '../lib/upload';
globalRouter.post('/upload', guardedUpload.single('file'), globalController.upload);

// apps/admin/server/src/config/public-routes.ts
export const publicRouteMatchers = ['/api/auth/login', '/api/auth/captcha', '/api/auth/register'];
```

- [ ] **Step 5: Stop registering email test routes in production**

```ts
// apps/admin/server/src/routes/index.ts
if (process.env.NODE_ENV !== 'production') {
    router.use(emailTestRouter.routes());
}
```

- [ ] **Step 6: Re-run upload/public surface test**

Run: `pnpm --filter @blog/server test -- tests/platform/upload-guard.test.ts`
Expected: PASS

- [ ] **Step 7: Commit**

```bash
git add apps/admin/server/src/lib/upload.ts apps/admin/server/src/config/public-routes.ts apps/admin/server/src/routes/global.ts apps/admin/server/src/routes/blog/photo/index.ts apps/admin/server/src/routes/blog/snippet/index.ts apps/admin/server/src/routes/system/user/index.ts apps/admin/server/src/routes/email/test.ts apps/admin/server/src/routes/index.ts apps/admin/server/tests/platform/upload-guard.test.ts
git commit -m "🐞 fix(server): restrict public uploads and test routes"
```

### Task 5: Align HTTP Status Codes, Query Parsing, and Swagger Contracts

**Files:**

- Create: `apps/admin/server/src/utils/request.ts`
- Modify: `apps/admin/server/src/controllers/auth/login.ts`
- Modify: `apps/admin/server/src/controllers/auth/oauth/base.ts`
- Modify: `apps/admin/server/src/controllers/auth/oauth/google.ts`
- Modify: `apps/admin/server/src/controllers/auth/oauth/github.ts`
- Modify: `apps/admin/server/src/controllers/blog/article/index.ts`
- Modify: `apps/admin/server/src/controllers/blog/snippet/index.ts`
- Modify: `apps/admin/server/src/config/swagger.ts`
- Test: `apps/admin/server/tests/platform/http-status-contract.test.ts`

- [ ] **Step 1: Write the failing HTTP status contract test**

```ts
import { describe, expect, it } from 'vitest';
import { Response } from '../../src/utils/response';

describe('response contract', () => {
    it('keeps auth failures out of HTTP 200 paths', () => {
        expect(Response.error('登录失败').code).not.toBe(200);
    });
});
```

- [ ] **Step 2: Run test to verify it fails or exposes ambiguous behavior**

Run: `pnpm --filter @blog/server test -- tests/platform/http-status-contract.test.ts`
Expected: FAIL or reveal that controller failures still map to HTTP 200 without explicit `ctx.status`

- [ ] **Step 3: Add safe query parsing helpers**

```ts
// apps/admin/server/src/utils/request.ts
export const parseBooleanQuery = (value: unknown): boolean | undefined => {
    if (value === 'true' || value === true) return true;
    if (value === 'false' || value === false) return false;
    return undefined;
};

export const parsePositiveIntQuery = (value: unknown, fallback: number): number => {
    const parsed = Number.parseInt(String(value ?? ''), 10);
    return Number.isFinite(parsed) && parsed > 0 ? parsed : fallback;
};
```

- [ ] **Step 4: Replace `Boolean(queryValue)` and set explicit status on local catches**

```ts
// apps/admin/server/src/controllers/blog/article/index.ts
import { parseBooleanQuery, parsePositiveIntQuery } from '../../../utils/request';
published: parseBooleanQuery(published),
isDraft: parseBooleanQuery(isDraft),
page: parsePositiveIntQuery(page, 1),
pageSize: parsePositiveIntQuery(pageSize, 10),

// apps/admin/server/src/controllers/auth/login.ts
ctx.status = 400;
ctx.body = Response.error(error instanceof Error ? error.message : '登录失败');
```

- [ ] **Step 5: Make Swagger reflect runtime prefixes and stop pretending validation exists**

```ts
// apps/admin/server/src/config/swagger.ts
swaggerRouter.swagger({
    prefix: '/api',
    swaggerHtmlEndpoint: '/swagger',
    swaggerJsonEndpoint: '/swagger.json',
});

swaggerRouter.mapDir(path.resolve(__dirname, '../controllers'), {
    doValidation: false,
    recursive: true,
});
```

- [ ] **Step 6: Re-run the HTTP contract test**

Run: `pnpm --filter @blog/server test -- tests/platform/http-status-contract.test.ts`
Expected: PASS

- [ ] **Step 7: Commit**

```bash
git add apps/admin/server/src/utils/request.ts apps/admin/server/src/controllers/auth/login.ts apps/admin/server/src/controllers/auth/oauth/base.ts apps/admin/server/src/controllers/auth/oauth/google.ts apps/admin/server/src/controllers/auth/oauth/github.ts apps/admin/server/src/controllers/blog/article/index.ts apps/admin/server/src/controllers/blog/snippet/index.ts apps/admin/server/src/config/swagger.ts apps/admin/server/tests/platform/http-status-contract.test.ts
git commit -m "🐞 fix(server): align http status and query parsing"
```

### Task 6: Remove Process-Local Production State and Clean Observability

**Files:**

- Modify: `apps/admin/server/src/services/blog/article/preview.ts`
- Modify: `apps/admin/server/src/utils/email/index.ts`
- Modify: `apps/admin/server/src/services/email/notification.ts`
- Modify: `apps/admin/server/src/utils/logger.ts`
- Modify: `apps/admin/server/src/config/email.ts`
- Modify: `apps/admin/server/src/config/cos.ts`
- Modify: `apps/admin/server/src/controllers/auth/oauth/google.ts`
- Test: `apps/admin/server/tests/platform/public-routes.test.ts`

- [ ] **Step 1: Replace preview in-memory storage with Redis-backed storage**

```ts
// apps/admin/server/src/services/blog/article/preview.ts
import redis from '../../../lib/redis';

const PREVIEW_KEY_PREFIX = 'article_preview:';
const PREVIEW_TTL_SECONDS = 10 * 60;

export async function createArticlePreviewSession(article: ArticleDetailResponse) {
    const token = nanoid(32);
    await redis.setex(
        `${PREVIEW_KEY_PREFIX}${token}`,
        PREVIEW_TTL_SECONDS,
        JSON.stringify(article),
    );
    return { token, expiresAt: new Date(Date.now() + PREVIEW_TTL_SECONDS * 1000).toISOString() };
}

export async function getArticlePreviewSession(token: string) {
    const raw = await redis.get(`${PREVIEW_KEY_PREFIX}${token}`);
    return raw ? JSON.parse(raw) : null;
}
```

- [ ] **Step 2: Stop logging secrets and large entity payloads**

```ts
// apps/admin/server/src/services/email/notification.ts
logger.info(`验证码邮件已加入队列: ${email}`);

// apps/admin/server/src/services/blog/comment/index.ts
logger.info('comment moderation mail trigger', {
    commentId: id,
    hasParent: Boolean(parentComment),
});
```

- [ ] **Step 3: Make email sending deterministic for production**

```ts
// apps/admin/server/src/utils/email/index.ts
if (process.env.NODE_ENV === 'production') {
    return await this.sendEmail(emailData);
}

return { success: true, messageId: this.addToQueue(emailData) };
```

- [ ] **Step 4: Remove obviously unfinished OAuth endpoints from production routing**

```ts
// apps/admin/server/src/controllers/auth/oauth/google.ts
// delete or explicitly throw for authorize/callback/status until implementation is complete
throw new Error('Google OAuth callback is not ready for production use');
```

- [ ] **Step 5: Externalize hard-coded infra config**

```ts
// apps/admin/server/src/config/cos.ts
Bucket: process.env.COS_BUCKET!,
Region: process.env.COS_REGION!,
customDomain: process.env.COS_CUSTOM_DOMAIN || '',

// apps/admin/server/src/config/email.ts
secure: Number(process.env.SMTP_PORT) === 465,
```

- [ ] **Step 6: Re-run focused platform tests**

Run: `pnpm --filter @blog/server test -- tests/platform/public-routes.test.ts tests/platform/upload-guard.test.ts`
Expected: PASS

- [ ] **Step 7: Commit**

```bash
git add apps/admin/server/src/services/blog/article/preview.ts apps/admin/server/src/utils/email/index.ts apps/admin/server/src/services/email/notification.ts apps/admin/server/src/utils/logger.ts apps/admin/server/src/config/email.ts apps/admin/server/src/config/cos.ts apps/admin/server/src/controllers/auth/oauth/google.ts
git commit -m "🔧 build(server): remove process-local production state"
```

## Verification Batch

- Run: `pnpm --filter @blog/server test`
  Expected: existing auth/platform tests plus the new platform tests all pass.
- Run: `pnpm --filter @blog/server build`
  Expected: `tsc` exits with code 0.
- Run: `pnpm --filter @blog/server format`
  Expected: modified docs and TypeScript files are formatted.

## Review Checklist

- Sensitive write endpoints require either owner checks or explicit permissions.
- No route in `public-routes.ts` allows anonymous upload or other admin-only behavior.
- No JWT code path uses `default-secret`.
- No controller returns an error body with implicit HTTP 200 for auth/validation failures.
- No production-critical state relies on in-memory `Map` or array queues.
- No logs print verification codes, reset tokens, or full comment/user payloads.

## Self-Review

- Spec coverage:
  This plan covers the highest-risk issues found in the review: permission holes, anonymous uploads, status-code drift, secret fallback, process-local preview/mail state, unfinished OAuth surfaces, and insufficient tests.
- Gaps:
  This plan does not yet rename `articleReport` directories or shrink oversized service files. Those are maintenance tasks, not launch blockers.
- Placeholder scan:
  No `TODO`, `TBD`, or “handle appropriately” placeholders remain in the task steps.
- Type consistency:
  New helpers are consistently named `createApp`, `securityConfig`, `guardedUpload`, `parseBooleanQuery`, and `parsePositiveIntQuery`.

## Execution Handoff

Plan complete and saved to `apps/admin/server/docs/superpowers/plans/2026-04-06-admin-server-production-readiness.md`. Two execution options:

**1. Subagent-Driven (recommended)** - I dispatch a fresh subagent per task, review between tasks, fast iteration

**2. Inline Execution** - Execute tasks in this session using executing-plans, batch execution with checkpoints

Which approach?
