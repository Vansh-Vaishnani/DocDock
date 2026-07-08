'use client';

import Link from 'next/link';
import { useCallback, useEffect, useState } from 'react';
import { io } from 'socket.io-client';

import { useAuth } from '../../auth/auth-context';
import { fetchDoctorDashboard, fetchDoctorReviews, fetchDoctorAppointments, type DoctorDashboard } from '../api';
import { SkeletonGrid } from '@/components/ui';

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

// ─── Icons ───────────────────────────────────────────────────
function Icon({ path, size = 18, className = '' }: { path: string; size?: number; className?: string }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" className={className}>
      <path d={path} />
    </svg>
  );
}

// ─── Quick actions ────────────────────────────────────────────
const quickActions = [
  { label: 'Appointments', href: '/doctor/appointments', icon: 'M8 6h13M8 12h13M8 18h13M3 6h.01M3 12h.01M3 18h.01', color: 'text-emerald-600 bg-emerald-50 dark:bg-emerald-950/40' },
  { label: 'Availability', href: '/doctor/availability', icon: 'M12 2a10 10 0 1 0 0 20 10 10 0 0 0 0-20z M12 6v6l4 2', color: 'text-blue-600 bg-blue-50 dark:bg-blue-950/40' },
  { label: 'Prescriptions', href: '/doctor/prescriptions', icon: 'M9 11l3 3L22 4 M21 12v7a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11', color: 'text-violet-600 bg-violet-50 dark:bg-violet-950/40' },
  { label: 'Earnings', href: '/doctor/earnings', icon: 'M12 1v22M17 5H9.5a3.5 3.5 0 1 0 0 7h5a3.5 3.5 0 1 1 0 7H6', color: 'text-amber-600 bg-amber-50 dark:bg-amber-950/40' },
  { label: 'Profile', href: '/doctor/profile', icon: 'M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2 M12 11a4 4 0 1 0 0-8 4 4 0 0 0 0 8z', color: 'text-teal-600 bg-teal-50 dark:bg-teal-950/40' },
  { label: 'Settings', href: '/doctor/settings', icon: 'M12 15a3 3 0 1 0 0-6 3 3 0 0 0 0 6z M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83-2.83l.06-.06A1.65 1.65 0 0 0 4.68 15a1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 2.83-2.83l.06.06A1.65 1.65 0 0 0 9 4.68a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 2.83l-.06.06A1.65 1.65 0 0 0 19.4 9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z', color: 'text-slate-600 bg-slate-100 dark:bg-slate-800' },
];

// ─── Stat Card ────────────────────────────────────────────────
function StatCard({ label, value, detail, icon, color }: {
  label: string; value: string; detail: string; icon: string; color: string;
}) {
  return (
    <div className="dd-card hover-lift flex flex-col gap-3">
      <div className={`flex h-9 w-9 items-center justify-center rounded-xl ${color}`}>
        <Icon path={icon} size={16} />
      </div>
      <div>
        <p className="text-xs font-medium" style={{ color: 'var(--text-muted)' }}>{label}</p>
        <p className="mt-1.5 text-3xl font-bold tracking-tight" style={{ color: 'var(--text-primary)' }}>{value}</p>
        <p className="mt-1 text-xs" style={{ color: 'var(--text-secondary)' }}>{detail}</p>
      </div>
    </div>
  );
}

// ─── Review Star ──────────────────────────────────────────────
function StarRating({ rating }: { rating: number }) {
  return (
    <div className="flex gap-0.5">
      {[1, 2, 3, 4, 5].map(s => (
        <span key={s} className={`text-sm ${s <= rating ? 'text-amber-400' : 'text-slate-300 dark:text-slate-700'}`}>★</span>
      ))}
    </div>
  );
}

export default function DoctorDashboardPage() {
  const { user } = useAuth();
  const [dashboard, setDashboard] = useState<DoctorDashboard | null>(null);
  const [reviews, setReviews] = useState<Array<{ _id: string; rating: number; comment: string; createdAt: string; patientName?: string }>>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [emergencyAppts, setEmergencyAppts] = useState<any[]>([]);

  const load = useCallback(async () => {
    try {
      const [dashboardData, appts] = await Promise.all([
        fetchDoctorDashboard(),
        fetchDoctorAppointments('all').catch(() => [])
      ]);
      const doctorId = dashboardData.profile?._id;
      const reviewData = doctorId ? await fetchDoctorReviews(doctorId) : { reviews: [] };
      setDashboard(dashboardData);
      setReviews(reviewData.reviews || []);
      const activeEmergencies = appts.filter((a: any) => a.isEmergency && ['pending', 'accepted', 'doctor_on_way', 'arrived', 'in_consultation'].includes(a.status));
      setEmergencyAppts(activeEmergencies);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Unable to load dashboard.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { void load(); }, [load]);

  useEffect(() => {
    const interval = setInterval(() => { void load(); }, 5000);
    const token = getStoredAccessToken();
    if (!token) return () => clearInterval(interval);

    const socket = io(`${SOCKET_BASE}/notifications`, { transports: ['websocket', 'polling'], auth: { token } });

    socket.on('connect', () => {
      try {
        const raw = window.localStorage.getItem('docdock-auth') || window.sessionStorage.getItem('docdock-auth');
        if (raw) {
          const parsed = JSON.parse(raw) as { user?: { _id?: string } };
          const userId = parsed.user?._id;
          if (userId) { socket.emit('join', userId); }
        }
      } catch (e) { console.error('Failed to parse docdock-auth:', e); }
    });

    socket.on('notification', (newNotification: any) => {
      const statusTypes = ['payment_received', 'appointment_pending', 'cancelled_by_patient', 'completed', 'doctor_verified', 'admin_rejected_account', 'admin_suspended_account'];
      if (statusTypes.includes(newNotification.type)) { void load(); }
    });

    return () => { clearInterval(interval); socket.disconnect(); };
  }, [load]);

  const stats = dashboard?.stats;
  const profile = dashboard?.profile;
  const firstName = (user?.fullName || profile?.fullName || 'Doctor').split(' ')[0];
  const hour = new Date().getHours();
  const greeting = hour < 12 ? 'Good morning' : hour < 17 ? 'Good afternoon' : 'Good evening';
  const isVerified = stats?.verificationStatus === 'approved';
  const isOnline = stats?.availabilityStatus;

  return (
    <div className="space-y-6">
      {/* ── Emergency banners ──────────────────────── */}
      {emergencyAppts.map((appt) => (
        <div
          key={appt._id}
          className="rounded-2xl border-2 border-rose-500 bg-rose-50 dark:bg-rose-950/30 dark:border-rose-700 p-4 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3 animate-pulse"
        >
          <div className="flex items-center gap-3">
            <span className="flex h-8 w-8 items-center justify-center rounded-xl bg-rose-100 dark:bg-rose-950/60 text-rose-600">
              <Icon path="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" size={14} />
            </span>
            <div>
              <p className="font-bold text-rose-700 dark:text-rose-400 text-sm">HIGH PRIORITY — Emergency SOS</p>
              <p className="text-xs text-rose-600 dark:text-rose-500 mt-0.5">
                Patient: {appt.patientName}
                {appt.patientPhone && ` • ${appt.patientPhone}`}
                {' • '}{new Date(appt.scheduledAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
              </p>
            </div>
          </div>
          <Link href="/doctor/appointments" className="flex-shrink-0 rounded-full bg-rose-600 px-4 py-2 text-xs font-semibold text-white hover:bg-rose-700 transition">
            Open Appointment →
          </Link>
        </div>
      ))}

      {/* ── Welcome Hero ──────────────────────────── */}
      <div
        className="relative overflow-hidden rounded-3xl p-6 text-white sm:p-8"
        style={{ background: 'linear-gradient(135deg, #10b981 0%, #059669 100%)' }}
      >
        <div className="absolute inset-0 overflow-hidden pointer-events-none" aria-hidden="true">
          <div className="absolute -right-16 -top-16 h-64 w-64 rounded-full bg-white/10 blur-3xl" />
          <div className="absolute -bottom-12 -left-12 h-48 w-48 rounded-full bg-white/5 blur-3xl" />
        </div>
        <div className="relative flex flex-col gap-5 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <div className="flex items-center gap-2 mb-2">
              <span className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-semibold ${isOnline ? 'bg-emerald-500/20 text-emerald-100' : 'bg-slate-500/20 text-slate-200'}`}>
                <span className={`h-1.5 w-1.5 rounded-full ${isOnline ? 'bg-emerald-200 animate-pulse' : 'bg-slate-400'}`} />
                {isOnline ? 'Online' : 'Offline'}
              </span>
              {isVerified && (
                <span className="inline-flex items-center gap-1 rounded-full bg-white/20 px-2.5 py-1 text-xs font-semibold text-emerald-100">
                  ✓ Verified Doctor
                </span>
              )}
            </div>
            <p className="text-sm text-emerald-100">{greeting},</p>
            <div className="flex items-center gap-2 mt-0.5">
              <h1 className="text-2xl font-bold sm:text-3xl">Dr. {firstName}</h1>
              <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-white/25 text-white">
                <Icon path="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2 M12 11a4 4 0 1 0 0-8 4 4 0 0 0 0 8z" size={14} />
              </span>
            </div>
            <p className="mt-2 text-sm text-emerald-50 max-w-md">Manage your practice, appointments, and earnings from one place.</p>
          </div>
          <div className="flex flex-wrap gap-3">
            <Link href="/doctor/appointments" className="inline-flex items-center gap-2 rounded-full bg-emerald-500 px-4 py-2.5 text-sm font-semibold text-white hover:bg-emerald-400 transition">
              Today's Appointments
            </Link>
            <Link href="/doctor/availability" className="inline-flex items-center gap-2 rounded-full bg-white/10 border border-white/20 px-4 py-2.5 text-sm font-semibold text-white hover:bg-white/20 transition">
              Availability
            </Link>
          </div>
        </div>
      </div>

      {/* ── Verification alert ─────────────────────── */}
      {!loading && !isVerified && (
        <div className="flex items-center gap-3 rounded-2xl border border-amber-200 bg-amber-50 dark:bg-amber-950/20 dark:border-amber-800 px-4 py-3">
          <div className="flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-xl bg-amber-100 text-amber-600 dark:bg-amber-950/40">
            <Icon path="M12 9v4M12 17h.01 M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z" size={14} />
          </div>
          <div>
            <p className="text-sm font-semibold text-amber-800 dark:text-amber-300">Pending Verification</p>
            <p className="text-xs text-amber-700 dark:text-amber-400">Your account is awaiting admin approval. You cannot accept appointments yet.</p>
          </div>
        </div>
      )}

      {/* Error */}
      {error && (
        <div className="rounded-2xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700 dark:bg-rose-950/30 dark:border-rose-900 dark:text-rose-400">
          {error}
        </div>
      )}

      {/* ── Stats row ──────────────────────────────── */}
      {loading ? (
        <SkeletonGrid count={4} />
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
          <StatCard
            label="Today's Appointments"
            value={String(stats?.todayAppointments ?? 0)}
            detail="Scheduled for today"
            icon="M8 6h13M8 12h13M8 18h13M3 6h.01M3 12h.01M3 18h.01"
            color="text-emerald-600 bg-emerald-50 dark:bg-emerald-950/40"
          />
          <StatCard
            label="Total Patients"
            value={String(stats?.totalPatients ?? 0)}
            detail="Unique patients served"
            icon="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2 M23 21v-2a4 4 0 0 0-3-3.87 M16 3.13a4 4 0 0 1 0 7.75"
            color="text-blue-600 bg-blue-50 dark:bg-blue-950/40"
          />
          <StatCard
            label="Average Rating"
            value={`${stats?.averageRating?.toFixed(1) ?? '0.0'} ★`}
            detail={`${stats?.reviewCount ?? 0} reviews received`}
            icon="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z"
            color="text-amber-600 bg-amber-50 dark:bg-amber-950/40"
          />
          <StatCard
            label="Total Earnings"
            value={`₹${stats?.totalEarnings ?? 0}`}
            detail="From paid appointments"
            icon="M12 1v22M17 5H9.5a3.5 3.5 0 1 0 0 7h5a3.5 3.5 0 1 1 0 7H6"
            color="text-violet-600 bg-violet-50 dark:bg-violet-950/40"
          />
        </div>
      )}

      {/* ── Second stats row ───────────────────────── */}
      {!loading && (
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
          <StatCard
            label="Upcoming Appointments"
            value={String(stats?.upcomingAppointments ?? 0)}
            detail="Future confirmed visits"
            icon="M12 2a10 10 0 1 0 0 20 10 10 0 0 0 0-20z M12 6v6l4 2"
            color="text-teal-600 bg-teal-50 dark:bg-teal-950/40"
          />
          <StatCard
            label="Profile Completion"
            value={`${stats?.profileCompletionPercent ?? 0}%`}
            detail="Complete to improve visibility"
            icon="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2 M12 11a4 4 0 1 0 0-8 4 4 0 0 0 0 8z"
            color="text-slate-600 bg-slate-100 dark:bg-slate-800"
          />
          <StatCard
            label="Verification Status"
            value={isVerified ? 'Verified ✓' : 'Pending'}
            detail={isVerified ? 'Accepting appointments' : 'Awaiting admin approval'}
            icon="M9 12l2 2 4-4m6 2a9 9 0 1 1-18 0 9 9 0 0 1 18 0z"
            color={isVerified ? 'text-emerald-600 bg-emerald-50 dark:bg-emerald-950/40' : 'text-amber-600 bg-amber-50 dark:bg-amber-950/40'}
          />
          <StatCard
            label="Availability"
            value={isOnline ? 'Online' : 'Offline'}
            detail="Toggle from availability page"
            icon="M12 2a10 10 0 1 0 0 20 10 10 0 0 0 0-20z M12 8v4M12 16h.01"
            color={isOnline ? 'text-emerald-600 bg-emerald-50 dark:bg-emerald-950/40' : 'text-slate-500 bg-slate-100 dark:bg-slate-800'}
          />
        </div>
      )}

      {/* ── Recent Reviews ────────────────────────── */}
      {reviews.length > 0 && (
        <div className="dd-card">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-sm font-semibold" style={{ color: 'var(--text-primary)' }}>Recent Reviews</h2>
            <span className="text-xs" style={{ color: 'var(--text-muted)' }}>{reviews.length} total</span>
          </div>
          <div className="space-y-3">
            {reviews.slice(0, 3).map((review) => (
              <div key={review._id} className="flex items-start gap-3 rounded-xl p-3" style={{ backgroundColor: 'var(--bg-tertiary)' }}>
                <div className="flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-full bg-amber-100 text-xs font-bold text-amber-600 dark:bg-amber-950/60">
                  {(review.patientName || 'P').charAt(0).toUpperCase()}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between gap-2">
                    <p className="text-xs font-semibold" style={{ color: 'var(--text-primary)' }}>{review.patientName || 'Anonymous Patient'}</p>
                    <StarRating rating={review.rating} />
                  </div>
                  {review.comment && (
                    <p className="mt-0.5 text-xs line-clamp-2" style={{ color: 'var(--text-secondary)' }}>{review.comment}</p>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
