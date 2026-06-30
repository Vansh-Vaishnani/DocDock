'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useEffect, useMemo, useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';

import { getRoleHomePath, useAuth } from '../auth-context';
import { useToast } from '../toast-provider';
import { DarkModeToggle } from '../../theme-context';

const schema = z.object({
  fullName: z.string().trim().min(2, 'Full name is required'),
  email: z.string().trim().min(1, 'Email is required').email('Enter a valid email address'),
  phone: z.string().trim().min(10, 'Phone number must be at least 10 digits'),
  password: z.string().min(8, 'Password must be at least 8 characters')
});

type RegisterForm = z.infer<typeof schema>;

const roleOptions = [
  { id: 'patient', label: 'Patient', emoji: '🧑‍⚕️', desc: 'Book home visits and manage your health' },
  { id: 'doctor', label: 'Doctor', emoji: '👨‍⚕️', desc: 'Manage appointments and prescriptions' },
];
export default function RegisterPage() {
  const router = useRouter();
  const { register: registerUser, isHydrated, user } = useAuth();
  const { showToast } = useToast();
  const [error, setError] = useState<string | null>(null);
  const [showPassword, setShowPassword] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [selectedRole, setSelectedRole] = useState<'patient' | 'doctor'>('patient');
  const { register, handleSubmit, formState: { errors }, watch } = useForm<RegisterForm>({ resolver: zodResolver(schema) });

  useEffect(() => {
    if (user && isHydrated) { router.replace(getRoleHomePath(user)); }
  }, [isHydrated, router, user]);

  useEffect(() => {
    if (typeof window !== 'undefined') {
      const params = new URLSearchParams(window.location.search);
      if (params.get('role') === 'doctor') {
        router.replace('/auth/register/doctor');
      }
    }
  }, [router]);

  const onSubmit = async (values: RegisterForm) => {
    setError(null);
    setIsSubmitting(true);
    try {
      await registerUser({ ...values, role: selectedRole });
      showToast('Account created! Please sign in.', 'success');
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

  const password = watch('password') || '';
  const passwordStrength = password.length === 0 ? 0 : password.length < 8 ? 1 : password.length < 12 ? 2 : 3;
  const strengthLabel = ['', 'Weak', 'Good', 'Strong'];
  const strengthColor = ['', 'bg-rose-500', 'bg-amber-500', 'bg-emerald-500'];

  return (
    <div className="min-h-screen flex" style={{ backgroundColor: 'var(--bg-primary)' }}>
      {/* ── Left branding panel ────────────────── */}
      <div
        className="hidden lg:flex lg:w-[42%] flex-col justify-between p-10 xl:p-14"
        style={{ background: 'linear-gradient(150deg, #0f172a 0%, #0f4c35 60%, #1e3a5f 100%)' }}
      >
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

        <div>
          <h1 className="text-3xl xl:text-4xl font-bold text-white leading-snug">
            Join thousands<br />
            <span className="text-emerald-400">already on DocDock.</span>
          </h1>
          <p className="mt-4 text-slate-300 text-sm leading-relaxed max-w-xs">
            Create your account in under 2 minutes and start your healthcare journey today.
          </p>
          <div className="mt-8 grid grid-cols-2 gap-3">
            {[['10,000+', 'Consultations'], ['500+', 'Verified Doctors'], ['50+', 'Specialties'], ['4.8★', 'Avg Rating']].map(([val, label]) => (
              <div key={label} className="rounded-2xl bg-white/10 p-4 text-center">
                <p className="text-xl font-bold text-emerald-400">{val}</p>
                <p className="text-xs text-slate-400 mt-0.5">{label}</p>
              </div>
            ))}
          </div>
        </div>

        <p className="text-xs text-slate-500">© {new Date().getFullYear()} DocDock. All rights reserved.</p>
      </div>

      {/* ── Right form panel ───────────────────── */}
      <div className="flex flex-1 flex-col">
        <div className="flex h-14 items-center justify-between px-6 border-b" style={{ borderColor: 'var(--border-color)' }}>
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
            <Link href="/auth/login" className="btn-secondary text-sm">Sign in</Link>
          </div>
        </div>

        <div className="flex flex-1 items-center justify-center p-6">
          <div className="w-full max-w-md animate-slide-up">
            <div className="mb-6">
              <h2 className="text-2xl font-bold" style={{ color: 'var(--text-primary)' }}>Create account</h2>
              <p className="mt-1.5 text-sm" style={{ color: 'var(--text-secondary)' }}>
                Free forever. No credit card required.
              </p>
            </div>

            {/* Role selector */}
            <div className="grid grid-cols-2 gap-3 mb-6">
              {roleOptions.map((opt) => (
                <button
                  key={opt.id}
                  type="button"
                  onClick={() => {
                    if (opt.id === 'doctor') {
                      router.replace('/auth/register/doctor');
                    } else {
                      setSelectedRole(opt.id as 'patient' | 'doctor');
                    }
                  }}
                  className={`flex flex-col items-center gap-1.5 rounded-xl border-2 p-3.5 text-center transition-all ${
                    selectedRole === opt.id
                      ? 'border-emerald-500 bg-emerald-50 dark:bg-emerald-950/30'
                      : 'border-transparent hover:border-slate-300 dark:hover:border-slate-700'
                  }`}
                  style={{ backgroundColor: selectedRole !== opt.id ? 'var(--bg-tertiary)' : undefined }}
                >
                  <span className="text-2xl">{opt.emoji}</span>
                  <span className="text-xs font-semibold" style={{ color: selectedRole === opt.id ? '#10b981' : 'var(--text-primary)' }}>{opt.label}</span>
                  <span className="text-[10px] leading-tight" style={{ color: 'var(--text-muted)' }}>{opt.desc}</span>
                </button>
              ))}
            </div>

            {/* Google OAuth */}
            <a
              href={oauthUrl}
              className="flex w-full items-center justify-center gap-3 rounded-xl border px-4 py-2.5 text-sm font-medium transition-all hover:bg-slate-50 dark:hover:bg-slate-800 mb-5"
              style={{ borderColor: 'var(--border-color)', color: 'var(--text-primary)' }}
            >
              <svg width="18" height="18" viewBox="0 0 24 24">
                <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4"/>
                <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/>
                <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05"/>
                <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/>
              </svg>
              Continue with Google
            </a>

            <div className="mb-5 flex items-center gap-3">
              <div className="h-px flex-1" style={{ backgroundColor: 'var(--border-color)' }} />
              <span className="text-xs font-medium" style={{ color: 'var(--text-muted)' }}>or register with email</span>
              <div className="h-px flex-1" style={{ backgroundColor: 'var(--border-color)' }} />
            </div>

            <form className="space-y-4" onSubmit={handleSubmit(onSubmit)}>
              <div>
                <label className="dd-label">Full name <span className="text-rose-500">*</span></label>
                <input {...register('fullName')} className="dd-input" placeholder="Alex Morgan" autoComplete="name" />
                {errors.fullName && <p className="mt-1.5 text-xs text-rose-600">{errors.fullName.message}</p>}
              </div>

              <div className="grid gap-4 sm:grid-cols-2">
                <div>
                  <label className="dd-label">Email <span className="text-rose-500">*</span></label>
                  <input {...register('email')} type="email" className="dd-input" placeholder="you@example.com" autoComplete="email" />
                  {errors.email && <p className="mt-1.5 text-xs text-rose-600">{errors.email.message}</p>}
                </div>
                <div>
                  <label className="dd-label">Phone <span className="text-rose-500">*</span></label>
                  <input {...register('phone')} type="tel" className="dd-input" placeholder="+91 98765 43210" autoComplete="tel" />
                  {errors.phone && <p className="mt-1.5 text-xs text-rose-600">{errors.phone.message}</p>}
                </div>
              </div>

              <div>
                <label className="dd-label">Password <span className="text-rose-500">*</span></label>
                <div className="relative">
                  <input
                    type={showPassword ? 'text' : 'password'}
                    {...register('password')}
                    className="dd-input pr-16"
                    placeholder="Min 8 characters"
                    autoComplete="new-password"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-xs font-semibold text-emerald-600 hover:text-emerald-700 transition-colors"
                  >
                    {showPassword ? 'Hide' : 'Show'}
                  </button>
                </div>
                {/* Strength indicator */}
                {password.length > 0 && (
                  <div className="mt-2 flex items-center gap-2">
                    <div className="flex flex-1 gap-1">
                      {[1, 2, 3].map(n => (
                        <div key={n} className={`h-1.5 flex-1 rounded-full transition-all ${n <= passwordStrength ? strengthColor[passwordStrength] : 'bg-slate-200 dark:bg-slate-700'}`} />
                      ))}
                    </div>
                    <span className="text-xs font-medium" style={{ color: 'var(--text-muted)' }}>{strengthLabel[passwordStrength]}</span>
                  </div>
                )}
                {errors.password && <p className="mt-1.5 text-xs text-rose-600">{errors.password.message}</p>}
              </div>

              {error && (
                <div className="rounded-xl border border-rose-200 bg-rose-50 dark:bg-rose-950/30 dark:border-rose-900 px-4 py-3 text-sm text-rose-600 dark:text-rose-400">
                  {error}
                </div>
              )}

              <button type="submit" disabled={isSubmitting} className="btn-primary w-full py-3 text-sm rounded-xl">
                {isSubmitting ? (
                  <span className="flex items-center justify-center gap-2">
                    <svg className="h-4 w-4 animate-spin" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                    </svg>
                    Creating account…
                  </span>
                ) : `Create ${selectedRole} account`}
              </button>
            </form>

            <p className="mt-5 text-center text-sm" style={{ color: 'var(--text-muted)' }}>
              Already have an account?{' '}
              <Link href="/auth/login" className="font-semibold text-emerald-600 hover:text-emerald-700 transition-colors">
                Sign in
              </Link>
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
