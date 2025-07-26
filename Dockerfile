# Multi-stage build for ScriptFlow
FROM node:18-alpine AS base

# Install dependencies needed for native modules
RUN apk add --no-cache python3 make g++ git

# Set working directory
WORKDIR /app

# Copy package files
COPY package*.json ./
COPY packages/backend/package*.json ./packages/backend/
COPY packages/frontend/package*.json ./packages/frontend/

# Install dependencies
RUN npm ci --only=production

# Build stage
FROM base AS builder

# Install all dependencies (including dev)
RUN npm ci

# Copy source code
COPY . .

# Build frontend
RUN npm run build:frontend

# Build backend
RUN npm run build:backend

# Production stage
FROM node:18-alpine AS production

# Install runtime dependencies
RUN apk add --no-cache \
    bash \
    curl \
    git \
    openssh-client \
    sqlite \
    postgresql-client \
    python3 \
    py3-pip \
    ansible \
    && pip3 install --no-cache-dir ansible-core

# Create app user
RUN addgroup -g 1001 -S scriptflow && \
    adduser -S scriptflow -u 1001

# Set working directory
WORKDIR /app

# Copy built application
COPY --from=builder --chown=scriptflow:scriptflow /app/packages/backend/dist ./backend/
COPY --from=builder --chown=scriptflow:scriptflow /app/packages/frontend/dist ./frontend/
COPY --from=base --chown=scriptflow:scriptflow /app/node_modules ./node_modules/
COPY --from=builder --chown=scriptflow:scriptflow /app/packages/backend/node_modules ./backend/node_modules/

# Copy package.json files
COPY --chown=scriptflow:scriptflow packages/backend/package*.json ./backend/
COPY --chown=scriptflow:scriptflow package*.json ./

# Create necessary directories
RUN mkdir -p /app/data/uploads /app/data/scripts /app/data/logs /app/data/backups && \
    chown -R scriptflow:scriptflow /app/data

# Copy startup script
COPY --chown=scriptflow:scriptflow docker/entrypoint.sh /app/entrypoint.sh
RUN chmod +x /app/entrypoint.sh

# Expose port
EXPOSE 3000

# Health check
HEALTHCHECK --interval=30s --timeout=3s --start-period=5s --retries=3 \
  CMD curl -f http://localhost:3000/api/health || exit 1

# Switch to non-root user
USER scriptflow

# Set environment
ENV NODE_ENV=production
ENV PORT=3000

# Start application
ENTRYPOINT ["/app/entrypoint.sh"]
CMD ["node", "backend/index.js"]