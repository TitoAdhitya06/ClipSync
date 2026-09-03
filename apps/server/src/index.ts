import type { Server, ServerWebSocket } from 'bun';
import { MessageType, ClipboardMessage, ClipboardEntry, HistoryMessage, ErrorMessage, FileSharedMessage } from '@clipboard-lokal/shared';
import { mkdir, readdir, rm } from 'node:fs/promises';
import { join } from 'node:path';
import { existsSync } from 'node:fs';
import { redis } from './redis';

const PORT = process.env.NODE_ENV === 'test' ? 0 : (process.env.WS_PORT !== undefined ? Number(process.env.WS_PORT) : 3001);
const MAX_HISTORY = 50;
const HISTORY_TTL = 86400; // 24 hours in seconds
const UPLOAD_DIR = process.env.UPLOAD_DIR || join(process.cwd(), 'uploads');
const MAX_FILE_SIZE = 50 * 1024 * 1024; // 50 MB

type WebSocketData = {
  roomId?: string;
  joinedAt?: number;
};

export const server = Bun.serve<WebSocketData>({
  port: PORT,

  fetch(req: Request, server: Server<WebSocketData>) {
    const url = new URL(req.url);

    if (url.pathname === '/health') {
      return new Response('OK', { status: 200 });
    }

    if (url.pathname === '/upload' && req.method === 'POST') {
      return handleUpload(req);
    }

    if (url.pathname.startsWith('/files/') && req.method === 'GET') {
      return handleFileDownload(url.pathname);
    }

    // Upgrade WebSocket connections
    if (server.upgrade(req, {
      data: {
        joinedAt: Date.now(),
      }
    })) {
      return; // upgraded
    }

    return new Response('Not Found', { status: 404 });
  },

  websocket: {
    idleTimeout: 300,
    
    async message(ws: ServerWebSocket<WebSocketData>, message: string | Buffer) {
      try {
        const msg = JSON.parse(message as string) as ClipboardMessage;
        
        switch (msg.type) {
          case MessageType.Join: {
            const { roomId } = msg;
            ws.data.roomId = roomId;
            ws.subscribe(`clipboard:${roomId}`);
            
            try {
              const history = await getHistory(roomId);
              const response: HistoryMessage = {
                type: MessageType.History,
                roomId,
                payload: history,
              };
              ws.send(JSON.stringify(response));
            } catch (err) {
              console.error(`[ws] Redis error on join (room: ${roomId}):`, err);
              sendError(ws, 'storage unavailable');
            }
            break;
          }
            
          case MessageType.Paste: {
            const { roomId, payload } = msg;
            
            if (ws.data.roomId !== roomId) {
              sendError(ws, 'invalid room');
              return;
            }
            
            const entry: ClipboardEntry = {
              text: payload,
              ts: Date.now(),
            };
            const entryStr = JSON.stringify(entry);
            
            try {
              const key = `clipboard:${roomId}`;
              await redis.pipeline()
                .rpush(key, entryStr)
                .ltrim(key, -MAX_HISTORY, -1)
                .expire(key, HISTORY_TTL)
                .exec();
                
              // Fetch latest history to broadcast to everyone
              const history = await getHistory(roomId);
              const response: HistoryMessage = {
                type: MessageType.History,
                roomId,
                payload: history,
              };
              server.publish(`clipboard:${roomId}`, JSON.stringify(response));
            } catch (err) {
              console.error(`[ws] Redis error on paste (room: ${roomId}):`, err);
              sendError(ws, 'storage unavailable');
            }
            break;
          }
            
          case MessageType.Sync: {
            const { roomId } = msg;
            
            try {
              const history = await getHistory(roomId);
              const response: HistoryMessage = {
                type: MessageType.History,
                roomId,
                payload: history,
              };
              ws.send(JSON.stringify(response));
            } catch (err) {
              console.error(`[ws] Redis error on sync (room: ${roomId}):`, err);
              sendError(ws, 'storage unavailable');
            }
            break;
          }
        }
      } catch (err) {
        console.error('[ws] Invalid message:', err);
      }
    },
    
    close(ws: ServerWebSocket<WebSocketData>) {
      if (ws.data.roomId) {
        ws.unsubscribe(`clipboard:${ws.data.roomId}`);
      }
    }
  },
});

async function getHistory(roomId: string): Promise<ClipboardEntry[]> {
  const items = await redis.lrange(`clipboard:${roomId}`, 0, -1);
  return items.map(item => JSON.parse(item) as ClipboardEntry);
}

function sendError(ws: ServerWebSocket<WebSocketData>, payload: string) {
  const errMsg: ErrorMessage = {
    type: MessageType.Error,
    payload
  };
  ws.send(JSON.stringify(errMsg));
}

async function handleUpload(req: Request) {
  try {
    const formData = await req.formData();
    const roomId = formData.get('roomId') as string;
    const file = formData.get('file') as File;

    if (!roomId || !file) {
      return new Response('Missing roomId or file', { status: 400 });
    }

    if (file.size > MAX_FILE_SIZE) {
      return new Response('File too large', { status: 413 });
    }

    const roomDir = join(UPLOAD_DIR, roomId);
    if (!existsSync(roomDir)) {
      await mkdir(roomDir, { recursive: true });
    }

    const filename = file.name;
    const destPath = join(roomDir, filename);
    await Bun.write(destPath, file);

    const fileUrl = `/files/${roomId}/${encodeURIComponent(filename)}`;
    const ts = Date.now();

    const entry: ClipboardEntry = {
      text: filename,
      ts,
      file: {
        name: filename,
        size: file.size,
        url: fileUrl,
      },
    };

    const key = `clipboard:${roomId}`;
    await redis.pipeline()
      .rpush(key, JSON.stringify(entry))
      .ltrim(key, -MAX_HISTORY, -1)
      .expire(key, HISTORY_TTL)
      .exec();

    // Broadcast history
    const history = await getHistory(roomId);
    const historyMsg: HistoryMessage = {
      type: MessageType.History,
      roomId,
      payload: history,
    };
    server.publish(`clipboard:${roomId}`, JSON.stringify(historyMsg));

    // Also broadcast file-shared
    const fileSharedMsg: FileSharedMessage = {
      type: MessageType.FileShared,
      roomId,
      payload: entry,
    };
    server.publish(`clipboard:${roomId}`, JSON.stringify(fileSharedMsg));

    return new Response(JSON.stringify({ success: true, url: fileUrl }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' },
    });
  } catch (err) {
    console.error('[upload error]', err);
    return new Response('Upload failed', { status: 500 });
  }
}

async function handleFileDownload(pathname: string) {
  const parts = pathname.split('/');
  if (parts.length < 4) return new Response('Not Found', { status: 404 });
  
  const roomId = parts[2];
  const filename = decodeURIComponent(parts.slice(3).join('/'));
  
  const filePath = join(UPLOAD_DIR, roomId, filename);
  const file = Bun.file(filePath);
  
  if (!(await file.exists())) {
    return new Response('File not found', { status: 404 });
  }
  
  return new Response(file);
}

// Periodic cleanup (every 1 hour)
setInterval(async () => {
  try {
    if (!existsSync(UPLOAD_DIR)) return;
    
    const rooms = await readdir(UPLOAD_DIR);
    for (const roomId of rooms) {
      const key = `clipboard:${roomId}`;
      const exists = await redis.exists(key);
      if (!exists) {
        const roomDir = join(UPLOAD_DIR, roomId);
        await rm(roomDir, { recursive: true, force: true });
        console.log(`[cleanup] Deleted expired files for room ${roomId}`);
      }
    }
  } catch (err) {
    console.error('[cleanup error]', err);
  }
}, 60 * 60 * 1000);

console.log(`[server] Listening on http://localhost:${server.port}`);
