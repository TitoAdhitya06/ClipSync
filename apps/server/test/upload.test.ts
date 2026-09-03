import { mock, describe, it, expect, beforeAll, afterAll } from 'bun:test';
import RedisMock from 'ioredis-mock';

const mockRedis = new RedisMock();
mock.module('../src/redis', () => {
  return { redis: mockRedis };
});

import { server } from '../src/index';
import { redis } from '../src/redis';
import { join } from 'node:path';
import { existsSync, rmSync } from 'node:fs';

const TEST_UPLOAD_DIR = process.env.UPLOAD_DIR || join(process.cwd(), 'uploads');
const testRoomId = 'test-upload-room';

describe('File Upload and Download', () => {
  beforeAll(async () => {
    // Clear redis
    await redis.flushall();
  });

  afterAll(async () => {
    server.stop(true);
    // Cleanup files
    if (existsSync(join(TEST_UPLOAD_DIR, testRoomId))) {
      rmSync(join(TEST_UPLOAD_DIR, testRoomId), { recursive: true, force: true });
    }
  });

  it('should reject upload if missing file or roomId', async () => {
    const formData = new FormData();
    formData.append('roomId', testRoomId);
    
    const req = new Request(`http://localhost:${server.port}/upload`, {
      method: 'POST',
      body: formData,
    });
    
    const res = await server.fetch(req);
    expect(res.status).toBe(400);
    expect(await res.text()).toBe('Missing roomId or file');
  });

  it('should successfully upload a file and save to disk', async () => {
    const formData = new FormData();
    formData.append('roomId', testRoomId);
    
    const fileContent = 'Hello World Upload';
    const file = new File([fileContent], 'test.txt', { type: 'text/plain' });
    formData.append('file', file);
    
    const req = new Request(`http://localhost:${server.port}/upload`, {
      method: 'POST',
      body: formData,
    });
    
    const res = await server.fetch(req);
    expect(res.status).toBe(200);
    
    const json = await res.json() as any;
    expect(json.success).toBe(true);
    expect(json.url).toBe(`/files/${testRoomId}/test.txt`);
    
    // Check if file exists on disk
    const destPath = join(TEST_UPLOAD_DIR, testRoomId, 'test.txt');
    expect(existsSync(destPath)).toBe(true);
    
    // Check redis history
    const historyItems = await redis.lrange(`clipboard:${testRoomId}`, 0, -1);
    expect(historyItems.length).toBe(1);
    
    const entry = JSON.parse(historyItems[0]);
    expect(entry.text).toBe('test.txt');
    expect(entry.file).toBeDefined();
    expect(entry.file.name).toBe('test.txt');
    expect(entry.file.size).toBe(fileContent.length);
    expect(entry.file.url).toBe(`/files/${testRoomId}/test.txt`);
  });

  it('should serve the uploaded file', async () => {
    const req = new Request(`http://localhost:${server.port}/files/${testRoomId}/test.txt`);
    const res = await server.fetch(req);
    
    expect(res.status).toBe(200);
    const content = await res.text();
    expect(content).toBe('Hello World Upload');
  });

  it('should return 404 for non-existent file', async () => {
    const req = new Request(`http://localhost:${server.port}/files/${testRoomId}/not-found.txt`);
    const res = await server.fetch(req);
    
    expect(res.status).toBe(404);
  });
});
