# 03: Bun WS server — join + paste + history flow

**What to build:** Implement the core WebSocket message handler in the Bun server so that clients can join a room, paste text, and receive live broadcasts and full history. After this ticket, a developer can use `wscat` (or any WS client) to connect to the Bun server, send a `join` message for a room, paste text entries that all other clients in the same room receive instantly, and request the full clipboard history which is persisted in Redis with 24-hour TTL.

**Blocked by:** 01 — Monorepo scaffold + shared types (imports the shared `ClipboardMessage` type).

**Status:** done

- [x] `Bun.serve()` with HTTP + WebSocket on port 3001
- [x] WebSocket upgrade sets `ws.data` with `roomId` and `joinedAt`
- [x] `join` message → `ws.subscribe("clipboard:<roomId>")`, send current history back
- [x] `paste` message → `RPUSH` entry to `clipboard:<roomId>`, `LTRIM -50 -1`, `EXPIRE 86400`, then `server.publish()` to room (sender included)
- [x] `sync` message → `LRANGE 0 -1` on `clipboard:<roomId>`, send `history` response
- [x] Entry format: `{"text": "...", "ts": <unix_ms>}` with server-generated timestamp
- [x] Redis unreachable → send `{type: "error", payload: "storage unavailable"}` to client
- [x] `idleTimeout` set to ~300 seconds
- [x] `/health` endpoint returns 200 when server is running
- [x] Room auto-created on first join (no separate create step)
