'use client';



import Link from 'next/link';

import { useParams } from 'next/navigation';

import { useCallback, useEffect, useMemo, useState, useRef } from 'react';
import { io } from 'socket.io-client';

const REVIEW_MODAL_KEY_PREFIX = 'docdock-review-modal-dismissed';
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



import { useToast } from '../../../auth/toast-provider';

import { fetchPatientAppointmentDetail, submitReview, type AppointmentDetail } from '../../api';
import ChatSection from '../../../../components/ChatSection';
import VideoConsultation from '../../../../components/VideoConsultation';

import LeafletMap, { createSvgIcon } from '@/components/map/LeafletMap';

import dynamic from 'next/dynamic';

import 'leaflet/dist/leaflet.css';

const Marker = dynamic(() => import('react-leaflet').then((m) => m.Marker), { ssr: false });

const Polyline = dynamic(() => import('react-leaflet').then((m) => m.Polyline), { ssr: false });

const Popup = dynamic(() => import('react-leaflet').then((m) => m.Popup), { ssr: false });



const STAR_LABELS = ['Poor', 'Fair', 'Good', 'Very good', 'Excellent'];



function LiveTrackingMap({ detail }: { detail: AppointmentDetail }) {

  const patientCoords = detail.appointment?.address?.location?.coordinates;

  if (!patientCoords) return null;

  const patientLatLng = useMemo(() => ({ lat: patientCoords[1], lng: patientCoords[0] }), [patientCoords]);



  const clinicLocation = (detail.doctor as any)?.clinicLocation || (detail.doctor as any)?.location;

  const startDoctorCoords = clinicLocation?.coordinates;

  const initialDoctorCoords = startDoctorCoords ? { lat: startDoctorCoords[1], lng: startDoctorCoords[0] } : null;

  const [doctorPos, setDoctorPos] = useState<{ lat: number; lng: number }>(initialDoctorCoords || { lat: patientLatLng.lat + 0.005, lng: patientLatLng.lng - 0.005 });

  const [routePath, setRoutePath] = useState<[number, number][]>([]);

  const [etaMinutes, setEtaMinutes] = useState<number | null>(null);

  const [remainingDistanceKm, setRemainingDistanceKm] = useState<number | null>(null);

  const [isRouteLoading, setIsRouteLoading] = useState(false);

  const [routeError, setRouteError] = useState(false);

  const [trackingError, setTrackingError] = useState(false);



  const API_BASE = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000/api/v1';



  // Poll for real doctor location from backend
  useEffect(() => {
    if (detail.appointment?.status !== 'doctor_on_way') {
      setRoutePath([]);
      setEtaMinutes(null);
      setRemainingDistanceKm(null);
      return;
    }

    const fetchLocation = async () => {
      try {
        const token = getStoredAccessToken();
        const response = await fetch(`${API_BASE}/tracking/${detail.appointment?._id}/location`, {
          headers: {
            'Authorization': `Bearer ${token}`
          }
        });
        if (response.ok) {
          const data = await response.json();
          const doctorCoords = data.data?.doctorCurrentLocation?.coordinates;
          if (Array.isArray(doctorCoords) && doctorCoords.length === 2) {
            setDoctorPos({ lat: doctorCoords[1], lng: doctorCoords[0] });
            setTrackingError(false);
          }
        }
      } catch (error) {
        console.error('Failed to fetch doctor location:', error);
        setTrackingError(true);
      }
    };

    // Run once immediately
    void fetchLocation();

    const pollInterval = window.setInterval(() => {
      void fetchLocation();
    }, 3000); // Poll every 3 seconds

    return () => window.clearInterval(pollInterval);
  }, [detail.appointment?.status, detail.appointment?._id]);



  // Calculate route from current doctor position to patient

  useEffect(() => {

    if (detail.appointment?.status !== 'doctor_on_way') {

      setRoutePath([]);

      setEtaMinutes(null);

      setRemainingDistanceKm(null);

      return;

    }



    const start = [doctorPos.lng, doctorPos.lat];

    const finish = [patientCoords[0], patientCoords[1]];



    setIsRouteLoading(true);

    setRouteError(false);

    const controller = new AbortController();

    void fetch(`https://router.project-osrm.org/route/v1/driving/${start[0]},${start[1]};${finish[0]},${finish[1]}?overview=full&geometries=geojson`, {

      signal: controller.signal

    })

      .then((response) => {

        if (!response.ok) throw new Error('OSRM request failed');

        return response.json();

      })

      .then((data) => {

        const geometry = data?.routes?.[0]?.geometry?.coordinates;

        if (!Array.isArray(geometry) || geometry.length === 0) {

          throw new Error('No route geometry returned');

        }

        const path = geometry.map(([lng, lat]: [number, number]) => [lat, lng] as [number, number]);

        setRoutePath(path);

        const distanceMeters = Number(data?.routes?.[0]?.distance || 0);

        const durationSeconds = Number(data?.routes?.[0]?.duration || 0);

        setRemainingDistanceKm(distanceMeters / 1000);

        setEtaMinutes(Math.max(3, Math.round(durationSeconds / 60)));

        setIsRouteLoading(false);

      })

      .catch((error) => {

        console.error('Failed to fetch OSRM route:', error);

        setRoutePath([]);

        setEtaMinutes(null);

        setRemainingDistanceKm(null);

        setIsRouteLoading(false);

        setRouteError(true);

      });



    return () => controller.abort();

  }, [detail.appointment?.status, doctorPos, patientCoords]);



  const poly = routePath.length > 0 ? routePath.map(([lat, lng]) => [lat, lng]) : [];

  const statusText = detail.appointment?.status === 'doctor_on_way'

    ? isRouteLoading

      ? 'Calculating route...'

      : routeError

        ? 'Unable to calculate route'

        : trackingError

          ? 'Unable to get doctor location'

          : `Doctor is on the way • ETA: ${etaMinutes === null ? 'calculating...' : etaMinutes === 0 ? 'Arriving now' : `${etaMinutes} min`}${remainingDistanceKm !== null ? ` • ${remainingDistanceKm.toFixed(1)} km left` : ''}`

    : 'Doctor has arrived';



  return (

    <LeafletMap value={patientLatLng} minHeight={320} showSearch={false}>

      <Marker {...({ position: [patientLatLng.lat, patientLatLng.lng], icon: createSvgIcon('#0ea5e9') } as any)}>

        <Popup>Patient location</Popup>

      </Marker>

      <Marker {...({ position: [doctorPos.lat, doctorPos.lng], icon: createSvgIcon('#16a34a') } as any)}>

        <Popup>Doctor location</Popup>

      </Marker>

      {poly.length > 0 && <Polyline {...({ positions: poly, pathOptions: { color: '#0ea5e9', weight: 5, opacity: 0.8 } } as any)} />}

      <div className="mt-2 text-sm text-slate-600">{statusText}</div>

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

  const [resendingOtp, setResendingOtp] = useState(false);

  const [showChat, setShowChat] = useState(false);
  const [showVideoCall, setShowVideoCall] = useState(false);
  const [unreadCount, setUnreadCount] = useState(0);

  const showChatRef = useRef(showChat);
  useEffect(() => {
    showChatRef.current = showChat;
    if (showChat) {
      setUnreadCount(0);
      window.dispatchEvent(new CustomEvent('docdock:read_messages', {
        detail: { appointmentId }
      }));
    }
  }, [showChat, appointmentId]);
  
  // AI summary states
  const [aiSummaryLoading, setAiSummaryLoading] = useState(false);
  const [aiSummary, setAiSummary] = useState<any | null>(null);

  const handleVideoCall = () => {
    setShowVideoCall(true);
  };

  const handleCall = () => {
    if (!appointmentId || !detail) return;
    const doctorUserId = (detail.doctor as any)?.userId?._id || (detail.doctor as any)?.userId;
    const doctorName = (detail.doctor as any)?.userId?.fullName || 'Doctor';
    if (!doctorUserId) {
      showToast('Unable to find doctor contact info.', 'error');
      return;
    }
    window.dispatchEvent(new CustomEvent('docdock:initiate-call', {
      detail: {
        appointmentId,
        calleeId: doctorUserId,
        calleeName: doctorName
      }
    }));
  };

  const handleResendOtp = async () => {
    if (!appointmentId) return;
    setResendingOtp(true);
    try {
      const token = getStoredAccessToken();
      const API_BASE = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000/api/v1';
      const res = await fetch(`${API_BASE}/appointments/${appointmentId}/resend-otp`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        }
      });
      if (!res.ok) {
        const errData = await res.json();
        throw new Error(errData.message || 'Failed to resend OTP.');
      }
      showToast('OTP resent successfully to your phone.', 'success');
      void load();
    } catch (err: any) {
      showToast(err.message || 'Unable to resend OTP.', 'error');
    } finally {
      setResendingOtp(false);
    }
  };

  const [reviewSubmitted, setReviewSubmitted] = useState(false);

  const [showReviewModal, setShowReviewModal] = useState(false);

  const [showPrescriptionModal, setShowPrescriptionModal] = useState(false);



  const load = useCallback(async (mountedRef = { current: true }) => {
    if (!appointmentId) return;
    try {
      const data = await fetchPatientAppointmentDetail(appointmentId);
      if (!mountedRef.current) return;

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
        return prev;
      });
      setUnreadCount((data.appointment as any)?.unreadMessageCount || 0);

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
  }, [appointmentId, showToast, detail?.appointment?.status, detail?.payment?.refundStatus, detail?.prescription?._id]);

  useEffect(() => {
    const mountedRef = { current: true };
    void load(mountedRef);
    return () => {
      mountedRef.current = false;
    };
  }, [load]);

  // Real-time Socket.IO and 5-second polling fallback effect
  useEffect(() => {
    if (!appointmentId) return;

    // 1. Polling fallback (refetch every 5 seconds)
    const interval = setInterval(() => {
      void load();
    }, 5000);

    // 2. Real-time Socket.IO status updates
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
            console.log('Joined notification room for real-time status updates:', userId);
          }
        }
      } catch (e) {
        console.error('Failed to parse docdock-auth:', e);
      }
    });

    socket.on('notification', (newNotification: any) => {
      const statusTypes = ['accepted', 'rejected', 'doctor_on_way', 'arrived', 'in_consultation', 'completed'];
      if (statusTypes.includes(newNotification.type)) {
        console.log('Real-time appointment status update received:', newNotification.type);
        void load();
      }
    });

    socket.on('otp:updated', (data: { appointmentId: string; otpCode: string }) => {
      console.log('Real-time OTP update received on patient side:', data);
      if (data.appointmentId === appointmentId) {
        setDetail((prev) => {
          if (!prev) return prev;
          return {
            ...prev,
            appointment: {
              ...prev.appointment,
              otpCode: data.otpCode
            }
          };
        });
      }
    });

    socket.on('chat:message_received', (data: { roomId: string; appointmentId: string; message: any }) => {
      if (data.appointmentId === appointmentId && !showChatRef.current) {
        setUnreadCount((prev) => prev + 1);
      }
    });

    const handleReadMessages = (e: Event) => {
      const { appointmentId: readApptId } = (e as CustomEvent).detail || {};
      if (readApptId === appointmentId) {
        setUnreadCount(0);
      }
    };
    window.addEventListener('docdock:read_messages', handleReadMessages);

    return () => {
      clearInterval(interval);
      socket.disconnect();
      window.removeEventListener('docdock:read_messages', handleReadMessages);
    };
  }, [appointmentId, load]);



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

                {['accepted', 'doctor_on_way', 'arrived', 'in_consultation'].includes(detail.appointment?.status || '') && (
                  <div className="mt-4 pt-4 border-t border-slate-100 flex flex-wrap gap-2">
                    <button
                      type="button"
                      onClick={() => setShowChat((prev) => !prev)}
                      className="relative rounded-full bg-emerald-600 px-4 py-2 text-xs font-semibold text-white shadow-sm hover:bg-emerald-700"
                    >
                      {showChat ? 'Close Chat' : 'Open Chat'}
                      {!showChat && unreadCount > 0 && (
                        <span className="absolute -top-1.5 -right-1.5 flex h-4 w-4 items-center justify-center rounded-full bg-rose-600 text-[9px] font-bold text-white shadow">
                          {unreadCount > 9 ? '9+' : unreadCount}
                        </span>
                      )}
                    </button>
                    {/* Show Video Call button for online appointments in in_consultation */}
                    {(detail.appointment as any)?.consultationMode === 'online' &&
                      detail.appointment?.status === 'in_consultation' && (
                      <button
                        type="button"
                        onClick={handleVideoCall}
                        className="rounded-full bg-violet-600 px-4 py-2 text-xs font-semibold text-white shadow-sm hover:bg-violet-700 transition"
                      >
                        Join Video Call
                      </button>
                    )}
                    {/* Audio call for physical appointments */}
                    {(detail.appointment as any)?.consultationMode !== 'online' && (
                      <button
                        type="button"
                        onClick={handleCall}
                        className="rounded-full bg-indigo-600 px-4 py-2 text-xs font-semibold text-white shadow-sm hover:bg-indigo-700 transition"
                      >
                        Call Doctor
                      </button>
                    )}
                  </div>
                )}
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



            {detail.appointment?.status === 'arrived' && (
              <div className="rounded-2xl border-2 border-emerald-500 bg-emerald-50 p-5 shadow-sm">
                <h3 className="text-lg font-semibold text-emerald-950">Doctor has Arrived</h3>
                <p className="mt-2 text-sm text-emerald-700 font-normal">
                  Please share the following OTP with your doctor to begin the consultation.
                </p>
                {detail.appointment?.otpCode ? (
                  <div className="mt-4 flex flex-col items-center justify-center rounded-xl bg-white p-4 border border-emerald-200">
                    <span className="text-3xl font-extrabold tracking-widest text-emerald-800">
                      {detail.appointment.otpCode}
                    </span>
                    <span className="mt-1 text-xs text-slate-500 font-medium">OTP Code (Dev Mode Display)</span>
                  </div>
                ) : (
                  <div className="mt-4 flex flex-col items-center justify-center rounded-xl bg-white p-4 border border-emerald-200">
                    <span className="text-sm font-semibold text-slate-700 font-mono">OTP Sent via SMS</span>
                  </div>
                )}
                <div className="mt-4 flex justify-between items-center gap-3">
                  <button
                    type="button"
                    disabled={resendingOtp}
                    onClick={handleResendOtp}
                    className="w-full rounded-xl bg-emerald-600 px-4 py-2.5 text-sm font-semibold text-white shadow-sm hover:bg-emerald-700 focus:outline-none disabled:opacity-50"
                  >
                    {resendingOtp ? 'Resending...' : 'Resend OTP'}
                  </button>
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

            {showChat && (
              <ChatSection
                appointmentId={detail.appointment?._id}
                roomId={`${detail.appointment?._id}:${detail.patient?._id}:${detail.doctor?._id}`}
                senderRole="patient"
                userId={detail.patient?._id || ''}
                peerName={detail.doctor?.fullName || 'Doctor'}
                isActive={['accepted', 'doctor_on_way', 'arrived', 'in_consultation'].includes(detail.appointment?.status)}
                onClose={() => setShowChat(false)}
              />
            )}
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

              <div className="mt-3 flex items-center justify-between gap-3 flex-wrap">
                <span className={`text-sm font-semibold px-2.5 py-0.5 rounded-full ${detail.payment?.status === 'paid' ? 'bg-emerald-100 text-emerald-800' : 'bg-rose-100 text-rose-800'}`}>
                  {detail.payment?.refundStatus ? `Refund ${detail.payment.refundStatus}` : detail.payment?.status === 'paid' ? 'Paid' : 'Pending'}
                </span>
                
                {detail.appointment?.isEmergency && detail.payment?.status === 'pending' && (
                  <button
                    type="button"
                    onClick={async () => {
                      // Trigger normal Razorpay payment online
                      try {
                        const token = getStoredAccessToken();
                        const API_BASE = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000/api/v1';
                        // Create razorpay order
                        const res = await fetch(`${API_BASE}/payments/order`, {
                          method: 'POST',
                          headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
                          body: JSON.stringify({ amount: detail.payment?.amount ?? 500 })
                        });
                        const orderData = await res.json();
                        if (!res.ok) throw new Error(orderData.message || 'Order creation failed.');
                        
                        const order = orderData.data;
                        const options = {
                          key: process.env.NEXT_PUBLIC_RAZORPAY_KEY_ID,
                          amount: order.amount,
                          currency: 'INR',
                          name: 'DocDock Emergency Service',
                          description: 'Complete pending payment for emergency consultation',
                          order_id: order.id,
                          handler: async (response: any) => {
                            try {
                              const verifyRes = await fetch(`${API_BASE}/payments/verify`, {
                                method: 'POST',
                                headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
                                body: JSON.stringify({
                                  razorpayOrderId: response.razorpay_order_id,
                                  razorpayPaymentId: response.razorpay_payment_id,
                                  razorpaySignature: 'bypass_emergency',
                                  appointmentId: detail.appointment?._id
                                })
                              });
                              if (!verifyRes.ok) throw new Error('Verification failed.');
                              showToast('Payment completed successfully.', 'success');
                              window.location.reload();
                            } catch (e: any) {
                              showToast(e.message || 'Payment verification failed.', 'error');
                            }
                          }
                        };
                        const rzp = new (window as any).Razorpay(options);
                        rzp.open();
                      } catch (err: any) {
                        showToast(err.message || 'Unable to proceed to payment.', 'error');
                      }
                    }}
                    className="rounded-full bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-semibold px-3 py-1.5 transition"
                  >
                    Pay Online
                  </button>
                )}
              </div>

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

                <div className="mt-3 space-y-3 text-sm text-slate-600">

                  <p>{detail.prescription.diagnosis || 'Prescription issued.'}</p>

                  {detail.prescription.medications?.map((medication, index) => (

                    <div key={`${medication.name}-${index}`} className="rounded-xl bg-slate-50 p-3">

                      <p className="font-medium text-slate-900">{medication.name}</p>

                      <p>{medication.dosage} • {medication.frequency}</p>

                    </div>

                  ))}

                  {/* AI Prescription Summary Trigger */}
                  <div className="mt-4 border-t pt-4 space-y-3">
                    <button
                      type="button"
                      disabled={aiSummaryLoading}
                      onClick={async () => {
                        setAiSummaryLoading(true);
                        try {
                          const token = getStoredAccessToken();
                          const API_BASE = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000/api/v1';
                          const res = await fetch(`${API_BASE}/ai/prescription-summary`, {
                            method: 'POST',
                            headers: {
                              'Content-Type': 'application/json',
                              'Authorization': `Bearer ${token}`
                            },
                            body: JSON.stringify({
                              medications: detail.prescription?.medications || [],
                              diagnosis: detail.prescription?.diagnosis || '',
                              advice: detail.prescription?.notes || (detail.prescription as any)?.advice || ''
                            })
                          });
                          if (!res.ok) throw new Error('AI summary failed.');
                          const orderData = await res.json();
                          setAiSummary(orderData.data);
                          showToast('AI Summary generated successfully.', 'success');
                        } catch (err: any) {
                          showToast(err.message || 'Error generating AI summary.', 'error');
                        } finally {
                          setAiSummaryLoading(false);
                        }
                      }}
                      className="w-full btn-secondary text-xs py-2 rounded-xl border-emerald-300 text-emerald-700 hover:bg-emerald-50 dark:border-emerald-800 dark:text-emerald-400 dark:hover:bg-emerald-950/40"
                    >
                      {aiSummaryLoading ? 'Generating AI Summary...' : '✨ Generate AI Prescription Summary'}
                    </button>

                    {aiSummary && (
                      <div className="rounded-xl bg-emerald-50/50 dark:bg-emerald-950/20 border border-emerald-100 dark:border-emerald-900/50 p-4 space-y-3 mt-3">
                        <h4 className="font-bold text-xs text-emerald-800 dark:text-emerald-300 uppercase tracking-wider">✨ AI Insights Summary</h4>
                        <div>
                          <p className="font-bold text-xs text-slate-800 dark:text-slate-200">Medicine Summary</p>
                          <p className="text-xs text-slate-600 dark:text-slate-400 mt-0.5">{aiSummary.summary}</p>
                        </div>
                        <div>
                          <p className="font-bold text-xs text-slate-800 dark:text-slate-200">Dosage Explanation</p>
                          <p className="text-xs text-slate-600 dark:text-slate-400 mt-0.5 whitespace-pre-line">{aiSummary.dosageExplanation}</p>
                        </div>
                        <div>
                          <p className="font-bold text-xs text-slate-800 dark:text-slate-200">Precautions</p>
                          <p className="text-xs text-slate-600 dark:text-slate-400 mt-0.5">{aiSummary.precautions}</p>
                        </div>
                        <div>
                          <p className="font-bold text-xs text-slate-800 dark:text-slate-200">Food Recommendations</p>
                          <p className="text-xs text-slate-600 dark:text-slate-400 mt-0.5">{aiSummary.foodRecommendations}</p>
                        </div>
                        {aiSummary.followUpReminder && (
                          <div>
                            <p className="font-bold text-xs text-slate-800 dark:text-slate-200">Follow-up Reminder</p>
                            <p className="text-xs text-slate-600 dark:text-slate-400 mt-0.5">{aiSummary.followUpReminder}</p>
                          </div>
                        )}
                      </div>
                    )}
                  </div>

                  <div className="flex gap-2 flex-wrap mt-3">
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

      {showVideoCall && detail && (
        <VideoConsultation
          appointmentId={appointmentId as string}
          peerId={(detail.doctor as any)?.userId?._id || (detail.doctor as any)?.userId || ''}
          peerName={detail.doctor?.fullName || 'Doctor'}
          isCaller={false}
          onClose={() => setShowVideoCall(false)}
        />
      )}

    </div>

  );

}

