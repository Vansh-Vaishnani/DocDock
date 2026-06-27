'use client';

import { useEffect, useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';

import { useToast } from '../../auth/toast-provider';
import { fetchDoctorProfile, updateDoctorProfile, fileToBase64, type DoctorProfile } from '../api';

const schema = z.object({
  fullName: z.string().min(2),
  email: z.string().email(),
  phone: z.string().min(10),
  specialization: z.string().min(2),
  qualification: z.string().min(2),
  medicalDegree: z.string().min(2),
  licenseNumber: z.string().min(3),
  experience: z.coerce.number().min(0),
  consultationFee: z.coerce.number().min(0),
  languages: z.string().min(2),
  clinicName: z.string().min(2),
  bio: z.string().min(10),
  gender: z.enum(['male', 'female', 'other']),
  dateOfBirth: z.string().optional()
});

type FormValues = z.infer<typeof schema>;

export default function DoctorProfilePage() {
  const { showToast } = useToast();
  const [profile, setProfile] = useState<DoctorProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [profilePhotoFile, setProfilePhotoFile] = useState<File | null>(null);

  const { register, handleSubmit, reset, formState: { errors } } = useForm<FormValues>({ resolver: zodResolver(schema) });

  useEffect(() => {
    void fetchDoctorProfile()
      .then((result) => {
        setProfile(result);
        reset({
          fullName: result.fullName,
          email: result.email,
          phone: result.phone,
          specialization: result.specialization,
          qualification: result.qualifications[0] || '',
          medicalDegree: result.medicalDegree || '',
          licenseNumber: result.licenseNumber,
          experience: result.experience,
          consultationFee: result.consultationFee,
          languages: result.languages.join(', '),
          clinicName: result.clinicName || '',
          bio: result.bio,
          gender: (result.gender as FormValues['gender']) || 'other',
          dateOfBirth: result.dateOfBirth || ''
        });
      })
      .catch((err: unknown) => showToast(err instanceof Error ? err.message : 'Unable to load profile.', 'error'))
      .finally(() => setLoading(false));
  }, [reset, showToast]);

  const onSubmit = async (values: FormValues) => {
    setSaving(true);
    try {
      const payload: Record<string, unknown> = {
        ...values,
        languages: values.languages.split(',').map((l) => l.trim()).filter(Boolean),
        qualification: values.qualification
      };
      if (profilePhotoFile) {
        payload.profilePhoto = await fileToBase64(profilePhotoFile);
      }
      const updated = await updateDoctorProfile(payload);
      setProfile(updated);
      showToast('Profile updated successfully.', 'success');
    } catch (err: unknown) {
      showToast(err instanceof Error ? err.message : 'Unable to update profile.', 'error');
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return <div className="rounded-3xl border border-slate-200 bg-white p-8 text-slate-600 shadow-sm">Loading profile...</div>;
  }

  return (
    <section className="rounded-[28px] border border-slate-200 bg-white p-6 shadow-sm">
      <h2 className="text-2xl font-semibold">Professional profile</h2>
      <p className="mt-2 text-slate-600">Edit your credentials and practice details.</p>

      {profile?.profilePhotoUrl && (
        <img src={profile.profilePhotoUrl} alt="Profile" className="mt-4 h-20 w-20 rounded-full object-cover" />
      )}

      <form className="mt-6 grid gap-4 md:grid-cols-2" onSubmit={handleSubmit(onSubmit)}>
        <div>
          <label className="mb-2 block text-sm font-medium">Full name</label>
          <input {...register('fullName')} className="w-full rounded-2xl border border-slate-300 px-4 py-3" />
          {errors.fullName && <p className="mt-1 text-sm text-rose-600">{errors.fullName.message}</p>}
        </div>
        <div>
          <label className="mb-2 block text-sm font-medium">Email</label>
          <input {...register('email')} className="w-full rounded-2xl border border-slate-300 px-4 py-3" />
          {errors.email && <p className="mt-1 text-sm text-rose-600">{errors.email.message}</p>}
        </div>
        <div>
          <label className="mb-2 block text-sm font-medium">Phone</label>
          <input {...register('phone')} className="w-full rounded-2xl border border-slate-300 px-4 py-3" />
        </div>
        <div>
          <label className="mb-2 block text-sm font-medium">Gender</label>
          <select {...register('gender')} className="w-full rounded-2xl border border-slate-300 px-4 py-3">
            <option value="male">Male</option>
            <option value="female">Female</option>
            <option value="other">Other</option>
          </select>
        </div>
        <div>
          <label className="mb-2 block text-sm font-medium">Date of birth</label>
          <input type="date" {...register('dateOfBirth')} className="w-full rounded-2xl border border-slate-300 px-4 py-3" />
        </div>
        <div>
          <label className="mb-2 block text-sm font-medium">Specialization</label>
          <input {...register('specialization')} className="w-full rounded-2xl border border-slate-300 px-4 py-3" />
        </div>
        <div>
          <label className="mb-2 block text-sm font-medium">Qualification</label>
          <input {...register('qualification')} className="w-full rounded-2xl border border-slate-300 px-4 py-3" />
        </div>
        <div>
          <label className="mb-2 block text-sm font-medium">Medical degree</label>
          <input {...register('medicalDegree')} className="w-full rounded-2xl border border-slate-300 px-4 py-3" />
        </div>
        <div>
          <label className="mb-2 block text-sm font-medium">Council registration number</label>
          <input {...register('licenseNumber')} className="w-full rounded-2xl border border-slate-300 px-4 py-3" />
        </div>
        <div>
          <label className="mb-2 block text-sm font-medium">Years of experience</label>
          <input type="number" {...register('experience')} className="w-full rounded-2xl border border-slate-300 px-4 py-3" />
        </div>
        <div>
          <label className="mb-2 block text-sm font-medium">Consultation fee (₹)</label>
          <input type="number" {...register('consultationFee')} className="w-full rounded-2xl border border-slate-300 px-4 py-3" />
        </div>
        <div>
          <label className="mb-2 block text-sm font-medium">Languages (comma-separated)</label>
          <input {...register('languages')} className="w-full rounded-2xl border border-slate-300 px-4 py-3" />
        </div>
        <div>
          <label className="mb-2 block text-sm font-medium">Clinic / hospital name</label>
          <input {...register('clinicName')} className="w-full rounded-2xl border border-slate-300 px-4 py-3" />
        </div>
        <div className="md:col-span-2">
          <label className="mb-2 block text-sm font-medium">About doctor</label>
          <textarea {...register('bio')} rows={4} className="w-full rounded-2xl border border-slate-300 px-4 py-3" />
        </div>
        <div className="md:col-span-2">
          <label className="mb-2 block text-sm font-medium">Update profile photo</label>
          <input type="file" accept="image/*" onChange={(e) => setProfilePhotoFile(e.target.files?.[0] ?? null)} className="w-full text-sm" />
        </div>
        <div className="md:col-span-2">
          <button type="submit" disabled={saving} className="rounded-full bg-slate-950 px-5 py-3 text-sm font-semibold text-white disabled:opacity-70">
            {saving ? 'Saving...' : 'Save profile'}
          </button>
        </div>
      </form>
    </section>
  );
}
