import { DomainEvent, PaymentCompletedEvent, AppointmentCancelledEvent } from '../kafka/eventTypes';
import { KAFKA_TOPICS } from '../kafka/topics';
import { createKafkaConsumer, ConsumerSubscription } from '../kafka/consumer';
import { logger } from '../../common/utils/logger';

/**
 * Handles PaymentCompleted events in the appointment workflow consumer.
 *
 * Responsibility: appointment workflow side-effects that are separate from
 * the primary HTTP request path. For example:
 * - Scheduling a BullMQ reminder job for T-30 minutes before the appointment
 * - Triggering any EHR/EMR integrations
 * - Analytics event emission
 *
 * The actual appointment creation happens synchronously in payment.controller.ts
 * via confirmAfterPayment. This consumer handles async follow-ups.
 */
async function handlePaymentCompleted(event: PaymentCompletedEvent): Promise<void> {
  logger.info('[AppointmentConsumer] Handling PaymentCompleted — scheduling reminder job', {
    eventType: 'PaymentCompleted',
    eventId: event.eventId,
    appointmentId: event.appointmentId,
    userId: event.patientId,
    paymentId: event.paymentId,
  });

  // Future: enqueue a BullMQ delayed reminder job here
  // e.g. reminderQueue.add('appointment_reminder', { appointmentId: event.appointmentId }, { delay: ... })
  //
  // This is the canonical separation:
  // - Kafka carries the domain event (durable, replayable)
  // - BullMQ handles the delayed job (precise timing, retry semantics)
  logger.info('[AppointmentConsumer] Appointment workflow side-effects complete', {
    eventId: event.eventId,
    appointmentId: event.appointmentId,
  });
}

/**
 * Handles AppointmentCancelled events — e.g. cancel any pending reminder jobs.
 */
async function handleAppointmentCancelled(event: AppointmentCancelledEvent): Promise<void> {
  logger.info('[AppointmentConsumer] Handling AppointmentCancelled — removing reminder jobs', {
    eventType: 'AppointmentCancelled',
    eventId: event.eventId,
    appointmentId: event.appointmentId,
    userId: event.patientId,
  });

  // Future: remove BullMQ reminder job for this appointment
}

/**
 * Route incoming Kafka messages to specific handlers based on eventType.
 */
async function appointmentMessageHandler(
  event: DomainEvent
): Promise<void> {
  switch (event.eventType) {
    case 'PaymentCompleted':
      await handlePaymentCompleted(event);
      break;
    case 'AppointmentCancelled':
      await handleAppointmentCancelled(event);
      break;
    default:
      logger.warn('[AppointmentConsumer] Unhandled event type', {
        eventType: event.eventType,
        eventId: event.eventId,
      });
  }
}

const subscriptions: ConsumerSubscription[] = [
  { topic: KAFKA_TOPICS.PAYMENT_COMPLETED, handler: appointmentMessageHandler },
  { topic: KAFKA_TOPICS.APPOINTMENT_CANCELLED, handler: appointmentMessageHandler },
];

/**
 * Creates and starts the appointment workflow Kafka consumer group.
 * Returns a stop function for graceful shutdown.
 */
export async function startAppointmentConsumer(): Promise<() => Promise<void>> {
  const result = await createKafkaConsumer('appointment-workflow', subscriptions);
  if (!result) {
    return async () => {};
  }
  await result.start();
  return result.stop;
}
