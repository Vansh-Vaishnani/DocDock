'use client';

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
  const [filter, setFilter] = useState<'upcoming' | 'history'>('upcoming');
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
      <section className="rounded-[28px] border border-slate-200 bg-white p-6 shadow-sm">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div>
            <h2 className="text-2xl font-semibold">My appointments</h2>
            <p className="mt-2 text-slate-600">View upcoming visits and past consultation history.</p>
          </div>
          <div className="flex gap-2">
            {(['upcoming', 'history'] as const).map((f) => (
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
          <div className="mt-6 rounded-2xl bg-slate-100 p-4 text-sm text-slate-600">Loading appointments...</div>
        )}

        {!loading && appointments.length === 0 && (
          <div className="mt-6 rounded-2xl border border-dashed border-slate-300 p-6 text-center text-sm text-slate-600">
            No {filter} appointments found.
          </div>
        )}

        <div className="mt-6 space-y-3">
          {appointments.map((appt) => (
            <div key={appt._id} className="rounded-2xl border border-slate-200 p-4">
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div>
                  <p className="font-semibold text-slate-900">{appt.doctorName}</p>
                  <p className="text-sm text-slate-500">{appt.specialization}</p>
                  <p className="mt-2 text-sm text-slate-600">{new Date(appt.scheduledAt).toLocaleString()}</p>
                  <p className="text-sm text-slate-600">{appt.address.label}</p>
                  {appt.notes && <p className="mt-1 text-sm text-slate-500">Notes: {appt.notes}</p>}
                  <span
                    className={`mt-2 inline-block rounded-full px-2.5 py-0.5 text-xs font-medium ${
                      STATUS_COLORS[appt.status] ?? 'bg-slate-100 text-slate-700'
                    }`}
                  >
                    {appt.statusLabel}
                  </span>
                </div>
                {filter === 'upcoming' && appt.status === 'pending' && (
                  <button
                    type="button"
                    disabled={actionId === appt._id}
                    onClick={() => handleCancel(appt._id)}
                    className="rounded-full border border-rose-300 px-3 py-1.5 text-xs font-semibold text-rose-700 disabled:opacity-60"
                  >
                    Cancel
                  </button>
                )}
              </div>
            </div>
          ))}
        </div>
      </section>
    </div>
  );
}
