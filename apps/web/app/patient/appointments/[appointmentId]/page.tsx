'use client';

import Link from 'next/link';
import { useParams } from 'next/navigation';
import { useEffect, useMemo, useState } from 'react';

const REVIEW_MODAL_KEY_PREFIX = 'docdock-review-modal-dismissed';

import { useToast } from '../../../auth/toast-provider';
import { fetchPatientAppointmentDetail, submitReview, type AppointmentDetail } from '../../api';
import LeafletMap, { createSvgIcon } from '@/components/map/LeafletMap';
import dynamic from 'next/dynamic';
import 'leaflet/dist/leaflet.css';
const Marker = dynamic(() => import('react-leaflet').then((m) => m.Marker), { ssr: false });
const Polyline = dynamic(() => import('react-leaflet').then((m) => m.Polyline), { ssr: false });

const STAR_LABELS = ['Poor', 'Fair', 'Good', 'Very good', 'Excellent'];

function LiveTrackingMap({ detail }: { detail: AppointmentDetail }) {
  const patientCoords = detail.appointment?.address?.location?.coordinates;
  if (!patientCoords) return null;
  const patientLatLng = { lat: patientCoords[1], lng: patientCoords[0] };

  const initialDoctorCoords = (detail.doctor as any)?.location?.coordinates;
  const fallbackDoctor = { lat: patientLatLng.lat + 0.005, lng: patientLatLng.lng - 0.005 };
  const [doctorPos, setDoctorPos] = useState<{ lat: number; lng: number }>(initialDoctorCoords ? { lat: initialDoctorCoords[1], lng: initialDoctorCoords[0] } : fallbackDoctor);

  useEffect(() => {
    let t: any;
    if (detail.appointment?.status === 'doctor_on_way') {
      t = setInterval(() => {
        setDoctorPos((prev) => {
          const dx = patientLatLng.lat - prev.lat;
          const dy = patientLatLng.lng - prev.lng;
          const dist = Math.sqrt(dx * dx + dy * dy);
          if (dist < 0.0002) return prev;
          const step = 0.15; // fraction of remaining distance
          return { lat: prev.lat + dx * step, lng: prev.lng + dy * step };
        });
      }, 1500);
    }
    return () => { if (t) clearInterval(t); };
  }, [detail.appointment?.status]);

  const poly = [[doctorPos.lat, doctorPos.lng], [patientLatLng.lat, patientLatLng.lng]];

  return (
    <LeafletMap value={patientLatLng} minHeight={320} showSearch={false}>
      <Marker {...({ position: [patientLatLng.lat, patientLatLng.lng], icon: createSvgIcon('#0ea5e9') } as any)} />
      <Marker {...({ position: [doctorPos.lat, doctorPos.lng], icon: createSvgIcon('#16a34a') } as any)} />
      <Polyline {...({ positions: poly, pathOptions: { color: '#0ea5e9' } } as any)} />
      <div className="mt-2 text-sm text-slate-600">Doctor is on the way • ETA: approx. —</div>
    </LeafletMap>
  );
}

function formatDate(value?: string) {
  if (!value) return '—';
  return new Date(value).toLocaleString();
}

export default function AppointmentDetailsPage() {
  const params = useParams();
  const { showToast } = useToast();
  const appointmentId = Array.isArray(params?.appointmentId) ? params.appointmentId[0] : params?.appointmentId;
  const [detail, setDetail] = useState<AppointmentDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [submittingReview, setSubmittingReview] = useState(false);
  const [rating, setRating] = useState(5);
  const [comment, setComment] = useState('');
  const [reviewSubmitted, setReviewSubmitted] = useState(false);
  const [showReviewModal, setShowReviewModal] = useState(false);
  const [showPrescriptionModal, setShowPrescriptionModal] = useState(false);

  useEffect(() => {
    if (!appointmentId) return;
    let mounted = true;
    const load = async () => {
      setLoading(true);
      try {
        const data = await fetchPatientAppointmentDetail(appointmentId);
        if (!mounted) return;
        // Only update state when meaningful fields changed to avoid flicker during edits
        const prevStatus = detail?.appointment?.status;
        const nextStatus = data.appointment?.status;
        const prevRefund = detail?.payment?.refundStatus;
        const nextRefund = data.payment?.refundStatus;
        const prevPrescription = detail?.prescription?._id;
        const nextPrescription = data.prescription?._id;

        setDetail((prev) => {
          if (!prev) return data;
          if (prevStatus !== nextStatus || prevRefund !== nextRefund || prevPrescription !== nextPrescription) {
            return data;
          }
          // minor fields unchanged; preserve existing detail to avoid flicker
          return prev;
        });

        const hasReview = Boolean(data.review);
        setReviewSubmitted(hasReview);
        if (data.appointment?.status === 'completed' && !hasReview) {
          const dismissedKey = `${REVIEW_MODAL_KEY_PREFIX}:${appointmentId}`;
          const dismissed = typeof window !== 'undefined' ? window.sessionStorage.getItem(dismissedKey) === '1' : false;
          setShowReviewModal(!dismissed);
        } else {
          setShowReviewModal(false);
        }
      } catch (err: unknown) {
        showToast(err instanceof Error ? err.message : 'Unable to load appointment details.', 'error');
      } finally {
        setLoading(false);
      }
    };

    void load();
    return () => {
      mounted = false;
    };
  }, [appointmentId, showToast]);

  const handleReviewSubmit = async () => {
    if (!appointmentId || !detail) return;
    if (reviewSubmitted) return;

    setSubmittingReview(true);
    try {
      await submitReview(appointmentId, { rating, comment });
      setReviewSubmitted(true);
      setShowReviewModal(false);
      showToast('Review submitted successfully.', 'success');
      const refreshed = await fetchPatientAppointmentDetail(appointmentId);
      setDetail(refreshed);
    } catch (err: unknown) {
      showToast(err instanceof Error ? err.message : 'Unable to submit review.', 'error');
    } finally {
      setSubmittingReview(false);
    }
  };

  const canReview = useMemo(() => detail?.appointment?.status === 'completed' && !reviewSubmitted, [detail?.appointment?.status, reviewSubmitted]);

  const handleDismissReviewModal = () => {
    if (!appointmentId) return;
    const dismissedKey = `${REVIEW_MODAL_KEY_PREFIX}:${appointmentId}`;
    if (typeof window !== 'undefined') {
      window.sessionStorage.setItem(dismissedKey, '1');
    }
    setShowReviewModal(false);
  };

  if (loading) {
    return <div className="rounded-[28px] border border-slate-200 bg-white p-8 text-slate-600 shadow-sm">Loading appointment details...</div>;
  }

  if (!detail) {
    return <div className="rounded-[28px] border border-slate-200 bg-white p-8 text-slate-600 shadow-sm">Appointment not found.</div>;
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between gap-3">
        <Link href="/patient/appointments" className="text-sm font-semibold text-emerald-600">← Back to appointments</Link>
        <span className="rounded-full border border-slate-200 bg-white px-3 py-1.5 text-sm font-medium text-slate-700">
          {detail.appointment?.statusLabel ?? '—'}
        </span>
      </div>

      <section className="rounded-[28px] border border-slate-200 bg-white p-6 shadow-sm sm:p-8">
        <div className="flex flex-col gap-6 lg:flex-row lg:items-start lg:justify-between">
          <div>
            <p className="text-sm font-semibold uppercase tracking-[0.35em] text-emerald-600">Appointment details</p>
            <h2 className="mt-3 text-3xl font-semibold text-slate-900">Consultation with {detail.doctor?.fullName ?? 'Doctor'}</h2>
            <p className="mt-3 text-slate-600">A complete record of your visit, payment, prescription, and care journey.</p>
          </div>
          <div className="rounded-2xl bg-slate-50 p-4 text-sm text-slate-700">
            <p className="font-semibold text-slate-900">Scheduled</p>
            <p className="mt-1">{formatDate(detail.appointment?.scheduledAt)}</p>
          </div>
        </div>

        <div className="mt-8 grid gap-6 lg:grid-cols-[1.15fr_0.85fr]">
          <div className="space-y-6">
            <div className="rounded-2xl border border-slate-200 p-5">
              <h3 className="text-lg font-semibold text-slate-900">Care team</h3>
              <div className="mt-4 space-y-3 text-sm text-slate-600">
                <div><span className="font-medium text-slate-900">Doctor:</span> {detail.doctor?.fullName ?? '—'}</div>
                <div><span className="font-medium text-slate-900">Specialization:</span> {detail.doctor?.specialization || 'General care'}</div>
                <div><span className="font-medium text-slate-900">Phone:</span> {detail.doctor?.phone || '—'}</div>
              </div>
            </div>

            <div className="rounded-2xl border border-slate-200 p-5">
              <h3 className="text-lg font-semibold text-slate-900">Appointment overview</h3>
                <div className="mt-4 grid gap-3 text-sm text-slate-600 sm:grid-cols-2">
                <div><span className="font-medium text-slate-900">Date:</span> {formatDate(detail.appointment?.scheduledAt)}</div>
                <div><span className="font-medium text-slate-900">Address:</span> {detail.appointment?.address?.label ?? '—'}</div>
                <div>
                  <span className="font-medium text-slate-900">Payment:</span>{' '}
                  {detail.payment?.refundStatus ? `Refund ${detail.payment.refundStatus === 'initiated' ? 'Initiated' : detail.payment.refundStatus === 'completed' ? 'Completed' : 'Failed'}` : detail.payment?.status === 'paid' ? 'Paid' : 'Pending'}
                </div>
                <div><span className="font-medium text-slate-900">Prescription:</span> {detail.prescription ? 'Available' : 'Not yet issued'}</div>
              </div>
            </div>

            {/* Live tracking map when doctor is on the way or arrived */}
            {(detail.appointment?.status === 'doctor_on_way' || detail.appointment?.status === 'arrived') && (
              <div className="rounded-2xl border border-slate-200 p-5">
                <h3 className="text-lg font-semibold text-slate-900">Live tracking</h3>
                <p className="mt-2 text-sm text-slate-600">Doctor is on the way. This map shows live position (UI placeholder).</p>
                <div className="mt-4">
                  {detail.appointment?.address?.location?.coordinates && (
                    <LiveTrackingMap detail={detail} />
                  )}
                </div>
              </div>
            )}

            <div className="rounded-2xl border border-slate-200 p-5">
              <h3 className="text-lg font-semibold text-slate-900">Status timeline</h3>
              <div className="mt-4 space-y-3">
                {(detail.timeline?.steps ?? []).map((step) => (
                  <div key={step.key} className="flex items-center gap-3 rounded-xl border border-slate-200 bg-slate-50 p-3">
                    <div className={`h-3 w-3 rounded-full ${step.active ? 'bg-emerald-600' : step.completed ? 'bg-slate-400' : 'bg-slate-200'}`} />
                    <div className="flex-1 text-sm font-medium text-slate-700">{step.label}</div>
                  </div>
                ))}
              </div>
            </div>
          </div>

          <div className="space-y-6">
            <div className="rounded-2xl border border-slate-200 p-5">
              <h3 className="text-lg font-semibold text-slate-900">Patient details</h3>
              <div className="mt-4 space-y-3 text-sm text-slate-600">
                <div><span className="font-medium text-slate-900">Name:</span> {detail.patient?.fullName ?? '—'}</div>
                <div><span className="font-medium text-slate-900">Email:</span> {detail.patient?.email || '—'}</div>
                <div><span className="font-medium text-slate-900">Phone:</span> {detail.patient?.phone || '—'}</div>
                {detail.appointment?.status === 'rejected' && detail.appointment?.rejectionReason && (
                  <div className="mt-2 rounded-2xl bg-rose-50 p-3 text-sm text-rose-800">
                    <div className="font-medium">Reason for rejection</div>
                    <div className="mt-1">{detail.appointment?.rejectionReason}</div>
                  </div>
                )}
              </div>
            </div>

            <div className="rounded-2xl border border-slate-200 p-5">
              <h3 className="text-lg font-semibold text-slate-900">Payment status</h3>
              <p className="mt-3 text-sm text-slate-600">{detail.payment?.refundStatus ? `Refund ${detail.payment.refundStatus}` : detail.payment?.status === 'paid' ? 'Payment Paid' : 'Payment Pending'}</p>
              {detail.payment && (
                <div className="mt-3 space-y-2 text-sm text-slate-600">
                  <p>Amount: ₹{detail.payment.amount}</p>
                  <p>Transaction ID: {detail.payment.razorpayPaymentId || '—'}</p>
                  <p>Payment Date: {detail.payment.paidAt ? formatDate(detail.payment.paidAt) : '—'}</p>
                  {detail.payment.refundId && <p>Refund ID: {detail.payment.refundId}</p>}
                </div>
              )}
            </div>

            <div className="rounded-2xl border border-slate-200 p-5">
              <h3 className="text-lg font-semibold text-slate-900">Prescription</h3>
              {detail.prescription ? (
                <div className="mt-3 space-y-2 text-sm text-slate-600">
                  <p>{detail.prescription.diagnosis || 'Prescription issued.'}</p>
                  {detail.prescription.medications?.map((medication, index) => (
                    <div key={`${medication.name}-${index}`} className="rounded-xl bg-slate-50 p-3">
                      <p className="font-medium text-slate-900">{medication.name}</p>
                      <p>{medication.dosage} • {medication.frequency}</p>
                    </div>
                  ))}
                  {detail.prescription.prescriptionPdfUrl && (
                    <button
                      type="button"
                      onClick={() => setShowPrescriptionModal(true)}
                      className="inline-block font-semibold text-emerald-600"
                    >
                      View prescription
                    </button>
                  )}
                  {!detail.prescription?.prescriptionPdfUrl && (
                    <button type="button" onClick={() => setShowPrescriptionModal(true)} className="inline-block font-semibold text-emerald-600">View prescription</button>
                  )}
                </div>
              ) : (
                <p className="mt-3 text-sm text-slate-600">No prescription has been issued for this visit yet.</p>
              )}
            </div>
          </div>
        </div>
      </section>

      {showReviewModal && canReview && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 px-4">
          <div className="w-full max-w-lg rounded-[28px] border border-slate-200 bg-white p-6 shadow-xl">
            <div className="flex items-start justify-between gap-3">
              <div>
                <h3 className="text-xl font-semibold text-slate-900">How was your visit?</h3>
                <p className="mt-2 text-sm text-slate-600">Your consultation is complete. Share your feedback so others can benefit from your experience.</p>
              </div>
              <button type="button" onClick={handleDismissReviewModal} className="text-sm font-semibold text-slate-500">Skip</button>
            </div>
            <div className="mt-6 space-y-4">
              <div className="flex flex-wrap gap-2">
                {[1, 2, 3, 4, 5].map((star) => (
                  <button
                    key={star}
                    type="button"
                    onClick={() => setRating(star)}
                    className={`rounded-full px-3 py-2 text-sm font-semibold ${rating >= star ? 'bg-emerald-600 text-white' : 'border border-slate-300 text-slate-700'}`}
                  >
                    {star} ★
                  </button>
                ))}
              </div>
              <p className="text-sm text-slate-500">{STAR_LABELS[rating - 1]}</p>
              <textarea
                value={comment}
                onChange={(e) => setComment(e.target.value)}
                rows={4}
                className="w-full rounded-2xl border border-slate-300 px-4 py-3 text-sm"
                placeholder="Share your experience with the doctor..."
              />
              <div className="flex flex-wrap gap-3">
                <button type="button" disabled={submittingReview} onClick={() => void handleReviewSubmit()} className="rounded-full bg-emerald-600 px-5 py-2.5 text-sm font-semibold text-white disabled:opacity-60">
                  {submittingReview ? 'Submitting...' : 'Submit review'}
                </button>
                <button type="button" onClick={handleDismissReviewModal} className="rounded-full border border-slate-300 px-5 py-2.5 text-sm font-semibold text-slate-700">
                  Remind me later
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {showPrescriptionModal && detail?.prescription && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
          <div className="w-full max-w-2xl rounded-2xl bg-white p-6 shadow-lg">
            <div className="flex items-start justify-between">
              <div>
                <h3 className="text-lg font-semibold">Prescription</h3>
                <p className="text-sm text-slate-600">{detail.prescription.diagnosis}</p>
              </div>
              <button type="button" onClick={() => setShowPrescriptionModal(false)} className="text-sm font-semibold text-slate-500">Close</button>
            </div>
            <div className="mt-4 space-y-3 text-sm text-slate-700">
              <div>
                <h4 className="font-medium">Medications</h4>
                <div className="mt-2 space-y-2">
                  {detail.prescription.medications?.map((m: any, i: number) => (
                    <div key={i} className="rounded-xl border border-slate-100 p-3">
                      <div className="font-semibold">{m.name}</div>
                      <div className="text-sm text-slate-600">{m.dosage} • {m.frequency} • {m.duration}</div>
                      {m.instructions && <div className="text-sm text-slate-600">{m.instructions}</div>}
                    </div>
                  ))}
                </div>
              </div>
              {(detail.prescription as any).labTests?.length > 0 && (
                <div>
                  <h4 className="font-medium">Investigations / Tests</h4>
                  <ul className="mt-2 list-disc pl-5 text-sm text-slate-600">
                    {(detail.prescription as any).labTests.map((t: string, i: number) => <li key={i}>{t}</li>)}
                  </ul>
                </div>
              )}
              {(detail.prescription as any).advice && (
                <div>
                  <h4 className="font-medium">Advice</h4>
                  <div className="mt-2 text-sm text-slate-600">{(detail.prescription as any).advice}</div>
                </div>
              )}
              {(detail.prescription as any).followUpDate && (
                <div>
                  <h4 className="font-medium">Follow-up</h4>
                  <div className="mt-2 text-sm text-slate-600">{new Date((detail.prescription as any).followUpDate).toLocaleDateString()}</div>
                </div>
              )}
            </div>
            <div className="mt-4 flex justify-end gap-2">
              <button type="button" onClick={() => {
                const html = `
                  <html><head><title>Prescription</title><style>body{font-family: Arial, sans-serif;padding:20px} .med{margin-bottom:12px}</style></head><body>
                  <h2>Prescription</h2>
                  <p><strong>Diagnosis:</strong> ${(detail.prescription as any).diagnosis || ''}</p>
                  ${(detail.prescription as any).medications?.map((m: any) => `<div class="med"><div><strong>${m.name}</strong></div><div>${m.dosage} • ${m.frequency} • ${m.duration}</div><div>${m.instructions || ''}</div></div>`).join('')}
                  ${(detail.prescription as any).labTests && (detail.prescription as any).labTests.length ? `<h4>Investigations</h4><ul>${(detail.prescription as any).labTests.map((t: string) => `<li>${t}</li>`).join('')}</ul>` : ''}
                  ${(detail.prescription as any).advice ? `<h4>Advice</h4><div>${(detail.prescription as any).advice}</div>` : ''}
                  ${(detail.prescription as any).followUpDate ? `<h4>Follow-up</h4><div>${new Date((detail.prescription as any).followUpDate).toLocaleDateString()}</div>` : ''}
                  </body></html>`;
                const w = window.open('', '_blank');
                if (w) {
                  w.document.write(html);
                  w.document.close();
                  w.focus();
                  setTimeout(() => w.print(), 300);
                }
              }} className="rounded-full bg-emerald-600 px-4 py-2 text-white">Download PDF</button>
              <button type="button" onClick={() => setShowPrescriptionModal(false)} className="rounded-full border px-4 py-2">Close</button>
            </div>
          </div>
        </div>
      )}

      <section className="rounded-[28px] border border-slate-200 bg-white p-6 shadow-sm sm:p-8">
        <h3 className="text-xl font-semibold text-slate-900">Rate your doctor</h3>
        <p className="mt-2 text-sm text-slate-600">Share how your consultation experience was after the visit is completed.</p>

        {canReview ? (
          <div className="mt-6 space-y-4">
            <div className="flex flex-wrap gap-2">
              {[1, 2, 3, 4, 5].map((star) => (
                <button
                  key={star}
                  type="button"
                  onClick={() => setRating(star)}
                  className={`rounded-full px-3 py-2 text-sm font-semibold ${rating >= star ? 'bg-emerald-600 text-white' : 'border border-slate-300 text-slate-700'}`}
                >
                  {star} ★
                </button>
              ))}
            </div>
            <p className="text-sm text-slate-500">{STAR_LABELS[rating - 1]}</p>
            <textarea
              value={comment}
              onChange={(e) => setComment(e.target.value)}
              rows={4}
              className="w-full rounded-2xl border border-slate-300 px-4 py-3 text-sm"
              placeholder="Share your experience with the doctor..."
            />
            <button type="button" disabled={submittingReview} onClick={() => void handleReviewSubmit()} className="rounded-full bg-emerald-600 px-5 py-2.5 text-sm font-semibold text-white disabled:opacity-60">
              {submittingReview ? 'Submitting...' : 'Submit review'}
            </button>
          </div>
        ) : (
          <div className="mt-6 rounded-2xl border border-slate-200 bg-slate-50 p-4 text-sm text-slate-600">
            {reviewSubmitted ? 'You have already submitted a review for this appointment.' : 'Reviews become available once the consultation is marked completed.'}
          </div>
        )}
      </section>
    </div>
  );
}
