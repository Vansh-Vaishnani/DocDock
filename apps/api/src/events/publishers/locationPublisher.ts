import { publishEvent } from '../kafka/producer';
import { KAFKA_TOPICS } from '../kafka/topics';
import {
  DoctorOnTheWayEvent,
  DoctorArrivedEvent,
  TripCancelledEvent,
  TripCompletedEvent,
  createBaseEvent,
} from '../kafka/eventTypes';
import { logger } from '../../common/utils/logger';

/**
 * Location / Trip Lifecycle Kafka Publishers.
 *
 * NOTE: High-frequency GPS coordinates are NEVER published to Kafka.
 * GPS updates use Redis (ephemeral cache) -> Socket.IO (room broadcast).
 *
 * Kafka is strictly reserved for durable domain lifecycle events:
 * - DoctorOnTheWay
 * - DoctorArrived
 * - TripCancelled
 * - TripCompleted
 */

export async function publishDoctorOnTheWay(params: {
  appointmentId: string;
  doctorId: string;
  patientId: string;
}): Promise<void> {
  const event: DoctorOnTheWayEvent = {
    ...createBaseEvent(),
    eventType: 'DoctorOnTheWay',
    appointmentId: params.appointmentId,
    doctorId: params.doctorId,
    patientId: params.patientId,
    startedAt: new Date().toISOString(),
  };

  logger.info('[LocationPublisher] Publishing DoctorOnTheWay event', {
    eventType: 'DoctorOnTheWay',
    eventId: event.eventId,
    appointmentId: event.appointmentId,
    userId: event.patientId,
  });

  await publishEvent(KAFKA_TOPICS.DOCTOR_ON_THE_WAY, event);
}

export async function publishDoctorArrived(params: {
  appointmentId: string;
  doctorId: string;
  patientId: string;
}): Promise<void> {
  const event: DoctorArrivedEvent = {
    ...createBaseEvent(),
    eventType: 'DoctorArrived',
    appointmentId: params.appointmentId,
    doctorId: params.doctorId,
    patientId: params.patientId,
    arrivedAt: new Date().toISOString(),
  };

  logger.info('[LocationPublisher] Publishing DoctorArrived event', {
    eventType: 'DoctorArrived',
    eventId: event.eventId,
    appointmentId: event.appointmentId,
    userId: event.patientId,
  });

  await publishEvent(KAFKA_TOPICS.DOCTOR_ARRIVED, event);
}

export async function publishTripCancelled(params: {
  appointmentId: string;
  doctorId: string;
  patientId: string;
  cancelledBy: 'doctor' | 'patient' | 'system';
  reason?: string;
}): Promise<void> {
  const event: TripCancelledEvent = {
    ...createBaseEvent(),
    eventType: 'TripCancelled',
    appointmentId: params.appointmentId,
    doctorId: params.doctorId,
    patientId: params.patientId,
    cancelledBy: params.cancelledBy,
    reason: params.reason,
  };

  logger.info('[LocationPublisher] Publishing TripCancelled event', {
    eventType: 'TripCancelled',
    eventId: event.eventId,
    appointmentId: event.appointmentId,
    userId: event.patientId,
  });

  await publishEvent(KAFKA_TOPICS.TRIP_CANCELLED, event);
}

export async function publishTripCompleted(params: {
  appointmentId: string;
  doctorId: string;
  patientId: string;
}): Promise<void> {
  const event: TripCompletedEvent = {
    ...createBaseEvent(),
    eventType: 'TripCompleted',
    appointmentId: params.appointmentId,
    doctorId: params.doctorId,
    patientId: params.patientId,
    completedAt: new Date().toISOString(),
  };

  logger.info('[LocationPublisher] Publishing TripCompleted event', {
    eventType: 'TripCompleted',
    eventId: event.eventId,
    appointmentId: event.appointmentId,
    userId: event.patientId,
  });

  await publishEvent(KAFKA_TOPICS.TRIP_COMPLETED, event);
}
