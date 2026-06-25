import rateLimit from 'express-rate-limit';
import { Request } from 'express';
import { redisClient } from '../config';
import RedisStore from 'rate-limit-redis';

export const loginRateLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 10,
  standardHeaders: true,
  legacyHeaders: false,
  store: new RedisStore({
    sendCommand: (...args: string[]) => redisClient.sendCommand(args)
  }),
  keyGenerator: (req: Request) => {
    return req.ip ?? 'unknown';
  },
  message: { success: false, message: 'Too many requests, please try again later.', error: { code: 'TOO_MANY_REQUESTS', details: [] } }
});
