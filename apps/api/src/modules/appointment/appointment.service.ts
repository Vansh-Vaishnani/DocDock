import mongoose from 'mongoose';

import { DoctorModel } from '../doctor/doctor.repository';
import { ApiError } from '../../common/errors/ApiError';
import { NotificationService } from '../notification/notification.service';

import { AppointmentModel, AppointmentStatus, IAppointmentDocument } from './appointment.repository';

const notificationService = new NotificationService();

const validTransitions: Record<string, AppointmentStatus[]> = {
  pending: ['accepted', 'rejected', 'auto_rejected', 'cancelled_by_patient'],
  accepted: ['doctor_on_way', 'cancelled_by_doctor'],
  doctor_on_way: ['arrived', 'cancelled_by_doctor'],
  arrived: ['in_consultation', 'cancelled_by_doctor'],
  in_consultation: ['completed'],
  completed: [],
  rejected: [],
  auto_rejected: [],
  cancelled_by_patient: [],
  cancelled_by_doctor: []
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
  cancelled_by_doctor: 'Cancelled by Doctor'
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

async function notifyStatusChange(
  appointment: IAppointmentDocument,
  newStatus: AppointmentStatus,
  patientUserId: string,
  doctorUserId: string
): Promise<void> {
  const label = STATUS_LABELS[newStatus];
  const metadata = { appointmentId: appointment._id.toString(), status: newStatus };

  const patientNotifications: Partial<Record<AppointmentStatus, { title: string; message: string }>> = {
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

    const parsedDate = new Date(`${date}T00:00:00`);
    if (Number.isNaN(parsedDate.getTime())) {
      throw new ApiError('Invalid date', 400, 'VALIDATION_ERROR');
    }

    const dayName = DAY_NAMES[parsedDate.getDay()];
    if (!doctor.availability.workingDays.includes(dayName)) {
      return [];
    }

    const startOfDay = new Date(`${date}T00:00:00`);
    const endOfDay = new Date(`${date}T23:59:59.999`);

    const bookedCount = await AppointmentModel.countDocuments({
      doctorId: doctor._id,
      scheduledAt: { $gte: startOfDay, $lte: endOfDay },
      status: { $nin: ['cancelled_by_patient', 'cancelled_by_doctor', 'rejected', 'auto_rejected'] }
    });

    if (bookedCount >= doctor.availability.maxAppointmentsPerDay) {
      return [];
    }

    const morningSlots = generateSlotTimes(
      doctor.availability.morningSlot.start,
      doctor.availability.morningSlot.end,
      doctor.availability.breakTime
    );
    const eveningSlots = generateSlotTimes(
      doctor.availability.eveningSlot.start,
      doctor.availability.eveningSlot.end,
      doctor.availability.breakTime
    );

    const allTimes = [...morningSlots, ...eveningSlots];
    const now = new Date();

    const bookedAppointments = await AppointmentModel.find({
      doctorId: doctor._id,
      scheduledAt: { $gte: startOfDay, $lte: endOfDay },
      status: { $nin: ['cancelled_by_patient', 'cancelled_by_doctor', 'rejected', 'auto_rejected'] }
    })
      .select('scheduledAt')
      .lean();

    const bookedTimes = new Set(
      bookedAppointments.map((appt) => {
        const d = new Date(appt.scheduledAt);
        return `${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`;
      })
    );

    return allTimes
      .filter((time) => {
        const slotDate = buildScheduledAt(date, time);
        if (slotDate <= now) return false;
        return !bookedTimes.has(time);
      })
      .map((time) => buildScheduledAt(date, time).toISOString());
  }

  async createAppointment(payload: {
    patientId: string;
    doctorId: string;
    scheduledAt: string;
    address: { label: string; location: { type: 'Point'; coordinates: [number, number] } };
    notes?: string;
  }): Promise<IAppointmentDocument> {
    if (!payload.address.label.trim()) {
      throw new ApiError('Address label is required', 400, 'VALIDATION_ERROR');
    }

    const doctor = await DoctorModel.findById(payload.doctorId);
    if (!doctor || doctor.verificationStatus !== 'approved') {
      throw new ApiError('Doctor not available for booking', 404, 'DOCTOR_NOT_AVAILABLE');
    }

    const scheduledAt = new Date(payload.scheduledAt);
    if (Number.isNaN(scheduledAt.getTime()) || scheduledAt <= new Date()) {
      throw new ApiError('Scheduled time must be in the future', 400, 'VALIDATION_ERROR');
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
      address: payload.address,
      status: 'pending',
      notes: payload.notes
    });

    await notifyStatusChange(appointment, 'pending', payload.patientId, doctor.userId.toString());
    return appointment;
  }

  async listForPatient(userId: string, filter: 'upcoming' | 'history' | 'all' = 'all') {
    const query: mongoose.FilterQuery<typeof AppointmentModel> = {
      patientId: new mongoose.Types.ObjectId(userId)
    };

    const upcomingStatuses: AppointmentStatus[] = ['pending', 'accepted', 'doctor_on_way', 'arrived', 'in_consultation'];
    const historyStatuses: AppointmentStatus[] = [
      'completed',
      'cancelled_by_patient',
      'cancelled_by_doctor',
      'rejected',
      'auto_rejected'
    ];

    if (filter === 'upcoming') {
      query.status = { $in: upcomingStatuses };
    } else if (filter === 'history') {
      query.status = { $in: historyStatuses };
    }

    const appointments = await AppointmentModel.find(query).sort({ scheduledAt: -1 }).lean();
    const doctorIds = appointments.map((a) => a.doctorId);
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
      };
    });
  }

  async updateStatus(
    appointmentId: string,
    status: AppointmentStatus,
    userId: string,
    userRole: 'patient' | 'doctor' | 'admin'
  ): Promise<IAppointmentDocument> {
    const appointment = await AppointmentModel.findById(appointmentId);
    if (!appointment) {
      throw new ApiError('Appointment not found', 404, 'APPOINTMENT_NOT_FOUND');
    }

    const currentTransitions = validTransitions[appointment.status];
    if (!currentTransitions?.includes(status)) {
      throw new ApiError('Invalid appointment status transition', 400, 'INVALID_APPOINTMENT_TRANSITION');
    }

    const doctorActions: AppointmentStatus[] = [
      'accepted',
      'rejected',
      'doctor_on_way',
      'arrived',
      'in_consultation',
      'completed',
      'cancelled_by_doctor'
    ];

    let doctorUserId = '';

    if (doctorActions.includes(status)) {
      const doctor = await DoctorModel.findOne({ userId: new mongoose.Types.ObjectId(userId) });
      if (!doctor || appointment.doctorId.toString() !== doctor._id.toString()) {
        throw new ApiError('Only the assigned doctor can update this status', 403, 'FORBIDDEN');
      }
      doctorUserId = userId;
      if (status === 'accepted' && doctor.verificationStatus !== 'approved') {
        throw new ApiError('Doctor account is not verified', 403, 'DOCTOR_NOT_VERIFIED');
      }
    } else if (status === 'cancelled_by_patient') {
      if (appointment.patientId.toString() !== userId) {
        throw new ApiError('Only the booking patient can cancel', 403, 'FORBIDDEN');
      }
      if (appointment.status !== 'pending') {
        throw new ApiError('Appointments can only be cancelled before acceptance', 400, 'CANCEL_NOT_ALLOWED');
      }
    }

    if (!doctorUserId) {
      const doctor = await DoctorModel.findById(appointment.doctorId);
      doctorUserId = doctor?.userId.toString() ?? '';
    }

    appointment.status = status;
    await appointment.save();

    await notifyStatusChange(appointment, status, appointment.patientId.toString(), doctorUserId);
    return appointment;
  }
}

export { STATUS_LABELS };
