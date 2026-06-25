import { AppointmentModel } from '../appointment/appointment.repository';
import { ApiError } from '../../common/errors/ApiError';

import { TrackingRepository } from './tracking.repository';

export class TrackingService {
  constructor(private readonly repository = new TrackingRepository()) {}

  async getTrackingSnapshot(appointmentId: string, userId: string): Promise<unknown> {
    const appointment = await AppointmentModel.findById(appointmentId);
    if (!appointment) {
      throw new ApiError('Appointment not found', 404, 'APPOINTMENT_NOT_FOUND');
    }
    if (appointment.patientId.toString() !== userId && appointment.doctorId.toString() !== userId) {
      throw new ApiError('Forbidden', 403, 'FORBIDDEN');
    }
    if (!["doctor_on_way", "in_consultation"].includes(appointment.status)) {
      throw new ApiError('Tracking not active', 400, 'TRACKING_NOT_ACTIVE');
    }

    const session = await this.repository.getOrCreateSession(appointmentId, appointment.doctorId.toString(), appointment.patientId.toString());
    return {
      appointmentId,
      doctorCurrentLocation: session.doctorCurrentLocation,
      patientLocation: session.patientLocation,
      status: session.status,
      lastHeartbeatAt: session.lastHeartbeatAt
    };
  }

  async updateDoctorLocation(appointmentId: string, userId: string, coordinates: [number, number]): Promise<unknown> {
    const appointment = await AppointmentModel.findById(appointmentId);
    if (!appointment) {
      throw new ApiError('Appointment not found', 404, 'APPOINTMENT_NOT_FOUND');
    }
    if (appointment.doctorId.toString() !== userId) {
      throw new ApiError('Forbidden', 403, 'FORBIDDEN');
    }
    if (appointment.status !== 'doctor_on_way') {
      throw new ApiError('Tracking not active', 400, 'TRACKING_NOT_ACTIVE');
    }

    const updated = await this.repository.updateLocation(appointmentId, coordinates);
    return {
      appointmentId,
      coordinates,
      updatedAt: updated?.doctorCurrentLocation?.updatedAt
    };
  }
}
