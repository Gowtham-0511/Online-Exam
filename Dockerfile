# --- Base image ---
# Switched to node:20-slim for better Node.js performance and glibc compatibility
FROM node:20-slim AS base
WORKDIR /app

# --- Install dependencies ---
FROM base AS deps
# Install openssl and ca-certificates (required for many DB clients) using apt-get
RUN apt-get update && apt-get install -y --no-install-recommends openssl ca-certificates && rm -rf /var/lib/apt/lists/*

COPY package.json package-lock.json ./
RUN npm ci --legacy-peer-deps

# --- Build Next.js app ---
FROM base AS builder
WORKDIR /app
COPY --from=deps /app/node_modules ./node_modules
COPY package.json package-lock.json ./
# Copy all configuration files
COPY next.config.ts tsconfig.json postcss.config.mjs eslint.config.mjs components.json ./
COPY src ./src
COPY public ./public
RUN npm run build

# --- Production runner (standalone mode) ---
FROM base AS runner
WORKDIR /app

ENV NODE_ENV=production
ENV PORT=3000
# Optimize Node.js for container environments
ENV NODE_OPTIONS="--enable-source-maps"

# Copy standalone output only
COPY --from=builder /app/.next/standalone ./
COPY --from=builder /app/.next/static ./.next/static
COPY --from=builder /app/public ./public

EXPOSE 3000

CMD ["node", "server.js"]