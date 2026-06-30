'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';

import { useAuth } from '../../auth/auth-context';
import { useToast } from '../../auth/toast-provider';
import {
  fetchPatientProfile,
  fetchPatientAppointments,
  fetchPatientAppointmentDetail,
  submitReview,
  type PatientProfile
} from '../api';
import { Skeleton, SkeletonGrid } from '@/components/ui';

// ─── Icons ───────────────────────────────────────────────────
function Icon({ path, size = 20, className = '' }: { path: string; size?: number; className?: string }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" className={className}>
      <path d={path} />
    </svg>
  );
}

// ─── Quick Actions ────────────────────────────────────────────
const quickActions = [
  { label: 'Find Doctor', href: '/find-doctors', icon: 'M21 21l-6-6m2-5a7 7 0 1 1-14 0 7 7 0 0 1 14 0z', color: 'text-emerald-600 bg-emerald-50 dark:bg-emerald-950/40' },
  { label: 'Appointments', href: '/patient/appointments', icon: 'M8 6h13M8 12h13M8 18h13M3 6h.01M3 12h.01M3 18h.01', color: 'text-blue-600 bg-blue-50 dark:bg-blue-950/40' },
  { label: 'Medical History', href: '/patient/medical-history', icon: 'M12 8v4l3 3m6-3a9 9 0 1 1-18 0 9 9 0 0 1 18 0z', color: 'text-violet-600 bg-violet-50 dark:bg-violet-950/40' },
  { label: 'Addresses', href: '/patient/addresses', icon: 'M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z M12 7a3 3 0 1 0 0 6 3 3 0 0 0 0-6z', color: 'text-amber-600 bg-amber-50 dark:bg-amber-950/40' },
  { label: 'Profile', href: '/patient/profile', icon: 'M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2 M12 11a4 4 0 1 0 0-8 4 4 0 0 0 0 8z', color: 'text-teal-600 bg-teal-50 dark:bg-teal-950/40' },
  { label: 'Allergies', href: '/patient/allergies', icon: 'M12 2a10 10 0 1 0 0 20 10 10 0 0 0 0-20z M12 8v4M12 16h.01', color: 'text-rose-600 bg-rose-50 dark:bg-rose-950/40' },
];

// ─── Stat Card ────────────────────────────────────────────────
function StatCard({ label, value, detail, icon, color }: {
  label: string; value: string; detail: string;
  icon: string; color: string;
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

// ─── Review Modal ─────────────────────────────────────────────
function ReviewModal({
  doctorName,
  rating,
  comment,
  submitting,
  onRatingChange,
  onCommentChange,
  onSubmit,
  onDismiss,
}: {
  doctorName: string;
  rating: number;
  comment: string;
  submitting: boolean;
  onRatingChange: (r: number) => void;
  onCommentChange: (c: string) => void;
  onSubmit: () => void;
  onDismiss: () => void;
}) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm px-4">
      <div className="w-full max-w-lg rounded-3xl p-6 shadow-large animate-slide-up" style={{ backgroundColor: 'var(--card-bg)', border: '1px solid var(--card-border)' }}>
        <div className="flex items-start justify-between gap-3">
          <div>
            <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-amber-50 text-amber-500 dark:bg-amber-950/40 mb-3">
              <Icon path="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z" size={18} />
            </div>
            <h3 className="text-lg font-semibold" style={{ color: 'var(--text-primary)' }}>Rate your consultation</h3>
            <p className="mt-1 text-sm" style={{ color: 'var(--text-secondary)' }}>How was your visit with Dr. {doctorName}?</p>
          </div>
          <button type="button" onClick={onDismiss} className="btn-ghost text-xs px-3 py-1.5 mt-1">Later</button>
        </div>

        <div className="mt-5 space-y-4">
          {/* Star Rating */}
          <div className="flex gap-2">
            {[1, 2, 3, 4, 5].map((star) => (
              <button
                key={star}
                type="button"
                onClick={() => onRatingChange(star)}
                className={`flex h-10 w-10 items-center justify-center rounded-xl text-lg transition-all hover:scale-110 ${
                  rating >= star
                    ? 'bg-amber-400 text-white shadow-sm'
                    : 'text-slate-300 hover:text-amber-300'
                }`}
                style={{ backgroundColor: rating >= star ? undefined : 'var(--bg-tertiary)' }}
              >
                ★
              </button>
            ))}
            <span className="ml-2 self-center text-sm font-medium" style={{ color: 'var(--text-secondary)' }}>{rating}/5</span>
          </div>

          <textarea
            value={comment}
            onChange={(e) => onCommentChange(e.target.value)}
            rows={3}
            className="dd-input resize-none"
            placeholder="Share your experience (optional)..."
          />

          <div className="flex gap-3 justify-end">
            <button type="button" onClick={onDismiss} className="btn-secondary">Not now</button>
            <button type="button" disabled={submitting} onClick={onSubmit} className="btn-primary">
              {submitting ? 'Submitting...' : 'Submit Review'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

// ─── SOS Modal ────────────────────────────────────────────────
function SosModal({ result, onClose }: { result: any; onClose: () => void }) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-rose-950/60 backdrop-blur-sm px-4">
      <div className="w-full max-w-md rounded-3xl border-2 border-rose-200 bg-white p-6 shadow-2xl animate-slide-up dark:border-rose-900 dark:bg-slate-900">
        <div className="flex items-center gap-3 mb-4">
          <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-rose-100 dark:bg-rose-950/60">
            <Icon path="M12 9v4M12 17h.01M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z" size={20} className="text-rose-600 animate-pulse" />
          </div>
          <div>
            <h3 className="text-lg font-bold text-rose-700 dark:text-rose-400">Emergency SOS Activated</h3>
            <p className="text-xs text-rose-500">Doctor has been dispatched to you</p>
          </div>
        </div>

        <p className="text-sm mb-4" style={{ color: 'var(--text-secondary)' }}>
          The nearest available verified doctor has been assigned for an emergency home visit. An appointment has been auto-created.
        </p>

        <div className="rounded-2xl bg-rose-50 border border-rose-100 p-4 dark:bg-rose-950/30 dark:border-rose-900">
          <p className="text-xs font-semibold text-rose-700 dark:text-rose-400 mb-2">Assigned Doctor</p>
          <p className="font-semibold text-sm" style={{ color: 'var(--text-primary)' }}>Dr. {result.doctor?.fullName}</p>
          {result.doctor?.clinicName && <p className="text-xs mt-0.5" style={{ color: 'var(--text-muted)' }}>{result.doctor.clinicName}</p>}
          {result.appointmentId && (
            <Link
              href={`/patient/appointments/${result.appointmentId}`}
              className="mt-3 inline-flex text-xs font-semibold text-rose-700 dark:text-rose-400 hover:underline"
              onClick={onClose}
            >
              Track arrival & open chat →
            </Link>
          )}
        </div>

        <div className="mt-4 grid grid-cols-3 gap-2 text-center">
          {[{ num: '102', label: 'Ambulance' }, { num: '100', label: 'Police' }, { num: '112', label: 'Helpline' }].map(({ num, label }) => (
            <div key={num} className="rounded-xl py-2.5" style={{ backgroundColor: 'var(--bg-tertiary)' }}>
              <p className="text-base font-bold text-rose-600">{num}</p>
              <p className="text-[10px] mt-0.5" style={{ color: 'var(--text-muted)' }}>{label}</p>
            </div>
          ))}
        </div>

        <button type="button" onClick={onClose} className="btn-danger w-full mt-5">
          Acknowledged
        </button>
      </div>
    </div>
  );
}

// ─── Main Dashboard ───────────────────────────────────────────
export default function PatientDashboardPage() {
  const { user } = useAuth();
  const [profile, setProfile] = useState<PatientProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const { showToast } = useToast();

  const [sosLoading, setSosLoading] = useState(false);
  const [sosResult, setSosResult] = useState<any | null>(null);
  const [showSosModal, setShowSosModal] = useState(false);

  const [pendingReviewAppointmentId, setPendingReviewAppointmentId] = useState<string | null>(null);
  const [pendingReviewDoctorName, setPendingReviewDoctorName] = useState<string | null>(null);
  const [showReviewModal, setShowReviewModal] = useState(false);
  const [rating, setRating] = useState(5);
  const [comment, setComment] = useState('');
  const [submittingReview, setSubmittingReview] = useState(false);
  const [snoozedThisSession, setSnoozedThisSession] = useState(false);

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

  const handleTriggerSos = async () => {
    if (!navigator.geolocation) {
      showToast('Geolocation is not supported by your browser.', 'error');
      return;
    }
    setSosLoading(true);
    try {
      const position = await new Promise<GeolocationPosition>((resolve, reject) => {
        navigator.geolocation.getCurrentPosition(resolve, reject, { enableHighAccuracy: true, timeout: 8000, maximumAge: 0 });
      });
      const { latitude, longitude } = position.coords;
      const token = getStoredAccessToken();
      const API_BASE = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000/api/v1';
      const response = await fetch(`${API_BASE}/patients/sos`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
        body: JSON.stringify({ latitude, longitude })
      });
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || 'Failed to trigger SOS.');
      }
      const resData = await response.json();
      setSosResult(resData.data);
      setShowSosModal(true);
      showToast('Emergency SOS triggered! Doctor assigned.', 'success');
    } catch (err: any) {
      showToast(err.message || 'Unable to coordinate Emergency SOS.', 'error');
    } finally {
      setSosLoading(false);
    }
  };

  useEffect(() => {
    let mounted = true;
    const load = async () => {
      setLoading(true);
      try {
        const result = await fetchPatientProfile();
        if (mounted) { setProfile(result); setError(null); }
      } catch (err: unknown) {
        if (mounted) { setProfile(null); setError(err instanceof Error ? err.message : 'Unable to load your profile.'); }
      } finally {
        if (mounted) setLoading(false);
      }
    };
    void load();
    return () => { mounted = false; };
  }, []);

  useEffect(() => {
    if (loading || error || !profile) return;
    let mounted = true;
    const dismissedKeyPrefix = 'docdock-review-modal-dismissed:';
    const findOldestPendingReview = async () => {
      try {
        const list = await fetchPatientAppointments('completed');
        if (!mounted || !list?.length) return;
        list.sort((a, b) => new Date(a.scheduledAt).getTime() - new Date(b.scheduledAt).getTime());
        for (const item of list) {
          if (snoozedThisSession) return;
          const dismissed = typeof window !== 'undefined' ? window.sessionStorage.getItem(`${dismissedKeyPrefix}${item._id}`) === '1' : false;
          if (dismissed) continue;
          const detail = await fetchPatientAppointmentDetail(item._id);
          if (!mounted || !detail) continue;
          if (!detail.review) {
            setPendingReviewAppointmentId(detail.appointment._id);
            setPendingReviewDoctorName(detail.doctor?.fullName ?? item.doctorName ?? 'your doctor');
            setRating(5); setComment(''); setShowReviewModal(true);
            return;
          }
        }
      } catch (err: unknown) { console.warn('Error while checking pending reviews', err); }
    };
    void findOldestPendingReview();
    return () => { mounted = false; };
  }, [loading, error, profile, snoozedThisSession]);

  const handleDismissReviewModal = () => {
    if (!pendingReviewAppointmentId) { setShowReviewModal(false); return; }
    if (typeof window !== 'undefined') {
      window.sessionStorage.setItem(`docdock-review-modal-dismissed:${pendingReviewAppointmentId}`, '1');
    }
    setSnoozedThisSession(true);
    setShowReviewModal(false);
  };

  const handleSubmitReview = async () => {
    if (!pendingReviewAppointmentId || submittingReview) return;
    setSubmittingReview(true);
    try {
      await submitReview(pendingReviewAppointmentId, { rating, comment });
      showToast('Review submitted. Thank you!', 'success');
      setShowReviewModal(false);
      setTimeout(async () => {
        try {
          const list = await fetchPatientAppointments('completed');
          list.sort((a, b) => new Date(a.scheduledAt).getTime() - new Date(b.scheduledAt).getTime());
          for (const item of list) {
            if (item._id === pendingReviewAppointmentId) continue;
            const detail = await fetchPatientAppointmentDetail(item._id);
            if (!detail || detail.review) continue;
            setPendingReviewAppointmentId(detail.appointment._id);
            setPendingReviewDoctorName(detail.doctor?.fullName ?? item.doctorName ?? 'your doctor');
            setRating(5); setComment(''); setShowReviewModal(true);
            return;
          }
        } catch { /* ignore */ }
      }, 300);
    } catch (err: unknown) {
      showToast(err instanceof Error ? err.message : 'Unable to submit review.', 'error');
    } finally {
      setSubmittingReview(false);
    }
  };

  const addressCount = profile?.addresses?.length ?? 0;
  const allergyCount = profile?.allergies?.length ?? 0;
  const historyCount = profile?.medicalHistory?.length ?? 0;
  const profileComplete = profile?.fullName && profile?.phone && profile?.bloodGroup;
  const firstName = (user?.fullName || profile?.fullName || 'Patient').split(' ')[0];
  const hour = new Date().getHours();
  const greeting = hour < 12 ? 'Good morning' : hour < 17 ? 'Good afternoon' : 'Good evening';

  return (
    <div className="space-y-6">
      {/* Review modal */}
      {showReviewModal && pendingReviewAppointmentId && (
        <ReviewModal
          doctorName={pendingReviewDoctorName || 'your doctor'}
          rating={rating}
          comment={comment}
          submitting={submittingReview}
          onRatingChange={setRating}
          onCommentChange={setComment}
          onSubmit={handleSubmitReview}
          onDismiss={handleDismissReviewModal}
        />
      )}

      {/* SOS modal */}
      {showSosModal && sosResult && <SosModal result={sosResult} onClose={() => setShowSosModal(false)} />}

      {/* ── Welcome Hero ──────────────────────────── */}
      <div className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-emerald-600 to-emerald-700 p-6 text-white sm:p-8 shadow-emerald">
        <div className="absolute inset-0 overflow-hidden pointer-events-none" aria-hidden="true">
          <div className="absolute -right-16 -top-16 h-64 w-64 rounded-full bg-white/10 blur-3xl" />
          <div className="absolute -bottom-16 -left-16 h-64 w-64 rounded-full bg-white/10 blur-3xl" />
        </div>
        <div className="relative flex flex-col gap-5 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <p className="text-sm font-medium text-emerald-200">{greeting},</p>
            <div className="flex items-center gap-2 mt-1">
              <h1 className="text-2xl font-bold sm:text-3xl">{firstName}</h1>
              <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-white/20 text-white">
                <Icon path="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2 M12 11a4 4 0 1 0 0-8 4 4 0 0 0 0 8z" size={14} />
              </span>
            </div>
            <p className="mt-2 text-sm text-emerald-100 max-w-md">
              Your health dashboard — manage appointments, profile, and medical records all in one place.
            </p>
          </div>
          <div className="flex flex-wrap gap-3">
            <button
              type="button"
              disabled={sosLoading}
              onClick={handleTriggerSos}
              className="inline-flex items-center gap-2 rounded-full bg-white/15 px-4 py-2.5 text-sm font-semibold text-white border border-white/30 transition hover:bg-white/25 disabled:opacity-60"
            >
              <Icon path="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" size={14} className="text-white animate-pulse" />
              {sosLoading ? 'Dispatching...' : 'Emergency SOS'}
            </button>
            <Link
              href="/find-doctors"
              className="inline-flex items-center gap-2 rounded-full bg-white px-4 py-2.5 text-sm font-semibold text-emerald-700 transition hover:bg-emerald-50"
            >
              Find Doctor
            </Link>
          </div>
        </div>
      </div>

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
            label="Profile status"
            value={profileComplete ? 'Complete' : 'Incomplete'}
            detail={profileComplete ? 'All details up to date.' : 'Add blood group & contact.'}
            icon="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2 M12 11a4 4 0 1 0 0-8 4 4 0 0 0 0 8z"
            color={`${profileComplete ? 'text-emerald-600 bg-emerald-50 dark:bg-emerald-950/40' : 'text-amber-600 bg-amber-50 dark:bg-amber-950/40'}`}
          />
          <StatCard
            label="Saved addresses"
            value={String(addressCount)}
            detail={addressCount > 0 ? 'Ready for home visits.' : 'Add your first address.'}
            icon="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z M12 7a3 3 0 1 0 0 6 3 3 0 0 0 0-6z"
            color="text-blue-600 bg-blue-50 dark:bg-blue-950/40"
          />
          <StatCard
            label="Allergies"
            value={String(allergyCount)}
            detail={allergyCount > 0 ? 'Recorded for safer care.' : 'None recorded yet.'}
            icon="M12 2a10 10 0 1 0 0 20 10 10 0 0 0 0-20z M12 8v4M12 16h.01"
            color="text-rose-600 bg-rose-50 dark:bg-rose-950/40"
          />
          <StatCard
            label="Medical notes"
            value={String(historyCount)}
            detail={historyCount > 0 ? 'History entries on file.' : 'No history added yet.'}
            icon="M12 8v4l3 3m6-3a9 9 0 1 1-18 0 9 9 0 0 1 18 0z"
            color="text-violet-600 bg-violet-50 dark:bg-violet-950/40"
          />
        </div>
      )}



      {/* ── Next steps + Health summary ───────────── */}
      <div className="grid gap-5 lg:grid-cols-[1.4fr_0.6fr]">
        <div className="dd-card">
          <h2 className="mb-4 text-sm font-semibold" style={{ color: 'var(--text-primary)' }}>Your next steps</h2>
          <div className="grid gap-3 sm:grid-cols-2">
            {[
              { title: 'Complete profile', desc: 'Review your contact details and blood group.', href: '/patient/profile', icon: 'M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2 M12 11a4 4 0 1 0 0-8 4 4 0 0 0 0 8z', color: 'text-emerald-600 bg-emerald-50 dark:bg-emerald-950/40' },
              { title: 'Add addresses', desc: 'Store home and emergency locations.', href: '/patient/addresses', icon: 'M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z M12 7a3 3 0 1 0 0 6 3 3 0 0 0 0-6z', color: 'text-blue-600 bg-blue-50 dark:bg-blue-950/40' },
              { title: 'Update allergies', desc: 'Keep medication sensitivities current.', href: '/patient/allergies', icon: 'M12 2a10 10 0 1 0 0 20 10 10 0 0 0 0-20z M12 8v4M12 16h.01', color: 'text-rose-600 bg-rose-50 dark:bg-rose-950/40' },
              { title: 'Account settings', desc: 'Manage password and preferences.', href: '/patient/settings', icon: 'M12 15a3 3 0 1 0 0-6 3 3 0 0 0 0 6z M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83-2.83l.06-.06A1.65 1.65 0 0 0 4.68 15a1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 2.83-2.83l.06.06A1.65 1.65 0 0 0 9 4.68a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 2.83l-.06.06A1.65 1.65 0 0 0 19.4 9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z', color: 'text-slate-600 bg-slate-100 dark:bg-slate-800' },
            ].map((item) => (
              <Link
                key={item.title}
                href={item.href}
                className="group flex items-start gap-3 rounded-xl border p-3.5 transition-all hover:border-emerald-300 hover:bg-emerald-50/50 dark:hover:bg-emerald-950/20"
                style={{ borderColor: 'var(--border-color)' }}
              >
                <div className={`flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-xl mt-0.5 ${item.color}`}>
                  <Icon path={item.icon} size={14} />
                </div>
                <div>
                  <p className="text-sm font-semibold" style={{ color: 'var(--text-primary)' }}>{item.title}</p>
                  <p className="mt-0.5 text-xs" style={{ color: 'var(--text-muted)' }}>{item.desc}</p>
                </div>
              </Link>
            ))}
          </div>
        </div>

        {/* Health summary */}
        <div className="dd-card">
          <p className="text-xs font-bold uppercase tracking-widest text-emerald-600 dark:text-emerald-400 mb-4">Health Summary</p>
          {loading ? (
            <div className="space-y-3">
              {[...Array(4)].map((_, i) => (
                <div key={i} className="h-4 rounded skeleton" style={{ width: `${60 + (i * 15) % 40}%` }} />
              ))}
            </div>
          ) : profile ? (
            <div className="space-y-3 text-sm">
              {[
                { label: 'Blood Group', value: profile.bloodGroup || 'Not set' },
                { label: 'Phone', value: profile.phone || 'Not set' },
                { label: 'Default Address', value: profile.addresses.find(a => a.isDefault)?.label || 'None set' },
                { label: 'Email', value: profile.email },
              ].map(({ label, value }) => (
                <div key={label} className="flex items-center justify-between gap-2 border-b border-slate-100 dark:border-slate-800 pb-2.5 last:border-0 last:pb-0">
                  <span className="text-xs" style={{ color: 'var(--text-secondary)' }}>{label}</span>
                  <span className="font-semibold text-xs text-right truncate max-w-[140px]" style={{ color: 'var(--text-primary)' }}>{value}</span>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-sm" style={{ color: 'var(--text-secondary)' }}>Profile data unavailable.</p>
          )}
          <Link
            href="/patient/profile"
            className="mt-5 flex items-center gap-1.5 text-xs font-semibold text-emerald-600 hover:text-emerald-500 dark:text-emerald-400 dark:hover:text-emerald-300 transition-colors"
          >
            Update profile
            <Icon path="M5 12h14M12 5l7 7-7 7" size={12} />
          </Link>
        </div>
      </div>
    </div>
  );
}
