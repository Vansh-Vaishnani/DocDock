'use client';

import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { Suspense, useMemo, useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';

import { useToast } from '../toast-provider';
import { resetPassword } from '../api';

const schema = z
  .object({
    password: z.string().min(8, 'Password must be at least 8 characters'),
    confirmPassword: z.string().min(8, 'Please confirm your password')
  })
  .refine((data) => data.password === data.confirmPassword, {
    message: 'Passwords do not match',
    path: ['confirmPassword']
  });

type FormValues = z.infer<typeof schema>;

function readTokenFromUrl(searchParams: ReturnType<typeof useSearchParams>): string {
  const fromParams = searchParams.get('token')?.trim();
  if (fromParams) {
    return fromParams;
  }

  if (typeof window !== 'undefined') {
    return new URLSearchParams(window.location.search).get('token')?.trim() ?? '';
  }

  return '';
}

function ResetPasswordContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { showToast } = useToast();
  const token = useMemo(() => readTokenFromUrl(searchParams), [searchParams]);
  const hasToken = token.length > 0;

  const [submitError, setSubmitError] = useState<string | null>(null);
  const [tokenRejected, setTokenRejected] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const { register, handleSubmit, formState: { errors } } = useForm<FormValues>({
    resolver: zodResolver(schema)
  });

  const onSubmit = async (values: FormValues) => {
    if (!hasToken) return;

    setSubmitError(null);
    setIsSubmitting(true);
    try {
      await resetPassword(token, values.password);
      showToast('Password reset successfully. Please sign in.', 'success');
      router.push('/auth/login');
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Unable to reset password.';
      setSubmitError(message);

      if (/invalid|expired/i.test(message)) {
        setTokenRejected(true);
      }

      showToast(message, 'error');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <main className="min-h-screen bg-[radial-gradient(circle_at_top,_#f8fafc,_#eef2ff_55%,_#f8fafc)] px-4 py-10 text-slate-900 sm:px-6 lg:px-8">
      <div className="mx-auto max-w-lg rounded-[32px] border border-slate-200/80 bg-white/80 p-8 shadow-[0_30px_80px_-30px_rgba(15,23,42,0.35)] backdrop-blur">
        <div>
          <p className="text-sm font-semibold uppercase tracking-[0.35em] text-emerald-600">Password reset</p>
          <h1 className="mt-3 text-3xl font-semibold">Set a new password</h1>
          <p className="mt-3 text-slate-600">Choose a strong password for your DocDock account.</p>
        </div>

        {!hasToken ? (
          <div className="mt-8 space-y-4">
            <div className="rounded-2xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">
              This reset link is missing a token. Please request a new password reset link.
            </div>
            <Link
              href="/auth/forgot-password"
              className="inline-flex rounded-2xl bg-slate-900 px-4 py-3 text-sm font-semibold text-white transition hover:bg-slate-700"
            >
              Request a new reset link
            </Link>
          </div>
        ) : tokenRejected ? (
          <div className="mt-8 space-y-4">
            <div className="rounded-2xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">
              {submitError || 'This reset link is invalid or has expired. Please request a new one.'}
            </div>
            <Link
              href="/auth/forgot-password"
              className="inline-flex rounded-2xl bg-slate-900 px-4 py-3 text-sm font-semibold text-white transition hover:bg-slate-700"
            >
              Request a new reset link
            </Link>
          </div>
        ) : (
          <form className="mt-8 space-y-4" onSubmit={handleSubmit(onSubmit)}>
            <div>
              <label className="mb-2 block text-sm font-medium text-slate-700">New password</label>
              <input
                type={showPassword ? 'text' : 'password'}
                {...register('password')}
                className="w-full rounded-2xl border border-slate-300 bg-white px-4 py-3 outline-none transition focus:border-emerald-500"
                placeholder="At least 8 characters"
                autoComplete="new-password"
              />
              {errors.password && <p className="mt-2 text-sm text-rose-600">{errors.password.message}</p>}
            </div>
            <div>
              <label className="mb-2 block text-sm font-medium text-slate-700">Confirm password</label>
              <input
                type={showPassword ? 'text' : 'password'}
                {...register('confirmPassword')}
                className="w-full rounded-2xl border border-slate-300 bg-white px-4 py-3 outline-none transition focus:border-emerald-500"
                placeholder="Re-enter password"
                autoComplete="new-password"
              />
              {errors.confirmPassword && <p className="mt-2 text-sm text-rose-600">{errors.confirmPassword.message}</p>}
            </div>
            <label className="flex items-center gap-2 text-sm text-slate-700">
              <input
                type="checkbox"
                checked={showPassword}
                onChange={(e) => setShowPassword(e.target.checked)}
                className="h-4 w-4 rounded border-slate-300 text-emerald-600 focus:ring-emerald-500"
              />
              Show passwords
            </label>
            {submitError && (
              <p className="rounded-2xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">{submitError}</p>
            )}
            <button
              type="submit"
              disabled={isSubmitting}
              className="w-full rounded-2xl bg-slate-900 px-4 py-3 font-semibold text-white transition hover:bg-slate-700 disabled:cursor-not-allowed disabled:opacity-70"
            >
              {isSubmitting ? 'Resetting...' : 'Reset password'}
            </button>
          </form>
        )}

        <div className="mt-6 text-center text-sm text-slate-600">
          <Link href="/auth/login" className="font-semibold text-emerald-600 hover:text-emerald-700">
            Back to sign in
          </Link>
        </div>
      </div>
    </main>
  );
}

export default function ResetPasswordPage() {
  return (
    <Suspense fallback={<div className="flex min-h-screen items-center justify-center bg-slate-50 text-slate-600">Loading…</div>}>
      <ResetPasswordContent />
    </Suspense>
  );
}
