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
    return (
      <div className="dd-card py-12 text-center">
        <div className="h-6 w-32 skeleton rounded mx-auto mb-3" />
        <div className="h-4 w-48 skeleton rounded mx-auto" />
      </div>
    );
  }

  return (
    <section className="grid gap-6 lg:grid-cols-[1.1fr_0.9fr]">
      <div className="dd-card">
        <h2 className="text-xl font-bold" style={{ color: 'var(--text-primary)' }}>Profile</h2>
        <p className="mt-1 text-sm" style={{ color: 'var(--text-secondary)' }}>View and edit the details stored in your patient record.</p>

        {error && (
          <div className="mt-4 rounded-xl border border-rose-200 bg-rose-50 dark:bg-rose-950/30 dark:border-rose-900 px-4 py-3 text-sm text-rose-700 dark:text-rose-400">
            {error}
          </div>
        )}

        <form className="mt-6 space-y-4" onSubmit={handleSubmit(onSubmit)}>
          <div>
            <label className="dd-label">Full name</label>
            <input {...register('fullName')} className="dd-input" placeholder="Your name" />
            {errors.fullName && <p className="mt-1.5 text-xs text-rose-600">{errors.fullName.message}</p>}
          </div>
          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <label className="dd-label">Email</label>
              <input {...register('email')} className="dd-input" placeholder="you@example.com" />
              {errors.email && <p className="mt-1.5 text-xs text-rose-600">{errors.email.message}</p>}
            </div>
            <div>
              <label className="dd-label">Phone</label>
              <input {...register('phone')} className="dd-input" placeholder="Phone number" />
              {errors.phone && <p className="mt-1.5 text-xs text-rose-600">{errors.phone.message}</p>}
            </div>
          </div>
          <div>
            <label className="dd-label">Blood group</label>
            <input {...register('bloodGroup')} className="dd-input" placeholder="A+, O-, ..." />
          </div>
          <button type="submit" disabled={saving} className="btn-primary w-full mt-2">
            {saving ? 'Saving...' : 'Save profile'}
          </button>
        </form>
      </div>

      <div className="space-y-6">
        <div className="dd-card">
          <h3 className="text-lg font-bold" style={{ color: 'var(--text-primary)' }}>Addresses</h3>
          <p className="mt-1 text-sm" style={{ color: 'var(--text-secondary)' }}>Manage your saved locations for home visits.</p>
          <div className="mt-4 rounded-xl border p-3 text-sm font-medium" style={{ backgroundColor: 'var(--bg-tertiary)', borderColor: 'var(--border-color)', color: 'var(--text-secondary)' }}>
            Saved addresses: {addressCount}
          </div>
          <Link href="/patient/addresses" className="mt-4 inline-flex items-center gap-1 text-sm font-semibold text-emerald-600 hover:text-emerald-700">
            Manage addresses →
          </Link>
        </div>
        <div className="dd-card">
          <h3 className="text-lg font-bold" style={{ color: 'var(--text-primary)' }}>Health records</h3>
          <p className="mt-2 text-sm leading-relaxed" style={{ color: 'var(--text-secondary)' }}>Keep allergies and medical history up to date so doctors have the information they need during visits.</p>
          <div className="mt-4 flex flex-wrap gap-2.5">
            <Link href="/patient/allergies" className="btn-secondary py-2 px-4 text-xs font-semibold">Allergies</Link>
            <Link href="/patient/medical-history" className="btn-secondary py-2 px-4 text-xs font-semibold">Medical history</Link>
          </div>
        </div>
      </div>
    </section>
  );
}

