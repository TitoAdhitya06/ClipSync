import type { Server, ServerWebSocket } from 'bun';
import { MessageType, ClipboardMessage, ClipboardEntry, HistoryMessage, ErrorMessage } from '@clipboard-lokal/shared';
import { redis } from './redis';

const PORT = process.env.NODE_ENV === 'test' ? 0 : (process.env.WS_PORT !== undefined ? Number(process.env.WS_PORT) : 3001);
const MAX_HISTORY = 50;
const HISTORY_TTL = 86400; // 24 hours in seconds

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

console.log(`[server] Listening on http://localhost:${server.port}`);
