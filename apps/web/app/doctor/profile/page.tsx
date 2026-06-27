'use client';

import Link from 'next/link';

import { useAuth } from '../../auth/auth-context';

export default function DoctorProfilePage() {
  const { user } = useAuth();

  return (
    <section className="grid gap-6 lg:grid-cols-[1fr_0.8fr]">
      <div className="rounded-[28px] border border-slate-200 bg-white p-6 shadow-sm">
        <p className="text-sm font-semibold uppercase tracking-[0.35em] text-emerald-600">Doctor profile</p>
        <h2 className="mt-3 text-2xl font-semibold">Practice identity</h2>
        <p className="mt-2 text-slate-600">Use the existing backend-backed session to keep your profile aligned with the current account.</p>

        <div className="mt-6 rounded-2xl border border-slate-200 p-5 text-sm text-slate-700">
          <p className="font-semibold text-slate-900">Name</p>
          <p className="mt-1">{user?.fullName || 'Doctor'}</p>
          <p className="mt-4 font-semibold text-slate-900">Email</p>
          <p className="mt-1 break-words">{user?.email}</p>
          <p className="mt-4 font-semibold text-slate-900">Verification</p>
          <p className="mt-1">{user?.isVerified ? 'Verified' : 'Pending verification'}</p>
        </div>
      </div>

      <div className="rounded-[28px] bg-slate-950 p-6 text-white shadow-sm">
        <h3 className="text-xl font-semibold">Profile scope</h3>
        <p className="mt-3 text-sm leading-6 text-slate-300">Profile editing will continue to use the real backend APIs when they are available. This page only reflects the authenticated session state.</p>
        <Link href="/doctor/dashboard" className="mt-6 inline-flex rounded-full bg-white px-5 py-3 text-sm font-semibold text-slate-950 transition hover:bg-slate-100">
          Back to dashboard
        </Link>
      </div>
    </section>
  );
}