import redis from '../config/redis.js';

// In-memory fallback lock store for in-flight flag submissions
const inMemoryLocks = new Set<string>();

/**
 * Acquire an exclusive lock for flag submission per team and challenge.
 * Returns true if lock was acquired, false if another submission is in progress.
 */
export const acquireSubmissionLock = async (teamId: string, challengeId: string): Promise<boolean> => {
  const lockKey = `lock:submit:${teamId}:${challengeId}`;
  
  // 1. Check local memory lock first (instantaneous microsecond check)
  if (inMemoryLocks.has(lockKey)) {
    return false;
  }
  inMemoryLocks.add(lockKey);

  // 2. Also acquire Redis lock if available (distributed lock with 6s TTL)
  try {
    const redisOk = await redis.setNx(lockKey, 'locked', 6);
    if (!redisOk) {
      // If Redis has lock and refused it
      inMemoryLocks.delete(lockKey);
      return false;
    }
  } catch {
    // If Redis fails, rely on memory lock
  }

  return true;
};

/**
 * Release the flag submission lock.
 */
export const releaseSubmissionLock = async (teamId: string, challengeId: string): Promise<void> => {
  const lockKey = `lock:submit:${teamId}:${challengeId}`;
  inMemoryLocks.delete(lockKey);
  try {
    await redis.del(lockKey);
  } catch {
    // silent
  }
};

