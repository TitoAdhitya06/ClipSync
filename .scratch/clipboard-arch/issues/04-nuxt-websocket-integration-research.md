Type: research
Status: resolved

## Question

Bagaimana mengintegrasikan WebSocket di Nuxt 3 client-side secara SSR-safe menggunakan VueUse? Riset yang dibutuhkan:

1. API `useWebSocket` dari VueUse — options apa saja yang tersedia (autoReconnect, heartbeat, dll)?
2. Bagaimana memastikan WebSocket hanya diinisialisasi di client-side (bukan saat SSR)? Apakah cukup `onMounted()` atau perlu `<ClientOnly>`?
3. Konfigurasi auto-reconnect: interval, max retries, exponential backoff?
4. Bagaimana menangani lifecycle — HP sleep/wake, tab background/foreground, visibility change?
5. Alternatif selain VueUse jika ada limitasi (misalnya composable custom yang wrap native WebSocket).

Sumber utama: dokumentasi VueUse (vueuse.org) dan Nuxt 3 (nuxt.com).

## Answer

VueUse `useWebSocket` sudah cukup — SSR-safe dengan `immediate: false` + `onMounted(() => open())`. Auto-reconnect built-in dengan exponential backoff (`delay: retries => Math.min(1000 * 2**(retries-1), 30000)`). Heartbeat built-in untuk keep-alive. Untuk HP sleep/wake, kombinasikan dengan `useDocumentVisibility()` watcher. Sync on reconnect via callback `onConnected`. URL bisa reactive ref. Tidak perlu library tambahan atau custom wrapper.

Detail lengkap: [research/nuxt-websocket-integration.md](../research/nuxt-websocket-integration.md)
