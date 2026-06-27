'use client';

export default function PatientMedicalHistoryPage() {
  const missingApiMessage = 'The backend does not yet expose a patient medical history endpoint. This page is ready to consume it when available.';

  return (
    <section className="rounded-[28px] border border-slate-200 bg-white p-6 shadow-sm">
      <h2 className="text-2xl font-semibold">Medical history</h2>
      <p className="mt-2 text-slate-600">Review diagnoses, procedures, and clinical notes here once the backend exposes them.</p>
      <div className="mt-5 rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800">
        {missingApiMessage}
      </div>
      <div className="mt-6 grid gap-4 md:grid-cols-2">
        <div className="rounded-2xl border border-dashed border-slate-300 p-5 text-sm text-slate-600">
          Empty state: no medical history entries available yet.
        </div>
        <div className="rounded-2xl border border-dashed border-slate-300 p-5 text-sm text-slate-600">
          Loading and error states are isolated for the future API implementation.
        </div>
      </div>
    </section>
  );
}
