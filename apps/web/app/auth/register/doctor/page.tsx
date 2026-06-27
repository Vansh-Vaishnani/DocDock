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
  const [profilePhoto, setProfilePhoto] = useState<File | null>(null);
  const [governmentId, setGovernmentId] = useState<File | null>(null);
  const [medicalLicense, setMedicalLicense] = useState<File | null>(null);

  const { register, handleSubmit, formState: { errors } } = useForm<FormValues>({ resolver: zodResolver(schema) });

  const onSubmit = async (values: FormValues) => {
    setError(null);
    setIsSubmitting(true);
    try {
      const payload = {
        ...values,
        languages: values.languages.split(',').map((l) => l.trim()).filter(Boolean),
        profilePhoto: profilePhoto ? await fileToBase64(profilePhoto) : undefined,
        governmentId: governmentId ? await fileToBase64(governmentId) : undefined,
        medicalLicense: medicalLicense ? await fileToBase64(medicalLicense) : undefined
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
          <input type="date" {...register('dateOfBirth')} className="rounded-2xl border border-slate-300 px-4 py-3" />
          <input {...register('qualification')} placeholder="Qualification" className="rounded-2xl border border-slate-300 px-4 py-3" />
          <input {...register('medicalDegree')} placeholder="Medical degree" className="rounded-2xl border border-slate-300 px-4 py-3" />
          <input {...register('licenseNumber')} placeholder="Medical council registration number" className="md:col-span-2 rounded-2xl border border-slate-300 px-4 py-3" />
          <input type="number" {...register('experience')} placeholder="Years of experience" className="rounded-2xl border border-slate-300 px-4 py-3" />
          <input {...register('specialization')} placeholder="Specialization" className="rounded-2xl border border-slate-300 px-4 py-3" />
          <input type="number" {...register('consultationFee')} placeholder="Consultation fee (₹)" className="rounded-2xl border border-slate-300 px-4 py-3" />
          <input {...register('languages')} placeholder="Languages (comma-separated)" className="rounded-2xl border border-slate-300 px-4 py-3" />
          <input {...register('clinicName')} placeholder="Clinic / hospital name" className="md:col-span-2 rounded-2xl border border-slate-300 px-4 py-3" />
          <textarea {...register('bio')} placeholder="About doctor" rows={4} className="md:col-span-2 rounded-2xl border border-slate-300 px-4 py-3" />
          <label className="md:col-span-2 text-sm">Profile photo<input type="file" accept="image/*" onChange={(e) => setProfilePhoto(e.target.files?.[0] ?? null)} className="mt-1 block w-full" /></label>
          <label className="text-sm">Government ID<input type="file" accept="image/*,application/pdf" onChange={(e) => setGovernmentId(e.target.files?.[0] ?? null)} className="mt-1 block w-full" /></label>
          <label className="text-sm">Medical license<input type="file" accept="image/*,application/pdf" onChange={(e) => setMedicalLicense(e.target.files?.[0] ?? null)} className="mt-1 block w-full" /></label>
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
