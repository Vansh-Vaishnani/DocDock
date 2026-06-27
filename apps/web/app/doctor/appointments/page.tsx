'use client';

import { useEffect, useState } from 'react';

import { useToast } from '../../auth/toast-provider';
import { fetchDoctorAppointments, fetchDoctorProfile, updateAppointmentStatus, type DoctorAppointment } from '../api';

export default function DoctorAppointmentsPage() {
  const { showToast } = useToast();
  const [appointments, setAppointments] = useState<DoctorAppointment[]>([]);
  const [filter, setFilter] = useState<'today' | 'upcoming' | 'all'>('all');
  const [loading, setLoading] = useState(true);
  const [verified, setVerified] = useState(false);
  const [actionId, setActionId] = useState<string | null>(null);

  const load = async () => {
    setLoading(true);
    try {
      const [list, profile] = await Promise.all([fetchDoctorAppointments(filter), fetchDoctorProfile()]);
      setAppointments(list);
      setVerified(profile.verificationStatus === 'approved');
    } catch (err: unknown) {
      showToast(err instanceof Error ? err.message : 'Unable to load appointments.', 'error');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void load();
  }, [filter]);

  const handleStatus = async (appointmentId: string, status: string) => {
    if (!verified) {
      showToast('Your account must be verified before accepting appointments.', 'error');
      return;
    }
    setActionId(appointmentId);
    try {
      await updateAppointmentStatus(appointmentId, status);
      showToast('Appointment updated.', 'success');
      await load();
    } catch (err: unknown) {
      showToast(err instanceof Error ? err.message : 'Unable to update appointment.', 'error');
    } finally {
      setActionId(null);
    }
  };

  return (
    <section className="rounded-[28px] border border-slate-200 bg-white p-6 shadow-sm">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-semibold">Appointments</h2>
          <p className="mt-2 text-slate-600">Manage upcoming and pending consultations.</p>
        </div>
        <div className="flex gap-2">
          {(['today', 'upcoming', 'all'] as const).map((f) => (
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

      {loading && <div className="mt-6 rounded-2xl bg-slate-100 p-4 text-sm text-slate-600">Loading appointments...</div>}

      {!loading && appointments.length === 0 && (
        <div className="mt-6 rounded-2xl border border-dashed border-slate-300 p-6 text-center text-sm text-slate-600">
          No appointments found.
        </div>
      )}

      <div className="mt-6 space-y-3">
        {appointments.map((appt) => (
          <div key={appt._id} className="rounded-2xl border border-slate-200 p-4">
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div>
                <p className="font-semibold text-slate-900">{appt.patientName}</p>
                <p className="text-sm text-slate-600">{new Date(appt.scheduledAt).toLocaleString()}</p>
                <p className="text-sm text-slate-600">{appt.address.label}</p>
                <p className="mt-1 text-xs uppercase tracking-wide text-slate-500">{appt.status}</p>
              </div>
              {appt.status === 'pending' && verified && (
                <div className="flex gap-2">
                  <button
                    type="button"
                    disabled={actionId === appt._id}
                    onClick={() => handleStatus(appt._id, 'accepted')}
                    className="rounded-full bg-emerald-600 px-3 py-1.5 text-xs font-semibold text-white disabled:opacity-60"
                  >
                    Accept
                  </button>
                  <button
                    type="button"
                    disabled={actionId === appt._id}
                    onClick={() => handleStatus(appt._id, 'rejected')}
                    className="rounded-full border border-rose-300 px-3 py-1.5 text-xs font-semibold text-rose-700 disabled:opacity-60"
                  >
                    Reject
                  </button>
                </div>
              )}
            </div>
          </div>
        ))}
      </div>
    </section>
  );
}
