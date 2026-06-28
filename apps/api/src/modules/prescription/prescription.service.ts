import { ApiError } from '../../common/errors/ApiError';
import mongoose from 'mongoose';
import { AppointmentModel } from '../appointment/appointment.repository';
import { DoctorModel } from '../doctor/doctor.repository';
import { UserModel } from '../auth/auth.repository';

import { PrescriptionModel, IPrescriptionDocument, IMedication } from './prescription.repository';

interface PrescriptionListResult {
  prescriptions: Array<{
    prescriptionId: string;
    doctor: { fullName?: string; specialization?: string };
    diagnosis: string;
    medicationCount: number;
    prescriptionPdfUrl?: string;
    issuedAt: Date;
  }>;
  meta: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
}

export class PrescriptionService {
  async createPrescription(doctorId: string, payload: {
    appointmentId: string;
    diagnosis: string;
    chiefComplaints: string;
    medications: IMedication[];
    labTests?: string[];
    advice?: string;
    followUpDate?: string;
  }): Promise<{ prescriptionId: string; appointmentId: string; prescriptionPdfUrl?: string; issuedAt: Date }> {
    const appointment = await AppointmentModel.findById(payload.appointmentId);
    if (!appointment) {
      throw new ApiError('Appointment not found', 404, 'APPOINTMENT_NOT_FOUND');
    }

    // Resolve doctor document from provided user id (controller passes user.sub)
    const doctor = await DoctorModel.findOne({ userId: appointment.doctorId }) || await DoctorModel.findOne({ userId: new mongoose.Types.ObjectId(doctorId) });
    // The controller passes the authenticated user's id; ensure it matches the appointment's assigned doctor
    const actingDoctor = await DoctorModel.findOne({ userId: new mongoose.Types.ObjectId(doctorId) });
    if (!actingDoctor) {
      throw new ApiError('Doctor profile not found for current user', 404, 'DOCTOR_NOT_FOUND');
    }

    if (appointment.doctorId.toString() !== actingDoctor._id.toString()) {
      throw new ApiError('Only the assigned doctor can create a prescription', 403, 'FORBIDDEN');
    }

    // Allow creation or editing of prescription when consultation started.
    // Editing is allowed until appointment is marked 'completed'.
    if (appointment.status !== 'in_consultation' && appointment.status !== 'completed') {
      throw new ApiError('Appointment must be in in_consultation or completed state', 400, 'APPOINTMENT_NOT_IN_PROGRESS');
    }

    const existingPrescription = await PrescriptionModel.findOne({ appointmentId: payload.appointmentId });

    const prescription = existingPrescription
      ? await PrescriptionModel.findOneAndUpdate(
          { _id: existingPrescription._id },
          {
            diagnosis: payload.diagnosis,
            chiefComplaints: payload.chiefComplaints,
            medications: payload.medications,
            labTests: payload.labTests,
            advice: payload.advice,
            followUpDate: payload.followUpDate ? new Date(payload.followUpDate) : undefined,
            issuedAt: new Date(),
            isValid: true,
            prescriptionPdfUrl: existingPrescription.prescriptionPdfUrl || `https://res.cloudinary.com/docdock/prescriptions/${appointment._id}.pdf`
          },
          { new: true }
        )
      : await PrescriptionModel.create({
          appointmentId: appointment._id,
          doctorId: appointment.doctorId,
          patientId: appointment.patientId,
          diagnosis: payload.diagnosis,
          chiefComplaints: payload.chiefComplaints,
          medications: payload.medications,
          labTests: payload.labTests,
          advice: payload.advice,
          followUpDate: payload.followUpDate ? new Date(payload.followUpDate) : undefined,
          issuedAt: new Date(),
          isValid: true,
          prescriptionPdfUrl: `https://res.cloudinary.com/docdock/prescriptions/${appointment._id}.pdf`
        });

    if (!prescription) {
      throw new ApiError('Unable to save prescription', 500, 'PRESCRIPTION_SAVE_FAILED');
    }

    appointment.prescriptionId = prescription._id;
    await appointment.save();

    return {
      prescriptionId: prescription._id.toString(),
      appointmentId: appointment._id.toString(),
      prescriptionPdfUrl: prescription.prescriptionPdfUrl,
      issuedAt: prescription.issuedAt
    };
  }

  async getPrescription(prescriptionId: string, userId: string, role: 'patient' | 'doctor' | 'admin'): Promise<IPrescriptionDocument> {
    const prescription = await PrescriptionModel.findById(prescriptionId).lean();
    if (!prescription) {
      throw new ApiError('Prescription not found', 404, 'PRESCRIPTION_NOT_FOUND');
    }

    if (role === 'admin') {
      return prescription as IPrescriptionDocument;
    }

    if (role === 'doctor') {
      // userId is the authenticated user's id (User._id). Resolve doctor's document and compare.
      const actingDoctor = await DoctorModel.findOne({ userId: new mongoose.Types.ObjectId(userId) }).lean();
      if (!actingDoctor) {
        throw new ApiError('Doctor profile not found for current user', 404, 'FORBIDDEN');
      }
      if (prescription.doctorId.toString() !== (actingDoctor._id as any).toString()) {
        throw new ApiError('Forbidden', 403, 'FORBIDDEN');
      }
    }

    if (role === 'patient' && prescription.patientId.toString() !== userId) {
      throw new ApiError('Forbidden', 403, 'FORBIDDEN');
    }

    return prescription as IPrescriptionDocument;
  }

  async getPatientPrescriptions(patientId: string, page = 1, limit = 10): Promise<PrescriptionListResult> {
    const total = await PrescriptionModel.countDocuments({ patientId });
    const prescriptions = await PrescriptionModel.find({ patientId })
      .sort({ issuedAt: -1 })
      .skip((page - 1) * limit)
      .limit(limit)
      .lean();

    const doctorIds = Array.from(new Set(prescriptions.map((item) => item.doctorId.toString())));
    const doctors = await DoctorModel.find({ _id: { $in: doctorIds } }).select('specialization userId').lean();
    const userIds = doctors.map((doctor) => doctor.userId.toString());
    const users = await UserModel.find({ _id: { $in: userIds } }).select('fullName').lean();
    const userMap = new Map(users.map((user) => [user._id.toString(), user]));
    const doctorMap = new Map(doctors.map((doctor) => [doctor._id.toString(), { specialization: doctor.specialization, fullName: userMap.get(doctor.userId.toString())?.fullName }]));

    return {
      prescriptions: prescriptions.map((item) => ({
        prescriptionId: item._id.toString(),
        doctor: {
          fullName: doctorMap.get(item.doctorId.toString())?.fullName,
          specialization: doctorMap.get(item.doctorId.toString())?.specialization
        },
        diagnosis: item.diagnosis,
        medicationCount: item.medications.length,
        prescriptionPdfUrl: item.prescriptionPdfUrl,
        issuedAt: item.issuedAt
      })),
      meta: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit)
      }
    };
  }
}
