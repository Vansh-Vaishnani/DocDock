'use client';

export default function DoctorAppointmentsPage() {
  return (
    <section className="rounded-[28px] border border-slate-200 bg-white p-6 shadow-sm">
      <p className="text-sm font-semibold uppercase tracking-[0.35em] text-emerald-600">Appointments</p>
      <h2 className="mt-3 text-2xl font-semibold">Upcoming consultations</h2>
      <p className="mt-2 text-slate-600">Appointment management stays tied to the current backend API contract.</p>
      <div className="mt-6 rounded-2xl border border-dashed border-slate-300 p-5 text-sm text-slate-600">
        Appointment data will render here when the API is available.
      </div>
    </section>
  );
}