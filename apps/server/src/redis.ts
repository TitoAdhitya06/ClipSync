import { Redis } from 'ioredis';

const REDIS_URL = process.env.REDIS_URL || 'redis://localhost:6379';

// Export a singleton Redis instance for the server to use
export const redis = new Redis(REDIS_URL, {
  // Retry strategy could be added here if needed, but default is usually fine
});

redis.on('error', (err) => {
  console.error('[redis] Connection error:', err);
});

redis.on('connect', () => {
  console.log('[redis] Connected to', REDIS_URL);
});
