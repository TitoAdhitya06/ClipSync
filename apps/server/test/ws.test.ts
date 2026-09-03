import { describe, it, expect, beforeAll, afterAll, beforeEach } from 'bun:test';
import { MessageType, JoinMessage, PasteMessage, SyncMessage, HistoryMessage, ClipboardMessage, ErrorMessage } from '@clipboard-lokal/shared';

// Use random port for testing
process.env.WS_PORT = '0';

import { server } from '../src/index';
import { redis } from '../src/redis';

const WS_URL = `ws://localhost:${server.port}`;

describe('WebSocket Server', () => {
  beforeEach(async () => {
    // Clear redis before each test
    await redis.flushall();
  });

  afterAll(async () => {
    server.stop(true);
    await redis.quit();
  });

  it('should allow joining a room and receive empty history', async () => {
    return new Promise<void>((resolve, reject) => {
      const ws = new WebSocket(WS_URL);
      
      ws.onopen = () => {
        const joinMsg: JoinMessage = {
          type: MessageType.Join,
          roomId: 'test-room'
        };
        ws.send(JSON.stringify(joinMsg));
      };

      ws.onmessage = (event) => {
        const msg = JSON.parse(event.data as string) as ClipboardMessage;
        if (msg.type === MessageType.History) {
          expect(msg.roomId).toBe('test-room');
          expect(msg.payload).toEqual([]);
          ws.close();
          resolve();
        } else {
          reject(new Error(`Unexpected message type: ${msg.type}`));
        }
      };
      
      ws.onerror = reject;
    });
  });

  it('should handle paste and broadcast history', async () => {
    return new Promise<void>((resolve, reject) => {
      const ws = new WebSocket(WS_URL);
      
      let messageCount = 0;
      
      ws.onopen = () => {
        const joinMsg: JoinMessage = {
          type: MessageType.Join,
          roomId: 'test-room-paste'
        };
        ws.send(JSON.stringify(joinMsg));
      };

      ws.onmessage = (event) => {
        const msg = JSON.parse(event.data as string) as ClipboardMessage;
        
        if (msg.type === MessageType.History) {
          if (messageCount === 0) {
            // Initial join history (empty)
            expect(msg.payload).toEqual([]);
            
            // Send paste
            const pasteMsg: PasteMessage = {
              type: MessageType.Paste,
              roomId: 'test-room-paste',
              payload: 'Hello from test'
            };
            ws.send(JSON.stringify(pasteMsg));
            messageCount++;
          } else if (messageCount === 1) {
            // Broadcasted history after paste
            expect(msg.payload).toHaveLength(1);
            expect(msg.payload[0].text).toBe('Hello from test');
            expect(msg.payload[0].ts).toBeGreaterThan(0);
            
            ws.close();
            resolve();
          }
        } else {
          reject(new Error(`Unexpected message type: ${msg.type}`));
        }
      };
      
      ws.onerror = reject;
    });
  });
});
