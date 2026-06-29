'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';

import { useAuth } from '../../auth/auth-context';
import { useToast } from '../../auth/toast-provider';

const schema = z.object({
  email: z.string().trim().min(1, 'Email is required').email('Enter a valid email address'),
  password: z.string().min(8, 'Password must be at least 8 characters')
});

type LoginForm = z.infer<typeof schema>;

export default function AdminLoginPage() {
  const router = useRouter();
  const { login, isHydrated, user, logout } = useAuth();
  const { showToast } = useToast();
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const { register, handleSubmit, formState: { errors } } = useForm<LoginForm>({ resolver: zodResolver(schema) });

  useEffect(() => {
    if (user && isHydrated) {
      if (user.role === 'admin') {
        router.replace('/admin/dashboard');
      } else {
        router.replace(user.role === 'patient' ? '/patient/dashboard' : '/doctor/dashboard');
      }
    }
  }, [isHydrated, router, user]);

  const onSubmit = async (values: LoginForm) => {
    setError(null);
    setIsSubmitting(true);
    try {
      const authenticatedUser = await login(values);
      if (authenticatedUser.role !== 'admin') {
        logout();
        const message = 'Access denied. Admin credentials required.';
        setError(message);
        showToast(message, 'error');
        return;
      }
      showToast(`Welcome, ${authenticatedUser.fullName}`, 'success');
      router.replace('/admin/dashboard');
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Login failed.';
      setError(message);
      showToast(message, 'error');
    } finally {
      setIsSubmitting(false);
    }
  };

  if (!isHydrated) return null;

  return (
    <main className="min-h-screen bg-[radial-gradient(circle_at_top,_#f8fafc,_#eef2ff_55%,_#f8fafc)] px-4 py-10 text-slate-900 sm:px-6 lg:px-8">
      <div className="mx-auto max-w-lg rounded-[32px] border border-slate-200/80 bg-white/90 p-8 shadow-[0_30px_80px_-30px_rgba(15,23,42,0.35)] backdrop-blur">
        <div className="mb-8">
          <p className="text-sm font-semibold uppercase tracking-[0.35em] text-emerald-600">Admin portal</p>
          <h1 className="mt-3 text-3xl font-semibold">DocDock Administration</h1>
          <p className="mt-2 text-slate-600">Sign in with an admin account to access the platform dashboard.</p>
        </div>

        <form className="space-y-4" onSubmit={handleSubmit(onSubmit)}>
          <div>
            <label className="mb-2 block text-sm font-medium text-slate-700">Email</label>
            <input {...register('email')} className="w-full rounded-2xl border border-slate-300 bg-white px-4 py-3 outline-none focus:border-emerald-500" placeholder="admin@example.com" />
            {errors.email && <p className="mt-2 text-sm text-rose-600">{errors.email.message}</p>}
          </div>
          <div>
            <label className="mb-2 block text-sm font-medium text-slate-700">Password</label>
            <input type="password" {...register('password')} className="w-full rounded-2xl border border-slate-300 bg-white px-4 py-3 outline-none focus:border-emerald-500" placeholder="Your password" />
            {errors.password && <p className="mt-2 text-sm text-rose-600">{errors.password.message}</p>}
          </div>
          {error && <p className="rounded-2xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">{error}</p>}
          <button type="submit" disabled={isSubmitting} className="w-full rounded-2xl bg-slate-900 px-4 py-3 font-semibold text-white transition hover:bg-slate-700 disabled:opacity-70">
            {isSubmitting ? 'Signing in…' : 'Sign in to admin'}
          </button>
        </form>

        <p className="mt-6 text-center text-sm text-slate-500">
          <Link href="/" className="font-semibold text-emerald-600 hover:underline">Back to home</Link>
        </p>
      </div>
    </main>
  );
}
