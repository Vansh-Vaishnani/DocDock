'use client';

import { useEffect, useState } from 'react';

import { useAuth } from '../../../auth/auth-context';
import { fetchDashboard, type DashboardOverview } from '../../api';
import { BarChart, formatCurrency, StatCard } from '../../_components/admin-ui';

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

  return (
    <section className="space-y-6">
      <div>
        <p className="text-sm font-semibold uppercase tracking-[0.35em] text-emerald-600">Overview</p>
        <h2 className="mt-2 text-3xl font-semibold">Welcome back, {user?.fullName || 'Admin'}</h2>
        <p className="mt-2 text-slate-600">Live platform metrics from the DocDock API.</p>
      </div>

      {error && <p className="rounded-2xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">{error}</p>}

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard label="Total patients" value={loading ? '…' : data?.totalPatients ?? 0} />
        <StatCard label="Total doctors" value={loading ? '…' : data?.totalDoctors ?? 0} />
        <StatCard label="Verified doctors" value={loading ? '…' : data?.verifiedDoctors ?? 0} />
        <StatCard label="Pending verifications" value={loading ? '…' : data?.pendingDoctorVerifications ?? 0} />
        <StatCard label="Total appointments" value={loading ? '…' : data?.totalAppointments ?? 0} />
        <StatCard label="Today's appointments" value={loading ? '…' : data?.todaysAppointments ?? 0} />
        <StatCard label="Completed" value={loading ? '…' : data?.completedAppointments ?? 0} />
        <StatCard label="Cancelled" value={loading ? '…' : data?.cancelledAppointments ?? 0} />
        <StatCard label="Total revenue" value={loading ? '…' : formatCurrency(data?.totalRevenue ?? 0)} />
        <StatCard label="Total refunds" value={loading ? '…' : formatCurrency(data?.totalRefunds ?? 0)} detail={data ? `${data.refundCount} refunds` : undefined} />
        <StatCard label="Average rating" value={loading ? '…' : data?.averageRating ?? 0} detail="Across all reviews" />
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <div className="rounded-[24px] border border-slate-200 bg-slate-50 p-5">
          <h3 className="font-semibold text-slate-900">Appointments (last 7 days)</h3>
          <div className="mt-4">
            <BarChart data={data?.charts.appointmentsLast7Days ?? []} labelKey="date" valueKey="count" />
          </div>
        </div>
        <div className="rounded-[24px] border border-slate-200 bg-slate-50 p-5">
          <h3 className="font-semibold text-slate-900">Revenue (last 7 days)</h3>
          <div className="mt-4">
            <BarChart data={data?.charts.revenueLast7Days ?? []} labelKey="date" valueKey="amount" formatValue={(v) => `₹${v}`} />
          </div>
        </div>
      </div>
    </section>
  );
}
