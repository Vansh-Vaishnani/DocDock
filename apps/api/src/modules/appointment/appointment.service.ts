import mongoose from 'mongoose';

import { DoctorModel } from '../doctor/doctor.repository';
import { ApiError } from '../../common/errors/ApiError';

import { AppointmentModel, AppointmentStatus, IAppointmentDocument } from './appointment.repository';

const validTransitions: Record<string, string[]> = {
  pending: ['accepted', 'rejected', 'auto_rejected', 'cancelled_by_patient'],
  accepted: ['doctor_on_way', 'cancelled_by_patient', 'cancelled_by_doctor'],
  doctor_on_way: ['in_consultation', 'cancelled_by_patient'],
  in_consultation: ['completed', 'cancelled_by_patient'],
  completed: [],
  rejected: [],
  auto_rejected: [],
  cancelled_by_patient: [],
  cancelled_by_doctor: []
};

export class AppointmentService {
  async createAppointment(payload: {
    patientId: string;
    doctorId: string;
    scheduledAt: string;
    address: { label: string; location: { type: 'Point'; coordinates: [number, number] } };
    notes?: string;
  }): Promise<IAppointmentDocument> {
    if (!payload.address.label.trim()) {
      throw new ApiError('Address label is required', 400, 'VALIDATION_ERROR');
    }
    const doctor = await DoctorModel.findById(payload.doctorId);
    if (!doctor || doctor.verificationStatus !== 'approved') {
      throw new ApiError('Doctor not available for booking', 404, 'DOCTOR_NOT_AVAILABLE');
    }

    const appointment = await AppointmentModel.create({
      patientId: new mongoose.Types.ObjectId(payload.patientId),
      doctorId: new mongoose.Types.ObjectId(payload.doctorId),
      scheduledAt: new Date(payload.scheduledAt),
      address: payload.address,
      status: 'pending',
      notes: payload.notes
    });

    return appointment;
  }

  async updateStatus(appointmentId: string, status: AppointmentStatus, userId: string, userRole: 'patient' | 'doctor' | 'admin'): Promise<IAppointmentDocument> {
    const appointment = await AppointmentModel.findById(appointmentId);
    if (!appointment) {
      throw new ApiError('Appointment not found', 404, 'APPOINTMENT_NOT_FOUND');
    }
    if (!validTransitions[appointment.status].includes(status)) {
      throw new ApiError('Invalid appointment status transition', 400, 'INVALID_APPOINTMENT_TRANSITION');
    }

    const doctorActions = ['accepted', 'rejected', 'doctor_on_way', 'in_consultation', 'completed', 'cancelled_by_doctor'];
    if (doctorActions.includes(status)) {
      const doctor = await DoctorModel.findOne({ userId: new mongoose.Types.ObjectId(userId) });
      if (!doctor || appointment.doctorId.toString() !== doctor._id.toString()) {
        throw new ApiError('Only the assigned doctor can update this status', 403, 'FORBIDDEN');
      }
      if (status === 'accepted' && doctor.verificationStatus !== 'approved') {
        throw new ApiError('Doctor account is not verified', 403, 'DOCTOR_NOT_VERIFIED');
      }
    }

    if (status === 'cancelled_by_patient' && appointment.patientId.toString() !== userId) {
      throw new ApiError('Only the booking patient can cancel', 403, 'FORBIDDEN');
    }

    appointment.status = status;
    await appointment.save();
    return appointment;
  }
}
