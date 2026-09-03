Type: grilling
Status: resolved

## Question

Seperti apa struktur folder monorepo final dan konfigurasi pnpm workspace?

Keputusan yang perlu diambil:

1. **Layout folder**: Konfirmasi struktur berikut atau adjust:
   ```
   clipboard-lokal/
   ├── apps/
   │   ├── web/          ← Nuxt 3 app
   │   │   ├── nuxt.config.ts
   │   │   ├── Dockerfile
   │   │   └── ...
   │   └── server/       ← Bun WebSocket server
   │       ├── src/
   │       │   └── index.ts
   │       ├── Dockerfile
   │       └── package.json
   ├── docker-compose.yml
   ├── pnpm-workspace.yaml
   ├── package.json      ← root, scripts: dev, docker:up, docker:down
   └── .env
   ```
2. **Root scripts**: Apa saja script di root `package.json`? (`dev` untuk jalankan keduanya paralel? `docker:up`/`docker:down`?)
3. **Shared package**: Apakah perlu `packages/shared` sekarang untuk tipe TypeScript yang dipakai kedua app, atau tunda?
4. **Dockerfile base images**: `oven/bun:1-alpine` untuk server, `node:20-alpine` untuk Nuxt — atau ada preferensi lain?

## Answer

1. **Layout confirmed** — Struktur di atas disetujui. Tambahkan `packages/shared/` untuk shared types.
2. **Minimal root scripts** — `dev` (jalankan kedua app paralel via `pnpm --parallel`), `docker:up` (`docker compose up -d --build`), `docker:down` (`docker compose down`).
3. **Buat `packages/shared` sekarang** — Minimal, untuk TypeScript types message protocol (`ClipboardMessage`, `MessageType`) agar client dan server pakai type yang sama. Mencegah type drift.
4. **`oven/bun:1`** (server, non-alpine untuk avoid native dependency issues) + **`node:20-alpine`** (Nuxt, alpine fine untuk Node.js ecosystem).
