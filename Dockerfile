# NFL Brand Growth Tracker - Production Dockerfile
# Optimized for Railway deployment

FROM node:18-alpine AS base

# Install dependencies only when needed
FROM base AS deps
RUN apk add --no-cache libc6-compat
WORKDIR /app

# Copy package files
COPY package.json package-lock.json* ./

# Install dependencies
RUN npm ci --only=production && npm cache clean --force

# Rebuild the source code only when needed
FROM base AS builder
WORKDIR /app
COPY --from=deps /app/node_modules ./node_modules
COPY . .

# Set environment to production for build
ENV NODE_ENV=production

# Build Next.js application
RUN npm run build

# Production image, copy all the files and run next
FROM base AS runner
WORKDIR /app

ENV NODE_ENV=production

# Create a non-root user
RUN addgroup --system --gid 1001 nodejs
RUN adduser --system --uid 1001 nextjs

# Copy Next.js build output
COPY --from=builder /app/public ./public
COPY --from=builder /app/.next ./.next
COPY --from=builder /app/pages ./pages

# Copy application files for custom server and cron jobs
COPY --from=builder /app/server.js ./server.js
COPY --from=builder /app/enhanced-tracker.js ./enhanced-tracker.js
COPY --from=builder /app/postgres-watchlist-manager.js ./postgres-watchlist-manager.js
COPY --from=builder /app/leaderboard-manager.js ./leaderboard-manager.js
COPY --from=builder /app/sentiment-batch-processor.js ./sentiment-batch-processor.js
COPY --from=builder /app/lib ./lib
COPY --from=builder /app/next.config.js ./next.config.js

# Copy any additional tracker files (only if they exist)
COPY --from=builder --chown=nextjs:nodejs /app/*.js ./

# Copy node_modules
COPY --from=deps /app/node_modules ./node_modules

# Set correct permissions
RUN chown -R nextjs:nodejs /app

# Switch to non-root user
USER nextjs

# Expose port (Railway will set this via $PORT env var)
EXPOSE 3000

ENV PORT=3000
ENV HOSTNAME="0.0.0.0"

# Health check
HEALTHCHECK --interval=30s --timeout=10s --start-period=40s --retries=3 \
  CMD node -e "require('http').get('http://localhost:3000/health', (r) => {process.exit(r.statusCode === 200 ? 0 : 1)})"

# Start the custom server
CMD ["node", "server.js"]
