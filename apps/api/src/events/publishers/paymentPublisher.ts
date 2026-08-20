import { publishEvent } from '../kafka/producer';
import { KAFKA_TOPICS } from '../kafka/topics';
import {
  PaymentCompletedEvent,
  createBaseEvent,
} from '../kafka/eventTypes';
import { logger } from '../../common/utils/logger';

/**
 * Publishes a PaymentCompleted domain event to Kafka.
 *
 * Called after Razorpay payment verification succeeds. This is the primary
 * trigger for downstream consumers (notification consumer + appointment consumer).
 *
 * This call is intentionally non-blocking — a failure does not affect the
 * HTTP response to the client.
 */
export async function publishPaymentCompleted(params: {
  paymentId: string;
  appointmentId: string;
  patientId: string;
  amount: number;
  razorpayOrderId: string;
  razorpayPaymentId: string;
}): Promise<void> {
  const event: PaymentCompletedEvent = {
    ...createBaseEvent(),
    eventType: 'PaymentCompleted',
    paymentId: params.paymentId,
    appointmentId: params.appointmentId,
    patientId: params.patientId,
    amount: params.amount,
    razorpayOrderId: params.razorpayOrderId,
    razorpayPaymentId: params.razorpayPaymentId,
  };

  logger.info('[PaymentPublisher] Publishing PaymentCompleted event', {
    eventType: 'PaymentCompleted',
    eventId: event.eventId,
    appointmentId: event.appointmentId,
    userId: event.patientId,
    paymentId: event.paymentId,
  });

  await publishEvent(KAFKA_TOPICS.PAYMENT_COMPLETED, event);
}
