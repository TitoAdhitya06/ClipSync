# 02: Docker Compose infrastructure

**What to build:** Write the Docker and Compose configuration so that `docker compose up` from the root boots all three services — Nuxt SSR, Bun WebSocket server, and Redis — on a bridge network with explicit port mapping. After `docker compose up`, a developer on any device on the same LAN can reach the Nuxt app at `http://<host-ip>:3000` and the WS server at `ws://<host-ip>:3001`. Redis is internal-only (not exposed to LAN). Health checks ensure Bun waits for Redis to be ready before starting.

**Blocked by:** 01 — Monorepo scaffold + shared types (needs the app scaffolds to containerize).

**Status:** done

- [x] `apps/web/Dockerfile` — multi-stage build on `node:20-alpine`, produces Nuxt SSR server
- [x] `apps/server/Dockerfile` — build on `oven/bun:1`, copies `packages/shared` into the image
- [x] `docker-compose.yml` at root with three services: `web` (port 3000:3000), `server` (port 3001:3001), `redis` (no host port, internal only)
- [x] Bridge network, port mapping uses `0.0.0.0:port:port`
- [x] Redis health check via `redis-cli ping`, Bun health check via `/health` endpoint
- [x] `depends_on` with `condition: service_healthy` — Bun waits for Redis
- [x] Bun connects to Redis via Docker DNS: `redis://redis:6379`
- [x] Docker volume mount for file uploads at `/data/uploads`
- [x] Root scripts `docker:up` and `docker:down` in `package.json`
- [x] `docker compose up` succeeds and all health checks pass
