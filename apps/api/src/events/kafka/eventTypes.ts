import { v4 as uuidv4 } from 'uuid';

/**
 * Base envelope shared by every domain event.
 */
export interface BaseEvent {
  /** Unique event identifier for idempotency and tracing */
  eventId: string;
  /** ISO-8601 timestamp of when the event was produced */
  occurredAt: string;
  /** Application that produced the event */
  source: 'docdock-api';
}

// ---------------------------------------------------------------------------
// Appointment events
// ---------------------------------------------------------------------------

export interface AppointmentCreatedEvent extends BaseEvent {
  eventType: 'AppointmentCreated';
  appointmentId: string;
  patientId: string;
  doctorId: string;
  scheduledAt: string;
  consultationMode: 'clinic' | 'home' | 'online';
  status: string;
}

export interface AppointmentConfirmedEvent extends BaseEvent {
  eventType: 'AppointmentConfirmed';
  appointmentId: string;
  patientId: string;
  doctorId: string;
  scheduledAt: string;
  consultationMode: string;
}

export interface AppointmentCancelledEvent extends BaseEvent {
  eventType: 'AppointmentCancelled';
  appointmentId: string;
  patientId: string;
  doctorId: string;
  cancelledBy: 'patient' | 'doctor' | 'system';
  reason?: string;
}

export interface ConsultationStartedEvent extends BaseEvent {
  eventType: 'ConsultationStarted';
  appointmentId: string;
  patientId: string;
  doctorId: string;
  startedAt: string;
}

export interface PrescriptionGeneratedEvent extends BaseEvent {
  eventType: 'PrescriptionGenerated';
  prescriptionId: string;
  appointmentId: string;
  patientId: string;
  doctorId: string;
}

// ---------------------------------------------------------------------------
// Location / Trip Lifecycle events (Kafka domain events, NOT high-freq GPS)
// ---------------------------------------------------------------------------

export interface DoctorOnTheWayEvent extends BaseEvent {
  eventType: 'DoctorOnTheWay';
  appointmentId: string;
  doctorId: string;
  patientId: string;
  startedAt: string;
}

export interface DoctorArrivedEvent extends BaseEvent {
  eventType: 'DoctorArrived';
  appointmentId: string;
  doctorId: string;
  patientId: string;
  arrivedAt: string;
}

export interface TripCancelledEvent extends BaseEvent {
  eventType: 'TripCancelled';
  appointmentId: string;
  doctorId: string;
  patientId: string;
  cancelledBy: 'doctor' | 'patient' | 'system';
  reason?: string;
}

export interface TripCompletedEvent extends BaseEvent {
  eventType: 'TripCompleted';
  appointmentId: string;
  doctorId: string;
  patientId: string;
  completedAt: string;
}

// ---------------------------------------------------------------------------
// Payment events
// ---------------------------------------------------------------------------

export interface PaymentCompletedEvent extends BaseEvent {
  eventType: 'PaymentCompleted';
  paymentId: string;
  appointmentId: string;
  patientId: string;
  /** Amount in INR (not paise) */
  amount: number;
  razorpayOrderId: string;
  razorpayPaymentId: string;
}

// ---------------------------------------------------------------------------
// Notification events
// ---------------------------------------------------------------------------

export interface NotificationRequestedEvent extends BaseEvent {
  eventType: 'NotificationRequested';
  userId: string;
  type: string;
  title: string;
  message: string;
  channel: 'in_app' | 'email' | 'sms' | 'push';
  metadata?: Record<string, unknown>;
}

// ---------------------------------------------------------------------------
// Union type
// ---------------------------------------------------------------------------

export type DomainEvent =
  | AppointmentCreatedEvent
  | AppointmentConfirmedEvent
  | AppointmentCancelledEvent
  | ConsultationStartedEvent
  | PrescriptionGeneratedEvent
  | DoctorOnTheWayEvent
  | DoctorArrivedEvent
  | TripCancelledEvent
  | TripCompletedEvent
  | PaymentCompletedEvent
  | NotificationRequestedEvent;

// ---------------------------------------------------------------------------
// Factory helpers
// ---------------------------------------------------------------------------

export function createBaseEvent(): BaseEvent {
  return {
    eventId: uuidv4(),
    occurredAt: new Date().toISOString(),
    source: 'docdock-api',
  };
}
