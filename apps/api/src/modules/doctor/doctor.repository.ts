import mongoose, { Schema, model } from 'mongoose';

export interface ITimeSlot {
  start: string;
  end: string;
}

export interface IDaySchedule {
  enabled: boolean;
  slots: ITimeSlot[];
}

export interface IDoctorAvailability {
  isAvailable: boolean;
  lastSeenAt?: Date;
  workingDays: string[];
  morningSlot: ITimeSlot;
  eveningSlot: ITimeSlot;
  breakTime: ITimeSlot;
  vacationMode: boolean;
  maxAppointmentsPerDay: number;
  slotDuration: number; // minutes: 15, 30, 45, 60, or custom
  perDaySchedule: Record<string, IDaySchedule>;
}

export interface IDoctorDocument extends mongoose.Document {
  userId: mongoose.Types.ObjectId;
  licenseNumber: string;
  specialization: string;
  qualifications: string[];
  medicalDegree?: string;
  experience: number;
  bio: string;
  languages: string[];
  consultationFee: number;
  gender?: 'male' | 'female' | 'other';
  dateOfBirth?: Date;
  clinicName?: string;
  profilePhotoUrl?: string;
  governmentIdUrl?: string;
  medicalLicenseUrl?: string;
  clinicAddress?: string;
  serviceRadius?: number; // in kilometers
  consultationType?: 'home' | 'clinic' | 'both';
  consultationModes?: string[];
  location: { type: 'Point'; coordinates: [number, number] };
  availability: IDoctorAvailability;
  verificationStatus: 'pending' | 'approved' | 'rejected';
  verificationNote?: string;
  verifiedBy?: mongoose.Types.ObjectId;
  verifiedAt?: Date;
  averageRating: number;
  reviewCount: number;
}

const timeSlotSchema = {
  start: { type: String, default: '09:00' },
  end: { type: String, default: '12:00' }
};

const DEFAULT_PER_DAY_SCHEDULE: Record<string, IDaySchedule> = {
  monday: { enabled: true, slots: [{ start: '09:00', end: '17:00' }] },
  tuesday: { enabled: true, slots: [{ start: '09:00', end: '17:00' }] },
  wednesday: { enabled: true, slots: [{ start: '09:00', end: '17:00' }] },
  thursday: { enabled: true, slots: [{ start: '09:00', end: '17:00' }] },
  friday: { enabled: true, slots: [{ start: '09:00', end: '17:00' }] },
  saturday: { enabled: false, slots: [] },
  sunday: { enabled: false, slots: [] }
};

const defaultAvailability: IDoctorAvailability = {
  isAvailable: true,
  workingDays: ['monday', 'tuesday', 'wednesday', 'thursday', 'friday'],
  morningSlot: { start: '09:00', end: '12:00' },
  eveningSlot: { start: '17:00', end: '20:00' },
  breakTime: { start: '13:00', end: '14:00' },
  vacationMode: false,
  maxAppointmentsPerDay: 10,
  slotDuration: 30,
  perDaySchedule: DEFAULT_PER_DAY_SCHEDULE
};

const doctorSchema = new Schema<IDoctorDocument>(
  {
    userId: { type: Schema.Types.ObjectId, required: true, ref: 'User', unique: true },
    licenseNumber: { type: String, required: true, unique: true },
    specialization: { type: String, required: true },
    qualifications: [{ type: String, required: true }],
    medicalDegree: { type: String },
    experience: { type: Number, required: true, min: 0 },
    bio: { type: String, default: '' },
    languages: [{ type: String, default: [] }],
    consultationFee: { type: Number, required: true },
    gender: { type: String, enum: ['male', 'female', 'other'] },
    dateOfBirth: { type: Date },
    clinicName: { type: String },
    profilePhotoUrl: { type: String },
    governmentIdUrl: { type: String },
    medicalLicenseUrl: { type: String },
    clinicAddress: { type: String },
    serviceRadius: { type: Number, default: 10 },
    consultationType: { type: String, enum: ['home', 'clinic', 'both'], default: 'clinic' },
    consultationModes: { type: [String], enum: ['clinic', 'home', 'online'], default: ['clinic'] },
    location: {
      type: {
        type: String,
        enum: ['Point'],
        required: true,
        default: 'Point'
      },
      coordinates: { type: [Number], required: true }
    },
    availability: {
      isAvailable: { type: Boolean, default: true },
      lastSeenAt: { type: Date },
      workingDays: { type: [String], default: defaultAvailability.workingDays },
      morningSlot: { type: timeSlotSchema, default: () => defaultAvailability.morningSlot },
      eveningSlot: { type: timeSlotSchema, default: () => defaultAvailability.eveningSlot },
      breakTime: { type: timeSlotSchema, default: () => defaultAvailability.breakTime },
      vacationMode: { type: Boolean, default: false },
      maxAppointmentsPerDay: { type: Number, default: 10, min: 1 },
      slotDuration: { type: Number, default: 30 },
      perDaySchedule: { type: Schema.Types.Mixed, default: () => DEFAULT_PER_DAY_SCHEDULE }
    },
    verificationStatus: { type: String, enum: ['pending', 'approved', 'rejected'], default: 'pending' },
    verificationNote: { type: String },
    verifiedBy: { type: Schema.Types.ObjectId, ref: 'User' },
    verifiedAt: { type: Date },
    averageRating: { type: Number, default: 0 },
    reviewCount: { type: Number, default: 0 }
  },
  { timestamps: true }
);

doctorSchema.index({ location: '2dsphere' });
doctorSchema.index({ verificationStatus: 1, 'availability.isAvailable': 1 });

export { defaultAvailability };
export const DoctorModel = model<IDoctorDocument>('Doctor', doctorSchema);
