import mongoose from 'mongoose';

import { ApiError } from '../../common/errors/ApiError';

import { UserModel } from '../auth/auth.repository';

import { PatientModel, IPatientDocument } from './patient.repository';

export interface PatientProfileResponse {
  _id: string;
  userId: string;
  fullName: string;
  email: string;
  phone: string;
  bloodGroup?: string;
  allergies: string[];
  medicalHistory: Array<{ _id?: string; note: string; createdAt: string }>;
  addresses: Array<{
    _id?: string;
    label: string;
    location: { type: 'Point'; coordinates: [number, number] };
    isDefault: boolean;
  }>;
}

const formatProfile = (patient: IPatientDocument, user: { fullName: string; email: string; phone: string }): PatientProfileResponse => ({
  _id: patient._id.toString(),
  userId: patient.userId.toString(),
  fullName: user.fullName,
  email: user.email,
  phone: user.phone,
  bloodGroup: patient.bloodGroup,
  allergies: patient.allergies ?? [],
  medicalHistory: (patient.medicalHistory ?? []).map((entry) => ({
    _id: entry._id?.toString(),
    note: entry.note,
    createdAt: entry.createdAt.toISOString()
  })),
  addresses: (patient.addresses ?? []).map((address) => ({
    _id: address._id?.toString(),
    label: address.label,
    location: address.location,
    isDefault: address.isDefault
  }))
});

export class PatientService {
  private async findPatientByUserId(userId: string): Promise<IPatientDocument> {
    const patient = await PatientModel.findOne({ userId: new mongoose.Types.ObjectId(userId) });
    if (!patient) {
      throw new ApiError('Patient profile not found', 404, 'PATIENT_NOT_FOUND');
    }
    return patient;
  }

  async getProfile(userId: string): Promise<PatientProfileResponse> {
    const [patient, user] = await Promise.all([
      this.findPatientByUserId(userId),
      UserModel.findById(userId)
    ]);

    if (!user || user.isDeleted || !user.isActive) {
      throw new ApiError('User not found', 404, 'USER_NOT_FOUND');
    }

    return formatProfile(patient, user);
  }

  async updateProfile(
    userId: string,
    payload: {
      fullName?: string;
      email?: string;
      phone?: string;
      bloodGroup?: string;
      allergies?: string[];
      medicalHistory?: Array<{ note: string; createdAt?: string }>;
    }
  ): Promise<PatientProfileResponse> {
    const [patient, user] = await Promise.all([
      this.findPatientByUserId(userId),
      UserModel.findById(userId)
    ]);

    if (!user || user.isDeleted || !user.isActive) {
      throw new ApiError('User not found', 404, 'USER_NOT_FOUND');
    }

    if (payload.email && payload.email.toLowerCase() !== user.email) {
      const existingEmail = await UserModel.findOne({ email: payload.email.toLowerCase(), _id: { $ne: user._id } });
      if (existingEmail) {
        throw new ApiError('Email already registered', 409, 'EMAIL_ALREADY_EXISTS');
      }
      user.email = payload.email.toLowerCase();
    }

    if (payload.phone && payload.phone !== user.phone) {
      const existingPhone = await UserModel.findOne({ phone: payload.phone, _id: { $ne: user._id } });
      if (existingPhone) {
        throw new ApiError('Phone already registered', 409, 'PHONE_ALREADY_EXISTS');
      }
      user.phone = payload.phone;
    }

    if (payload.fullName) {
      user.fullName = payload.fullName;
    }

    if (payload.bloodGroup !== undefined) {
      patient.bloodGroup = payload.bloodGroup || undefined;
    }

    if (payload.allergies !== undefined) {
      patient.allergies = payload.allergies;
    }

    if (payload.medicalHistory !== undefined) {
      patient.medicalHistory = payload.medicalHistory.map((entry) => ({
        note: entry.note,
        createdAt: entry.createdAt ? new Date(entry.createdAt) : new Date()
      }));
    }

    await Promise.all([user.save(), patient.save()]);
    return formatProfile(patient, user);
  }

  async listAddresses(userId: string) {
    const profile = await this.getProfile(userId);
    return profile.addresses;
  }

  async addAddress(
    userId: string,
    payload: { label: string; location: { type: 'Point'; coordinates: [number, number] }; isDefault: boolean }
  ): Promise<PatientProfileResponse> {
    const patient = await this.findPatientByUserId(userId);

    if (!payload.label.trim()) {
      throw new ApiError('Address label is required', 400, 'VALIDATION_ERROR');
    }

    if (payload.isDefault) {
      patient.addresses.forEach((address) => {
        address.isDefault = false;
      });
    }
    patient.addresses.push(payload);
    await patient.save();

    return this.getProfile(userId);
  }

  async updateAddress(
    userId: string,
    addressId: string,
    payload: {
      label?: string;
      location?: { type: 'Point'; coordinates: [number, number] };
      isDefault?: boolean;
    }
  ): Promise<PatientProfileResponse> {
    const patient = await this.findPatientByUserId(userId);
    const address = patient.addresses.find((item) => item._id?.toString() === addressId);

    if (!address) {
      throw new ApiError('Address not found', 404, 'ADDRESS_NOT_FOUND');
    }

    if (payload.label !== undefined) {
      if (!payload.label.trim()) {
        throw new ApiError('Address label is required', 400, 'VALIDATION_ERROR');
      }
      address.label = payload.label;
    }

    if (payload.location) {
      address.location = payload.location;
    }

    if (payload.isDefault) {
      patient.addresses.forEach((item) => {
        item.isDefault = item._id?.toString() === addressId;
      });
    }

    await patient.save();
    return this.getProfile(userId);
  }

  async deleteAddress(userId: string, addressId: string): Promise<PatientProfileResponse> {
    const patient = await this.findPatientByUserId(userId);
    const index = patient.addresses.findIndex((item) => item._id?.toString() === addressId);

    if (index === -1) {
      throw new ApiError('Address not found', 404, 'ADDRESS_NOT_FOUND');
    }

    const wasDefault = patient.addresses[index].isDefault;
    patient.addresses.splice(index, 1);

    if (wasDefault && patient.addresses.length > 0) {
      patient.addresses[0].isDefault = true;
    }

    await patient.save();
    return this.getProfile(userId);
  }

  async setDefaultAddress(userId: string, addressId: string): Promise<PatientProfileResponse> {
    const patient = await this.findPatientByUserId(userId);
    const address = patient.addresses.find((item) => item._id?.toString() === addressId);

    if (!address) {
      throw new ApiError('Address not found', 404, 'ADDRESS_NOT_FOUND');
    }

    patient.addresses.forEach((item) => {
      item.isDefault = item._id?.toString() === addressId;
    });

    await patient.save();
    return this.getProfile(userId);
  }
}
