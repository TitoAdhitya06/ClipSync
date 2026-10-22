import { Redis } from 'ioredis';

const REDIS_URL = process.env.REDIS_URL || 'redis://localhost:6379';

export let redis: Redis;

if (process.env.NODE_ENV !== 'test') {
  redis = new Redis(REDIS_URL);

  redis.on('error', (err) => {
    console.error('[redis] Connection error:', err);
  });

  redis.on('connect', () => {
    console.log('[redis] Connected to', REDIS_URL);
  });
}
