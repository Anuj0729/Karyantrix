# syntax=docker/dockerfile:1

########################
# 1. deps: install only production dependencies (cached layer)
########################
FROM node:20-alpine AS deps
WORKDIR /app

# System deps some native modules (bcryptjs/mongodb-memory-server transitively) may need
RUN apk add --no-cache libc6-compat

COPY package.json package-lock.json* ./
RUN npm ci --omit=dev --no-audit --no-fund

########################
# 2. runner: final slim runtime image
########################
FROM node:20-alpine AS runner
WORKDIR /app

ENV NODE_ENV=production

# Run as a non-root user
RUN addgroup -g 1001 -S nodejs && adduser -S nodejs -u 1001

COPY --from=deps /app/node_modules ./node_modules
COPY . .

# Make sure the local-upload directories exist and are writable
# (no-ops when STORAGE_DRIVER=s3, but keeps `local` driver working out of the box)
RUN mkdir -p uploads/avatars uploads/booking-progress uploads/chat-media uploads/requirements uploads/tmp-chunks \
  && chown -R nodejs:nodejs /app

USER nodejs

EXPOSE 5000

HEALTHCHECK --interval=30s --timeout=5s --start-period=15s --retries=3 \
  CMD wget -qO- http://127.0.0.1:${PORT:-5000}/api/health || exit 1

# Default process = API server. The `worker` service in docker-compose
# overrides this command with `node jobs/worker.js` to run the BullMQ
# OTP/email worker as its own container/process.
CMD ["node", "server.js"]
