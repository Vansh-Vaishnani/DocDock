'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { io } from 'socket.io-client';

import { useToast } from '../../auth/toast-provider';
import { createOrUpdatePrescription, fetchDoctorAppointments, fetchDoctorProfile, updateAppointmentStatus, updateTrackingLocation, type DoctorAppointment } from '../api';
import ChatSection from '../../../components/ChatSection';
import VideoConsultation from '../../../components/VideoConsultation';

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

type PrescriptionDraft = {
  diagnosis: string;
  chiefComplaints: string;
  medications: Array<{ name: string; dosage: string; frequency: string; duration: string; instructions: string }>;
  advice: string;
};

function getActions(appt: DoctorAppointment, verified: boolean): ActionButton[] {
  if (!verified) return [];
  if (appt.paymentStatus !== 'paid' && !appt.isEmergency) return [];

  const status = appt.status;
  const mode = (appt as any).consultationMode || 'clinic';

  switch (status) {
    case 'pending':
      return [
        { label: 'Accept', status: 'accepted', variant: 'primary' },
        { label: 'Reject', status: 'rejected', variant: 'danger' }
      ];
    case 'accepted':
      if (mode === 'home') {
        return [
          { label: 'On The Way', status: 'doctor_on_way', variant: 'primary' },
          { label: 'Cancel', status: 'cancelled_by_doctor', variant: 'danger' }
        ];
      } else {
        // Clinic or online goes directly to starting consultation
        return [
          { label: 'Start Consultation', status: 'in_consultation', variant: 'primary' },
          { label: 'Cancel', status: 'cancelled_by_doctor', variant: 'danger' }
        ];
      }
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
  const showToastRef = useRef<typeof showToast>(showToast);
  useEffect(() => { showToastRef.current = showToast; }, [showToast]);
  const mountedRef = useRef(true);
  useEffect(() => { mountedRef.current = true; return () => { mountedRef.current = false; }; }, []);
  const [appointments, setAppointments] = useState<DoctorAppointment[]>([]);
  const [filter, setFilter] = useState<'today' | 'upcoming' | 'all'>('all');
  const [loading, setLoading] = useState(true);
  const [loggedInUserId, setLoggedInUserId] = useState<string>('');

  useEffect(() => {
    try {
      const raw = window.localStorage.getItem('docdock-auth') || window.sessionStorage.getItem('docdock-auth');
      if (raw) {
        const parsed = JSON.parse(raw) as { user?: { _id?: string } };
        if (parsed.user?._id) {
          setLoggedInUserId(parsed.user._id);
        }
      }
    } catch (e) {
      console.error('Failed to parse docdock-auth:', e);
    }
  }, []);
  const [verified, setVerified] = useState(false);
  const [actionId, setActionId] = useState<string | null>(null);
  const [showReasonModal, setShowReasonModal] = useState(false);
  const [pendingAction, setPendingAction] = useState<{ appointmentId: string; status: string } | null>(null);
  const [selectedOption, setSelectedOption] = useState<string>('Doctor unavailable');
  const [customReason, setCustomReason] = useState<string>('');
  const REASON_OPTIONS = ['Doctor unavailable', 'Emergency', 'Outside service area', 'Other'];
  const [prescriptionDrafts, setPrescriptionDrafts] = useState<Record<string, PrescriptionDraft>>({});
  const simStepsRef = useRef<Record<string, number>>({});
  const [doctorCoords, setDoctorCoords] = useState<[number, number] | null>(null);

  const [pendingOtpActionApptId, setPendingOtpActionApptId] = useState<string | null>(null);
  const [otpInput, setOtpInput] = useState('');
  const [verifyingOtp, setVerifyingOtp] = useState(false);
  const [otpError, setOtpError] = useState<string | null>(null);
  const [resendingOtp, setResendingOtp] = useState(false);

  const [activeChatApptId, setActiveChatApptId] = useState<string | null>(null);
  const [videoCallAppt, setVideoCallAppt] = useState<DoctorAppointment | null>(null);

  const handleCallPatient = (appointmentId: string, appointment: any) => {
    const patientUserId = appointment?.patientId || appointment?.patient?._id;
    const patientName = appointment?.patient?.fullName || appointment?.patientName || 'Patient';
    if (!patientUserId) {
      showToast('Unable to find patient contact info.', 'error');
      return;
    }
    window.dispatchEvent(new CustomEvent('docdock:initiate-call', {
      detail: {
        appointmentId,
        calleeId: patientUserId,
        calleeName: patientName
      }
    }));
  };

  const confirmOtp = async () => {
    if (!pendingOtpActionApptId) return;
    if (otpInput.trim().length !== 6) {
      setOtpError('Please enter a valid 6-digit OTP.');
      return;
    }

    setVerifyingOtp(true);
    setOtpError(null);
    try {
      await updateAppointmentStatus(pendingOtpActionApptId, 'in_consultation', undefined, otpInput.trim());
      showToast('OTP verified. Consultation started.', 'success');
      setPendingOtpActionApptId(null);
      await load();
    } catch (err: unknown) {
      setOtpError(err instanceof Error ? err.message : 'Invalid OTP. Please try again.');
    } finally {
      setVerifyingOtp(false);
    }
  };

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const [list, profile] = await Promise.all([fetchDoctorAppointments(filter), fetchDoctorProfile()]);
      if (mountedRef.current) {
        setAppointments(list);
        setVerified(profile.verificationStatus === 'approved');
        if (profile.location?.coordinates) {
          setDoctorCoords(profile.location.coordinates);
        }
      }
    } catch (err: unknown) {
      if (mountedRef.current) {
        showToastRef.current(err instanceof Error ? err.message : 'Unable to load appointments.', 'error');
      }
    } finally {
      if (mountedRef.current) setLoading(false);
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [filter]); // stable — showToast via ref

  useEffect(() => {
    void load();
  }, [load]);

  // Real-time Socket.IO for appointment status updates
  useEffect(() => {
    const token = getStoredAccessToken();
    if (!token) return;

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
          if (userId) socket.emit('join', userId);
        }
      } catch (e) {
        console.error('Failed to parse docdock-auth:', e);
      }
    });

    socket.on('notification', (newNotification: any) => {
      const statusTypes = [
        'payment_received',
        'appointment_pending',
        'cancelled_by_patient',
        'completed',
        'doctor_verified',
        'admin_rejected_account',
        'admin_suspended_account'
      ];
      if (statusTypes.includes(newNotification.type)) {
        void load();
      }
    });

    socket.on('otp:updated', (data: { appointmentId: string; otpCode: string }) => {
      setAppointments((prev) =>
        prev.map((appt) => {
          if (appt._id === data.appointmentId) {
            return { ...appt, otpCode: data.otpCode };
          }
          return appt;
        })
      );
    });

    socket.on('chat:message_received', (data: { roomId: string; appointmentId: string; message: any }) => {
      setAppointments((prev) =>
        prev.map((appt) => {
          if (appt._id === data.appointmentId) {
            return { ...appt, unreadMessageCount: ((appt as any).unreadMessageCount || 0) + 1 };
          }
          return appt;
        })
      );
    });

    // Polling fallback every 8 seconds
    const interval = setInterval(() => { void load(); }, 8000);

    return () => {
      clearInterval(interval);
      socket.disconnect();
    };
  }, [load]);

  // Background tracking hook for active doctor_on_way appointments
  useEffect(() => {
    const activeAppts = appointments.filter((a) => a.status === 'doctor_on_way');
    if (activeAppts.length === 0) return;

    const isBypass = process.env.NEXT_PUBLIC_BYPASS_LOCATION === 'true';
    const intervalTime = isBypass ? 2000 : 10000;

    const trackers = activeAppts.map((appt) => {
      const patientCoords = appt.address?.location?.coordinates;
      if (!patientCoords) return null;

      // Doctor starting position: doctor's clinic coordinates or fallback offset
      const startLng = doctorCoords ? doctorCoords[0] : patientCoords[0] - 0.01;
      const startLat = doctorCoords ? doctorCoords[1] : patientCoords[1] + 0.01;

      if (simStepsRef.current[appt._id] === undefined) {
        simStepsRef.current[appt._id] = 0;
      }

      const totalSteps = 20;

      const runTracking = async () => {
        let coordsToSend: [number, number];

        if (isBypass) {
          // Simulation mode: interpolate coordinates
          const currentStep = Math.min(simStepsRef.current[appt._id] + 1, totalSteps);
          simStepsRef.current[appt._id] = currentStep;

          const ratio = currentStep / totalSteps;
          const nextLng = startLng + (patientCoords[0] - startLng) * ratio;
          const nextLat = startLat + (patientCoords[1] - startLat) * ratio;
          coordsToSend = [nextLng, nextLat];
        } else {
          // Real GPS mode: get browser location
          try {
            const pos = await new Promise<GeolocationPosition>((resolve, reject) => {
              navigator.geolocation.getCurrentPosition(resolve, reject, {
                enableHighAccuracy: true,
                timeout: 5000,
                maximumAge: 0
              });
            });
            coordsToSend = [pos.coords.longitude, pos.coords.latitude];
          } catch (err) {
            console.error('Failed to get real GPS location:', err);
            return;
          }
        }

        try {
          await updateTrackingLocation(appt._id, coordsToSend);
          console.log(`Updated location for appt ${appt._id} to:`, coordsToSend);
        } catch (err) {
          console.error('Failed to update tracking location on backend:', err);
        }
      };

      // Run once immediately
      void runTracking();

      const timer = setInterval(() => {
        void runTracking();
      }, intervalTime);

      return {
        timer,
        cleanup: () => clearInterval(timer)
      };
    });

    return () => {
      trackers.forEach((t) => t?.cleanup());
    };
  }, [appointments, doctorCoords]);

  const handleStatus = async (appointmentId: string, status: string) => {
    if (!verified) {
      showToast('Your account must be verified before managing appointments.', 'error');
      return;
    }
    setActionId(appointmentId);
    try {
      // For statuses that require a reason from doctor, open modal
      if (status === 'rejected' || status === 'cancelled_by_doctor') {
        setPendingAction({ appointmentId, status });
        setSelectedOption(REASON_OPTIONS[0]);
        setCustomReason('');
        setShowReasonModal(true);
        return;
      }

      if (status === 'in_consultation') {
        const appt = appointments.find((a) => a._id === appointmentId);
        const mode = (appt as any)?.consultationMode || 'clinic';
        if (mode === 'home') {
          setPendingOtpActionApptId(appointmentId);
          setOtpInput('');
          setOtpError(null);
          return;
        } else {
          // Clinic or online transitions directly!
          await updateAppointmentStatus(appointmentId, status);
          showToast('Consultation started.', 'success');
          await load();
          return;
        }
      }

      await updateAppointmentStatus(appointmentId, status);
      showToast('Appointment updated.', 'success');
      await load();
    } catch (err: unknown) {
      showToast(err instanceof Error ? err.message : 'Unable to update appointment.', 'error');
    } finally {
      setActionId(null);
    }
  };

  const confirmReason = async () => {
    if (!pendingAction) return;
    setActionId(pendingAction.appointmentId);
    try {
      const reason = selectedOption === 'Other' ? customReason.trim() : selectedOption;
      if (!reason) {
        showToast('Please provide a reason.', 'error');
        return;
      }
      await updateAppointmentStatus(pendingAction.appointmentId, pendingAction.status, reason);
      showToast('Appointment updated.', 'success');
      setShowReasonModal(false);
      setPendingAction(null);
      await load();
    } catch (err: unknown) {
      showToast(err instanceof Error ? err.message : 'Unable to update appointment.', 'error');
    } finally {
      setActionId(null);
    }
  };

  const handlePrescriptionSave = async (appointmentId: string) => {
    const draft = prescriptionDrafts[appointmentId];
    if (!draft) return;

    const medications = draft.medications.filter((medication) => medication.name.trim());
    if (!draft.diagnosis.trim() || !draft.chiefComplaints.trim() || medications.length === 0) {
      showToast('Diagnosis, complaint summary, and at least one medication are required.', 'error');
      return;
    }

    setActionId(appointmentId);
    try {
      await createOrUpdatePrescription({
        appointmentId,
        diagnosis: draft.diagnosis,
        chiefComplaints: draft.chiefComplaints,
        medications,
        advice: draft.advice || undefined
      });
      showToast('Prescription saved.', 'success');
      await load();
    } catch (err: unknown) {
      showToast(err instanceof Error ? err.message : 'Unable to save prescription.', 'error');
    } finally {
      setActionId(null);
    }
  };

  return (
    <div className="dd-card">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold" style={{ color: 'var(--text-primary)' }}>Appointments</h2>
          <p className="mt-2 text-sm" style={{ color: 'var(--text-secondary)' }}>Manage requests and active consultations.</p>
        </div>
        <div className="flex gap-2">
          {(['today', 'upcoming', 'all'] as const).map((f) => (
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
        <div className="mt-6 rounded-2xl p-4 text-sm" style={{ backgroundColor: 'var(--bg-tertiary)', color: 'var(--text-secondary)' }}>
          Loading appointments...
        </div>
      )}

      {!loading && appointments.length === 0 && (
        <div className="mt-6 rounded-2xl border border-dashed p-6 text-center text-sm" style={{ borderColor: 'var(--border-color)', color: 'var(--text-muted)' }}>
          No appointments found.
        </div>
      )}

      <div className="mt-6 space-y-3">
        {appointments.map((appt) => {
          const actions = getActions(appt, verified);
          const draft = prescriptionDrafts[appt._id] ?? {
            diagnosis: '',
            chiefComplaints: '',
            medications: [{ name: '', dosage: '', frequency: '', duration: '', instructions: '' }],
            advice: ''
          };
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
                <div className="flex flex-col items-end gap-2">
                  {appt.paymentStatusLabel && (
                    <span className={`rounded-full px-2.5 py-0.5 text-xs font-medium ${appt.paymentStatus === 'paid' ? 'bg-emerald-100 text-emerald-700' : 'bg-amber-100 text-amber-700'}`}>
                      {appt.paymentStatusLabel}
                    </span>
                  )}
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
                  {['accepted', 'doctor_on_way', 'arrived', 'in_consultation'].includes(appt.status) && (
                    <div className="flex flex-wrap gap-2">
                      <button
                        type="button"
                        onClick={() => {
                          const opening = activeChatApptId !== appt._id;
                          setActiveChatApptId((prev) => (prev === appt._id ? null : appt._id));
                          // Clear unread count when opening chat
                          if (opening) {
                            setAppointments((prev) =>
                              prev.map((a) =>
                                a._id === appt._id ? { ...a, unreadMessageCount: 0 } : a
                              )
                            );
                            window.dispatchEvent(new CustomEvent('docdock:read_messages', {
                              detail: { appointmentId: appt._id }
                            }));
                          }
                        }}
                        className="relative rounded-full bg-emerald-600 px-3 py-1.5 text-xs font-semibold text-white shadow-sm hover:bg-emerald-700"
                      >
                        {activeChatApptId === appt._id ? 'Close Chat' : 'Open Chat'}
                        {activeChatApptId !== appt._id && (appt as any).unreadMessageCount > 0 && (
                          <span className="absolute -top-1.5 -right-1.5 flex h-4 w-4 items-center justify-center rounded-full bg-rose-600 text-[9px] font-bold text-white shadow">
                            {(appt as any).unreadMessageCount > 9 ? '9+' : (appt as any).unreadMessageCount}
                          </span>
                        )}
                      </button>
                      {/* Video call for online consultations */}
                      {(appt as any).consultationMode === 'online' && appt.status === 'in_consultation' && (
                        <button
                          type="button"
                          onClick={() => setVideoCallAppt(appt)}
                          className="rounded-full bg-violet-600 px-3 py-1.5 text-xs font-semibold text-white shadow-sm hover:bg-violet-700 transition"
                        >
                          Start Video Call
                        </button>
                      )}
                      {/* Audio call for physical appointments */}
                      {(appt as any).consultationMode !== 'online' && (
                        <button
                          type="button"
                          onClick={() => handleCallPatient(appt._id, appt)}
                          className="rounded-full bg-indigo-600 px-3 py-1.5 text-xs font-semibold text-white shadow-sm hover:bg-indigo-700 transition"
                        >
                          Call Patient
                        </button>
                      )}
                  </div>
                  )}
                  {!actions.length && appt.paymentStatus !== 'paid' && !appt.isEmergency && (
                    <p className="text-xs text-amber-700">Waiting for payment confirmation before the doctor can proceed.</p>
                  )}
                  {appt.isEmergency && appt.paymentStatus !== 'paid' && (
                    <div className="mt-2 flex items-center gap-2">
                      <span className="rounded bg-rose-100 text-rose-800 text-[10px] font-bold px-2 py-0.5">🚨 Emergency SOS Case</span>
                      <button
                        type="button"
                        disabled={actionId === appt._id}
                        onClick={async () => {
                          setActionId(appt._id);
                          try {
                            const token = getStoredAccessToken();
                            const res = await fetch(`${SOCKET_BASE.replace('/socket.io', '')}/api/v1/appointments/${appt._id}/collect-payment`, {
                              method: 'POST',
                              headers: { 'Authorization': `Bearer ${token}` }
                            });
                            if (!res.ok) throw new Error('Failed to mark payment collected.');
                            showToast('Payment marked as Collected.', 'success');
                            await load();
                          } catch (err: any) {
                            showToast(err.message || 'Error updating payment.', 'error');
                          } finally {
                            setActionId(null);
                          }
                        }}
                        className="rounded-full bg-amber-500 hover:bg-amber-600 text-white text-[10px] font-bold px-2 py-1 transition"
                      >
                        Mark Payment Collected
                      </button>
                    </div>
                  )}
                </div>
              </div>

              {appt.status === 'in_consultation' && (
                <div className="mt-4 rounded-2xl border border-slate-200 bg-slate-50 p-4">
                  <div className="flex items-center justify-between gap-3">
                    <p className="text-sm font-semibold text-slate-900">Prescription</p>
                    <button
                      type="button"
                      disabled={actionId === appt._id}
                      onClick={() => void handlePrescriptionSave(appt._id)}
                      className="rounded-full bg-emerald-600 px-3 py-1.5 text-xs font-semibold text-white disabled:opacity-60"
                    >
                      Save prescription
                    </button>
                  </div>
                  <div className="mt-3 grid gap-3 md:grid-cols-2">
                    <input
                      value={draft.diagnosis}
                      onChange={(event) => setPrescriptionDrafts((current) => ({ ...current, [appt._id]: { ...draft, diagnosis: event.target.value } }))}
                      className="rounded-xl border border-slate-300 px-3 py-2 text-sm"
                      placeholder="Diagnosis"
                    />
                    <input
                      value={draft.chiefComplaints}
                      onChange={(event) => setPrescriptionDrafts((current) => ({ ...current, [appt._id]: { ...draft, chiefComplaints: event.target.value } }))}
                      className="rounded-xl border border-slate-300 px-3 py-2 text-sm"
                      placeholder="Chief complaints"
                    />
                    <textarea
                      value={draft.advice}
                      onChange={(event) => setPrescriptionDrafts((current) => ({ ...current, [appt._id]: { ...draft, advice: event.target.value } }))}
                      className="md:col-span-2 rounded-xl border border-slate-300 px-3 py-2 text-sm"
                      rows={3}
                      placeholder="Advice"
                    />
                  </div>
                  <div className="mt-3 space-y-2">
                    {draft.medications.map((medication, index) => (
                      <div key={`${appt._id}-${index}`} className="grid gap-2 md:grid-cols-4">
                        <input
                          value={medication.name}
                          onChange={(event) => {
                            const medications = [...draft.medications];
                            medications[index] = { ...medications[index], name: event.target.value };
                            setPrescriptionDrafts((current) => ({ ...current, [appt._id]: { ...draft, medications } }));
                          }}
                          className="rounded-xl border border-slate-300 px-3 py-2 text-sm"
                          placeholder="Medication"
                        />
                        <input
                          value={medication.dosage}
                          onChange={(event) => {
                            const medications = [...draft.medications];
                            medications[index] = { ...medications[index], dosage: event.target.value };
                            setPrescriptionDrafts((current) => ({ ...current, [appt._id]: { ...draft, medications } }));
                          }}
                          className="rounded-xl border border-slate-300 px-3 py-2 text-sm"
                          placeholder="Dosage"
                        />
                        <input
                          value={medication.frequency}
                          onChange={(event) => {
                            const medications = [...draft.medications];
                            medications[index] = { ...medications[index], frequency: event.target.value };
                            setPrescriptionDrafts((current) => ({ ...current, [appt._id]: { ...draft, medications } }));
                          }}
                          className="rounded-xl border border-slate-300 px-3 py-2 text-sm"
                          placeholder="Frequency"
                        />
                        <input
                          value={medication.duration}
                          onChange={(event) => {
                            const medications = [...draft.medications];
                            medications[index] = { ...medications[index], duration: event.target.value };
                            setPrescriptionDrafts((current) => ({ ...current, [appt._id]: { ...draft, medications } }));
                          }}
                          className="rounded-xl border border-slate-300 px-3 py-2 text-sm"
                          placeholder="Duration"
                        />
                      </div>
                    ))}
                  </div>
                </div>
              )}
              {activeChatApptId === appt._id && (
                <div className="mt-4 border-t border-slate-100 pt-4">
                  <ChatSection
                    appointmentId={appt._id}
                    roomId={`${appt._id}:${appt.patientId}:${appt.doctorId}`}
                    senderRole="doctor"
                    userId={loggedInUserId || appt.doctorId}
                    peerName={appt.patientName}
                    isActive={['accepted', 'doctor_on_way', 'arrived', 'in_consultation'].includes(appt.status)}
                    onClose={() => setActiveChatApptId(null)}
                  />
                </div>
              )}
            </div>
          );
        })}
      </div>
      {showReasonModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
          <div className="w-full max-w-md rounded-2xl p-6 shadow-large border" style={{ backgroundColor: 'var(--card-bg)', borderColor: 'var(--border-color)', color: 'var(--text-primary)' }}>
            <h3 className="text-lg font-bold">Provide Reason</h3>
            <p className="mt-2 text-sm" style={{ color: 'var(--text-secondary)' }}>Select a reason for this action.</p>
            <div className="mt-4 space-y-3">
              {REASON_OPTIONS.map((opt) => (
                <label key={opt} className="flex items-center gap-2.5 cursor-pointer">
                  <input type="radio" name="reason" checked={selectedOption === opt} onChange={() => setSelectedOption(opt)} className="h-4 w-4 border-gray-300 text-emerald-600 focus:ring-emerald-500" />
                  <span className="text-sm" style={{ color: 'var(--text-primary)' }}>{opt}</span>
                </label>
              ))}
              {selectedOption === 'Other' && (
                <textarea
                  value={customReason}
                  onChange={(e) => setCustomReason(e.target.value)}
                  className="mt-2 dd-input resize-none"
                  rows={3}
                  placeholder="Describe reason"
                />
              )}
            </div>
            <div className="mt-6 flex justify-end gap-2.5">
              <button type="button" onClick={() => { setShowReasonModal(false); setPendingAction(null); }} className="btn-secondary text-xs px-4 py-2">
                Cancel
              </button>
              <button
                type="button"
                onClick={confirmReason}
                disabled={selectedOption === 'Other' ? customReason.trim().length === 0 : !selectedOption}
                className={`btn-primary text-xs px-4 py-2 ${selectedOption === 'Other' ? (customReason.trim().length === 0 ? 'opacity-50' : '') : ''}`}
              >
                Confirm
              </button>
            </div>
          </div>
        </div>
      )}
      {pendingOtpActionApptId && (() => {
        const activeAppt = appointments.find((a) => a._id === pendingOtpActionApptId);
        return (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
            <div className="w-full max-w-md rounded-2xl p-6 shadow-large border" style={{ backgroundColor: 'var(--card-bg)', borderColor: 'var(--border-color)', color: 'var(--text-primary)' }}>
              <h3 className="text-lg font-bold">Enter Consultation OTP</h3>
              <p className="mt-2 text-sm" style={{ color: 'var(--text-secondary)' }}>
                Please enter the 6-digit OTP code received by the patient to verify their arrival and start the consultation.
              </p>
              
              {(activeAppt as any)?.otpCode && (
                <div className="mt-4 flex flex-col items-center justify-center rounded-xl bg-emerald-50 dark:bg-emerald-950/20 border border-emerald-200 dark:border-emerald-900/50 p-4">
                  <span className="text-3xl font-extrabold tracking-widest text-emerald-800 dark:text-emerald-400">
                    {(activeAppt as any).otpCode}
                  </span>
                  <span className="mt-1 text-xs text-slate-500 dark:text-slate-400 font-medium">OTP Code (Dev Mode Display)</span>
                </div>
              )}

              <div className="mt-4">
                <input
                  type="text"
                  maxLength={6}
                  value={otpInput}
                  onChange={(e) => {
                    const val = e.target.value.replace(/\D/g, '');
                    setOtpInput(val);
                  }}
                  className="w-full text-center text-3xl tracking-widest font-extrabold rounded-xl border px-3 py-3"
                  style={{ backgroundColor: 'var(--bg-secondary)', borderColor: 'var(--border-color)', color: 'var(--text-primary)' }}
                  placeholder="000000"
                />
                {otpError && (
                  <p className="mt-2 text-xs font-semibold text-rose-600">{otpError}</p>
                )}
              </div>
              <div className="mt-6 flex justify-end gap-2.5">
                <button
                  type="button"
                  disabled={resendingOtp || verifyingOtp}
                  onClick={async () => {
                    setResendingOtp(true);
                    try {
                      const token = getStoredAccessToken();
                      const API_BASE = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000/api/v1';
                      const res = await fetch(`${API_BASE}/appointments/${pendingOtpActionApptId}/resend-otp`, {
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
                      showToast('OTP resent successfully.', 'success');
                      await load();
                    } catch (err: any) {
                      showToast(err.message || 'Unable to resend OTP.', 'error');
                    } finally {
                      setResendingOtp(false);
                    }
                  }}
                  className="rounded-full border border-slate-300 hover:bg-slate-50 text-slate-700 dark:border-slate-700 dark:text-slate-300 dark:hover:bg-slate-800 text-xs px-4 py-2"
                >
                  {resendingOtp ? 'Resending...' : 'Resend OTP'}
                </button>
                <button
                  type="button"
                  disabled={verifyingOtp}
                  onClick={() => setPendingOtpActionApptId(null)}
                  className="rounded-full border border-slate-300 hover:bg-slate-50 text-slate-700 dark:border-slate-700 dark:text-slate-300 dark:hover:bg-slate-800 text-xs px-4 py-2"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  disabled={verifyingOtp || otpInput.length !== 6}
                  onClick={confirmOtp}
                  className="rounded-full bg-emerald-600 text-white hover:bg-emerald-700 text-xs px-4 py-2"
                >
                  {verifyingOtp ? 'Verifying...' : 'Verify & Start'}
                </button>
              </div>
            </div>
          </div>
        );
      })()}
      {/* Video Consultation Overlay */}
      {videoCallAppt && (
        <VideoConsultation
          appointmentId={videoCallAppt._id}
          peerId={(videoCallAppt as any).patientUserId || (videoCallAppt as any).patientId || ''}
          peerName={videoCallAppt.patientName || 'Patient'}
          isCaller={true}
          onClose={() => setVideoCallAppt(null)}
        />
      )}
    </div>
  );
}
