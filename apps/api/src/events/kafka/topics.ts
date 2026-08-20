/**
 * Kafka topic name constants.
 *
 * Use these constants everywhere instead of raw strings to prevent typos and
 * enable centralized topic management.
 */
export const KAFKA_TOPICS = {
  APPOINTMENT_CREATED: 'docdock.appointment.created',
  APPOINTMENT_CONFIRMED: 'docdock.appointment.confirmed',
  APPOINTMENT_CANCELLED: 'docdock.appointment.cancelled',
  CONSULTATION_STARTED: 'docdock.consultation.started',
  PRESCRIPTION_GENERATED: 'docdock.prescription.generated',
  PAYMENT_COMPLETED: 'docdock.payment.completed',
  NOTIFICATION_REQUESTED: 'docdock.notification.requested',
  // Real-time tracking lifecycle topics (Domain Events - NOT high-frequency GPS coords)
  DOCTOR_ON_THE_WAY: 'docdock.doctor.on_the_way',
  DOCTOR_ARRIVED: 'docdock.doctor.arrived',
  TRIP_CANCELLED: 'docdock.trip.cancelled',
  TRIP_COMPLETED: 'docdock.trip.completed',
} as const;

export type KafkaTopic = (typeof KAFKA_TOPICS)[keyof typeof KAFKA_TOPICS];
