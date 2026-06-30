import rateLimit from 'express-rate-limit';
import { Request } from 'express';
import RedisStore from 'rate-limit-redis';

import { redisClient } from '../config';

const store = redisClient.isOpen
  ? new RedisStore({
      sendCommand: async (...args: string[]) => {
        try {
          return await redisClient.sendCommand(args);
        } catch (error) {
          console.warn('⚠️ Rate limiter Redis store failed, falling back gracefully:', error);
          return 0; // Return mock value to allow request through safely
        }
      }
    })
  : undefined;

export const loginRateLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 10,
  standardHeaders: true,
  legacyHeaders: false,
  store,
  keyGenerator: (req: Request) => {
    return req.ip ?? 'unknown';
  },
  message: { success: false, message: 'Too many requests, please try again later.', error: { code: 'TOO_MANY_REQUESTS', details: [] } }
});
