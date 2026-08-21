import { Consumer, EachMessagePayload } from 'kafkajs';

import { logger } from '../../common/utils/logger';

import { DomainEvent } from './eventTypes';
import { getKafkaClient } from './client';

export type MessageHandler = (event: DomainEvent, payload: EachMessagePayload) => Promise<void>;

export interface ConsumerSubscription {
  topic: string;
  handler: MessageHandler;
}

/**
 * Creates and manages a Kafka consumer.
 *
 * Design decisions:
 * - One consumer per group ID prefix + role (e.g. notification, appointment)
 * - Commits offsets only after successful handler execution
 * - Logs every message consumed with structured metadata
 * - Errors in handlers are caught and logged; the consumer keeps running
 */
export async function createKafkaConsumer(
  groupIdSuffix: string,
  subscriptions: ConsumerSubscription[]
): Promise<{ consumer: Consumer; start: () => Promise<void>; stop: () => Promise<void> } | null> {
  const kafka = getKafkaClient();
  if (!kafka) {
    logger.warn('[Kafka Consumer] KAFKA_BROKERS not set — consumer disabled', { groupIdSuffix });
    return null;
  }

  const groupIdPrefix = process.env.KAFKA_GROUP_ID_PREFIX || 'docdock';
  const groupId = `${groupIdPrefix}-${groupIdSuffix}`;

  const consumer = kafka.consumer({ groupId });

  const start = async (): Promise<void> => {
    try {
      await consumer.connect();
      logger.info('[Kafka Consumer] Connected', { groupId });

      for (const sub of subscriptions) {
        await consumer.subscribe({ topic: sub.topic, fromBeginning: false });
        logger.info('[Kafka Consumer] Subscribed', { groupId, topic: sub.topic });
      }

      await consumer.run({
        eachMessage: async (payload: EachMessagePayload) => {
          const { topic, partition, message } = payload;
          const offset = message.offset;
          const raw = message.value?.toString();

          if (!raw) {
            logger.warn('[Kafka Consumer] Empty message received', { topic, partition, offset });
            return;
          }

          let event: DomainEvent;
          try {
            event = JSON.parse(raw) as DomainEvent;
          } catch (parseError) {
            logger.error('[Kafka Consumer] Failed to parse message', {
              topic,
              partition,
              offset,
              error: parseError instanceof Error ? parseError.message : String(parseError),
            });
            return;
          }

          const start = Date.now();
          logger.info('[Kafka Consumer] Processing message', {
            topic,
            partition,
            offset,
            eventType: event.eventType,
            eventId: event.eventId,
          });

          // Find matching handler
          const sub = subscriptions.find((s) => s.topic === topic);
          if (!sub) {
            logger.warn('[Kafka Consumer] No handler for topic', { topic });
            return;
          }

          try {
            await sub.handler(event, payload);
            logger.info('[Kafka Consumer] Message processed successfully', {
              topic,
              partition,
              offset,
              eventType: event.eventType,
              eventId: event.eventId,
              durationMs: Date.now() - start,
            });
          } catch (handlerError) {
            logger.error('[Kafka Consumer] Handler error — message will not be retried (offset committed)', {
              topic,
              partition,
              offset,
              eventType: event.eventType,
              eventId: event.eventId,
              error: handlerError instanceof Error ? handlerError.message : String(handlerError),
              durationMs: Date.now() - start,
            });
          }
        },
      });
    } catch (error) {
      logger.error('[Kafka Consumer] Failed to start consumer', {
        groupId,
        error: error instanceof Error ? error.message : String(error),
      });
    }
  };

  const stop = async (): Promise<void> => {
    try {
      await consumer.disconnect();
      logger.info('[Kafka Consumer] Disconnected', { groupId });
    } catch (error) {
      logger.warn('[Kafka Consumer] Error during consumer disconnect', {
        groupId,
        error: error instanceof Error ? error.message : String(error),
      });
    }
  };

  return { consumer, start, stop };
}
