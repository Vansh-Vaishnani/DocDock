'use client';

import { useEffect, useState } from 'react';

import { useToast } from '../../../auth/toast-provider';
import { fetchPayments } from '../../api';
import { BarChart, formatCurrency, formatDate, StatCard } from '../../_components/admin-ui';

export default function AdminPaymentsPage() {
  const { showToast } = useToast();
  const [period, setPeriod] = useState<'daily' | 'weekly' | 'monthly'>('daily');
  const [loading, setLoading] = useState(true);
  const [data, setData] = useState<Awaited<ReturnType<typeof fetchPayments>> | null>(null);

  useEffect(() => {
    setLoading(true);
    void fetchPayments(period)
      .then(setData)
      .catch((err: unknown) => showToast(err instanceof Error ? err.message : 'Failed to load payments', 'error'))
      .finally(() => setLoading(false));
  }, [period, showToast]);

  return (
    <section className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-semibold">Payment dashboard</h2>
          <p className="mt-1 text-slate-600">Revenue, refunds, and latest transactions.</p>
        </div>
        <div className="flex gap-2">
          {(['daily', 'weekly', 'monthly'] as const).map((item) => (
            <button
              key={item}
              type="button"
              onClick={() => setPeriod(item)}
              className={`rounded-full px-4 py-2 text-sm font-medium capitalize ${period === item ? 'bg-emerald-600 text-white' : 'border border-slate-300 text-slate-700'}`}
            >
              {item}
            </button>
          ))}
        </div>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-5">
        <StatCard label="Total revenue" value={loading ? '…' : formatCurrency(data?.totalRevenue ?? 0)} />
        <StatCard label="Refund amount" value={loading ? '…' : formatCurrency(data?.refundAmount ?? 0)} />
        <StatCard label="Refund count" value={loading ? '…' : data?.refundCount ?? 0} />
        <StatCard label="Pending payments" value={loading ? '…' : data?.pendingPayments ?? 0} />
        <StatCard label="Completed payments" value={loading ? '…' : data?.completedPayments ?? 0} />
      </div>

      <div className="rounded-[24px] border border-slate-200 bg-slate-50 p-5">
        <h3 className="font-semibold text-slate-900">Revenue chart</h3>
        <div className="mt-4">
          <BarChart data={data?.chart ?? []} labelKey="label" valueKey="revenue" formatValue={(v) => `₹${v}`} />
        </div>
      </div>

      <div className="overflow-x-auto rounded-[24px] border border-slate-200">
        <table className="min-w-full text-left text-sm">
          <thead className="bg-slate-50 text-slate-500">
            <tr>
              <th className="px-4 py-3 font-medium">Date</th>
              <th className="px-4 py-3 font-medium">Patient</th>
              <th className="px-4 py-3 font-medium">Amount</th>
              <th className="px-4 py-3 font-medium">Status</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr><td colSpan={4} className="px-4 py-8 text-center text-slate-500">Loading…</td></tr>
            ) : !data?.latestTransactions.length ? (
              <tr><td colSpan={4} className="px-4 py-8 text-center text-slate-500">No transactions yet.</td></tr>
            ) : data.latestTransactions.map((tx) => (
              <tr key={tx._id} className="border-t border-slate-100">
                <td className="px-4 py-3">{formatDate(tx.createdAt)}</td>
                <td className="px-4 py-3">{tx.patientName}</td>
                <td className="px-4 py-3">{formatCurrency(tx.amount)}</td>
                <td className="px-4 py-3 capitalize">{tx.status}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </section>
  );
}
