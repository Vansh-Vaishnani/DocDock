import { PatientModel, IPatientDocument } from './patient.repository';
import { ApiError } from '../../common/errors/ApiError';
import mongoose from 'mongoose';

export class PatientService {
  async addAddress(
    patientId: string,
    payload: { label: string; location: { type: 'Point'; coordinates: [number, number] }; isDefault: boolean }
  ): Promise<IPatientDocument> {
    const patient = await PatientModel.findOne({ userId: new mongoose.Types.ObjectId(patientId) });
    if (!patient) {
      throw new ApiError('Patient profile not found', 404, 'PATIENT_NOT_FOUND');
    }

    if (payload.isDefault) {
      patient.addresses = patient.addresses.map((address) => ({ ...address, isDefault: false }));
    }
    patient.addresses.push(payload);
    await patient.save();
    return patient;
  }
}
