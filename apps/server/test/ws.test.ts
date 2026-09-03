import { mock, describe, it, expect, afterAll, beforeEach } from 'bun:test';
import RedisMock from 'ioredis-mock';

const mockRedis = new RedisMock();

// Mock the redis module before importing the server
mock.module('../src/redis', () => {
  return {
    redis: mockRedis
  };
});

import { MessageType, JoinMessage, PasteMessage, SyncMessage, HistoryMessage, ClipboardMessage, ErrorMessage } from '@clipboard-lokal/shared';

// Use random port for testing
process.env.WS_PORT = '0';

import { server } from '../src/index';

const getWsUrl = () => `ws://localhost:${server.port}`;

describe('WebSocket Server', () => {
  beforeEach(async () => {
    await mockRedis.flushall();
  });

  afterAll(async () => {
    server.stop(true);
    await mockRedis.quit();
  });

  it('should allow joining a room and receive empty history', async () => {
    return new Promise<void>((resolve, reject) => {
      const ws = new WebSocket(getWsUrl());
      
      ws.onopen = () => {
        const joinMsg: JoinMessage = {
          type: MessageType.Join,
          roomId: 'test-room-join'
        };
        ws.send(JSON.stringify(joinMsg));
      };

      ws.onmessage = (event) => {
        const msg = JSON.parse(event.data as string) as ClipboardMessage;
        if (msg.type === MessageType.History) {
          expect(msg.roomId).toBe('test-room-join');
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

  it('should handle paste and broadcast history, enforce 50-entry cap, and set TTL', async () => {
    return new Promise<void>((resolve, reject) => {
      const ws = new WebSocket(getWsUrl());
      let messageCount = 0;
      
      ws.onopen = () => {
        const joinMsg: JoinMessage = {
          type: MessageType.Join,
          roomId: 'test-room-paste'
        };
        ws.send(JSON.stringify(joinMsg));
      };

      ws.onmessage = async (event) => {
        const msg = JSON.parse(event.data as string) as ClipboardMessage;
        
        if (msg.type === MessageType.History) {
          if (messageCount === 0) {
            // Initial join
            
            // Pre-fill Redis with 50 items to test LTRIM
            const key = 'clipboard:test-room-paste';
            for (let i = 0; i < 50; i++) {
               await mockRedis.rpush(key, JSON.stringify({ text: `Item ${i}`, ts: Date.now() }));
            }
            
            // Send paste (the 51st item)
            const pasteMsg: PasteMessage = {
              type: MessageType.Paste,
              roomId: 'test-room-paste',
              payload: 'Item 51'
            };
            ws.send(JSON.stringify(pasteMsg));
            messageCount++;
          } else if (messageCount === 1) {
            // Broadcasted history after paste
            expect(msg.payload).toHaveLength(50); // Cap enforced
            expect(msg.payload[49].text).toBe('Item 51');
            
            // Verify TTL is set
            const ttl = await mockRedis.ttl('clipboard:test-room-paste');
            expect(ttl).toBeGreaterThan(0);
            expect(ttl).toBeLessThanOrEqual(86400);
            
            ws.close();
            resolve();
          }
        }
      };
      
      ws.onerror = reject;
    });
  });

  it('should handle sync message', async () => {
    // Add an item first
    await mockRedis.rpush('clipboard:test-room-sync', JSON.stringify({ text: 'Sync item', ts: Date.now() }));

    return new Promise<void>((resolve, reject) => {
      const ws = new WebSocket(getWsUrl());
      
      let messageCount = 0;
      ws.onopen = () => {
        // Send join (which also triggers a history send)
        ws.send(JSON.stringify({ type: MessageType.Join, roomId: 'test-room-sync' }));
      };

      ws.onmessage = (event) => {
        const msg = JSON.parse(event.data as string) as ClipboardMessage;
        
        if (msg.type === MessageType.History) {
          if (messageCount === 0) {
            // Reply to join
            messageCount++;
            // Send sync
            const syncMsg: SyncMessage = {
              type: MessageType.Sync,
              roomId: 'test-room-sync'
            };
            ws.send(JSON.stringify(syncMsg));
          } else if (messageCount === 1) {
            // Reply to sync
            expect(msg.payload).toHaveLength(1);
            expect(msg.payload[0].text).toBe('Sync item');
            ws.close();
            resolve();
          }
        }
      };
      
      ws.onerror = reject;
    });
  });

  it('should return error when Redis is unreachable', async () => {
    // Break the mock redis temporarily
    const originalLrange = mockRedis.lrange;
    mockRedis.lrange = async () => {
      throw new Error('Redis connection lost');
    };

    return new Promise<void>((resolve, reject) => {
      const ws = new WebSocket(getWsUrl());
      
      ws.onopen = () => {
        // trigger a join which calls lrange
        ws.send(JSON.stringify({ type: MessageType.Join, roomId: 'test-room-error' }));
      };

      ws.onmessage = (event) => {
        const msg = JSON.parse(event.data as string) as ClipboardMessage;
        if (msg.type === MessageType.Error) {
          expect(msg.payload).toBe('storage unavailable');
          
          // Restore the mock
          mockRedis.lrange = originalLrange;
          ws.close();
          resolve();
        } else {
          // Restore before rejecting
          mockRedis.lrange = originalLrange;
          reject(new Error(`Expected error message, got: ${msg.type}`));
        }
      };
      
      ws.onerror = (e) => {
        mockRedis.lrange = originalLrange;
        reject(e);
      };
    });
  });
});
