'use client';

export default function PatientSettingsPage() {
  const missingApiMessage = 'Account settings APIs are not yet available in the backend. This page is intentionally wired as a safe placeholder.';

  return (
    <section className="rounded-[28px] border border-slate-200 bg-white p-6 shadow-sm">
      <h2 className="text-2xl font-semibold">Account settings</h2>
      <p className="mt-2 text-slate-600">Manage communication preferences and account-level options here.</p>
      <div className="mt-5 rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800">
        {missingApiMessage}
      </div>
      <div className="mt-6 grid gap-4 md:grid-cols-2">
        <div className="rounded-2xl border border-dashed border-slate-300 p-5 text-sm text-slate-600">
          Loading states are reserved for the future settings endpoints.
        </div>
        <div className="rounded-2xl border border-dashed border-slate-300 p-5 text-sm text-slate-600">
          Error handling will read backend responses once the API exists.
        </div>
      </div>
    </section>
  );
}
