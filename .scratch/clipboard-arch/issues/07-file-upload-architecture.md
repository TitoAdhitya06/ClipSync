Type: grilling
Status: resolved

## Question

Bagaimana arsitektur file/image upload agar user bisa berbagi file antar device dan download ke device lain? Use case: menggantikan share file via chat app yang memberatkan storage.

Keputusan yang perlu diambil:

1. **Storage**: Di mana file disimpan? Docker volume, in-memory, atau Redis?
2. **Upload mechanism**: HTTP upload atau WebSocket binary frame?
3. **File size limit**: Berapa batas ukuran file?
4. **TTL**: Berapa lama file disimpan sebelum dihapus?
5. **Integrasi dengan room**: File muncul sebagai entry clipboard biasa atau terpisah?
6. **Cleanup**: Siapa yang hapus file dari disk saat room expire?

## Answer

1. **Docker volume** — File disimpan di `/data/uploads/<roomId>/` via Docker volume mount. Simpel, persistent across restarts, cocok untuk foto dan berkas kerja.
2. **HTTP upload** (`POST /upload`, multipart/form-data) — Browser `fetch` + `FormData` untuk upload. Bun return download URL. Link di-broadcast ke room via WebSocket. WebSocket tetap hanya untuk messaging.
3. **50 MB max** — Cukup untuk foto high-res, dokumen, video pendek. ~4 detik upload di Wi-Fi 100Mbps.
4. **Sama dengan room — 24 jam idle** — Konsisten dengan clipboard entries. User tidak perlu buru-buru download.
5. **Sebagai entry clipboard biasa** — Entry format diperluas: `{"text": "...", "ts": ..., "file"?: {"name": "foto.jpg", "size": 1234, "url": "/files/<roomId>/foto.jpg"}}`. Satu timeline untuk teks dan file.
6. **Per-room subfolder + periodic cleanup** — File di `/data/uploads/<roomId>/`. Cleanup via `setInterval` setiap 1 jam di Bun: scan folders, cek `EXISTS clipboard:<roomId>`, hapus folder yang room-nya sudah expire.
