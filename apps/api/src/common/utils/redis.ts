import { redisClient } from '../config';

const DEFAULT_TTL = 3600; // 1 hour

/**
 * Set a value in Redis with optional TTL
 */
export const redisSet = async (key: string, value: string | object, ttl = DEFAULT_TTL): Promise<void> => {
  try {
    const serialized = typeof value === 'string' ? value : JSON.stringify(value);
    if (ttl > 0) {
      await redisClient.setEx(key, ttl, serialized);
    } else {
      await redisClient.set(key, serialized);
    }
  } catch (error) {
    console.error(`Redis set error for key ${key}:`, error);
    throw error;
  }
};

/**
 * Get a value from Redis
 */
export const redisGet = async <T = unknown>(key: string): Promise<T | null> => {
  try {
    const value = await redisClient.get(key);
    if (!value) return null;
    
    try {
      return JSON.parse(value) as T;
    } catch {
      return value as T;
    }
  } catch (error) {
    console.error(`Redis get error for key ${key}:`, error);
    throw error;
  }
};

/**
 * Delete a key from Redis
 */
export const redisDelete = async (key: string): Promise<void> => {
  try {
    await redisClient.del(key);
  } catch (error) {
    console.error(`Redis delete error for key ${key}:`, error);
    throw error;
  }
};

/**
 * Delete multiple keys from Redis
 */
export const redisDeleteMultiple = async (keys: string[]): Promise<void> => {
  if (keys.length === 0) return;
  try {
    await redisClient.del(keys);
  } catch (error) {
    console.error('Redis delete multiple error:', error);
    throw error;
  }
};

/**
 * Check if a key exists in Redis
 */
export const redisExists = async (key: string): Promise<boolean> => {
  try {
    return (await redisClient.exists(key)) === 1;
  } catch (error) {
    console.error(`Redis exists error for key ${key}:`, error);
    throw error;
  }
};

/**
 * Get TTL of a key
 */
export const redisTTL = async (key: string): Promise<number> => {
  try {
    return await redisClient.ttl(key);
  } catch (error) {
    console.error(`Redis TTL error for key ${key}:`, error);
    throw error;
  }
};

/**
 * Increment a counter in Redis
 */
export const redisIncrement = async (key: string, increment = 1, ttl = DEFAULT_TTL): Promise<number> => {
  try {
    const value = await redisClient.incrBy(key, increment);
    if (ttl > 0 && value === increment) {
      // Set TTL only on first increment
      await redisClient.expire(key, ttl);
    }
    return value;
  } catch (error) {
    console.error(`Redis increment error for key ${key}:`, error);
    throw error;
  }
};

/**
 * Cache helper for expensive operations
 */
export const redisCache = async <T>(
  key: string,
  fetcher: () => Promise<T>,
  ttl = DEFAULT_TTL
): Promise<T> => {
  const cached = await redisGet<T>(key);
  if (cached !== null) return cached;

  const result = await fetcher();
  if (result !== null && result !== undefined) {
    await redisSet(key, result as unknown as string | object, ttl);
  }
  return result;
};

/**
 * Invalidate cache patterns (e.g., 'user:*')
 */
export const redisInvalidatePattern = async (pattern: string): Promise<void> => {
  try {
    const keys = await redisClient.keys(pattern);
    if (keys.length > 0) {
      await redisClient.del(keys);
    }
  } catch (error) {
    console.error(`Redis pattern invalidation error for pattern ${pattern}:`, error);
    throw error;
  }
};

/**
 * Session storage helpers
 */
export const createSessionKey = (sessionId: string): string => `session:${sessionId}`;
export const createCacheKey = (namespace: string, id: string): string => `${namespace}:${id}`;
export const createUserCacheKey = (userId: string): string => `user:${userId}`;
export const createAppointmentCacheKey = (appointmentId: string): string => `appointment:${appointmentId}`;
