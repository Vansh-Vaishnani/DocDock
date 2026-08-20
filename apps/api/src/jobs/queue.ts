import { Queue } from 'bullmq';
import { config } from '../common/config';

const queueOptions = {
  connection: { url: config.redisUrl },
  skipEvictionCheck: true,
};

export const reminderQueue = new Queue('reminder', queueOptions);
export const notificationQueue = new Queue('notification', queueOptions);
export const cleanupQueue = new Queue('cleanup', queueOptions);
