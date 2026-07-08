import mongoose from 'mongoose';

import { DoctorModel } from '../doctor/doctor.repository';
import { config } from '../../common/config';
import { ApiError } from '../../common/errors/ApiError';
import { NotificationService } from '../notification/notification.service';
import { UserModel } from '../auth/auth.repository';
import { PatientModel } from '../patient/patient.repository';
import { PaymentModel } from '../payment/payment.repository';
import { PaymentService } from '../payment/payment.service';
import { PrescriptionModel } from '../prescription/prescription.repository';
import { ReviewModel } from '../review/review.repository';

import { AppointmentModel, AppointmentStatus, IAppointmentDocument } from './appointment.repository';
import crypto from 'crypto';
import { smsService } from '../../services/sms.service';
import { AppointmentOtpModel } from './otp.model';
import { CallLogModel } from './call.model';
import { voiceService } from '../../services/voice.service';

const notificationService = new NotificationService();
const paymentService = new PaymentService();

function hashOtp(otp: string): string {
  return crypto.createHash('sha256').update(otp).digest('hex');
}

function logOtpEvent(appointmentId: string, event: string, metadata?: any) {
  // eslint-disable-next-line no-console
  console.log(`[OTP EVENT] [${new Date().toISOString()}] Appointment: ${appointmentId} - Event: ${event} - Metadata: ${JSON.stringify(metadata || {})}`);
}

const validTransitions: Record<string, AppointmentStatus[]> = {
  pending: ['accepted', 'rejected', 'auto_rejected', 'cancelled_by_patient'],
  accepted: ['doctor_on_way', 'in_consultation', 'cancelled_by_doctor'],
  doctor_on_way: ['arrived', 'cancelled_by_doctor'],
  arrived: ['in_consultation', 'cancelled_by_doctor'],
  in_consultation: ['completed'],
  completed: [],
  rejected: [],
  auto_rejected: [],
  cancelled_by_patient: [],
  cancelled_by_doctor: [],
  doctor_no_show: []
};

const STATUS_LABELS: Record<AppointmentStatus, string> = {
  pending: 'Pending',
  accepted: 'Accepted',
  rejected: 'Rejected',
  auto_rejected: 'Auto Rejected',
  doctor_on_way: 'On The Way',
  arrived: 'Arrived',
  in_consultation: 'Consultation Started',
  completed: 'Completed',
  cancelled_by_patient: 'Cancelled by Patient',
  cancelled_by_doctor: 'Cancelled by Doctor',
  doctor_no_show: 'Doctor No Show'
};

const DAY_NAMES = ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday'] as const;

const SLOT_INTERVAL_MINUTES = 30;

function parseTimeToMinutes(time: string): number {
  const [hours, minutes] = time.split(':').map(Number);
  return hours * 60 + minutes;
}

function minutesToTime(totalMinutes: number): string {
  const hours = Math.floor(totalMinutes / 60);
  const minutes = totalMinutes % 60;
  return `${String(hours).padStart(2, '0')}:${String(minutes).padStart(2, '0')}`;
}

function generateSlotTimes(start: string, end: string, breakTime?: { start: string; end: string }): string[] {
  const slots: string[] = [];
  const startMinutes = parseTimeToMinutes(start);
  const endMinutes = parseTimeToMinutes(end);
  const breakStart = breakTime ? parseTimeToMinutes(breakTime.start) : null;
  const breakEnd = breakTime ? parseTimeToMinutes(breakTime.end) : null;

  for (let minute = startMinutes; minute + SLOT_INTERVAL_MINUTES <= endMinutes; minute += SLOT_INTERVAL_MINUTES) {
    const slotEnd = minute + SLOT_INTERVAL_MINUTES;
    if (breakStart !== null && breakEnd !== null && minute < breakEnd && slotEnd > breakStart) {
      continue;
    }
    slots.push(minutesToTime(minute));
  }

  return slots;
}

function buildScheduledAt(date: string, time: string): Date {
  return new Date(`${date}T${time}:00`);
}

function assertStatusTiming(appointment: IAppointmentDocument, status: AppointmentStatus): void {
  // Production-only timing validation: doctor may only progress to later steps on/after scheduled time

  const now = new Date();
  const restrictedStatuses = new Set<AppointmentStatus>(['doctor_on_way', 'arrived', 'in_consultation', 'completed']);

  // Only restrict transitions that represent a time-based progression of the consultation.
  if (restrictedStatuses.has(status) && now < appointment.scheduledAt) {
    throw new ApiError('This status change is only allowed on or after the scheduled appointment time.', 400, 'STATUS_TRANSITION_NOT_ALLOWED');
  }
}

async function notifyStatusChange(
  appointment: IAppointmentDocument,
  newStatus: AppointmentStatus,
  patientUserId: string,
  doctorUserId: string
): Promise<void> {
  const label = STATUS_LABELS[newStatus];
  const metadata = { appointmentId: appointment._id.toString(), status: newStatus };

  const patientNotifications: Partial<Record<AppointmentStatus, { title: string; message: string }>> = {
    pending: { title: 'Appointment booked', message: 'Your appointment has been successfully booked.' },
    accepted: { title: 'Appointment accepted', message: 'Your doctor has accepted your appointment request.' },
    rejected: { title: 'Appointment declined', message: 'Your appointment request was declined by the doctor.' },
    doctor_on_way: { title: 'Doctor on the way', message: 'Your doctor is on the way to your location.' },
    arrived: { title: 'Doctor arrived', message: 'Your doctor has arrived at your location.' },
    in_consultation: { title: 'Consultation started', message: 'Your consultation has started.' },
    completed: { title: 'Consultation completed', message: 'Your consultation has been marked as completed.' },
    cancelled_by_doctor: { title: 'Appointment cancelled', message: 'Your appointment was cancelled by the doctor.' }
  };

  const doctorNotifications: Partial<Record<AppointmentStatus, { title: string; message: string }>> = {
    pending: { title: 'New appointment request', message: 'You have a new appointment request.' },
    cancelled_by_patient: { title: 'Appointment cancelled', message: 'A patient cancelled their appointment request.' },
    completed: { title: 'Consultation completed', message: 'An appointment has been marked as completed.' }
  };

  const patientPayload = patientNotifications[newStatus];
  if (patientPayload) {
    await notificationService.createNotification({
      userId: patientUserId,
      type: `appointment_${newStatus}`,
      title: patientPayload.title,
      message: patientPayload.message,
      channel: 'in_app',
      metadata
    });
  }

  const doctorPayload = doctorNotifications[newStatus];
  if (doctorPayload) {
    await notificationService.createNotification({
      userId: doctorUserId,
      type: `appointment_${newStatus}`,
      title: doctorPayload.title,
      message: doctorPayload.message,
      channel: 'in_app',
      metadata
    });
  }

  if (newStatus !== 'pending' && !patientPayload && !doctorPayload) {
    await notificationService.createNotification({
      userId: patientUserId,
      type: `appointment_${newStatus}`,
      title: 'Appointment updated',
      message: `Appointment status changed to ${label}.`,
      channel: 'in_app',
      metadata
    });
  }
}

export class AppointmentService {
  async getAvailableSlots(doctorId: string, date: string): Promise<string[]> {
    if (!mongoose.Types.ObjectId.isValid(doctorId)) {
      throw new ApiError('Invalid doctor id', 400, 'INVALID_DOCTOR_ID');
    }

    const doctor = await DoctorModel.findById(doctorId);
    if (!doctor || doctor.verificationStatus !== 'approved') {
      throw new ApiError('Doctor not available for booking', 404, 'DOCTOR_NOT_AVAILABLE');
    }

    if (doctor.availability.vacationMode || !doctor.availability.isAvailable) {
      return [];
    }

    // Helper to get Date components in IST (UTC+5:30)
    const getISTParts = (d: Date) => {
      const istDate = new Date(d.getTime() + 5.5 * 60 * 60 * 1000);
      return {
        year: istDate.getUTCFullYear(),
        month: istDate.getUTCMonth() + 1,
        date: istDate.getUTCDate(),
        hours: istDate.getUTCHours(),
        minutes: istDate.getUTCMinutes(),
        day: istDate.getUTCDay()
      };
    };

    const parsedDate = new Date(`${date}T00:00:00+05:30`);
    if (Number.isNaN(parsedDate.getTime())) {
      throw new ApiError('Invalid date', 400, 'VALIDATION_ERROR');
    }

    const now = new Date();
    const nowIST = getISTParts(now);
    const todayStr = `${nowIST.year}-${String(nowIST.month).padStart(2, '0')}-${String(nowIST.date).padStart(2, '0')}`;

    if (date === todayStr) {
      // Build 24 hourly slots for the calendar date in IST (00:00 - 23:00)
      const startOfDay = new Date(`${date}T00:00:00+05:30`);
      const slots: Date[] = [];
      for (let h = 0; h < 24; h++) {
        const slot = new Date(startOfDay.getTime() + h * 60 * 60 * 1000);
        slots.push(slot);
      }

      const windowStart = slots[0];
      const windowEnd = new Date(slots[slots.length - 1].getTime() + 60 * 60 * 1000 - 1);

      // Fetch existing appointments in the 24-hour window
      const existing = await AppointmentModel.find({
        doctorId: doctor._id,
        scheduledAt: { $gte: windowStart, $lte: windowEnd },
        status: { $nin: ['cancelled_by_patient', 'cancelled_by_doctor', 'rejected', 'auto_rejected'] }
      })
        .select('scheduledAt')
        .lean();

      const bookedSet = new Set(existing.map((a) => new Date(a.scheduledAt).getTime()));

      // Count bookings per day to respect maxAppointmentsPerDay
      const bookingsPerDay = new Map<string, number>();
      existing.forEach((a) => {
        const dIST = getISTParts(new Date(a.scheduledAt));
        const key = `${dIST.year}-${String(dIST.month).padStart(2, '0')}-${String(dIST.date).padStart(2, '0')}`;
        bookingsPerDay.set(key, (bookingsPerDay.get(key) ?? 0) + 1);
      });

      const result: string[] = [];
      for (const slot of slots) {
        const slotIST = getISTParts(slot);
        // For today: show only slots whose start hour is >= current hour in IST
        if (slotIST.hours < nowIST.hours) continue;

        const dayKey = `${slotIST.year}-${String(slotIST.month).padStart(2, '0')}-${String(slotIST.date).padStart(2, '0')}`;
        const dayName = DAY_NAMES[slotIST.day];
        if (!doctor.availability.workingDays.includes(dayName)) continue;

        // Respect per-day max appointments
        if ((bookingsPerDay.get(dayKey) ?? 0) >= doctor.availability.maxAppointmentsPerDay) continue;

        // Exclude slots that fall within the doctor's break time
        if (doctor.availability.breakTime) {
          const startM = parseTimeToMinutes(doctor.availability.breakTime.start);
          const endM = parseTimeToMinutes(doctor.availability.breakTime.end);
          const slotMinutes = slotIST.hours * 60 + slotIST.minutes;
          if (slotMinutes >= startM && slotMinutes < endM) continue;
        }

        if (bookedSet.has(slot.getTime())) continue;

        result.push(slot.toISOString());
      }

      return result;
    }

    // For any non-today date (tomorrow or future), generate 24 hourly slots for that calendar date
    const parsedDateIST = getISTParts(parsedDate);
    const dayName = DAY_NAMES[parsedDateIST.day];
    if (!doctor.availability.workingDays.includes(dayName)) {
      return [];
    }

    const startOfDay = new Date(`${date}T00:00:00+05:30`);
    const slots: Date[] = [];
    for (let h = 0; h < 24; h++) {
      const slot = new Date(startOfDay.getTime() + h * 60 * 60 * 1000);
      slots.push(slot);
    }

    const windowStart = slots[0];
    const windowEnd = new Date(slots[slots.length - 1].getTime() + 60 * 60 * 1000 - 1);

    const bookedCount = await AppointmentModel.countDocuments({
      doctorId: doctor._id,
      scheduledAt: { $gte: windowStart, $lte: windowEnd },
      status: { $nin: ['cancelled_by_patient', 'cancelled_by_doctor', 'rejected', 'auto_rejected'] }
    });

    if (bookedCount >= doctor.availability.maxAppointmentsPerDay) return [];

    const existing = await AppointmentModel.find({
      doctorId: doctor._id,
      scheduledAt: { $gte: windowStart, $lte: windowEnd },
      status: { $nin: ['cancelled_by_patient', 'cancelled_by_doctor', 'rejected', 'auto_rejected'] }
    })
      .select('scheduledAt')
      .lean();

    const bookedSet = new Set(existing.map((a) => new Date(a.scheduledAt).getTime()));

    const result: string[] = [];
    for (const slot of slots) {
      const slotIST = getISTParts(slot);
      const dayKey = `${slotIST.year}-${String(slotIST.month).padStart(2, '0')}-${String(slotIST.date).padStart(2, '0')}`;
      
      // Respect per-day max appointments
      if ((existing.filter((a) => {
        const dIST = getISTParts(new Date(a.scheduledAt));
        const key = `${dIST.year}-${String(dIST.month).padStart(2, '0')}-${String(dIST.date).padStart(2, '0')}`;
        return key === dayKey;
      }).length) >= doctor.availability.maxAppointmentsPerDay) continue;

      // Exclude slots that fall within the doctor's break time
      if (doctor.availability.breakTime) {
        const startM = parseTimeToMinutes(doctor.availability.breakTime.start);
        const endM = parseTimeToMinutes(doctor.availability.breakTime.end);
        const slotMinutes = slotIST.hours * 60 + slotIST.minutes;
        if (slotMinutes >= startM && slotMinutes < endM) continue;
      }

      if (bookedSet.has(slot.getTime())) continue;
      result.push(slot.toISOString());
    }

    return result;
  }

  async createAppointment(payload: {
    patientId: string;
    doctorId: string;
    scheduledAt: string;
    address?: { label: string; location: { type: 'Point'; coordinates: [number, number] } };
    notes?: string;
    consultationMode?: 'clinic' | 'home' | 'online';
  }): Promise<IAppointmentDocument> {
    const consultationMode = payload.consultationMode || 'clinic';
    let resolvedAddress = payload.address;

    if (!resolvedAddress) {
      if (consultationMode === 'home') {
        throw new ApiError('Appointment address is required for home visits', 400, 'VALIDATION_ERROR');
      }
      resolvedAddress = {
        label: consultationMode === 'online' ? 'Online Consultation' : 'Clinic Consultation',
        location: { type: 'Point' as const, coordinates: [0, 0] as [number, number] }
      };
    } else {
      if (!resolvedAddress.label.trim()) {
        throw new ApiError('Address label is required', 400, 'VALIDATION_ERROR');
      }
    }

    const doctor = await DoctorModel.findById(payload.doctorId);
    if (!doctor || doctor.verificationStatus !== 'approved') {
      throw new ApiError('Doctor not available for booking', 404, 'DOCTOR_NOT_AVAILABLE');
    }

    const scheduledAt = new Date(payload.scheduledAt);
    if (Number.isNaN(scheduledAt.getTime())) {
      throw new ApiError('Invalid scheduled time', 400, 'VALIDATION_ERROR');
    }

    // Allow booking of the currently running slot until its end time.
    const now = new Date();
    const slotEnd = new Date(scheduledAt.getTime() + 60 * 60 * 1000);
    if (now >= slotEnd) {
      throw new ApiError('Scheduled time must be in the future or within the current running slot', 400, 'VALIDATION_ERROR');
    }

    const dateStr = `${scheduledAt.getFullYear()}-${String(scheduledAt.getMonth() + 1).padStart(2, '0')}-${String(scheduledAt.getDate()).padStart(2, '0')}`;
    const availableSlots = await this.getAvailableSlots(payload.doctorId, dateStr);
    const isSlotAvailable = availableSlots.some((slot) => new Date(slot).getTime() === scheduledAt.getTime());

    if (!isSlotAvailable) {
      throw new ApiError('Selected time slot is not available', 400, 'SLOT_NOT_AVAILABLE');
    }

    const appointment = await AppointmentModel.create({
      patientId: new mongoose.Types.ObjectId(payload.patientId),
      doctorId: new mongoose.Types.ObjectId(payload.doctorId),
      scheduledAt,
      address: resolvedAddress,
      status: 'pending',
      notes: payload.notes,
      consultationMode
    });

    await notifyStatusChange(appointment, 'pending', payload.patientId, doctor.userId.toString());
    return appointment;
  }

  async listForPatient(userId: string, filter: 'upcoming' | 'completed' | 'cancelled' | 'history' | 'all' = 'all') {
    const query: mongoose.FilterQuery<typeof AppointmentModel> = {
      patientId: new mongoose.Types.ObjectId(userId)
    };

    const upcomingStatuses: AppointmentStatus[] = ['pending', 'accepted', 'doctor_on_way', 'arrived', 'in_consultation'];
    const completedStatuses: AppointmentStatus[] = ['completed'];
    const cancelledStatuses: AppointmentStatus[] = ['cancelled_by_patient', 'cancelled_by_doctor', 'rejected', 'auto_rejected'];
    const historyStatuses: AppointmentStatus[] = [...completedStatuses, ...cancelledStatuses];

    if (filter === 'upcoming') {
      query.status = { $in: upcomingStatuses };
    } else if (filter === 'completed') {
      query.status = { $in: completedStatuses };
    } else if (filter === 'cancelled') {
      query.status = { $in: cancelledStatuses };
    } else if (filter === 'history') {
      query.status = { $in: historyStatuses };
    }

    const appointments = await AppointmentModel.find(query).sort({ scheduledAt: -1 }).lean();
    const doctorIds = appointments.map((a) => a.doctorId);
    const appointmentIds = appointments.map((a) => a._id);
    const payments = await PaymentModel.find({ appointmentId: { $in: appointmentIds } }).lean();
    const paymentMap = new Map(payments.map((p) => [p.appointmentId.toString(), p]));
    const doctors = await DoctorModel.find({ _id: { $in: doctorIds } }).populate('userId', 'fullName').lean();
    const doctorMap = new Map(
      doctors.map((d) => [
        d._id.toString(),
        {
          doctorName: (d.userId as { fullName?: string } | undefined)?.fullName ?? 'Doctor',
          specialization: d.specialization,
          consultationFee: d.consultationFee
        }
      ])
    );

    return appointments.map((appt) => {
      const doctor = doctorMap.get(appt.doctorId.toString());
      const payment = paymentMap.get(appt._id.toString());
      return {
        _id: appt._id,
        scheduledAt: appt.scheduledAt,
        status: appt.status,
        statusLabel: STATUS_LABELS[appt.status as AppointmentStatus] ?? appt.status,
        address: appt.address,
        notes: appt.notes,
        doctorId: appt.doctorId,
        doctorName: doctor?.doctorName ?? 'Doctor',
        specialization: doctor?.specialization ?? '',
        consultationFee: doctor?.consultationFee ?? 0
        ,
        rejectionReason: (appt as any).rejectionReason ?? null,
        paymentStatus: payment?.status ?? null,
        refundStatus: (payment as any)?.refundStatus ?? null,
        consultationMode: appt.consultationMode
      };
    });
  }

  async getByIdForUser(appointmentId: string, userId: string, role: 'patient' | 'doctor' | 'admin') {
    const appointment = await AppointmentModel.findById(appointmentId).lean();
    if (!appointment) {
      throw new ApiError('Appointment not found', 404, 'APPOINTMENT_NOT_FOUND');
    }

    if (role === 'patient' && appointment.patientId.toString() !== userId) {
      throw new ApiError('You do not have access to this appointment', 403, 'FORBIDDEN');
    }

    if (role === 'doctor') {
      const doctor = await DoctorModel.findOne({ userId: new mongoose.Types.ObjectId(userId) });
      if (!doctor || appointment.doctorId.toString() !== doctor._id.toString()) {
        throw new ApiError('Only the assigned doctor can view this appointment', 403, 'FORBIDDEN');
      }
    }

    const [doctorProfile, patientUser, payment, prescription, review, otpRecord] = await Promise.all([
      DoctorModel.findById(appointment.doctorId).populate('userId', 'fullName email phone avatar').lean(),
      UserModel.findById(appointment.patientId).select('fullName email phone').lean(),
      PaymentModel.findOne({ appointmentId: appointment._id }).lean(),
      PrescriptionModel.findOne({ appointmentId: appointment._id }).lean(),
      ReviewModel.findOne({ appointmentId: appointment._id }).lean(),
      AppointmentOtpModel.findOne({ appointmentId: appointment._id }).lean()
    ]);

    


          if (appointment.status === 'rejected') {
            return {
              appointment: {
                _id: appointment._id.toString(),
                scheduledAt: appointment.scheduledAt,
                status: appointment.status,
                statusLabel: STATUS_LABELS[appointment.status as AppointmentStatus] ?? appointment.status,
                rejectionReason: (appointment as any).rejectionReason ?? null,
                address: appointment.address,
                notes: appointment.notes,
                createdAt: ((appointment as { createdAt?: Date }).createdAt?.toISOString?.() ?? new Date().toISOString()),
                updatedAt: ((appointment as { updatedAt?: Date }).updatedAt?.toISOString?.() ?? new Date().toISOString())
              },
              doctor: {
                _id: doctorProfile?._id?.toString(),
                fullName: (doctorProfile?.userId as { fullName?: string } | undefined)?.fullName ?? 'Doctor',
                specialization: doctorProfile?.specialization,
                consultationFee: doctorProfile?.consultationFee,
                email: (doctorProfile?.userId as { email?: string } | undefined)?.email,
                phone: (doctorProfile?.userId as { phone?: string } | undefined)?.phone,
                profilePhotoUrl: (doctorProfile?.userId as { avatar?: string } | undefined)?.avatar,
                clinicName: doctorProfile?.clinicName,
                clinicAddress: doctorProfile?.clinicAddress,
                clinicLocation: doctorProfile?.location ? { type: doctorProfile.location.type, coordinates: doctorProfile.location.coordinates } : undefined,
                location: doctorProfile?.location ? { type: doctorProfile.location.type, coordinates: doctorProfile.location.coordinates } : undefined
              },
              patient: {
                _id: patientUser?._id?.toString(),
                fullName: patientUser?.fullName ?? 'Patient',
                email: patientUser?.email,
                phone: patientUser?.phone
              },
              payment: payment
                ? {
                    _id: payment._id.toString(),
                    status: payment.status,
                    amount: payment.amount,
                    paidAt: payment.paidAt,
                    razorpayOrderId: payment.razorpayOrderId,
                    razorpayPaymentId: payment.razorpayPaymentId,
                    refundId: (payment as any).refundId ?? null,
                    refundStatus: (payment as any).refundStatus ?? null
                  }
                : null,
              prescription: prescription
                ? {
                    _id: prescription._id.toString(),
                    issuedAt: prescription.issuedAt,
                    diagnosis: prescription.diagnosis,
                    medications: prescription.medications,
                    notes: prescription.advice,
                    prescriptionPdfUrl: prescription.prescriptionPdfUrl
                  }
                : null,
              review: review
                ? {
                    _id: review._id.toString(),
                    rating: review.rating,
                    comment: review.comment,
                    createdAt: review.createdAt
                  }
                : null,
              timeline: {
                currentStatus: 'rejected',
                steps: [
                  { key: 'pending', label: STATUS_LABELS['pending'], completed: true, active: false },
                  { key: 'rejected', label: STATUS_LABELS['rejected'], completed: false, active: true }
                ]
              }
            };
          }

          // Build full response including doctor, patient, payment, prescription, review and timeline
          const paymentObj = payment
            ? {
                _id: payment._id.toString(),
                status: payment.status,
                amount: payment.amount,
                paidAt: payment.paidAt,
                razorpayOrderId: payment.razorpayOrderId,
                razorpayPaymentId: payment.razorpayPaymentId,
                refundId: (payment as any).refundId ?? null,
                refundStatus: (payment as any).refundStatus ?? null
              }
            : null;

          const doctorObj = doctorProfile
            ? {
                _id: doctorProfile._id?.toString(),
                fullName: (doctorProfile.userId as { fullName?: string } | undefined)?.fullName ?? 'Doctor',
                specialization: doctorProfile.specialization,
                consultationFee: doctorProfile.consultationFee,
                email: (doctorProfile.userId as { email?: string } | undefined)?.email,
                phone: (doctorProfile.userId as { phone?: string } | undefined)?.phone,
                profilePhotoUrl: (doctorProfile.userId as { avatar?: string } | undefined)?.avatar,
                clinicName: doctorProfile.clinicName,
                clinicAddress: doctorProfile.clinicAddress,
                clinicLocation: doctorProfile.location ? { type: doctorProfile.location.type, coordinates: doctorProfile.location.coordinates } : undefined,
                location: doctorProfile.location ? { type: doctorProfile.location.type, coordinates: doctorProfile.location.coordinates } : undefined
              }
            : null;

          const patientObj = patientUser
            ? {
                _id: patientUser._id?.toString(),
                fullName: patientUser.fullName ?? 'Patient',
                email: patientUser.email,
                phone: patientUser.phone
              }
            : null;

          // Timeline handling: if cancelled or rejected, show final cancelled/rejected step
          const statusOrder: AppointmentStatus[] = ['pending', 'accepted', 'doctor_on_way', 'arrived', 'in_consultation', 'completed'];
          const statusStr = String(appointment.status);
          if (statusStr === 'rejected') {
            return {
              appointment: {
                _id: appointment._id.toString(),
                scheduledAt: appointment.scheduledAt,
                status: appointment.status,
                statusLabel: STATUS_LABELS[appointment.status as AppointmentStatus] ?? appointment.status,
                rejectionReason: (appointment as any).rejectionReason ?? null,
                address: appointment.address,
                notes: appointment.notes,
                createdAt: ((appointment as { createdAt?: Date }).createdAt?.toISOString?.() ?? new Date().toISOString()),
                updatedAt: ((appointment as { updatedAt?: Date }).updatedAt?.toISOString?.() ?? new Date().toISOString())
              },
              doctor: doctorObj,
              patient: patientObj,
              payment: paymentObj,
              prescription: prescription
                ? {
                    _id: prescription._id.toString(),
                    issuedAt: prescription.issuedAt,
                    diagnosis: prescription.diagnosis,
                    medications: prescription.medications,
                    notes: prescription.advice,
                    prescriptionPdfUrl: prescription.prescriptionPdfUrl
                  }
                : null,
              review: review
                ? {
                    _id: review._id.toString(),
                    rating: review.rating,
                    comment: review.comment,
                    createdAt: review.createdAt
                  }
                : null,
              timeline: {
                currentStatus: 'rejected',
                steps: [
                  { key: 'pending', label: STATUS_LABELS['pending'], completed: true, active: false },
                  { key: 'rejected', label: STATUS_LABELS['rejected'], completed: false, active: true }
                ]
              }
            };
          }

          const cancelledByDoctor = statusStr === 'cancelled_by_doctor';
          const cancelledByPatient = statusStr === 'cancelled_by_patient';
          if (cancelledByDoctor || cancelledByPatient) {
            const cancelLabel = cancelledByDoctor ? STATUS_LABELS['cancelled_by_doctor'] : STATUS_LABELS['cancelled_by_patient'];
            return {
              appointment: {
                _id: appointment._id.toString(),
                scheduledAt: appointment.scheduledAt,
                status: appointment.status,
                statusLabel: cancelLabel,
                cancellationReason: (appointment as any).cancellationReason ?? null,
                address: appointment.address,
                notes: appointment.notes,
                createdAt: ((appointment as { createdAt?: Date }).createdAt?.toISOString?.() ?? new Date().toISOString()),
                updatedAt: ((appointment as { updatedAt?: Date }).updatedAt?.toISOString?.() ?? new Date().toISOString())
              },
              doctor: doctorObj,
              patient: patientObj,
              payment: paymentObj,
              prescription: prescription
                ? {
                    _id: prescription._id.toString(),
                    issuedAt: prescription.issuedAt,
                    diagnosis: prescription.diagnosis,
                    medications: prescription.medications,
                    notes: prescription.advice,
                    prescriptionPdfUrl: prescription.prescriptionPdfUrl
                  }
                : null,
              review: review
                ? {
                    _id: review._id.toString(),
                    rating: review.rating,
                    comment: review.comment,
                    createdAt: review.createdAt
                  }
                : null,
              timeline: {
                currentStatus: appointment.status,
                steps: [
                  { key: 'pending', label: STATUS_LABELS['pending'], completed: true, active: false },
                  { key: appointment.status, label: cancelLabel, completed: false, active: true }
                ]
              }
            };
          }

          // Normal flow
          const mode = (appointment as any).consultationMode || 'clinic';
          let steps: Array<{ key: string; label: string; completed: boolean; active: boolean }> = [];

          if (mode === 'home') {
            const statusOrder: AppointmentStatus[] = ['pending', 'accepted', 'doctor_on_way', 'arrived', 'in_consultation', 'completed'];
            const currentStepIndex = statusOrder.indexOf(appointment.status as AppointmentStatus);
            steps = statusOrder.map((step, index) => ({
              key: step,
              label: STATUS_LABELS[step] ?? step,
              completed: currentStepIndex >= 0 && index <= currentStepIndex,
              active: currentStepIndex >= 0 && index === currentStepIndex
            }));
          } else if (mode === 'clinic') {
            // clinic workflow: Booked -> Accepted -> Appointment Slip Generated -> Consultation Started -> Completed
            const statusOrder: AppointmentStatus[] = ['pending', 'accepted', 'in_consultation', 'completed'];
            const currentStepIndex = statusOrder.indexOf(appointment.status as AppointmentStatus);
            steps = [
              { key: 'pending', label: STATUS_LABELS['pending'], completed: currentStepIndex >= 0, active: appointment.status === 'pending' },
              { key: 'accepted', label: STATUS_LABELS['accepted'], completed: currentStepIndex >= 1, active: appointment.status === 'accepted' },
              { 
                key: 'appointment_slip', 
                label: 'Appointment Slip Generated', 
                completed: currentStepIndex >= 1, 
                active: false 
              },
              { key: 'in_consultation', label: STATUS_LABELS['in_consultation'], completed: currentStepIndex >= 2, active: appointment.status === 'in_consultation' },
              { key: 'completed', label: STATUS_LABELS['completed'], completed: currentStepIndex >= 3, active: appointment.status === 'completed' }
            ];
            if (appointment.status === 'accepted') {
              steps[1].active = true;
            }
          } else {
            // online workflow: Booked -> Accepted -> Waiting for Doctor -> Video Consultation -> Completed
            const statusOrder: AppointmentStatus[] = ['pending', 'accepted', 'in_consultation', 'completed'];
            const currentStepIndex = statusOrder.indexOf(appointment.status as AppointmentStatus);
            steps = [
              { key: 'pending', label: STATUS_LABELS['pending'], completed: currentStepIndex >= 0, active: appointment.status === 'pending' },
              { key: 'accepted', label: STATUS_LABELS['accepted'], completed: currentStepIndex >= 1, active: false },
              { 
                key: 'waiting_for_doctor', 
                label: 'Waiting for Doctor', 
                completed: currentStepIndex >= 2, 
                active: appointment.status === 'accepted' 
              },
              { key: 'in_consultation', label: 'Video Consultation', completed: currentStepIndex >= 2, active: appointment.status === 'in_consultation' },
              { key: 'completed', label: STATUS_LABELS['completed'], completed: currentStepIndex >= 3, active: appointment.status === 'completed' }
            ];
          }

          return {
            appointment: {
              _id: appointment._id.toString(),
              scheduledAt: appointment.scheduledAt,
              status: appointment.status,
              statusLabel: STATUS_LABELS[appointment.status as AppointmentStatus] ?? appointment.status,
              address: appointment.address,
              notes: appointment.notes,
              otpCode: otpRecord?.plainTextOtp || null,
              consultationMode: appointment.consultationMode,
              createdAt: ((appointment as { createdAt?: Date }).createdAt?.toISOString?.() ?? new Date().toISOString()),
              updatedAt: ((appointment as { updatedAt?: Date }).updatedAt?.toISOString?.() ?? new Date().toISOString())
            },
            doctor: doctorObj,
            patient: patientObj,
            payment: paymentObj,
            prescription: prescription
              ? {
                  _id: prescription._id.toString(),
                  issuedAt: prescription.issuedAt,
                  diagnosis: prescription.diagnosis,
                  medications: prescription.medications,
                  notes: prescription.advice,
                  prescriptionPdfUrl: prescription.prescriptionPdfUrl
                }
              : null,
            review: review
              ? {
                  _id: review._id.toString(),
                  rating: review.rating,
                  comment: review.comment,
                  createdAt: review.createdAt
                }
              : null,
            timeline: {
              currentStatus: appointment.status,
              steps
            }
          };
  }

  async confirmAfterPayment(
    appointmentId: string,
    bookingPayload?: {
      doctorId: string;
      appointmentDate: string;
      appointmentTime: string;
      addressId?: string;
      address?: { label: string; location: { type: 'Point'; coordinates: [number, number] } };
      notes?: string;
      consultationMode?: string;
    },
    patientId?: string
  ) {
    let appointment = await AppointmentModel.findById(appointmentId);
    if (!appointment) {
      if (!bookingPayload) {
        throw new ApiError('Appointment not found', 404, 'APPOINTMENT_NOT_FOUND');
      }

      const doctor = await DoctorModel.findById(bookingPayload.doctorId);
      if (!doctor || doctor.verificationStatus !== 'approved') {
        throw new ApiError('Doctor not available for booking', 404, 'DOCTOR_NOT_AVAILABLE');
      }

      const scheduledAt = new Date(`${bookingPayload.appointmentDate}T${bookingPayload.appointmentTime}:00+05:30`);
      if (Number.isNaN(scheduledAt.getTime())) {
        throw new ApiError('Invalid scheduled time', 400, 'VALIDATION_ERROR');
      }
      const now = new Date();
      const slotEnd = new Date(scheduledAt.getTime() + 60 * 60 * 1000);
      if (now >= slotEnd) {
        throw new ApiError('Scheduled time must be in the future or within the current running slot', 400, 'VALIDATION_ERROR');
      }

      if (!bookingPayload.address) {
        throw new ApiError('Appointment address is required', 400, 'VALIDATION_ERROR');
      }

      appointment = await AppointmentModel.create({
        _id: new mongoose.Types.ObjectId(appointmentId),
        patientId: new mongoose.Types.ObjectId(patientId ?? ''),
        doctorId: new mongoose.Types.ObjectId(bookingPayload.doctorId),
        scheduledAt,
        address: bookingPayload.address,
        status: 'pending',
        notes: bookingPayload.notes,
        consultationMode: bookingPayload.consultationMode || 'clinic'
      });
    }

    if (appointment.status !== 'pending') {
      return appointment;
    }

    const payment = await PaymentModel.findOne({ appointmentId: appointment._id });
    if (!payment || payment.status !== 'paid') {
      throw new ApiError('Appointment payment is still pending', 400, 'PAYMENT_REQUIRED');
    }

    appointment.status = 'pending';
    await appointment.save();

    // Trigger Notifications after successful payment confirmation
    try {
      const doctor = await DoctorModel.findById(appointment.doctorId);
      const doctorUserId = doctor?.userId?.toString();

      // 1. Patient: Payment successful
      await notificationService.createNotification({
        userId: appointment.patientId.toString(),
        type: 'payment_successful',
        title: 'Payment successful',
        message: `Your payment of ₹${payment.amount} for your appointment was successful.`,
        channel: 'in_app',
        metadata: { appointmentId: appointment._id.toString(), paymentId: payment._id.toString() }
      });

      // 2. Patient: Appointment booked
      await notificationService.createNotification({
        userId: appointment.patientId.toString(),
        type: 'appointment_booked',
        title: 'Appointment booked',
        message: 'Your appointment has been successfully booked.',
        channel: 'in_app',
        metadata: { appointmentId: appointment._id.toString() }
      });

      if (doctorUserId) {
        // 3. Doctor: Payment received
        await notificationService.createNotification({
          userId: doctorUserId,
          type: 'payment_received',
          title: 'Payment received',
          message: `You received a payment of ₹${payment.amount} for a new appointment.`,
          channel: 'in_app',
          metadata: { appointmentId: appointment._id.toString(), paymentId: payment._id.toString() }
        });

        // 4. Doctor: New appointment request
        await notificationService.createNotification({
          userId: doctorUserId,
          type: 'appointment_pending',
          title: 'New appointment request',
          message: 'You have a new appointment request.',
          channel: 'in_app',
          metadata: { appointmentId: appointment._id.toString() }
        });
      }
    } catch (err) {
      console.error('Failed to dispatch confirmAfterPayment notifications:', err);
    }

    return appointment;
  }

  async updateStatus(
    appointmentId: string,
    status: AppointmentStatus,
    userId: string,
    userRole: 'patient' | 'doctor' | 'admin',
    options?: { reason?: string; otp?: string }
  ) {
    const appointment = await AppointmentModel.findById(appointmentId);
    if (!appointment) {
      throw new ApiError('Appointment not found', 404, 'APPOINTMENT_NOT_FOUND');
    }

    // Role-based access
    if (userRole === 'patient' && appointment.patientId.toString() !== userId) {
      throw new ApiError('You do not have access to this appointment', 403, 'FORBIDDEN');
    }

    if (userRole === 'doctor') {
      const doctor = await DoctorModel.findOne({ userId: new mongoose.Types.ObjectId(userId) });
      if (!doctor || appointment.doctorId.toString() !== doctor._id.toString()) {
        throw new ApiError('Only the assigned doctor can update this appointment', 403, 'FORBIDDEN');
      }
    }

    // Validate transition
    const from = appointment.status as AppointmentStatus;
    const allowed = validTransitions[from] ?? [];
    if (!allowed.includes(status)) {
      throw new ApiError('Invalid status transition', 400, 'INVALID_TRANSITION');
    }

    // Enforce production timing rules
    assertStatusTiming(appointment as IAppointmentDocument, status);

    // Handle rejection with required reason and refund flow
    if (status === 'rejected') {
      const reason = options?.reason;
      if (!reason || reason.trim().length === 0) {
        throw new ApiError('Rejection reason is required', 400, 'VALIDATION_ERROR');
      }

      appointment.status = 'rejected';
      (appointment as any).rejectionReason = reason;
      await appointment.save();

      // If payment was captured, initiate refund
      const payment = await PaymentModel.findOne({ appointmentId: appointment._id });
      if (payment && payment.status === 'paid' && payment.razorpayPaymentId) {
        try {
          const refundResult = await paymentService.initiateRefund(payment.razorpayPaymentId, payment.amount);
          // Notify patient about refund initiation/completion/failure
          const patientUserId = appointment.patientId.toString();
          const doctor = await DoctorModel.findById(appointment.doctorId).lean();
          const doctorUserId = (doctor?.userId as mongoose.Types.ObjectId | undefined)?.toString?.() ?? '';
          const meta = { appointmentId: appointment._id.toString(), refundId: refundResult.refundId ?? null, refundStatus: refundResult.refundStatus };
          await notificationService.createNotification({
            userId: patientUserId,
            type: `appointment_refund_${refundResult.refundStatus}`,
            title: refundResult.refundStatus === 'completed' ? 'Refund completed' : refundResult.refundStatus === 'initiated' ? 'Refund initiated' : 'Refund failed',
            message: refundResult.refundStatus === 'completed' ? 'Your refund has been completed.' : refundResult.refundStatus === 'initiated' ? 'Your refund has been initiated and is being processed.' : 'Your refund failed. Please contact support.',
            channel: 'in_app',
            metadata: meta
          });
          if (doctorUserId) {
            await notificationService.createNotification({
              userId: doctorUserId,
              type: `appointment_refund_${refundResult.refundStatus}`,
              title: 'Refund update',
              message: `Refund ${refundResult.refundStatus} for appointment.`,
              channel: 'in_app',
              metadata: meta
            });
          }
        } catch (e) {
          // initiation errors are recorded inside paymentService; do not block status update
          // eslint-disable-next-line no-console
          console.error('Refund initiation failed', e);
        }
      }
    } else if (status === 'cancelled_by_doctor' || status === 'cancelled_by_patient') {
      const reason = options?.reason;
      // Doctor cancellation requires a reason; patient reason is optional
      if (status === 'cancelled_by_doctor' && (!reason || reason.trim().length === 0)) {
        throw new ApiError('Cancellation reason is required for doctor cancellations', 400, 'VALIDATION_ERROR');
      }

      appointment.status = status;
      (appointment as any).cancellationReason = reason ?? null;
      await appointment.save();

      // If payment was captured, initiate refund
      const payment = await PaymentModel.findOne({ appointmentId: appointment._id });
      if (payment && payment.status === 'paid' && payment.razorpayPaymentId) {
        try {
          const refundResult = await paymentService.initiateRefund(payment.razorpayPaymentId, payment.amount);
          // Notify patient about refund initiation/completion/failure
          const patientUserId = appointment.patientId.toString();
          const doctor = await DoctorModel.findById(appointment.doctorId).lean();
          const doctorUserId = (doctor?.userId as mongoose.Types.ObjectId | undefined)?.toString?.() ?? '';
          const meta = { appointmentId: appointment._id.toString(), refundId: refundResult.refundId ?? null, refundStatus: refundResult.refundStatus };
          await notificationService.createNotification({
            userId: patientUserId,
            type: `appointment_refund_${refundResult.refundStatus}`,
            title: refundResult.refundStatus === 'completed' ? 'Refund completed' : refundResult.refundStatus === 'initiated' ? 'Refund initiated' : 'Refund failed',
            message: refundResult.refundStatus === 'completed' ? 'Your refund has been completed.' : refundResult.refundStatus === 'initiated' ? 'Your refund has been initiated and is being processed.' : 'Your refund failed. Please contact support.',
            channel: 'in_app',
            metadata: meta
          });
          if (doctorUserId) {
            await notificationService.createNotification({
              userId: doctorUserId,
              type: `appointment_refund_${refundResult.refundStatus}`,
              title: 'Refund update',
              message: `Refund ${refundResult.refundStatus} for appointment.`,
              channel: 'in_app',
              metadata: meta
            });
          }
        } catch (e) {
          console.error('Refund initiation failed', e);
        }
      }
    } else if (status === 'doctor_on_way' || status === 'arrived') {
      if (appointment.consultationMode !== 'home') {
        throw new ApiError(`Status transition to '${status}' is only allowed for home visit consultations`, 400, 'INVALID_TRANSITION');
      }
      if (status === 'arrived') {
        appointment.status = 'arrived';
        await appointment.save();

        // Generate, hash and send OTP
        const otp = Math.floor(100000 + Math.random() * 900000).toString();
        const expiresAt = new Date(Date.now() + 10 * 60 * 1000);

        await AppointmentOtpModel.findOneAndUpdate(
          { appointmentId: appointment._id },
          {
            otpHash: hashOtp(otp),
            plainTextOtp: otp, // save plain text for easy testing/showcase
            expiresAt,
            attempts: 0
          },
          { upsert: true, new: true }
        );

        const patientUser = await UserModel.findById(appointment.patientId).select('phone').lean();
        if (patientUser?.phone) {
          await smsService.sendOtpSms(patientUser.phone, otp);
        }
        logOtpEvent(appointment._id.toString(), 'OTP_GENERATED', { expiresAt });
      } else {
        appointment.status = status;
        await appointment.save();
      }
    } else if (status === 'in_consultation') {
      const mode = appointment.consultationMode || 'clinic';
      if (mode === 'home') {
        const otpCode = options?.otp;
        if (!otpCode || otpCode.length !== 6) {
          throw new ApiError('6-digit OTP code is required to start consultation', 400, 'OTP_REQUIRED');
        }

        const record = await AppointmentOtpModel.findOne({ appointmentId: appointment._id });
        if (!record) {
          throw new ApiError('No OTP request found for this appointment. Please resend OTP.', 400, 'OTP_NOT_FOUND');
        }

        if (new Date() > record.expiresAt) {
          throw new ApiError('OTP has expired. Please resend OTP.', 400, 'OTP_EXPIRED');
        }

        if (record.attempts >= 3) {
          throw new ApiError('Maximum verification attempts exceeded. Please request a new OTP.', 400, 'OTP_MAX_ATTEMPTS_EXCEEDED');
        }

        const hashed = hashOtp(otpCode);
        if (record.otpHash !== hashed) {
          record.attempts += 1;
          await record.save();
          logOtpEvent(appointment._id.toString(), 'OTP_VERIFICATION_FAILED', { attempts: record.attempts });
          throw new ApiError(`Invalid OTP. ${3 - record.attempts} attempts remaining.`, 400, 'INVALID_OTP');
        }

        // Success: delete the OTP record
        await AppointmentOtpModel.deleteOne({ appointmentId: appointment._id });
        logOtpEvent(appointment._id.toString(), 'OTP_VERIFICATION_SUCCESS');
      }

      appointment.status = 'in_consultation';
      await appointment.save();
    } else {
      appointment.status = status;
      await appointment.save();
    }

    // Notify participants
    const doctor = await DoctorModel.findById(appointment.doctorId).lean();
    const doctorUserId = (doctor?.userId as mongoose.Types.ObjectId | undefined)?.toString?.() ?? '';
    await notifyStatusChange(appointment as IAppointmentDocument, status, appointment.patientId.toString(), doctorUserId);
    return appointment;
  }

  async resendOtp(appointmentId: string, userId: string, userRole: string) {
    const appointment = await AppointmentModel.findById(appointmentId);
    if (!appointment) {
      throw new ApiError('Appointment not found', 404, 'APPOINTMENT_NOT_FOUND');
    }
    if (appointment.status !== 'arrived') {
      throw new ApiError('OTP can only be resent when the doctor has arrived.', 400, 'INVALID_STATE');
    }
    
    // Check role access
    if (userRole === 'patient' && appointment.patientId.toString() !== userId) {
      throw new ApiError('Forbidden', 403, 'FORBIDDEN');
    }
    if (userRole === 'doctor') {
      const doctor = await DoctorModel.findOne({ userId: new mongoose.Types.ObjectId(userId) });
      if (!doctor || appointment.doctorId.toString() !== doctor._id.toString()) {
        throw new ApiError('Forbidden', 403, 'FORBIDDEN');
      }
    }

    const otp = Math.floor(100000 + Math.random() * 900000).toString();
    const expiresAt = new Date(Date.now() + 10 * 60 * 1000);

    await AppointmentOtpModel.findOneAndUpdate(
      { appointmentId: appointment._id },
      {
        otpHash: hashOtp(otp),
        plainTextOtp: otp,
        expiresAt,
        attempts: 0
      },
      { upsert: true, new: true }
    );

    const patientUser = await UserModel.findById(appointment.patientId).select('phone').lean();
    if (patientUser?.phone) {
      await smsService.sendOtpSms(patientUser.phone, otp);
    }
    logOtpEvent(appointment._id.toString(), 'OTP_RESENT', { expiresAt });
    return { success: true, message: 'OTP resent successfully.' };
  }

  async initiateAnonymousCall(appointmentId: string, callerUserId: string, callerRole: 'patient' | 'doctor') {
    const appointment = await AppointmentModel.findById(appointmentId);
    if (!appointment) {
      throw new ApiError('Appointment not found', 404, 'APPOINTMENT_NOT_FOUND');
    }

    const patientUser = await UserModel.findById(appointment.patientId).select('phone').lean();
    const doctorProfile = await DoctorModel.findById(appointment.doctorId).populate('userId', 'phone').lean();
    
    if (!doctorProfile) {
      throw new ApiError('Doctor profile not found', 404, 'DOCTOR_NOT_FOUND');
    }
    const doctorUser = doctorProfile.userId as { _id: any; phone?: string } | undefined;

    if (!patientUser?.phone || !doctorUser?.phone) {
      throw new ApiError('Phone numbers are missing for call routing', 400, 'PHONE_NUMBERS_MISSING');
    }

    let callerPhone = '';
    let receiverPhone = '';
    let receiverUserId = '';

    if (callerRole === 'doctor') {
      const doctor = await DoctorModel.findOne({ userId: new mongoose.Types.ObjectId(callerUserId) });
      if (!doctor || appointment.doctorId.toString() !== doctor._id.toString()) {
        throw new ApiError('Forbidden', 403, 'FORBIDDEN');
      }
      callerPhone = doctorUser.phone;
      receiverPhone = patientUser.phone;
      receiverUserId = appointment.patientId.toString();
    } else {
      if (appointment.patientId.toString() !== callerUserId) {
        throw new ApiError('Forbidden', 403, 'FORBIDDEN');
      }
      callerPhone = patientUser.phone;
      receiverPhone = doctorUser.phone;
      receiverUserId = doctorUser?._id?.toString() || '';
    }

    // Call bridging via service layer
    const callSid = await voiceService.bridgeCall(callerPhone, receiverPhone, appointmentId);

    // Save call log
    const log = await CallLogModel.create({
      appointmentId: appointment._id,
      callerId: new mongoose.Types.ObjectId(callerUserId),
      receiverId: new mongoose.Types.ObjectId(receiverUserId),
      status: 'calling',
      twilioCallSid: callSid
    });

    return log;
  }

  async getCallHistory(appointmentId: string, userId: string) {
    const appointment = await AppointmentModel.findById(appointmentId);
    if (!appointment) {
      throw new ApiError('Appointment not found', 404, 'APPOINTMENT_NOT_FOUND');
    }
    // Check access
    const isPatient = appointment.patientId.toString() === userId;
    const doctor = await DoctorModel.findOne({ userId: new mongoose.Types.ObjectId(userId) });
    const isDoctor = doctor && appointment.doctorId.toString() !== doctor._id.toString();

    if (!isPatient && !isDoctor) {
      throw new ApiError('Forbidden', 403, 'FORBIDDEN');
    }

    return CallLogModel.find({ appointmentId }).sort({ createdAt: -1 }).lean();
  }

  async updateCallStatus(appointmentId: string, callLogId: string, status: 'connected' | 'ended' | 'missed', duration?: number) {
    const log = await CallLogModel.findOne({ _id: callLogId, appointmentId });
    if (!log) {
      throw new ApiError('Call log not found', 404, 'CALL_LOG_NOT_FOUND');
    }
    log.status = status;
    if (duration !== undefined) {
      log.duration = duration;
    }
    await log.save();
    return log;
  }

  async checkOnlineTimeouts() {
    try {
      const twoHoursAgo = new Date(Date.now() - 120 * 60 * 1000);
      const expiredAppointments = await AppointmentModel.find({
        consultationMode: 'online',
        status: { $in: ['accepted', 'pending'] },
        scheduledAt: { $lt: twoHoursAgo }
      });

      if (expiredAppointments.length === 0) return;

      console.log(`[Timeout Check] Found ${expiredAppointments.length} expired online appointments.`);

      for (const appt of expiredAppointments) {
        appt.status = 'doctor_no_show';
        await appt.save();

        console.log(`[Timeout Check] Cancelled appointment ${appt._id} due to doctor no show.`);

        const payment = await PaymentModel.findOne({ appointmentId: appt._id });
        if (payment && payment.status === 'paid' && payment.razorpayPaymentId) {
          try {
            console.log(`[Timeout Check] Initiating refund for payment ${payment._id} (Razorpay ID: ${payment.razorpayPaymentId})`);
            await paymentService.initiateRefund(payment.razorpayPaymentId, payment.amount);
          } catch (refundErr) {
            console.error(`[Timeout Check] Refund failed for appointment ${appt._id}:`, refundErr);
          }
        }

        try {
          await notificationService.createNotification({
            userId: appt.patientId.toString(),
            type: 'appointment_cancelled',
            title: 'Appointment Cancelled - Doctor No Show',
            message: `Your online video consultation was cancelled as the doctor did not join. A full refund has been initiated.`,
            channel: 'in_app'
          });
        } catch (notifErr) {
          console.error('[Timeout Check] Failed to notify patient:', notifErr);
        }

        try {
          const doctorProfile = await DoctorModel.findById(appt.doctorId).lean();
          if (doctorProfile) {
            await notificationService.createNotification({
              userId: doctorProfile.userId.toString(),
              type: 'appointment_cancelled',
              title: 'Appointment Cancelled - No Show',
              message: `Your online video consultation was cancelled as you did not start the consultation in time.`,
              channel: 'in_app'
            });
          }
        } catch (notifErr) {
          console.error('[Timeout Check] Failed to notify doctor:', notifErr);
        }
      }
    } catch (err) {
      console.error('[Timeout Check] Error checking online timeouts:', err);
    }
  }
}

export { STATUS_LABELS };
