'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';

import { type AuthUser, getRoleHomePath, useAuth } from '../../auth-context';
import { useToast } from '../../toast-provider';
import { fileToBase64, registerDoctor } from '../../../doctor/api';

const schema = z.object({
  fullName: z.string().min(2),
  email: z.string().email(),
  phone: z.string().min(10),
  password: z.string().min(8),
  gender: z.enum(['male', 'female', 'other']),
  dateOfBirth: z.string().min(1),
  qualification: z.string().min(2),
  medicalDegree: z.string().min(2),
  licenseNumber: z.string().min(3),
  experience: z.coerce.number().min(0),
  specialization: z.string().min(2),
  consultationFee: z.coerce.number().min(0),
  languages: z.string().min(2),
  clinicName: z.string().min(2),
  bio: z.string().min(10)
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

  const { register, handleSubmit, formState: { errors } } = useForm<FormValues>({ resolver: zodResolver(schema) });

  const onSubmit = async (values: FormValues) => {
    setError(null);
    setIsSubmitting(true);
    try {
      const payload = {
        ...values,
        languages: values.languages.split(',').map((l) => l.trim()).filter(Boolean),
        profilePhoto: profilePhotoUrl || undefined,
        governmentId: governmentIdUrl || undefined,
        medicalLicense: medicalLicenseUrl || undefined
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
    <main className="min-h-screen bg-[radial-gradient(circle_at_top,_#f8fafc,_#eef2ff_55%,_#f8fafc)] px-4 py-10">
      <div className="mx-auto max-w-3xl rounded-[32px] border border-slate-200 bg-white p-8 shadow-lg">
        <p className="text-sm font-semibold uppercase tracking-[0.35em] text-emerald-600">Doctor registration</p>
        <h1 className="mt-3 text-3xl font-semibold">Join DocDock as a doctor</h1>
        <p className="mt-2 text-slate-600">Submit your professional credentials for admin verification.</p>

        <form className="mt-8 grid gap-4 md:grid-cols-2" onSubmit={handleSubmit(onSubmit)}>
          <div className="md:col-span-2"><input {...register('fullName')} placeholder="Full name" className="w-full rounded-2xl border border-slate-300 px-4 py-3" /></div>
          <input {...register('email')} placeholder="Email" className="rounded-2xl border border-slate-300 px-4 py-3" />
          <input {...register('phone')} placeholder="Phone" className="rounded-2xl border border-slate-300 px-4 py-3" />
          <input type="password" {...register('password')} placeholder="Password" className="md:col-span-2 rounded-2xl border border-slate-300 px-4 py-3" />
          <select {...register('gender')} className="rounded-2xl border border-slate-300 px-4 py-3"><option value="male">Male</option><option value="female">Female</option><option value="other">Other</option></select>
          <div>
            <label className="mb-1 block text-sm font-medium text-slate-700">Birth Date</label>
            <input type="date" {...register('dateOfBirth')} className="w-full rounded-2xl border border-slate-300 px-4 py-3" />
          </div>
          <input {...register('qualification')} placeholder="Qualification" className="rounded-2xl border border-slate-300 px-4 py-3" />
          <input {...register('medicalDegree')} placeholder="Medical degree" className="rounded-2xl border border-slate-300 px-4 py-3" />
          <input {...register('licenseNumber')} placeholder="Medical council registration number" className="md:col-span-2 rounded-2xl border border-slate-300 px-4 py-3" />
          <input type="number" {...register('experience')} placeholder="Years of experience" className="rounded-2xl border border-slate-300 px-4 py-3" />
          <input {...register('specialization')} placeholder="Specialization" className="rounded-2xl border border-slate-300 px-4 py-3" />
          <input type="number" {...register('consultationFee')} placeholder="Consultation fee (₹)" className="rounded-2xl border border-slate-300 px-4 py-3" />
          <input {...register('languages')} placeholder="Languages (comma-separated)" className="rounded-2xl border border-slate-300 px-4 py-3" />
          <input {...register('clinicName')} placeholder="Clinic / hospital name" className="md:col-span-2 rounded-2xl border border-slate-300 px-4 py-3" />
          <textarea {...register('bio')} placeholder="About doctor" rows={4} className="md:col-span-2 rounded-2xl border border-slate-300 px-4 py-3" />
          <div className="md:col-span-2 space-y-4">
            <div>
              <label className="mb-2 block text-sm font-medium">Profile photo</label>
              {profilePhotoUrl ? (
                <div className="flex items-center gap-4">
                  <img src={profilePhotoUrl} alt="Profile" className="h-20 w-20 rounded-full object-cover" />
                  <div className="flex gap-2">
                    <input type="file" accept="image/*" onChange={(e) => e.target.files?.[0] && void handleDocumentUpload(e.target.files[0], 'profilePhoto')} className="text-sm" disabled={uploadingDoc === 'profilePhoto'} />
                    <button type="button" onClick={() => handleDocumentRemove('profilePhoto')} disabled={uploadingDoc === 'profilePhoto'} className="rounded-full border border-rose-300 px-3 py-1 text-sm text-rose-600 hover:bg-rose-50 disabled:opacity-50">Remove</button>
                  </div>
                </div>
              ) : (
                <input type="file" accept="image/*" onChange={(e) => e.target.files?.[0] && void handleDocumentUpload(e.target.files[0], 'profilePhoto')} className="w-full text-sm" disabled={uploadingDoc === 'profilePhoto'} />
              )}
            </div>
            <div>
              <label className="mb-2 block text-sm font-medium">Government ID</label>
              {governmentIdUrl ? (
                <div className="flex items-center gap-4">
                  <a href={governmentIdUrl} target="_blank" rel="noopener noreferrer" className="text-sm text-emerald-600 underline">View document</a>
                  <div className="flex gap-2">
                    <input type="file" accept="image/*,application/pdf" onChange={(e) => e.target.files?.[0] && void handleDocumentUpload(e.target.files[0], 'governmentId')} className="text-sm" disabled={uploadingDoc === 'governmentId'} />
                    <button type="button" onClick={() => handleDocumentRemove('governmentId')} disabled={uploadingDoc === 'governmentId'} className="rounded-full border border-rose-300 px-3 py-1 text-sm text-rose-600 hover:bg-rose-50 disabled:opacity-50">Remove</button>
                  </div>
                </div>
              ) : (
                <input type="file" accept="image/*,application/pdf" onChange={(e) => e.target.files?.[0] && void handleDocumentUpload(e.target.files[0], 'governmentId')} className="w-full text-sm" disabled={uploadingDoc === 'governmentId'} />
              )}
            </div>
            <div>
              <label className="mb-2 block text-sm font-medium">Medical Registration Certificate</label>
              {medicalLicenseUrl ? (
                <div className="flex items-center gap-4">
                  <a href={medicalLicenseUrl} target="_blank" rel="noopener noreferrer" className="text-sm text-emerald-600 underline">View document</a>
                  <div className="flex gap-2">
                    <input type="file" accept="image/*,application/pdf" onChange={(e) => e.target.files?.[0] && void handleDocumentUpload(e.target.files[0], 'medicalLicense')} className="text-sm" disabled={uploadingDoc === 'medicalLicense'} />
                    <button type="button" onClick={() => handleDocumentRemove('medicalLicense')} disabled={uploadingDoc === 'medicalLicense'} className="rounded-full border border-rose-300 px-3 py-1 text-sm text-rose-600 hover:bg-rose-50 disabled:opacity-50">Remove</button>
                  </div>
                </div>
              ) : (
                <input type="file" accept="image/*,application/pdf" onChange={(e) => e.target.files?.[0] && void handleDocumentUpload(e.target.files[0], 'medicalLicense')} className="w-full text-sm" disabled={uploadingDoc === 'medicalLicense'} />
              )}
            </div>
          </div>
          {error && <p className="md:col-span-2 rounded-2xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">{error}</p>}
          <button type="submit" disabled={isSubmitting} className="md:col-span-2 rounded-2xl bg-slate-900 px-4 py-3 font-semibold text-white disabled:opacity-70">
            {isSubmitting ? 'Submitting...' : 'Register as doctor'}
          </button>
        </form>

        <p className="mt-6 text-center text-sm text-slate-600">
          Register as a patient? <Link href="/auth/register" className="font-semibold text-emerald-600">Patient registration</Link>
        </p>
      </div>
    </main>
  );
}
