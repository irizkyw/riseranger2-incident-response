import Redis from 'ioredis';

const redisUrl = process.env.REDIS_URL || 'redis://localhost:6379';
let isRedisReady = false;

const redisClient = new Redis(redisUrl, {
  lazyConnect: true,
  enableOfflineQueue: false,
  maxRetriesPerRequest: 1,
  retryStrategy(times) {
    if (times > 2) {
      return null; // Stop retrying if Redis is not running
    }
    return 1000;
  },
});

redisClient.on('ready', () => {
  isRedisReady = true;
  console.log('⚡ [Redis] Cache connected and ready');
});

redisClient.on('error', () => {
  isRedisReady = false;
});

redisClient.on('close', () => {
  isRedisReady = false;
});

redisClient.on('end', () => {
  isRedisReady = false;
});

// Attempt connection in background
redisClient.connect().catch(() => {
  // Redis is optional; silent fallback to DB queries
});

export const cacheGet = async (key: string): Promise<string | null> => {
  if (!isRedisReady || redisClient.status !== 'ready') return null;
  try {
    return await redisClient.get(key);
  } catch {
    return null;
  }
};

export const cacheSet = async (key: string, value: string, mode?: string, duration?: number): Promise<void> => {
  if (!isRedisReady || redisClient.status !== 'ready') return;
  try {
    if (mode === 'EX' && duration) {
      await redisClient.set(key, value, 'EX', duration);
    } else {
      await redisClient.set(key, value);
    }
  } catch {
    // Silently ignore cache write errors
  }
};

export const cacheDel = async (key: string): Promise<void> => {
  if (!isRedisReady || redisClient.status !== 'ready') return;
  try {
    await redisClient.del(key);
  } catch {
    // Silently ignore cache deletion errors
  }
};

const safeRedis = {
  get: cacheGet,
  set: cacheSet,
  del: cacheDel,
  client: redisClient,
};

export default safeRedis;
