import { MessageType } from '@clipboard-lokal/shared';

const PORT = Number(process.env.WS_PORT) || 3001;

const server = Bun.serve({
  port: PORT,

  fetch(req) {
    const url = new URL(req.url);

    if (url.pathname === '/health') {
      return new Response('OK', { status: 200 });
    }

    return new Response('Not Found', { status: 404 });
  },
});

// Prove that shared types import works
console.log(`[server] Message types available: ${Object.values(MessageType).join(', ')}`);
console.log(`[server] Listening on http://localhost:${server.port}`);
