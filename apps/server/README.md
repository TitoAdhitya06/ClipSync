# ClipSync Server

Backend server for ClipSync, built with Bun and Redis.

## Features

- HTTP and WebSocket handling via `Bun.serve`.
- Room-based real-time synchronization with Redis list storage and 24-hour TTL.
- File upload handling up to 50 MB with disk persistence.
- Automatic hourly disk cleanup for expired room data.
- LAN IP detection endpoint for local network discovery.

## Endpoints

### HTTP endpoints

- `GET /health`: Health check endpoint.
- `GET /ip`: Returns active local network IPv4 address.
- `POST /upload`: Uploads a file (multipart form data with `roomId` and `file`).
- `GET /files/:roomId/:filename`: Downloads a previously uploaded file.

### WebSocket protocol

Connects to `ws://<host>:<port>` and receives JSON messages based on `@clipboard-lokal/shared`:

- `join`: Subscribe to a room and receive the initial clipboard history.
- `paste`: Push a new text entry to the room and broadcast to subscribers.
- `sync`: Re-fetch the current room history.
- `history`: Server payload containing recent clipboard entries.
- `file-shared`: Server notification when a new file upload is completed.
- `error`: Server notification for failed operations.

## Development

Run development server with hot reload:

```bash
bun run dev
```

Run test suite:

```bash
bun test --isolate
```

## Environment variables

- `WS_PORT`: Server port (default: `3001`).
- `REDIS_URL`: Redis connection URL (default: `redis://localhost:6379`).
- `UPLOAD_DIR`: Storage path for file uploads (default: `./uploads`).
