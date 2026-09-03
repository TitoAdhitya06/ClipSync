# 05: Nuxt client — room join + live clipboard UI

**What to build:** The Nuxt 3 frontend where a user opens a browser, enters (or is given) a short room ID, and lands on a room page showing a live-updating clipboard timeline. Pasting text in the input instantly broadcasts it to all other devices in the room. The connection auto-reconnects after phone sleep or network blips, re-fetches missed history on reconnect, and shows connection status (connected/disconnected) so the user knows if their paste will be delivered.

**Blocked by:** 03 — Bun WS server (needs a running WS server to connect to).

**Status:** ready-for-agent

- [ ] Landing page with room ID input — joining navigates to `/<roomId>`
- [ ] Room page displays a live-updating list of clipboard entries with timestamps
- [ ] Text input field — submitting sends a `paste` message over WebSocket
- [ ] VueUse `useWebSocket` composable: `immediate: false` + `onMounted(() => open())`
- [ ] Auto-reconnect: unlimited retries, exponential backoff capped at 30 seconds
- [ ] Heartbeat: interval ~30s, pong timeout 5s
- [ ] `useDocumentVisibility()` watcher: proactive reconnect when tab/phone wakes from sleep
- [ ] On reconnect: send `{type: "sync", roomId}` to re-fetch full history
- [ ] Connection status indicator visible to user (connected / reconnecting / disconnected)
- [ ] WS URL derived from `ws://${window.location.hostname}:3001` — zero config
- [ ] Room auto-created on join (no "create room" step)
- [ ] Works on mobile browser, tablet, and desktop (responsive layout)
