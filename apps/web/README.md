# ClipSync Web

Web client for ClipSync, built with Nuxt 3 and Tailwind CSS.

## Features

- Real-time clipboard synchronization with WebSocket connection.
- File upload and download support up to 50 MB.
- QR code modal for mobile device pairing on the local network.
- Reactive status indicator for connection state.

## Stack

- Framework: Nuxt 3 with Vue 3
- Styling: Tailwind CSS v4
- WebSocket: `@vueuse/core`
- Icons: `@lucide/vue`
- QR Code: `qrcode.vue`

## Development

Install dependencies from the repository root:

```bash
pnpm install
```

Start the Nuxt development server:

```bash
pnpm dev
```

The web client runs at `http://localhost:3000` by default.

## Production build

Build the application for production:

```bash
pnpm build
```

Preview the production build locally:

```bash
pnpm preview
```

## Environment variables

- `NUXT_PORT`: Web server port (default: `3000`).
