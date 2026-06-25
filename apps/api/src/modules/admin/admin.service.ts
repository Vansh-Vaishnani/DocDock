import { DoctorModel } from '../doctor/doctor.repository';
import { ApiError } from '../../common/errors/ApiError';
import mongoose from 'mongoose';

export class AdminService {
  async listPendingDoctors() {
    return DoctorModel.find({ verificationStatus: 'pending' }).lean();
  }

  async verifyDoctor(doctorId: string, approve: boolean, reason?: string) {
    const doctor = await DoctorModel.findById(doctorId);
    if (!doctor) {
      throw new ApiError('Doctor not found', 404, 'DOCTOR_NOT_FOUND');
    }
    doctor.verificationStatus = approve ? 'approved' : 'rejected';
    await doctor.save();
    return doctor;
  }
}
