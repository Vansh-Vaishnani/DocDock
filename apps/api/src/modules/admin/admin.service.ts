import { DoctorModel } from '../doctor/doctor.repository';
import { AppointmentModel } from '../appointment/appointment.repository';
import { UserModel } from '../auth/auth.repository';
import { ApiError } from '../../common/errors/ApiError';

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
    return { doctor, reason: reason ?? (approve ? 'Approved by admin' : 'Rejected by admin') };
  }

  async getDashboardOverview() {
    const [doctorCount, patientCount, appointmentCount, pendingDoctors] = await Promise.all([
      DoctorModel.countDocuments(),
      UserModel.countDocuments({ role: 'patient' }),
      AppointmentModel.countDocuments(),
      DoctorModel.countDocuments({ verificationStatus: 'pending' })
    ]);

    return {
      doctorCount,
      patientCount,
      appointmentCount,
      pendingDoctors
    };
  }

  async getAnalytics() {
    return {
      summary: await this.getDashboardOverview(),
      trend: [
        { label: 'Verified doctors', value: await DoctorModel.countDocuments({ verificationStatus: 'approved' }) },
        { label: 'Pending approvals', value: await DoctorModel.countDocuments({ verificationStatus: 'pending' }) },
        { label: 'Appointments', value: await AppointmentModel.countDocuments() }
      ]
    };
  }
}
