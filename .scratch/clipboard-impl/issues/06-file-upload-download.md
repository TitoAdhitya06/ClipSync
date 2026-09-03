# 06: File upload + download (end-to-end)

**What to build:** End-to-end file sharing within a room. A user picks a file (photo, document, up to 50 MB) on one device, it uploads to the Bun server via HTTP, the server stores it on disk, records metadata in Redis, and broadcasts a `file-shared` event to the room. All other devices see the file appear in the same clipboard timeline — showing filename and size — with a download link. Files are cleaned up automatically when the room expires.

**Blocked by:** 05 — Nuxt client: room join + live clipboard UI (needs the room UI to surface files in the timeline alongside text entries).

**Status:** done

- [x] Bun: `POST /upload` endpoint accepts multipart/form-data with `roomId` field
- [x] File saved to `/data/uploads/<roomId>/<filename>` (Docker volume)
- [x] File size limit: 50 MB, reject with appropriate error if exceeded
- [x] File metadata entry stored in Redis: `{"text": "<filename>", "ts": <unix_ms>, "file": {"name": "...", "size": <bytes>, "url": "/files/<roomId>/..."}}`
- [x] `file-shared` message broadcast to room after successful upload
- [x] Bun: `GET /files/<roomId>/<filename>` serves the uploaded file
- [x] Bun: 404 response if room or file does not exist
- [x] Periodic cleanup: `setInterval` every 1 hour scans `/data/uploads/`, deletes folders whose room key no longer exists in Redis
- [x] Nuxt: file upload button/area in room UI
- [x] Nuxt: file entries in timeline show filename, size, and a download link
- [x] Files expire with room (24h idle TTL, same as clipboard entries)
