FROM node:24-bookworm-slim AS base

ENV PNPM_HOME="/pnpm"
ENV PATH="$PNPM_HOME:$PATH"

RUN corepack enable

FROM base AS deps

WORKDIR /app

ENV HUSKY=0

COPY package.json pnpm-lock.yaml pnpm-workspace.yaml turbo.json .npmrc ./
COPY apps/admin/client/package.json apps/admin/client/package.json
COPY packages/config/package.json packages/config/package.json
COPY packages/shared/package.json packages/shared/package.json

RUN pnpm install --frozen-lockfile

FROM base AS builder

WORKDIR /app

ENV HUSKY=0
ENV NODE_ENV=production

ARG VITE_GITHUB_ID
ARG VITE_GOOGLE_ID
ARG BLOG_PUBLIC_URL
ARG ADMIN_PUBLIC_URL
ARG API_PUBLIC_URL

ENV VITE_GITHUB_ID="${VITE_GITHUB_ID}"
ENV VITE_GOOGLE_ID="${VITE_GOOGLE_ID}"
ENV BLOG_PUBLIC_URL="${BLOG_PUBLIC_URL}"
ENV ADMIN_PUBLIC_URL="${ADMIN_PUBLIC_URL}"
ENV API_PUBLIC_URL="${API_PUBLIC_URL}"

COPY --from=deps /app/ ./
COPY . .

RUN pnpm --filter @blog/shared build
RUN pnpm --filter @blog/client build

FROM nginx:1.29-alpine AS runner

COPY apps/admin/client/nginx.conf /etc/nginx/conf.d/default.conf
COPY --from=builder /app/apps/admin/client/dist /usr/share/nginx/html

EXPOSE 80

CMD ["nginx", "-g", "daemon off;"]
