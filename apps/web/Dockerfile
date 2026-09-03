# ---- Build stage ----
FROM node:22-alpine AS build

RUN corepack enable && corepack prepare pnpm@9.15.4 --activate

WORKDIR /app

# Copy workspace root files
COPY pnpm-workspace.yaml package.json pnpm-lock.yaml ./

# Copy all workspace packages (both shared and web)
COPY packages/shared/ packages/shared/
COPY apps/web/ apps/web/

# Install dependencies
RUN pnpm install --frozen-lockfile

# Build Nuxt SSR
RUN pnpm --filter @clipboard-lokal/web run build

# ---- Production stage ----
FROM node:22-alpine

WORKDIR /app

# Copy the Nuxt output (standalone server)
COPY --from=build /app/apps/web/.output .output

ENV HOST=0.0.0.0
ENV PORT=3000

EXPOSE 3000

CMD ["node", ".output/server/index.mjs"]
