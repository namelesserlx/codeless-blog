FROM node:24-bookworm-slim AS base

ENV PNPM_HOME="/pnpm"
ENV PATH="$PNPM_HOME:$PATH"

RUN apt-get update \
    && apt-get install -y --no-install-recommends openssl \
    && rm -rf /var/lib/apt/lists/*

RUN corepack enable

FROM base AS deps

WORKDIR /app

ENV HUSKY=0

COPY package.json pnpm-lock.yaml pnpm-workspace.yaml turbo.json .npmrc ./
COPY apps/admin/server/package.json apps/admin/server/package.json
COPY packages/config/package.json packages/config/package.json
COPY packages/db/package.json packages/db/package.json
COPY packages/shared/package.json packages/shared/package.json

RUN pnpm install --frozen-lockfile

FROM base AS builder

WORKDIR /app

ENV HUSKY=0
ENV NODE_ENV=production

ARG DATABASE_URL=mysql://user:password@127.0.0.1:3306/blog
ENV DATABASE_URL="${DATABASE_URL}"

COPY --from=deps /app/ ./
COPY . .

RUN pnpm --filter @blog/shared build
RUN pnpm --filter @blog/db build
RUN pnpm --filter @blog/server build

FROM builder AS tools

WORKDIR /app

ENV NODE_ENV=production

FROM node:24-bookworm-slim AS runner

RUN apt-get update \
    && apt-get install -y --no-install-recommends openssl tini \
    && rm -rf /var/lib/apt/lists/*

ENV NODE_ENV=production
ENV PORT=8000

COPY --from=builder /app/node_modules /app/node_modules
COPY --from=builder /app/apps/admin/server/package.json /app/apps/admin/server/package.json
COPY --from=builder /app/apps/admin/server/dist /app/apps/admin/server/dist
COPY --from=builder /app/apps/admin/server/node_modules /app/apps/admin/server/node_modules
COPY --from=builder /app/packages/db/package.json /app/packages/db/package.json
COPY --from=builder /app/packages/db/dist /app/packages/db/dist
COPY --from=builder /app/packages/db/generated /app/packages/db/generated
COPY --from=builder /app/packages/db/node_modules /app/packages/db/node_modules
COPY --from=builder /app/packages/shared/package.json /app/packages/shared/package.json
COPY --from=builder /app/packages/shared/dist /app/packages/shared/dist
COPY --from=builder /app/packages/shared/node_modules /app/packages/shared/node_modules

WORKDIR /app/apps/admin/server

EXPOSE 8000

ENTRYPOINT ["tini", "--"]
CMD ["node", "dist/app.js"]
