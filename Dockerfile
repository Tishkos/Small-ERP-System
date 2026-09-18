# Arbati ERP - Production Dockerfile
# Multi-stage build for optimal image size

# ============================================================================
# Stage 1: Builder
# ----------------------------------------------------------------------------
# A single install of the full dependency tree. The previous version had an
# extra `deps` stage that ran `npm ci --only=production` and then installed
# everything again here, doubling install time for no benefit.
# ============================================================================
FROM node:20-alpine AS builder
WORKDIR /app

# node-gyp toolchain, needed by some native dependencies
RUN apk add --no-cache libc6-compat python3 make g++

# Install dependencies first so this layer is cached across source-only changes
COPY package.json package-lock.json* ./
RUN npm ci

# Copy source
COPY . .

ENV NEXT_TELEMETRY_DISABLED=1
ENV NODE_ENV=production

# Generate Prisma Client. No DATABASE_URL is needed: prisma.config.ts falls back
# to a placeholder for schema-only commands, and the app builds its Prisma
# client lazily, so no dummy connection string has to be baked into the image.
RUN npx prisma generate

# Build Next.js application (output: 'standalone')
RUN npm run build

# ============================================================================
# Stage 2: Runner (Production)
# ============================================================================
FROM node:20-alpine AS runner
WORKDIR /app

ENV NODE_ENV=production
ENV NEXT_TELEMETRY_DISABLED=1

# Install wget for healthcheck
RUN apk add --no-cache wget

RUN addgroup --system --gid 1001 nodejs
RUN adduser --system --uid 1001 nextjs

# Copy necessary files from builder
COPY --from=builder /app/public ./public
COPY --from=builder /app/.next/standalone ./
COPY --from=builder /app/.next/static ./.next/static
COPY --from=builder /app/prisma ./prisma

# Generated Prisma client and query engine (not traced into standalone output)
COPY --from=builder /app/node_modules/.prisma ./node_modules/.prisma

# Create directories for file uploads
RUN mkdir -p /app/public/products /app/public/attachments /app/public/profiles /app/public/uploads/avatars /app/backups
RUN chown -R nextjs:nodejs /app

USER nextjs

EXPOSE 3000

ENV PORT=3000
ENV HOSTNAME="0.0.0.0"

CMD ["node", "server.js"]
