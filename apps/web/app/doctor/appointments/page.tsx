'use client';

import { useEffect, useState } from 'react';

import { useToast } from '../../auth/toast-provider';
import { createOrUpdatePrescription, fetchDoctorAppointments, fetchDoctorProfile, updateAppointmentStatus, type DoctorAppointment } from '../api';

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

function getActions(status: string, verified: boolean, paymentStatus?: string): ActionButton[] {
  if (!verified || paymentStatus !== 'paid') return [];

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
  const [showReasonModal, setShowReasonModal] = useState(false);
  const [pendingAction, setPendingAction] = useState<{ appointmentId: string; status: string } | null>(null);
  const [selectedOption, setSelectedOption] = useState<string>('Doctor unavailable');
  const [customReason, setCustomReason] = useState<string>('');
  const REASON_OPTIONS = ['Doctor unavailable', 'Emergency', 'Outside service area', 'Other'];
  const [prescriptionDrafts, setPrescriptionDrafts] = useState<Record<string, PrescriptionDraft>>({});

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
    // Removed periodic polling to prevent flicker; page will refresh after actions only
    return () => {};
  }, [filter]);

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
          const actions = getActions(appt.status, verified, appt.paymentStatus);
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
                  {!actions.length && appt.paymentStatus !== 'paid' && (
                    <p className="text-xs text-amber-700">Waiting for payment confirmation before the doctor can proceed.</p>
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
            </div>
          );
        })}
      </div>
      {showReasonModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
          <div className="w-full max-w-md rounded-2xl bg-white p-6 shadow-lg">
            <h3 className="text-lg font-semibold">Provide reason</h3>
            <p className="mt-2 text-sm text-slate-600">Select a reason for this action.</p>
            <div className="mt-4 space-y-2">
              {REASON_OPTIONS.map((opt) => (
                <label key={opt} className="flex items-center gap-2">
                  <input type="radio" name="reason" checked={selectedOption === opt} onChange={() => setSelectedOption(opt)} />
                  <span className="text-sm">{opt}</span>
                </label>
              ))}
              {selectedOption === 'Other' && (
                <textarea
                  value={customReason}
                  onChange={(e) => setCustomReason(e.target.value)}
                  className="mt-2 w-full rounded-xl border border-slate-300 px-3 py-2 text-sm"
                  rows={3}
                  placeholder="Describe reason"
                />
              )}
            </div>
            <div className="mt-4 flex justify-end gap-2">
              <button type="button" onClick={() => { setShowReasonModal(false); setPendingAction(null); }} className="rounded-full border px-4 py-2">
                Cancel
              </button>
              <button
                type="button"
                onClick={confirmReason}
                disabled={selectedOption === 'Other' ? customReason.trim().length === 0 : !selectedOption}
                className={`rounded-full px-4 py-2 text-white ${selectedOption === 'Other' ? (customReason.trim().length === 0 ? 'bg-slate-300' : 'bg-emerald-600') : 'bg-emerald-600'}`}
              >
                Confirm
              </button>
            </div>
          </div>
        </div>
      )}
    </section>
  );
}
