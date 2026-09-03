# 01: Monorepo scaffold + shared types

**What to build:** Set up the pnpm workspace monorepo so that a developer can run `pnpm dev` from the root and both the Nuxt 3 frontend (port 3000) and Bun WebSocket server (port 3001) start in parallel. A shared TypeScript package provides the message protocol types (`ClipboardMessage`, `MessageType` enum, etc.) that both apps import. At this stage the apps are empty shells — Nuxt shows its default welcome page, Bun responds to `/health` with 200 OK — but the plumbing is proven: shared types compile, imports resolve across workspace boundaries, and the parallel dev script works.

**Blocked by:** None (can start immediately).

**Status:** done

- [x] `pnpm-workspace.yaml` at root declares `apps/*` and `packages/*`
- [x] `apps/web/` — initialized Nuxt 3 project (boots on port 3000)
- [x] `apps/server/` — initialized Bun project with a minimal `Bun.serve()` returning 200 on `/health` (port 3001)
- [x] `packages/shared/` — TypeScript package exporting `ClipboardMessage` type and `MessageType` union/enum matching the protocol spec (`join`, `paste`, `sync`, `history`, `error`, `file-shared`)
- [x] Both apps import from `@clipboard-lokal/shared` (or chosen scope) without error
- [x] Root `package.json` has `dev` script that runs both apps in parallel via `pnpm --parallel`
- [x] Root `.env` file with placeholder variables (`REDIS_URL`, `WS_PORT`, `NUXT_PORT`)
- [x] `.gitignore` covers `node_modules`, `.nuxt`, dist, `.env`
