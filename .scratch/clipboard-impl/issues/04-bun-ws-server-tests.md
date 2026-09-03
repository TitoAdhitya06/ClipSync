# 04: Bun WS server tests

**What to build:** Automated test suite for the Bun WebSocket server's message handler — the primary seam identified in the spec. Tests inject a mock Redis client, create test WebSocket connections, send protocol messages, and assert on responses and side effects. A developer can run the test suite and see that all core behaviours (join, paste, sync, history, error handling) are covered and passing.

**Blocked by:** 03 — Bun WS server: join + paste + history flow (needs the handler to exist before testing it).

**Status:** ready-for-agent

- [ ] Test: `join` message → client is subscribed to the room topic
- [ ] Test: `paste` message → entry stored in Redis + broadcast sent to room
- [ ] Test: `sync` message → full history from Redis sent back to client
- [ ] Test: Redis unreachable → `error` message sent to client with "storage unavailable"
- [ ] Test: 50-entry cap enforced (LTRIM after RPUSH)
- [ ] Test: TTL reset on paste activity (EXPIRE called)
- [ ] Mock Redis client used — no real Redis dependency in tests
- [ ] Tests run via `bun test` (or chosen runner) and pass in CI
