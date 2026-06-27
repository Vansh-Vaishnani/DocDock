'use client';

import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { Suspense } from 'react';
import { useEffect, useMemo, useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';

import { getRoleHomePath, useAuth } from '../auth-context';
import { useToast } from '../toast-provider';

const schema = z.object({
  email: z.string().trim().min(1, 'Email is required').email('Enter a valid email address'),
  password: z.string().min(8, 'Password must be at least 8 characters')
});

type LoginForm = z.infer<typeof schema>;

function LoginPageContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { login, isHydrated, user, rememberSession, setRememberSession } = useAuth();
  const { showToast } = useToast();
  const [error, setError] = useState<string | null>(null);
  const [showPassword, setShowPassword] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const { register, handleSubmit, formState: { errors } } = useForm<LoginForm>({ resolver: zodResolver(schema) });

  useEffect(() => {
    if (user && isHydrated) {
      router.replace(getRoleHomePath(user));
    }
  }, [isHydrated, router, user]);

  useEffect(() => {
    const message = searchParams.get('error');
    if (message === 'google_auth_failed') {
      showToast('Google sign-in failed. Please try again.', 'error');
    }
  }, [searchParams, showToast]);

  const onSubmit = async (values: LoginForm) => {
    setError(null);
    setIsSubmitting(true);
    try {
      const authenticatedUser = await login(values);
      showToast(`Welcome back, ${authenticatedUser.fullName}!`, 'success');
      router.replace(getRoleHomePath(authenticatedUser));
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Login failed. Please verify your credentials.';
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
            <p className="text-sm font-semibold uppercase tracking-[0.35em] text-emerald-600">Secure access</p>
            <h1 className="mt-3 text-3xl font-semibold sm:text-4xl">Welcome back to DocDock</h1>
            <p className="mt-3 max-w-2xl text-slate-600">Sign in to continue your care journey or manage your practice.</p>
          </div>
          <Link href="/" className="rounded-full border border-slate-300 px-4 py-2 text-sm font-semibold text-slate-700 transition hover:bg-slate-100">Back home</Link>
        </div>

        <div className="grid gap-8 lg:grid-cols-[1.1fr_0.9fr] lg:items-center">
          <div className="rounded-[28px] border border-slate-200 bg-slate-50 p-8">
            <h2 className="text-xl font-semibold">Sign in</h2>
            <form className="mt-6 space-y-4" onSubmit={handleSubmit(onSubmit)}>
              <div>
                <label className="mb-2 block text-sm font-medium text-slate-700">Email</label>
                <input {...register('email')} className="w-full rounded-2xl border border-slate-300 bg-white px-4 py-3 outline-none ring-0 transition focus:border-emerald-500" placeholder="you@example.com" />
                {errors.email && <p className="mt-2 text-sm text-rose-600">{errors.email.message}</p>}
              </div>
              <div>
                <label className="mb-2 block text-sm font-medium text-slate-700">Password</label>
                <div className="relative">
                  <input type={showPassword ? 'text' : 'password'} {...register('password')} className="w-full rounded-2xl border border-slate-300 bg-white px-4 py-3 pr-16 outline-none transition focus:border-emerald-500" placeholder="At least 8 characters" />
                  <button type="button" onClick={() => setShowPassword(!showPassword)} className="absolute right-3 top-1/2 -translate-y-1/2 text-sm font-semibold text-emerald-600">{showPassword ? 'Hide' : 'Show'}</button>
                </div>
                {errors.password && <p className="mt-2 text-sm text-rose-600">{errors.password.message}</p>}
              </div>
              <div className="flex items-center justify-between text-sm text-slate-600">
                <label className="flex items-center gap-2">
                  <input type="checkbox" checked={rememberSession} onChange={(event) => setRememberSession(event.target.checked)} className="h-4 w-4 rounded border-slate-300 text-emerald-600 focus:ring-emerald-500" />
                  Remember me
                </label>
                <a href="/auth/register" className="font-semibold text-emerald-600">Create account</a>
              </div>
              {error && <p className="rounded-2xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">{error}</p>}
              <button type="submit" disabled={isSubmitting} className="w-full rounded-2xl bg-slate-900 px-4 py-3 font-semibold text-white transition hover:bg-slate-700 disabled:cursor-not-allowed disabled:opacity-70">
                {isSubmitting ? 'Signing in…' : 'Sign in'}
              </button>
            </form>

            <div className="mt-6 flex items-center gap-3">
              <div className="h-px flex-1 bg-slate-200" />
              <span className="text-sm text-slate-500">or continue with</span>
              <div className="h-px flex-1 bg-slate-200" />
            </div>

            <a href={oauthUrl} className="mt-6 flex items-center justify-center gap-3 rounded-2xl border border-slate-300 bg-white px-4 py-3 font-semibold text-slate-700 transition hover:bg-slate-50">
              <span className="text-lg">G</span>
              Continue with Google
            </a>
          </div>

          <div className="rounded-[28px] bg-slate-900 p-8 text-white">
            <h2 className="text-xl font-semibold">Why patients and doctors choose DocDock</h2>
            <ul className="mt-6 space-y-4 text-sm text-slate-300">
              <li>• Secure sign-in with modern session handling</li>
              <li>• Fast access to verified clinicians and care updates</li>
              <li>• Dedicated doctor and patient experiences</li>
            </ul>
          </div>
        </div>
      </div>
    </main>
  );
}

export default function LoginPage() {
  return (
    <Suspense fallback={<div className="flex min-h-screen items-center justify-center bg-slate-50 text-slate-600">Loading…</div>}>
      <LoginPageContent />
    </Suspense>
  );
}
