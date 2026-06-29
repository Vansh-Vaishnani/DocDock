'use client';

import { useCallback, useEffect, useState } from 'react';

import { useToast } from '../../../auth/toast-provider';
import { fetchAppointmentDetail, fetchAppointments, type AdminAppointment } from '../../api';
import { formatDate, Pagination, StatusBadge } from '../../_components/admin-ui';

const statusFilters = ['all', 'pending', 'accepted', 'completed', 'cancelled', 'rejected', 'refunded'];

export default function AdminAppointmentsPage() {
  const { showToast } = useToast();
  const [appointments, setAppointments] = useState<AdminAppointment[]>([]);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [status, setStatus] = useState('all');
  const [search, setSearch] = useState('');
  const [date, setDate] = useState('');
  const [loading, setLoading] = useState(true);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [detail, setDetail] = useState<Record<string, unknown> | null>(null);

  const loadAppointments = useCallback(async () => {
    setLoading(true);
    try {
      const result = await fetchAppointments({
        status: status === 'all' ? undefined : status,
        search: search.trim() || undefined,
        date: date || undefined,
        page,
        limit: 10
      });
      setAppointments(result.data.items);
      setTotalPages(result.data.totalPages);
    } catch (err: unknown) {
      showToast(err instanceof Error ? err.message : 'Failed to load appointments', 'error');
    } finally {
      setLoading(false);
    }
  }, [date, page, search, showToast, status]);

  useEffect(() => {
    void loadAppointments();
  }, [loadAppointments]);

  const viewDetail = async (appointmentId: string) => {
    setSelectedId(appointmentId);
    try {
      const data = await fetchAppointmentDetail(appointmentId);
      setDetail(data as Record<string, unknown>);
    } catch (err: unknown) {
      showToast(err instanceof Error ? err.message : 'Failed to load detail', 'error');
    }
  };

  return (
    <section className="space-y-6">
      <div>
        <h2 className="text-2xl font-semibold">Appointment management</h2>
        <p className="mt-1 text-slate-600">Inspect appointments across the platform. Medical records are view-only.</p>
      </div>

      <div className="flex flex-wrap gap-2">
        {statusFilters.map((item) => (
          <button
            key={item}
            type="button"
            onClick={() => { setStatus(item); setPage(1); }}
            className={`rounded-full px-3 py-1.5 text-xs font-medium capitalize ${status === item ? 'bg-emerald-600 text-white' : 'border border-slate-300 text-slate-700'}`}
          >
            {item}
          </button>
        ))}
      </div>

      <div className="flex flex-wrap gap-3">
        <input value={search} onChange={(e) => { setSearch(e.target.value); setPage(1); }} placeholder="Search patient or doctor" className="min-w-[200px] flex-1 rounded-2xl border border-slate-300 px-4 py-2 text-sm" />
        <input type="date" value={date} onChange={(e) => { setDate(e.target.value); setPage(1); }} className="rounded-2xl border border-slate-300 px-4 py-2 text-sm" />
      </div>

      <div className="overflow-x-auto rounded-[24px] border border-slate-200">
        <table className="min-w-full text-left text-sm">
          <thead className="bg-slate-50 text-slate-500">
            <tr>
              <th className="px-4 py-3 font-medium">Scheduled</th>
              <th className="px-4 py-3 font-medium">Patient</th>
              <th className="px-4 py-3 font-medium">Doctor</th>
              <th className="px-4 py-3 font-medium">Status</th>
              <th className="px-4 py-3 font-medium">Actions</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr><td colSpan={5} className="px-4 py-8 text-center text-slate-500">Loading…</td></tr>
            ) : appointments.length === 0 ? (
              <tr><td colSpan={5} className="px-4 py-8 text-center text-slate-500">No appointments found.</td></tr>
            ) : appointments.map((appt) => (
              <tr key={appt._id} className="border-t border-slate-100">
                <td className="px-4 py-3">{formatDate(appt.scheduledAt)}</td>
                <td className="px-4 py-3">{appt.patientName}</td>
                <td className="px-4 py-3">{appt.doctorName}{appt.specialization ? ` · ${appt.specialization}` : ''}</td>
                <td className="px-4 py-3"><StatusBadge status={appt.status} /></td>
                <td className="px-4 py-3">
                  <button type="button" onClick={() => void viewDetail(appt._id)} className="rounded-lg bg-slate-900 px-3 py-1.5 text-xs font-semibold text-white">Inspect</button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <Pagination page={page} totalPages={totalPages} onPageChange={setPage} />

      {selectedId && detail && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 p-4">
          <div className="max-h-[90vh] w-full max-w-xl overflow-y-auto rounded-[28px] bg-white p-6 shadow-xl">
            <div className="flex items-start justify-between">
              <h3 className="text-lg font-semibold">Appointment detail</h3>
              <button type="button" onClick={() => { setSelectedId(null); setDetail(null); }} className="text-slate-500">✕</button>
            </div>
            <pre className="mt-4 overflow-x-auto rounded-2xl bg-slate-50 p-4 text-xs text-slate-700">{JSON.stringify(detail, null, 2)}</pre>
            <p className="mt-3 text-xs text-slate-500">Medical records and prescriptions are read-only for admins.</p>
          </div>
        </div>
      )}
    </section>
  );
}
