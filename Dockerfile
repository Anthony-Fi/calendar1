# Multi-stage Dockerfile for Next.js (Node 20, Debian-based for Prisma compatibility)

# 1) Install dependencies
FROM node:20-bookworm-slim AS deps
WORKDIR /app
COPY package.json package-lock.json ./
RUN npm ci

# 2) Build
FROM node:20-bookworm-slim AS builder
WORKDIR /app
ENV NODE_ENV=production
COPY --from=deps /app/node_modules ./node_modules
COPY . .
# Generate Prisma Client (used at runtime)
RUN npx prisma generate
# Build Next.js app
RUN npm run build

# 3) Runtime image
FROM node:20-bookworm-slim AS runner
WORKDIR /app
ENV NODE_ENV=production
ENV PORT=3000
# Bind to all interfaces in container
ENV HOSTNAME=0.0.0.0

# Copy only what we need at runtime
COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/package.json ./package.json
COPY --from=builder /app/.next ./.next
COPY --from=builder /app/public ./public
# Prisma folder (migrations + dev.db if you choose to bundle it)
COPY --from=builder /app/prisma ./prisma
# (Optional) Copy config if you reference it at runtime (not strictly required)
# COPY --from=builder /app/next.config.ts ./next.config.ts

EXPOSE 3000
# Start Next.js
CMD ["npm", "run", "start", "--", "-p", "3000"]
