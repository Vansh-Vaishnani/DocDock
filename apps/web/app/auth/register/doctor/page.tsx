'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useEffect, useRef, useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import 'leaflet/dist/leaflet.css';
import MapPicker from '@/components/map/MapPicker';

import { type AuthUser, getRoleHomePath, useAuth } from '../../auth-context';
import { useToast } from '../../toast-provider';
import { fileToBase64, registerDoctor } from '../../../doctor/api';
import { COMMON_SPECIALIZATIONS } from '@/components/doctor-discovery/DoctorFilters';
import { DarkModeToggle } from '../../../theme-context';

const schema = z.object({
  fullName: z.string().min(2, 'Full name is required'),
  email: z.string().email('Enter a valid email address'),
  phone: z.string().min(10, 'Phone must be at least 10 digits'),
  password: z.string().min(8, 'Password must be at least 8 characters'),
  gender: z.enum(['male', 'female', 'other']),
  dateOfBirth: z.string().min(1, 'Birth date is required'),
  qualification: z.string().min(2, 'Qualification is required'),
  medicalDegree: z.string().min(2, 'Medical degree is required'),
  licenseNumber: z.string().min(3, 'License number is required'),
  experience: z.coerce.number().min(0, 'Experience must be a positive number'),
  specialization: z.string().optional(),
  consultationFee: z.coerce.number().min(0, 'Fee must be a positive number'),
  languages: z.string().min(2, 'Languages are required'),
  clinicName: z.string().min(2, 'Clinic name is required'),
  bio: z.string().min(10, 'Bio must be at least 10 characters')
});

type FormValues = z.infer<typeof schema>;

export default function DoctorRegisterPage() {
  const router = useRouter();
  const { handleOAuthCallback } = useAuth();
  const { showToast } = useToast();
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [uploadingDoc, setUploadingDoc] = useState<string | null>(null);
  const [profilePhotoUrl, setProfilePhotoUrl] = useState<string | null>(null);
  const [governmentIdUrl, setGovernmentIdUrl] = useState<string | null>(null);
  const [medicalLicenseUrl, setMedicalLicenseUrl] = useState<string | null>(null);

  const [consultationModes, setConsultationModes] = useState<string[]>(['clinic']);
  const [slotDuration, setSlotDuration] = useState(30);
  const [isAvailable, setIsAvailable] = useState(false);
  const [clinicAddress, setClinicAddress] = useState('');
  const [clinicCoords, setClinicCoords] = useState<[number, number] | null>(null);
  
  const [specSelect, setSpecSelect] = useState('General Physician');
  const [customSpec, setCustomSpec] = useState('');

  const { register, handleSubmit, formState: { errors } } = useForm<FormValues>({ resolver: zodResolver(schema) });

  const SLOT_DURATIONS = [15, 30, 45, 60] as const;

  const onSubmit = async (values: FormValues) => {
    const finalSpecialization = specSelect === 'Other' ? customSpec.trim() : specSelect;
    if (!finalSpecialization) {
      showToast('Specialization is required.', 'error');
      return;
    }
    if (consultationModes.length === 0) {
      showToast('Select at least one consultation mode.', 'error');
      return;
    }
    setError(null);
    setIsSubmitting(true);
    try {
      const payload = {
        ...values,
        specialization: finalSpecialization,
        languages: values.languages.split(',').map((l) => l.trim()).filter(Boolean),
        profilePhoto: profilePhotoUrl || undefined,
        governmentId: governmentIdUrl || undefined,
        medicalLicense: medicalLicenseUrl || undefined,
        consultationModes,
        clinicAddress: clinicAddress || undefined,
        location: clinicCoords ? { type: 'Point', coordinates: [clinicCoords[1], clinicCoords[0]] } : undefined,
        slotDuration,
        availability: { isAvailable, vacationMode: false }
      };
      const response = await registerDoctor(payload);
      handleOAuthCallback({
        user: response.data.user as AuthUser,
        accessToken: response.data.tokens.accessToken,
        refreshToken: response.data.tokens.refreshToken
      });
      showToast('Registration submitted. Your account is pending verification.', 'success');
      router.replace(getRoleHomePath(response.data.user as AuthUser));
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Registration failed.';
      setError(message);
      showToast(message, 'error');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDocumentUpload = async (file: File, documentType: 'profilePhoto' | 'governmentId' | 'medicalLicense') => {
    const allowedMimeTypes = ['application/pdf', 'image/jpeg', 'image/jpg', 'image/png'];
    if (!allowedMimeTypes.includes(file.type)) {
      showToast('Unsupported file format. Only PDF, JPG, JPEG, and PNG are allowed.', 'error');
      return;
    }
    setUploadingDoc(documentType);
    try {
      const base64 = await fileToBase64(file);
      if (documentType === 'profilePhoto') {
        setProfilePhotoUrl(base64);
      } else if (documentType === 'governmentId') {
        setGovernmentIdUrl(base64);
      } else if (documentType === 'medicalLicense') {
        setMedicalLicenseUrl(base64);
      }
      showToast(`${documentType === 'profilePhoto' ? 'Profile photo' : documentType === 'governmentId' ? 'Government ID' : 'Medical license'} uploaded successfully.`, 'success');
    } catch (err: unknown) {
      showToast(err instanceof Error ? err.message : 'Upload failed.', 'error');
    } finally {
      setUploadingDoc(null);
    }
  };

  const handleDocumentRemove = (documentType: 'profilePhoto' | 'governmentId' | 'medicalLicense') => {
    if (documentType === 'profilePhoto') {
      setProfilePhotoUrl(null);
    } else if (documentType === 'governmentId') {
      setGovernmentIdUrl(null);
    } else if (documentType === 'medicalLicense') {
      setMedicalLicenseUrl(null);
    }
  };

  return (
    <div className="min-h-screen flex flex-col" style={{ backgroundColor: 'var(--bg-primary)' }}>
      {/* Top Header */}
      <header className="flex h-14 items-center justify-between px-6 border-b" style={{ borderColor: 'var(--border-color)', backgroundColor: 'var(--header-bg)' }}>
        <Link href="/" className="flex items-center gap-2">
          <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-emerald-600">
            <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <path d="M12 2a10 10 0 1 0 0 20 10 10 0 0 0 0-20z" /><path d="M12 8v4M12 16h.01" />
            </svg>
          </div>
          <span className="font-bold text-sm" style={{ color: 'var(--text-primary)' }}>DocDock</span>
        </Link>
        <div className="flex items-center gap-3">
          <DarkModeToggle />
          <Link href="/auth/login" className="btn-secondary text-sm">Sign in</Link>
        </div>
      </header>

      {/* Main Container */}
      <main className="flex-1 flex items-center justify-center p-6 sm:p-10">
        <div className="w-full max-w-3xl dd-card shadow-large animate-slide-up">
          <div className="mb-6">
            <p className="text-xs font-semibold uppercase tracking-widest text-emerald-600">Doctor Registration</p>
            <h1 className="text-2xl font-bold mt-1.5" style={{ color: 'var(--text-primary)' }}>Join DocDock as a Doctor</h1>
            <p className="text-sm mt-1" style={{ color: 'var(--text-secondary)' }}>Submit your professional credentials for admin verification.</p>
          </div>

          <form className="grid gap-5 md:grid-cols-2" onSubmit={handleSubmit(onSubmit)}>
            {/* Full Name */}
            <div className="md:col-span-2">
              <label className="dd-label">Full Name <span className="text-rose-500">*</span></label>
              <input {...register('fullName')} className="dd-input" placeholder="Dr. Alex Morgan" />
              {errors.fullName && <p className="mt-1 text-xs text-rose-600">{errors.fullName.message}</p>}
            </div>

            {/* Email */}
            <div>
              <label className="dd-label">Email <span className="text-rose-500">*</span></label>
              <input {...register('email')} type="email" className="dd-input" placeholder="doctor@example.com" />
              {errors.email && <p className="mt-1 text-xs text-rose-600">{errors.email.message}</p>}
            </div>

            {/* Phone */}
            <div>
              <label className="dd-label">Phone <span className="text-rose-500">*</span></label>
              <input {...register('phone')} type="tel" className="dd-input" placeholder="+91 98765 43210" />
              {errors.phone && <p className="mt-1 text-xs text-rose-600">{errors.phone.message}</p>}
            </div>

            {/* Password */}
            <div className="md:col-span-2">
              <label className="dd-label">Password <span className="text-rose-500">*</span></label>
              <input type="password" {...register('password')} className="dd-input" placeholder="Min 8 characters" />
              {errors.password && <p className="mt-1 text-xs text-rose-600">{errors.password.message}</p>}
            </div>

            {/* Gender */}
            <div>
              <label className="dd-label">Gender <span className="text-rose-500">*</span></label>
              <select {...register('gender')} className="dd-input">
                <option value="male">Male</option>
                <option value="female">Female</option>
                <option value="other">Other</option>
              </select>
              {errors.gender && <p className="mt-1 text-xs text-rose-600">{errors.gender.message}</p>}
            </div>

            {/* Date of Birth */}
            <div>
              <label className="dd-label">Date of Birth <span className="text-rose-500">*</span></label>
              <input type="date" {...register('dateOfBirth')} className="dd-input" />
              {errors.dateOfBirth && <p className="mt-1 text-xs text-rose-600">{errors.dateOfBirth.message}</p>}
            </div>

            {/* Qualification */}
            <div>
              <label className="dd-label">Qualification <span className="text-rose-500">*</span></label>
              <input {...register('qualification')} className="dd-input" placeholder="MBBS, MD" />
              {errors.qualification && <p className="mt-1 text-xs text-rose-600">{errors.qualification.message}</p>}
            </div>

            {/* Medical Degree */}
            <div>
              <label className="dd-label">Medical Degree <span className="text-rose-500">*</span></label>
              <input {...register('medicalDegree')} className="dd-input" placeholder="Doctor of Medicine" />
              {errors.medicalDegree && <p className="mt-1 text-xs text-rose-600">{errors.medicalDegree.message}</p>}
            </div>

            {/* Medical Council Registration Number */}
            <div className="md:col-span-2">
              <label className="dd-label">Medical Council Registration Number <span className="text-rose-500">*</span></label>
              <input {...register('licenseNumber')} className="dd-input" placeholder="MCI-123456" />
              {errors.licenseNumber && <p className="mt-1 text-xs text-rose-600">{errors.licenseNumber.message}</p>}
            </div>

            {/* Years of Experience */}
            <div>
              <label className="dd-label">Years of Experience <span className="text-rose-500">*</span></label>
              <input type="number" {...register('experience')} className="dd-input" placeholder="e.g. 5" />
              {errors.experience && <p className="mt-1 text-xs text-rose-600">{errors.experience.message}</p>}
            </div>

            {/* Specialization */}
            <div>
              <label className="dd-label">Specialization <span className="text-rose-500">*</span></label>
              <select
                value={specSelect}
                onChange={(e) => setSpecSelect(e.target.value)}
                className="dd-input"
              >
                {COMMON_SPECIALIZATIONS.map((spec) => (
                  <option key={spec} value={spec}>
                    {spec}
                  </option>
                ))}
                <option value="Other">Other</option>
              </select>
              {specSelect === 'Other' && (
                <div className="mt-2">
                  <label className="dd-label">Custom Specialization <span className="text-rose-500">*</span></label>
                  <input
                    value={customSpec}
                    onChange={(e) => setCustomSpec(e.target.value)}
                    className="dd-input"
                    placeholder="Enter your specialization"
                  />
                </div>
              )}
            </div>

            {/* Consultation Fee */}
            <div>
              <label className="dd-label">Consultation Fee (₹) <span className="text-rose-500">*</span></label>
              <input type="number" {...register('consultationFee')} className="dd-input" placeholder="e.g. 500" />
              {errors.consultationFee && <p className="mt-1 text-xs text-rose-600">{errors.consultationFee.message}</p>}
            </div>

            {/* Consultation Modes Checkboxes */}
            <div className="md:col-span-2">
              <label className="dd-label">Available Consultation Modes <span className="text-rose-500">*</span></label>
              <div className="flex flex-wrap gap-3 mt-1.5">
                {[
                  { value: 'clinic', label: 'Clinic Consultation' },
                  { value: 'home', label: 'Home Visit' },
                  { value: 'online', label: 'Online Video Consultation' }
                ].map((mode) => {
                  const checked = consultationModes.includes(mode.value);
                  return (
                    <label key={mode.value} className="flex items-center gap-2 rounded-xl border px-4 py-2.5 text-sm cursor-pointer transition hover:bg-slate-50 dark:hover:bg-slate-800/40" style={{ backgroundColor: 'var(--input-bg)', borderColor: checked ? '#10b981' : 'var(--input-border)', color: 'var(--text-secondary)' }}>
                      <input
                        type="checkbox"
                        checked={checked}
                        onChange={(e) => {
                          if (e.target.checked) {
                            setConsultationModes([...consultationModes, mode.value]);
                          } else {
                            setConsultationModes(consultationModes.filter((m) => m !== mode.value));
                          }
                        }}
                        className="h-4 w-4 rounded border-slate-300 text-emerald-600 accent-emerald-600 focus:ring-emerald-500"
                      />
                      {mode.label}
                    </label>
                  );
                })}
              </div>
            </div>

            {/* Languages */}
            <div>
              <label className="dd-label">Languages (comma-separated) <span className="text-rose-500">*</span></label>
              <input {...register('languages')} className="dd-input" placeholder="English, Hindi" />
              {errors.languages && <p className="mt-1 text-xs text-rose-600">{errors.languages.message}</p>}
            </div>

            {/* Clinic Name */}
            <div className="md:col-span-2">
              <label className="dd-label">Clinic / Hospital Name <span className="text-rose-500">*</span></label>
              <input {...register('clinicName')} className="dd-input" placeholder="Apollo Hospital / Apex Clinic" />
              {errors.clinicName && <p className="mt-1 text-xs text-rose-600">{errors.clinicName.message}</p>}
            </div>

            {/* Clinic Address Text */}
            <div className="md:col-span-2">
              <label className="dd-label">Clinic Address</label>
              <input
                value={clinicAddress}
                onChange={(e) => setClinicAddress(e.target.value)}
                className="dd-input"
                placeholder="123 Main Street, Mumbai, Maharashtra"
              />
            </div>

            {/* Clinic Location Map */}
            <div className="md:col-span-2 space-y-3">
              <label className="dd-label">Clinic Location on Map</label>
              <MapPicker
                value={clinicCoords ? { lat: clinicCoords[0], lng: clinicCoords[1] } : null}
                onChange={(lat: number, lng: number, label?: string) => {
                  setClinicCoords([lat, lng]);
                  if (label) {
                    setClinicAddress(label);
                  }
                }}
                minHeight={300}
                placeholder="Search for clinic address"
              />
              {clinicCoords && (
                <div className="rounded-lg bg-emerald-50 dark:bg-emerald-950/20 border border-emerald-200 dark:border-emerald-900/50 px-3 py-1.5 text-xs font-mono text-emerald-800 dark:text-emerald-400">
                  📍 {clinicCoords[0].toFixed(5)}, {clinicCoords[1].toFixed(5)}
                </div>
              )}
            </div>

            {/* Slot Duration */}
            <div className="md:col-span-2">
              <label className="dd-label">Appointment Slot Duration</label>
              <div className="flex flex-wrap gap-2 mt-1.5">
                {SLOT_DURATIONS.map((d) => (
                  <button
                    key={d}
                    type="button"
                    onClick={() => setSlotDuration(d)}
                    className={`rounded-full px-4 py-2 text-xs font-semibold transition-all ${
                      slotDuration === d
                        ? 'bg-emerald-600 text-white shadow'
                        : 'border border-slate-300 text-slate-700 hover:bg-slate-50 dark:border-slate-700 dark:text-slate-300 dark:hover:bg-slate-800'
                    }`}
                  >
                    {d} min
                  </button>
                ))}
              </div>
            </div>

            {/* Availability Toggle */}
            <div className="md:col-span-2">
              <label className="flex items-center gap-3 cursor-pointer p-4 rounded-xl border transition-all hover:border-emerald-500" style={{ borderColor: 'var(--border-color)' }}>
                <div
                  onClick={() => setIsAvailable(!isAvailable)}
                  className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors cursor-pointer ${isAvailable ? 'bg-emerald-600' : 'bg-slate-300 dark:bg-slate-600'}`}
                >
                  <span className={`inline-block h-4 w-4 transform rounded-full bg-white shadow transition-transform ${isAvailable ? 'translate-x-6' : 'translate-x-1'}`} />
                </div>
                <div>
                  <p className="text-sm font-semibold" style={{ color: 'var(--text-primary)' }}>Accept Appointments After Registration</p>
                  <p className="text-xs" style={{ color: 'var(--text-muted)' }}>You can change this anytime in Availability settings</p>
                </div>
              </label>
            </div>

            {/* Bio */}
            <div className="md:col-span-2">
              <label className="dd-label">Bio <span className="text-rose-500">*</span></label>
              <textarea {...register('bio')} rows={4} className="dd-input resize-none" placeholder="Provide a brief background of yourself..." />
              {errors.bio && <p className="mt-1 text-xs text-rose-600">{errors.bio.message}</p>}
            </div>

            {/* File Uploads */}
            <div className="md:col-span-2 space-y-4 border-t pt-4" style={{ borderColor: 'var(--border-color)' }}>
              <h3 className="text-sm font-bold" style={{ color: 'var(--text-primary)' }}>Documents Upload</h3>

              {/* Profile Photo */}
              <div className="rounded-xl border p-4" style={{ borderColor: 'var(--border-color)', backgroundColor: 'var(--bg-tertiary)' }}>
                <label className="dd-label font-bold">Profile Photo <span className="text-rose-500">*</span></label>
                {profilePhotoUrl ? (
                  <div className="flex items-center gap-4">
                    <img src={profilePhotoUrl} alt="Profile" className="h-16 w-16 rounded-full object-cover border-2 border-emerald-500" />
                    <button type="button" onClick={() => handleDocumentRemove('profilePhoto')} className="btn-secondary text-xs px-3 py-1.5 text-rose-600 border-rose-200">Remove</button>
                  </div>
                ) : (
                  <input type="file" accept="image/*" onChange={(e) => e.target.files?.[0] && void handleDocumentUpload(e.target.files[0], 'profilePhoto')} className="w-full text-xs text-slate-500 file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-xs file:font-semibold file:bg-emerald-50 file:text-emerald-700 hover:file:bg-emerald-100" disabled={uploadingDoc === 'profilePhoto'} />
                )}
                {uploadingDoc === 'profilePhoto' && <p className="text-xs text-emerald-600 mt-1.5">Uploading...</p>}
              </div>

              {/* Government ID */}
              <div className="rounded-xl border p-4" style={{ borderColor: 'var(--border-color)', backgroundColor: 'var(--bg-tertiary)' }}>
                <label className="dd-label font-bold">Government ID <span className="text-rose-500">*</span></label>
                {governmentIdUrl ? (
                  <div className="flex items-center gap-4">
                    <a href={governmentIdUrl} target="_blank" rel="noopener noreferrer" className="text-xs text-emerald-600 dark:text-emerald-400 font-semibold hover:underline">View Document</a>
                    <button type="button" onClick={() => handleDocumentRemove('governmentId')} className="btn-secondary text-xs px-3 py-1.5 text-rose-600 border-rose-200">Remove</button>
                  </div>
                ) : (
                  <input type="file" accept="image/*,application/pdf" onChange={(e) => e.target.files?.[0] && void handleDocumentUpload(e.target.files[0], 'governmentId')} className="w-full text-xs text-slate-500 file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-xs file:font-semibold file:bg-emerald-50 file:text-emerald-700 hover:file:bg-emerald-100" disabled={uploadingDoc === 'governmentId'} />
                )}
                {uploadingDoc === 'governmentId' && <p className="text-xs text-emerald-600 mt-1.5">Uploading...</p>}
              </div>

              {/* Medical Certificate */}
              <div className="rounded-xl border p-4" style={{ borderColor: 'var(--border-color)', backgroundColor: 'var(--bg-tertiary)' }}>
                <label className="dd-label font-bold">Medical Registration Certificate <span className="text-rose-500">*</span></label>
                {medicalLicenseUrl ? (
                  <div className="flex items-center gap-4">
                    <a href={medicalLicenseUrl} target="_blank" rel="noopener noreferrer" className="text-xs text-emerald-600 dark:text-emerald-400 font-semibold hover:underline">View Document</a>
                    <button type="button" onClick={() => handleDocumentRemove('medicalLicense')} className="btn-secondary text-xs px-3 py-1.5 text-rose-600 border-rose-200">Remove</button>
                  </div>
                ) : (
                  <input type="file" accept="image/*,application/pdf" onChange={(e) => e.target.files?.[0] && void handleDocumentUpload(e.target.files[0], 'medicalLicense')} className="w-full text-xs text-slate-500 file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-xs file:font-semibold file:bg-emerald-50 file:text-emerald-700 hover:file:bg-emerald-100" disabled={uploadingDoc === 'medicalLicense'} />
                )}
                {uploadingDoc === 'medicalLicense' && <p className="text-xs text-emerald-600 mt-1.5">Uploading...</p>}
              </div>
            </div>

            {error && <p className="md:col-span-2 rounded-xl border border-rose-200 bg-rose-50 dark:bg-rose-950/30 dark:border-rose-900 px-4 py-3 text-xs text-rose-700 dark:text-rose-400">{error}</p>}

            <button type="submit" disabled={isSubmitting} className="md:col-span-2 btn-primary py-3 text-sm rounded-xl">
              {isSubmitting ? (
                <span className="flex items-center justify-center gap-2">
                  <svg className="h-4 w-4 animate-spin" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                  </svg>
                  Submitting Registration…
                </span>
              ) : 'Register as Doctor'}
            </button>
          </form>

          <p className="mt-6 text-center text-sm" style={{ color: 'var(--text-muted)' }}>
            Register as a patient instead?{' '}
            <Link href="/auth/register" className="font-semibold text-emerald-600 hover:text-emerald-700 transition-colors">
              Patient registration
            </Link>
          </p>
        </div>
      </main>
    </div>
  );
}
