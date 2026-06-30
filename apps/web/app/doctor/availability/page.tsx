'use client';

import { useEffect, useState } from 'react';

import { useToast } from '../../auth/toast-provider';
import { fetchDoctorProfile, updateDoctorAvailability, type DoctorProfile } from '../api';

const DAYS = ['monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday'];

export default function DoctorAvailabilityPage() {
  const { showToast } = useToast();
  const [profile, setProfile] = useState<DoctorProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    void fetchDoctorProfile()
      .then(setProfile)
      .catch((err: unknown) => showToast(err instanceof Error ? err.message : 'Unable to load availability.', 'error'))
      .finally(() => setLoading(false));
  }, [showToast]);

  const availability = profile?.availability;

  const toggleDay = (day: string) => {
    if (!availability) return;
    const workingDays = availability.workingDays.includes(day)
      ? availability.workingDays.filter((d) => d !== day)
      : [...availability.workingDays, day];
    setProfile({ ...profile!, availability: { ...availability, workingDays } });
  };

  const updateSlot = (field: 'morningSlot' | 'eveningSlot' | 'breakTime', key: 'start' | 'end', value: string) => {
    if (!availability) return;
    setProfile({
      ...profile!,
      availability: { ...availability, [field]: { ...availability[field], [key]: value } }
    });
  };

  const save = async () => {
    if (!availability) return;
    setSaving(true);
    try {
      const updated = await updateDoctorAvailability(availability);
      setProfile(updated);
      showToast('Availability updated.', 'success');
    } catch (err: unknown) {
      showToast(err instanceof Error ? err.message : 'Unable to save availability.', 'error');
    } finally {
      setSaving(false);
    }
  };

  if (loading || !availability) {
    return <div className="dd-card text-center p-8">Loading availability...</div>;
  }

  return (
    <div className="dd-card">
      <h2 className="text-2xl font-bold" style={{ color: 'var(--text-primary)' }}>Availability Settings</h2>
      <p className="mt-2 text-sm" style={{ color: 'var(--text-secondary)' }}>Manage working days, slots, and vacation mode.</p>

      <div className="mt-6 space-y-6">
        <label className="flex items-center gap-3 cursor-pointer">
          <input
            type="checkbox"
            checked={availability.isAvailable}
            onChange={(e) => setProfile({ ...profile!, availability: { ...availability, isAvailable: e.target.checked } })}
            className="h-4.5 w-4.5 rounded border-gray-300 text-emerald-600 focus:ring-emerald-500"
          />
          <span className="text-sm font-medium" style={{ color: 'var(--text-primary)' }}>Currently available for appointments</span>
        </label>

        <label className="flex items-center gap-3 cursor-pointer">
          <input
            type="checkbox"
            checked={availability.vacationMode}
            onChange={(e) => setProfile({ ...profile!, availability: { ...availability, vacationMode: e.target.checked } })}
            className="h-4.5 w-4.5 rounded border-gray-300 text-emerald-600 focus:ring-emerald-500"
          />
          <span className="text-sm font-medium" style={{ color: 'var(--text-primary)' }}>Vacation mode</span>
        </label>

        <div>
          <p className="mb-3 text-sm font-bold" style={{ color: 'var(--text-primary)' }}>Working Days</p>
          <div className="flex flex-wrap gap-2">
            {DAYS.map((day) => (
              <button
                key={day}
                type="button"
                onClick={() => toggleDay(day)}
                className={`rounded-full px-4 py-2 text-xs font-semibold capitalize transition-all ${
                  availability.workingDays.includes(day)
                    ? 'bg-emerald-600 text-white shadow-emerald-sm'
                    : 'border border-slate-300 hover:bg-slate-50 text-slate-700 dark:border-slate-700 dark:text-slate-300 dark:hover:bg-slate-800'
                }`}
              >
                {day}
              </button>
            ))}
          </div>
        </div>

        {(['morningSlot', 'eveningSlot', 'breakTime'] as const).map((slot) => (
          <div key={slot} className="grid gap-4 sm:grid-cols-2 border-t pt-4" style={{ borderColor: 'var(--border-color)' }}>
            <p className="sm:col-span-2 text-sm font-bold capitalize" style={{ color: 'var(--text-primary)' }}>
              {slot.replace('Slot', ' slot').replace('breakTime', 'Break time')}
            </p>
            <div>
              <label className="dd-label">Start Time</label>
              <input
                type="time"
                value={availability[slot].start}
                onChange={(e) => updateSlot(slot, 'start', e.target.value)}
                className="dd-input"
              />
            </div>
            <div>
              <label className="dd-label">End Time</label>
              <input
                type="time"
                value={availability[slot].end}
                onChange={(e) => updateSlot(slot, 'end', e.target.value)}
                className="dd-input"
              />
            </div>
          </div>
        ))}

        <div className="border-t pt-4" style={{ borderColor: 'var(--border-color)' }}>
          <label className="dd-label">Maximum appointments per day</label>
          <input
            type="number"
            min={1}
            max={50}
            value={availability.maxAppointmentsPerDay}
            onChange={(e) =>
              setProfile({
                ...profile!,
                availability: { ...availability, maxAppointmentsPerDay: Number(e.target.value) }
              })
            }
            className="dd-input max-w-xs"
          />
        </div>

        <div className="border-t pt-4" style={{ borderColor: 'var(--border-color)' }}>
          <button type="button" onClick={save} disabled={saving} className="btn-primary py-3 px-6 text-sm font-semibold">
            {saving ? 'Saving...' : 'Save Availability'}
          </button>
        </div>
      </div>
    </div>
  );
}
