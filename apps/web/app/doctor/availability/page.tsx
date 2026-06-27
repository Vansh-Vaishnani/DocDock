'use client';

export default function DoctorAvailabilityPage() {
  return (
    <section className="rounded-[28px] border border-slate-200 bg-white p-6 shadow-sm">
      <p className="text-sm font-semibold uppercase tracking-[0.35em] text-emerald-600">Availability</p>
      <h2 className="mt-3 text-2xl font-semibold">Manage working hours</h2>
      <p className="mt-2 text-slate-600">This route is reserved for the existing availability APIs and scheduler flow.</p>
      <div className="mt-6 rounded-2xl border border-dashed border-slate-300 p-5 text-sm text-slate-600">
        Availability controls will appear here once the backend endpoint is wired in.
      </div>
    </section>
  );
}