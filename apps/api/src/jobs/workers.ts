import { Worker } from 'bullmq';

import { config } from '../common/config';

export const reminderWorker = new Worker(
  'reminder',
  async (job) => {
    try {
      console.log('Reminder job', job.name);
      return job.id;
    } catch (error) {
      console.error('Reminder job failed', error);
      throw error;
    }
  },
  {
    connection: { url: config.redisUrl },
    autorun: true,
    removeOnComplete: { count: 100 },
    removeOnFail: { count: 50 }
  }
);

reminderWorker.on('failed', (job, error) => {
  console.error('Reminder worker failed', job?.name, error);
});

export const notificationWorker = new Worker(
  'notification',
  async (job) => {
    try {
      console.log('Notification job', job.name);
      return job.id;
    } catch (error) {
      console.error('Notification job failed', error);
      throw error;
    }
  },
  {
    connection: { url: config.redisUrl },
    autorun: true,
    removeOnComplete: { count: 100 },
    removeOnFail: { count: 50 }
  }
);

notificationWorker.on('failed', (job, error) => {
  console.error('Notification worker failed', job?.name, error);
});

export const cleanupWorker = new Worker(
  'cleanup',
  async (job) => {
    try {
      console.log('Cleanup job', job.name);
      return job.id;
    } catch (error) {
      console.error('Cleanup job failed', error);
      throw error;
    }
  },
  {
    connection: { url: config.redisUrl },
    autorun: true,
    removeOnComplete: { count: 100 },
    removeOnFail: { count: 50 }
  }
);

cleanupWorker.on('failed', (job, error) => {
  console.error('Cleanup worker failed', job?.name, error);
});
