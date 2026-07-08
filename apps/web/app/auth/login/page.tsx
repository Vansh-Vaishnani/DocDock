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
import { DarkModeToggle } from '../../theme-context';

const schema = z.object({
  email: z.string().trim().min(1, 'Email is required').email('Enter a valid email address'),
  password: z.string().min(8, 'Password must be at least 8 characters')
});

type LoginForm = z.infer<typeof schema>;

const features = [
  { icon: '🏥', text: 'Verified doctors, background-checked and credentials-reviewed' },
  { icon: '📍', text: 'Live GPS tracking so you know exactly when your doctor arrives' },
  { icon: '🔐', text: 'OTP-secured consultations for your privacy and safety' },
  { icon: '💊', text: 'Digital prescriptions and medical records in one place' },
];

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
    if (user && isHydrated) { router.replace(getRoleHomePath(user)); }
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

  const [isWarming, setIsWarming] = useState(false);

  const oauthUrl = useMemo(() => {
    const current = typeof window !== 'undefined' ? `${window.location.origin}/auth/google/callback` : '';
    return `${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000/api/v1'}/auth/google?redirect=${encodeURIComponent(current)}`;
  }, []);

  const handleGoogleLogin = async (e: React.MouseEvent) => {
    e.preventDefault();
    if (isWarming) return;
    setIsWarming(true);
    try {
      await fetch(`${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000/api/v1'}/health`).catch(() => {});
    } finally {
      window.location.href = oauthUrl;
    }
  };

  return (
    <div className="min-h-screen flex" style={{ backgroundColor: 'var(--bg-primary)' }}>
      {isWarming && (
        <div className="fixed inset-0 z-50 flex flex-col items-center justify-center bg-slate-900/60 backdrop-blur-sm animate-fade-in">
          <div className="dd-card max-w-xs p-6 text-center shadow-xl animate-scale-in flex flex-col items-center gap-4" style={{ backgroundColor: 'var(--card-bg)', borderColor: 'var(--border-color)' }}>
            <div className="h-10 w-10 animate-spin rounded-full border-4 border-emerald-500 border-t-transparent" />
            <p className="text-sm font-semibold" style={{ color: 'var(--text-primary)' }}>Connecting to secure servers...</p>
            <p className="text-xs" style={{ color: 'var(--text-muted)' }}>Waking up authentication servers. This may take a few seconds on first load.</p>
          </div>
        </div>
      )}
      {/* ── Left panel (branding) ─────────────── */}
      <div
        className="hidden lg:flex lg:w-[45%] flex-col justify-between p-10 xl:p-14"
        style={{ background: 'linear-gradient(150deg, #0f172a 0%, #1e3a5f 50%, #0f4c35 100%)' }}
      >
        {/* Logo */}
        <div className="flex items-center gap-2.5">
          <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-emerald-600">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M12 2a10 10 0 1 0 0 20 10 10 0 0 0 0-20z" /><path d="M12 8v4M12 16h.01" />
            </svg>
          </div>
          <div>
            <p className="text-base font-bold text-white leading-none">DocDock</p>
            <p className="text-[10px] text-slate-400 leading-none mt-0.5">Knock-Knock, your doctor is here.</p>
          </div>
        </div>

        {/* Main copy */}
        <div>
          <h1 className="text-3xl xl:text-4xl font-bold text-white leading-snug">
            Your health,<br />
            <span className="text-emerald-400">our priority.</span>
          </h1>
          <p className="mt-4 text-slate-300 text-sm leading-relaxed max-w-xs">
            Connecting patients with verified doctors for safe, convenient home consultations.
          </p>
          <ul className="mt-8 space-y-4">
            {features.map(f => (
              <li key={f.text} className="flex items-start gap-3">
                <span className="text-xl flex-shrink-0 mt-0.5">{f.icon}</span>
                <span className="text-sm text-slate-300 leading-relaxed">{f.text}</span>
              </li>
            ))}
          </ul>
        </div>

        <p className="text-xs text-slate-500">© {new Date().getFullYear()} DocDock. All rights reserved.</p>
      </div>

      {/* ── Right panel (form) ────────────────── */}
      <div className="flex flex-1 flex-col">
        {/* Top bar */}
        <div className="flex h-14 items-center justify-between px-6 border-b" style={{ borderColor: 'var(--border-color)' }}>
          {/* Logo for mobile */}
          <Link href="/" className="flex items-center gap-2 lg:hidden">
            <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-emerald-600">
              <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                <path d="M12 2a10 10 0 1 0 0 20 10 10 0 0 0 0-20z" /><path d="M12 8v4M12 16h.01" />
              </svg>
            </div>
            <span className="font-bold text-sm" style={{ color: 'var(--text-primary)' }}>DocDock</span>
          </Link>
          <div className="hidden lg:block" />
          <div className="flex items-center gap-3">
            <DarkModeToggle />
            <Link href="/" className="btn-ghost text-sm hidden sm:inline-flex">Home</Link>
            <Link href="/auth/register" className="btn-secondary text-sm">Create account</Link>
          </div>
        </div>

        {/* Form area */}
        <div className="flex flex-1 items-center justify-center p-6">
          <div className="w-full max-w-md animate-slide-up">
            <div className="mb-8">
              <h2 className="text-2xl font-bold" style={{ color: 'var(--text-primary)' }}>Welcome back</h2>
              <p className="mt-1.5 text-sm" style={{ color: 'var(--text-secondary)' }}>
                Sign in to your DocDock account to continue.
              </p>
            </div>

            {/* Google OAuth */}
            <button
              type="button"
              onClick={handleGoogleLogin}
              className="flex w-full items-center justify-center gap-3 rounded-xl border px-4 py-2.5 text-sm font-medium transition-all hover:bg-slate-50 dark:hover:bg-slate-800"
              style={{ borderColor: 'var(--border-color)', color: 'var(--text-primary)' }}
            >
              <svg width="18" height="18" viewBox="0 0 24 24">
                <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4"/>
                <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/>
                <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05"/>
                <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/>
              </svg>
              Continue with Google
            </button>

            <div className="my-6 flex items-center gap-3">
              <div className="h-px flex-1" style={{ backgroundColor: 'var(--border-color)' }} />
              <span className="text-xs font-medium" style={{ color: 'var(--text-muted)' }}>or sign in with email</span>
              <div className="h-px flex-1" style={{ backgroundColor: 'var(--border-color)' }} />
            </div>

            <form className="space-y-4" onSubmit={handleSubmit(onSubmit)}>
              {/* Email */}
              <div>
                <label className="dd-label">Email address</label>
                <input
                  {...register('email')}
                  type="email"
                  className="dd-input"
                  placeholder="you@example.com"
                  autoComplete="email"
                />
                {errors.email && <p className="mt-1.5 text-xs text-rose-600">{errors.email.message}</p>}
              </div>

              {/* Password */}
              <div>
                <label className="dd-label">Password</label>
                <div className="relative">
                  <input
                    type={showPassword ? 'text' : 'password'}
                    {...register('password')}
                    className="dd-input pr-16"
                    placeholder="Your password"
                    autoComplete="current-password"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-xs font-semibold text-emerald-600 hover:text-emerald-700 transition-colors"
                  >
                    {showPassword ? 'Hide' : 'Show'}
                  </button>
                </div>
                {errors.password && <p className="mt-1.5 text-xs text-rose-600">{errors.password.message}</p>}
              </div>

              {/* Remember me + Forgot */}
              <div className="flex items-center justify-between">
                <label className="flex items-center gap-2 text-sm cursor-pointer" style={{ color: 'var(--text-secondary)' }}>
                  <input
                    type="checkbox"
                    checked={rememberSession}
                    onChange={(e) => setRememberSession(e.target.checked)}
                    className="h-4 w-4 rounded border-slate-300 text-emerald-600 accent-emerald-600"
                  />
                  Remember me
                </label>
                <Link href="/auth/forgot-password" className="text-sm font-semibold text-emerald-600 hover:text-emerald-700 transition-colors">
                  Forgot password?
                </Link>
              </div>

              {/* Error */}
              {error && (
                <div className="rounded-xl border border-rose-200 bg-rose-50 dark:bg-rose-950/30 dark:border-rose-900 px-4 py-3 text-sm text-rose-600 dark:text-rose-400">
                  {error}
                </div>
              )}

              {/* Submit */}
              <button type="submit" disabled={isSubmitting} className="btn-primary w-full py-3 text-sm rounded-xl">
                {isSubmitting ? (
                  <span className="flex items-center justify-center gap-2">
                    <svg className="h-4 w-4 animate-spin" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                    </svg>
                    Signing in…
                  </span>
                ) : 'Sign in'}
              </button>
            </form>

            <p className="mt-6 text-center text-sm" style={{ color: 'var(--text-muted)' }}>
              Don't have an account?{' '}
              <Link href="/auth/register" className="font-semibold text-emerald-600 hover:text-emerald-700 transition-colors">
                Create one free
              </Link>
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}

export default function LoginPage() {
  return (
    <Suspense fallback={
      <div className="flex min-h-screen items-center justify-center" style={{ backgroundColor: 'var(--bg-primary)' }}>
        <div className="flex flex-col items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-emerald-600">
            <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M12 2a10 10 0 1 0 0 20 10 10 0 0 0 0-20z" /><path d="M12 8v4M12 16h.01" />
            </svg>
          </div>
          <p className="text-sm" style={{ color: 'var(--text-muted)' }}>Loading…</p>
        </div>
      </div>
    }>
      <LoginPageContent />
    </Suspense>
  );
}
