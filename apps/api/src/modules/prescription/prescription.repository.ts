import mongoose, { Schema, model } from 'mongoose';

export interface IMedication {
  name: string;
  dosage: string;
  frequency: string;
  duration: string;
  instructions?: string;
  quantity?: number;
}

export interface IPrescriptionDocument extends mongoose.Document {
  appointmentId: mongoose.Types.ObjectId;
  doctorId: mongoose.Types.ObjectId;
  patientId: mongoose.Types.ObjectId;
  diagnosis: string;
  chiefComplaints: string;
  medications: IMedication[];
  labTests?: string[];
  advice?: string;
  followUpDate?: Date;
  doctorSignature?: string;
  doctorStamp?: string;
  prescriptionPdfUrl?: string;
  issuedAt: Date;
  isValid: boolean;
  createdAt: Date;
  updatedAt: Date;
}

const prescriptionSchema = new Schema<IPrescriptionDocument>(
  {
    appointmentId: { type: Schema.Types.ObjectId, required: true, unique: true, ref: 'Appointment' },
    doctorId: { type: Schema.Types.ObjectId, required: true, ref: 'Doctor' },
    patientId: { type: Schema.Types.ObjectId, required: true, ref: 'Patient' },
    diagnosis: { type: String, required: true, maxlength: 500 },
    chiefComplaints: { type: String, required: true, maxlength: 1000 },
    medications: [
      {
        name: { type: String, required: true, maxlength: 200 },
        dosage: { type: String, required: true },
        frequency: { type: String, required: true },
        duration: { type: String, required: true },
        instructions: { type: String },
        quantity: { type: Number, min: 1 }
      }
    ],
    labTests: [{ type: String }],
    advice: { type: String, maxlength: 2000 },
    followUpDate: { type: Date },
    doctorSignature: { type: String },
    doctorStamp: { type: String },
    prescriptionPdfUrl: { type: String },
    issuedAt: { type: Date, default: Date.now },
    isValid: { type: Boolean, default: true }
  },
  { timestamps: true }
);

prescriptionSchema.index({ patientId: 1, issuedAt: -1 });
prescriptionSchema.index({ doctorId: 1, issuedAt: -1 });
prescriptionSchema.index({ issuedAt: -1 });

export const PrescriptionModel = model<IPrescriptionDocument>('Prescription', prescriptionSchema);
