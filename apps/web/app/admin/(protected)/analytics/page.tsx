'use client';

import { useEffect, useState } from 'react';

import { useToast } from '../../../auth/toast-provider';
import { fetchAnalytics } from '../../api';
import { BarChart } from '../../_components/admin-ui';

export default function AdminAnalyticsPage() {
  const { showToast } = useToast();
  const [loading, setLoading] = useState(true);
  const [data, setData] = useState<Awaited<ReturnType<typeof fetchAnalytics>> | null>(null);

  useEffect(() => {
    void fetchAnalytics()
      .then(setData)
      .catch((err: unknown) => showToast(err instanceof Error ? err.message : 'Failed to load analytics', 'error'))
      .finally(() => setLoading(false));
  }, [showToast]);

  return (
    <section className="space-y-6">
      <div>
        <h2 className="text-2xl font-semibold">Analytics</h2>
        <p className="mt-1 text-slate-600">Platform trends and performance insights.</p>
      </div>

      {loading ? (
        <p className="text-slate-500">Loading analytics…</p>
      ) : (
        <div className="grid gap-6 lg:grid-cols-2">
          <div className="rounded-[24px] border border-slate-200 bg-slate-50 p-5">
            <h3 className="font-semibold">Appointments per day (30d)</h3>
            <div className="mt-4"><BarChart data={data?.appointmentsPerDay ?? []} labelKey="date" valueKey="count" /></div>
          </div>
          <div className="rounded-[24px] border border-slate-200 bg-slate-50 p-5">
            <h3 className="font-semibold">Revenue per month</h3>
            <div className="mt-4"><BarChart data={data?.revenuePerMonth ?? []} labelKey="month" valueKey="revenue" formatValue={(v) => `₹${v}`} /></div>
          </div>
          <div className="rounded-[24px] border border-slate-200 bg-slate-50 p-5">
            <h3 className="font-semibold">New users growth (30d)</h3>
            <div className="mt-4"><BarChart data={data?.newUsersGrowth ?? []} labelKey="date" valueKey="count" /></div>
          </div>
          <div className="rounded-[24px] border border-slate-200 bg-slate-50 p-5">
            <h3 className="font-semibold">Top specializations</h3>
            <ul className="mt-4 space-y-2">
              {(data?.topSpecializations ?? []).map((item) => (
                <li key={item.specialization} className="flex justify-between text-sm">
                  <span>{item.specialization}</span>
                  <span className="font-semibold">{item.count}</span>
                </li>
              ))}
            </ul>
          </div>
          <div className="rounded-[24px] border border-slate-200 bg-slate-50 p-5">
            <h3 className="font-semibold">Top rated doctors</h3>
            <ul className="mt-4 space-y-2">
              {(data?.topRatedDoctors ?? []).map((item) => (
                <li key={item.name + item.specialization} className="flex justify-between gap-4 text-sm">
                  <span>{item.name} · {item.specialization}</span>
                  <span className="font-semibold">{item.averageRating}★ ({item.reviewCount})</span>
                </li>
              ))}
            </ul>
          </div>
          <div className="rounded-[24px] border border-slate-200 bg-slate-50 p-5">
            <h3 className="font-semibold">Most active cities</h3>
            <ul className="mt-4 space-y-2">
              {(data?.mostActiveCities ?? []).map((item) => (
                <li key={item.city} className="flex justify-between text-sm">
                  <span>{item.city}</span>
                  <span className="font-semibold">{item.count}</span>
                </li>
              ))}
            </ul>
          </div>
        </div>
      )}
    </section>
  );
}
