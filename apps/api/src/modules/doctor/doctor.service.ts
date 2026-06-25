import { DoctorModel, IDoctorDocument } from './doctor.repository';
import { ApiError } from '../../common/errors/ApiError';
import mongoose from 'mongoose';

export class DoctorService {
  async createProfile(payload: {
    userId: string;
    licenseNumber: string;
    specialization: string;
    qualifications: string[];
    experience: number;
    bio: string;
    languages: string[];
    consultationFee: number;
    location: { type: 'Point'; coordinates: [number, number] };
  }): Promise<IDoctorDocument> {
    const existingLicense = await DoctorModel.findOne({ licenseNumber: payload.licenseNumber });
    if (existingLicense) {
      throw new ApiError('License number already registered', 409, 'LICENSE_ALREADY_EXISTS');
    }

    const doctor = await DoctorModel.create({
      userId: new mongoose.Types.ObjectId(payload.userId),
      licenseNumber: payload.licenseNumber,
      specialization: payload.specialization,
      qualifications: payload.qualifications,
      experience: payload.experience,
      bio: payload.bio,
      languages: payload.languages,
      consultationFee: payload.consultationFee,
      location: payload.location,
      availability: { isAvailable: false },
      verificationStatus: 'pending',
      averageRating: 0,
      reviewCount: 0
    });

    return doctor;
  }

  async searchNearby(lat: number, lng: number, radiusMeters = 10000, specialization?: string): Promise<Array<Record<string, unknown>>> {
    const match: mongoose.FilterQuery<IDoctorDocument> = { verificationStatus: 'approved', 'availability.isAvailable': true };
    if (specialization) {
      match.specialization = specialization;
    }
    const doctors = await DoctorModel.find({
      ...match,
      location: {
        $nearSphere: {
          $geometry: { type: 'Point', coordinates: [lng, lat] },
          $maxDistance: radiusMeters
        }
      }
    }).lean();

    return doctors;
  }

  async updateAvailability(doctorId: string, isAvailable: boolean) {
    const doctor = await DoctorModel.findOne({ userId: new mongoose.Types.ObjectId(doctorId) });
    if (!doctor) {
      throw new ApiError('Doctor profile not found', 404, 'DOCTOR_NOT_FOUND');
    }
    doctor.availability.isAvailable = isAvailable;
    doctor.availability.lastSeenAt = new Date();
    await doctor.save();
    return doctor;
  }
}
