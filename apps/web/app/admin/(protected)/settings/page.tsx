'use client';

import { useEffect, useState } from 'react';

import { useToast } from '../../../auth/toast-provider';
import { fetchSettings, updateSettings, type PlatformSettings } from '../../api';

export default function AdminSettingsPage() {
  const { showToast } = useToast();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState<Omit<PlatformSettings, '_id'>>({
    platformCommission: 10,
    maxServiceRadius: 50,
    defaultConsultationFee: 300,
    maintenanceMode: false
  });

  useEffect(() => {
    void fetchSettings()
      .then((settings) => setForm({
        platformCommission: settings.platformCommission,
        maxServiceRadius: settings.maxServiceRadius,
        defaultConsultationFee: settings.defaultConsultationFee,
        maintenanceMode: settings.maintenanceMode
      }))
      .catch((err: unknown) => showToast(err instanceof Error ? err.message : 'Failed to load settings', 'error'))
      .finally(() => setLoading(false));
  }, [showToast]);

  const handleSave = async () => {
    setSaving(true);
    try {
      await updateSettings(form);
      showToast('Settings saved', 'success');
    } catch (err: unknown) {
      showToast(err instanceof Error ? err.message : 'Save failed', 'error');
    } finally {
      setSaving(false);
    }
  };

  if (loading) return <p className="text-slate-500">Loading settings…</p>;

  return (
    <section className="max-w-xl space-y-6">
      <div>
        <h2 className="text-2xl font-semibold">Platform settings</h2>
        <p className="mt-1 text-slate-600">Configure global platform defaults.</p>
      </div>

      <div className="space-y-4">
        <div>
          <label className="mb-2 block text-sm font-medium text-slate-700">Platform commission (%)</label>
          <input type="number" min={0} max={100} value={form.platformCommission} onChange={(e) => setForm({ ...form, platformCommission: Number(e.target.value) })} className="w-full rounded-2xl border border-slate-300 px-4 py-3 text-sm" />
        </div>
        <div>
          <label className="mb-2 block text-sm font-medium text-slate-700">Maximum service radius (km)</label>
          <input type="number" min={1} value={form.maxServiceRadius} onChange={(e) => setForm({ ...form, maxServiceRadius: Number(e.target.value) })} className="w-full rounded-2xl border border-slate-300 px-4 py-3 text-sm" />
        </div>
        <div>
          <label className="mb-2 block text-sm font-medium text-slate-700">Default consultation fee (₹)</label>
          <input type="number" min={0} value={form.defaultConsultationFee} onChange={(e) => setForm({ ...form, defaultConsultationFee: Number(e.target.value) })} className="w-full rounded-2xl border border-slate-300 px-4 py-3 text-sm" />
        </div>
        <label className="flex items-center gap-3 rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm">
          <input type="checkbox" checked={form.maintenanceMode} onChange={(e) => setForm({ ...form, maintenanceMode: e.target.checked })} className="h-4 w-4 rounded border-slate-300 text-emerald-600" />
          <span>Maintenance mode</span>
        </label>
      </div>

      <button type="button" disabled={saving} onClick={() => void handleSave()} className="rounded-2xl bg-emerald-600 px-6 py-3 text-sm font-semibold text-white disabled:opacity-60">
        {saving ? 'Saving…' : 'Save settings'}
      </button>
    </section>
  );
}
