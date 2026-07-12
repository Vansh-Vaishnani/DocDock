import bcrypt from 'bcryptjs';

import mongoose from 'mongoose';



import { ApiError } from '../../common/errors/ApiError';

import { config } from '../../common/config';

import { isCloudinaryEnabled, uploadBase64File, uploadFile } from '../../services/cloudinary.service';



import { AuthService } from '../auth/auth.service';
import { UserModel } from '../auth/auth.repository';
import { AppointmentModel } from '../appointment/appointment.repository';
import { PaymentModel } from '../payment/payment.repository';
import { PrescriptionModel } from '../prescription/prescription.repository';
import { NotificationService } from '../notification/notification.service';
import { NotificationModel } from '../notification/notification.model';

import { DoctorModel, IDoctorDocument, defaultAvailability } from './doctor.repository';
import { ChatMessageModel } from '../chat/chat.model';



const notificationService = new NotificationService();

export interface DoctorProfileResponse {

  _id: string;

  userId: string;

  fullName: string;

  email: string;

  phone: string;

  licenseNumber: string;

  specialization: string;

  qualifications: string[];

  medicalDegree?: string;

  experience: number;

  bio: string;

  languages: string[];

  consultationFee: number;

  gender?: string;

  dateOfBirth?: string;

  clinicName?: string;

  profilePhotoUrl?: string;

  governmentIdUrl?: string;

  medicalLicenseUrl?: string;

  location: { type: 'Point'; coordinates: [number, number] };

  availability: IDoctorDocument['availability'];

  verificationStatus: 'pending' | 'approved' | 'rejected';
  verificationNote?: string;
  averageRating: number;
  reviewCount: number;
  profileCompletionPercent: number;
  consultationType?: string;
  consultationModes?: string[];
  clinicAddress?: string;
  serviceRadius?: number;
}



const authService = new AuthService();





const formatProfile = (

  doctor: IDoctorDocument,

  user: { fullName: string; email: string; phone: string }

): DoctorProfileResponse => ({

  _id: doctor._id.toString(),

  userId: doctor.userId.toString(),

  fullName: user.fullName,

  email: user.email,

  phone: user.phone,

  licenseNumber: doctor.licenseNumber,

  specialization: doctor.specialization,

  qualifications: doctor.qualifications,

  medicalDegree: doctor.medicalDegree,

  experience: doctor.experience,

  bio: doctor.bio,

  languages: doctor.languages,

  consultationFee: doctor.consultationFee,

  gender: doctor.gender,

  dateOfBirth: doctor.dateOfBirth?.toISOString().split('T')[0],

  clinicName: doctor.clinicName,

  profilePhotoUrl: doctor.profilePhotoUrl,
  governmentIdUrl: doctor.governmentIdUrl,
  medicalLicenseUrl: doctor.medicalLicenseUrl,
  location: doctor.location,
  availability: doctor.availability,
  verificationStatus: doctor.verificationStatus,
  verificationNote: doctor.verificationNote,
  averageRating: doctor.averageRating,
  reviewCount: doctor.reviewCount,
  profileCompletionPercent: calculateProfileCompletion(doctor, user),
  consultationType: doctor.consultationType || 'clinic',
  consultationModes: doctor.consultationModes && doctor.consultationModes.length > 0 ? doctor.consultationModes : ['clinic'],
  clinicAddress: doctor.clinicAddress || '',
  serviceRadius: doctor.serviceRadius ?? 10

});



function calculateProfileCompletion(

  doctor: IDoctorDocument,

  user: { fullName: string; email: string; phone: string }

): number {

  const checks = [

    Boolean(user.fullName),

    Boolean(user.email),

    Boolean(user.phone),

    Boolean(doctor.licenseNumber),

    Boolean(doctor.specialization),

    doctor.qualifications.length > 0,

    Boolean(doctor.medicalDegree),

    doctor.experience >= 0,

    Boolean(doctor.bio),

    doctor.languages.length > 0,

    doctor.consultationFee > 0,

    Boolean(doctor.gender),

    Boolean(doctor.dateOfBirth),

    Boolean(doctor.clinicName),

    Boolean(doctor.profilePhotoUrl),

    Boolean(doctor.governmentIdUrl),

    Boolean(doctor.medicalLicenseUrl)

  ];

  const filled = checks.filter(Boolean).length;

  return Math.round((filled / checks.length) * 100);

}



async function uploadOptional(dataUri: string | undefined, folder: string): Promise<string | undefined> {

  if (!dataUri) return undefined;

  if (!isCloudinaryEnabled()) {

    return undefined;

  }

  return uploadBase64File(dataUri, folder);

}



export class DoctorService {

  private async findDoctorByUserId(userId: string): Promise<IDoctorDocument> {

    const doctor = await DoctorModel.findOne({ userId: new mongoose.Types.ObjectId(userId) });

    if (!doctor) {

      throw new ApiError('Doctor profile not found', 404, 'DOCTOR_NOT_FOUND');

    }

    return doctor;

  }



  private async calculateTotalEarnings(doctorObjectId: mongoose.Types.ObjectId): Promise<number> {

    const paidPayments = await PaymentModel.aggregate([

      {

        $lookup: {

          from: 'appointments',

          localField: 'appointmentId',

          foreignField: '_id',

          as: 'appointment'

        }

      },

      { $unwind: '$appointment' },

      {

        $match: {

          'appointment.doctorId': doctorObjectId,

          status: 'paid'

        }

      },

      { $group: { _id: null, total: { $sum: '$amount' } } }

    ]);



    const refundedPayments = await PaymentModel.aggregate([

      {

        $lookup: {

          from: 'appointments',

          localField: 'appointmentId',

          foreignField: '_id',

          as: 'appointment'

        }

      },

      { $unwind: '$appointment' },

      {

        $match: {

          'appointment.doctorId': doctorObjectId,

          status: 'paid',

          refundStatus: { $in: ['initiated', 'completed'] }

        }

      },

      { $group: { _id: null, total: { $sum: '$amount' } } }

    ]);



    const totalPaid = paidPayments[0]?.total ?? 0;

    const totalRefunded = refundedPayments[0]?.total ?? 0;

    return totalPaid - totalRefunded;

  }



  async registerDoctor(payload: {

    fullName: string;

    email: string;

    phone: string;

    password: string;

    gender: 'male' | 'female' | 'other';

    dateOfBirth: string;

    qualification: string;

    medicalDegree: string;

    licenseNumber: string;

    experience: number;

    specialization: string;

    consultationFee: number;

    languages: string[];

    clinicName: string;
    bio: string;
    location?: { type: 'Point'; coordinates: [number, number] };
    profilePhoto?: string;
    governmentId?: string;
    medicalLicense?: string;
    clinicAddress?: string;
    serviceRadius?: number;
    consultationModes?: string[];
  }) {

    const existingEmail = await UserModel.findOne({ email: payload.email.toLowerCase() });

    if (existingEmail) {

      throw new ApiError('Email already registered', 409, 'EMAIL_ALREADY_EXISTS');

    }

    const existingPhone = await UserModel.findOne({ phone: payload.phone });

    if (existingPhone) {

      throw new ApiError('Phone already registered', 409, 'PHONE_ALREADY_EXISTS');

    }

    const existingLicense = await DoctorModel.findOne({ licenseNumber: payload.licenseNumber });

    if (existingLicense) {

      throw new ApiError('License number already registered', 409, 'LICENSE_ALREADY_EXISTS');

    }



    const [profilePhotoUrl, governmentIdUrl, medicalLicenseUrl] = await Promise.all([

      uploadOptional(payload.profilePhoto, 'doctor-profiles'),

      uploadOptional(payload.governmentId, 'doctor-documents'),

      uploadOptional(payload.medicalLicense, 'doctor-documents')

    ]);



    const passwordHash = await bcrypt.hash(payload.password, 12);

    const user = await UserModel.create({

      fullName: payload.fullName,

      email: payload.email.toLowerCase(),

      phone: payload.phone,

      passwordHash,

      role: 'doctor',

      isVerified: false,

      isActive: true,

      isDeleted: false,

      verificationStatus: 'pending',

      avatar: profilePhotoUrl

    });



    const modes = payload.consultationModes && payload.consultationModes.length > 0 ? payload.consultationModes : ['clinic'];
    const hasClinic = modes.includes('clinic');
    const hasHome = modes.includes('home');
    const legacyType = (hasClinic && hasHome) ? 'both' : hasHome ? 'home' : 'clinic';

    const doctor = await DoctorModel.create({
      userId: user._id,
      licenseNumber: payload.licenseNumber,
      specialization: payload.specialization,
      qualifications: [payload.qualification],
      medicalDegree: payload.medicalDegree,
      experience: payload.experience,
      bio: payload.bio,
      languages: payload.languages,
      consultationFee: payload.consultationFee,
      gender: payload.gender,
      dateOfBirth: new Date(payload.dateOfBirth),
      clinicName: payload.clinicName,
      clinicAddress: payload.clinicAddress || '',
      serviceRadius: payload.serviceRadius ?? 10,
      consultationType: legacyType,
      consultationModes: modes,
      profilePhotoUrl,

      governmentIdUrl,

      medicalLicenseUrl,

      location: payload.location ?? { type: 'Point', coordinates: [77.5946, 12.9716] },

      availability: { ...defaultAvailability },

      verificationStatus: 'pending',

      averageRating: 0,

      reviewCount: 0

    });



    const tokens = authService.generateTokens(user._id.toString(), 'doctor');

    user.refreshTokenHash = await bcrypt.hash(tokens.refreshToken, 12);

    user.lastLogin = new Date();

    await user.save();

    // Notify all admins of the new doctor registration
    try {
      const admins = await UserModel.find({ role: 'admin', isDeleted: false });
      for (const admin of admins) {
        await notificationService.createNotification({
          userId: admin._id.toString(),
          type: 'new_doctor_registration',
          title: 'New doctor registration pending verification',
          message: `Doctor ${payload.fullName} has registered and is pending verification.`,
          channel: 'in_app'
        });
      }
    } catch (err) {
      console.error('Failed to notify admins of new doctor registration:', err);
    }



    return {

      user: {

        _id: user._id,

        fullName: user.fullName,

        email: user.email,

        role: user.role,

        isVerified: false,

        verificationStatus: 'pending'

      },

      tokens,

      profile: formatProfile(doctor, user)

    };

  }



  async getProfileMe(userId: string): Promise<DoctorProfileResponse> {

    const [doctor, user] = await Promise.all([

      this.findDoctorByUserId(userId),

      UserModel.findById(userId)

    ]);

    if (!user || user.isDeleted || !user.isActive) {

      throw new ApiError('User not found', 404, 'USER_NOT_FOUND');

    }



    return formatProfile(doctor, user);

  }



  async updateProfileMe(

    userId: string,

    payload: Partial<{

      fullName: string;

      email: string;

      phone: string;

      specialization: string;

      qualification: string;

      medicalDegree: string;

      licenseNumber: string;

      experience: number;

      bio: string;

      languages: string[];

      consultationFee: number;

      gender: 'male' | 'female' | 'other';

      dateOfBirth: string;

      clinicName: string;
      location: { type: 'Point'; coordinates: [number, number] };
      profilePhoto: string;
      governmentId: string;
      medicalLicense: string;
      clinicAddress: string;
      serviceRadius: number;
      consultationModes: string[];
    }>

  ): Promise<DoctorProfileResponse> {

    const [doctor, user] = await Promise.all([

      this.findDoctorByUserId(userId),

      UserModel.findById(userId)

    ]);

    if (!user || user.isDeleted || !user.isActive) {

      throw new ApiError('User not found', 404, 'USER_NOT_FOUND');

    }



    if (payload.email && payload.email.toLowerCase() !== user.email) {

      const existing = await UserModel.findOne({ email: payload.email.toLowerCase(), _id: { $ne: user._id } });

      if (existing) throw new ApiError('Email already registered', 409, 'EMAIL_ALREADY_EXISTS');

      user.email = payload.email.toLowerCase();

    }

    if (payload.phone && payload.phone !== user.phone) {

      const existing = await UserModel.findOne({ phone: payload.phone, _id: { $ne: user._id } });

      if (existing) throw new ApiError('Phone already registered', 409, 'PHONE_ALREADY_EXISTS');

      user.phone = payload.phone;

    }

    if (payload.fullName) user.fullName = payload.fullName;



    if (payload.licenseNumber && payload.licenseNumber !== doctor.licenseNumber) {

      const existing = await DoctorModel.findOne({ licenseNumber: payload.licenseNumber, _id: { $ne: doctor._id } });

      if (existing) throw new ApiError('License number already registered', 409, 'LICENSE_ALREADY_EXISTS');

      doctor.licenseNumber = payload.licenseNumber;

    }



    if (payload.specialization) doctor.specialization = payload.specialization;

    if (payload.qualification) doctor.qualifications = [payload.qualification];

    if (payload.medicalDegree) doctor.medicalDegree = payload.medicalDegree;

    if (typeof payload.experience === 'number') doctor.experience = payload.experience;

    if (payload.bio !== undefined) doctor.bio = payload.bio;

    if (payload.languages) doctor.languages = payload.languages;

    if (typeof payload.consultationFee === 'number') doctor.consultationFee = payload.consultationFee;

    if (payload.gender) doctor.gender = payload.gender;

    if (payload.dateOfBirth) doctor.dateOfBirth = new Date(payload.dateOfBirth);

    if (payload.clinicName) doctor.clinicName = payload.clinicName;

    if (payload.location) doctor.location = payload.location;
    if (payload.clinicAddress !== undefined) doctor.clinicAddress = payload.clinicAddress;
    if (typeof payload.serviceRadius === 'number') doctor.serviceRadius = payload.serviceRadius;
    if (payload.consultationModes) {
      doctor.consultationModes = payload.consultationModes;
      const hasClinic = payload.consultationModes.includes('clinic');
      const hasHome = payload.consultationModes.includes('home');
      if (hasClinic && hasHome) {
        doctor.consultationType = 'both';
      } else if (hasHome) {
        doctor.consultationType = 'home';
      } else {
        doctor.consultationType = 'clinic';
      }
    }



    const [profilePhotoUrl, governmentIdUrl, medicalLicenseUrl] = await Promise.all([

      uploadOptional(payload.profilePhoto, 'doctor-profiles'),

      uploadOptional(payload.governmentId, 'doctor-documents'),

      uploadOptional(payload.medicalLicense, 'doctor-documents')

    ]);

    if (profilePhotoUrl) {

      doctor.profilePhotoUrl = profilePhotoUrl;

      user.avatar = profilePhotoUrl;

    }

    if (governmentIdUrl) doctor.governmentIdUrl = governmentIdUrl;

    if (medicalLicenseUrl) doctor.medicalLicenseUrl = medicalLicenseUrl;



    await Promise.all([user.save(), doctor.save()]);

    return formatProfile(doctor, user);

  }



  async getDashboard(userId: string) {

    const profile = await this.getProfileMe(userId);

    const doctor = await this.findDoctorByUserId(userId);

    const doctorObjectId = doctor._id;



    const startOfToday = new Date();

    startOfToday.setHours(0, 0, 0, 0);

    const endOfToday = new Date();

    endOfToday.setHours(23, 59, 59, 999);



    const [todayAppointments, upcomingAppointments, completedAppointments, totalEarnings] = await Promise.all([

      AppointmentModel.countDocuments({

        doctorId: doctorObjectId,

        scheduledAt: { $gte: startOfToday, $lte: endOfToday },

        status: { $nin: ['cancelled_by_patient', 'cancelled_by_doctor', 'rejected', 'auto_rejected'] }

      }),

      AppointmentModel.countDocuments({

        doctorId: doctorObjectId,

        scheduledAt: { $gt: endOfToday },

        status: { $in: ['pending', 'accepted', 'doctor_on_way', 'arrived', 'in_consultation'] }

      }),

      AppointmentModel.find({ doctorId: doctorObjectId, status: 'completed' }).select('patientId').lean(),

      this.calculateTotalEarnings(doctorObjectId)

    ]);



    const uniquePatients = new Set(completedAppointments.map((a: any) => a.patientId.toString())).size;



    return {

      profile,

      stats: {

        todayAppointments,

        upcomingAppointments,

        completedAppointments: completedAppointments.length,

        availabilityStatus: profile.availability.isAvailable && !profile.availability.vacationMode,

        verificationStatus: profile.verificationStatus,

        profileCompletionPercent: profile.profileCompletionPercent,

        totalPatients: uniquePatients,

        averageRating: profile.averageRating,

        reviewCount: profile.reviewCount,

        totalEarnings

      }

    };

  }



  async getAppointments(userId: string, filter?: 'today' | 'upcoming' | 'all') {

    const doctor = await this.findDoctorByUserId(userId);

    const query: mongoose.FilterQuery<typeof AppointmentModel> = { doctorId: doctor._id };



    const startOfToday = new Date();

    startOfToday.setHours(0, 0, 0, 0);

    const endOfToday = new Date();

    endOfToday.setHours(23, 59, 59, 999);



    if (filter === 'today') {

      query.scheduledAt = { $gte: startOfToday, $lte: endOfToday };

    } else if (filter === 'upcoming') {

      query.scheduledAt = { $gt: endOfToday };

    }



    const appointments = await AppointmentModel.find(query).sort({ scheduledAt: 1 }).lean();

    const appointmentIds = appointments.map((a) => a._id);

    const prescriptions = await PrescriptionModel.find({ appointmentId: { $in: appointmentIds } }).lean();

    const prescriptionMap = new Map(prescriptions.map((p) => [p.appointmentId.toString(), p]));

    const patientIds = appointments.map((a) => a.patientId);

    const users = await UserModel.find({ _id: { $in: patientIds } }).select('fullName phone').lean();

    const payments = await PaymentModel.find({ appointmentId: { $in: appointments.map((a) => a._id) } }).lean();

    const userMap = new Map(users.map((u) => [u._id.toString(), u]));

    const paymentMap = new Map(payments.map((payment) => [payment.appointmentId.toString(), payment]));


    const unreadMessages = await ChatMessageModel.find({
      roomId: { $in: appointments.map((a) => `${a._id}:${a.patientId}:${a.doctorId}`) },
      senderRole: 'patient',
      isRead: false
    }).lean();

    const unreadCountMap: Record<string, number> = {};
    unreadMessages.forEach((msg) => {
      unreadCountMap[msg.roomId] = (unreadCountMap[msg.roomId] || 0) + 1;
    });

    const unreadNotifications = await NotificationModel.find({
      userId: new mongoose.Types.ObjectId(userId),
      isRead: false,
      type: { $in: ['accepted', 'rejected', 'doctor_on_way', 'arrived', 'in_consultation', 'completed', 'payment_received', 'appointment_pending'] }
    }).lean();

    const notificationCountMap: Record<string, number> = {};
    unreadNotifications.forEach((n) => {
      const apptId = n.metadata?.appointmentId?.toString();
      if (apptId) {
        notificationCountMap[apptId] = (notificationCountMap[apptId] || 0) + 1;
      }
    });

    const mappedAppointments = appointments.map((appt) => {
      const patient = userMap.get(appt.patientId.toString());
      const payment = paymentMap.get(appt._id.toString());
      const prescription = prescriptionMap.get(appt._id.toString());
      const rId = `${appt._id}:${appt.patientId}:${appt.doctorId}`;
      const apptIdStr = appt._id.toString();

      return {
        _id: appt._id,
        scheduledAt: appt.scheduledAt,
        status: appt.status,
        address: appt.address,
        notes: appt.notes,
        patientName: patient?.fullName ?? 'Patient',
        patientPhone: patient?.phone ?? '',
        paymentStatus: payment?.status ?? 'created',
        paymentStatusLabel: payment?.status === 'paid' ? 'Payment Paid' : 'Payment Pending',
        patientId: appt.patientId.toString(),
        doctorId: appt.doctorId.toString(),
        isEmergency: appt.isEmergency,
        consultationMode: appt.consultationMode,
        unreadMessageCount: (unreadCountMap[rId] || 0) + (notificationCountMap[apptIdStr] || 0),
        prescription: prescription
          ? {
              _id: prescription._id.toString(),
              diagnosis: prescription.diagnosis,
              medications: prescription.medications,
              issuedAt: prescription.issuedAt
            }
          : null
      };
    });

    // Helper categories for sorting priority
    const upcomingStatuses = new Set(['pending', 'accepted', 'doctor_on_way', 'arrived', 'in_consultation']);
    const startOfTodayForSort = new Date();
    startOfTodayForSort.setHours(0, 0, 0, 0);
    const endOfTodayForSort = new Date();
    endOfTodayForSort.setHours(23, 59, 59, 999);

    const getPriority = (appt: any) => {
      const scheduledDate = new Date(appt.scheduledAt);
      const isCompleted = appt.status === 'completed';

      // 1. Upcoming (not completed, and has upcoming status)
      if (!isCompleted && upcomingStatuses.has(appt.status)) {
        return 1;
      }
      // 2. Today's (and not completed)
      if (!isCompleted && scheduledDate >= startOfTodayForSort && scheduledDate <= endOfTodayForSort) {
        return 2;
      }
      // 3. Recent Completed (completed today)
      if (isCompleted && scheduledDate >= startOfTodayForSort && scheduledDate <= endOfTodayForSort) {
        return 3;
      }
      // 4. Older Completed (completed in past days) or cancelled/rejected
      return 4;
    };

    return mappedAppointments.sort((a, b) => {
      const priorityA = getPriority(a);
      const priorityB = getPriority(b);

      if (priorityA !== priorityB) {
        return priorityA - priorityB;
      }

      // Within same category, sort by latest booking date/time first (most recent at top)
      return new Date(b.scheduledAt).getTime() - new Date(a.scheduledAt).getTime();
    });
  }



  async getPrescriptions(userId: string) {

    const doctor = await this.findDoctorByUserId(userId);

    const prescriptions = await PrescriptionModel.find({ doctorId: doctor._id }).sort({ issuedAt: -1 }).lean();

    const patientIds = prescriptions.map((p) => p.patientId);

    const users = await UserModel.find({ _id: { $in: patientIds } }).select('fullName').lean();

    const userMap = new Map(users.map((u) => [u._id.toString(), u]));



    return prescriptions.map((rx) => ({

      ...rx,

      patientName: userMap.get(rx.patientId.toString())?.fullName ?? 'Patient'

    }));

  }



  async getEarnings(userId: string) {

    const doctor = await this.findDoctorByUserId(userId);

    const payments = await PaymentModel.aggregate([

      {

        $lookup: {

          from: 'appointments',

          localField: 'appointmentId',

          foreignField: '_id',

          as: 'appointment'

        }

      },

      { $unwind: '$appointment' },

      {

        $match: {

          'appointment.doctorId': doctor._id,

          status: 'paid',

          $or: [{ refundStatus: { $exists: false } }, { refundStatus: null }]

        }

      },

      { $sort: { paidAt: -1 } },

      {

        $project: {

          amount: 1,

          paidAt: 1,

          appointmentId: 1,

          status: 1,

          refundStatus: 1,

          refundId: 1

        }

      }

    ]);



    const totalEarnings = await this.calculateTotalEarnings(doctor._id);

    return { totalEarnings, payments };

  }



  async updateAvailability(
    userId: string,
    payload: {
      isAvailable?: boolean;
      workingDays?: string[];
      morningSlot?: { start: string; end: string };
      eveningSlot?: { start: string; end: string };
      breakTime?: { start: string; end: string };
      vacationMode?: boolean;
      maxAppointmentsPerDay?: number;
      slotDuration?: number;
      perDaySchedule?: Record<string, any>;
    }
  ) {
    const doctor = await this.findDoctorByUserId(userId);

    if (typeof payload.isAvailable === 'boolean') {
      doctor.availability.isAvailable = payload.isAvailable;
      doctor.availability.lastSeenAt = new Date();
    }
    if (payload.workingDays) doctor.availability.workingDays = payload.workingDays;
    if (payload.morningSlot) doctor.availability.morningSlot = payload.morningSlot;
    if (payload.eveningSlot) doctor.availability.eveningSlot = payload.eveningSlot;
    if (payload.breakTime) doctor.availability.breakTime = payload.breakTime;
    if (typeof payload.vacationMode === 'boolean') doctor.availability.vacationMode = payload.vacationMode;
    if (typeof payload.maxAppointmentsPerDay === 'number') {
      doctor.availability.maxAppointmentsPerDay = payload.maxAppointmentsPerDay;
    }
    if (typeof payload.slotDuration === 'number') {
      doctor.availability.slotDuration = payload.slotDuration;
    }
    if (payload.perDaySchedule) {
      doctor.availability.perDaySchedule = payload.perDaySchedule;
      doctor.markModified('availability.perDaySchedule');
    }

    await doctor.save();

    const user = await UserModel.findById(userId);

    if (!user) throw new ApiError('User not found', 404, 'USER_NOT_FOUND');

    return formatProfile(doctor, user);

  }



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

    const existing = await DoctorModel.findOne({ userId: new mongoose.Types.ObjectId(payload.userId) });

    if (existing) {

      throw new ApiError('Doctor profile already exists', 409, 'PROFILE_ALREADY_EXISTS');

    }

    return this.registerDoctorLegacy(payload);

  }



  private async registerDoctorLegacy(payload: {

    userId: string;

    licenseNumber: string;

    specialization: string;

    qualifications: string[];

    experience: number;

    bio: string;

    languages: string[];

    consultationFee: number;

    location: { type: 'Point'; coordinates: [number, number] };

  }) {

    const existingLicense = await DoctorModel.findOne({ licenseNumber: payload.licenseNumber });

    if (existingLicense) {

      throw new ApiError('License number already registered', 409, 'LICENSE_ALREADY_EXISTS');

    }



    return DoctorModel.create({

      userId: new mongoose.Types.ObjectId(payload.userId),

      licenseNumber: payload.licenseNumber,

      specialization: payload.specialization,

      qualifications: payload.qualifications,

      experience: payload.experience,

      bio: payload.bio,

      languages: payload.languages,

      consultationFee: payload.consultationFee,

      location: payload.location,

      availability: { ...defaultAvailability },

      verificationStatus: 'pending',

      averageRating: 0,

      reviewCount: 0

    });

  }

  async searchNearby(
    lat?: number,
    lng?: number,
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
    // Find Doctors should ONLY display doctors who are available and not on vacation mode
    const match: mongoose.FilterQuery<IDoctorDocument> = {
      verificationStatus: 'approved',
      'availability.isAvailable': true,
      'availability.vacationMode': { $ne: true }
    };

    if (specialization) {
      if (specialization.toLowerCase() === 'other') {
        const commonStems = [
          'general', 'cardio', 'dermat', 'pediatr', 'neurol', 'ortho',
          'ophthal', 'gyneco', 'psych', 'onco', 'gastro', 'endocrin',
          'pulmon', 'nephro', 'ent', 'urol', 'dent', 'surg', 'rheumat', 'immunol'
        ];
        match.specialization = { $nin: commonStems.map(stem => new RegExp(stem, 'i')) };
      } else {
        const stem = getSpecializationStem(specialization);
        match.specialization = { $regex: stem, $options: 'i' };
      }
    }

    if (typeof options.minExperience === 'number' && !Number.isNaN(options.minExperience)) {
      match.experience = { $gte: options.minExperience };
    }

    if (typeof options.maxFee === 'number' && !Number.isNaN(options.maxFee)) {
      match.consultationFee = { $lte: options.maxFee };
    }

    if (options.search) {
      // Find matching users by fullName to support search by doctor name
      const users = await UserModel.find({ fullName: { $regex: options.search, $options: 'i' } }).select('_id');
      const matchedUserIds = users.map((u) => u._id);

      match.$or = [
        { specialization: { $regex: options.search, $options: 'i' } },
        { userId: { $in: matchedUserIds } }
      ];
    }

    let query;
    if (lat !== undefined && lng !== undefined) {
      query = DoctorModel.find({
        ...match,
        location: {
          $nearSphere: {
            $geometry: { type: 'Point', coordinates: [lng, lat] },
            $maxDistance: radiusMeters
          }
        }
      });
    } else {
      query = DoctorModel.find(match);
    }

    query = query.populate('userId', 'fullName avatar').lean();

    if (options.sortBy === 'rating') query.sort({ averageRating: -1, reviewCount: -1 });
    else if (options.sortBy === 'fee') query.sort({ consultationFee: 1, averageRating: -1 });

    const page = typeof options.page === 'number' && options.page > 0 ? options.page : 1;
    const limit = typeof options.limit === 'number' && options.limit > 0 ? options.limit : 9;

    const doctors = await query.skip((page - 1) * limit).limit(limit);



    return doctors.map((doctor) => ({

      ...doctor,

      fullName: (doctor.userId as { fullName?: string } | undefined)?.fullName ?? null

    }));

  }



  async getDoctorById(id: string): Promise<Record<string, unknown>> {

    if (!mongoose.Types.ObjectId.isValid(id)) {

      throw new ApiError('Invalid doctor id', 400, 'INVALID_DOCTOR_ID');

    }



    const doctor = await DoctorModel.findById(id).populate('userId', 'fullName avatar').lean();

    if (!doctor) {

      throw new ApiError('Doctor profile not found', 404, 'DOCTOR_NOT_FOUND');

    }



    return {

      ...doctor,

      fullName: (doctor.userId as { fullName?: string } | undefined)?.fullName ?? null

    };

  }



  async uploadDocument(userId: string, payload: { file: { buffer: Buffer; originalname?: string }; documentType: 'profilePhoto' | 'governmentId' | 'medicalLicense' }): Promise<{ url: string; documentType: string }> {

    const [doctor, user] = await Promise.all([

      this.findDoctorByUserId(userId),

      UserModel.findById(userId)

    ]);

    if (!user || user.isDeleted || !user.isActive) {

      throw new ApiError('User not found', 404, 'USER_NOT_FOUND');

    }



    const folder = payload.documentType === 'profilePhoto' ? 'doctor-profiles' : 'doctor-documents';

    const url = await uploadFile(payload.file, folder);

    if (!url) {

      throw new ApiError('Failed to upload document', 500, 'UPLOAD_FAILED');

    }



    if (payload.documentType === 'profilePhoto') {

      doctor.profilePhotoUrl = url;

      user.avatar = url;

    } else if (payload.documentType === 'governmentId') {

      doctor.governmentIdUrl = url;

    } else if (payload.documentType === 'medicalLicense') {

      doctor.medicalLicenseUrl = url;

    }



    await Promise.all([user.save(), doctor.save()]);



    return { url, documentType: payload.documentType };

  }



  async removeDocument(userId: string, documentType: 'profilePhoto' | 'governmentId' | 'medicalLicense'): Promise<{ success: boolean }> {

    const [doctor, user] = await Promise.all([

      this.findDoctorByUserId(userId),

      UserModel.findById(userId)

    ]);

    if (!user || user.isDeleted || !user.isActive) {

      throw new ApiError('User not found', 404, 'USER_NOT_FOUND');

    }



    if (documentType === 'profilePhoto') {

      doctor.profilePhotoUrl = undefined;

      user.avatar = undefined;

    } else if (documentType === 'governmentId') {

      doctor.governmentIdUrl = undefined;

    } else if (documentType === 'medicalLicense') {

      doctor.medicalLicenseUrl = undefined;

    }



    await Promise.all([user.save(), doctor.save()]);

    return { success: true };

  }

}

function getSpecializationStem(spec: string): string {
  const lower = spec.toLowerCase();
  if (lower.includes('cardio')) return 'cardio';
  if (lower.includes('dermat')) return 'dermat';
  if (lower.includes('general physician') || lower.includes('general medicine')) return 'general';
  if (lower.includes('pediatr')) return 'pediatr';
  if (lower.includes('neurol')) return 'neurol';
  if (lower.includes('ortho')) return 'ortho';
  if (lower.includes('ophthal')) return 'ophthal';
  if (lower.includes('gyneco')) return 'gyneco';
  if (lower.includes('psych')) return 'psych';
  if (lower.includes('onco')) return 'onco';
  if (lower.includes('gastro')) return 'gastro';
  if (lower.includes('endocrin')) return 'endocrin';
  if (lower.includes('pulmon')) return 'pulmon';
  if (lower.includes('nephro')) return 'nephro';
  if (lower.includes('ent')) return 'ent';
  if (lower.includes('urol')) return 'urol';
  if (lower.includes('dent')) return 'dent';
  if (lower.includes('surg')) return 'surg';
  return spec;
}

