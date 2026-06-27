'use client';

import Link from 'next/link';
import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';

import { useToast } from '../toast-provider';
import { requestPasswordReset } from '../api';

const schema = z.object({
  email: z.string().trim().min(1, 'Email is required').email('Enter a valid email address')
});

type FormValues = z.infer<typeof schema>;

export default function ForgotPasswordPage() {
  const { showToast } = useToast();
  const [submitted, setSubmitted] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const { register, handleSubmit, formState: { errors } } = useForm<FormValues>({
    resolver: zodResolver(schema)
  });

  const onSubmit = async (values: FormValues) => {
    setError(null);
    setIsSubmitting(true);
    try {
      await requestPasswordReset(values.email);
      setSubmitted(true);
      showToast('If an account exists, a reset link has been sent.', 'success');
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Unable to process request.';
      setError(message);
      showToast(message, 'error');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <main className="min-h-screen bg-[radial-gradient(circle_at_top,_#f8fafc,_#eef2ff_55%,_#f8fafc)] px-4 py-10 text-slate-900 sm:px-6 lg:px-8">
      <div className="mx-auto max-w-lg rounded-[32px] border border-slate-200/80 bg-white/80 p-8 shadow-[0_30px_80px_-30px_rgba(15,23,42,0.35)] backdrop-blur">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div>
            <p className="text-sm font-semibold uppercase tracking-[0.35em] text-emerald-600">Password reset</p>
            <h1 className="mt-3 text-3xl font-semibold">Forgot password</h1>
            <p className="mt-3 text-slate-600">Enter your email and we will send you a link to reset your password.</p>
          </div>
        </div>

        {submitted ? (
          <div className="mt-8 space-y-4">
            <div className="rounded-2xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-800">
              If an account with that email exists, a password reset link has been sent. Check your inbox and follow the instructions.
            </div>
            <Link href="/auth/login" className="inline-block text-sm font-semibold text-emerald-600 hover:text-emerald-700">
              Back to sign in
            </Link>
          </div>
        ) : (
          <form className="mt-8 space-y-4" onSubmit={handleSubmit(onSubmit)}>
            <div>
              <label className="mb-2 block text-sm font-medium text-slate-700">Email</label>
              <input
                {...register('email')}
                className="w-full rounded-2xl border border-slate-300 bg-white px-4 py-3 outline-none transition focus:border-emerald-500"
                placeholder="you@example.com"
              />
              {errors.email && <p className="mt-2 text-sm text-rose-600">{errors.email.message}</p>}
            </div>
            {error && <p className="rounded-2xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">{error}</p>}
            <button
              type="submit"
              disabled={isSubmitting}
              className="w-full rounded-2xl bg-slate-900 px-4 py-3 font-semibold text-white transition hover:bg-slate-700 disabled:cursor-not-allowed disabled:opacity-70"
            >
              {isSubmitting ? 'Sending...' : 'Send reset link'}
            </button>
          </form>
        )}

        <div className="mt-6 text-center text-sm text-slate-600">
          Remember your password?{' '}
          <Link href="/auth/login" className="font-semibold text-emerald-600 hover:text-emerald-700">
            Sign in
          </Link>
        </div>
      </div>
    </main>
  );
}
