'use client';

import { useCallback, useEffect, useState } from 'react';
import { io } from 'socket.io-client';

import { useToast } from '../../../auth/toast-provider';
import { fetchDoctorDetail, fetchDoctors, verifyDoctor, type AdminDoctor } from '../../api';
import { Pagination, StatusBadge } from '../../_components/admin-ui';

const SOCKET_BASE = process.env.NEXT_PUBLIC_SOCKET_URL || process.env.NEXT_PUBLIC_API_URL?.replace('/api/v1', '') || 'http://localhost:4000';

const getStoredAccessToken = (): string | null => {
  if (typeof window === 'undefined') return null;
  try {
    const raw = window.localStorage.getItem('docdock-auth') || window.sessionStorage.getItem('docdock-auth');
    if (!raw) return null;
    return (JSON.parse(raw) as { accessToken?: string }).accessToken || null;
  } catch {
    return null;
  }
};

const isPdfUrl = (url?: string): boolean => {
  if (!url) return false;
  return url.toLowerCase().includes('.pdf') || url.includes('/raw/upload/');
};

const getDownloadUrl = (url?: string): string => {
  if (!url) return '';
  if (url.includes('/upload/')) {
    return url.replace('/upload/', '/upload/fl_attachment/');
  }
  return url;
};

export default function AdminDoctorsPage() {
  const { showToast } = useToast();
  const [doctors, setDoctors] = useState<AdminDoctor[]>([]);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [status, setStatus] = useState('pending');
  const [loading, setLoading] = useState(true);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [detail, setDetail] = useState<{ doctor: AdminDoctor; user: { fullName: string; email: string; phone: string } } | null>(null);
  const [rejectReason, setRejectReason] = useState('');
  const [actionLoading, setActionLoading] = useState(false);

  const loadDoctors = useCallback(async () => {
    setLoading(true);
    try {
      const result = await fetchDoctors({ status, page, limit: 10 });
      setDoctors(result.data.items);
      setTotalPages(result.data.totalPages);
    } catch (err: unknown) {
      showToast(err instanceof Error ? err.message : 'Failed to load doctors', 'error');
    } finally {
      setLoading(false);
    }
  }, [page, showToast, status]);

  useEffect(() => {
    void loadDoctors();
  }, [loadDoctors]);

  // Real-time Socket.IO and 5-second polling fallback effect
  useEffect(() => {
    // 1. Polling fallback (refetch every 5 seconds)
    const interval = setInterval(() => {
      void loadDoctors();
    }, 5000);

    // 2. Real-time Socket.IO updates
    const token = getStoredAccessToken();
    if (!token) return () => clearInterval(interval);

    const socket = io(`${SOCKET_BASE}/notifications`, {
      transports: ['websocket', 'polling'],
      auth: { token }
    });

    socket.on('connect', () => {
      try {
        const raw = window.localStorage.getItem('docdock-auth') || window.sessionStorage.getItem('docdock-auth');
        if (raw) {
          const parsed = JSON.parse(raw) as { user?: { _id?: string } };
          const userId = parsed.user?._id;
          if (userId) {
            socket.emit('join', userId);
            console.log('Joined admin pending doctors notification room:', userId);
          }
        }
      } catch (e) {
        console.error('Failed to parse docdock-auth:', e);
      }
    });

    socket.on('notification', (newNotification: any) => {
      const statusTypes = ['new_doctor_registration'];
      if (statusTypes.includes(newNotification.type)) {
        console.log('Real-time updates received on admin side: new doctor registered.');
        void loadDoctors();
      }
    });

    return () => {
      clearInterval(interval);
      socket.disconnect();
    };
  }, [loadDoctors]);

  const openDetail = async (doctorId: string) => {
    setSelectedId(doctorId);
    setRejectReason('');
    try {
      const data = await fetchDoctorDetail(doctorId);
      setDetail(data);
    } catch (err: unknown) {
      showToast(err instanceof Error ? err.message : 'Failed to load doctor', 'error');
    }
  };

  const handleAction = async (action: 'approve' | 'reject' | 'suspend') => {
    if (!selectedId) return;
    if (action === 'reject' && !rejectReason.trim()) {
      showToast('Rejection reason is required', 'error');
      return;
    }
    setActionLoading(true);
    try {
      await verifyDoctor(selectedId, action, rejectReason.trim() || undefined);
      showToast(`Doctor ${action}d successfully`, 'success');
      setSelectedId(null);
      setDetail(null);
      await loadDoctors();
    } catch (err: unknown) {
      showToast(err instanceof Error ? err.message : 'Action failed', 'error');
    } finally {
      setActionLoading(false);
    }
  };

  return (
    <section className="space-y-6">
      <div>
        <h2 className="text-2xl font-semibold">Doctor verification</h2>
        <p className="mt-1 text-slate-600">Review credentials and approve, reject, or suspend doctors.</p>
      </div>

      <div className="flex flex-wrap gap-2">
        {['pending', 'approved', 'rejected', 'all'].map((item) => (
          <button
            key={item}
            type="button"
            onClick={() => { setStatus(item); setPage(1); }}
            className={`rounded-full px-4 py-2 text-sm font-medium capitalize ${status === item ? 'bg-emerald-600 text-white' : 'border border-slate-300 text-slate-700'}`}
          >
            {item}
          </button>
        ))}
      </div>

      <div className="overflow-x-auto rounded-[24px] border border-slate-200">
        <table className="min-w-full text-left text-sm">
          <thead className="bg-slate-50 text-slate-500">
            <tr>
              <th className="px-4 py-3 font-medium">Doctor</th>
              <th className="px-4 py-3 font-medium">Specialization</th>
              <th className="px-4 py-3 font-medium">Experience</th>
              <th className="px-4 py-3 font-medium">Status</th>
              <th className="px-4 py-3 font-medium">Actions</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr><td colSpan={5} className="px-4 py-8 text-center text-slate-500">Loading…</td></tr>
            ) : doctors.length === 0 ? (
              <tr><td colSpan={5} className="px-4 py-8 text-center text-slate-500">No doctors found.</td></tr>
            ) : doctors.map((doctor) => (
              <tr key={doctor._id} className="border-t border-slate-100">
                <td className="px-4 py-3">
                  <p className="font-medium text-slate-900">{doctor.fullName ?? 'Unknown'}</p>
                  <p className="text-xs text-slate-500">{doctor.email}</p>
                </td>
                <td className="px-4 py-3">{doctor.specialization}</td>
                <td className="px-4 py-3">{doctor.experience} yrs</td>
                <td className="px-4 py-3"><StatusBadge status={doctor.verificationStatus} /></td>
                <td className="px-4 py-3">
                  <button type="button" onClick={() => void openDetail(doctor._id)} className="rounded-lg bg-slate-900 px-3 py-1.5 text-xs font-semibold text-white">
                    View
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <Pagination page={page} totalPages={totalPages} onPageChange={setPage} />
      {selectedId && detail && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
          <div className="max-h-[90vh] w-full max-w-2xl overflow-y-auto rounded-2xl p-6 shadow-large border" style={{ backgroundColor: 'var(--card-bg)', borderColor: 'var(--border-color)', color: 'var(--text-primary)' }}>
            <div className="flex items-start justify-between gap-4">
              <div>
                <h3 className="text-xl font-bold" style={{ color: 'var(--text-primary)' }}>{detail.user.fullName}</h3>
                <p className="text-sm" style={{ color: 'var(--text-secondary)' }}>{detail.user.email} · {detail.user.phone}</p>
              </div>
              <button type="button" onClick={() => { setSelectedId(null); setDetail(null); }} className="text-xl font-medium" style={{ color: 'var(--text-muted)' }}>✕</button>
            </div>

            <div className="mt-6 grid gap-4 sm:grid-cols-2 border-t pt-4" style={{ borderColor: 'var(--border-color)' }}>
              <div><p className="text-xs" style={{ color: 'var(--text-muted)' }}>License</p><p className="font-semibold">{detail.doctor.licenseNumber}</p></div>
              <div><p className="text-xs" style={{ color: 'var(--text-muted)' }}>Specialization</p><p className="font-semibold">{detail.doctor.specialization}</p></div>
              <div><p className="text-xs" style={{ color: 'var(--text-muted)' }}>Experience</p><p className="font-semibold">{detail.doctor.experience} years</p></div>
              <div><p className="text-xs" style={{ color: 'var(--text-muted)' }}>Clinic</p><p className="font-semibold">{detail.doctor.clinicName ?? '—'}</p></div>
              <div className="sm:col-span-2"><p className="text-xs" style={{ color: 'var(--text-muted)' }}>Qualifications</p><p className="font-semibold">{detail.doctor.qualifications?.join(', ') || '—'}</p></div>
              <div className="sm:col-span-2"><p className="text-xs" style={{ color: 'var(--text-muted)' }}>Clinic address</p><p className="font-semibold">{detail.doctor.clinicAddress ?? '—'}</p></div>
            </div>

            <div className="mt-6 border-t pt-4" style={{ borderColor: 'var(--border-color)' }}>
              <p className="text-sm font-bold mb-3" style={{ color: 'var(--text-primary)' }}>Uploaded Documents</p>
              <div className="grid gap-4 sm:grid-cols-3">
                {/* Profile Photo */}
                <div className="rounded-xl border p-3" style={{ borderColor: 'var(--border-color)', backgroundColor: 'var(--bg-tertiary)' }}>
                  <p className="text-xs font-semibold" style={{ color: 'var(--text-secondary)' }}>Profile Photo</p>
                  {detail.doctor.profilePhotoUrl ? (
                    <div className="mt-2">
                      {isPdfUrl(detail.doctor.profilePhotoUrl) ? (
                        <div className="flex h-20 w-20 items-center justify-center rounded-lg border bg-slate-100 dark:bg-slate-800">
                          <span className="text-xs font-semibold">PDF</span>
                        </div>
                      ) : (
                        <img src={detail.doctor.profilePhotoUrl} alt="Profile" className="h-20 w-20 rounded-lg object-cover border" />
                      )}
                      <div className="mt-2 flex gap-2">
                        <a href={detail.doctor.profilePhotoUrl} target="_blank" rel="noreferrer" className="text-xs font-semibold text-emerald-600 dark:text-emerald-400 hover:underline">Open</a>
                        <a href={getDownloadUrl(detail.doctor.profilePhotoUrl)} download className="text-xs font-semibold text-slate-500 dark:text-slate-400 hover:underline">Download</a>
                      </div>
                    </div>
                  ) : (
                    <p className="mt-2 text-xs text-rose-600">Not uploaded</p>
                  )}
                </div>

                {/* Government ID */}
                <div className="rounded-xl border p-3" style={{ borderColor: 'var(--border-color)', backgroundColor: 'var(--bg-tertiary)' }}>
                  <p className="text-xs font-semibold" style={{ color: 'var(--text-secondary)' }}>Government ID</p>
                  {detail.doctor.governmentIdUrl ? (
                    <div className="mt-2">
                      {isPdfUrl(detail.doctor.governmentIdUrl) ? (
                        <div className="flex h-20 w-20 items-center justify-center rounded-lg border bg-slate-100 dark:bg-slate-800">
                          <span className="text-xs font-semibold">PDF</span>
                        </div>
                      ) : (
                        <img src={detail.doctor.governmentIdUrl} alt="Government ID" className="h-20 w-20 rounded-lg object-cover border" />
                      )}
                      <div className="mt-2 flex gap-2">
                        <a href={detail.doctor.governmentIdUrl} target="_blank" rel="noreferrer" className="text-xs font-semibold text-emerald-600 dark:text-emerald-400 hover:underline">Open</a>
                        <a href={getDownloadUrl(detail.doctor.governmentIdUrl)} download className="text-xs font-semibold text-slate-500 dark:text-slate-400 hover:underline">Download</a>
                      </div>
                    </div>
                  ) : (
                    <p className="mt-2 text-xs text-rose-600">Not uploaded</p>
                  )}
                </div>

                {/* Medical License */}
                <div className="rounded-xl border p-3" style={{ borderColor: 'var(--border-color)', backgroundColor: 'var(--bg-tertiary)' }}>
                  <p className="text-xs font-semibold" style={{ color: 'var(--text-secondary)' }}>Medical License</p>
                  {detail.doctor.medicalLicenseUrl ? (
                    <div className="mt-2">
                      {isPdfUrl(detail.doctor.medicalLicenseUrl) ? (
                        <div className="flex h-20 w-20 items-center justify-center rounded-lg border bg-slate-100 dark:bg-slate-800">
                          <span className="text-xs font-semibold">PDF</span>
                        </div>
                      ) : (
                        <img src={detail.doctor.medicalLicenseUrl} alt="Medical License" className="h-20 w-20 rounded-lg object-cover border" />
                      )}
                      <div className="mt-2 flex gap-2">
                        <a href={detail.doctor.medicalLicenseUrl} target="_blank" rel="noreferrer" className="text-xs font-semibold text-emerald-600 dark:text-emerald-400 hover:underline">Open</a>
                        <a href={getDownloadUrl(detail.doctor.medicalLicenseUrl)} download className="text-xs font-semibold text-slate-500 dark:text-slate-400 hover:underline">Download</a>
                      </div>
                    </div>
                  ) : (
                    <p className="mt-2 text-xs text-rose-600">Not uploaded</p>
                  )}
                </div>
              </div>
            </div>

            <div className="mt-6 border-t pt-4" style={{ borderColor: 'var(--border-color)' }}>
              <label className="dd-label">Rejection / Suspend Reason</label>
              <textarea
                value={rejectReason}
                onChange={(e) => setRejectReason(e.target.value)}
                rows={3}
                className="dd-input resize-none"
                placeholder="Required when rejecting a doctor"
              />
            </div>

            <div className="mt-6 flex flex-wrap gap-3 border-t pt-4" style={{ borderColor: 'var(--border-color)' }}>
              <button type="button" disabled={actionLoading} onClick={() => void handleAction('approve')} className="btn-primary text-xs px-4 py-2 disabled:opacity-60 flex-1">Approve</button>
              <button type="button" disabled={actionLoading} onClick={() => void handleAction('reject')} className="btn-secondary text-xs px-4 py-2 text-rose-600 border-rose-200 dark:border-rose-900/50 dark:text-rose-400 disabled:opacity-60 flex-1">Reject</button>
              <button type="button" disabled={actionLoading} onClick={() => void handleAction('suspend')} className="btn-secondary text-xs px-4 py-2 text-amber-600 border-amber-200 dark:border-amber-900/50 dark:text-amber-400 disabled:opacity-60 flex-1">Suspend</button>
            </div>
          </div>
        </div>
      )}
    </section>
  );
}
