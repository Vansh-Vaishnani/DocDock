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
    return <div className="rounded-3xl border border-slate-200 bg-white p-8 text-slate-600 shadow-sm">Loading availability...</div>;
  }

  return (
    <section className="rounded-[28px] border border-slate-200 bg-white p-6 shadow-sm">
      <h2 className="text-2xl font-semibold">Availability</h2>
      <p className="mt-2 text-slate-600">Manage working days, slots, and vacation mode.</p>

      <div className="mt-6 space-y-6">
        <label className="flex items-center gap-3">
          <input
            type="checkbox"
            checked={availability.isAvailable}
            onChange={(e) => setProfile({ ...profile!, availability: { ...availability, isAvailable: e.target.checked } })}
            className="h-4 w-4"
          />
          <span className="text-sm font-medium">Currently available for appointments</span>
        </label>

        <label className="flex items-center gap-3">
          <input
            type="checkbox"
            checked={availability.vacationMode}
            onChange={(e) => setProfile({ ...profile!, availability: { ...availability, vacationMode: e.target.checked } })}
            className="h-4 w-4"
          />
          <span className="text-sm font-medium">Vacation mode</span>
        </label>

        <div>
          <p className="mb-3 text-sm font-medium text-slate-700">Working days</p>
          <div className="flex flex-wrap gap-2">
            {DAYS.map((day) => (
              <button
                key={day}
                type="button"
                onClick={() => toggleDay(day)}
                className={`rounded-full px-4 py-2 text-sm font-medium capitalize ${
                  availability.workingDays.includes(day) ? 'bg-emerald-600 text-white' : 'border border-slate-300 text-slate-700'
                }`}
              >
                {day}
              </button>
            ))}
          </div>
        </div>

        {(['morningSlot', 'eveningSlot', 'breakTime'] as const).map((slot) => (
          <div key={slot} className="grid gap-4 sm:grid-cols-2">
            <p className="sm:col-span-2 text-sm font-medium capitalize text-slate-700">{slot.replace('Slot', ' slot').replace('breakTime', 'Break time')}</p>
            <input
              type="time"
              value={availability[slot].start}
              onChange={(e) => updateSlot(slot, 'start', e.target.value)}
              className="rounded-2xl border border-slate-300 px-4 py-3"
            />
            <input
              type="time"
              value={availability[slot].end}
              onChange={(e) => updateSlot(slot, 'end', e.target.value)}
              className="rounded-2xl border border-slate-300 px-4 py-3"
            />
          </div>
        ))}

        <div>
          <label className="mb-2 block text-sm font-medium">Maximum appointments per day</label>
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
            className="w-full max-w-xs rounded-2xl border border-slate-300 px-4 py-3"
          />
        </div>

        <button type="button" onClick={save} disabled={saving} className="rounded-full bg-slate-950 px-5 py-3 text-sm font-semibold text-white disabled:opacity-70">
          {saving ? 'Saving...' : 'Save availability'}
        </button>
      </div>
    </section>
  );
}
