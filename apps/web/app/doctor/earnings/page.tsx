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
    <div className="dd-card">
      <h2 className="text-2xl font-bold" style={{ color: 'var(--text-primary)' }}>Earnings</h2>
      <p className="mt-2 text-sm" style={{ color: 'var(--text-secondary)' }}>Track payments from completed appointments.</p>

      <div className="mt-6 rounded-2xl p-6 text-white" style={{ background: 'linear-gradient(135deg, #10b981 0%, #059669 100%)' }}>
        <p className="text-sm opacity-90">Total Earnings</p>
        <p className="mt-2 text-4xl font-extrabold">{loading ? '...' : `₹${totalEarnings}`}</p>
      </div>

      {loading && <div className="mt-6 text-sm" style={{ color: 'var(--text-secondary)' }}>Loading payments...</div>}

      {!loading && payments.length === 0 && (
        <div className="mt-6 rounded-2xl border border-dashed p-6 text-center text-sm" style={{ borderColor: 'var(--border-color)', color: 'var(--text-muted)' }}>
          No paid appointments yet.
        </div>
      )}

      <div className="mt-6 space-y-3">
        {payments.map((payment, index) => (
          <div key={index} className="flex items-center justify-between rounded-2xl border p-4" style={{ borderColor: 'var(--border-color)', backgroundColor: 'var(--bg-secondary)' }}>
            <span className="text-sm" style={{ color: 'var(--text-secondary)' }}>{payment.paidAt ? new Date(payment.paidAt).toLocaleDateString() : 'Paid'}</span>
            <span className="font-bold" style={{ color: 'var(--text-primary)' }}>₹{payment.amount}</span>
          </div>
        ))}
      </div>
    </div>
  );
}
