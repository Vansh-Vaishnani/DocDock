'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';

import { useAuth } from '../../auth/auth-context';
import { fetchDoctorDashboard, fetchDoctorReviews, type DoctorDashboard } from '../api';

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
  const { user } = useAuth();
  const [dashboard, setDashboard] = useState<DoctorDashboard | null>(null);
  const [reviews, setReviews] = useState<Array<{ _id: string; rating: number; comment: string; createdAt: string; patientName?: string }>>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const load = async () => {
      try {
        const dashboardData = await fetchDoctorDashboard();
        const doctorId = dashboardData.profile?._id;
        const reviewData = doctorId ? await fetchDoctorReviews(doctorId) : { reviews: [] };
        setDashboard(dashboardData);
        setReviews(reviewData.reviews || []);
      } catch (err: unknown) {
        setError(err instanceof Error ? err.message : 'Unable to load dashboard.');
      } finally {
        setLoading(false);
      }
    };

    void load();
  }, []);

  const stats = dashboard?.stats;
  const profile = dashboard?.profile;

  return (
    <div className="space-y-6">
      <section className="rounded-[28px] border border-slate-200 bg-white p-6 shadow-sm sm:p-8">
        <div className="flex flex-col gap-6 lg:flex-row lg:items-end lg:justify-between">
          <div className="max-w-3xl">
            <p className="text-sm font-semibold uppercase tracking-[0.35em] text-emerald-600">Doctor dashboard</p>
            <h2 className="mt-3 text-3xl font-semibold sm:text-4xl">Welcome back, {user?.fullName || profile?.fullName || 'doctor'}</h2>
            <p className="mt-3 text-lg text-slate-600">Review your schedule, profile, and availability from one place.</p>
          </div>
          <div className="flex flex-wrap gap-3">
            <Link href="/doctor/profile" className="rounded-full bg-slate-950 px-5 py-3 text-sm font-semibold text-white transition hover:bg-slate-800">View profile</Link>
            <Link href="/doctor/availability" className="rounded-full border border-slate-300 px-5 py-3 text-sm font-semibold text-slate-700 transition hover:bg-slate-100">Update availability</Link>
          </div>
        </div>
      </section>

      {error && <div className="rounded-[24px] border border-rose-200 bg-rose-50 px-5 py-4 text-sm text-rose-700">{error}</div>}

      <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        <MetricCard label="Today's appointments" value={loading ? '...' : String(stats?.todayAppointments ?? 0)} detail="Scheduled for today." />
        <MetricCard label="Upcoming" value={loading ? '...' : String(stats?.upcomingAppointments ?? 0)} detail="Future confirmed visits." />
        <MetricCard label="Verification" value={loading ? '...' : stats?.verificationStatus === 'approved' ? 'Verified' : 'Pending'} detail={stats?.verificationStatus === 'approved' ? 'You can accept appointments.' : 'Awaiting admin approval.'} />
        <MetricCard label="Profile completion" value={loading ? '...' : `${stats?.profileCompletionPercent ?? 0}%`} detail="Complete your profile to improve visibility." />
      </section>

      <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        <MetricCard label="Availability" value={loading ? '...' : stats?.availabilityStatus ? 'Online' : 'Offline'} detail="Toggle from the availability page." />
        <MetricCard label="Total patients" value={loading ? '...' : String(stats?.totalPatients ?? 0)} detail="Unique patients from completed visits." />
        <MetricCard label="Average rating" value={loading ? '...' : `${stats?.averageRating?.toFixed(1) ?? '0.0'} ★`} detail={`${stats?.reviewCount ?? 0} reviews`} />
        <MetricCard label="Total earnings" value={loading ? '...' : `₹${stats?.totalEarnings ?? 0}`} detail="From paid appointments." />
      </section>
    </div>
  );
}
