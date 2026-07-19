import mongoose from 'mongoose';

import { ApiError } from '../../common/errors/ApiError';
import { UserModel } from '../auth/auth.repository';
import { PatientModel, IPatientDocument } from './patient.repository';
import { DoctorModel } from '../doctor/doctor.repository';
import { AppointmentModel } from '../appointment/appointment.repository';
import { EmergencyRequestModel } from './emergency.model';
import { PaymentModel } from '../payment/payment.repository';
import { NotificationService } from '../notification/notification.service';
import { getIO } from '../../sockets/gateway';
import { isCloudinaryEnabled, uploadBase64File } from '../../services/cloudinary.service';

const notificationService = new NotificationService();

export interface PatientProfileResponse {
  _id: string;
  userId: string;
  fullName: string;
  email: string;
  phone: string;
  bloodGroup?: string;
  profilePhotoUrl?: string;
  allergies: string[];
  medicalHistory: Array<{ _id?: string; note: string; createdAt: string }>;
  addresses: Array<{
    _id?: string;
    label: string;
    addressLine?: string;
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
  profilePhotoUrl: patient.profilePhotoUrl,
  allergies: patient.allergies ?? [],
  medicalHistory: (patient.medicalHistory ?? []).map((entry) => ({
    _id: entry._id?.toString(),
    note: entry.note,
    createdAt: entry.createdAt.toISOString()
  })),
  addresses: (patient.addresses ?? []).map((address) => ({
    _id: address._id?.toString(),
    label: address.label,
    addressLine: address.addressLine,
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
      profilePhoto?: string;  // base64 data URI
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

    // Handle profile photo upload
    if (payload.profilePhoto && isCloudinaryEnabled()) {
      try {
        const photoUrl = await uploadBase64File(payload.profilePhoto, 'patient-profiles');
        patient.profilePhotoUrl = photoUrl;
        user.avatar = photoUrl;
      } catch (err) {
        console.error('Patient profile photo upload failed:', err);
        // Non-fatal: continue without photo update
      }
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

  async triggerSos(userId: string, coordinates: [number, number]) {
    const patientUser = await UserModel.findById(userId).select('fullName phone').lean();
    if (!patientUser) {
      throw new ApiError('Patient user not found', 404, 'USER_NOT_FOUND');
    }

    // 1. Find nearest verified and available doctor
    const nearestDoctor = await DoctorModel.findOne({
      verificationStatus: 'approved',
      'availability.isAvailable': true,
      'availability.vacationMode': false,
      location: {
        $nearSphere: {
          $geometry: {
            type: 'Point',
            coordinates: coordinates // [lng, lat]
          }
        }
      }
    });

    let doctor = nearestDoctor;
    if (!doctor) {
      // Fallback: search for any verified doctor
      doctor = await DoctorModel.findOne({
        verificationStatus: 'approved',
        location: {
          $nearSphere: {
            $geometry: {
              type: 'Point',
              coordinates: coordinates
            }
          }
        }
      });
    }

    if (!doctor) {
      throw new ApiError('No verified doctors are registered in the system', 404, 'DOCTORS_NOT_AVAILABLE');
    }

    // 2. Create emergency request log
    const request = await EmergencyRequestModel.create({
      patientId: new mongoose.Types.ObjectId(userId),
      location: { type: 'Point', coordinates },
      assignedDoctorId: doctor._id,
      status: 'resolved'
    });

    // 3. Create high-priority Emergency Appointment
    const appointment = await AppointmentModel.create({
      patientId: new mongoose.Types.ObjectId(userId),
      doctorId: doctor._id,
      scheduledAt: new Date(),
      address: {
        label: 'SOS Emergency Location',
        location: { type: 'Point', coordinates }
      },
      status: 'pending',
      isEmergency: true,
      notes: 'EMERGENCY SOS AUTO-ASSIGNED'
    });

    // Create a pending payment record for tracking
    const orderId = `sos_${appointment._id}_${Date.now()}`;
    await PaymentModel.create({
      appointmentId: appointment._id,
      patientId: new mongoose.Types.ObjectId(userId),
      razorpayOrderId: orderId,
      status: 'pending',
      amount: doctor.consultationFee || 500
    });

    request.appointmentId = appointment._id;
    await request.save();

    // 4. Notify doctor in real-time
    try {
      const doctorUserId = doctor.userId.toString();
      await notificationService.createNotification({
        userId: doctorUserId,
        type: 'emergency_request',
        title: '🚨 EMERGENCY SOS ASSIGNED',
        message: 'You have been assigned a high-priority emergency SOS appointment nearby.',
        channel: 'in_app',
        metadata: { appointmentId: appointment._id.toString(), requestId: request._id.toString() }
      });

      const io = getIO();
      // Emit to doctor's active notifications namespace
      io.of('/notifications').to(doctorUserId).emit('notification', {
        type: 'emergency_request',
        title: '🚨 EMERGENCY SOS ASSIGNED',
        message: 'You have been assigned a high-priority emergency SOS appointment nearby.'
      });

      // Emit to doctor's general socket room
      io.of('/notifications').to(doctorUserId).emit('emergency:assigned', {
        appointmentId: appointment._id.toString()
      });
    } catch (e) {
      console.error('[SOS Service] Failed to dispatch socket notifications:', e);
    }

    // 5. Default emergency numbers payload
    const emergencyContacts = {
      ambulance: '102',
      police: '100',
      emergencyHelpline: '112'
    };

    const docUser = await UserModel.findById(doctor.userId).select('fullName phone').lean();

    return {
      success: true,
      appointmentId: appointment._id.toString(),
      doctor: {
        fullName: docUser?.fullName ?? 'Doctor',
        phone: docUser?.phone ?? '—',
        clinicName: doctor.clinicName,
        clinicAddress: doctor.clinicAddress
      },
      emergencyContacts
    };
  }
}
