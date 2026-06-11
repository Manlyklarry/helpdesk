# ── Build stage ──────────────────────────────────────────────────────────────
FROM oven/bun:1.3-alpine AS builder

WORKDIR /app

# Install all workspace dependencies
COPY package.json bun.lock ./
COPY client/package.json ./client/
COPY server/package.json ./server/
RUN bun install

# Generate the Prisma client early so @prisma/client types are available
# when the client's tsc build resolves server-side type imports
COPY server/prisma/ ./server/prisma/
COPY server/prisma.config.ts ./server/
WORKDIR /app/server
RUN bunx prisma generate

# Build the Vite React client
WORKDIR /app
COPY server/src/ ./server/src/
COPY client/ ./client/
WORKDIR /app/client
RUN bun run build

# ── Production stage ──────────────────────────────────────────────────────────
FROM oven/bun:1.3-alpine AS runner

WORKDIR /app

ENV NODE_ENV=production

# Carry over the complete node_modules from builder.
# Includes the generated Prisma client and avoids a second bun install
# (Bun 1.3 rejects --production when bun.lock is present in the workspace).
COPY --from=builder /app/node_modules ./node_modules

# Server source, Prisma schema, and workspace manifests
COPY server/src/ ./server/src/
COPY server/prisma/ ./server/prisma/
COPY server/prisma.config.ts ./server/
COPY server/tsconfig.json ./server/
COPY server/package.json ./server/
COPY package.json ./
COPY bun.lock ./
COPY client/package.json ./client/

# Pre-built React app (served by Express in production)
COPY --from=builder /app/client/dist ./client/dist

# AI auto-resolve knowledge base
COPY knowledge-base.md ./

# Bun stores workspace package deps in node_modules/.bun/node_modules/ rather than
# directly in node_modules/. Bun's runtime resolver uses standard directory walking
# and won't find packages there. Bridge all entries to node_modules/ via symlinks.
RUN cd /app/node_modules && \
    for pkg in .bun/node_modules/*; do \
      name=$(basename "$pkg"); \
      [ -e "$name" ] || ln -sf "$pkg" "$name"; \
    done

# Run as non-root
RUN adduser -D -u 1001 appuser
USER appuser

EXPOSE 3000

# Run pending migrations then start the server.
# Use the Prisma binary from Bun's package store directly — bunx would download
# a fresh copy because .bun/node_modules/prisma isn't on the standard .bin path.
CMD ["sh", "-c", "cd /app/server && bun /app/node_modules/.bun/node_modules/prisma/build/index.js migrate deploy && bun src/index.ts"]
