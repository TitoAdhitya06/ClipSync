Type: grilling
Status: resolved

## Question

Detail skema data Redis dan strategi TTL untuk clipboard room. Keputusan yang perlu diambil:

1. **Tipe data Redis**: Redis List (`RPUSH`/`LRANGE`) vs Redis Stream vs sorted set? List paling simpel, tapi apakah cukup?
2. **Batas item per room**: Berapa maksimal entry clipboard per room? (misal 50, 100, 200?) Dan bagaimana enforce-nya — `LTRIM` setelah setiap push?
3. **TTL renewal**: Apakah TTL room di-reset setiap kali ada aktivitas baru (paste), atau fixed 24 jam sejak room dibuat?
4. **Data shape per entry**: Cukup string biasa, atau perlu metadata (timestamp, device ID)?
5. **Room existence check**: Bagaimana server tahu apakah room valid? Cek key exists di Redis, atau create-on-first-join?

## Answer

1. **Redis List** (`RPUSH`/`LRANGE`) — Clipboard entries hanya perlu append + read-all + trim. Paling simpel, tidak perlu fitur Stream/Sorted Set.
2. **50 entries max** — Enforce via `LTRIM` setelah setiap `RPUSH`. Cukup untuk sesi sharing singkat, memory footprint kecil.
3. **Reset on activity** — Setiap `RPUSH`, jalankan `EXPIRE clipboard:<roomId> 86400`. Room yang aktif tidak expire; room yang ditinggalkan hilang setelah 24 jam idle.
4. **JSON minimal dengan timestamp** — `{"text": "...", "ts": ...}`. Timestamp **server-generated** (`Date.now()` di Bun) untuk konsistensi. Tanpa device ID di v1.
5. **Create-on-first-join** — Tidak ada explicit "create room" step. Room ID yang belum pernah dipakai = room kosong, bukan error. Key dibuat saat paste pertama.
