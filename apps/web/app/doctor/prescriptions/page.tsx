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
    <section className="rounded-[28px] border border-slate-200 bg-white p-6 shadow-sm">
      <h2 className="text-2xl font-semibold">Prescriptions</h2>
      <p className="mt-2 text-slate-600">View prescriptions you have issued.</p>

      {loading && <div className="mt-6 text-sm text-slate-600">Loading prescriptions...</div>}

      {!loading && prescriptions.length === 0 && (
        <div className="mt-6 rounded-2xl border border-dashed border-slate-300 p-6 text-center text-sm text-slate-600">
          No prescriptions yet.
        </div>
      )}

      <div className="mt-6 space-y-3">
        {prescriptions.map((rx) => (
          <div key={rx._id} className="rounded-2xl border border-slate-200 p-4">
            <p className="font-semibold text-slate-900">{rx.diagnosis}</p>
            <p className="text-sm text-slate-600">Patient: {rx.patientName ?? 'Patient'}</p>
            <p className="text-xs text-slate-500">{new Date(rx.issuedAt).toLocaleString()}</p>
          </div>
        ))}
      </div>
    </section>
  );
}
