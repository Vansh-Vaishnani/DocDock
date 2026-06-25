import mongoose from 'mongoose';

import { ApiError } from '../../common/errors/ApiError';

import { DoctorModel, IDoctorDocument } from './doctor.repository';

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

  async searchNearby(
    lat: number,
    lng: number,
    radiusMeters = 10000,
    specialization?: string,
    options: {
      minExperience?: number;
      maxFee?: number;
      search?: string;
      availableOnly?: boolean;
      sortBy?: string;
      page?: number;
      limit?: number;
    } = {}
  ): Promise<Array<Record<string, unknown>>> {
    const match: mongoose.FilterQuery<IDoctorDocument> = { verificationStatus: 'approved' };

    if (options.availableOnly) {
      match['availability.isAvailable'] = true;
    }

    if (specialization) {
      match.specialization = specialization;
    }

    if (typeof options.minExperience === 'number' && !Number.isNaN(options.minExperience)) {
      match.experience = { $gte: options.minExperience };
    }

    if (typeof options.maxFee === 'number' && !Number.isNaN(options.maxFee)) {
      match.consultationFee = { $lte: options.maxFee };
    }

    if (options.search) {
      match.$or = [
        { specialization: { $regex: options.search, $options: 'i' } },
        { bio: { $regex: options.search, $options: 'i' } },
        { qualifications: { $elemMatch: { $regex: options.search, $options: 'i' } } }
      ];
    }

    const query = DoctorModel.find({
      ...match,
      location: {
        $nearSphere: {
          $geometry: { type: 'Point', coordinates: [lng, lat] },
          $maxDistance: radiusMeters
        }
      }
    }).populate('userId', 'fullName').lean();

    if (options.sortBy === 'rating') {
      query.sort({ averageRating: -1, reviewCount: -1 });
    } else if (options.sortBy === 'fee') {
      query.sort({ consultationFee: 1, averageRating: -1 });
    }

    const page = typeof options.page === 'number' && options.page > 0 ? options.page : 1;
    const limit = typeof options.limit === 'number' && options.limit > 0 ? options.limit : 9;
    const skip = (page - 1) * limit;

    const doctors = await query.skip(skip).limit(limit);

    return doctors.map((doctor) => ({
      ...doctor,
      fullName: (doctor.userId as { fullName?: string } | undefined)?.fullName ?? null
    }));
  }

  async getDoctorById(id: string): Promise<Record<string, unknown>> {
    if (!mongoose.Types.ObjectId.isValid(id)) {
      throw new ApiError('Invalid doctor id', 400, 'INVALID_DOCTOR_ID');
    }

    const doctor = await DoctorModel.findById(id).populate('userId', 'fullName').lean();
    if (!doctor) {
      throw new ApiError('Doctor profile not found', 404, 'DOCTOR_NOT_FOUND');
    }

    return {
      ...doctor,
      fullName: (doctor.userId as { fullName?: string } | undefined)?.fullName ?? null
    };
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
