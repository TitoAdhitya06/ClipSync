FROM oven/bun:1

WORKDIR /app

# Copy workspace root package.json for workspace resolution
COPY package.json pnpm-workspace.yaml ./

# Copy shared package (source — Bun consumes .ts directly)
COPY packages/shared/package.json packages/shared/
COPY packages/shared/src/ packages/shared/src/
COPY packages/shared/tsconfig.json packages/shared/

# Copy server package
COPY apps/server/package.json apps/server/
COPY apps/server/tsconfig.json apps/server/
COPY apps/server/src/ apps/server/src/

WORKDIR /app/apps/server

# Install dependencies (resolves workspace:* links)
RUN bun install

ENV WS_PORT=3001

EXPOSE 3001

# Create uploads directory
RUN mkdir -p /data/uploads

CMD ["bun", "run", "src/index.ts"]
