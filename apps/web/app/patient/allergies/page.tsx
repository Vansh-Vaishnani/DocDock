'use client';

export default function PatientAllergiesPage() {
  const missingApiMessage = 'The backend does not yet expose patient allergy management endpoints. This route is prepared for them without faking data.';

  return (
    <section className="rounded-[28px] border border-slate-200 bg-white p-6 shadow-sm">
      <h2 className="text-2xl font-semibold">Allergy management</h2>
      <p className="mt-2 text-slate-600">Track allergies, triggers, and notes for safer care delivery.</p>
      <div className="mt-5 rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800">
        {missingApiMessage}
      </div>
      <div className="mt-6 rounded-2xl border border-dashed border-slate-300 p-6 text-sm text-slate-600">
        Empty state: no recorded allergies yet.
      </div>
    </section>
  );
}
