import { Queue } from 'bullmq';

import { config } from '../common/config';

export const reminderQueue = new Queue('reminder', { connection: { url: config.redisUrl } });
export const notificationQueue = new Queue('notification', { connection: { url: config.redisUrl } });
export const cleanupQueue = new Queue('cleanup', { connection: { url: config.redisUrl } });
