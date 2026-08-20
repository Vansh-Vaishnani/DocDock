import { Kafka, Producer, ProducerRecord, Partitioners } from 'kafkajs';
import { logger } from '../../common/utils/logger';
import { DomainEvent } from './eventTypes';
import { getKafkaClient } from './client';

let producer: Producer | null = null;
let kafka: Kafka | null = null;
let connected = false;

/**
 * Connect the Kafka producer.
 * Called during server startup. Non-fatal — if Kafka is unavailable the API
 * continues operating; events are simply not published.
 */
export async function connectProducer(): Promise<void> {
  try {
    kafka = getKafkaClient();
    if (!kafka) {
      logger.warn('[Kafka Producer] KAFKA_BROKERS not set — event publishing disabled');
      return;
    }

    producer = kafka.producer({
      createPartitioner: Partitioners.LegacyPartitioner,
      allowAutoTopicCreation: true,
    });

    await producer.connect();
    connected = true;

    logger.info('[Kafka Producer] Connected', {
      eventType: 'KafkaProducerConnected',
    });
  } catch (error) {
    logger.warn('[Kafka Producer] Failed to connect — events will not be published', {
      error: error instanceof Error ? error.message : String(error),
    });
    producer = null;
    connected = false;
  }
}

/**
 * Gracefully disconnect the Kafka producer during shutdown.
 */
export async function disconnectProducer(): Promise<void> {
  if (producer && connected) {
    try {
      await producer.disconnect();
      connected = false;
      logger.info('[Kafka Producer] Disconnected');
    } catch (error) {
      logger.warn('[Kafka Producer] Error during disconnect', {
        error: error instanceof Error ? error.message : String(error),
      });
    }
  }
}

/**
 * Publish a domain event to Kafka.
 *
 * - Uses the event's `eventId` as the message key for idempotency/partitioning.
 * - Silently swallows errors so a Kafka outage never crashes the API.
 * - Logs every publish attempt with structured metadata.
 */
export async function publishEvent(topic: string, event: DomainEvent): Promise<void> {
  if (!producer || !connected) {
    logger.warn('[Kafka Producer] Not connected — skipping event publish', {
      topic,
      eventType: event.eventType,
      eventId: event.eventId,
    });
    return;
  }

  const start = Date.now();
  const record: ProducerRecord = {
    topic,
    messages: [
      {
        key: event.eventId,
        value: JSON.stringify(event),
        headers: {
          eventType: event.eventType,
          source: event.source,
          occurredAt: event.occurredAt,
        },
      },
    ],
  };

  try {
    await producer.send(record);
    logger.info('[Kafka Producer] Event published', {
      topic,
      eventType: event.eventType,
      eventId: event.eventId,
      durationMs: Date.now() - start,
      ...extractContextFromEvent(event),
    });
  } catch (error) {
    logger.error('[Kafka Producer] Failed to publish event', {
      topic,
      eventType: event.eventType,
      eventId: event.eventId,
      error: error instanceof Error ? error.message : String(error),
      durationMs: Date.now() - start,
      ...extractContextFromEvent(event),
    });
    // Non-fatal: do not re-throw
  }
}

/** Extract useful log context from any domain event */
function extractContextFromEvent(event: DomainEvent): Record<string, string | undefined> {
  const context: Record<string, string | undefined> = {};
  if ('appointmentId' in event) context.appointmentId = event.appointmentId;
  if ('patientId' in event) context.userId = event.patientId;
  if ('paymentId' in event) context.paymentId = event.paymentId;
  return context;
}

/** Returns true if the producer is connected (useful for health checks) */
export function isProducerConnected(): boolean {
  return connected;
}
