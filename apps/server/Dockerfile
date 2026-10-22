FROM oven/bun:1

WORKDIR /app

# Copy bunfig for workspace resolution
COPY bunfig.toml ./

# Copy workspace configuration
COPY package.json pnpm-workspace.yaml ./

# Copy shared package source code (Bun directly executes TypeScript)
COPY packages/shared/package.json packages/shared/
COPY packages/shared/src/ packages/shared/src/
COPY packages/shared/tsconfig.json packages/shared/

# Copy server package
COPY apps/server/package.json apps/server/
COPY apps/server/tsconfig.json apps/server/
COPY apps/server/src/ apps/server/src/

WORKDIR /app/apps/server

# Install dependencies using bunfig.toml to resolve workspace packages
RUN bun install

ENV WS_PORT=3001
ENV UPLOAD_DIR=/data/uploads

EXPOSE 3001

# Create uploads directory
RUN mkdir -p /data/uploads

CMD ["bun", "run", "src/index.ts"]
