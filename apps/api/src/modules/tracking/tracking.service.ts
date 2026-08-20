import { AppointmentModel } from '../appointment/appointment.repository';
import { DoctorModel } from '../doctor/doctor.repository';
import { ApiError } from '../../common/errors/ApiError';
import { getIO } from '../../sockets/gateway';
import { logger } from '../../common/utils/logger';
import {
  publishDoctorOnTheWay,
  publishDoctorArrived,
  publishTripCancelled,
  publishTripCompleted,
} from '../../events/publishers/locationPublisher';

import { TrackingRepository, EphemeralLocation } from './tracking.repository';

export class TrackingService {
  constructor(private readonly repository = new TrackingRepository()) {}

  /**
   * Get tracking snapshot for patient or assigned doctor.
   */
  async getTrackingSnapshot(appointmentId: string, userId: string): Promise<unknown> {
    const appointment = await AppointmentModel.findById(appointmentId);
    if (!appointment) {
      throw new ApiError('Appointment not found', 404, 'APPOINTMENT_NOT_FOUND');
    }

    const doctor = await DoctorModel.findById(appointment.doctorId);
    const doctorUserId = doctor?.userId.toString();
    const patientUserId = appointment.patientId.toString();

    if (patientUserId !== userId && doctorUserId !== userId && appointment.doctorId.toString() !== userId) {
      throw new ApiError('Forbidden: You are not authorized to view tracking for this appointment', 403, 'FORBIDDEN');
    }

    if (!['doctor_on_way', 'arrived', 'in_consultation'].includes(appointment.status)) {
      throw new ApiError('Tracking not active for this appointment state', 400, 'TRACKING_NOT_ACTIVE');
    }

    // Attempt to fetch high-frequency ephemeral location from Redis first
    const liveLocation = await this.repository.getEphemeralLocation(appointmentId);
    const session = await this.repository.getOrCreateSession(appointmentId, appointment.doctorId.toString(), appointment.patientId.toString());

    return {
      appointmentId,
      status: appointment.status,
      liveLocation: liveLocation || null,
      doctorCurrentLocation: session.doctorCurrentLocation,
      patientLocation: session.patientLocation,
      lastHeartbeatAt: session.lastHeartbeatAt,
    };
  }

  /**
   * Doctor starts journey -> transitions state to `doctor_on_way`.
   */
  async startTrip(appointmentId: string, userId: string, initialCoordinates?: [number, number]): Promise<unknown> {
    const appointment = await AppointmentModel.findById(appointmentId);
    if (!appointment) {
      throw new ApiError('Appointment not found', 404, 'APPOINTMENT_NOT_FOUND');
    }

    const doctor = await DoctorModel.findOne({ userId });
    if (!doctor || appointment.doctorId.toString() !== doctor._id.toString()) {
      throw new ApiError('Forbidden: Only the assigned doctor can start the journey', 403, 'FORBIDDEN');
    }

    if (!['accepted', 'confirmed'].includes(appointment.status)) {
      throw new ApiError(`Cannot start trip from appointment status '${appointment.status}'`, 400, 'INVALID_TRANSITION');
    }

    appointment.status = 'doctor_on_way';
    await appointment.save();

    let locationPayload: EphemeralLocation | null = null;
    if (initialCoordinates) {
      locationPayload = await this.repository.setEphemeralLocation(
        appointmentId,
        doctor._id.toString(),
        initialCoordinates
      );
      await this.repository.updateLocation(appointmentId, initialCoordinates);
    }

    // Publish DoctorOnTheWay domain event to Kafka (non-blocking)
    publishDoctorOnTheWay({
      appointmentId: appointment._id.toString(),
      doctorId: doctor._id.toString(),
      patientId: appointment.patientId.toString(),
    }).catch((err) => {
      logger.warn('[TrackingService] Failed to publish DoctorOnTheWay Kafka event', {
        error: err instanceof Error ? err.message : String(err),
        appointmentId,
      });
    });

    // Notify connected patient socket room
    try {
      const io = getIO();
      io.of('/tracking').to(`appointment:${appointmentId}`).emit('doctor:trip:started', {
        appointmentId,
        doctorId: doctor._id.toString(),
        timestamp: Date.now(),
        initialLocation: locationPayload,
      });
    } catch (err) {
      logger.warn('[TrackingService] Socket notification error on trip start', { error: String(err) });
    }

    return {
      appointmentId,
      status: 'doctor_on_way',
      liveLocation: locationPayload,
    };
  }

  /**
   * Update live doctor GPS location.
   * STRICT ENFORCEMENT: ONLY allowed when appointment.status === 'doctor_on_way'.
   */
  async updateDoctorLocation(appointmentId: string, userId: string, coordinates: [number, number]): Promise<unknown> {
    const appointment = await AppointmentModel.findById(appointmentId);
    if (!appointment) {
      throw new ApiError('Appointment not found', 404, 'APPOINTMENT_NOT_FOUND');
    }

    const doctor = await DoctorModel.findOne({ userId });
    const isAssignedDoctor = doctor && appointment.doctorId.toString() === doctor._id.toString();
    const isDirectDoctorId = appointment.doctorId.toString() === userId;

    if (!isAssignedDoctor && !isDirectDoctorId) {
      throw new ApiError('Forbidden: Only the assigned doctor can update trip location', 403, 'FORBIDDEN');
    }

    if (appointment.status !== 'doctor_on_way') {
      throw new ApiError(`Location sharing is inactive. Current status: '${appointment.status}'`, 400, 'TRACKING_NOT_ACTIVE');
    }

    const timestamp = Date.now();
    const doctorIdStr = doctor ? doctor._id.toString() : userId;

    // 1. Store high-frequency ephemeral location in Redis (60s TTL)
    const ephemeral = await this.repository.setEphemeralLocation(
      appointmentId,
      doctorIdStr,
      coordinates,
      timestamp
    );

    // 2. Broadcast live coordinates via Socket.IO to room `appointment:{id}`
    try {
      const io = getIO();
      io.of('/tracking').to(`appointment:${appointmentId}`).emit('doctor:location:update', {
        appointmentId,
        latitude: coordinates[1],
        longitude: coordinates[0],
        timestamp,
      });
    } catch (err) {
      logger.warn('[TrackingService] Socket emit doctor:location:update failed', { error: String(err) });
    }

    return {
      appointmentId,
      latitude: ephemeral.latitude,
      longitude: ephemeral.longitude,
      timestamp: ephemeral.timestamp,
    };
  }

  /**
   * End trip / arrival / cancel location sharing.
   */
  async endTrip(appointmentId: string, userId: string, reason?: string): Promise<unknown> {
    const appointment = await AppointmentModel.findById(appointmentId);
    if (!appointment) {
      throw new ApiError('Appointment not found', 404, 'APPOINTMENT_NOT_FOUND');
    }

    const doctor = await DoctorModel.findOne({ userId });
    const isAssignedDoctor = doctor && appointment.doctorId.toString() === doctor._id.toString();

    if (!isAssignedDoctor && appointment.patientId.toString() !== userId) {
      throw new ApiError('Forbidden: You are not authorized to end this trip', 403, 'FORBIDDEN');
    }

    // 1. Clear ephemeral location from Redis
    await this.repository.clearEphemeralLocation(appointmentId);

    // 2. Notify Socket.IO room that live tracking has ended
    try {
      const io = getIO();
      io.of('/tracking').to(`appointment:${appointmentId}`).emit('doctor:location:ended', {
        appointmentId,
        reason: reason || 'trip_ended',
        timestamp: Date.now(),
      });
    } catch (err) {
      logger.warn('[TrackingService] Socket emit doctor:location:ended failed', { error: String(err) });
    }

    return { appointmentId, status: appointment.status, trackingActive: false };
  }
}
