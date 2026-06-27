'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useEffect, useMemo, useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';

import { getRoleHomePath, useAuth } from '../auth-context';
import { useToast } from '../toast-provider';

const schema = z.object({
  fullName: z.string().trim().min(2, 'Full name is required'),
  email: z.string().trim().min(1, 'Email is required').email('Enter a valid email address'),
  phone: z.string().trim().min(10, 'Phone number must be at least 10 digits'),
  password: z.string().min(8, 'Password must be at least 8 characters'),
  role: z.enum(['patient', 'doctor'])
});

type RegisterForm = z.infer<typeof schema>;

export default function RegisterPage() {
  const router = useRouter();
  const { register: registerUser, isHydrated, user } = useAuth();
  const { showToast } = useToast();
  const [error, setError] = useState<string | null>(null);
  const [showPassword, setShowPassword] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const { register, handleSubmit, formState: { errors } } = useForm<RegisterForm>({ resolver: zodResolver(schema) });

  useEffect(() => {
    if (user && isHydrated) {
      router.replace(getRoleHomePath(user));
    }
  }, [isHydrated, router, user]);

  const onSubmit = async (values: RegisterForm) => {
    setError(null);
    setIsSubmitting(true);
    try {
      await registerUser(values);
      showToast('Account created successfully. Please sign in.', 'success');
      router.push('/auth/login');
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Registration failed. Please try again.';
      setError(message);
      showToast(message, 'error');
    } finally {
      setIsSubmitting(false);
    }
  };

  const oauthUrl = useMemo(() => {
    const current = typeof window !== 'undefined' ? `${window.location.origin}/auth/google/callback` : '';
    return `${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000/api/v1'}/auth/google?redirect=${encodeURIComponent(current)}`;
  }, []);

  return (
    <main className="min-h-screen bg-[radial-gradient(circle_at_top,_#f8fafc,_#eef2ff_55%,_#f8fafc)] px-4 py-10 text-slate-900 sm:px-6 lg:px-8">
      <div className="mx-auto flex max-w-6xl flex-col gap-8 rounded-[32px] border border-slate-200/80 bg-white/80 p-6 shadow-[0_30px_80px_-30px_rgba(15,23,42,0.35)] backdrop-blur xl:p-10">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div>
            <p className="text-sm font-semibold uppercase tracking-[0.35em] text-emerald-600">Join the platform</p>
            <h1 className="mt-3 text-3xl font-semibold sm:text-4xl">Create your DocDock account</h1>
            <p className="mt-3 max-w-2xl text-slate-600">Register as a patient or doctor and get started with secure, modern care access.</p>
          </div>
          <Link href="/" className="rounded-full border border-slate-300 px-4 py-2 text-sm font-semibold text-slate-700 transition hover:bg-slate-100">Back home</Link>
        </div>

        <div className="grid gap-8 lg:grid-cols-[1.1fr_0.9fr] lg:items-center">
          <div className="rounded-[28px] border border-slate-200 bg-slate-50 p-8">
            <h2 className="text-xl font-semibold">Create account</h2>
            <form className="mt-6 space-y-4" onSubmit={handleSubmit(onSubmit)}>
              <div>
                <label className="mb-2 block text-sm font-medium text-slate-700">Full name</label>
                <input {...register('fullName')} className="w-full rounded-2xl border border-slate-300 bg-white px-4 py-3 outline-none transition focus:border-emerald-500" placeholder="Alex Morgan" />
                {errors.fullName && <p className="mt-2 text-sm text-rose-600">{errors.fullName.message}</p>}
              </div>
              <div className="grid gap-4 sm:grid-cols-2">
                <div>
                  <label className="mb-2 block text-sm font-medium text-slate-700">Email</label>
                  <input {...register('email')} className="w-full rounded-2xl border border-slate-300 bg-white px-4 py-3 outline-none transition focus:border-emerald-500" placeholder="you@example.com" />
                  {errors.email && <p className="mt-2 text-sm text-rose-600">{errors.email.message}</p>}
                </div>
                <div>
                  <label className="mb-2 block text-sm font-medium text-slate-700">Phone</label>
                  <input {...register('phone')} className="w-full rounded-2xl border border-slate-300 bg-white px-4 py-3 outline-none transition focus:border-emerald-500" placeholder="+91 98765 43210" />
                  {errors.phone && <p className="mt-2 text-sm text-rose-600">{errors.phone.message}</p>}
                </div>
              </div>
              <div>
                <label className="mb-2 block text-sm font-medium text-slate-700">Password</label>
                <div className="relative">
                  <input type={showPassword ? 'text' : 'password'} {...register('password')} className="w-full rounded-2xl border border-slate-300 bg-white px-4 py-3 pr-16 outline-none transition focus:border-emerald-500" placeholder="At least 8 characters" />
                  <button type="button" onClick={() => setShowPassword(!showPassword)} className="absolute right-3 top-1/2 -translate-y-1/2 text-sm font-semibold text-emerald-600">{showPassword ? 'Hide' : 'Show'}</button>
                </div>
                {errors.password && <p className="mt-2 text-sm text-rose-600">{errors.password.message}</p>}
              </div>
              <div>
                <label className="mb-2 block text-sm font-medium text-slate-700">I am a</label>
                <select {...register('role')} className="w-full rounded-2xl border border-slate-300 bg-white px-4 py-3 outline-none transition focus:border-emerald-500">
                  <option value="patient">Patient</option>
                  <option value="doctor">Doctor</option>
                </select>
              </div>
              {error && <p className="rounded-2xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">{error}</p>}
              <button type="submit" disabled={isSubmitting} className="w-full rounded-2xl bg-slate-900 px-4 py-3 font-semibold text-white transition hover:bg-slate-700 disabled:cursor-not-allowed disabled:opacity-70">
                {isSubmitting ? 'Creating account…' : 'Create account'}
              </button>
            </form>

            <div className="mt-6 flex items-center gap-3">
              <div className="h-px flex-1 bg-slate-200" />
              <span className="text-sm text-slate-500">or sign up with</span>
              <div className="h-px flex-1 bg-slate-200" />
            </div>

            <a href={oauthUrl} className="mt-6 flex items-center justify-center gap-3 rounded-2xl border border-slate-300 bg-white px-4 py-3 font-semibold text-slate-700 transition hover:bg-slate-50">
              <span className="text-lg">G</span>
              Continue with Google
            </a>

            <p className="mt-6 text-center text-sm text-slate-600">
              Already have an account?{' '}
              <Link href="/auth/login" className="font-semibold text-emerald-600">Sign in</Link>
            </p>
          </div>

          <div className="rounded-[28px] bg-emerald-600 p-8 text-white">
            <h2 className="text-xl font-semibold">Everything you need to get started</h2>
            <ul className="mt-6 space-y-4 text-sm text-emerald-50">
              <li>• Secure account creation for patients and doctors</li>
              <li>• Fast onboarding with Google sign-in support</li>
              <li>• Smooth access to doctor discovery and care tools</li>
            </ul>
          </div>
        </div>
      </div>
    </main>
  );
}
