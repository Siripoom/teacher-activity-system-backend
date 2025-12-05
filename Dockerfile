# Multi-stage build for better optimization
FROM node:18-alpine3.20 AS base

# Install system dependencies including OpenSSL for Prisma
RUN apk add --no-cache \
    curl \
    dumb-init \
    openssl \
    libc6-compat \
    && rm -rf /var/cache/apk/*

WORKDIR /app

# Create app user
RUN addgroup -g 1001 -S nodejs
RUN adduser -S nodejs -u 1001

# Development stage
FROM base AS development

# Copy package files and yarn lock
COPY package*.json yarn.lock ./
COPY prisma ./prisma/

# Install all dependencies (including dev)
RUN yarn install --frozen-lockfile

# Generate Prisma client
RUN npx prisma generate

# Copy source code
COPY --chown=nodejs:nodejs . .

# Create necessary directories
RUN mkdir -p uploads logs && \
    chown -R nodejs:nodejs uploads logs

USER nodejs

EXPOSE 3000

CMD ["npm", "run", "dev"]

# Production stage
FROM base AS production

# Copy package files and yarn lock
COPY package*.json yarn.lock ./
COPY prisma ./prisma/

# Install all dependencies first (needed for Prisma generate)
RUN yarn install --frozen-lockfile

# Generate Prisma client
RUN npx prisma generate

# Remove devDependencies and clean cache
RUN yarn install --production --frozen-lockfile && yarn cache clean

# Copy application code
COPY --chown=nodejs:nodejs . .

# Create necessary directories
RUN mkdir -p uploads logs && \
    chown -R nodejs:nodejs uploads logs

# Switch to non-root user
USER nodejs

# Expose port
EXPOSE 3000

# Health check
HEALTHCHECK --interval=30s --timeout=10s --start-period=5s --retries=3 \
    CMD curl -f http://localhost:3000/api/health || exit 1

# Start application with dumb-init
ENTRYPOINT ["dumb-init", "--"]
CMD ["npm", "start"]

# Default stage for docker build
FROM production