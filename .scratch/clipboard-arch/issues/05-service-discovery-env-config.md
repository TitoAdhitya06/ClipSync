Type: grilling
Status: resolved

## Question

Bagaimana service-service dalam docker-compose saling menemukan, dan bagaimana browser-side JavaScript di Nuxt tahu alamat WebSocket server?

Keputusan yang perlu diambil:

1. **Container-to-container**: Bun → Redis pakai Docker service name (`redis:6379`) di bridge network, atau hardcode IP?
2. **Browser → WS server**: Browser di device lain perlu tahu IP LAN + port Bun WS. Apakah:
   - Hardcode di env var saat build Nuxt (`NUXT_PUBLIC_WS_URL`)?
   - Nuxt SSR detect IP server lalu inject ke client?
   - Client-side auto-detect dari `window.location.hostname` (asumsi Nuxt dan Bun di host yang sama)?
3. **Env var management**: Satu file `.env` di root monorepo, atau per-service `.env`?

## Answer

1. **Docker service name** — Sudah dijawab di Issue 01: Bun connect ke `redis://redis:6379`, Docker DNS resolve otomatis.
2. **`window.location.hostname` + hardcoded port** — Client derive WS URL: `ws://${window.location.hostname}:3001`. Karena Nuxt dan Bun di host yang sama (satu docker-compose), hostname selalu benar. Zero config.
3. **Satu `.env` di root monorepo** — Untuk proyek ini, satu file cukup. `docker-compose.yml` langsung reference `${VAR}` dari root `.env`.
