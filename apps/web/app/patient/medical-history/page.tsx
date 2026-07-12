'use client';

import { useEffect, useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { jsPDF } from 'jspdf';
import html2canvas from 'html2canvas';

import { useToast } from '../../auth/toast-provider';
import {
  fetchPatientProfile,
  updateMedicalHistory,
  fetchPatientAppointments,
  fetchPatientAppointmentDetail,
  type MedicalHistoryEntry,
  type PatientAppointment,
  type AppointmentDetail
} from '../api';

const schema = z.object({
  note: z.string().trim().min(3, 'Note must be at least 3 characters')
});

type FormValues = z.infer<typeof schema>;

export default function PatientMedicalHistoryPage() {
  const { showToast } = useToast();
  
  // Custom notes state
  const [entries, setEntries] = useState<MedicalHistoryEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [editingIndex, setEditingIndex] = useState<number | null>(null);
  const [editNote, setEditNote] = useState('');

  // Consultations / Appointments state
  const [appointments, setAppointments] = useState<PatientAppointment[]>([]);
  const [loadingAppointments, setLoadingAppointments] = useState(true);
  const [expandedApptId, setExpandedApptId] = useState<string | null>(null);
  const [appointmentDetails, setAppointmentDetails] = useState<Record<string, AppointmentDetail>>({});
  const [loadingDetailId, setLoadingDetailId] = useState<string | null>(null);
  const [downloadingPdfId, setDownloadingPdfId] = useState<string | null>(null);

  const { register, handleSubmit, reset, formState: { errors } } = useForm<FormValues>({
    resolver: zodResolver(schema)
  });

  const loadData = async () => {
    setLoading(true);
    setLoadingAppointments(true);
    try {
      const [profile, appts] = await Promise.all([
        fetchPatientProfile(),
        fetchPatientAppointments('all')
      ]);
      setEntries(profile.medicalHistory || []);
      // Sort appointments by date descending (newest first)
      const sortedAppts = (appts || []).sort(
        (a, b) => new Date(b.scheduledAt).getTime() - new Date(a.scheduledAt).getTime()
      );
      setAppointments(sortedAppts);
      setError(null);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Unable to load records.');
    } finally {
      setLoading(false);
      setLoadingAppointments(false);
    }
  };

  useEffect(() => {
    void loadData();
  }, []);

  const saveEntries = async (nextEntries: Array<{ note: string; createdAt?: string }>, successMessage: string) => {
    setSaving(true);
    try {
      const profile = await updateMedicalHistory(nextEntries);
      setEntries(profile.medicalHistory || []);
      showToast(successMessage, 'success');
    } catch (err: unknown) {
      showToast(err instanceof Error ? err.message : 'Unable to save medical history.', 'error');
    } finally {
      setSaving(false);
    }
  };

  const onSubmit = async (values: FormValues) => {
    const nextEntries = [
      ...entries.map((entry) => ({ note: entry.note, createdAt: entry.createdAt })),
      { note: values.note }
    ];
    await saveEntries(nextEntries, 'Medical history entry added.');
    reset();
  };

  const handleDelete = async (index: number) => {
    const nextEntries = entries
      .filter((_, i) => i !== index)
      .map((entry) => ({ note: entry.note, createdAt: entry.createdAt }));
    await saveEntries(nextEntries, 'Entry removed.');
  };

  const startEdit = (index: number) => {
    setEditingIndex(index);
    setEditNote(entries[index].note);
  };

  const cancelEdit = () => {
    setEditingIndex(null);
    setEditNote('');
  };

  const saveEdit = async (index: number) => {
    if (!editNote.trim()) {
      showToast('Note cannot be empty.', 'error');
      return;
    }
    const nextEntries = entries.map((entry, i) =>
      i === index ? { note: editNote.trim(), createdAt: entry.createdAt } : { note: entry.note, createdAt: entry.createdAt }
    );
    await saveEntries(nextEntries, 'Entry updated.');
    cancelEdit();
  };

  const toggleExpandAppointment = async (apptId: string) => {
    if (expandedApptId === apptId) {
      setExpandedApptId(null);
      return;
    }

    setExpandedApptId(apptId);

    // If details are already loaded, do not fetch again
    if (appointmentDetails[apptId]) return;

    setLoadingDetailId(apptId);
    try {
      const detail = await fetchPatientAppointmentDetail(apptId);
      setAppointmentDetails((prev) => ({ ...prev, [apptId]: detail }));
    } catch (err: any) {
      showToast(err.message || 'Failed to fetch appointment details.', 'error');
    } finally {
      setLoadingDetailId(null);
    }
  };

  const downloadPrescriptionPdf = async (apptId: string, detail: AppointmentDetail) => {
    setDownloadingPdfId(apptId);
    try {
      // Create hidden PDF template container
      const container = document.createElement('div');
      container.style.position = 'fixed';
      container.style.left = '-9999px';
      container.style.top = '0';
      container.style.width = '750px';
      container.style.backgroundColor = '#ffffff';
      container.style.color = '#1e293b';
      container.style.fontFamily = 'sans-serif';
      container.style.padding = '40px';
      
      const dateStr = new Date(detail.appointment.scheduledAt).toLocaleDateString(undefined, {
        year: 'numeric',
        month: 'long',
        day: 'numeric'
      });

      const medicationsList = detail.prescription?.medications || [];

      container.innerHTML = `
        <div style="border: 2px solid #059669; padding: 25px; border-radius: 12px; background: #fafafa;">
          <!-- Branding Header -->
          <div style="display: flex; justify-content: space-between; align-items: center; border-bottom: 2px solid #059669; padding-bottom: 20px; margin-bottom: 25px;">
            <div>
              <div style="font-size: 28px; font-weight: 800; color: #059669; display: flex; align-items: center; gap: 8px;">
                <span style="background: #059669; color: white; width: 34px; height: 34px; display: inline-flex; align-items: center; justify-content: center; border-radius: 8px; font-size: 20px; margin-right: 6px;">✚</span>
                DocDock
              </div>
              <div style="font-size: 11px; color: #64748b; margin-top: 4px;">Knock-Knock, your doctor is here.</div>
            </div>
            <div style="text-align: right;">
              <h2 style="margin: 0; font-size: 20px; color: #1e293b; font-weight: 700;">PRESCRIPTION</h2>
              <p style="margin: 4px 0 0 0; font-size: 13px; color: #475569;">Date: <strong>${dateStr}</strong></p>
              <p style="margin: 2px 0 0 0; font-size: 12px; color: #64748b;">Ref ID: #${detail.appointment._id.slice(-8).toUpperCase()}</p>
            </div>
          </div>

          <!-- Info Section -->
          <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 30px; margin-bottom: 30px; background: white; padding: 15px; border-radius: 8px; border: 1px solid #e2e8f0;">
            <div>
              <h3 style="margin: 0 0 8px 0; font-size: 13px; color: #059669; text-transform: uppercase; letter-spacing: 0.5px;">Doctor Details</h3>
              <p style="margin: 0; font-size: 15px; font-weight: 700; color: #1e293b;">Dr. ${detail.doctor.fullName}</p>
              <p style="margin: 4px 0 0 0; font-size: 13px; color: #475569;">${detail.doctor.specialization || 'General Physician'}</p>
              ${detail.doctor.clinicName ? `<p style="margin: 2px 0 0 0; font-size: 12px; color: #64748b;">${detail.doctor.clinicName}</p>` : ''}
              ${detail.doctor.email ? `<p style="margin: 2px 0 0 0; font-size: 12px; color: #64748b;">${detail.doctor.email}</p>` : ''}
            </div>
            <div>
              <h3 style="margin: 0 0 8px 0; font-size: 13px; color: #059669; text-transform: uppercase; letter-spacing: 0.5px;">Patient Details</h3>
              <p style="margin: 0; font-size: 15px; font-weight: 700; color: #1e293b;">${detail.patient.fullName}</p>
              ${detail.patient.phone ? `<p style="margin: 4px 0 0 0; font-size: 13px; color: #475569;">Phone: ${detail.patient.phone}</p>` : ''}
              ${detail.patient.email ? `<p style="margin: 2px 0 0 0; font-size: 12px; color: #64748b;">Email: ${detail.patient.email}</p>` : ''}
            </div>
          </div>

          <!-- Diagnosis Block -->
          <div style="margin-bottom: 35px; background: white; padding: 18px; border-radius: 8px; border-left: 4px solid #059669; box-shadow: 0 1px 3px rgba(0,0,0,0.05);">
            <h3 style="margin: 0 0 6px 0; font-size: 13px; color: #475569; font-weight: 700;">DIAGNOSIS</h3>
            <p style="margin: 0; font-size: 15px; color: #0f172a; font-weight: 600; line-height: 1.5;">${detail.prescription?.diagnosis || 'General Checkup / Undefined'}</p>
          </div>

          <!-- RX Symbol & Title -->
          <div style="display: flex; align-items: center; gap: 8px; margin-bottom: 15px;">
            <span style="font-size: 26px; font-weight: 800; color: #059669; font-family: Georgia, serif;">Rₓ</span>
            <span style="font-size: 13px; font-weight: 700; color: #475569; tracking: 0.5px; text-transform: uppercase;">Prescribed Medications</span>
          </div>

          <!-- Medicines Table -->
          <table style="width: 100%; border-collapse: collapse; margin-bottom: 35px; background: white; border-radius: 8px; overflow: hidden; border: 1px solid #e2e8f0;">
            <thead>
              <tr style="background: #059669; color: white; text-align: left;">
                <th style="padding: 12px 16px; font-size: 12px; font-weight: 600; text-transform: uppercase;">Medicine Name</th>
                <th style="padding: 12px 16px; font-size: 12px; font-weight: 600; text-transform: uppercase;">Dosage</th>
                <th style="padding: 12px 16px; font-size: 12px; font-weight: 600; text-transform: uppercase;">Frequency</th>
                <th style="padding: 12px 16px; font-size: 12px; font-weight: 600; text-transform: uppercase;">Duration</th>
              </tr>
            </thead>
            <tbody>
              ${medicationsList.length === 0 ? `
                <tr>
                  <td colspan="4" style="padding: 20px; text-align: center; color: #64748b; font-size: 13px;">No medicines prescribed.</td>
                </tr>
              ` : medicationsList.map((m: any) => `
                <tr style="border-bottom: 1px solid #edf2f7; font-size: 14px;">
                  <td style="padding: 12px 16px; font-weight: 600; color: #1e293b;">${m.name}</td>
                  <td style="padding: 12px 16px; color: #475569;">${m.dosage || 'As directed'}</td>
                  <td style="padding: 12px 16px; color: #475569;">${m.frequency || 'Once daily'}</td>
                  <td style="padding: 12px 16px; color: #475569; font-weight: 500;">${m.duration || 'N/A'}</td>
                </tr>
              `).join('')}
            </tbody>
          </table>

          <!-- Notes / Advice -->
          <div style="margin-bottom: 35px; background: white; padding: 18px; border-radius: 8px; border: 1px solid #e2e8f0;">
            <h3 style="margin: 0 0 8px 0; font-size: 12px; color: #059669; text-transform: uppercase; letter-spacing: 0.5px; font-weight: 700;">Doctor Notes & Advice</h3>
            <p style="margin: 0; font-size: 13.5px; color: #334155; line-height: 1.6; white-space: pre-line;">${detail.prescription?.notes || 'Follow general healthcare precautions. Get plenty of rest and stay hydrated.'}</p>
          </div>

          <!-- Footer Advice -->
          <div style="margin-bottom: 50px; background: #e6f4ea; padding: 12px 18px; border-radius: 8px; display: flex; align-items: center; gap: 8px;">
            <span style="font-size: 16px;">💡</span>
            <span style="font-size: 12px; color: #137333; font-weight: 500;"><strong>Follow-up Advice:</strong> Please schedule a follow-up consultation in 7 days or if symptoms worsen.</span>
          </div>

          <!-- Footer Signature Branding -->
          <div style="display: flex; justify-content: space-between; align-items: flex-end; border-top: 1px solid #e2e8f0; padding-top: 25px; font-size: 11px; color: #94a3b8;">
            <div>
              <p style="margin: 0;">Prescription generated electronically on DocDock.</p>
              <p style="margin: 4px 0 0 0; color: #059669; font-weight: 700;">Generated by DocDock</p>
            </div>
            <div style="text-align: right; min-width: 150px;">
              <div style="border-bottom: 1px solid #cbd5e1; height: 40px; margin-bottom: 6px;"></div>
              <p style="margin: 0; font-weight: 600; color: #475569;">Authorized Signature</p>
            </div>
          </div>
        </div>
      `;

      document.body.appendChild(container);

      // Render prescription container to canvas
      const canvas = await html2canvas(container, {
        scale: 2,
        useCORS: true,
        backgroundColor: '#ffffff'
      });

      document.body.removeChild(container);

      const imgData = canvas.toDataURL('image/png');
      const pdf = new jsPDF('p', 'mm', 'a4');
      const imgWidth = 210; // A4 width in mm
      const pageHeight = 297; // A4 height in mm
      const imgHeight = (canvas.height * imgWidth) / canvas.width;
      let heightLeft = imgHeight;
      let position = 0;

      pdf.addImage(imgData, 'PNG', 0, position, imgWidth, imgHeight);
      heightLeft -= pageHeight;

      while (heightLeft >= 0) {
        position = heightLeft - imgHeight;
        pdf.addPage();
        pdf.addImage(imgData, 'PNG', 0, position, imgWidth, imgHeight);
        heightLeft -= pageHeight;
      }

      pdf.save(`prescription-${detail.appointment._id.slice(-6).toUpperCase()}.pdf`);
      showToast('Prescription PDF downloaded successfully.', 'success');
    } catch (err: any) {
      showToast(err.message || 'Could not generate prescription PDF.', 'error');
    } finally {
      setDownloadingPdfId(null);
    }
  };

  const formatDate = (dateStr: string) => {
    try {
      return new Date(dateStr).toLocaleDateString(undefined, { year: 'numeric', month: 'short', day: 'numeric' });
    } catch {
      return dateStr;
    }
  };

  const getStatusBadgeClass = (status: string) => {
    switch (status) {
      case 'completed': return 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950/40 dark:text-emerald-400';
      case 'pending': return 'bg-amber-100 text-amber-800 dark:bg-amber-950/40 dark:text-amber-400';
      case 'accepted': return 'bg-blue-100 text-blue-800 dark:bg-blue-950/40 dark:text-blue-400';
      case 'cancelled_by_patient':
      case 'cancelled_by_doctor':
      case 'rejected':
      case 'auto_rejected':
        return 'bg-rose-100 text-rose-800 dark:bg-rose-950/40 dark:text-rose-400';
      default: return 'bg-slate-100 text-slate-800 dark:bg-slate-800 dark:text-slate-300';
    }
  };

  return (
    <section className="grid gap-6 lg:grid-cols-[1.2fr_0.8fr]">
      {/* Consultation Records / Medical History Overhaul */}
      <div className="dd-card flex flex-col">
        <h2 className="text-xl font-bold" style={{ color: 'var(--text-primary)' }}>Consultation History</h2>
        <p className="mt-1 text-sm mb-6" style={{ color: 'var(--text-secondary)' }}>
          Detailed record of your clinical appointments, diagnoses, prescriptions, and follow-ups.
        </p>

        {loadingAppointments ? (
          <div className="space-y-4">
            <div className="h-14 skeleton rounded-2xl" />
            <div className="h-14 skeleton rounded-2xl" />
            <div className="h-14 skeleton rounded-2xl" />
          </div>
        ) : appointments.length === 0 ? (
          <div className="rounded-2xl border border-dashed p-8 text-center text-sm" style={{ borderColor: 'var(--border-color)', color: 'var(--text-muted)' }}>
            No past consultations found.
          </div>
        ) : (
          <div className="space-y-4">
            {appointments.map((appt) => {
              const isExpanded = expandedApptId === appt._id;
              const detail = appointmentDetails[appt._id];
              const isLoadingDetail = loadingDetailId === appt._id;

              return (
                <div
                  key={appt._id}
                  className={`rounded-2xl border transition-all overflow-hidden ${isExpanded ? 'border-emerald-500 shadow-md' : 'hover:border-slate-300 dark:hover:border-slate-700'}`}
                  style={{ borderColor: isExpanded ? undefined : 'var(--border-color)', backgroundColor: 'var(--card-bg)' }}
                >
                  {/* Summary Row */}
                  <div
                    onClick={() => toggleExpandAppointment(appt._id)}
                    className="flex flex-wrap items-center justify-between p-4 cursor-pointer select-none gap-3"
                  >
                    <div className="flex items-center gap-3">
                      <div className="h-10 w-10 flex items-center justify-center rounded-xl bg-emerald-50 text-emerald-600 dark:bg-emerald-950/40 dark:text-emerald-400 font-bold">
                        ⚕️
                      </div>
                      <div>
                        <h4 className="text-sm font-bold" style={{ color: 'var(--text-primary)' }}>
                          Dr. {appt.doctorName}
                        </h4>
                        <p className="text-xs" style={{ color: 'var(--text-muted)' }}>
                          {appt.specialization} • {formatDate(appt.scheduledAt)}
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className={`rounded-full px-2.5 py-0.5 text-xs font-semibold uppercase tracking-wider ${getStatusBadgeClass(appt.status)}`}>
                        {appt.statusLabel || appt.status}
                      </span>
                      <span className="text-slate-400 text-lg transition-transform" style={{ transform: isExpanded ? 'rotate(180deg)' : 'rotate(0)' }}>
                        ▼
                      </span>
                    </div>
                  </div>

                  {/* Expanded consultation details */}
                  {isExpanded && (
                    <div className="border-t p-4 bg-slate-50/50 dark:bg-slate-900/30 space-y-4 text-sm" style={{ borderColor: 'var(--border-color)' }}>
                      {isLoadingDetail ? (
                        <div className="flex items-center justify-center p-6 gap-2">
                          <div className="h-5 w-5 animate-spin rounded-full border-4 border-emerald-600 border-t-transparent" />
                          <span className="text-xs" style={{ color: 'var(--text-secondary)' }}>Loading details...</span>
                        </div>
                      ) : !detail ? (
                        <p className="text-xs text-rose-500">Failed to load consultation details.</p>
                      ) : (
                        <div className="space-y-4">
                          {/* Appointment Summary Grid */}
                          <div className="grid gap-4 sm:grid-cols-2">
                            <div>
                              <p className="font-semibold text-xs uppercase tracking-wider" style={{ color: 'var(--text-muted)' }}>Appointment ID</p>
                              <p className="mt-0.5 font-mono text-xs" style={{ color: 'var(--text-primary)' }}>#{detail.appointment._id}</p>
                            </div>
                            <div>
                              <p className="font-semibold text-xs uppercase tracking-wider" style={{ color: 'var(--text-muted)' }}>Date & Time</p>
                              <p className="mt-0.5" style={{ color: 'var(--text-primary)' }}>
                                {new Date(detail.appointment.scheduledAt).toLocaleString(undefined, { dateStyle: 'medium', timeStyle: 'short' })}
                              </p>
                            </div>
                          </div>

                          {/* Diagnosis */}
                          <div className="pt-2">
                            <p className="font-semibold text-xs uppercase tracking-wider" style={{ color: 'var(--text-muted)' }}>Diagnosis</p>
                            <p className="mt-1 font-semibold text-slate-800 dark:text-slate-200">
                              {detail.prescription?.diagnosis || 'No Diagnosis recorded'}
                            </p>
                          </div>

                          {/* Medicines Prescription list */}
                          {detail.prescription?.medications && detail.prescription.medications.length > 0 ? (
                            <div className="pt-2">
                              <p className="font-semibold text-xs uppercase tracking-wider mb-2" style={{ color: 'var(--text-muted)' }}>Prescribed Medicines</p>
                              <div className="overflow-x-auto rounded-xl border border-slate-200 dark:border-slate-800">
                                <table className="w-full text-left border-collapse text-xs">
                                  <thead>
                                    <tr className="bg-slate-100 dark:bg-slate-800" style={{ color: 'var(--text-primary)' }}>
                                      <th className="p-2.5 font-bold">Medicine Name</th>
                                      <th className="p-2.5 font-bold">Dosage</th>
                                      <th className="p-2.5 font-bold">Frequency</th>
                                      <th className="p-2.5 font-bold">Duration</th>
                                    </tr>
                                  </thead>
                                  <tbody>
                                    {detail.prescription.medications.map((med: any, i: number) => (
                                      <tr key={i} className="border-t border-slate-200 dark:border-slate-800" style={{ color: 'var(--text-secondary)' }}>
                                        <td className="p-2.5 font-semibold text-slate-800 dark:text-slate-100">{med.name}</td>
                                        <td className="p-2.5">{med.dosage || 'As directed'}</td>
                                        <td className="p-2.5">{med.frequency || 'Once daily'}</td>
                                        <td className="p-2.5 font-medium">{med.duration || 'N/A'}</td>
                                      </tr>
                                    ))}
                                  </tbody>
                                </table>
                              </div>
                            </div>
                          ) : (
                            <div className="pt-2">
                              <p className="font-semibold text-xs uppercase tracking-wider" style={{ color: 'var(--text-muted)' }}>Prescription</p>
                              <p className="mt-1 text-slate-500 italic">No prescription issued for this consultation.</p>
                            </div>
                          )}

                          {/* Notes */}
                          <div className="pt-2">
                            <p className="font-semibold text-xs uppercase tracking-wider" style={{ color: 'var(--text-muted)' }}>Doctor Notes & Advice</p>
                            <p className="mt-1 whitespace-pre-line text-slate-600 dark:text-slate-300">
                              {detail.prescription?.notes || 'No doctor notes provided.'}
                            </p>
                          </div>

                          {/* Follow up & Status */}
                          <div className="grid gap-4 sm:grid-cols-2 pt-2">
                            <div>
                              <p className="font-semibold text-xs uppercase tracking-wider" style={{ color: 'var(--text-muted)' }}>Follow-up Date</p>
                              <p className="mt-0.5 text-slate-700 dark:text-slate-300 font-semibold">
                                {(detail.prescription as any)?.followUpDate ? formatDate((detail.prescription as any).followUpDate) : 'Not Scheduled'}
                              </p>
                            </div>
                            <div>
                              <p className="font-semibold text-xs uppercase tracking-wider" style={{ color: 'var(--text-muted)' }}>Consultation Mode</p>
                              <p className="mt-0.5 text-slate-700 dark:text-slate-300 capitalize">
                                {detail.appointment.consultationMode || 'clinic'}
                              </p>
                            </div>
                          </div>

                          {/* Download PDF button */}
                          {detail.prescription && (
                            <div className="pt-4 flex justify-end">
                              <button
                                type="button"
                                disabled={downloadingPdfId === appt._id}
                                onClick={() => downloadPrescriptionPdf(appt._id, detail)}
                                className="btn-primary rounded-full px-5 py-2 text-xs font-semibold shadow flex items-center gap-1.5"
                              >
                                {downloadingPdfId === appt._id ? (
                                  <>
                                    <span className="h-3 w-3 animate-spin rounded-full border-2 border-white border-t-transparent" />
                                    Generating PDF...
                                  </>
                                ) : (
                                  <>
                                    <span>📄</span> Download Prescription PDF
                                  </>
                                )}
                              </button>
                            </div>
                          )}
                        </div>
                      )}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Local custom notes card */}
      <div className="flex flex-col gap-6">
        <div className="dd-card">
          <h2 className="text-xl font-bold" style={{ color: 'var(--text-primary)' }}>Personal Medical Diary</h2>
          <p className="mt-1 text-sm" style={{ color: 'var(--text-secondary)' }}>Record personal diagnoses, daily health logs, procedures, or notes for yourself.</p>

          {error && (
            <div className="mt-4 rounded-xl border border-rose-200 bg-rose-50 dark:bg-rose-950/30 dark:border-rose-900 px-4 py-3 text-sm text-rose-700 dark:text-rose-400">
              {error}
            </div>
          )}

          <form className="mt-6 space-y-4" onSubmit={handleSubmit(onSubmit)}>
            <div>
              <label className="dd-label">Add a note</label>
              <textarea
                {...register('note')}
                rows={4}
                className="dd-input resize-none"
                placeholder="e.g. Blood pressure 120/80 in the morning..."
              />
              {errors.note && <p className="mt-1.5 text-xs text-rose-600">{errors.note.message}</p>}
            </div>
            <button
              type="submit"
              disabled={saving}
              className="btn-primary w-full rounded-full py-2.5 font-semibold"
            >
              {saving ? 'Saving...' : 'Add entry'}
            </button>
          </form>
        </div>

        <div className="dd-card flex-1">
          <h3 className="text-lg font-bold" style={{ color: 'var(--text-primary)' }}>Your notes</h3>

          {loading && (
            <div className="mt-4 space-y-3">
              <div className="h-10 skeleton rounded-xl" />
            </div>
          )}

          {!loading && entries.length === 0 && (
            <div className="mt-4 rounded-xl border border-dashed p-8 text-center text-sm" style={{ borderColor: 'var(--border-color)', color: 'var(--text-muted)' }}>
              No custom notes recorded yet.
            </div>
          )}

          {!loading && entries.length > 0 && (
            <div className="mt-4 space-y-3 max-h-[450px] overflow-y-auto pr-1">
              {entries.map((entry, index) => (
                <div key={entry._id || `${entry.note}-${index}`} className="rounded-xl border p-4 bg-slate-50/30 dark:bg-slate-900/10" style={{ borderColor: 'var(--border-color)' }}>
                  {editingIndex === index ? (
                    <textarea
                      value={editNote}
                      onChange={(e) => setEditNote(e.target.value)}
                      rows={3}
                      className="dd-input resize-none"
                    />
                  ) : (
                    <p className="text-sm leading-relaxed" style={{ color: 'var(--text-primary)' }}>{entry.note}</p>
                  )}
                  <p className="mt-2 text-[10px] font-medium" style={{ color: 'var(--text-muted)' }}>Added {formatDate(entry.createdAt)}</p>
                  <div className="mt-3 flex flex-wrap gap-2">
                    {editingIndex === index ? (
                      <>
                        <button type="button" onClick={() => saveEdit(index)} disabled={saving} className="btn-primary text-xs px-3 py-1.5 rounded-full">
                          Save
                        </button>
                        <button type="button" onClick={cancelEdit} className="btn-secondary text-xs px-3 py-1.5 rounded-full">
                          Cancel
                        </button>
                      </>
                    ) : (
                      <>
                        <button type="button" onClick={() => startEdit(index)} className="btn-secondary text-xs px-3 py-1.5 rounded-full">
                          Edit
                        </button>
                        <button type="button" onClick={() => handleDelete(index)} disabled={saving} className="btn-secondary text-xs px-3 py-1.5 text-rose-600 border-rose-200 dark:border-rose-900/50 dark:text-rose-400 disabled:opacity-60 rounded-full">
                          Delete
                        </button>
                      </>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </section>
  );
}
