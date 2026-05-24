FROM node:24-bookworm-slim AS base

ENV PNPM_HOME="/pnpm"
ENV PATH="$PNPM_HOME:$PATH"

RUN corepack enable

FROM base AS deps

WORKDIR /app

ENV HUSKY=0

COPY package.json pnpm-lock.yaml pnpm-workspace.yaml turbo.json .npmrc ./
COPY apps/blog/package.json apps/blog/package.json
COPY packages/config/package.json packages/config/package.json
COPY packages/db/package.json packages/db/package.json
COPY packages/shared/package.json packages/shared/package.json

RUN pnpm install --frozen-lockfile

FROM base AS builder

WORKDIR /app

ENV HUSKY=0
ENV NEXT_TELEMETRY_DISABLED=1

ARG BLOG_PUBLIC_URL
ARG ADMIN_PUBLIC_URL
ARG API_PUBLIC_URL
ARG DATABASE_URL
ARG GITHUB_TOKEN
ARG NEXT_PUBLIC_GITHUB_CLIENT_ID
ARG NEXT_PUBLIC_GOOGLE_CLIENT_ID

ENV BLOG_PUBLIC_URL="${BLOG_PUBLIC_URL}"
ENV ADMIN_PUBLIC_URL="${ADMIN_PUBLIC_URL}"
ENV API_PUBLIC_URL="${API_PUBLIC_URL}"
ENV DATABASE_URL="${DATABASE_URL}"
ENV GITHUB_TOKEN="${GITHUB_TOKEN}"
ENV NEXT_PUBLIC_GITHUB_CLIENT_ID="${NEXT_PUBLIC_GITHUB_CLIENT_ID}"
ENV NEXT_PUBLIC_GOOGLE_CLIENT_ID="${NEXT_PUBLIC_GOOGLE_CLIENT_ID}"

COPY --from=deps /app/ ./
COPY . .

RUN pnpm build:blog

FROM node:24-bookworm-slim AS runner

WORKDIR /app

ENV NODE_ENV=production
ENV NEXT_TELEMETRY_DISABLED=1
ENV HOSTNAME=0.0.0.0
ENV PORT=3000

COPY --from=builder --chown=node:node /app/apps/blog/.next/standalone ./
COPY --from=builder --chown=node:node /app/apps/blog/.next/static ./.next/static
COPY --from=builder --chown=node:node /app/apps/blog/.next/static ./apps/blog/.next/static
COPY --from=builder --chown=node:node /app/apps/blog/public ./public
COPY --from=builder --chown=node:node /app/apps/blog/public ./apps/blog/public

USER node

EXPOSE 3000

CMD ["sh", "-c", "node apps/blog/server.js 2>/dev/null || node server.js"]
