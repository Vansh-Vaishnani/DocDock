'use client';

import { useAuth } from '../../auth/auth-context';

export default function AdminDashboardPage() {
  const { user } = useAuth();

  return (
    <section className="space-y-6">
      <div>
        <p className="text-sm font-semibold uppercase tracking-[0.35em] text-emerald-600">Admin dashboard</p>
        <h2 className="mt-3 text-3xl font-semibold">Welcome back, {user?.fullName || 'admin'}</h2>
        <p className="mt-2 text-slate-600">Monitor the platform and verify clinicians without changing the backend contract.</p>
      </div>

      <div className="grid gap-4 md:grid-cols-3">
        <div className="rounded-[24px] border border-slate-200 bg-slate-50 p-5">
          <p className="text-sm font-medium text-slate-500">Doctor verification</p>
          <p className="mt-2 text-2xl font-semibold text-slate-900">Ready</p>
          <p className="mt-2 text-sm text-slate-600">Pending doctors land in the approval flow before entering the doctor dashboard.</p>
        </div>
        <div className="rounded-[24px] border border-slate-200 bg-slate-50 p-5">
          <p className="text-sm font-medium text-slate-500">User session</p>
          <p className="mt-2 text-2xl font-semibold text-slate-900">Active</p>
          <p className="mt-2 text-sm text-slate-600">This dashboard uses the existing JWT session from the auth context.</p>
        </div>
        <div className="rounded-[24px] border border-slate-200 bg-slate-50 p-5">
          <p className="text-sm font-medium text-slate-500">Scope</p>
          <p className="mt-2 text-2xl font-semibold text-slate-900">Admin only</p>
          <p className="mt-2 text-sm text-slate-600">Patient and doctor routes continue to be protected by role-aware guards.</p>
        </div>
      </div>
    </section>
  );
}