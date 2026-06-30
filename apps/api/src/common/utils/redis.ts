import { redisClient } from '../config';

const DEFAULT_TTL = 3600; // 1 hour

// In-memory fallback cache store
interface MemoryCacheItem {
  value: string;
  expiry: number;
}
const memoryStore = new Map<string, MemoryCacheItem>();

const memorySet = (key: string, value: string, ttl: number): void => {
  const expiry = ttl > 0 ? Date.now() + ttl * 1000 : Infinity;
  memoryStore.set(key, { value, expiry });
};

const memoryGet = (key: string): string | null => {
  const item = memoryStore.get(key);
  if (!item) return null;
  if (Date.now() > item.expiry) {
    memoryStore.delete(key);
    return null;
  }
  return item.value;
};

const memoryDelete = (key: string): void => {
  memoryStore.delete(key);
};

const memoryExists = (key: string): boolean => {
  const item = memoryStore.get(key);
  if (!item) return false;
  if (Date.now() > item.expiry) {
    memoryStore.delete(key);
    return false;
  }
  return true;
};

/**
 * Set a value in Redis with optional TTL
 */
export const redisSet = async (key: string, value: string | object, ttl = DEFAULT_TTL): Promise<void> => {
  const serialized = typeof value === 'string' ? value : JSON.stringify(value);
  try {
    if (ttl > 0) {
      await redisClient.setEx(key, ttl, serialized);
    } else {
      await redisClient.set(key, serialized);
    }
  } catch (error) {
    console.warn(`⚠️ Redis set failed. Falling back to memory store for key ${key}. Error:`, error);
    memorySet(key, serialized, ttl);
  }
};

/**
 * Get a value from Redis
 */
export const redisGet = async <T = unknown>(key: string): Promise<T | null> => {
  let value: string | null = null;
  try {
    value = await redisClient.get(key);
  } catch (error) {
    console.warn(`⚠️ Redis get failed. Falling back to memory store for key ${key}. Error:`, error);
    value = memoryGet(key);
  }
  
  if (!value) return null;
  
  try {
    return JSON.parse(value) as T;
  } catch {
    return value as T;
  }
};

/**
 * Delete a key from Redis
 */
export const redisDelete = async (key: string): Promise<void> => {
  try {
    await redisClient.del(key);
  } catch (error) {
    console.warn(`⚠️ Redis delete failed. Falling back to memory store for key ${key}. Error:`, error);
  } finally {
    memoryDelete(key);
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
    console.warn('⚠️ Redis delete multiple failed. Falling back to memory store. Error:', error);
  } finally {
    for (const key of keys) {
      memoryDelete(key);
    }
  }
};

/**
 * Check if a key exists in Redis
 */
export const redisExists = async (key: string): Promise<boolean> => {
  try {
    return (await redisClient.exists(key)) === 1;
  } catch (error) {
    console.warn(`⚠️ Redis exists failed. Falling back to memory store for key ${key}. Error:`, error);
    return memoryExists(key);
  }
};

/**
 * Get TTL of a key
 */
export const redisTTL = async (key: string): Promise<number> => {
  try {
    return await redisClient.ttl(key);
  } catch (error) {
    console.warn(`⚠️ Redis TTL failed for key ${key}. Error:`, error);
    const item = memoryStore.get(key);
    if (!item) return -2;
    if (item.expiry === Infinity) return -1;
    const remaining = Math.round((item.expiry - Date.now()) / 1000);
    return remaining > 0 ? remaining : -2;
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
    console.warn(`⚠️ Redis increment failed. Falling back to memory store for key ${key}. Error:`, error);
    const existingStr = memoryGet(key);
    const existingNum = existingStr ? parseInt(existingStr, 10) : 0;
    const nextValue = (isNaN(existingNum) ? 0 : existingNum) + increment;
    memorySet(key, String(nextValue), ttl);
    return nextValue;
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
    console.warn(`⚠️ Redis pattern invalidation failed for pattern ${pattern}. Error:`, error);
  } finally {
    // Invalidate in memory matching prefix/wildcard (regex representation of glob)
    const escapedPattern = pattern.replace(/[.+^${}()|[\]\\]/g, '\\$&').replace(/\*/g, '.*');
    const regex = new RegExp(`^${escapedPattern}$`);
    for (const key of memoryStore.keys()) {
      if (regex.test(key)) {
        memoryStore.delete(key);
      }
    }
  }
};

/**
 * Session storage helpers
 */
export const createSessionKey = (sessionId: string): string => `session:${sessionId}`;
export const createCacheKey = (namespace: string, id: string): string => `${namespace}:${id}`;
export const createUserCacheKey = (userId: string): string => `user:${userId}`;
export const createAppointmentCacheKey = (appointmentId: string): string => `appointment:${appointmentId}`;
