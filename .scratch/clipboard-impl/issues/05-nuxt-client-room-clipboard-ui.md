# 05: Nuxt client: room join + live clipboard UI

**What to build:** The core frontend features. A landing page to join a room, and the room page itself which connects to the WS server and displays the real-time clipboard list. Includes robust connection management (auto-reconnect, proactive wakeup).

**Blocked by:** 03 — Bun WS server (needs a running WS server to connect to).

**Status:** done

- [x] Landing page with room ID input — joining navigates to `/<roomId>`
- [x] Room page displays a live-updating list of clipboard entries with timestamps
- [x] Text input field — submitting sends a `paste` message over WebSocket
- [x] VueUse `useWebSocket` composable: `immediate: false` + `onMounted(() => open())`
- [x] Auto-reconnect: unlimited retries, exponential backoff capped at 30 seconds
- [x] Heartbeat: interval ~30s, pong timeout 5s
- [x] `useDocumentVisibility()` watcher: proactive reconnect when tab/phone wakes from sleep
- [x] On reconnect: send `{type: "sync", roomId}` to re-fetch full history
- [x] Connection status indicator visible to user (connected / reconnecting / disconnected)
- [x] WS URL derived from `ws://${window.location.hostname}:3001` — zero config
- [x] Room auto-created on join (no "create room" step)
- [x] Works on mobile browser, tablet, and desktop (responsive layout)
