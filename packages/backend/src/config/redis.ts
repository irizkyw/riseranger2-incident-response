import Redis from 'ioredis';

// Attempt connection using env variable or default localhost
const redisUrl = process.env.REDIS_URL || 'redis://localhost:6379';

const redis = new Redis(redisUrl, {
  maxRetriesPerRequest: 3,
  retryStrategy(times) {
    console.warn(`[Redis] Retrying connection (attempt ${times})...`);
    if (times > 5) {
      console.error('[Redis] Max retries reached. Cache will be unavailable.');
      return null;
    }
    return Math.min(times * 500, 2000);
  },
});

redis.on('connect', () => {
  console.log('[Redis] Connected successfully');
});

redis.on('error', (err) => {
  // Suppress verbose connection errors if not running, to not spam logs
  if (err.code !== 'ECONNREFUSED') {
    console.error('[Redis] Error:', err.message);
  }
});

export default redis;
