'use client';

import Link from 'next/link';
import { useEffect, useMemo, useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';

import { useToast } from '../../auth/toast-provider';
import { updatePatientProfile, fetchPatientProfile, type PatientProfile } from '../api';

const schema = z.object({
  fullName: z.string().trim().min(2, 'Full name is required'),
  email: z.string().trim().email('Enter a valid email address'),
  phone: z.string().trim().min(10, 'Phone number is required'),
  bloodGroup: z.string().trim().optional()
});

type FormValues = z.infer<typeof schema>;

export default function PatientProfilePage() {
  const { showToast } = useToast();
  const [profile, setProfile] = useState<PatientProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const { register, reset, handleSubmit, formState: { errors } } = useForm<FormValues>({
    resolver: zodResolver(schema)
  });

  useEffect(() => {
    let mounted = true;

    const load = async () => {
      setLoading(true);
      try {
        const result = await fetchPatientProfile();
        if (!mounted) return;
        setProfile(result);
        setError(null);
        reset({
          fullName: result.fullName,
          email: result.email,
          phone: result.phone,
          bloodGroup: result.bloodGroup || ''
        });
      } catch (err: unknown) {
        if (!mounted) return;
        setError(err instanceof Error ? err.message : 'Unable to load profile.');
      } finally {
        if (mounted) setLoading(false);
      }
    };

    void load();
    return () => {
      mounted = false;
    };
  }, [reset]);

  const addressCount = useMemo(() => profile?.addresses?.length ?? 0, [profile]);

  const onSubmit = async (values: FormValues) => {
    setSaving(true);
    try {
      const updated = await updatePatientProfile({
        fullName: values.fullName,
        email: values.email,
        phone: values.phone,
        bloodGroup: values.bloodGroup || undefined
      });
      setProfile(updated);
      reset({
        fullName: updated.fullName,
        email: updated.email,
        phone: updated.phone,
        bloodGroup: updated.bloodGroup || ''
      });
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
    <section className="grid gap-6 lg:grid-cols-[1.1fr_0.9fr]">
      <div className="rounded-[28px] border border-slate-200 bg-white p-6 shadow-sm">
        <h2 className="text-2xl font-semibold">Profile</h2>
        <p className="mt-2 text-slate-600">View and edit the details stored in your patient record.</p>

        {error && <div className="mt-5 rounded-2xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">{error}</div>}

        <form className="mt-6 space-y-4" onSubmit={handleSubmit(onSubmit)}>
          <div>
            <label className="mb-2 block text-sm font-medium text-slate-700">Full name</label>
            <input {...register('fullName')} className="w-full rounded-2xl border border-slate-300 px-4 py-3 outline-none focus:border-cyan-500" placeholder="Your name" />
            {errors.fullName && <p className="mt-2 text-sm text-rose-600">{errors.fullName.message}</p>}
          </div>
          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <label className="mb-2 block text-sm font-medium text-slate-700">Email</label>
              <input {...register('email')} className="w-full rounded-2xl border border-slate-300 px-4 py-3 outline-none focus:border-cyan-500" placeholder="you@example.com" />
              {errors.email && <p className="mt-2 text-sm text-rose-600">{errors.email.message}</p>}
            </div>
            <div>
              <label className="mb-2 block text-sm font-medium text-slate-700">Phone</label>
              <input {...register('phone')} className="w-full rounded-2xl border border-slate-300 px-4 py-3 outline-none focus:border-cyan-500" placeholder="Phone number" />
              {errors.phone && <p className="mt-2 text-sm text-rose-600">{errors.phone.message}</p>}
            </div>
          </div>
          <div>
            <label className="mb-2 block text-sm font-medium text-slate-700">Blood group</label>
            <input {...register('bloodGroup')} className="w-full rounded-2xl border border-slate-300 px-4 py-3 outline-none focus:border-cyan-500" placeholder="A+, O-, ..." />
          </div>
          <button type="submit" disabled={saving} className="rounded-full bg-slate-950 px-5 py-3 text-sm font-semibold text-white transition hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-70">
            {saving ? 'Saving...' : 'Save profile'}
          </button>
        </form>
      </div>

      <div className="space-y-6">
        <div className="rounded-[28px] border border-slate-200 bg-white p-6 shadow-sm">
          <h3 className="text-xl font-semibold">Addresses</h3>
          <p className="mt-2 text-sm text-slate-600">Manage your saved locations for home visits.</p>
          <div className="mt-4 rounded-2xl border border-slate-200 p-4 text-sm text-slate-600">
            Saved addresses: {addressCount}
          </div>
          <Link href="/patient/addresses" className="mt-4 inline-block text-sm font-semibold text-emerald-600 hover:text-emerald-700">
            Manage addresses →
          </Link>
        </div>
        <div className="rounded-[28px] bg-slate-950 p-6 text-white shadow-sm">
          <h3 className="text-xl font-semibold">Health records</h3>
          <p className="mt-3 text-sm leading-6 text-slate-300">Keep allergies and medical history up to date so doctors have the information they need during visits.</p>
          <div className="mt-4 flex flex-wrap gap-3">
            <Link href="/patient/allergies" className="rounded-full border border-slate-600 px-4 py-2 text-sm font-medium transition hover:bg-slate-800">Allergies</Link>
            <Link href="/patient/medical-history" className="rounded-full border border-slate-600 px-4 py-2 text-sm font-medium transition hover:bg-slate-800">Medical history</Link>
          </div>
        </div>
      </div>
    </section>
  );
}
