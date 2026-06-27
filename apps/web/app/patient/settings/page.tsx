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
      <div className="rounded-[28px] border border-slate-200 bg-white p-6 shadow-sm">
        <h2 className="text-2xl font-semibold">Account settings</h2>
        <p className="mt-2 text-slate-600">Manage your password and account security.</p>

        <form className="mt-6 space-y-4" onSubmit={handleSubmit(onSubmit)}>
          <div>
            <label className="mb-2 block text-sm font-medium text-slate-700">Current password</label>
            <input
              type={showPassword ? 'text' : 'password'}
              {...register('currentPassword')}
              className="w-full rounded-2xl border border-slate-300 px-4 py-3 outline-none focus:border-cyan-500"
              placeholder="Enter current password"
            />
            {errors.currentPassword && <p className="mt-2 text-sm text-rose-600">{errors.currentPassword.message}</p>}
          </div>
          <div>
            <label className="mb-2 block text-sm font-medium text-slate-700">New password</label>
            <input
              type={showPassword ? 'text' : 'password'}
              {...register('newPassword')}
              className="w-full rounded-2xl border border-slate-300 px-4 py-3 outline-none focus:border-cyan-500"
              placeholder="At least 8 characters"
            />
            {errors.newPassword && <p className="mt-2 text-sm text-rose-600">{errors.newPassword.message}</p>}
          </div>
          <div>
            <label className="mb-2 block text-sm font-medium text-slate-700">Confirm new password</label>
            <input
              type={showPassword ? 'text' : 'password'}
              {...register('confirmPassword')}
              className="w-full rounded-2xl border border-slate-300 px-4 py-3 outline-none focus:border-cyan-500"
              placeholder="Re-enter new password"
            />
            {errors.confirmPassword && <p className="mt-2 text-sm text-rose-600">{errors.confirmPassword.message}</p>}
          </div>
          <label className="flex items-center gap-2 text-sm text-slate-700">
            <input type="checkbox" checked={showPassword} onChange={(e) => setShowPassword(e.target.checked)} className="h-4 w-4 rounded border-slate-300 text-cyan-600 focus:ring-cyan-500" />
            Show passwords
          </label>
          <button
            type="submit"
            disabled={saving}
            className="rounded-full bg-slate-950 px-5 py-3 text-sm font-semibold text-white transition hover:bg-slate-800 disabled:opacity-70"
          >
            {saving ? 'Updating...' : 'Change password'}
          </button>
        </form>
      </div>

      <div className="space-y-6">
        <div className="rounded-[28px] border border-slate-200 bg-white p-6 shadow-sm">
          <h3 className="text-xl font-semibold">Account details</h3>
          <div className="mt-4 space-y-3 text-sm text-slate-600">
            <p><span className="font-medium text-slate-900">Name:</span> {user?.fullName || '—'}</p>
            <p><span className="font-medium text-slate-900">Email:</span> {user?.email || '—'}</p>
            <p><span className="font-medium text-slate-900">Role:</span> Patient</p>
          </div>
        </div>
        <div className="rounded-[28px] bg-slate-950 p-6 text-white shadow-sm">
          <h3 className="text-xl font-semibold">Forgot your password?</h3>
          <p className="mt-3 text-sm leading-6 text-slate-300">If you are signed out and cannot access your account, use the password reset flow from the login page.</p>
          <Link href="/auth/forgot-password" className="mt-4 inline-block rounded-full border border-slate-600 px-4 py-2 text-sm font-medium transition hover:bg-slate-800">
            Reset password
          </Link>
        </div>
      </div>
    </section>
  );
}
