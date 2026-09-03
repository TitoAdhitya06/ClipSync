# 04: Bun WS server tests

**What to build:** Add automated tests for the WebSocket server handlers (join, paste, sync). Validate the core business logic (Redis interactions, max history capping, TTL refresh, broadcasting).

**Blocked by:** 03 — Bun WS server: join + paste + history flow (needs the handler to exist before testing it).

**Status:** done

- [x] Test: `join` message → client is subscribed to the room topic
- [x] Test: `paste` message → entry stored in Redis + broadcast sent to room
- [x] Test: `sync` message → full history from Redis sent back to client
- [x] Test: Redis unreachable → `error` message sent to client with "storage unavailable"
- [x] Test: 50-entry cap enforced (LTRIM after RPUSH)
- [x] Test: TTL reset on paste activity (EXPIRE called)
- [x] Mock Redis client used — no real Redis dependency in tests
