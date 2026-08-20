/**
 * Worker entry point — runs BullMQ workers independently from the HTTP server.
 *
 * Use this in production Kubernetes worker deployments. The HTTP server is NOT
 * started here, so this process can be scaled independently.
 *
 * Responsibility:
 * - reminder queue: appointment reminder notifications
 * - notification queue: async notification delivery (email, SMS, push)
 * - cleanup queue: periodic data cleanup tasks
 *
 * Kafka Note: this process does NOT start Kafka consumers. Kafka consumers
 * run inside the HTTP server process (server.ts). Workers communicate with
 * Kafka indirectly via the job queue (server publishes events, consumers
 * can enqueue BullMQ jobs, workers process them).
 */

import './jobs/workers';
import { logger } from './common/utils/logger';

logger.info('[Worker] DocDock BullMQ worker process started', {
  eventType: 'WorkerStarted',
  queues: ['reminder', 'notification', 'cleanup'],
});

// Graceful shutdown
const shutdown = (signal: string) => {
  logger.info(`[Worker] ${signal} received — shutting down workers`, {
    eventType: 'WorkerShutdown',
  });
  // BullMQ workers automatically drain in-progress jobs on close
  process.exit(0);
};

process.on('SIGTERM', () => shutdown('SIGTERM'));
process.on('SIGINT', () => shutdown('SIGINT'));
process.on('uncaughtException', (error) => {
  logger.error('[Worker] Uncaught exception', {
    error: error instanceof Error ? error.message : String(error),
  });
  process.exit(1);
});
process.on('unhandledRejection', (reason) => {
  logger.error('[Worker] Unhandled rejection', {
    error: String(reason),
  });
  process.exit(1);
});
