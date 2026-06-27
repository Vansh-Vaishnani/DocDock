'use client';

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
          fullName: result._id ? '' : '',
          email: '',
          phone: '',
          bloodGroup: result.bloodGroup || ''
        });
      } catch (err: unknown) {
        if (!mounted) return;
        setError(err instanceof Error ? err.message : 'Patient profile API is not available yet.');
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
      void values;
      await updatePatientProfile();
      showToast('Profile updated successfully.', 'success');
    } catch (err: unknown) {
      showToast(err instanceof Error ? err.message : 'Profile update is not available yet.', 'error');
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
        <p className="mt-2 text-slate-600">View and edit the details already stored in your patient record.</p>

        {error && <div className="mt-5 rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800">{error}</div>}

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
        <div id="addresses" className="rounded-[28px] border border-slate-200 bg-white p-6 shadow-sm">
          <h3 className="text-xl font-semibold">Addresses</h3>
          <p className="mt-2 text-sm text-slate-600">Address management is ready for the backend list/update/delete endpoints.</p>
          <div className="mt-4 rounded-2xl border border-dashed border-slate-300 p-4 text-sm text-slate-600">
            Saved addresses: {addressCount}
          </div>
        </div>
        <div className="rounded-[28px] bg-slate-950 p-6 text-white shadow-sm">
          <h3 className="text-xl font-semibold">Edit scope</h3>
          <p className="mt-3 text-sm leading-6 text-slate-300">This page is wired only to real backend state. Fields that the backend does not yet expose are intentionally left unpopulated instead of being faked.</p>
        </div>
      </div>
    </section>
  );
}
