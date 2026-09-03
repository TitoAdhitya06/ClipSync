Status: ready-for-agent

## Problem Statement

Pengguna ingin berbagi teks, URL, dan file antar device (laptop, HP, tablet) yang berada di jaringan lokal yang sama secara real-time, tanpa harus login, install aplikasi, atau bergantung pada layanan cloud. Saat ini, proses copy-paste dan file sharing lintas device memerlukan aplikasi pihak ketiga (chat app, cloud storage) yang seringkali butuh akun, koneksi internet, memberatkan storage device, atau setup rumit.

## Solution

Aplikasi web real-time clipboard sharing yang berjalan di jaringan lokal. Pengguna membuka browser, masuk ke room dengan ID pendek, lalu apa pun yang di-paste atau di-upload di satu device langsung muncul di semua device lain yang ada di room yang sama. File bisa langsung di-download ke device tujuan tanpa memberatkan storage — file hanya transit, bukan disimpan permanen. Tidak perlu login, tidak perlu internet — cukup satu jaringan Wi-Fi.

Sistem terdiri dari 3 service yang di-orchestrate via Docker Compose: Nuxt 3 SSR sebagai frontend, Bun WebSocket server sebagai backend real-time, dan Redis sebagai penyimpanan sementara.

## User Stories

1. As a user, I want to open the app in my browser on any device, so that I can start sharing clipboard content without installing anything.
2. As a user, I want to join a room by entering a short room ID, so that I can quickly connect multiple devices.
3. As a user, I want to paste text or a URL into the app, so that it instantly appears on all other devices in the same room.
4. As a user, I want to see a live-updating list of all clipboard entries in my room, so that I can access anything that was shared.
5. As a user, I want my clipboard history to persist for 24 hours, so that I can rejoin and still see previous entries.
6. As a user, I want the connection to automatically reconnect if my phone goes to sleep and wakes up, so that I don't have to manually rejoin.
7. As a user, I want to see when my connection is lost and when it recovers, so that I know if my paste will be delivered.
8. As a user, I want the app to re-fetch all clipboard history after reconnecting, so that I don't miss any entries shared while I was disconnected.
9. As a user, I want the app to work without internet — only local network, so that I can use it in offline environments or without trusting a cloud service.
10. As a user, I want to see timestamps on each clipboard entry, so that I know when something was shared.
11. As a user, I want the room to be created automatically when I join, so that I don't need a separate "create room" step.
12. As a user, I want old rooms to be cleaned up automatically after 24 hours of inactivity, so that server resources are not wasted.
13. As a developer, I want to start the entire stack with a single command (`docker compose up`), so that setup is trivial.
14. As a developer, I want a local development mode that runs both apps in parallel (`pnpm dev`), so that I can iterate quickly without Docker.
15. As a developer, I want shared TypeScript types between client and server, so that the message protocol is type-safe and changes propagate automatically.
16. As a user, I want the app to work on any device with a modern browser (laptop, phone, tablet), so that I'm not restricted to specific platforms.
17. As a user, I want zero configuration — just open the URL and go, so that the barrier to entry is as low as possible.
18. As a user, I want to upload a file (photo, document) to the room, so that other devices can download it without using a chat app.
19. As a user, I want to see uploaded files in the same timeline as text entries, so that I have one unified view of everything shared.
20. As a user, I want to download shared files directly to my device, so that I don't need to go through a chat app that clutters my storage.
21. As a user, I want uploaded files to be cleaned up automatically after the room expires, so that server disk space is not wasted.
22. As a user, I want a file size limit of 50 MB, so that the upload is fast on local Wi-Fi and doesn't overwhelm the server.
23. As a user, I want to see the filename and size of uploaded files before downloading, so that I know what I'm downloading.

## Implementation Decisions

### Architecture — 3 Container Model

- Tiga container terpisah: **Nuxt 3 SSR** (port 3000), **Bun WebSocket server** (port 3001), **Redis** (port 6379).
- Masing-masing punya Dockerfile sendiri.
- Orchestrated via `docker-compose.yml` di root monorepo.
- Semua komunikasi via HTTP dan `ws://` — tidak ada TLS (jaringan lokal).

### Docker Networking

- **Bridge network** dengan explicit port mapping: `0.0.0.0:3000:3000` (Nuxt), `0.0.0.0:3001:3001` (Bun).
- **Redis internal-only** — tidak di-expose ke LAN, hanya bisa diakses oleh container lain di Docker network.
- Container-to-container via **Docker service name** DNS: Bun connect ke `redis://redis:6379`.
- **Health check**: Redis via `redis-cli ping`, Bun via `/health` endpoint. `depends_on` dengan `condition: service_healthy` agar Bun tunggu Redis ready.

### Bun WebSocket Server

- Menggunakan `Bun.serve()` dengan built-in WebSocket support — tidak perlu library tambahan.
- **Pub/sub bawaan** sebagai mekanisme room: `ws.subscribe("clipboard:<roomId>")`, `server.publish("clipboard:<roomId>", data)`.
- Data per-connection disimpan via `ws.data` (di-set saat `server.upgrade()`): berisi `roomId` dan `joinedAt`.
- `idleTimeout` dinaikkan ke ~300 detik (default 120 detik) untuk mengakomodasi HP yang kadang idle.
- `server.publish()` (bukan `ws.publish()`) agar pengirim juga menerima konfirmasi broadcast.

### Message Protocol

- Format JSON: `{type: "join"|"paste"|"sync"|"history"|"error"|"file-shared", roomId: string, payload?: string}`.
- Tanpa binary frame. File upload via HTTP terpisah, bukan WebSocket.
- Tipe message:
  - `join` — client bergabung ke room, server subscribe ke topic.
  - `paste` — client mengirim teks baru, server simpan ke Redis + broadcast ke room.
  - `sync` — client request re-fetch history (saat pertama connect atau reconnect).
  - `history` — server mengirim seluruh clipboard history ke client (termasuk file entries).
  - `error` — server mengirim error message ke client (misal Redis unavailable).
  - `file-shared` — server broadcast ke room setelah file berhasil di-upload. Payload berisi file metadata.

### Redis Schema

- **Data type**: Redis List per room, key `clipboard:<roomId>`.
- **Operations**: `RPUSH` (tambah entry), `LRANGE 0 -1` (baca semua), `LTRIM` (enforce cap).
- **Max entries**: 50 per room, enforce via `LTRIM -50 -1` setelah setiap `RPUSH`.
- **TTL**: 24 jam, **reset on activity** — `EXPIRE clipboard:<roomId> 86400` dijalankan setiap `RPUSH`. Room idle hilang otomatis.
- **Entry format**: JSON minimal — `{"text": "...", "ts": <unix_ms>, "file"?: {"name": "...", "size": <bytes>, "url": "/files/<roomId>/..."}}`. Timestamp **server-generated** (`Date.now()` di Bun). Field `file` optional — hanya ada untuk file upload entries.
- **Room existence**: Create-on-first-join. Tidak ada explicit "create room" step. Room ID = random short string (generated client-side atau dari URL).

### Nuxt 3 Client

- VueUse `useWebSocket` sebagai satu-satunya WebSocket library.
- **SSR-safe**: `immediate: false` + `onMounted(() => open())`.
- **Auto-reconnect**: unlimited retries, exponential backoff cap 30 detik.
- **Heartbeat**: aktif, interval ~30 detik, pongTimeout 5 detik.
- **Visibility API**: `useDocumentVisibility()` watcher untuk proactive reconnect saat HP wake dari sleep.
- **Sync on reconnect**: di callback `onConnected`, kirim `{type: "sync", roomId}` untuk re-fetch history.
- **WS URL discovery**: `ws://${window.location.hostname}:3001` — zero config, auto-detect dari hostname halaman Nuxt.

### Monorepo Structure

- **pnpm workspace** dengan layout:
  - `apps/web/` — Nuxt 3 app
  - `apps/server/` — Bun WebSocket server
  - `packages/shared/` — TypeScript types untuk message protocol
- **Root scripts**: `dev` (paralel via `pnpm --parallel`), `docker:up`, `docker:down`.
- **Single `.env`** di root monorepo untuk semua konfigurasi.
- **Dockerfile base images**: `oven/bun:1` (server), `node:20-alpine` (Nuxt).

### File/Image Upload

- **Storage**: Docker volume mount di `/data/uploads/<roomId>/`. File disimpan per-room subfolder.
- **Upload mechanism**: HTTP `POST /upload` (multipart/form-data) ke Bun server. Bun simpan file ke disk, simpan entry metadata ke Redis, lalu broadcast `file-shared` message ke room via WebSocket.
- **Download**: Bun serve static files via `GET /files/<roomId>/<filename>`.
- **File size limit**: 50 MB max.
- **TTL**: Sama dengan room — 24 jam idle. File expire bersamaan dengan clipboard entries.
- **Cleanup**: `setInterval` setiap 1 jam di Bun. Scan `/data/uploads/`, cek `EXISTS clipboard:<roomId>` di Redis. Hapus folder yang room-nya sudah expire.

### Error Handling (v1)

- Redis down → Bun kirim `{type: "error", payload: "storage unavailable"}` ke client.
- Tidak ada rate limiting di v1.
- Client reconnect sepenuhnya di-handle oleh VueUse auto-reconnect.

## Testing Decisions

### Primary Seam: Bun WS Server — Message Handler

Test di level message handler server, yang merupakan titik tertinggi dan paling bernilai. Test ini meng-cover seluruh flow:

- Terima message `join` → assert client ter-subscribe ke room topic.
- Terima message `paste` → assert entry tersimpan di Redis + broadcast dikirim ke room.
- Terima message `sync` → assert history dari Redis dikirim ke client (termasuk file entries).
- Redis unreachable → assert error message dikirim ke client.
- `POST /upload` → assert file tersimpan di disk, entry metadata di Redis, broadcast `file-shared` ke room.
- `GET /files/<roomId>/<file>` → assert file served correctly, 404 jika room/file tidak ada.

Cara test: inject mock Redis client, buat WS test connection, kirim message, assert response dan side effects. Test perilaku eksternal (apa yang client terima), bukan implementasi internal.

### Secondary Seam: `packages/shared` — Message Validation

Jika ada parsing/validation logic di shared package (validasi bahwa message sesuai protocol schema), test di sini. Pure function, mudah di-test tanpa mock.

### Tidak Perlu Seam Terpisah

- **Redis operations** — sudah ter-cover lewat seam server (mock Redis).
- **Nuxt client composable** — wrapper tipis di atas VueUse, logic minimal. Testing ini berarti testing library orang lain.

## Out of Scope

- **UI/UX slicing** — desain visual, Tailwind styling, responsive layout. Murni di luar spec arsitektur ini.
- **QR Code Generator** — fitur terpisah untuk sharing room ID via QR. Bukan bagian infrastruktur dasar.
- **Authentication/authorization** — tidak ada login, tidak ada access control per room di v1.
- **Rate limiting** — tidak ada di v1.
- **Multi-server scaling** — single instance Bun server. Horizontal scaling bukan concern untuk jaringan lokal.
- **Persistent storage** — Redis + disk volume sebagai storage sementara. Tidak ada database permanen.

## Further Notes

- Bahasa pengantar proyek ini adalah **Bahasa Indonesia** (kecuali istilah teknis).
- Room ID di-generate sebagai random short string — panjang dan format exact belum ditentukan (implementation detail).
- Seluruh keputusan arsitektur berasal dari 5 sesi grilling dan 2 riset yang terdokumentasi di `.scratch/clipboard-arch/`. Referensi:
  - [Arsitektur Map (completed)](.scratch/clipboard-arch/map.md)
  - [Bun WebSocket API Research](.scratch/clipboard-arch/research/bun-websocket-api.md)
  - [Nuxt WebSocket Integration Research](.scratch/clipboard-arch/research/nuxt-websocket-integration.md)
  - [File Upload Architecture](.scratch/clipboard-arch/issues/07-file-upload-architecture.md)
