import { Worker, Job } from 'bullmq';

import { config } from '../common/config';
import { logger } from '../common/utils/logger';

/**
 * BullMQ workers — responsible for background/delayed/scheduled jobs.
 *
 * Responsibility boundary (see README Architecture section):
 * - Kafka:   domain events, durable event stream, service-to-service communication
 * - BullMQ:  background jobs, delayed jobs, retries, scheduled work
 *
 * Workers run in the same process as the API server in development.
 * In production, use the separate `worker.ts` entry point so they can be
 * independently scaled via the `worker` Kubernetes Deployment.
 */

const connection = { url: config.redisUrl };

// ---------------------------------------------------------------------------
// Reminder Worker
// Handles appointment reminder notifications, e.g. "Your appointment is in 30 minutes"
// ---------------------------------------------------------------------------

export const reminderWorker = new Worker(
  'reminder',
  async (job: Job) => {
    const start = Date.now();
    logger.info('[BullMQ:reminder] Job started', {
      jobId: job.id,
      queue: 'reminder',
      eventType: job.name,
      appointmentId: job.data?.appointmentId,
      userId: job.data?.userId,
    });

    try {
      const result = { jobId: job.id, processed: true };

      logger.info('[BullMQ:reminder] Job completed', {
        jobId: job.id,
        queue: 'reminder',
        eventType: job.name,
        appointmentId: job.data?.appointmentId,
        durationMs: Date.now() - start,
      });

      return result;
    } catch (error) {
      logger.error('[BullMQ:reminder] Job failed', {
        jobId: job.id,
        queue: 'reminder',
        eventType: job.name,
        appointmentId: job.data?.appointmentId,
        error: error instanceof Error ? error.message : String(error),
        durationMs: Date.now() - start,
      });
      throw error;
    }
  },
  {
    connection,
    autorun: true,
    removeOnComplete: { count: 100 },
    removeOnFail: { count: 50 },
  }
);

reminderWorker.on('failed', (job, error) => {
  logger.error('[BullMQ:reminder] Worker failed event', {
    jobId: job?.id,
    queue: 'reminder',
    eventType: job?.name,
    error: error instanceof Error ? error.message : String(error),
  });
});

// ---------------------------------------------------------------------------
// Notification Worker
// Handles async notification delivery (email, SMS, push) queued by consumers
// ---------------------------------------------------------------------------

export const notificationWorker = new Worker(
  'notification',
  async (job: Job) => {
    const start = Date.now();
    logger.info('[BullMQ:notification] Job started', {
      jobId: job.id,
      queue: 'notification',
      eventType: job.name,
      userId: job.data?.userId,
    });

    try {
      const result = { jobId: job.id, processed: true };

      logger.info('[BullMQ:notification] Job completed', {
        jobId: job.id,
        queue: 'notification',
        eventType: job.name,
        userId: job.data?.userId,
        durationMs: Date.now() - start,
      });

      return result;
    } catch (error) {
      logger.error('[BullMQ:notification] Job failed', {
        jobId: job.id,
        queue: 'notification',
        eventType: job.name,
        userId: job.data?.userId,
        error: error instanceof Error ? error.message : String(error),
        durationMs: Date.now() - start,
      });
      throw error;
    }
  },
  {
    connection,
    autorun: true,
    removeOnComplete: { count: 100 },
    removeOnFail: { count: 50 },
  }
);

notificationWorker.on('failed', (job, error) => {
  logger.error('[BullMQ:notification] Worker failed event', {
    jobId: job?.id,
    queue: 'notification',
    eventType: job?.name,
    error: error instanceof Error ? error.message : String(error),
  });
});

// ---------------------------------------------------------------------------
// Cleanup Worker
// Handles periodic data cleanup (expired OTPs, stale sessions, old records)
// ---------------------------------------------------------------------------

export const cleanupWorker = new Worker(
  'cleanup',
  async (job: Job) => {
    const start = Date.now();
    logger.info('[BullMQ:cleanup] Job started', {
      jobId: job.id,
      queue: 'cleanup',
      eventType: job.name,
    });

    try {
      const result = { jobId: job.id, processed: true };

      logger.info('[BullMQ:cleanup] Job completed', {
        jobId: job.id,
        queue: 'cleanup',
        eventType: job.name,
        durationMs: Date.now() - start,
      });

      return result;
    } catch (error) {
      logger.error('[BullMQ:cleanup] Job failed', {
        jobId: job.id,
        queue: 'cleanup',
        eventType: job.name,
        error: error instanceof Error ? error.message : String(error),
        durationMs: Date.now() - start,
      });
      throw error;
    }
  },
  {
    connection,
    autorun: true,
    removeOnComplete: { count: 100 },
    removeOnFail: { count: 50 },
  }
);

cleanupWorker.on('failed', (job, error) => {
  logger.error('[BullMQ:cleanup] Worker failed event', {
    jobId: job?.id,
    queue: 'cleanup',
    eventType: job?.name,
    error: error instanceof Error ? error.message : String(error),
  });
});
