'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';

import { useAuth } from '../../../auth/auth-context';
import { fetchDashboard, type DashboardOverview } from '../../api';
import { BarChart, formatCurrency, StatCard } from '../../_components/admin-ui';
import { SkeletonGrid } from '@/components/ui';

// ─── Icons ───────────────────────────────────────────────────
function Icon({ path, size = 18 }: { path: string; size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <path d={path} />
    </svg>
  );
}

const quickActions = [
  { label: 'Verify Doctors', href: '/admin/doctors', icon: 'M9 12l2 2 4-4m6 2a9 9 0 1 1-18 0 9 9 0 0 1 18 0z', color: 'text-emerald-600 bg-emerald-50 dark:bg-emerald-950/40' },
  { label: 'Manage Users', href: '/admin/users', icon: 'M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2 M23 21v-2a4 4 0 0 0-3-3.87 M16 3.13a4 4 0 0 1 0 7.75', color: 'text-blue-600 bg-blue-50 dark:bg-blue-950/40' },
  { label: 'Appointments', href: '/admin/appointments', icon: 'M8 6h13M8 12h13M8 18h13M3 6h.01M3 12h.01M3 18h.01', color: 'text-violet-600 bg-violet-50 dark:bg-violet-950/40' },
  { label: 'Payments', href: '/admin/payments', icon: 'M12 1v22M17 5H9.5a3.5 3.5 0 1 0 0 7h5a3.5 3.5 0 1 1 0 7H6', color: 'text-amber-600 bg-amber-50 dark:bg-amber-950/40' },
  { label: 'Analytics', href: '/admin/analytics', icon: 'M18 20V10M12 20V4M6 20v-6', color: 'text-teal-600 bg-teal-50 dark:bg-teal-950/40' },
  { label: 'Audit Logs', href: '/admin/audit-logs', icon: 'M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z M14 2v6h6 M16 13H8 M16 17H8 M10 9H8', color: 'text-slate-600 bg-slate-100 dark:bg-slate-800' },
];

export default function AdminDashboardPage() {
  const { user } = useAuth();
  const [data, setData] = useState<DashboardOverview | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    void fetchDashboard()
      .then(setData)
      .catch((err: unknown) => setError(err instanceof Error ? err.message : 'Failed to load dashboard'))
      .finally(() => setLoading(false));
  }, []);

  const firstName = (user?.fullName || 'Admin').split(' ')[0];
  const hour = new Date().getHours();
  const greeting = hour < 12 ? 'Good morning' : hour < 17 ? 'Good afternoon' : 'Good evening';

  return (
    <div className="space-y-6">
      {/* ── Welcome Hero ──────────────────────────── */}
      <div
        className="relative overflow-hidden rounded-3xl p-6 text-white sm:p-8"
        style={{ background: 'linear-gradient(135deg, #3730a3 0%, #1e293b 100%)' }}
      >
        <div className="absolute inset-0 overflow-hidden pointer-events-none" aria-hidden="true">
          <div className="absolute -right-16 -top-16 h-64 w-64 rounded-full bg-violet-500/20 blur-3xl" />
          <div className="absolute -bottom-12 -left-12 h-48 w-48 rounded-full bg-blue-500/15 blur-3xl" />
        </div>
        <div className="relative flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <p className="text-sm text-violet-200">{greeting},</p>
            <h1 className="mt-0.5 text-2xl font-bold sm:text-3xl">{firstName} 🛡️</h1>
            <p className="mt-2 text-sm text-slate-300 max-w-md">Platform administration — verify doctors, manage users, and monitor health metrics.</p>
          </div>
          <div className="flex flex-wrap gap-3">
            <Link href="/admin/doctors" className="inline-flex items-center gap-2 rounded-full bg-violet-500 px-4 py-2.5 text-sm font-semibold text-white hover:bg-violet-400 transition">
              Verify Doctors
            </Link>
            <Link href="/admin/users" className="inline-flex items-center gap-2 rounded-full bg-white/10 border border-white/20 px-4 py-2.5 text-sm font-semibold text-white hover:bg-white/20 transition">
              Manage Users
            </Link>
          </div>
        </div>
      </div>

      {/* Error */}
      {error && (
        <div className="rounded-2xl border border-rose-200 bg-rose-50 dark:bg-rose-950/30 dark:border-rose-900 px-4 py-3 text-sm text-rose-700 dark:text-rose-400">
          {error}
        </div>
      )}

      {/* ── KPI stats ─────────────────────────────── */}
      {loading ? (
        <SkeletonGrid count={8} />
      ) : (
        <>
          <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
            <StatCard
              label="Total Patients"
              value={data?.totalPatients ?? 0}
              icon="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2 M12 11a4 4 0 1 0 0-8 4 4 0 0 0 0 8z"
              color="text-blue-600 bg-blue-50 dark:bg-blue-950/40"
            />
            <StatCard
              label="Total Doctors"
              value={data?.totalDoctors ?? 0}
              icon="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2 M23 21v-2a4 4 0 0 0-3-3.87 M16 3.13a4 4 0 0 1 0 7.75"
              color="text-emerald-600 bg-emerald-50 dark:bg-emerald-950/40"
            />
            <StatCard
              label="Verified Doctors"
              value={data?.verifiedDoctors ?? 0}
              icon="M9 12l2 2 4-4m6 2a9 9 0 1 1-18 0 9 9 0 0 1 18 0z"
              color="text-teal-600 bg-teal-50 dark:bg-teal-950/40"
            />
            <StatCard
              label="Pending Verifications"
              value={data?.pendingDoctorVerifications ?? 0}
              icon="M12 9v4M12 17h.01 M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"
              color={`${(data?.pendingDoctorVerifications ?? 0) > 0 ? 'text-amber-600 bg-amber-50 dark:bg-amber-950/40' : 'text-slate-500 bg-slate-100 dark:bg-slate-800'}`}
            />
          </div>

          <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
            <StatCard
              label="Total Appointments"
              value={data?.totalAppointments ?? 0}
              icon="M8 6h13M8 12h13M8 18h13M3 6h.01M3 12h.01M3 18h.01"
              color="text-violet-600 bg-violet-50 dark:bg-violet-950/40"
            />
            <StatCard
              label="Today's Appointments"
              value={data?.todaysAppointments ?? 0}
              icon="M12 2a10 10 0 1 0 0 20 10 10 0 0 0 0-20z M12 6v6l4 2"
              color="text-indigo-600 bg-indigo-50 dark:bg-indigo-950/40"
            />
            <StatCard
              label="Total Revenue"
              value={formatCurrency(data?.totalRevenue ?? 0)}
              icon="M12 1v22M17 5H9.5a3.5 3.5 0 1 0 0 7h5a3.5 3.5 0 1 1 0 7H6"
              color="text-emerald-600 bg-emerald-50 dark:bg-emerald-950/40"
            />
            <StatCard
              label="Total Refunds"
              value={formatCurrency(data?.totalRefunds ?? 0)}
              detail={data ? `${data.refundCount} refunds` : undefined}
              icon="M19 14l-7 7m0 0l-7-7m7 7V3"
              color="text-rose-600 bg-rose-50 dark:bg-rose-950/40"
            />
          </div>
        </>
      )}

      {/* ── Charts ────────────────────────────────── */}
      {!loading && data && (
        <div className="grid gap-5 lg:grid-cols-2">
          <div className="dd-card">
            <h3 className="mb-4 text-sm font-semibold" style={{ color: 'var(--text-primary)' }}>Appointments — Last 7 Days</h3>
            <BarChart data={data.charts.appointmentsLast7Days ?? []} labelKey="date" valueKey="count" />
          </div>
          <div className="dd-card">
            <h3 className="mb-4 text-sm font-semibold" style={{ color: 'var(--text-primary)' }}>Revenue — Last 7 Days</h3>
            <BarChart data={data.charts.revenueLast7Days ?? []} labelKey="date" valueKey="amount" formatValue={(v) => `₹${v}`} />
          </div>
        </div>
      )}

      {/* ── Rating stat ───────────────────────────── */}
      {!loading && data && (
        <div className="grid gap-4 sm:grid-cols-3">
          <StatCard
            label="Average Rating"
            value={`${data.averageRating ?? 0} ★`}
            detail="Across all reviews"
            icon="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z"
            color="text-amber-600 bg-amber-50 dark:bg-amber-950/40"
          />
          <StatCard
            label="Completed Appointments"
            value={data.completedAppointments ?? 0}
            icon="M9 12l2 2 4-4m6 2a9 9 0 1 1-18 0 9 9 0 0 1 18 0z"
            color="text-emerald-600 bg-emerald-50 dark:bg-emerald-950/40"
          />
          <StatCard
            label="Cancelled Appointments"
            value={data.cancelledAppointments ?? 0}
            icon="M10 14l2-2m0 0l2-2m-2 2l-2-2m2 2l2 2m7-2a9 9 0 1 1-18 0 9 9 0 0 1 18 0z"
            color="text-rose-600 bg-rose-50 dark:bg-rose-950/40"
          />
        </div>
      )}
    </div>
  );
}
