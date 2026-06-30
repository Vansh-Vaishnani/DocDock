'use client';

import { useEffect, useState } from 'react';

import { useToast } from '../../auth/toast-provider';
import { fetchDoctorPrescriptions } from '../api';

type PrescriptionRow = {
  _id: string;
  diagnosis: string;
  issuedAt: string;
  patientName?: string;
};

export default function DoctorPrescriptionsPage() {
  const { showToast } = useToast();
  const [prescriptions, setPrescriptions] = useState<PrescriptionRow[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    void fetchDoctorPrescriptions()
      .then((data) => setPrescriptions(data as PrescriptionRow[]))
      .catch((err: unknown) => showToast(err instanceof Error ? err.message : 'Unable to load prescriptions.', 'error'))
      .finally(() => setLoading(false));
  }, [showToast]);

  return (
    <div className="dd-card">
      <h2 className="text-2xl font-bold" style={{ color: 'var(--text-primary)' }}>Prescriptions</h2>
      <p className="mt-2 text-sm" style={{ color: 'var(--text-secondary)' }}>View prescriptions you have issued.</p>

      {loading && <div className="mt-6 text-sm" style={{ color: 'var(--text-secondary)' }}>Loading prescriptions...</div>}

      {!loading && prescriptions.length === 0 && (
        <div className="mt-6 rounded-2xl border border-dashed p-6 text-center text-sm" style={{ borderColor: 'var(--border-color)', color: 'var(--text-muted)' }}>
          No prescriptions yet.
        </div>
      )}

      <div className="mt-6 space-y-3">
        {prescriptions.map((rx) => (
          <div key={rx._id} className="rounded-2xl border p-4" style={{ borderColor: 'var(--border-color)', backgroundColor: 'var(--bg-secondary)' }}>
            <p className="font-semibold" style={{ color: 'var(--text-primary)' }}>{rx.diagnosis}</p>
            <p className="text-sm mt-1" style={{ color: 'var(--text-secondary)' }}>Patient: {rx.patientName ?? 'Patient'}</p>
            <p className="text-xs mt-1" style={{ color: 'var(--text-muted)' }}>{new Date(rx.issuedAt).toLocaleString()}</p>
          </div>
        ))}
      </div>
    </div>
  );
}
