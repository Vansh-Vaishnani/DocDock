import mongoose from 'mongoose';
import bcrypt from 'bcryptjs';

import { config } from '../common/config';
import { UserModel } from '../modules/auth/auth.repository';
import { DoctorModel } from '../modules/doctor/doctor.repository';
import { PatientModel } from '../modules/patient/patient.repository';

const seed = async (): Promise<void> => {
  await mongoose.connect(config.mongoUri, { autoIndex: true });

  await UserModel.deleteMany({});
  await DoctorModel.deleteMany({});
  await PatientModel.deleteMany({});

  const passwordHash = await bcrypt.hash('Admin@123', 12);

  await UserModel.create({
    fullName: 'Admin One',
    email: 'admin@docdock.in',
    phone: '+919000000001',
    passwordHash,
    role: 'admin',
    isVerified: true,
    isActive: true,
    isDeleted: false
  });

  const doctors = await UserModel.create([
    { fullName: 'Dr. Priya Mehta', email: 'doctor1@docdock.in', phone: '+919000000002', passwordHash, role: 'doctor', isVerified: true, isActive: true, isDeleted: false },
    { fullName: 'Dr. Rahul Sharma', email: 'doctor2@docdock.in', phone: '+919000000003', passwordHash, role: 'doctor', isVerified: true, isActive: true, isDeleted: false },
    { fullName: 'Dr. Ananya Rao', email: 'doctor3@docdock.in', phone: '+919000000004', passwordHash, role: 'doctor', isVerified: true, isActive: true, isDeleted: false }
  ]);

  const patients = await UserModel.create([
    { fullName: 'Arjun Sharma', email: 'patient1@docdock.in', phone: '+919000000005', passwordHash, role: 'patient', isVerified: true, isActive: true, isDeleted: false },
    { fullName: 'Meera Singh', email: 'patient2@docdock.in', phone: '+919000000006', passwordHash, role: 'patient', isVerified: true, isActive: true, isDeleted: false },
    { fullName: 'Karan Verma', email: 'patient3@docdock.in', phone: '+919000000007', passwordHash, role: 'patient', isVerified: true, isActive: true, isDeleted: false },
    { fullName: 'Nisha Kapoor', email: 'patient4@docdock.in', phone: '+919000000008', passwordHash, role: 'patient', isVerified: true, isActive: true, isDeleted: false },
    { fullName: 'Vikram Das', email: 'patient5@docdock.in', phone: '+919000000009', passwordHash, role: 'patient', isVerified: true, isActive: true, isDeleted: false }
  ]);

  await DoctorModel.create([
    { userId: doctors[0]._id, licenseNumber: 'LIC-001', specialization: 'General Physician', qualifications: ['MBBS'], experience: 8, bio: 'Experienced physician', languages: ['English', 'Hindi'], consultationFee: 300, location: { type: 'Point', coordinates: [78.4867, 17.3850] }, availability: { isAvailable: true }, verificationStatus: 'approved' },
    { userId: doctors[1]._id, licenseNumber: 'LIC-002', specialization: 'Cardiologist', qualifications: ['MBBS', 'MD'], experience: 12, bio: 'Cardiac specialist', languages: ['English', 'Hindi'], consultationFee: 500, location: { type: 'Point', coordinates: [78.4932, 17.3985] }, availability: { isAvailable: true }, verificationStatus: 'approved' },
    { userId: doctors[2]._id, licenseNumber: 'LIC-003', specialization: 'Dermatologist', qualifications: ['MBBS', 'DDVL'], experience: 10, bio: 'Skin care specialist', languages: ['English', 'Hindi'], consultationFee: 400, location: { type: 'Point', coordinates: [78.4789, 17.4064] }, availability: { isAvailable: true }, verificationStatus: 'approved' }
  ]);

  await PatientModel.create([
    { userId: patients[0]._id, bloodGroup: 'O+', allergies: ['Dust'], medicalHistory: [{ note: 'Mild fever', createdAt: new Date() }], addresses: [{ label: 'Home', location: { type: 'Point', coordinates: [78.4744, 17.4065] }, isDefault: true }] },
    { userId: patients[1]._id, bloodGroup: 'A+', allergies: [], medicalHistory: [], addresses: [{ label: 'Home', location: { type: 'Point', coordinates: [78.4812, 17.3920] }, isDefault: true }] },
    { userId: patients[2]._id, bloodGroup: 'B+', allergies: ['Pollen'], medicalHistory: [], addresses: [{ label: 'Home', location: { type: 'Point', coordinates: [78.4825, 17.4100] }, isDefault: true }] },
    { userId: patients[3]._id, bloodGroup: 'AB+', allergies: [], medicalHistory: [], addresses: [{ label: 'Home', location: { type: 'Point', coordinates: [78.4890, 17.3950] }, isDefault: true }] },
    { userId: patients[4]._id, bloodGroup: 'O-', allergies: ['Penicillin'], medicalHistory: [], addresses: [{ label: 'Home', location: { type: 'Point', coordinates: [78.4940, 17.4020] }, isDefault: true }] }
  ]);

  console.log('Seed completed');
  await mongoose.disconnect();
};

seed().catch((error) => {
  console.error(error);
  process.exit(1);
});
