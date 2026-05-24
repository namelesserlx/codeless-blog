# Codeless's Blog

<p align="center">
  <a href="./README.md">中文</a> · <a href="./README.en-US.md">English</a>
</p>

<p align="center">
  <img src="https://img.shields.io/badge/Next.js-16.x-black?style=flat-square&logo=next.js" alt="Next.js" />
  <img src="https://img.shields.io/badge/React-19.x-149ECA?style=flat-square&logo=react" alt="React" />
  <img src="https://img.shields.io/badge/TypeScript-5.x-3178C6?style=flat-square&logo=typescript" alt="TypeScript" />
  <img src="https://img.shields.io/badge/Vite-7.x-646CFF?style=flat-square&logo=vite" alt="Vite" />
  <img src="https://img.shields.io/badge/Koa-3.x-33333D?style=flat-square&logo=koa" alt="Koa" />
  <img src="https://img.shields.io/badge/Prisma-7.x-2D3748?style=flat-square&logo=prisma" alt="Prisma" />
  <img src="https://img.shields.io/badge/pnpm-Monorepo-F69220?style=flat-square&logo=pnpm" alt="pnpm" />
  <img src="https://img.shields.io/badge/license-MIT-green?style=flat-square" alt="License" />
</p>

An integrated full-stack blog system built with `Next.js`, `React`, `Koa`, and `Prisma`, and organized with `pnpm Monorepo + Turbo`, consisting of the public blog, the admin workspace, and the backend service.  
It supports core features such as article and snippet publishing, comments, site search, and system administration, while also delivering strong SEO performance.

It also works well as a reference implementation for a `Next.js blog`, `personal site`, `content CMS`, `Koa + Prisma` backend, and `TypeScript monorepo` workflow.

## 🖼️ Product Tour

### Homepage and mobile reading

<p align="center">
  <img src="./docs/readme/home-desktop.png" alt="Desktop homepage" width="78%" />
  <img src="./docs/readme/home-mobile.png" alt="Mobile homepage" width="19.5%" />
</p>

The desktop view highlights the landing section, article stream, hot content, and tag cloud, while the mobile view keeps the same visual language and content hierarchy for quick browsing and reading on smaller screens.

### Admin operations and writing workspace

<p align="center">
  <img src="./docs/readme/admin-dashboard.png" alt="Admin dashboard" width="100%" />
</p>

<p align="center">
  <img src="./docs/readme/admin-article-report.png" alt="Admin article analytics dashboard" width="100%" />
</p>

<p align="center">
  <img src="./docs/readme/admin-editor.png" alt="Admin article editor" width="49%" />
  <img src="./docs/readme/admin-rbac.png" alt="RBAC permission management" width="49%" />
</p>

The dashboard aggregates trends, pending work, and health metrics; the article report view expands that into per-range UV, comments, likes, and content performance; the editor supports richer content authoring; the RBAC view covers role, permission, and menu-level governance.

### About page and personal identity

<p align="center">
  <img src="./docs/readme/about-page.png" alt="About page" width="100%" />
</p>

The `About` page goes beyond a short bio: it combines role positioning, technology keywords, external links, and a GitHub contribution heatmap, which helps the site read more like a personal product space instead of a plain content index.

### Gallery timeline experience

<p align="center">
  <img src="./docs/readme/gallery-timeline.png" alt="Gallery timeline page" width="100%" />
</p>

The gallery combines timeline-based browsing with category filters, making it suitable both for photography showcases and for archiving personal visual notes.

## ✨ Highlights

### Reader-facing experience

- 📰 **Multi-format content browsing**: supports articles, snippets, tags, gallery pages, and an about page instead of relying on a single blog feed
- 🔎 **Search and discovery**: combines MeiliSearch, tags, hot content, and related navigation so readers can move from landing to discovery with less friction
- 📱 **Responsive reading flows**: desktop, tablet, and mobile layouts are all intentionally adapted, with the mobile experience still preserving key navigation and reading actions
- 🌗 **Theme and presentation polish**: supports light and dark themes, modern hero sections, image-driven layouts, and a presentation style that fits both technical writing and portfolio-like content
- 💬 **Interaction loop**: comments, replies, likes, views, and reading-time metrics keep content alive after it is published

### Authoring and publishing workflow

- ✍️ **Rich article editing**: supports heading levels, emphasis, quotes, code blocks, tables, links, highlights, and table-of-contents style structure
- 🧩 **Snippets for lightweight publishing**: short-form snippets complement long-form articles for quick notes, debugging records, and micro posts
- 🤖 **AI-assisted content summarization**: DeepSeek is used to generate article summaries, and the public article page can surface that result as an `AI Summary` card for faster reading orientation
- 🖼️ **Photos and gallery archiving**: image categorization, timeline presentation, and multi-image records extend the blog beyond text-only publishing
- 🗂️ **Draft-to-publish flow**: drafts, publishing, comment switches, and content management are designed as a complete day-to-day writing workflow

### Operations and platform governance

- 📊 **Dashboard overview**: centralizes article, snippet, comment, and traffic metrics together with trends, rankings, and live pending items
- 📈 **Reports and traffic analysis**: the admin side helps track production pace, access trends, and content hotspots to understand what keeps producing value
- ✉️ **SMTP-based email workflows**: supports email-code login, password reset emails, welcome emails, comment approval / reply notifications, and manual review alerts
- 🧠 **AI comment moderation**: DeepSeek participates in automatic comment review, and uncertain results are escalated to manual moderation instead of being silently forced through
- 🛡️ **Built-in RBAC system**: users, roles, permissions, menus, and button-level access control make the platform suitable for collaborative operations, not just solo writing
- 🧰 **Unified monorepo foundations**: the public blog, admin client, and admin server share types, database access, and engineering configuration
- 🚀 **Deployment and runtime support**: includes Docker one-click deployment, database migration, seed flows, search initialization, Redis-backed metrics, and MeiliSearch integration

## 🔧 Tech Stack

### Shared Foundation

- Package management: `pnpm workspace`
- Task orchestration: `turbo`
- Language: `TypeScript`
- Code quality: `ESLint`, `Prettier`
- Commit workflow: `husky`, `lint-staged`, `commitlint`

### Public Blog `apps/blog`

- Framework: `Next.js 16`
- View layer: `React 19`
- Styling: `Tailwind CSS 4`
- UI / interaction: `Radix UI`, `cmdk`, `motion`
- Frontend capabilities: `PWA`, `next-themes`

### Admin Client `apps/admin/client`

- Build tool: `Vite 7`
- View layer: `React 19`
- Routing: `React Router 7`
- UI library: `Ant Design 6`
- State management: `Zustand`
- Editor: `@namelesserlx/editor` npm package, built on Tiptap

### Admin Server `apps/admin/server`

- Server framework: `Koa 3`
- ORM: `Prisma`
- Database: `MySQL`
- Cache and metrics: `Redis`
- Search: `MeiliSearch`
- Email delivery: `SMTP`
- AI assistance: `DeepSeek`
- Auth-related tooling: `JWT`
- Testing: `Vitest`

### Shared Packages `packages/*`

- `@blog/db`: shared database entrypoint
- `@blog/shared`: cross-app contracts and helpers
- `@blog/config`: shared engineering configuration

## 📁 Repository Structure

```text
Blog/
├── apps/
│   ├── blog/
│   └── admin/
│       ├── client/
│       └── server/
├── packages/
│   ├── config/
│   ├── db/
│   └── shared/
├── docs/
├── README.md
├── README.en-US.md
├── AGENTS.md
├── package.json
├── pnpm-workspace.yaml
└── turbo.json
```

## 🚀 Getting Started

### Requirements

- Node.js `>= 22`
- pnpm `>= 10`
- MySQL 8+
- Redis for cache / metrics related flows
- MeiliSearch for search related flows

### Install

```bash
git clone https://github.com/namelesserlx/codeless-blog.git
cd codeless-blog
pnpm install
```

### Environment Setup

The root-level [`.env.example`](./.env.example) is now the single source of truth for this monorepo.
Local development uses `.env.development`, staging deployment uses `.env.staging`, and production deployment uses `.env.production`.

Before the first local run, copy:

```bash
cp .env.example .env.development
```

After copying, set `APP_ENV` to the target environment and fill in the required vs optional variables based on the inline comments.

If you need a local override for one app, you may additionally create:

- `apps/blog/.env.development`
- `apps/admin/client/.env.development`
- `apps/admin/server/.env.development`

The effective priority is:

1. system environment variables / CI injection
2. app-level `.env.{APP_ENV}`
3. root-level `.env.{APP_ENV}`

At minimum, make sure the database connection, server port, and blog API base URL are configured correctly for your environment.

### Local Development

Start the admin server first, then the admin client and the blog frontend:

```bash
pnpm dev:server   # default: http://localhost:8000
pnpm dev:admin    # default: http://localhost:5173
pnpm dev:blog     # default: http://localhost:3000
```

### Database Commands

```bash
pnpm db:generate
pnpm db:push
pnpm db:studio
pnpm db:migrate:dev
pnpm db:migrate:deploy
pnpm db:reset
pnpm db:seed
```

## 🛠️ Common Commands

```bash
pnpm lint
pnpm format

pnpm build:blog
pnpm build:admin
pnpm build:server

pnpm clean:server
```

## 🐳 Docker One-Click Deployment

The repository root includes an all-in-one Docker deployment flow that starts:

- public blog `apps/blog`
- admin client `apps/admin/client`
- admin server `apps/admin/server`
- MariaDB / Redis / MeiliSearch

### 1. Copy the environment template

For staging deployment:

```bash
cp .env.example .env.staging
```

For production deployment:

```bash
cp .env.example .env.production
```

At minimum, make sure these variables are configured correctly:

- `DATABASE_URL`
- `MYSQL_DATABASE`
- `MYSQL_USER`
- `MYSQL_PASSWORD`
- `MYSQL_ROOT_PASSWORD`
- `MEILI_MASTER_KEY`
- `MEILI_ADMIN_KEY`
- `MEILI_SEARCH_KEY`
- `JWT_SECRET`
- `BLOG_PUBLIC_URL`
- `ADMIN_PUBLIC_URL`
- `API_PUBLIC_URL`

Notes:

- `DATABASE_URL` is now used for both runtime access and the `apps/blog` build stage because the current blog setup reads from the database during `next build`
- `MEILI_MASTER_KEY` is only used by the MeiliSearch instance itself
- `MEILI_ADMIN_KEY` is used by `apps/admin/server`
- `MEILI_SEARCH_KEY` is used by `apps/blog`

### 2. Prepare MeiliSearch keys on the first deployment

If this is the first MeiliSearch deployment, start it once and write the generated keys back into the active env file.

For staging:

```bash
docker compose --env-file .env.staging up -d meilisearch
curl -H "Authorization: Bearer $MEILI_MASTER_KEY" http://localhost:${MEILI_PORT:-7700}/keys
```

For production:

```bash
docker compose --env-file .env.production up -d meilisearch
curl -H "Authorization: Bearer $MEILI_MASTER_KEY" http://localhost:${MEILI_PORT:-7700}/keys
```

Write the returned values into:

- `Default Admin API Key` -> `MEILI_ADMIN_KEY`
- `Default Search API Key` -> `MEILI_SEARCH_KEY`

### 3. Run the one-click startup

For staging:

```bash
pnpm docker:up:staging
```

For production:

```bash
pnpm docker:up:production
```

The script will automatically:

1. start `mysql`, `redis`, and `meilisearch`
2. wait until the infrastructure services are healthy
3. run database migration, automatic seed for an empty database, and MeiliSearch initialization
4. build and start `admin-server`, `admin-metrics-worker`, `admin-client`, and `blog`

Notes:

- the first empty-database deployment will automatically create the default admin accounts
- `blog` is rebuilt without Docker layer cache so it does not keep pages that were built against an empty database

Default access URLs:

- Blog: `http://localhost:3000`
- Admin: `http://localhost:8080`
- API: `http://localhost:8000`

Default bootstrap accounts created during the first empty-database deployment:

- `superadmin / admin123`
- `admin / admin123`
- `test / user123`

### 4. Common Docker commands

```bash
pnpm docker:ps:staging
pnpm docker:logs:staging
pnpm docker:down:staging
```

Production equivalents:

```bash
pnpm docker:ps:production
pnpm docker:logs:production
pnpm docker:down:production
```

For the full orchestration details and manual rerun steps for seed / search initialization, see `docs/release/docker-all-in-one-deployment.md`.

## 🤝 Open Source

- License: [MIT License](./LICENSE)
- Contribution Guide: [CONTRIBUTING.md](./CONTRIBUTING.md)
- Code of Conduct: [CODE_OF_CONDUCT.md](./CODE_OF_CONDUCT.md)
- Security Policy: [SECURITY.md](./SECURITY.md)
- Support Guide: [SUPPORT.md](./SUPPORT.md)
- GitHub Launch Checklist: [docs/release/github-open-source-checklist.md](./docs/release/github-open-source-checklist.md)

## 📮 Contact

- Author: `namelesserlx`
- GitHub: <https://github.com/namelesserlx>
- Email: `namelesslx@foxmail.com`
