# Riset: VueUse useWebSocket untuk Nuxt 3

Sumber: [vueuse.org/core/useWebSocket](https://vueuse.org/core/useWebSocket/)

## Temuan Utama

### 1. API Dasar

```ts
import { useWebSocket } from '@vueuse/core'

const { status, data, send, open, close, ws } = useWebSocket('ws://host:3001')
```

**Return values**:
- `data: ShallowRef<any>` — data terakhir yang diterima, bisa di-watch
- `status: ShallowRef<'OPEN' | 'CONNECTING' | 'CLOSED'>` — status koneksi
- `send(data, useBuffer?)` — kirim pesan, return boolean
- `open()` — buka/buka ulang koneksi
- `close(code?, reason?)` — tutup koneksi
- `ws: ShallowRef<WebSocket>` — referensi instance WebSocket

**Callbacks**:
```ts
useWebSocket('ws://...', {
  onConnected(ws) {},
  onDisconnected(ws, event) {},
  onError(ws, event) {},
  onMessage(ws, event) {},
})
```

### 2. SSR-Safe Usage

`useWebSocket` secara default `immediate: true` — langsung connect saat composable dipanggil. Di Nuxt 3 SSR, ini **harus** dipanggil di client-side only.

**Opsi aman**:
- Panggil di dalam `onMounted()` (tapi kehilangan reactivity setup)
- **Rekomendasi**: set `immediate: false` lalu panggil `open()` di `onMounted()`
- Atau bungkus dalam `<ClientOnly>` component
- Atau pakai Nuxt plugin dengan `{ mode: 'client' }`

```ts
// composables/useClipboardSocket.ts
export function useClipboardSocket(roomId: string) {
  const wsUrl = computed(() => `ws://${window.location.hostname}:3001?room=${roomId}`)
  
  const { status, data, send, open, close } = useWebSocket(wsUrl, {
    immediate: false,  // jangan connect saat SSR
    autoReconnect: {
      retries: -1,     // unlimited
      delay: (retries) => Math.min(1000 * 2 ** (retries - 1), 30000),
    },
    heartbeat: {
      message: JSON.stringify({ type: 'ping' }),
      pongTimeout: 5000,
    },
    onConnected(ws) {
      // kirim sync request saat pertama connect / reconnect
      ws.send(JSON.stringify({ type: 'sync', roomId }))
    },
  })

  onMounted(() => open())  // connect hanya di client

  return { status, data, send, close }
}
```

### 3. Auto-Reconnect

Built-in support, sangat lengkap:

```ts
autoReconnect: {
  retries: -1,              // unlimited retries
  delay: 1000,              // fixed 1 detik
  // ATAU exponential backoff:
  delay: (retries) => Math.min(1000 * 2 ** (retries - 1), 30000),
  onFailed() {
    // dipanggil saat max retries tercapai (jika retries bukan -1)
  },
}
```

**Penting**: `close()` yang dipanggil secara eksplisit **TIDAK** trigger auto-reconnect. Hanya disconnect yang tidak disengaja yang di-reconnect.

### 4. Heartbeat

Built-in heartbeat untuk keep-alive:

```ts
heartbeat: {
  message: 'ping',          // pesan yang dikirim
  pongTimeout: 1000,        // timeout menunggu respons
  scheduler: cb => useIntervalFn(cb, 2000),  // interval custom
}
```

Ini penting untuk **HP sleep/wake** — heartbeat akan mendeteksi koneksi mati dan trigger reconnect.

### 5. Lifecycle — HP Sleep/Wake, Tab Background

`useWebSocket` punya `autoClose: true` (default) yang menutup koneksi saat `beforeunload`. Tapi untuk HP sleep:

- **Sleep**: WebSocket connection biasanya dropped oleh OS. `autoReconnect` akan handle ini.
- **Tab background/foreground**: Bisa dikombinasikan dengan `useDocumentVisibility()` dari VueUse untuk proactive reconnect:

```ts
const visibility = useDocumentVisibility()
watch(visibility, (state) => {
  if (state === 'visible' && status.value === 'CLOSED') {
    open()
  }
})
```

### 6. URL sebagai Ref

URL bisa berupa `MaybeRefOrGetter<string | URL | undefined>`. Dengan `autoConnect: true` (default), perubahan URL otomatis reconnect ke URL baru. Berguna jika room berubah.

## Kesimpulan untuk Arsitektur

- **VueUse `useWebSocket` sudah cukup** — tidak perlu library tambahan atau custom wrapper.
- **SSR-safe**: gunakan `immediate: false` + `onMounted(() => open())`.
- **Auto-reconnect**: unlimited retries dengan exponential backoff (cap 30 detik).
- **Heartbeat**: aktifkan dengan interval 30 detik dan pongTimeout 5 detik.
- **Visibility API**: tambahkan `useDocumentVisibility()` watcher untuk proactive reconnect saat HP wake.
- **Sync on reconnect**: di callback `onConnected`, kirim `{type: "sync", roomId}` untuk re-fetch history.
