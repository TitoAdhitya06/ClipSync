# 07: QR Code Generator

**What to build:** Add a QR code sharing feature to the Nuxt client room UI. A "Share" or "QR Code" button in the header should open a modal displaying a QR code of the current room URL. This allows users on other devices (like mobile phones) to easily scan and join the room without manually typing the URL.

**Blocked by:** 05 — Nuxt client: room join + live clipboard UI

**Status:** done

- [x] Nuxt: Install `qrcode.vue` dependency
- [x] Nuxt: Add a QR Code button in the room header
- [x] Nuxt: Implement a modal overlay that appears when the button is clicked
- [x] Nuxt: The modal displays a QR code for the current `window.location.href`
- [x] Nuxt: The modal can be dismissed by clicking outside or an X button
