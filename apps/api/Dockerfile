# syntax=docker/dockerfile:1

# ---------------------------------------------------------------------------
# Stage 1: Builder
# Compiles TypeScript to JavaScript
# ---------------------------------------------------------------------------
FROM node:20-alpine AS builder

WORKDIR /app

# Copy workspace manifests for dependency installation
COPY package.json package-lock.json ./
COPY packages/shared/package.json ./packages/shared/
COPY apps/api/package.json ./apps/api/

# Install all dependencies (including dev) needed for compilation
RUN npm ci --ignore-scripts

# Copy shared package source and build it first
COPY packages/shared/ ./packages/shared/
RUN npm run build --workspace=packages/shared

# Copy API source
COPY apps/api/ ./apps/api/
COPY tsconfig.base.json ./

# Compile TypeScript
RUN npm run build --workspace=apps/api

# ---------------------------------------------------------------------------
# Stage 2: Runner
# Minimal production image containing only compiled JS and production deps
# ---------------------------------------------------------------------------
FROM node:20-alpine AS runner

WORKDIR /app

# Set NODE_ENV so npm ci skips devDependencies
ENV NODE_ENV=production

# Copy workspace root manifests
COPY package.json package-lock.json ./
COPY packages/shared/package.json ./packages/shared/
COPY apps/api/package.json ./apps/api/

# Install production dependencies only
RUN npm ci --omit=dev --ignore-scripts && npm cache clean --force

# Copy compiled output from builder
COPY --from=builder /app/apps/api/dist ./apps/api/dist
COPY --from=builder /app/packages/shared/dist ./packages/shared/dist

# Use non-root user for security
RUN addgroup -S docdock && adduser -S docdock -G docdock
USER docdock

EXPOSE 4000

# Healthcheck using the existing /api/v1/health endpoint
HEALTHCHECK --interval=30s --timeout=10s --start-period=15s --retries=3 \
  CMD wget -qO- http://localhost:4000/api/v1/health || exit 1

CMD ["node", "apps/api/dist/server.js"]
