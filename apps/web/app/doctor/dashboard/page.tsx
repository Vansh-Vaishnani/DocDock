'use client';

import Link from 'next/link';
import { useEffect } from 'react';
import { useRouter } from 'next/navigation';

import { useAuth } from '../../auth/auth-context';

function MetricCard({ label, value, detail }: { label: string; value: string; detail: string }) {
  return (
    <div className="rounded-[24px] border border-slate-200 bg-white p-5 shadow-sm">
      <p className="text-sm font-medium text-slate-500">{label}</p>
      <p className="mt-2 text-3xl font-semibold text-slate-900">{value}</p>
      <p className="mt-2 text-sm text-slate-600">{detail}</p>
    </div>
  );
}

export default function DoctorDashboardPage() {
  const router = useRouter();
  const { user } = useAuth();

  useEffect(() => {
    if (user && user.isVerified === false) {
      router.replace('/doctor/pending-verification');
    }
  }, [router, user]);

  return (
    <div className="space-y-6">
      <section className="rounded-[28px] border border-slate-200 bg-white p-6 shadow-sm sm:p-8">
        <div className="flex flex-col gap-6 lg:flex-row lg:items-end lg:justify-between">
          <div className="max-w-3xl">
            <p className="text-sm font-semibold uppercase tracking-[0.35em] text-emerald-600">Doctor dashboard</p>
            <h2 className="mt-3 text-3xl font-semibold sm:text-4xl">Welcome back, {user?.fullName || 'doctor'}</h2>
            <p className="mt-3 text-lg text-slate-600">Review your schedule, profile, and availability from one place.</p>
          </div>
          <div className="flex flex-wrap gap-3">
            <Link href="/doctor/profile" className="rounded-full bg-slate-950 px-5 py-3 text-sm font-semibold text-white transition hover:bg-slate-800">View profile</Link>
            <Link href="/doctor/availability" className="rounded-full border border-slate-300 px-5 py-3 text-sm font-semibold text-slate-700 transition hover:bg-slate-100">Update availability</Link>
          </div>
        </div>
      </section>

      <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        <MetricCard label="Verification" value={user?.isVerified ? 'Verified' : 'Pending'} detail={user?.isVerified ? 'Your account is approved for patient access.' : 'Finish verification to unlock the full doctor workspace.'} />
        <MetricCard label="Appointments" value="0" detail="Appointment APIs will populate this view when available." />
        <MetricCard label="Availability" value="Open" detail="Keep your time slots current so patients can find you." />
        <MetricCard label="Profile" value="Ready" detail="Your public profile is available through the existing auth session." />
      </section>

      <section className="grid gap-6 lg:grid-cols-[1.2fr_0.8fr]">
        <div className="rounded-[28px] border border-slate-200 bg-white p-6 shadow-sm">
          <h3 className="text-xl font-semibold">Today’s focus</h3>
          <div className="mt-5 grid gap-4 sm:grid-cols-2">
            {[
              { title: 'Keep availability current', description: 'Update open slots before patients start booking.' },
              { title: 'Review appointment flow', description: 'Confirm upcoming visits and next actions.' },
              { title: 'Refresh your profile', description: 'Keep specialization and credentials up to date.' },
              { title: 'Check verification status', description: 'Pending doctors are routed here until approval.' }
            ].map((item) => (
              <div key={item.title} className="rounded-2xl border border-slate-200 p-4">
                <p className="font-semibold text-slate-900">{item.title}</p>
                <p className="mt-2 text-sm text-slate-600">{item.description}</p>
              </div>
            ))}
          </div>
        </div>

        <div className="rounded-[28px] bg-slate-950 p-6 text-white shadow-sm">
          <p className="text-sm font-semibold uppercase tracking-[0.35em] text-emerald-300">Doctor account</p>
          <h3 className="mt-3 text-2xl font-semibold">Verified access path</h3>
          <p className="mt-3 text-sm leading-6 text-slate-300">This dashboard stays on the current auth context and JWT session. It does not introduce any new backend flow.</p>
        </div>
      </section>
    </div>
  );
}