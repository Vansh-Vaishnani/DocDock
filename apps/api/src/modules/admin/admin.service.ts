import mongoose from 'mongoose';

import { ApiError } from '../../common/errors/ApiError';
import { UserModel } from '../auth/auth.repository';
import { DoctorModel } from '../doctor/doctor.repository';
import { PatientModel } from '../patient/patient.repository';
import { AppointmentModel } from '../appointment/appointment.repository';
import { PaymentModel } from '../payment/payment.repository';
import { ReviewModel } from '../review/review.repository';

import { AdminModel, AuditLogModel, PlatformSettingsModel } from './admin.repository';

const DEFAULT_SETTINGS = {
  platformCommission: 10,
  maxServiceRadius: 50,
  defaultConsultationFee: 300,
  maintenanceMode: false
};

const startOfToday = (): Date => {
  const d = new Date();
  d.setHours(0, 0, 0, 0);
  return d;
};

const endOfToday = (): Date => {
  const d = new Date();
  d.setHours(23, 59, 59, 999);
  return d;
};

export class AdminService {
  async getDashboardOverview() {
    const todayStart = startOfToday();
    const todayEnd = endOfToday();

    const [
      totalPatients,
      totalDoctors,
      verifiedDoctors,
      pendingDoctorVerifications,
      totalAppointments,
      todaysAppointments,
      completedAppointments,
      cancelledAppointments,
      paidPayments,
      refundedPayments,
      avgRatingResult
    ] = await Promise.all([
      UserModel.countDocuments({ role: 'patient', isDeleted: false }),
      UserModel.countDocuments({ role: 'doctor', isDeleted: false }),
      DoctorModel.countDocuments({ verificationStatus: 'approved' }),
      DoctorModel.countDocuments({ verificationStatus: 'pending' }),
      AppointmentModel.countDocuments(),
      AppointmentModel.countDocuments({ scheduledAt: { $gte: todayStart, $lte: todayEnd } }),
      AppointmentModel.countDocuments({ status: 'completed' }),
      AppointmentModel.countDocuments({
        status: { $in: ['cancelled_by_patient', 'cancelled_by_doctor'] }
      }),
      PaymentModel.aggregate([
        { $match: { status: 'paid' } },
        { $group: { _id: null, total: { $sum: '$amount' } } }
      ]),
      PaymentModel.aggregate([
        { $match: { status: 'refunded' } },
        { $group: { _id: null, total: { $sum: { $ifNull: ['$refundAmount', '$amount'] } }, count: { $sum: 1 } } }
      ]),
      ReviewModel.aggregate([{ $group: { _id: null, avg: { $avg: '$rating' } } }])
    ]);

    const totalRevenue = paidPayments[0]?.total ?? 0;
    const totalRefunds = refundedPayments[0]?.total ?? 0;
    const refundCount = refundedPayments[0]?.count ?? 0;
    const averageRating = avgRatingResult[0]?.avg ? Math.round(avgRatingResult[0].avg * 10) / 10 : 0;

    const appointmentTrend = await AppointmentModel.aggregate([
      {
        $match: {
          createdAt: { $gte: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000) }
        }
      },
      {
        $group: {
          _id: { $dateToString: { format: '%Y-%m-%d', date: '$createdAt' } },
          count: { $sum: 1 }
        }
      },
      { $sort: { _id: 1 } }
    ]);

    const revenueTrend = await PaymentModel.aggregate([
      { $match: { status: 'paid', paidAt: { $exists: true } } },
      {
        $group: {
          _id: { $dateToString: { format: '%Y-%m-%d', date: '$paidAt' } },
          amount: { $sum: '$amount' }
        }
      },
      { $sort: { _id: -1 } },
      { $limit: 7 },
      { $sort: { _id: 1 } }
    ]);

    return {
      totalPatients,
      totalDoctors,
      verifiedDoctors,
      pendingDoctorVerifications,
      totalAppointments,
      todaysAppointments,
      completedAppointments,
      cancelledAppointments,
      totalRevenue,
      totalRefunds,
      refundCount,
      averageRating,
      charts: {
        appointmentsLast7Days: appointmentTrend.map((item) => ({ date: item._id, count: item.count })),
        revenueLast7Days: revenueTrend.map((item) => ({ date: item._id, amount: item.amount }))
      }
    };
  }

  async listDoctorsForVerification(status?: string, page = 1, limit = 20) {
    const filter: Record<string, unknown> = {};
    if (status && status !== 'all') {
      filter.verificationStatus = status;
    } else if (!status) {
      filter.verificationStatus = 'pending';
    }

    const skip = (page - 1) * limit;
    const [doctors, total] = await Promise.all([
      DoctorModel.find(filter).sort({ createdAt: -1 }).skip(skip).limit(limit).lean(),
      DoctorModel.countDocuments(filter)
    ]);

    const userIds = doctors.map((d) => d.userId);
    const users = await UserModel.find({ _id: { $in: userIds } }).lean();
    const userMap = new Map(users.map((u) => [u._id.toString(), u]));

    const items = doctors.map((doctor) => {
      const user = userMap.get(doctor.userId.toString());
      return {
        ...doctor,
        fullName: user?.fullName,
        email: user?.email,
        phone: user?.phone,
        isActive: user?.isActive
      };
    });

    return { items, total, page, limit, totalPages: Math.ceil(total / limit) };
  }

  async getDoctorDetail(doctorId: string) {
    const doctor = await DoctorModel.findById(doctorId).lean();
    if (!doctor) {
      throw new ApiError('Doctor not found', 404, 'DOCTOR_NOT_FOUND');
    }
    const user = await UserModel.findById(doctor.userId).lean();
    if (!user) {
      throw new ApiError('Doctor user not found', 404, 'USER_NOT_FOUND');
    }
    return { doctor, user };
  }

  async verifyDoctor(
    doctorId: string,
    action: 'approve' | 'reject' | 'suspend',
    adminId: string,
    reason?: string
  ) {
    const doctor = await DoctorModel.findById(doctorId);
    if (!doctor) {
      throw new ApiError('Doctor not found', 404, 'DOCTOR_NOT_FOUND');
    }

    const user = await UserModel.findById(doctor.userId);
    if (!user) {
      throw new ApiError('Doctor user not found', 404, 'USER_NOT_FOUND');
    }

    if (action === 'approve') {
      doctor.verificationStatus = 'approved';
      doctor.verificationNote = undefined;
      doctor.verifiedBy = new mongoose.Types.ObjectId(adminId);
      doctor.verifiedAt = new Date();
      user.verificationStatus = 'approved';
      user.isVerified = true;
      user.isActive = true;
    } else if (action === 'reject') {
      if (!reason?.trim()) {
        throw new ApiError('Rejection reason is required', 400, 'VALIDATION_ERROR');
      }
      doctor.verificationStatus = 'rejected';
      doctor.verificationNote = reason.trim();
      doctor.verifiedBy = new mongoose.Types.ObjectId(adminId);
      doctor.verifiedAt = new Date();
      user.verificationStatus = 'rejected';
      user.isVerified = false;
    } else if (action === 'suspend') {
      user.isActive = false;
      doctor.availability.isAvailable = false;
      if (reason?.trim()) {
        doctor.verificationNote = reason.trim();
      }
    }

    await doctor.save();
    await user.save();

    return { doctor: doctor.toObject(), user: { _id: user._id, isActive: user.isActive, verificationStatus: user.verificationStatus } };
  }

  async listUsers(params: {
    role?: 'patient' | 'doctor' | 'admin';
    search?: string;
    status?: 'active' | 'inactive' | 'all';
    page?: number;
    limit?: number;
  }) {
    const page = params.page ?? 1;
    const limit = params.limit ?? 20;
    const filter: Record<string, unknown> = { isDeleted: false };

    if (params.role) {
      filter.role = params.role;
    }
    if (params.status === 'active') {
      filter.isActive = true;
    } else if (params.status === 'inactive') {
      filter.isActive = false;
    }
    if (params.search?.trim()) {
      const regex = new RegExp(params.search.trim(), 'i');
      filter.$or = [{ fullName: regex }, { email: regex }, { phone: regex }];
    }

    const skip = (page - 1) * limit;
    const [users, total] = await Promise.all([
      UserModel.find(filter).sort({ createdAt: -1 }).skip(skip).limit(limit).select('-passwordHash -refreshTokenHash').lean(),
      UserModel.countDocuments(filter)
    ]);

    return { items: users, total, page, limit, totalPages: Math.ceil(total / limit) };
  }

  async getUser(userId: string) {
    const user = await UserModel.findOne({ _id: userId, isDeleted: false }).select('-passwordHash -refreshTokenHash').lean();
    if (!user) {
      throw new ApiError('User not found', 404, 'USER_NOT_FOUND');
    }

    let profile: unknown = null;
    if (user.role === 'doctor') {
      profile = await DoctorModel.findOne({ userId: user._id }).lean();
    } else if (user.role === 'patient') {
      profile = await PatientModel.findOne({ userId: user._id }).lean();
    } else if (user.role === 'admin') {
      profile = await AdminModel.findOne({ userId: user._id }).lean();
    }

    return { user, profile };
  }

  async updateUser(userId: string, updates: { fullName?: string; phone?: string; email?: string }) {
    const user = await UserModel.findOne({ _id: userId, isDeleted: false });
    if (!user) {
      throw new ApiError('User not found', 404, 'USER_NOT_FOUND');
    }

    if (updates.email && updates.email !== user.email) {
      const existing = await UserModel.findOne({ email: updates.email.toLowerCase() });
      if (existing) {
        throw new ApiError('Email already in use', 409, 'EMAIL_ALREADY_EXISTS');
      }
      user.email = updates.email.toLowerCase();
    }
    if (updates.fullName) user.fullName = updates.fullName;
    if (updates.phone) user.phone = updates.phone;

    await user.save();
    return user.toObject();
  }

  async setUserActive(userId: string, active: boolean) {
    const user = await UserModel.findOne({ _id: userId, isDeleted: false });
    if (!user) {
      throw new ApiError('User not found', 404, 'USER_NOT_FOUND');
    }
    if (user.role === 'admin' && !active) {
      const adminCount = await UserModel.countDocuments({ role: 'admin', isDeleted: false, isActive: true });
      if (adminCount <= 1) {
        throw new ApiError('Cannot deactivate the last active admin', 400, 'LAST_ADMIN');
      }
    }
    user.isActive = active;
    await user.save();

    if (user.role === 'doctor') {
      const doctor = await DoctorModel.findOne({ userId: user._id });
      if (doctor) {
        doctor.availability.isAvailable = active && doctor.verificationStatus === 'approved';
        await doctor.save();
      }
    }

    return user.toObject();
  }

  async softDeleteUser(userId: string) {
    const user = await UserModel.findOne({ _id: userId, isDeleted: false });
    if (!user) {
      throw new ApiError('User not found', 404, 'USER_NOT_FOUND');
    }
    if (user.role === 'admin') {
      const adminCount = await UserModel.countDocuments({ role: 'admin', isDeleted: false });
      if (adminCount <= 1) {
        throw new ApiError('Cannot delete the last admin', 400, 'LAST_ADMIN');
      }
    }
    user.isDeleted = true;
    user.isActive = false;
    await user.save();
    return { deleted: true };
  }

  async listAppointments(params: {
    status?: string;
    search?: string;
    date?: string;
    page?: number;
    limit?: number;
  }) {
    const page = params.page ?? 1;
    const limit = params.limit ?? 20;
    const filter: Record<string, unknown> = {};

    if (params.status && params.status !== 'all') {
      if (params.status === 'cancelled') {
        filter.status = { $in: ['cancelled_by_patient', 'cancelled_by_doctor'] };
      } else if (params.status === 'refunded') {
        const refundedPayments = await PaymentModel.find({ status: 'refunded' }).select('appointmentId').lean();
        filter._id = { $in: refundedPayments.map((p) => p.appointmentId) };
      } else {
        filter.status = params.status;
      }
    }

    if (params.date) {
      const dayStart = new Date(params.date);
      dayStart.setHours(0, 0, 0, 0);
      const dayEnd = new Date(params.date);
      dayEnd.setHours(23, 59, 59, 999);
      filter.scheduledAt = { $gte: dayStart, $lte: dayEnd };
    }

    const skip = (page - 1) * limit;
    let appointments = await AppointmentModel.find(filter).sort({ scheduledAt: -1 }).skip(skip).limit(limit).lean();
    const total = await AppointmentModel.countDocuments(filter);

    const patientIds = [...new Set(appointments.map((a) => a.patientId.toString()))];
    const doctorIds = [...new Set(appointments.map((a) => a.doctorId.toString()))];

    const [patients, doctors] = await Promise.all([
      PatientModel.find({ _id: { $in: patientIds } }).lean(),
      DoctorModel.find({ _id: { $in: doctorIds } }).lean()
    ]);

    const patientUserIds = patients.map((p) => p.userId);
    const doctorUserIds = doctors.map((d) => d.userId);
    const users = await UserModel.find({ _id: { $in: [...patientUserIds, ...doctorUserIds] } }).lean();
    const userMap = new Map(users.map((u) => [u._id.toString(), u]));
    const patientMap = new Map(patients.map((p) => [p._id.toString(), p]));
    const doctorMap = new Map(doctors.map((d) => [d._id.toString(), d]));

    let items = appointments.map((appt) => {
      const patient = patientMap.get(appt.patientId.toString());
      const doctor = doctorMap.get(appt.doctorId.toString());
      const patientUser = patient ? userMap.get(patient.userId.toString()) : undefined;
      const doctorUser = doctor ? userMap.get(doctor.userId.toString()) : undefined;
      return {
        ...appt,
        patientName: patientUser?.fullName ?? 'Unknown',
        doctorName: doctorUser?.fullName ?? 'Unknown',
        specialization: doctor?.specialization
      };
    });

    if (params.search?.trim()) {
      const q = params.search.trim().toLowerCase();
      items = items.filter(
        (item) =>
          item.patientName.toLowerCase().includes(q) ||
          item.doctorName.toLowerCase().includes(q) ||
          item.status.toLowerCase().includes(q)
      );
    }

    return { items, total, page, limit, totalPages: Math.ceil(total / limit) };
  }

  async getAppointmentDetail(appointmentId: string) {
    const appointment = await AppointmentModel.findById(appointmentId).lean();
    if (!appointment) {
      throw new ApiError('Appointment not found', 404, 'APPOINTMENT_NOT_FOUND');
    }

    const [patient, doctor, payment] = await Promise.all([
      PatientModel.findById(appointment.patientId).lean(),
      DoctorModel.findById(appointment.doctorId).lean(),
      appointment.paymentId ? PaymentModel.findById(appointment.paymentId).lean() : null
    ]);

    const userIds = [patient?.userId, doctor?.userId].filter(Boolean);
    const users = await UserModel.find({ _id: { $in: userIds } }).lean();
    const userMap = new Map(users.map((u) => [u._id.toString(), u]));

    return {
      appointment,
      patient: patient
        ? { ...patient, fullName: userMap.get(patient.userId.toString())?.fullName, email: userMap.get(patient.userId.toString())?.email }
        : null,
      doctor: doctor
        ? { ...doctor, fullName: userMap.get(doctor.userId.toString())?.fullName, email: userMap.get(doctor.userId.toString())?.email }
        : null,
      payment
    };
  }

  async getPaymentDashboard(period: 'daily' | 'weekly' | 'monthly' = 'daily') {
    const now = new Date();
    let startDate: Date;
    let groupFormat: string;

    if (period === 'weekly') {
      startDate = new Date(now.getTime() - 12 * 7 * 24 * 60 * 60 * 1000);
      groupFormat = '%Y-W%V';
    } else if (period === 'monthly') {
      startDate = new Date(now.getFullYear(), now.getMonth() - 11, 1);
      groupFormat = '%Y-%m';
    } else {
      startDate = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
      groupFormat = '%Y-%m-%d';
    }

    const [revenueAgg, refundAgg, pendingCount, completedCount, latestTransactions, chartData] = await Promise.all([
      PaymentModel.aggregate([{ $match: { status: 'paid' } }, { $group: { _id: null, total: { $sum: '$amount' } } }]),
      PaymentModel.aggregate([
        { $match: { status: 'refunded' } },
        { $group: { _id: null, total: { $sum: { $ifNull: ['$refundAmount', '$amount'] } }, count: { $sum: 1 } } }
      ]),
      PaymentModel.countDocuments({ status: 'created' }),
      PaymentModel.countDocuments({ status: 'paid' }),
      PaymentModel.find().sort({ createdAt: -1 }).limit(10).lean(),
      PaymentModel.aggregate([
        { $match: { status: 'paid', paidAt: { $gte: startDate } } },
        {
          $group: {
            _id: { $dateToString: { format: groupFormat, date: '$paidAt' } },
            revenue: { $sum: '$amount' }
          }
        },
        { $sort: { _id: 1 } }
      ])
    ]);

    const txPatientIds = latestTransactions.map((t) => t.patientId);
    const patients = await PatientModel.find({ _id: { $in: txPatientIds } }).lean();
    const patientUsers = await UserModel.find({ _id: { $in: patients.map((p) => p.userId) } }).lean();
    const patientUserMap = new Map(
      patients.map((p) => {
        const u = patientUsers.find((user) => user._id.toString() === p.userId.toString());
        return [p._id.toString(), u?.fullName ?? 'Unknown'];
      })
    );

    return {
      totalRevenue: revenueAgg[0]?.total ?? 0,
      refundAmount: refundAgg[0]?.total ?? 0,
      refundCount: refundAgg[0]?.count ?? 0,
      pendingPayments: pendingCount,
      completedPayments: completedCount,
      chart: chartData.map((item) => ({ label: item._id, revenue: item.revenue })),
      latestTransactions: latestTransactions.map((tx) => ({
        ...tx,
        patientName: patientUserMap.get(tx.patientId.toString()) ?? 'Unknown'
      }))
    };
  }

  async listReviews(params: { rating?: number; page?: number; limit?: number }) {
    const page = params.page ?? 1;
    const limit = params.limit ?? 20;
    const filter: Record<string, unknown> = { isHidden: false };

    if (params.rating) {
      filter.rating = params.rating;
    }

    const skip = (page - 1) * limit;
    const [reviews, total] = await Promise.all([
      ReviewModel.find(filter).sort({ createdAt: -1 }).skip(skip).limit(limit).lean(),
      ReviewModel.countDocuments(filter)
    ]);

    const doctorIds = [...new Set(reviews.map((r) => r.doctorId.toString()))];
    const patientIds = [...new Set(reviews.map((r) => r.patientId.toString()))];
    const [doctors, patients] = await Promise.all([
      DoctorModel.find({ _id: { $in: doctorIds } }).lean(),
      PatientModel.find({ _id: { $in: patientIds } }).lean()
    ]);
    const userIds = [...doctors.map((d) => d.userId), ...patients.map((p) => p.userId)];
    const users = await UserModel.find({ _id: { $in: userIds } }).lean();
    const userMap = new Map(users.map((u) => [u._id.toString(), u]));
    const doctorMap = new Map(doctors.map((d) => [d._id.toString(), d]));
    const patientMap = new Map(patients.map((p) => [p._id.toString(), p]));

    const items = reviews.map((review) => {
      const doctor = doctorMap.get(review.doctorId.toString());
      const patient = patientMap.get(review.patientId.toString());
      const doctorUser = doctor ? userMap.get(doctor.userId.toString()) : undefined;
      const patientUser = patient ? userMap.get(patient.userId.toString()) : undefined;
      return {
        ...review,
        doctorName: doctorUser?.fullName ?? 'Unknown',
        patientName: patientUser?.fullName ?? 'Unknown'
      };
    });

    return { items, total, page, limit, totalPages: Math.ceil(total / limit) };
  }

  async deleteReview(reviewId: string) {
    const review = await ReviewModel.findById(reviewId);
    if (!review) {
      throw new ApiError('Review not found', 404, 'REVIEW_NOT_FOUND');
    }
    review.isHidden = true;
    await review.save();
    return review.toObject();
  }

  async getAnalytics() {
    const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
    const twelveMonthsAgo = new Date();
    twelveMonthsAgo.setMonth(twelveMonthsAgo.getMonth() - 11);
    twelveMonthsAgo.setDate(1);

    const [
      appointmentsPerDay,
      revenuePerMonth,
      topSpecializations,
      topRatedDoctors,
      newUsersGrowth
    ] = await Promise.all([
      AppointmentModel.aggregate([
        { $match: { createdAt: { $gte: thirtyDaysAgo } } },
        { $group: { _id: { $dateToString: { format: '%Y-%m-%d', date: '$createdAt' } }, count: { $sum: 1 } } },
        { $sort: { _id: 1 } }
      ]),
      PaymentModel.aggregate([
        { $match: { status: 'paid', paidAt: { $gte: twelveMonthsAgo } } },
        { $group: { _id: { $dateToString: { format: '%Y-%m', date: '$paidAt' } }, revenue: { $sum: '$amount' } } },
        { $sort: { _id: 1 } }
      ]),
      DoctorModel.aggregate([
        { $match: { verificationStatus: 'approved' } },
        { $group: { _id: '$specialization', count: { $sum: 1 } } },
        { $sort: { count: -1 } },
        { $limit: 8 }
      ]),
      DoctorModel.find({ verificationStatus: 'approved', reviewCount: { $gt: 0 } })
        .sort({ averageRating: -1, reviewCount: -1 })
        .limit(8)
        .lean(),
      UserModel.aggregate([
        { $match: { createdAt: { $gte: thirtyDaysAgo }, isDeleted: false } },
        { $group: { _id: { $dateToString: { format: '%Y-%m-%d', date: '$createdAt' } }, count: { $sum: 1 } } },
        { $sort: { _id: 1 } }
      ])
    ]);

    const doctorUserIds = topRatedDoctors.map((d) => d.userId);
    const doctorUsers = await UserModel.find({ _id: { $in: doctorUserIds } }).lean();
    const doctorUserMap = new Map(doctorUsers.map((u) => [u._id.toString(), u.fullName]));

    const patients = await PatientModel.find({ 'addresses.0': { $exists: true } }).lean();
    const cityCounts = new Map<string, number>();
    for (const patient of patients) {
      for (const addr of patient.addresses) {
        const label = addr.label.split(',')[0]?.trim() || addr.label;
        cityCounts.set(label, (cityCounts.get(label) ?? 0) + 1);
      }
    }
    const mostActiveCities = [...cityCounts.entries()]
      .sort((a, b) => b[1] - a[1])
      .slice(0, 8)
      .map(([city, count]) => ({ city, count }));

    return {
      appointmentsPerDay: appointmentsPerDay.map((item) => ({ date: item._id, count: item.count })),
      revenuePerMonth: revenuePerMonth.map((item) => ({ month: item._id, revenue: item.revenue })),
      topSpecializations: topSpecializations.map((item) => ({ specialization: item._id, count: item.count })),
      topRatedDoctors: topRatedDoctors.map((d) => ({
        doctorId: d._id,
        name: doctorUserMap.get(d.userId.toString()) ?? 'Unknown',
        specialization: d.specialization,
        averageRating: d.averageRating,
        reviewCount: d.reviewCount
      })),
      mostActiveCities,
      newUsersGrowth: newUsersGrowth.map((item) => ({ date: item._id, count: item.count }))
    };
  }

  async getSettings() {
    let settings = await PlatformSettingsModel.findOne().lean();
    if (!settings) {
      const created = await PlatformSettingsModel.create(DEFAULT_SETTINGS);
      settings = created.toObject();
    }
    return settings;
  }

  async updateSettings(updates: Partial<typeof DEFAULT_SETTINGS>) {
    let settings = await PlatformSettingsModel.findOne();
    if (!settings) {
      settings = await PlatformSettingsModel.create(DEFAULT_SETTINGS);
    }
    if (updates.platformCommission !== undefined) settings.platformCommission = updates.platformCommission;
    if (updates.maxServiceRadius !== undefined) settings.maxServiceRadius = updates.maxServiceRadius;
    if (updates.defaultConsultationFee !== undefined) settings.defaultConsultationFee = updates.defaultConsultationFee;
    if (updates.maintenanceMode !== undefined) settings.maintenanceMode = updates.maintenanceMode;
    await settings.save();
    return settings.toObject();
  }

  async listAuditLogs(page = 1, limit = 30) {
    const skip = (page - 1) * limit;
    const [items, total] = await Promise.all([
      AuditLogModel.find().sort({ createdAt: -1 }).skip(skip).limit(limit).lean(),
      AuditLogModel.countDocuments()
    ]);
    return { items, total, page, limit, totalPages: Math.ceil(total / limit) };
  }
}
