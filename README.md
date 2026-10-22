# ClipSync

Real-time clipboard and file sharing across devices on a local network.

ClipSync lets you share text snippets and files between computers, phones, and tablets connected to the same Wi-Fi or LAN. It requires no user accounts and keeps data within your local environment.

## Features

- Real-time text synchronization across devices in the same room.
- Direct file uploads and downloads up to 50 MB.
- Room pairing via QR code for mobile devices.
- Ephemeral storage in Redis capped at 50 entries per room with a 24-hour expiration.
- Automated hourly cleanup of expired file uploads on disk.
- Automatic local IPv4 detection for network discovery.

## Repository structure

This repository is a monorepo managed with `pnpm` workspaces:

```text
clipboard-lokal/
├── apps/
│   ├── server/          # Bun HTTP and WebSocket backend with Redis
│   └── web/             # Nuxt 3 and Tailwind CSS frontend
├── packages/
│   └── shared/          # Shared TypeScript message types and interfaces
├── scripts/
│   └── start.mjs        # Network IP discovery and Docker startup script
└── docker-compose.yml   # Multi-service deployment definition
```

## Prerequisites

- Node.js >= 20
- pnpm >= 9
- Bun >= 1.1 (for running the backend directly)
- Docker and Docker Compose (for containerized execution)

## Quick start with Docker

The fastest way to run ClipSync is using Docker Compose.

1. Clone the repository:
   ```bash
   git clone <repo-url>
   cd clipboard-lokal
   ```

2. Start all services:
   ```bash
   npm run docker:up
   ```

   The script prints the local computer URL and the LAN address for other devices on your network:
   ```text
   Access on this Computer: http://localhost:3000
   Access on other Devices: http://192.168.1.x:3000
   ```

3. Stop the services when finished:
   ```bash
   npm run docker:down
   ```

## Local development

To run the frontend and backend in development mode without full Docker virtualization:

1. Install workspace dependencies:
   ```bash
   pnpm install
   ```

2. Start the local Redis instance:
   ```bash
   docker compose up -d redis
   ```

3. Copy the environment configuration:
   ```bash
   cp .env.example .env
   ```

4. Start both applications in parallel:
   ```bash
   pnpm dev
   ```

   - Web client: `http://localhost:3000`
   - Backend server: `http://localhost:3001`

## Running tests

Run the server integration tests:

```bash
pnpm test
```

Tests run in isolated execution contexts using Bun test runner and mock Redis storage.

## Environment variables

Configure these variables in your `.env` file or container environment:

| Variable | Default (Local) | Default (Docker) | Description |
| :--- | :--- | :--- | :--- |
| `REDIS_URL` | `redis://localhost:6379` | `redis://redis:6379` | Redis connection URL |
| `WS_PORT` | `3001` | `3001` | Server HTTP and WebSocket port |
| `NUXT_PORT` | `3000` | `3000` | Frontend web application port |
| `UPLOAD_DIR` | `./uploads` | `/data/uploads` | Disk path for uploaded files |

## WebSocket protocol

Clients communicate with the backend over a single WebSocket connection using JSON payloads typed in `@clipboard-lokal/shared`:

| Message type | Sender | Description |
| :--- | :--- | :--- |
| `join` | Client | Subscribes to a room and requests current history. |
| `paste` | Client | Appends a new text entry to the room. |
| `sync` | Client | Requests complete room history synchronization. |
| `history` | Server | Broadcasts recent clipboard items to subscribers. |
| `file-shared` | Server | Notifies subscribers about an uploaded file. |
| `error` | Server | Notifies client about processing or storage errors. |

## HTTP endpoints

The backend server exposes the following HTTP routes:

- `GET /health`: Health check endpoint returning HTTP 200.
- `GET /ip`: Returns active local IPv4 address as JSON.
- `POST /upload`: Handles multipart form uploads (`roomId` and `file`).
- `GET /files/:roomId/:filename`: Streams uploaded files for download.

## License

MIT
