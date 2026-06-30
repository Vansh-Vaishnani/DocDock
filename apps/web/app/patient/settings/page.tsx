'use client';

import Link from 'next/link';
import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';

import { useAuth } from '../../auth/auth-context';
import { useToast } from '../../auth/toast-provider';
import { changePassword } from '../../auth/api';

const schema = z
  .object({
    currentPassword: z.string().min(8, 'Current password must be at least 8 characters'),
    newPassword: z.string().min(8, 'New password must be at least 8 characters'),
    confirmPassword: z.string().min(8, 'Please confirm your new password')
  })
  .refine((data) => data.newPassword === data.confirmPassword, {
    message: 'Passwords do not match',
    path: ['confirmPassword']
  });

type FormValues = z.infer<typeof schema>;

export default function PatientSettingsPage() {
  const { user, logout } = useAuth();
  const { showToast } = useToast();
  const [showPassword, setShowPassword] = useState(false);
  const [saving, setSaving] = useState(false);

  const { register, handleSubmit, reset, formState: { errors } } = useForm<FormValues>({
    resolver: zodResolver(schema)
  });

  const onSubmit = async (values: FormValues) => {
    setSaving(true);
    try {
      await changePassword({
        currentPassword: values.currentPassword,
        newPassword: values.newPassword
      });
      reset();
      showToast('Password changed successfully. Please sign in again.', 'success');
      logout();
    } catch (err: unknown) {
      showToast(err instanceof Error ? err.message : 'Unable to change password.', 'error');
    } finally {
      setSaving(false);
    }
  };

  return (
    <section className="grid gap-6 lg:grid-cols-[1.1fr_0.9fr]">
      <div className="dd-card">
        <h2 className="text-xl font-bold" style={{ color: 'var(--text-primary)' }}>Account settings</h2>
        <p className="mt-1 text-sm" style={{ color: 'var(--text-secondary)' }}>Manage your password and account security.</p>

        <form className="mt-6 space-y-4" onSubmit={handleSubmit(onSubmit)}>
          <div>
            <label className="dd-label">Current password</label>
            <input
              type={showPassword ? 'text' : 'password'}
              {...register('currentPassword')}
              className="dd-input"
              placeholder="Enter current password"
            />
            {errors.currentPassword && <p className="mt-1.5 text-xs text-rose-600">{errors.currentPassword.message}</p>}
          </div>
          <div>
            <label className="dd-label">New password</label>
            <input
              type={showPassword ? 'text' : 'password'}
              {...register('newPassword')}
              className="dd-input"
              placeholder="At least 8 characters"
            />
            {errors.newPassword && <p className="mt-1.5 text-xs text-rose-600">{errors.newPassword.message}</p>}
          </div>
          <div>
            <label className="dd-label">Confirm new password</label>
            <input
              type={showPassword ? 'text' : 'password'}
              {...register('confirmPassword')}
              className="dd-input"
              placeholder="Re-enter new password"
            />
            {errors.confirmPassword && <p className="mt-1.5 text-xs text-rose-600">{errors.confirmPassword.message}</p>}
          </div>
          <label className="flex items-center gap-2 text-sm cursor-pointer" style={{ color: 'var(--text-secondary)' }}>
            <input type="checkbox" checked={showPassword} onChange={(e) => setShowPassword(e.target.checked)} className="h-4 w-4 rounded border-slate-300 text-emerald-600 accent-emerald-600 focus:ring-emerald-500" />
            Show passwords
          </label>
          <button
            type="submit"
            disabled={saving}
            className="btn-primary w-full"
          >
            {saving ? 'Updating...' : 'Change password'}
          </button>
        </form>
      </div>

      <div className="space-y-6">
        <div className="dd-card">
          <h3 className="text-lg font-bold" style={{ color: 'var(--text-primary)' }}>Account details</h3>
          <div className="mt-4 space-y-3 text-sm" style={{ color: 'var(--text-secondary)' }}>
            <p><span className="font-semibold" style={{ color: 'var(--text-primary)' }}>Name:</span> {user?.fullName || '—'}</p>
            <p><span className="font-semibold" style={{ color: 'var(--text-primary)' }}>Email:</span> {user?.email || '—'}</p>
            <p><span className="font-semibold" style={{ color: 'var(--text-primary)' }}>Role:</span> Patient</p>
          </div>
        </div>
        <div className="dd-card">
          <h3 className="text-lg font-bold" style={{ color: 'var(--text-primary)' }}>Forgot your password?</h3>
          <p className="mt-2 text-sm leading-relaxed" style={{ color: 'var(--text-secondary)' }}>If you are signed out and cannot access your account, use the password reset flow from the login page.</p>
          <Link href="/auth/forgot-password" className="btn-secondary mt-4 py-2 px-4 text-xs">
            Reset password
          </Link>
        </div>
      </div>
    </section>
  );
}
