# syntax=docker/dockerfile:1

########################
# 1. deps: install all deps (dev included, needed for `next build`)
########################
FROM node:20-alpine AS deps
WORKDIR /app
RUN apk add --no-cache libc6-compat
COPY package.json package-lock.json* ./
RUN npm ci --no-audit --no-fund

########################
# 2. builder: compile the Next.js app
########################
FROM node:20-alpine AS builder
WORKDIR /app
COPY --from=deps /app/node_modules ./node_modules
COPY . .

# Build-time-only placeholder so `next build` doesn't fail. next.config.js
# reads process.env.API_URL inside `rewrites()`, and Next.js validates the
# rewrite destination's shape (must start with /, http://, or https://)
# while generating the build's routes manifest. Without any value here,
# `apiUrl` is undefined and the destination becomes the literal string
# "undefined/:path*", which fails that validation. The value below only
# needs to be syntactically valid — the real API_URL is supplied via
# `environment:` in docker-compose at container start, and Next.js
# re-evaluates `rewrites()` against that real value when `next start` boots,
# so this placeholder is never actually used for routing.
ENV NEXT_TELEMETRY_DISABLED=1
ENV API_URL=http://backend:5000/api
RUN npm run build

########################
# 3. runner: slim production runtime
########################
FROM node:20-alpine AS runner
WORKDIR /app

ENV NODE_ENV=production
ENV NEXT_TELEMETRY_DISABLED=1

RUN addgroup -g 1001 -S nodejs && adduser -S nextjs -u 1001

COPY --from=deps /app/node_modules ./node_modules
COPY --from=builder /app/package.json ./package.json
COPY --from=builder /app/next.config.js ./next.config.js
COPY --from=builder /app/.next ./.next
COPY --from=builder /app/public ./public

USER nextjs

ENV PORT=3000
EXPOSE 3000

HEALTHCHECK --interval=30s --timeout=5s --start-period=15s --retries=3 \
  CMD wget -qO- http://127.0.0.1:${PORT:-3000}/ || exit 1

CMD ["npm", "start"]
