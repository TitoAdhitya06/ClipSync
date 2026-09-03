# Arsitektur Dasar Monorepo & Sistem Komunikasi Real-Time Clipboard

Label: wayfinder:map

## Destination

Menghasilkan spesifikasi (to-spec) untuk arsitektur dasar monorepo clipboard real-time. Peta selesai ketika seluruh keputusan infrastruktur dasar — struktur monorepo, Docker networking, WebSocket backend Bun, Redis TTL, dan strategi koneksi Nuxt client — sudah ter-resolve dan siap di-handoff ke `to-spec`.

## Status: ✅ COMPLETE — siap handoff ke to-spec

## Notes

- Domain: real-time clipboard sharing antar device di jaringan lokal
- Skills setiap sesi harus konsultasi: `grilling`, `domain-modeling`
- Bahasa pengantar: Bahasa Indonesia (kecuali istilah teknis)
- Pengecualian tegas: **UI/UX slicing (Tailwind), QR Code Generator, file/image upload** — tidak dibahas di peta ini

## Decisions so far

### Arsitektur & Container
- [3 Container Terpisah (Nuxt SSR + Bun WS + Redis)](#q1): Arsitektur 3 container — Nuxt SSR server (port 3000), Bun WebSocket server (port 3001), Redis (port 6379), masing-masing punya Dockerfile sendiri.
- [Bun Latest Stable + Nuxt 3 Stable](#q6): Pin Bun via `oven/bun:1` di Dockerfile, Nuxt 3 stable.
- [HTTP + ws:// tanpa TLS](#q7): Jaringan lokal tidak butuh HTTPS/TLS. HTTP biasa + `ws://`.

### Docker Networking (Issue 01 — resolved)
- [Bridge Network + Port Mapping](issues/01-docker-compose-networking.md): Bridge network dengan explicit port mapping `0.0.0.0:port:port`. Bekerja di semua OS termasuk Docker Desktop Windows.
- [Redis Internal-Only](issues/01-docker-compose-networking.md): Redis tidak di-expose ke LAN. Hanya bisa diakses oleh container lain di Docker network. Debugging via `docker exec`.
- [Docker Service Name](issues/01-docker-compose-networking.md): Container-to-container via Docker DNS. Bun connect ke `redis://redis:6379`.

### WebSocket Backend Bun (Issue 02 — resolved)
- [Bun WebSocket API Research](issues/02-bun-websocket-api-research.md): Bun punya built-in pub/sub + `ws.data` — pakai sebagai mekanisme room tanpa manual tracking. Detail: [research/bun-websocket-api.md](research/bun-websocket-api.md)

### Redis Schema & TTL (Issue 03 — resolved)
- [Redis List Per-Room](issues/03-redis-schema-ttl-strategy.md): Setiap room punya Redis List `clipboard:<roomId>` — `RPUSH`/`LRANGE`/`LTRIM`.
- [50 Entries Max](issues/03-redis-schema-ttl-strategy.md): Maksimal 50 entry per room, enforce via `LTRIM` setelah setiap `RPUSH`.
- [TTL Reset on Activity](issues/03-redis-schema-ttl-strategy.md): `EXPIRE clipboard:<roomId> 86400` dijalankan setiap `RPUSH`. Room aktif tidak expire; room idle hilang setelah 24 jam.
- [JSON Minimal + Server Timestamp](issues/03-redis-schema-ttl-strategy.md): Entry format `{"text": "...", "ts": ...}`. Timestamp server-generated (`Date.now()` di Bun). Tanpa device ID di v1.
- [Create-on-First-Join](issues/03-redis-schema-ttl-strategy.md): Tidak ada explicit "create room". Room ID yang belum dipakai = room kosong, bukan error.

### Nuxt Client Connection (Issue 04 — resolved)
- [Nuxt WebSocket Integration Research](issues/04-nuxt-websocket-integration-research.md): VueUse `useWebSocket` cukup — SSR-safe via `immediate: false`, auto-reconnect + heartbeat built-in, kombinasi dengan `useDocumentVisibility`. Detail: [research/nuxt-websocket-integration.md](research/nuxt-websocket-integration.md)

### Service Discovery & Env Config (Issue 05 — resolved)
- [Browser Auto-Detect WS URL](issues/05-service-discovery-env-config.md): Client derive WS URL dari `ws://${window.location.hostname}:3001`. Zero config karena Nuxt dan Bun di host yang sama.
- [Single .env di Root](issues/05-service-discovery-env-config.md): Satu file `.env` di root monorepo. `docker-compose.yml` reference `${VAR}` langsung.

### Monorepo Structure (Issue 06 — resolved)
- [Folder Layout Confirmed](issues/06-monorepo-folder-structure.md): `apps/web` (Nuxt), `apps/server` (Bun), `packages/shared` (message types).
- [Minimal Root Scripts](issues/06-monorepo-folder-structure.md): `dev` (paralel via pnpm), `docker:up`, `docker:down`.
- [packages/shared Sekarang](issues/06-monorepo-folder-structure.md): Shared TypeScript types untuk message protocol (`ClipboardMessage`, `MessageType`).
- [Dockerfile Base Images](issues/06-monorepo-folder-structure.md): `oven/bun:1` (server) + `node:20-alpine` (Nuxt).

### Protocol
- [JSON Simple Protocol](#q4): Format pesan `{type: "join"|"paste"|"sync"|"history", roomId: string, payload?: string}`. Tanpa binary frame.
- [Re-fetch History saat Reconnect](#q5): Client kirim `{type: "sync", roomId}` setelah reconnect, server balas dengan seluruh isi clipboard room dari Redis.

### Error Handling & Health (v1)
- [Error Handling Dasar]: Redis down → Bun kirim `{type: "error", payload: "storage unavailable"}` ke client. Tidak ada rate limiting di v1. Reconnect di-handle oleh VueUse auto-reconnect.
- [Minimal Health Check]: Redis: `redis-cli ping`. Bun: HTTP endpoint `/health`. `depends_on` dengan `condition: service_healthy` agar Bun tunggu Redis ready.
### File/Image Upload (Issue 07 — resolved)
- [Docker Volume Storage](issues/07-file-upload-architecture.md): File disimpan di `/data/uploads/<roomId>/` via Docker volume mount.
- [HTTP Upload](issues/07-file-upload-architecture.md): Upload via `POST /upload` (multipart/form-data). Download URL di-broadcast ke room via WebSocket.
- [50 MB Max](issues/07-file-upload-architecture.md): Batas ukuran file 50 MB.
- [TTL Sama dengan Room](issues/07-file-upload-architecture.md): File expire bersamaan dengan room (24 jam idle).
- [File sebagai Entry Clipboard](issues/07-file-upload-architecture.md): Entry format diperluas dengan optional `file` field: `{"text", "ts", "file"?: {"name", "size", "url"}}`.
- [Periodic Cleanup](issues/07-file-upload-architecture.md): `setInterval` setiap 1 jam, scan folders, hapus yang room-nya sudah expire di Redis.

## Not yet specified

_(Semua keputusan infrastruktur dasar sudah ter-resolve. Sisa detail implementasi akan dikerjakan di fase to-spec.)_

## Out of scope

- Slicing UI/UX dengan Tailwind — murni di luar peta arsitektur ini.
- QR Code Generator — fitur terpisah, bukan bagian infrastruktur dasar.

