import mongoose, { Schema, model } from 'mongoose';

export interface IAdminProfileDocument extends mongoose.Document {
  userId: mongoose.Types.ObjectId;
  role: 'admin';
}

export interface IAuditLogDocument extends mongoose.Document {
  adminId: mongoose.Types.ObjectId;
  adminName: string;
  action: string;
  target: string;
  targetId?: string;
  metadata?: Record<string, unknown>;
  ip?: string;
  createdAt: Date;
}

export interface IPlatformSettingsDocument extends mongoose.Document {
  platformCommission: number;
  maxServiceRadius: number;
  defaultConsultationFee: number;
  maintenanceMode: boolean;
}

const adminSchema = new Schema<IAdminProfileDocument>(
  {
    userId: { type: Schema.Types.ObjectId, required: true, ref: 'User', unique: true },
    role: { type: String, default: 'admin' }
  },
  { timestamps: true }
);

const auditLogSchema = new Schema<IAuditLogDocument>(
  {
    adminId: { type: Schema.Types.ObjectId, required: true, ref: 'User' },
    adminName: { type: String, required: true },
    action: { type: String, required: true },
    target: { type: String, required: true },
    targetId: { type: String },
    metadata: { type: Schema.Types.Mixed },
    ip: { type: String }
  },
  { timestamps: true }
);

auditLogSchema.index({ createdAt: -1 });
auditLogSchema.index({ adminId: 1, createdAt: -1 });

const platformSettingsSchema = new Schema<IPlatformSettingsDocument>(
  {
    platformCommission: { type: Number, default: 10, min: 0, max: 100 },
    maxServiceRadius: { type: Number, default: 50, min: 1 },
    defaultConsultationFee: { type: Number, default: 300, min: 0 },
    maintenanceMode: { type: Boolean, default: false }
  },
  { timestamps: true }
);

export const AdminModel = model<IAdminProfileDocument>('Admin', adminSchema);
export const AuditLogModel = model<IAuditLogDocument>('AuditLog', auditLogSchema);
export const PlatformSettingsModel = model<IPlatformSettingsDocument>('PlatformSettings', platformSettingsSchema);
