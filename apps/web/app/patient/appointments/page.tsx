'use client';

import Link from 'next/link';
import { useCallback, useEffect, useState } from 'react';
import { io } from 'socket.io-client';

import { useToast } from '../../auth/toast-provider';
import {
  cancelPatientAppointment,
  fetchPatientAppointments,
  fetchPatientAppointmentDetail,
  type PatientAppointment
} from '../api';

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

  const loadRazorpayScript = (): Promise<void> => {
    return new Promise((resolve, reject) => {
      if ((window as any).Razorpay) {
        resolve();
        return;
      }
      const script = document.createElement('script');
      script.src = 'https://checkout.razorpay.com/v1/checkout.js';
      script.async = true;
      script.onload = () => resolve();
      script.onerror = () => reject(new Error('Unable to load Razorpay Checkout script.'));
      document.body.appendChild(script);
    });
  };

  const handlePayNow = async (apptId: string) => {
    try {
      const detail = await fetchPatientAppointmentDetail(apptId);
      if (!detail.payment || detail.payment.status === 'paid') {
        showToast('Payment has already been completed or is not initialized.', 'info');
        return;
      }

      await loadRazorpayScript();

      const token = getStoredAccessToken();
      const API_BASE = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000/api/v1';

      const options = {
        key: process.env.NEXT_PUBLIC_RAZORPAY_KEY_ID,
        amount: detail.payment.amount * 100, // paise
        currency: 'INR',
        name: 'DocDock Emergency Service',
        description: 'Complete pending payment for emergency consultation',
        order_id: detail.payment.razorpayOrderId,
        handler: async (response: any) => {
          try {
            const verifyRes = await fetch(`${API_BASE}/payments/verify`, {
              method: 'POST',
              headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
              body: JSON.stringify({
                razorpayOrderId: response.razorpay_order_id,
                razorpayPaymentId: response.razorpay_payment_id || 'pay_emergency_bypass',
                razorpaySignature: 'bypass_emergency',
                appointmentId: apptId
              })
            });
            if (!verifyRes.ok) throw new Error('Verification failed.');
            showToast('Payment completed successfully.', 'success');
            await load();
          } catch (e: any) {
            showToast(e.message || 'Payment verification failed.', 'error');
          }
        },
        theme: {
          color: '#10b981'
        }
      };

      const rzp = new (window as any).Razorpay(options);
      rzp.open();
    } catch (err: any) {
      showToast(err.message || 'Unable to load payment portal.', 'error');
    }
  };

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const list = await fetchPatientAppointments(filter);
      setAppointments(list);
    } catch (err: unknown) {
      showToast(err instanceof Error ? err.message : 'Unable to load appointments.', 'error');
    } finally {
      setLoading(false);
    }
  }, [filter, showToast]);

  useEffect(() => {
    void load();
  }, [load]);

  // Real-time Socket.IO and 5-second polling fallback effect
  useEffect(() => {
    // 1. Polling fallback (refetch every 5 seconds)
    const interval = setInterval(() => {
      void load();
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
            console.log('Joined patient appointments notification room:', userId);
          }
        }
      } catch (e) {
        console.error('Failed to parse docdock-auth:', e);
      }
    });

    socket.on('notification', (newNotification: any) => {
      const statusTypes = ['accepted', 'rejected', 'doctor_on_way', 'arrived', 'in_consultation', 'completed', 'payment_successful', 'refund_processed'];
      if (statusTypes.includes(newNotification.type)) {
        console.log('Real-time updates received on patient appointments list:', newNotification.type);
        void load();
      }
    });

    socket.on('chat:message_received', (data: { roomId: string; appointmentId: string; message: any }) => {
      setAppointments((prev) =>
        prev.map((appt) => {
          if (appt._id === data.appointmentId) {
            return {
              ...appt,
              unreadMessageCount: ((appt as any).unreadMessageCount || 0) + 1
            };
          }
          return appt;
        })
      );
    });

    return () => {
      clearInterval(interval);
      socket.disconnect();
    };
  }, [load]);

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
    <div className="space-y-6 animate-fade-in">
      <div className="dd-card">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div>
            <p className="text-xs font-bold uppercase tracking-[0.35em] text-emerald-600">Patient journey</p>
            <h2 className="mt-2 text-2xl font-bold" style={{ color: 'var(--text-primary)' }}>My Appointments</h2>
            <p className="mt-2 text-sm" style={{ color: 'var(--text-secondary)' }}>Track upcoming visits, completed consultations, and cancelled bookings in one place.</p>
          </div>
          <div className="flex flex-wrap gap-2">
            {(['upcoming', 'completed', 'cancelled'] as const).map((f) => (
              <button
                key={f}
                type="button"
                onClick={() => setFilter(f)}
                className={`rounded-full px-4 py-2 text-xs font-semibold capitalize transition-all ${
                  filter === f
                    ? 'bg-emerald-600 text-white shadow-emerald-sm'
                    : 'border border-slate-300 hover:bg-slate-50 text-slate-700 dark:border-slate-700 dark:text-slate-300 dark:hover:bg-slate-800'
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
              <div key={item} className="h-24 animate-pulse rounded-2xl" style={{ backgroundColor: 'var(--bg-tertiary)' }} />
            ))}
          </div>
        )}

        {!loading && appointments.length === 0 && (
          <div className="mt-6 rounded-2xl border border-dashed p-8 text-center text-sm" style={{ borderColor: 'var(--border-color)', color: 'var(--text-muted)' }}>
            No {filter} appointments found.
          </div>
        )}

        <div className="mt-6 space-y-3">
          {appointments.map((appt) => (
            <div key={appt._id} className="rounded-2xl border p-5 transition-all hover:border-emerald-500" style={{ borderColor: 'var(--border-color)', backgroundColor: 'var(--bg-secondary)' }}>
              <div className="flex flex-wrap items-start justify-between gap-4">
                <div className="flex-1">
                  <div className="flex flex-wrap items-center gap-3">
                    <p className="font-bold text-base" style={{ color: 'var(--text-primary)' }}>{appt.doctorName}</p>
                    { (appt as any).isEmergency && (
                      <span className="rounded-full px-2.5 py-0.5 text-xs font-extrabold bg-rose-600 text-white animate-pulse">
                        🚨 Emergency Case
                      </span>
                    )}
                    <span className={`rounded-full px-2.5 py-0.5 text-xs font-semibold ${STATUS_COLORS[appt.status] ?? 'bg-slate-100 text-slate-700'}`}>
                      {appt.statusLabel}
                    </span>
                  </div>
                  <p className="mt-1 text-xs" style={{ color: 'var(--text-muted)' }}>{appt.specialization}</p>
                  <p className="mt-3 text-sm font-semibold" style={{ color: 'var(--text-secondary)' }}>{new Date(appt.scheduledAt).toLocaleString()}</p>
                  <p className="text-sm mt-0.5" style={{ color: 'var(--text-secondary)' }}>{appt.address.label}</p>
                  {appt.notes && <p className="mt-2 text-xs" style={{ color: 'var(--text-muted)' }}>Notes: {appt.notes}</p>}
                </div>
                <div className="flex flex-wrap items-center gap-2">
                  {(appt as any).isEmergency && (appt as any).paymentStatus !== 'paid' && (
                    <button
                      type="button"
                      onClick={() => void handlePayNow(appt._id)}
                      className="btn-primary text-xs px-3.5 py-1.5 bg-emerald-600 text-white rounded-lg shadow-emerald-sm animate-pulse hover:bg-emerald-700 font-bold"
                    >
                      💳 Pay Now
                    </button>
                  )}
                  <Link href={`/patient/appointments/${appt._id}`} className="btn-secondary text-xs px-3.5 py-1.5 relative">
                    Chat
                    {(appt as any).unreadMessageCount > 0 && (
                      <span className="absolute -top-1.5 -right-1.5 flex h-4 w-4 items-center justify-center rounded-full bg-rose-600 text-[9px] font-bold text-white shadow">
                        {(appt as any).unreadMessageCount > 9 ? '9+' : (appt as any).unreadMessageCount}
                      </span>
                    )}
                  </Link>
                  <Link href={`/patient/appointments/${appt._id}`} className="btn-secondary text-xs px-3.5 py-1.5">
                    View details
                  </Link>
                  {filter === 'upcoming' && appt.status === 'pending' && (
                    <button
                      type="button"
                      disabled={actionId === appt._id}
                      onClick={() => void handleCancel(appt._id)}
                      className="btn-secondary text-xs px-3.5 py-1.5 text-rose-600 border-rose-200 dark:border-rose-900/50 dark:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-950/20 disabled:opacity-60"
                    >
                      {actionId === appt._id ? 'Cancelling...' : 'Cancel'}
                    </button>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
