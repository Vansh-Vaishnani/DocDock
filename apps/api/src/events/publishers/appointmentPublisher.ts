import { publishEvent } from '../kafka/producer';
import { KAFKA_TOPICS } from '../kafka/topics';
import {
  AppointmentCreatedEvent,
  AppointmentConfirmedEvent,
  AppointmentCancelledEvent,
  ConsultationStartedEvent,
  PrescriptionGeneratedEvent,
  createBaseEvent,
} from '../kafka/eventTypes';
import { logger } from '../../common/utils/logger';

/**
 * Publishes an AppointmentCreated domain event.
 * Called when a new appointment is created (direct booking, no payment required).
 */
export async function publishAppointmentCreated(params: {
  appointmentId: string;
  patientId: string;
  doctorId: string;
  scheduledAt: string;
  consultationMode: 'clinic' | 'home' | 'online';
  status: string;
}): Promise<void> {
  const event: AppointmentCreatedEvent = {
    ...createBaseEvent(),
    eventType: 'AppointmentCreated',
    ...params,
  };

  logger.info('[AppointmentPublisher] Publishing AppointmentCreated', {
    eventType: 'AppointmentCreated',
    eventId: event.eventId,
    appointmentId: event.appointmentId,
    userId: event.patientId,
  });

  await publishEvent(KAFKA_TOPICS.APPOINTMENT_CREATED, event);
}

/**
 * Publishes an AppointmentConfirmed domain event.
 * Called after payment confirmation creates or confirms the appointment.
 */
export async function publishAppointmentConfirmed(params: {
  appointmentId: string;
  patientId: string;
  doctorId: string;
  scheduledAt: string;
  consultationMode: string;
}): Promise<void> {
  const event: AppointmentConfirmedEvent = {
    ...createBaseEvent(),
    eventType: 'AppointmentConfirmed',
    ...params,
  };

  logger.info('[AppointmentPublisher] Publishing AppointmentConfirmed', {
    eventType: 'AppointmentConfirmed',
    eventId: event.eventId,
    appointmentId: event.appointmentId,
    userId: event.patientId,
  });

  await publishEvent(KAFKA_TOPICS.APPOINTMENT_CONFIRMED, event);
}

/**
 * Publishes an AppointmentCancelled domain event.
 */
export async function publishAppointmentCancelled(params: {
  appointmentId: string;
  patientId: string;
  doctorId: string;
  cancelledBy: 'patient' | 'doctor' | 'system';
  reason?: string;
}): Promise<void> {
  const event: AppointmentCancelledEvent = {
    ...createBaseEvent(),
    eventType: 'AppointmentCancelled',
    ...params,
  };

  logger.info('[AppointmentPublisher] Publishing AppointmentCancelled', {
    eventType: 'AppointmentCancelled',
    eventId: event.eventId,
    appointmentId: event.appointmentId,
    userId: event.patientId,
  });

  await publishEvent(KAFKA_TOPICS.APPOINTMENT_CANCELLED, event);
}

/**
 * Publishes a ConsultationStarted domain event.
 */
export async function publishConsultationStarted(params: {
  appointmentId: string;
  patientId: string;
  doctorId: string;
  startedAt: string;
}): Promise<void> {
  const event: ConsultationStartedEvent = {
    ...createBaseEvent(),
    eventType: 'ConsultationStarted',
    ...params,
  };

  logger.info('[AppointmentPublisher] Publishing ConsultationStarted', {
    eventType: 'ConsultationStarted',
    eventId: event.eventId,
    appointmentId: event.appointmentId,
    userId: event.patientId,
  });

  await publishEvent(KAFKA_TOPICS.CONSULTATION_STARTED, event);
}

/**
 * Publishes a PrescriptionGenerated domain event.
 */
export async function publishPrescriptionGenerated(params: {
  prescriptionId: string;
  appointmentId: string;
  patientId: string;
  doctorId: string;
}): Promise<void> {
  const event: PrescriptionGeneratedEvent = {
    ...createBaseEvent(),
    eventType: 'PrescriptionGenerated',
    ...params,
  };

  logger.info('[AppointmentPublisher] Publishing PrescriptionGenerated', {
    eventType: 'PrescriptionGenerated',
    eventId: event.eventId,
    appointmentId: event.appointmentId,
    userId: event.patientId,
    paymentId: event.prescriptionId,
  });

  await publishEvent(KAFKA_TOPICS.PRESCRIPTION_GENERATED, event);
}
