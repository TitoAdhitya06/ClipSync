# Riset: Bun.serve() WebSocket API

Sumber: [bun.sh/docs/api/websockets](https://bun.sh/docs/api/websockets)

## Temuan Utama

### 1. API Dasar Bun.serve() WebSocket

Bun.serve() mendukung WebSocket server-side secara native. Upgrade request dilakukan di `fetch` handler:

```ts
Bun.serve({
  fetch(req, server) {
    if (server.upgrade(req)) {
      return; // upgrade berhasil, jangan return Response
    }
    return new Response("Upgrade failed", { status: 500 });
  },
  websocket: {
    message(ws, message) {},
    open(ws) {},
    close(ws, code, message) {},
    drain(ws) {},
  },
});
```

**Perbedaan kunci vs Node.js**: Handler didaftarkan **sekali per server**, bukan per socket. Ini lebih efisien karena menghindari overhead event listener per koneksi.

### 2. Built-in Pub/Sub — YA, tersedia

Bun punya **native pub/sub API** berbasis topic. Ini **sangat cocok** untuk mekanisme room:

```ts
// Di handler open — subscribe ke room
open(ws) {
  ws.subscribe("clipboard:abc123");
}

// Di handler message — broadcast ke semua subscriber
message(ws, message) {
  server.publish("clipboard:abc123", message);
}

// Di handler close — unsubscribe
close(ws) {
  ws.unsubscribe("clipboard:abc123");
}
```

**Penting**: `ws.publish(topic, data)` mengirim ke **semua subscriber kecuali pengirim**. `server.publish(topic, data)` mengirim ke **semua subscriber termasuk pengirim**.

Untuk clipboard sharing, kita pakai `server.publish()` agar pengirim juga menerima konfirmasi.

### 3. Contextual Data (`ws.data`) — YA, tersedia

Data per-connection disimpan via `ws.data`, di-set saat `server.upgrade()`:

```ts
type WebSocketData = {
  roomId: string;
  joinedAt: number;
};

Bun.serve({
  fetch(req, server) {
    const url = new URL(req.url);
    const roomId = url.searchParams.get("room");
    server.upgrade(req, {
      data: { roomId, joinedAt: Date.now() } satisfies WebSocketData,
    });
  },
  websocket: {
    data: {} as WebSocketData,
    open(ws) {
      ws.subscribe(`clipboard:${ws.data.roomId}`);
    },
    message(ws, message) {
      // akses ws.data.roomId
    },
  },
});
```

### 4. Konfigurasi dan Batasan

| Setting | Default | Keterangan |
|---------|---------|------------|
| `idleTimeout` | 120 detik | Koneksi idle di-close otomatis |
| `maxPayloadLength` | 16 MB | Ukuran pesan maksimal |
| `perMessageDeflate` | false | Kompresi per-pesan |

**Backpressure**: `ws.send()` return `-1` (backpressure), `0` (dropped), atau `1+` (bytes sent).

### 5. Performance

Bun WS dibangun di atas uWebSockets — **7x lebih cepat** dari Node.js + ws untuk simple chatroom benchmark.

## Kesimpulan untuk Arsitektur

- **Pakai built-in pub/sub** sebagai mekanisme room. Tidak perlu manual tracking Set/Map of connections.
- **`ws.data`** untuk menyimpan `roomId` per koneksi.
- Topic name: `clipboard:<roomId>`.
- `idleTimeout` perlu dinaikkan (misal 300 detik) untuk HP yang kadang idle.
- Tidak perlu library tambahan — Bun.serve() sudah cukup.
