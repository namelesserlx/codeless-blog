# Contributing

Thanks for your interest in improving `codeless-blog`.

## Before you start

- Keep changes tightly scoped. Avoid drive-by refactors and unrelated formatting churn.
- Check the root [`AGENTS.md`](./AGENTS.md) first, then the module-specific `AGENTS.md` file for the area you are touching.
- Prefer opening an issue before large changes so the implementation direction can be aligned early.

## Local setup

```bash
pnpm install
cp .env.example .env.development
```

Start the apps you need:

```bash
pnpm dev:server
pnpm dev:admin
pnpm dev:blog
```

## Quality checks

Run the smallest useful validation for your change:

- Repository-wide lint: `pnpm lint`
- Blog frontend: `pnpm build:blog`
- Admin client: `pnpm build:admin`
- Admin server: `pnpm --filter @blog/server test && pnpm build:server`
- Shared/config/db changes: `pnpm ci:baseline`
- Full pre-merge gate: `pnpm ci:quality`

## Commit message format

This repository uses the following convention:

```text
<emoji> type(scope): summary
```

Examples:

```text
✨ feat(blog): improve article list empty states
🐞 fix(server): handle missing oauth config
📃 docs(repo): add open source contribution guide
```

Valid scopes commonly include `repo`, `blog`, `client`, `server`, `db`, `shared`, `config`, and `all`.

## Pull request expectations

- Describe the user-facing or maintainer-facing impact clearly.
- Link the related issue when available.
- Include screenshots or recordings for UI changes.
- List the commands you ran to verify the change.
- Call out environment, migration, or deployment implications explicitly.

## What makes a good contribution

- Reproducible bug reports with minimal context to reproduce
- Focused feature proposals with clear use cases
- Documentation improvements that reduce onboarding time
- Tests that protect behavior and prevent regressions
