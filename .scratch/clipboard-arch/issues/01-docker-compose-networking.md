Type: grilling
Status: resolved

## Question

Bagaimana strategi networking docker-compose agar semua container (Nuxt, Bun, Redis) bisa diakses dari device lain di jaringan lokal?

Pilihan utama:
- **`network_mode: host`** — setiap container langsung bind ke network interface host. Simpel, tapi tidak tersedia di Docker Desktop macOS/Windows.
- **Bridge network + port mapping `0.0.0.0:port:port`** — Docker default, bekerja di semua OS, tapi perlu explicit port mapping.
- **Hybrid** — Redis di bridge (hanya internal), Nuxt dan Bun di-expose via port mapping.

Sub-keputusan:
- Apakah Redis perlu di-expose ke LAN, atau cukup internal antar container?
- Bagaimana container-to-container communication (Bun → Redis)? Pakai Docker service name atau IP?

## Answer

1. **Bridge network + explicit port mapping** — `0.0.0.0:3000:3000` (Nuxt), `0.0.0.0:3001:3001` (Bun). Development di Windows (Docker Desktop), jadi `host` mode bukan opsi. Bridge universal dan predictable.
2. **Redis internal-only** — Tidak di-expose ke LAN, hanya bisa diakses oleh container lain di Docker network. Debugging via `docker exec -it redis redis-cli`.
3. **Docker service name** — Bun connect ke Redis via `redis://redis:6379`. Docker DNS resolve otomatis.
