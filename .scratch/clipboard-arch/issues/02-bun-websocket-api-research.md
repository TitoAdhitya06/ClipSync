Type: research
Status: resolved

## Question

Bagaimana Bun.serve() menangani WebSocket dengan fitur pub/sub bawaan? Riset yang dibutuhkan:

1. API `Bun.serve()` untuk WebSocket — bagaimana handler `open`, `message`, `close` bekerja?
2. Apakah Bun punya built-in pub/sub topics (seperti `ws.subscribe(topic)`, `ws.publish(topic, data)`)? Jika ya, apakah bisa dipakai sebagai mekanisme room tanpa manual tracking?
3. Bagaimana cara menyimpan data per-connection (misalnya `roomId`) di Bun WS? Apakah ada `ws.data` field?
4. Batasan dan gotcha Bun WS yang perlu diketahui (max connections, backpressure, memory).

Sumber utama: dokumentasi resmi Bun (bun.sh/docs).

## Answer

Bun.serve() punya **built-in pub/sub** (`ws.subscribe(topic)`, `server.publish(topic, data)`) yang langsung bisa dipakai sebagai mekanisme room tanpa manual tracking. Data per-connection disimpan via `ws.data` (di-set saat `server.upgrade()`). Default idle timeout 120 detik (perlu dinaikkan untuk mobile). Backpressure di-handle via return value `ws.send()`. Tidak perlu library tambahan.

Detail lengkap: [research/bun-websocket-api.md](../research/bun-websocket-api.md)
