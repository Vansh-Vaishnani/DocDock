# syntax=docker/dockerfile:1

# ---------------------------------------------------------------------------
# Stage 1: Dependencies
# Installs all dependencies including devDependencies needed for build
# ---------------------------------------------------------------------------
FROM node:20-alpine AS deps

WORKDIR /app

COPY package.json package-lock.json ./
COPY packages/shared/package.json ./packages/shared/
COPY apps/web/package.json ./apps/web/

RUN npm ci --ignore-scripts

# ---------------------------------------------------------------------------
# Stage 2: Builder
# Compiles TypeScript and builds the Next.js production bundle
# ---------------------------------------------------------------------------
FROM node:20-alpine AS builder

WORKDIR /app

# Copy node_modules from deps stage
COPY --from=deps /app/node_modules ./node_modules
COPY --from=deps /app/apps/web/node_modules ./apps/web/node_modules

# Copy shared package
COPY packages/shared/ ./packages/shared/
COPY packages/shared/package.json ./packages/shared/

# Copy web source
COPY apps/web/ ./apps/web/
COPY tsconfig.base.json ./
COPY package.json ./

ENV NEXT_TELEMETRY_DISABLED=1
ENV NODE_ENV=production
ENV IS_DOCKER=true

RUN npm run build --workspace=apps/web

# ---------------------------------------------------------------------------
# Stage 3: Runner
# Minimal image using Next.js standalone output
# ---------------------------------------------------------------------------
FROM node:20-alpine AS runner

WORKDIR /app

ENV NODE_ENV=production
ENV NEXT_TELEMETRY_DISABLED=1

RUN addgroup -S docdock && adduser -S docdock -G docdock

# Copy only the standalone output, static files, and public directory
COPY --from=builder --chown=docdock:docdock /app/apps/web/.next/standalone ./
COPY --from=builder --chown=docdock:docdock /app/apps/web/.next/static ./apps/web/.next/static
COPY --from=builder --chown=docdock:docdock /app/apps/web/public ./apps/web/public

USER docdock

EXPOSE 3000

HEALTHCHECK --interval=30s --timeout=10s --start-period=20s --retries=3 \
  CMD wget -qO- http://localhost:3000/ || exit 1

# Next.js standalone server
CMD ["node", "apps/web/server.js"]
