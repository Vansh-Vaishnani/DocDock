'use client';

import { useEffect, useState } from 'react';

import { useToast } from '../../auth/toast-provider';
import { fetchDoctorEarnings } from '../api';

export default function DoctorEarningsPage() {
  const { showToast } = useToast();
  const [totalEarnings, setTotalEarnings] = useState(0);
  const [payments, setPayments] = useState<Array<{ amount: number; paidAt?: string; status: string }>>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    void fetchDoctorEarnings()
      .then((data) => {
        setTotalEarnings(data.totalEarnings);
        setPayments(data.payments as Array<{ amount: number; paidAt?: string; status: string }>);
      })
      .catch((err: unknown) => showToast(err instanceof Error ? err.message : 'Unable to load earnings.', 'error'))
      .finally(() => setLoading(false));
  }, [showToast]);

  return (
    <section className="rounded-[28px] border border-slate-200 bg-white p-6 shadow-sm">
      <h2 className="text-2xl font-semibold">Earnings</h2>
      <p className="mt-2 text-slate-600">Track payments from completed appointments.</p>

      <div className="mt-6 rounded-2xl bg-slate-950 p-6 text-white">
        <p className="text-sm text-slate-300">Total earnings</p>
        <p className="mt-2 text-4xl font-semibold">{loading ? '...' : `₹${totalEarnings}`}</p>
      </div>

      {loading && <div className="mt-6 text-sm text-slate-600">Loading payments...</div>}

      {!loading && payments.length === 0 && (
        <div className="mt-6 rounded-2xl border border-dashed border-slate-300 p-6 text-center text-sm text-slate-600">
          No paid appointments yet.
        </div>
      )}

      <div className="mt-6 space-y-3">
        {payments.map((payment, index) => (
          <div key={index} className="flex items-center justify-between rounded-2xl border border-slate-200 p-4">
            <span className="text-sm text-slate-600">{payment.paidAt ? new Date(payment.paidAt).toLocaleDateString() : 'Paid'}</span>
            <span className="font-semibold text-slate-900">₹{payment.amount}</span>
          </div>
        ))}
      </div>
    </section>
  );
}
