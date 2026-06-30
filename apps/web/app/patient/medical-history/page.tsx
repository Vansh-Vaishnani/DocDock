'use client';

import { useEffect, useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';

import { useToast } from '../../auth/toast-provider';
import { fetchPatientProfile, updateMedicalHistory, type MedicalHistoryEntry } from '../api';

const schema = z.object({
  note: z.string().trim().min(3, 'Note must be at least 3 characters')
});

type FormValues = z.infer<typeof schema>;

export default function PatientMedicalHistoryPage() {
  const { showToast } = useToast();
  const [entries, setEntries] = useState<MedicalHistoryEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [editingIndex, setEditingIndex] = useState<number | null>(null);
  const [editNote, setEditNote] = useState('');

  const { register, handleSubmit, reset, formState: { errors } } = useForm<FormValues>({
    resolver: zodResolver(schema)
  });

  const loadHistory = async () => {
    setLoading(true);
    try {
      const profile = await fetchPatientProfile();
      setEntries(profile.medicalHistory);
      setError(null);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Unable to load medical history.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void loadHistory();
  }, []);

  const saveEntries = async (nextEntries: Array<{ note: string; createdAt?: string }>, successMessage: string) => {
    setSaving(true);
    try {
      const profile = await updateMedicalHistory(nextEntries);
      setEntries(profile.medicalHistory);
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

  const formatDate = (dateStr: string) => {
    try {
      return new Date(dateStr).toLocaleDateString(undefined, { year: 'numeric', month: 'short', day: 'numeric' });
    } catch {
      return dateStr;
    }
  };

  return (
    <section className="grid gap-6 lg:grid-cols-[1fr_0.9fr]">
      <div className="dd-card">
        <h2 className="text-xl font-bold" style={{ color: 'var(--text-primary)' }}>Medical history</h2>
        <p className="mt-1 text-sm" style={{ color: 'var(--text-secondary)' }}>Record diagnoses, procedures, and clinical notes for your care team.</p>

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
              placeholder="e.g. Hypertension diagnosed in 2019, ongoing treatment..."
            />
            {errors.note && <p className="mt-1.5 text-xs text-rose-600">{errors.note.message}</p>}
          </div>
          <button
            type="submit"
            disabled={saving}
            className="btn-primary w-full"
          >
            {saving ? 'Saving...' : 'Add entry'}
          </button>
        </form>
      </div>

      <div className="dd-card">
        <h3 className="text-lg font-bold" style={{ color: 'var(--text-primary)' }}>Your records</h3>

        {loading && (
          <div className="mt-4 space-y-3">
            <div className="h-10 skeleton rounded-xl" />
          </div>
        )}

        {!loading && entries.length === 0 && (
          <div className="mt-4 rounded-xl border border-dashed p-8 text-center text-sm" style={{ borderColor: 'var(--border-color)', color: 'var(--text-muted)' }}>
            No medical history entries yet.
          </div>
        )}

        {!loading && entries.length > 0 && (
          <div className="mt-4 space-y-3">
            {entries.map((entry, index) => (
              <div key={entry._id || `${entry.note}-${index}`} className="rounded-xl border p-4" style={{ borderColor: 'var(--border-color)' }}>
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
                      <button type="button" onClick={() => saveEdit(index)} disabled={saving} className="btn-primary text-xs px-3 py-1.5 disabled:opacity-60">
                        Save
                      </button>
                      <button type="button" onClick={cancelEdit} className="btn-secondary text-xs px-3 py-1.5">
                        Cancel
                      </button>
                    </>
                  ) : (
                    <>
                      <button type="button" onClick={() => startEdit(index)} className="btn-secondary text-xs px-3 py-1.5">
                        Edit
                      </button>
                      <button type="button" onClick={() => handleDelete(index)} disabled={saving} className="btn-secondary text-xs px-3 py-1.5 text-rose-600 border-rose-200 dark:border-rose-900/50 dark:text-rose-400 disabled:opacity-60">
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
    </section>
  );
}
