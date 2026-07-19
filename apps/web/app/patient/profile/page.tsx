'use client';

import Link from 'next/link';
import Image from 'next/image';
import { useEffect, useMemo, useRef, useState } from 'react';
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

const API_BASE = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000/api/v1';

const getStoredAccessToken = (): string | null => {
  if (typeof window === 'undefined') return null;
  try {
    const raw = window.localStorage.getItem('docdock-auth') || window.sessionStorage.getItem('docdock-auth');
    if (!raw) return null;
    return (JSON.parse(raw) as { accessToken?: string }).accessToken || null;
  } catch {
    return null;
  }
};

/** Persist updated avatar into stored auth so sidebar picks it up immediately */
const updateStoredAvatar = (avatarUrl: string) => {
  if (typeof window === 'undefined') return;
  for (const storage of [window.localStorage, window.sessionStorage]) {
    const raw = storage.getItem('docdock-auth');
    if (raw) {
      try {
        const parsed = JSON.parse(raw);
        parsed.user = { ...(parsed.user || {}), avatar: avatarUrl };
        storage.setItem('docdock-auth', JSON.stringify(parsed));
      } catch { /* ignore */ }
    }
  }
};

export default function PatientProfilePage() {
  const { showToast } = useToast();
  const [profile, setProfile] = useState<PatientProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [profilePhotoUrl, setProfilePhotoUrl] = useState<string | null>(null);
  const [uploadingPhoto, setUploadingPhoto] = useState(false);
  const fileInputRef = useRef<HTMLInputElement | null>(null);

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
        // Also load profile photo from stored auth
        const raw = window.localStorage.getItem('docdock-auth') || window.sessionStorage.getItem('docdock-auth');
        if (raw) {
          const parsed = JSON.parse(raw);
          setProfilePhotoUrl(parsed.user?.avatar || (result as any).profilePhotoUrl || null);
        }
      } catch (err: unknown) {
        if (!mounted) return;
        setError(err instanceof Error ? err.message : 'Unable to load profile.');
      } finally {
        if (mounted) setLoading(false);
      }
    };

    void load();
    return () => { mounted = false; };
  }, [reset]);

  const addressCount = useMemo(() => profile?.addresses?.length ?? 0, [profile]);

  const handlePhotoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Validate file type
    if (!file.type.startsWith('image/')) {
      showToast('Please upload an image file (JPG, PNG, WEBP)', 'error');
      return;
    }

    // Validate file size (5MB max)
    if (file.size > 5 * 1024 * 1024) {
      showToast('Image must be smaller than 5MB', 'error');
      return;
    }

    setUploadingPhoto(true);
    try {
      // Convert to base64
      const base64 = await new Promise<string>((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = (ev) => resolve(ev.target?.result as string);
        reader.onerror = reject;
        reader.readAsDataURL(file);
      });

      // Upload via PATCH profile endpoint using profilePhoto field
      const token = getStoredAccessToken();
      const res = await fetch(`${API_BASE}/patients/profile/me`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ profilePhoto: base64 })
      });

      if (!res.ok) {
        const data = await res.json().catch(() => null);
        throw new Error(data?.message || 'Photo upload failed');
      }

      const data = await res.json();
      const newPhotoUrl = data.data?.profilePhotoUrl || data.data?.avatarUrl || null;

      if (newPhotoUrl) {
        setProfilePhotoUrl(newPhotoUrl);
        updateStoredAvatar(newPhotoUrl);
        showToast('Profile photo updated!', 'success');
        // Dispatch event so sidebar updates without refresh
        window.dispatchEvent(new CustomEvent('docdock:profile_photo_updated', { detail: { url: newPhotoUrl } }));
      } else {
        // Fallback: show optimistic preview
        setProfilePhotoUrl(base64);
        showToast('Profile photo updated!', 'success');
      }
    } catch (err: unknown) {
      showToast(err instanceof Error ? err.message : 'Unable to upload photo.', 'error');
    } finally {
      setUploadingPhoto(false);
      // Reset file input
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

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

  const initials = (profile?.fullName || 'P').split(' ').map((n) => n[0]).join('').slice(0, 2).toUpperCase();

  return (
    <section className="grid gap-6 lg:grid-cols-[1.1fr_0.9fr]">
      <div className="dd-card">
        <h2 className="text-xl font-bold" style={{ color: 'var(--text-primary)' }}>Profile</h2>
        <p className="mt-1 text-sm" style={{ color: 'var(--text-secondary)' }}>View and edit the details stored in your patient record.</p>

        {/* Profile Photo Section */}
        <div className="mt-6 flex items-center gap-5">
          <div className="relative flex-shrink-0">
            <div className="h-20 w-20 rounded-full overflow-hidden border-4 border-emerald-100 dark:border-emerald-900/40 shadow-md">
              {profilePhotoUrl ? (
                <img
                  src={profilePhotoUrl}
                  alt="Profile photo"
                  className="h-full w-full object-cover"
                />
              ) : (
                <div className="flex h-full w-full items-center justify-center bg-emerald-100 dark:bg-emerald-950/50 text-xl font-bold text-emerald-700 dark:text-emerald-400">
                  {initials}
                </div>
              )}
            </div>
            {uploadingPhoto && (
              <div className="absolute inset-0 flex items-center justify-center rounded-full bg-black/40">
                <div className="h-5 w-5 animate-spin rounded-full border-2 border-white border-t-transparent" />
              </div>
            )}
          </div>
          <div>
            <p className="text-sm font-semibold" style={{ color: 'var(--text-primary)' }}>Profile Photo</p>
            <p className="mt-0.5 text-xs" style={{ color: 'var(--text-muted)' }}>JPG, PNG or WEBP. Max 5MB.</p>
            <input
              type="file"
              accept="image/jpeg,image/png,image/webp,image/gif"
              className="hidden"
              ref={fileInputRef}
              onChange={handlePhotoUpload}
            />
            <button
              type="button"
              disabled={uploadingPhoto}
              onClick={() => fileInputRef.current?.click()}
              className="mt-2 rounded-lg border px-3 py-1.5 text-xs font-semibold transition-all hover:bg-slate-50 dark:hover:bg-slate-800 disabled:opacity-60"
              style={{ borderColor: 'var(--border-color)', color: 'var(--text-secondary)' }}
            >
              {uploadingPhoto ? 'Uploading...' : 'Change Photo'}
            </button>
          </div>
        </div>

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
