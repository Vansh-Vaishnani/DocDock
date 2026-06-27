'use client';

import { useEffect, useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';

import { useToast } from '../../auth/toast-provider';
import { fetchPatientProfile, updateAllergies } from '../api';

const schema = z.object({
  allergy: z.string().trim().min(2, 'Allergy name must be at least 2 characters')
});

type FormValues = z.infer<typeof schema>;

export default function PatientAllergiesPage() {
  const { showToast } = useToast();
  const [allergies, setAllergies] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [editingIndex, setEditingIndex] = useState<number | null>(null);
  const [editValue, setEditValue] = useState('');

  const { register, handleSubmit, reset, formState: { errors } } = useForm<FormValues>({
    resolver: zodResolver(schema)
  });

  const loadAllergies = async () => {
    setLoading(true);
    try {
      const profile = await fetchPatientProfile();
      setAllergies(profile.allergies);
      setError(null);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Unable to load allergies.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void loadAllergies();
  }, []);

  const saveAllergies = async (nextAllergies: string[], successMessage: string) => {
    setSaving(true);
    try {
      const profile = await updateAllergies(nextAllergies);
      setAllergies(profile.allergies);
      showToast(successMessage, 'success');
    } catch (err: unknown) {
      showToast(err instanceof Error ? err.message : 'Unable to save allergies.', 'error');
    } finally {
      setSaving(false);
    }
  };

  const onSubmit = async (values: FormValues) => {
    const normalized = values.allergy.trim();
    if (allergies.some((a) => a.toLowerCase() === normalized.toLowerCase())) {
      showToast('This allergy is already recorded.', 'error');
      return;
    }
    await saveAllergies([...allergies, normalized], 'Allergy added.');
    reset();
  };

  const handleDelete = async (index: number) => {
    await saveAllergies(allergies.filter((_, i) => i !== index), 'Allergy removed.');
  };

  const startEdit = (index: number) => {
    setEditingIndex(index);
    setEditValue(allergies[index]);
  };

  const cancelEdit = () => {
    setEditingIndex(null);
    setEditValue('');
  };

  const saveEdit = async (index: number) => {
    const normalized = editValue.trim();
    if (!normalized) {
      showToast('Allergy name cannot be empty.', 'error');
      return;
    }
    if (allergies.some((a, i) => i !== index && a.toLowerCase() === normalized.toLowerCase())) {
      showToast('This allergy is already recorded.', 'error');
      return;
    }
    const next = allergies.map((a, i) => (i === index ? normalized : a));
    await saveAllergies(next, 'Allergy updated.');
    cancelEdit();
  };

  return (
    <section className="grid gap-6 lg:grid-cols-[1fr_0.9fr]">
      <div className="rounded-[28px] border border-slate-200 bg-white p-6 shadow-sm">
        <h2 className="text-2xl font-semibold">Allergy management</h2>
        <p className="mt-2 text-slate-600">Track allergies and sensitivities so doctors can provide safer care.</p>

        {error && <div className="mt-5 rounded-2xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">{error}</div>}

        <form className="mt-6 space-y-4" onSubmit={handleSubmit(onSubmit)}>
          <div>
            <label className="mb-2 block text-sm font-medium text-slate-700">Add allergy</label>
            <input
              {...register('allergy')}
              className="w-full rounded-2xl border border-slate-300 px-4 py-3 outline-none focus:border-cyan-500"
              placeholder="e.g. Penicillin, Peanuts, Latex..."
            />
            {errors.allergy && <p className="mt-2 text-sm text-rose-600">{errors.allergy.message}</p>}
          </div>
          <button
            type="submit"
            disabled={saving}
            className="rounded-full bg-slate-950 px-5 py-3 text-sm font-semibold text-white transition hover:bg-slate-800 disabled:opacity-70"
          >
            {saving ? 'Saving...' : 'Add allergy'}
          </button>
        </form>
      </div>

      <div className="rounded-[28px] border border-slate-200 bg-white p-6 shadow-sm">
        <h3 className="text-xl font-semibold">Recorded allergies</h3>

        {loading && <div className="mt-5 rounded-2xl bg-slate-100 p-4 text-sm text-slate-600">Loading allergies...</div>}

        {!loading && allergies.length === 0 && (
          <div className="mt-5 rounded-2xl border border-dashed border-slate-300 p-6 text-center text-sm text-slate-600">
            No recorded allergies yet.
          </div>
        )}

        {!loading && allergies.length > 0 && (
          <div className="mt-5 space-y-3">
            {allergies.map((allergy, index) => (
              <div key={`${allergy}-${index}`} className="flex items-center justify-between gap-3 rounded-2xl border border-slate-200 p-4">
                {editingIndex === index ? (
                  <input
                    value={editValue}
                    onChange={(e) => setEditValue(e.target.value)}
                    className="min-w-0 flex-1 rounded-xl border border-slate-300 px-3 py-2 text-sm outline-none focus:border-cyan-500"
                  />
                ) : (
                  <span className="font-medium text-slate-900">{allergy}</span>
                )}
                <div className="flex shrink-0 gap-2">
                  {editingIndex === index ? (
                    <>
                      <button type="button" onClick={() => saveEdit(index)} disabled={saving} className="rounded-full bg-slate-950 px-3 py-1.5 text-xs font-semibold text-white disabled:opacity-60">
                        Save
                      </button>
                      <button type="button" onClick={cancelEdit} className="rounded-full border border-slate-300 px-3 py-1.5 text-xs font-semibold text-slate-700">
                        Cancel
                      </button>
                    </>
                  ) : (
                    <>
                      <button type="button" onClick={() => startEdit(index)} className="rounded-full border border-slate-300 px-3 py-1.5 text-xs font-semibold text-slate-700">
                        Edit
                      </button>
                      <button type="button" onClick={() => handleDelete(index)} disabled={saving} className="rounded-full border border-rose-300 px-3 py-1.5 text-xs font-semibold text-rose-700 disabled:opacity-60">
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
