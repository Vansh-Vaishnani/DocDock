'use client';

import { useEffect, useState } from 'react';

import { useToast } from '../../auth/toast-provider';
import { fetchDoctorAppointments, fetchDoctorProfile, updateAppointmentStatus, type DoctorAppointment } from '../api';

const STATUS_LABELS: Record<string, string> = {
  pending: 'Pending',
  accepted: 'Accepted',
  rejected: 'Rejected',
  doctor_on_way: 'On The Way',
  arrived: 'Arrived',
  in_consultation: 'Consultation Started',
  completed: 'Completed',
  cancelled_by_patient: 'Cancelled by Patient',
  cancelled_by_doctor: 'Cancelled by Doctor'
};

const STATUS_COLORS: Record<string, string> = {
  pending: 'bg-amber-100 text-amber-800',
  accepted: 'bg-blue-100 text-blue-800',
  doctor_on_way: 'bg-indigo-100 text-indigo-800',
  arrived: 'bg-purple-100 text-purple-800',
  in_consultation: 'bg-emerald-100 text-emerald-800',
  completed: 'bg-slate-100 text-slate-700',
  cancelled_by_patient: 'bg-rose-100 text-rose-800',
  cancelled_by_doctor: 'bg-rose-100 text-rose-800',
  rejected: 'bg-rose-100 text-rose-800'
};

type ActionButton = { label: string; status: string; variant?: 'primary' | 'danger' };

function getActions(status: string, verified: boolean): ActionButton[] {
  if (!verified) return [];

  switch (status) {
    case 'pending':
      return [
        { label: 'Accept', status: 'accepted', variant: 'primary' },
        { label: 'Reject', status: 'rejected', variant: 'danger' }
      ];
    case 'accepted':
      return [
        { label: 'On The Way', status: 'doctor_on_way', variant: 'primary' },
        { label: 'Cancel', status: 'cancelled_by_doctor', variant: 'danger' }
      ];
    case 'doctor_on_way':
      return [
        { label: 'Arrived', status: 'arrived', variant: 'primary' },
        { label: 'Cancel', status: 'cancelled_by_doctor', variant: 'danger' }
      ];
    case 'arrived':
      return [
        { label: 'Start Consultation', status: 'in_consultation', variant: 'primary' },
        { label: 'Cancel', status: 'cancelled_by_doctor', variant: 'danger' }
      ];
    case 'in_consultation':
      return [{ label: 'Complete', status: 'completed', variant: 'primary' }];
    default:
      return [];
  }
}

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
      showToast('Your account must be verified before managing appointments.', 'error');
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
          <p className="mt-2 text-slate-600">Manage requests and active consultations.</p>
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
        {appointments.map((appt) => {
          const actions = getActions(appt.status, verified);
          return (
            <div key={appt._id} className="rounded-2xl border border-slate-200 p-4">
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div>
                  <p className="font-semibold text-slate-900">{appt.patientName}</p>
                  <p className="text-sm text-slate-500">{appt.patientPhone}</p>
                  <p className="mt-2 text-sm text-slate-600">{new Date(appt.scheduledAt).toLocaleString()}</p>
                  <p className="text-sm text-slate-600">{appt.address.label}</p>
                  {appt.notes && <p className="mt-1 text-sm text-slate-500">Notes: {appt.notes}</p>}
                  <span
                    className={`mt-2 inline-block rounded-full px-2.5 py-0.5 text-xs font-medium ${
                      STATUS_COLORS[appt.status] ?? 'bg-slate-100 text-slate-700'
                    }`}
                  >
                    {STATUS_LABELS[appt.status] ?? appt.status}
                  </span>
                </div>
                {actions.length > 0 && (
                  <div className="flex flex-wrap gap-2">
                    {actions.map((action) => (
                      <button
                        key={action.status}
                        type="button"
                        disabled={actionId === appt._id}
                        onClick={() => handleStatus(appt._id, action.status)}
                        className={`rounded-full px-3 py-1.5 text-xs font-semibold disabled:opacity-60 ${
                          action.variant === 'danger'
                            ? 'border border-rose-300 text-rose-700'
                            : 'bg-emerald-600 text-white'
                        }`}
                      >
                        {action.label}
                      </button>
                    ))}
                  </div>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </section>
  );
}
