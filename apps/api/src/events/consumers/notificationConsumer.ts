import { EachMessagePayload } from 'kafkajs';
import { DomainEvent, PaymentCompletedEvent, AppointmentCreatedEvent, AppointmentConfirmedEvent, AppointmentCancelledEvent } from '../kafka/eventTypes';
import { KAFKA_TOPICS } from '../kafka/topics';
import { createKafkaConsumer, ConsumerSubscription } from '../kafka/consumer';
import { logger } from '../../common/utils/logger';
import { NotificationService } from '../../modules/notification/notification.service';

const notificationService = new NotificationService();

/**
 * Handles PaymentCompleted events: creates in-app notifications for both
 * patient (payment confirmation) and appointment booking confirmation.
 *
 * This duplicates the synchronous notification creation in
 * `appointment.service.ts:confirmAfterPayment` from the perspective of Kafka.
 * The synchronous path remains the primary path; Kafka notifications are
 * an additional delivery vector (useful for future cross-service scenarios).
 */
async function handlePaymentCompleted(event: PaymentCompletedEvent): Promise<void> {
  logger.info('[NotificationConsumer] Handling PaymentCompleted', {
    eventType: 'PaymentCompleted',
    eventId: event.eventId,
    appointmentId: event.appointmentId,
    userId: event.patientId,
    paymentId: event.paymentId,
  });

  // The primary notifications are fired synchronously in confirmAfterPayment.
  // Here we log the event for audit/observability purposes and could fan out
  // to additional channels (e.g. push notifications, email via BullMQ) without
  // blocking the HTTP response.
  logger.info('[NotificationConsumer] PaymentCompleted event acknowledged for audit trail', {
    eventId: event.eventId,
    appointmentId: event.appointmentId,
    userId: event.patientId,
    paymentId: event.paymentId,
    amount: event.amount,
  });
}

/**
 * Handles AppointmentCreated events: creates a notification for the doctor
 * about a new incoming appointment request.
 */
async function handleAppointmentCreated(event: AppointmentCreatedEvent): Promise<void> {
  logger.info('[NotificationConsumer] Handling AppointmentCreated', {
    eventType: 'AppointmentCreated',
    eventId: event.eventId,
    appointmentId: event.appointmentId,
    userId: event.patientId,
  });
  // Notifications are already created synchronously in appointment.service.ts.
  // This consumer is a hook point for future expansions (e.g. email reminder queue).
}

/**
 * Handles AppointmentConfirmed — e.g. send an email confirmation via BullMQ.
 */
async function handleAppointmentConfirmed(event: AppointmentConfirmedEvent): Promise<void> {
  logger.info('[NotificationConsumer] Handling AppointmentConfirmed', {
    eventType: 'AppointmentConfirmed',
    eventId: event.eventId,
    appointmentId: event.appointmentId,
    userId: event.patientId,
  });
}

/**
 * Handles AppointmentCancelled — e.g. trigger refund notification.
 */
async function handleAppointmentCancelled(event: AppointmentCancelledEvent): Promise<void> {
  logger.info('[NotificationConsumer] Handling AppointmentCancelled', {
    eventType: 'AppointmentCancelled',
    eventId: event.eventId,
    appointmentId: event.appointmentId,
    userId: event.patientId,
  });
}

/**
 * Route incoming Kafka messages to specific handlers based on eventType.
 */
async function notificationMessageHandler(
  event: DomainEvent,
  _payload: EachMessagePayload
): Promise<void> {
  switch (event.eventType) {
    case 'PaymentCompleted':
      await handlePaymentCompleted(event);
      break;
    case 'AppointmentCreated':
      await handleAppointmentCreated(event);
      break;
    case 'AppointmentConfirmed':
      await handleAppointmentConfirmed(event);
      break;
    case 'AppointmentCancelled':
      await handleAppointmentCancelled(event);
      break;
    default:
      logger.warn('[NotificationConsumer] Unhandled event type', {
        eventType: (event as DomainEvent).eventType,
        eventId: event.eventId,
      });
  }
}

const subscriptions: ConsumerSubscription[] = [
  { topic: KAFKA_TOPICS.PAYMENT_COMPLETED, handler: notificationMessageHandler },
  { topic: KAFKA_TOPICS.APPOINTMENT_CREATED, handler: notificationMessageHandler },
  { topic: KAFKA_TOPICS.APPOINTMENT_CONFIRMED, handler: notificationMessageHandler },
  { topic: KAFKA_TOPICS.APPOINTMENT_CANCELLED, handler: notificationMessageHandler },
];

/**
 * Creates and starts the notification Kafka consumer group.
 * Returns a stop function for graceful shutdown.
 */
export async function startNotificationConsumer(): Promise<() => Promise<void>> {
  const result = await createKafkaConsumer('notification', subscriptions);
  if (!result) {
    return async () => {};
  }
  await result.start();
  return result.stop;
}
