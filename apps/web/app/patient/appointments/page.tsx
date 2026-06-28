'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';

import { useToast } from '../../auth/toast-provider';
import {
  cancelPatientAppointment,
  fetchPatientAppointments,
  type PatientAppointment
} from '../api';

const STATUS_COLORS: Record<string, string> = {
  pending: 'bg-amber-100 text-amber-800',
  accepted: 'bg-blue-100 text-blue-800',
  doctor_on_way: 'bg-indigo-100 text-indigo-800',
  arrived: 'bg-purple-100 text-purple-800',
  in_consultation: 'bg-emerald-100 text-emerald-800',
  completed: 'bg-slate-100 text-slate-700',
  cancelled_by_patient: 'bg-rose-100 text-rose-800',
  cancelled_by_doctor: 'bg-rose-100 text-rose-800',
  rejected: 'bg-rose-100 text-rose-800',
  auto_rejected: 'bg-rose-100 text-rose-800'
};

export default function PatientAppointmentsPage() {
  const { showToast } = useToast();
  const [filter, setFilter] = useState<'upcoming' | 'completed' | 'cancelled'>('upcoming');
  const [appointments, setAppointments] = useState<PatientAppointment[]>([]);
  const [loading, setLoading] = useState(true);
  const [actionId, setActionId] = useState<string | null>(null);

  const load = async () => {
    setLoading(true);
    try {
      const list = await fetchPatientAppointments(filter);
      setAppointments(list);
    } catch (err: unknown) {
      showToast(err instanceof Error ? err.message : 'Unable to load appointments.', 'error');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void load();
    // Removed aggressive polling to avoid UI flicker; refresh only after actions
    return () => {};
  }, [filter]);

  const handleCancel = async (appointmentId: string) => {
    setActionId(appointmentId);
    try {
      await cancelPatientAppointment(appointmentId);
      showToast('Appointment cancelled.', 'success');
      await load();
    } catch (err: unknown) {
      showToast(err instanceof Error ? err.message : 'Unable to cancel appointment.', 'error');
    } finally {
      setActionId(null);
    }
  };

  return (
    <div className="space-y-6">
      <section className="rounded-[28px] border border-slate-200 bg-white p-6 shadow-sm sm:p-8">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div>
            <p className="text-sm font-semibold uppercase tracking-[0.35em] text-emerald-600">Patient journey</p>
            <h2 className="mt-2 text-2xl font-semibold">My appointments</h2>
            <p className="mt-2 text-slate-600">Track upcoming visits, completed consultations, and cancelled bookings in one place.</p>
          </div>
          <div className="flex flex-wrap gap-2">
            {(['upcoming', 'completed', 'cancelled'] as const).map((f) => (
              <button
                key={f}
                type="button"
                onClick={() => setFilter(f)}
                className={`rounded-full px-4 py-2 text-sm font-medium capitalize ${
                  filter === f ? 'bg-emerald-600 text-white' : 'border border-slate-300 text-slate-700'
                }`}
              >
                {f}
              </button>
            ))}
          </div>
        </div>

        {loading && (
          <div className="mt-6 space-y-3">
            {[1, 2].map((item) => (
              <div key={item} className="h-24 animate-pulse rounded-2xl bg-slate-100" />
            ))}
          </div>
        )}

        {!loading && appointments.length === 0 && (
          <div className="mt-6 rounded-2xl border border-dashed border-slate-300 p-8 text-center text-sm text-slate-600">
            No {filter} appointments found.
          </div>
        )}

        <div className="mt-6 space-y-3">
          {appointments.map((appt) => (
            <div key={appt._id} className="rounded-2xl border border-slate-200 p-5 shadow-sm transition hover:border-emerald-200 hover:shadow-md">
              <div className="flex flex-wrap items-start justify-between gap-4">
                <div className="flex-1">
                  <div className="flex flex-wrap items-center gap-3">
                    <p className="font-semibold text-slate-900">{appt.doctorName}</p>
                    <span className={`rounded-full px-2.5 py-0.5 text-xs font-medium ${STATUS_COLORS[appt.status] ?? 'bg-slate-100 text-slate-700'}`}>
                      {appt.statusLabel}
                    </span>
                  </div>
                  <p className="mt-1 text-sm text-slate-500">{appt.specialization}</p>
                  <p className="mt-3 text-sm text-slate-600">{new Date(appt.scheduledAt).toLocaleString()}</p>
                  <p className="text-sm text-slate-600">{appt.address.label}</p>
                  {appt.notes && <p className="mt-2 text-sm text-slate-500">Notes: {appt.notes}</p>}
                </div>
                <div className="flex flex-wrap items-center gap-2">
                  <Link href={`/patient/appointments/${appt._id}`} className="rounded-full border border-slate-300 px-3 py-1.5 text-sm font-semibold text-slate-700">
                    View details
                  </Link>
                  {filter === 'upcoming' && appt.status === 'pending' && (
                    <button
                      type="button"
                      disabled={actionId === appt._id}
                      onClick={() => void handleCancel(appt._id)}
                      className="rounded-full border border-rose-300 px-3 py-1.5 text-sm font-semibold text-rose-700 disabled:opacity-60"
                    >
                      {actionId === appt._id ? 'Cancelling...' : 'Cancel'}
                    </button>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
      </section>
    </div>
  );
}
