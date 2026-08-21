import { logger } from '../../common/utils/logger';

import { getKafkaClient } from './client';
import { KAFKA_TOPICS } from './topics';

export interface TopicInitializationOptions {
  numPartitions?: number;
  replicationFactor?: number;
}

/**
 * Ensures all required DocDock Kafka topics exist on the broker before consumers start.
 *
 * Design & Guarantees:
 * - Source of truth: `KAFKA_TOPICS` in `topics.ts`
 * - Idempotent: checks existing topics before creating; running multiple times is safe
 * - Non-blocking / Graceful degradation: returns false if Kafka is not configured/unavailable
 * - Clean cleanup: always disconnects AdminClient in a finally block
 */
export async function initializeKafkaTopics(
  options: TopicInitializationOptions = {}
): Promise<boolean> {
  const kafka = getKafkaClient();
  if (!kafka) {
    logger.warn('[Kafka Admin] KAFKA_BROKERS not set — skipping topic initialization');
    return false;
  }

  const numPartitions = options.numPartitions ?? 1;
  const replicationFactor = options.replicationFactor ?? 1;

  const admin = kafka.admin();

  try {
    logger.info('[Kafka Admin] Connecting AdminClient to initialize topics...');
    await admin.connect();

    const requiredTopics = Object.values(KAFKA_TOPICS);
    const existingTopics = await admin.listTopics();
    const existingSet = new Set(existingTopics);

    const missingTopics = requiredTopics.filter((topic) => !existingSet.has(topic));

    if (missingTopics.length === 0) {
      logger.info('[Kafka Admin] All required Kafka topics already exist', {
        totalRequired: requiredTopics.length,
      });
      return true;
    }

    logger.info('[Kafka Admin] Creating missing Kafka topics...', {
      missingTopics,
      numPartitions,
      replicationFactor,
    });

    const topicsToCreate = missingTopics.map((topic) => ({
      topic,
      numPartitions,
      replicationFactor,
    }));

    const created = await admin.createTopics({
      topics: topicsToCreate,
      waitForLeaders: true,
    });

    if (created) {
      logger.info('[Kafka Admin] Successfully created missing Kafka topics', {
        createdCount: missingTopics.length,
        missingTopics,
      });
    } else {
      logger.info('[Kafka Admin] Kafka topics creation completed (topics may have been created concurrently)');
    }

    return true;
  } catch (error) {
    logger.error('[Kafka Admin] Failed to initialize Kafka topics', {
      error: error instanceof Error ? error.message : String(error),
    });
    return false;
  } finally {
    try {
      await admin.disconnect();
    } catch (disconnectError) {
      logger.warn('[Kafka Admin] Error disconnecting AdminClient', {
        error: disconnectError instanceof Error ? disconnectError.message : String(disconnectError),
      });
    }
  }
}
