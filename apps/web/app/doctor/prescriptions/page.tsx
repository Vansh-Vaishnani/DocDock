'use client';

import { useEffect, useMemo, useState } from 'react';
import { useToast } from '../../auth/toast-provider';
import { fetchDoctorPrescriptions } from '../api';

type Medication = {
  name: string;
  dosage: string;
  frequency: string;
  duration: string;
  instructions?: string;
  quantity?: number;
};

type PrescriptionRow = {
  _id: string;
  appointmentId: string;
  patientId: string;
  diagnosis: string;
  chiefComplaints: string;
  medications: Medication[];
  labTests?: string[];
  advice?: string;
  followUpDate?: string;
  issuedAt: string;
  patientName?: string;
  prescriptionPdfUrl?: string;
};

type PatientGroup = {
  patientId: string;
  patientName: string;
  prescriptions: PrescriptionRow[];
  lastVisited: string;
};

export default function DoctorPrescriptionsPage() {
  const { showToast } = useToast();
  const [prescriptions, setPrescriptions] = useState<PrescriptionRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedPatientId, setSelectedPatientId] = useState<string | null>(null);

  useEffect(() => {
    void fetchDoctorPrescriptions()
      .then((data) => setPrescriptions(data as PrescriptionRow[]))
      .catch((err: unknown) => {
        showToast(err instanceof Error ? err.message : 'Unable to load prescriptions.', 'error');
      })
      .finally(() => setLoading(false));
  }, [showToast]);

  // Group prescriptions by Patient
  const patientGroups = useMemo((): PatientGroup[] => {
    const groups: Record<string, PrescriptionRow[]> = {};
    prescriptions.forEach((rx) => {
      const pId = rx.patientId || 'unknown';
      if (!groups[pId]) {
        groups[pId] = [];
      }
      groups[pId].push(rx);
    });

    return Object.entries(groups).map(([pId, rxs]) => {
      // Sort rxs by issuedAt descending
      const sortedRxs = [...rxs].sort(
        (a, b) => new Date(b.issuedAt).getTime() - new Date(a.issuedAt).getTime()
      );
      const name = sortedRxs[0]?.patientName ?? 'Unknown Patient';
      const lastVisited = sortedRxs[0]?.issuedAt ?? new Date().toISOString();

      return {
        patientId: pId,
        patientName: name,
        prescriptions: sortedRxs,
        lastVisited
      };
    });
  }, [prescriptions]);

  // Filter patients by search query
  const filteredPatients = useMemo(() => {
    const query = searchQuery.trim().toLowerCase();
    if (!query) return patientGroups;

    return patientGroups.filter((p) =>
      p.patientName.toLowerCase().includes(query)
    );
  }, [patientGroups, searchQuery]);

  // Find the selected patient detail
  const selectedPatient = useMemo(() => {
    if (!selectedPatientId) return null;
    return patientGroups.find((p) => p.patientId === selectedPatientId) || null;
  }, [patientGroups, selectedPatientId]);

  // Set default selected patient when list loads
  useEffect(() => {
    if (filteredPatients.length > 0 && !selectedPatientId) {
      setSelectedPatientId(filteredPatients[0].patientId);
    }
  }, [filteredPatients, selectedPatientId]);

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex flex-col gap-1.5">
        <p className="text-xs font-bold uppercase tracking-[0.35em] text-emerald-600">Clinical Records</p>
        <h2 className="text-2xl font-bold" style={{ color: 'var(--text-primary)' }}>My Patients</h2>
        <p className="text-sm" style={{ color: 'var(--text-secondary)' }}>
          Search past patients and review all history of prescriptions issued by you.
        </p>
      </div>

      <div className="grid gap-6 lg:grid-cols-[280px_1fr] xl:grid-cols-[320px_1fr]">
        
        {/* Left Column: Search & Patients List */}
        <div className="flex flex-col gap-4">
          {/* Search bar */}
          <div className="relative">
            <span className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-400">
              🔍
            </span>
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search patients by name..."
              className="dd-input pl-9 text-sm py-2.5"
            />
            {searchQuery && (
              <button
                type="button"
                onClick={() => setSearchQuery('')}
                className="absolute inset-y-0 right-0 pr-3 flex items-center text-slate-400 hover:text-slate-600 text-xs"
              >
                Clear
              </button>
            )}
          </div>

          {/* Patients List Box */}
          <div className="dd-card p-4 flex flex-col gap-2 min-h-[300px] max-h-[600px] overflow-y-auto">
            <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400 mb-1">
              Patient List ({filteredPatients.length})
            </p>

            {loading && (
              <div className="space-y-2 mt-2">
                {[1, 2, 3].map((i) => (
                  <div key={i} className="h-14 rounded-xl animate-pulse" style={{ backgroundColor: 'var(--bg-tertiary)' }} />
                ))}
              </div>
            )}

            {!loading && filteredPatients.length === 0 && (
              <div className="text-center py-10 text-xs text-slate-400">
                {searchQuery ? 'No matching patients found.' : 'No past patients records.'}
              </div>
            )}

            {!loading && filteredPatients.map((p) => {
              const isActive = selectedPatientId === p.patientId;
              const initials = p.patientName.split(' ').map(n => n[0]).join('').slice(0, 2).toUpperCase();
              return (
                <button
                  key={p.patientId}
                  type="button"
                  onClick={() => setSelectedPatientId(p.patientId)}
                  className={`w-full flex items-center gap-3 p-3 rounded-xl transition-all border text-left ${
                    isActive
                      ? 'bg-emerald-50 border-emerald-500 dark:bg-emerald-950/20'
                      : 'border-transparent hover:bg-slate-50 dark:hover:bg-slate-800/40'
                  }`}
                >
                  <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-emerald-100 text-sm font-bold text-emerald-700 dark:bg-emerald-950/60 dark:text-emerald-400">
                    {initials || 'P'}
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-bold truncate" style={{ color: isActive ? 'var(--emerald-600)' : 'var(--text-primary)' }}>
                      {p.patientName}
                    </p>
                    <p className="text-[10px] text-slate-400 mt-0.5">
                      Last Issued: {new Date(p.lastVisited).toLocaleDateString()}
                    </p>
                  </div>
                  <div className="text-[11px] font-extrabold bg-slate-100 dark:bg-slate-800 text-slate-500 dark:text-slate-400 px-2 py-0.5 rounded-full">
                    {p.prescriptions.length}
                  </div>
                </button>
              );
            })}
          </div>
        </div>

        {/* Right Column: Prescriptions History Details */}
        <div className="min-w-0">
          {selectedPatient ? (
            <div className="space-y-4">
              {/* Header card */}
              <div className="dd-card p-5">
                <div className="flex items-center gap-4">
                  <div className="h-12 w-12 rounded-2xl bg-emerald-100 text-emerald-700 flex items-center justify-center text-xl font-bold dark:bg-emerald-950/60 dark:text-emerald-400">
                    👤
                  </div>
                  <div>
                    <h3 className="text-lg font-bold" style={{ color: 'var(--text-primary)' }}>{selectedPatient.patientName}</h3>
                    <p className="text-xs" style={{ color: 'var(--text-secondary)' }}>
                      Total prescriptions: {selectedPatient.prescriptions.length} • Member since {new Date(selectedPatient.prescriptions[selectedPatient.prescriptions.length - 1].issuedAt).toLocaleDateString()}
                    </p>
                  </div>
                </div>
              </div>

              {/* Prescriptions stack */}
              <div className="space-y-4">
                {selectedPatient.prescriptions.map((rx) => (
                  <div key={rx._id} className="dd-card p-5 space-y-4 border-l-4 border-l-emerald-500">
                    <div className="flex flex-wrap items-center justify-between gap-3 pb-3 border-b" style={{ borderColor: 'var(--border-color)' }}>
                      <div>
                        <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">Diagnosis</span>
                        <p className="text-base font-bold mt-0.5" style={{ color: 'var(--text-primary)' }}>{rx.diagnosis}</p>
                      </div>
                      <div className="text-right">
                        <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">Issued On</span>
                        <p className="text-sm font-semibold mt-0.5" style={{ color: 'var(--text-secondary)' }}>
                          {new Date(rx.issuedAt).toLocaleString()}
                        </p>
                      </div>
                    </div>

                    {/* Chief complaints */}
                    {rx.chiefComplaints && (
                      <div>
                        <p className="text-xs font-bold text-slate-400 uppercase tracking-wider">Chief Complaints</p>
                        <p className="text-sm mt-1 leading-relaxed" style={{ color: 'var(--text-secondary)' }}>{rx.chiefComplaints}</p>
                      </div>
                    )}

                    {/* Medications list */}
                    <div>
                      <p className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-2">Medications ({rx.medications.length})</p>
                      <div className="overflow-x-auto rounded-xl border" style={{ borderColor: 'var(--border-color)' }}>
                        <table className="w-full text-left text-sm">
                          <thead className="text-xs text-slate-500 uppercase" style={{ backgroundColor: 'var(--bg-tertiary)' }}>
                            <tr>
                              <th className="px-4 py-2">Medicine</th>
                              <th className="px-4 py-2">Dosage</th>
                              <th className="px-4 py-2">Frequency</th>
                              <th className="px-4 py-2">Duration</th>
                              <th className="px-4 py-2">Instructions</th>
                            </tr>
                          </thead>
                          <tbody className="divide-y" style={{ borderColor: 'var(--border-color)', backgroundColor: 'var(--bg-secondary)' }}>
                            {rx.medications.map((med, idx) => (
                              <tr key={idx} className="hover:bg-slate-50/50 dark:hover:bg-slate-800/10">
                                <td className="px-4 py-3.5 font-bold" style={{ color: 'var(--text-primary)' }}>{med.name}</td>
                                <td className="px-4 py-3.5" style={{ color: 'var(--text-secondary)' }}>{med.dosage}</td>
                                <td className="px-4 py-3.5" style={{ color: 'var(--text-secondary)' }}>{med.frequency}</td>
                                <td className="px-4 py-3.5" style={{ color: 'var(--text-secondary)' }}>{med.duration}</td>
                                <td className="px-4 py-3.5 text-xs text-slate-500 italic">{med.instructions || '—'}</td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    </div>

                    {/* Advice / Follow up */}
                    {(rx.advice || rx.followUpDate) && (
                      <div className="grid gap-4 sm:grid-cols-2 pt-3 border-t" style={{ borderColor: 'var(--border-color)' }}>
                        {rx.advice && (
                          <div>
                            <p className="text-xs font-bold text-slate-400 uppercase tracking-wider">Clinical Advice</p>
                            <p className="text-xs mt-1 leading-relaxed" style={{ color: 'var(--text-secondary)' }}>{rx.advice}</p>
                          </div>
                        )}
                        {rx.followUpDate && (
                          <div>
                            <p className="text-xs font-bold text-slate-400 uppercase tracking-wider">Follow-up Date</p>
                            <p className="text-sm font-semibold mt-1 text-emerald-600 dark:text-emerald-400">
                              📅 {new Date(rx.followUpDate).toLocaleDateString()}
                            </p>
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </div>
          ) : (
            <div className="dd-card py-20 text-center">
              <span className="text-5xl">📋</span>
              <h3 className="text-lg font-bold mt-4" style={{ color: 'var(--text-primary)' }}>Select a Patient</h3>
              <p className="text-sm mt-1.5 max-w-sm mx-auto" style={{ color: 'var(--text-secondary)' }}>
                Choose a patient from the list on the left to view their detailed medical prescriptions and history.
              </p>
            </div>
          )}
        </div>

      </div>
    </div>
  );
}
