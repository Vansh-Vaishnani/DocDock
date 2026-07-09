'use client';

import { useEffect, useRef, useState } from 'react';
import { useToast } from '../../auth/toast-provider';
import { fetchDoctorProfile, updateDoctorAvailability, updateDoctorProfile, type DoctorProfile, type DaySchedule } from '../api';

const DAYS = ['monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday'] as const;
const SLOT_DURATIONS = [15, 30, 45, 60] as const;

const DEFAULT_DAY_SCHEDULE: DaySchedule = { enabled: false, slots: [{ start: '09:00', end: '17:00' }] };

function initPerDaySchedule(existing?: Record<string, DaySchedule>): Record<string, DaySchedule> {
  const base: Record<string, DaySchedule> = {};
  for (const day of DAYS) {
    base[day] = existing?.[day] || DEFAULT_DAY_SCHEDULE;
    if (!base[day].slots || base[day].slots.length === 0) {
      base[day] = { ...base[day], slots: [{ start: '09:00', end: '17:00' }] };
    }
  }
  return base;
}

export default function DoctorAvailabilityPage() {
  const { showToast } = useToast();
  const [profile, setProfile] = useState<DoctorProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [perDaySchedule, setPerDaySchedule] = useState<Record<string, DaySchedule>>({});
  const [slotDuration, setSlotDuration] = useState(30);
  const [customDuration, setCustomDuration] = useState('');
  const [useCustomDuration, setUseCustomDuration] = useState(false);

  // Map state
  const mapRef = useRef<HTMLDivElement>(null);
  const leafletMapRef = useRef<any>(null);
  const markerRef = useRef<any>(null);
  const [clinicCoords, setClinicCoords] = useState<[number, number] | null>(null);
  const [mapLoaded, setMapLoaded] = useState(false);

  useEffect(() => {
    void fetchDoctorProfile()
      .then((p) => {
        setProfile(p);
        const av = p.availability;
        setPerDaySchedule(initPerDaySchedule((av as any)?.perDaySchedule));
        const dur = (av as any)?.slotDuration ?? 30;
        if ([15, 30, 45, 60].includes(dur)) {
          setSlotDuration(dur);
          setUseCustomDuration(false);
        } else {
          setUseCustomDuration(true);
          setCustomDuration(String(dur));
        }
        if (p.location?.coordinates) {
          setClinicCoords([p.location.coordinates[1], p.location.coordinates[0]]);
        }
      })
      .catch((err: unknown) => showToast(err instanceof Error ? err.message : 'Unable to load availability.', 'error'))
      .finally(() => setLoading(false));
  }, [showToast]);

  // Load Leaflet dynamically
  useEffect(() => {
    if (typeof window === 'undefined' || mapLoaded) return;
    if (document.querySelector('link[href*="leaflet"]')) { setMapLoaded(!!(window as any).L); return; }
    const link = document.createElement('link');
    link.rel = 'stylesheet';
    link.href = 'https://unpkg.com/leaflet@1.9.4/dist/leaflet.css';
    document.head.appendChild(link);
    const script = document.createElement('script');
    script.src = 'https://unpkg.com/leaflet@1.9.4/dist/leaflet.js';
    script.onload = () => setMapLoaded(true);
    document.head.appendChild(script);
  }, [mapLoaded]);

  useEffect(() => {
    if (!mapLoaded || !mapRef.current || leafletMapRef.current) return;
    const L = (window as any).L;
    if (!L) return;

    const defaultCoords: [number, number] = clinicCoords || [20.5937, 78.9629];
    const map = L.map(mapRef.current).setView(defaultCoords, clinicCoords ? 13 : 5);
    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
      attribution: '&copy; OpenStreetMap contributors'
    }).addTo(map);

    if (clinicCoords) {
      markerRef.current = L.marker(clinicCoords, { draggable: true }).addTo(map);
      markerRef.current.on('dragend', (e: any) => {
        const pos = e.target.getLatLng();
        setClinicCoords([pos.lat, pos.lng]);
      });
    }

    map.on('click', (e: any) => {
      const { lat, lng } = e.latlng;
      setClinicCoords([lat, lng]);
      if (markerRef.current) {
        markerRef.current.setLatLng([lat, lng]);
      } else {
        markerRef.current = L.marker([lat, lng], { draggable: true }).addTo(map);
        markerRef.current.on('dragend', (ev: any) => {
          const pos = ev.target.getLatLng();
          setClinicCoords([pos.lat, pos.lng]);
        });
      }
    });

    leafletMapRef.current = map;
  }, [mapLoaded, clinicCoords]);

  const toggleVacation = () => {
    if (!profile) return;
    setProfile({ ...profile, availability: { ...profile.availability, vacationMode: !profile.availability.vacationMode } });
  };

  const toggleAvailable = () => {
    if (!profile) return;
    setProfile({ ...profile, availability: { ...profile.availability, isAvailable: !profile.availability.isAvailable } });
  };

  const toggleDay = (day: string) => {
    setPerDaySchedule((prev) => ({ ...prev, [day]: { ...prev[day], enabled: !prev[day]?.enabled } }));
  };

  const addSlot = (day: string) => {
    setPerDaySchedule((prev) => ({
      ...prev,
      [day]: { ...prev[day], slots: [...(prev[day]?.slots || []), { start: '09:00', end: '17:00' }] }
    }));
  };

  const removeSlot = (day: string, idx: number) => {
    setPerDaySchedule((prev) => ({
      ...prev,
      [day]: { ...prev[day], slots: prev[day].slots.filter((_, i) => i !== idx) }
    }));
  };

  const updateSlot = (day: string, idx: number, field: 'start' | 'end', value: string) => {
    setPerDaySchedule((prev) => ({
      ...prev,
      [day]: {
        ...prev[day],
        slots: prev[day].slots.map((s, i) => (i === idx ? { ...s, [field]: value } : s))
      }
    }));
  };

  const save = async () => {
    if (!profile) return;
    setSaving(true);
    try {
      const finalDuration = useCustomDuration ? (Number(customDuration) || 30) : slotDuration;
      const updated = await updateDoctorAvailability({
        ...profile.availability,
        perDaySchedule,
        slotDuration: finalDuration
      } as any);
      setProfile(updated);
      if (clinicCoords) {
        await updateDoctorProfile({ location: { type: 'Point', coordinates: [clinicCoords[1], clinicCoords[0]] } });
      }
      showToast('Availability saved successfully.', 'success');
    } catch (err: unknown) {
      showToast(err instanceof Error ? err.message : 'Unable to save availability.', 'error');
    } finally {
      setSaving(false);
    }
  };

  if (loading || !profile) {
    return (
      <div className="dd-card text-center p-8">
        <div className="mx-auto mb-4 h-8 w-8 animate-spin rounded-full border-4 border-emerald-600 border-t-transparent" />
        <p style={{ color: 'var(--text-secondary)' }}>Loading availability...</p>
      </div>
    );
  }

  const av = profile.availability;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="dd-card">
        <h2 className="text-2xl font-bold" style={{ color: 'var(--text-primary)' }}>Availability Settings</h2>
        <p className="mt-2 text-sm" style={{ color: 'var(--text-secondary)' }}>
          Configure your weekly schedule, slot duration, clinic location, and vacation mode.
        </p>
      </div>

      {/* Vacation Mode Banner */}
      {av.vacationMode && (
        <div className="rounded-2xl border border-amber-300 bg-amber-50 dark:border-amber-800/50 dark:bg-amber-950/20 p-5 flex flex-wrap items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <span className="text-2xl">🏖️</span>
            <div>
              <p className="font-semibold text-amber-800 dark:text-amber-400">Vacation Mode Active</p>
              <p className="text-xs text-amber-700 dark:text-amber-500 mt-0.5">You are currently unavailable. Patients cannot book appointments.</p>
            </div>
          </div>
          <button type="button" onClick={toggleVacation} className="rounded-full bg-amber-600 text-white text-xs font-semibold px-4 py-2 hover:bg-amber-700">
            Disable Vacation
          </button>
        </div>
      )}

      {/* Quick Toggles */}
      <div className="dd-card grid gap-4 sm:grid-cols-2">
        <label className="flex items-center gap-3 cursor-pointer p-4 rounded-xl border transition-all hover:border-emerald-500" style={{ borderColor: 'var(--border-color)' }}>
          <div
            onClick={toggleAvailable}
            className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors cursor-pointer ${av.isAvailable ? 'bg-emerald-600' : 'bg-slate-300 dark:bg-slate-600'}`}
          >
            <span className={`inline-block h-4 w-4 transform rounded-full bg-white shadow transition-transform ${av.isAvailable ? 'translate-x-6' : 'translate-x-1'}`} />
          </div>
          <div>
            <p className="text-sm font-semibold" style={{ color: 'var(--text-primary)' }}>Accepting Appointments</p>
            <p className="text-xs" style={{ color: 'var(--text-muted)' }}>{av.isAvailable ? 'Patients can book with you' : 'You appear offline'}</p>
          </div>
        </label>

        <label className="flex items-center gap-3 cursor-pointer p-4 rounded-xl border transition-all hover:border-amber-400" style={{ borderColor: 'var(--border-color)' }}>
          <div
            onClick={toggleVacation}
            className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors cursor-pointer ${av.vacationMode ? 'bg-amber-500' : 'bg-slate-300 dark:bg-slate-600'}`}
          >
            <span className={`inline-block h-4 w-4 transform rounded-full bg-white shadow transition-transform ${av.vacationMode ? 'translate-x-6' : 'translate-x-1'}`} />
          </div>
          <div>
            <p className="text-sm font-semibold" style={{ color: 'var(--text-primary)' }}>Vacation Mode</p>
            <p className="text-xs" style={{ color: 'var(--text-muted)' }}>{av.vacationMode ? 'On holiday — bookings hidden' : 'Not on vacation'}</p>
          </div>
        </label>
      </div>

      {/* Slot Duration */}
      <div className="dd-card">
        <h3 className="text-base font-bold mb-1" style={{ color: 'var(--text-primary)' }}>Appointment Slot Duration</h3>
        <p className="text-xs mb-4" style={{ color: 'var(--text-secondary)' }}>How long is each appointment slot?</p>
        <div className="flex flex-wrap gap-3">
          {SLOT_DURATIONS.map((d) => (
            <button
              key={d}
              type="button"
              onClick={() => { setSlotDuration(d); setUseCustomDuration(false); }}
              className={`rounded-full px-5 py-2 text-sm font-semibold transition-all ${
                !useCustomDuration && slotDuration === d
                  ? 'bg-emerald-600 text-white shadow'
                  : 'border border-slate-300 text-slate-700 hover:bg-slate-50 dark:border-slate-700 dark:text-slate-300 dark:hover:bg-slate-800'
              }`}
            >
              {d} min
            </button>
          ))}
          <button
            type="button"
            onClick={() => setUseCustomDuration(true)}
            className={`rounded-full px-5 py-2 text-sm font-semibold transition-all ${
              useCustomDuration
                ? 'bg-emerald-600 text-white shadow'
                : 'border border-slate-300 text-slate-700 hover:bg-slate-50 dark:border-slate-700 dark:text-slate-300 dark:hover:bg-slate-800'
            }`}
          >
            Custom
          </button>
        </div>
        {useCustomDuration && (
          <div className="mt-4 flex items-center gap-3">
            <input
              type="number"
              min={5}
              max={240}
              value={customDuration}
              onChange={(e) => setCustomDuration(e.target.value)}
              placeholder="e.g. 20"
              className="dd-input max-w-[160px]"
            />
            <span className="text-sm" style={{ color: 'var(--text-secondary)' }}>minutes per slot</span>
          </div>
        )}
      </div>

      {/* Per-Day Schedule */}
      <div className="dd-card">
        <h3 className="text-base font-bold mb-1" style={{ color: 'var(--text-primary)' }}>Weekly Schedule</h3>
        <p className="text-xs mb-4" style={{ color: 'var(--text-secondary)' }}>Enable days and add your working intervals with optional breaks.</p>
        <div className="space-y-3">
          {DAYS.map((day) => {
            const ds = perDaySchedule[day] || { enabled: false, slots: [{ start: '09:00', end: '17:00' }] };
            return (
              <div key={day} className={`rounded-xl border p-4 transition-all ${ds.enabled ? 'border-emerald-400 dark:border-emerald-700' : ''}`} style={{ borderColor: ds.enabled ? undefined : 'var(--border-color)' }}>
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div
                      onClick={() => toggleDay(day)}
                      className={`relative inline-flex h-5 w-10 items-center rounded-full cursor-pointer transition-colors ${ds.enabled ? 'bg-emerald-600' : 'bg-slate-300 dark:bg-slate-600'}`}
                    >
                      <span className={`inline-block h-3.5 w-3.5 transform rounded-full bg-white shadow transition-transform ${ds.enabled ? 'translate-x-[22px]' : 'translate-x-[3px]'}`} />
                    </div>
                    <span className="text-sm font-semibold capitalize" style={{ color: 'var(--text-primary)' }}>{day}</span>
                    {!ds.enabled && <span className="text-xs" style={{ color: 'var(--text-muted)' }}>Day off</span>}
                  </div>
                  {ds.enabled && (
                    <button type="button" onClick={() => addSlot(day)} className="text-xs font-semibold text-emerald-600 hover:text-emerald-700">
                      + Add Interval
                    </button>
                  )}
                </div>
                {ds.enabled && (
                  <div className="mt-3 space-y-2">
                    {ds.slots.map((slot, idx) => (
                      <div key={idx} className="flex flex-wrap items-center gap-2">
                        <input
                          type="time"
                          value={slot.start}
                          onChange={(e) => updateSlot(day, idx, 'start', e.target.value)}
                          className="dd-input !py-1.5 !px-3 w-32 text-sm"
                        />
                        <span className="text-xs" style={{ color: 'var(--text-muted)' }}>to</span>
                        <input
                          type="time"
                          value={slot.end}
                          onChange={(e) => updateSlot(day, idx, 'end', e.target.value)}
                          className="dd-input !py-1.5 !px-3 w-32 text-sm"
                        />
                        {ds.slots.length > 1 && (
                          <button type="button" onClick={() => removeSlot(day, idx)} className="text-xs text-rose-500 hover:text-rose-700 font-semibold">
                            Remove
                          </button>
                        )}
                      </div>
                    ))}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>

      {/* Clinic Location Map */}
      <div className="dd-card">
        <h3 className="text-base font-bold mb-1" style={{ color: 'var(--text-primary)' }}>Clinic Location</h3>
        <p className="text-xs mb-4" style={{ color: 'var(--text-secondary)' }}>
          Click on the map or drag the pin to set your clinic&apos;s exact location.
        </p>
        {clinicCoords && (
          <div className="mb-3 rounded-lg bg-emerald-50 dark:bg-emerald-950/20 border border-emerald-200 dark:border-emerald-900/50 px-4 py-2 text-xs font-mono text-emerald-800 dark:text-emerald-400">
            📍 Lat: {clinicCoords[0].toFixed(6)}, Lng: {clinicCoords[1].toFixed(6)}
          </div>
        )}
        <div
          ref={mapRef}
          style={{ height: '360px', borderColor: 'var(--border-color)' }}
          className="w-full rounded-2xl overflow-hidden border"
        />
        {!mapLoaded && (
          <div className="flex items-center justify-center h-20 gap-2">
            <div className="h-5 w-5 animate-spin rounded-full border-4 border-emerald-600 border-t-transparent" />
            <span className="text-sm" style={{ color: 'var(--text-secondary)' }}>Loading map...</span>
          </div>
        )}
      </div>

      {/* Max Appointments */}
      <div className="dd-card">
        <h3 className="text-base font-bold mb-4" style={{ color: 'var(--text-primary)' }}>Max Appointments Per Day</h3>
        <input
          type="number"
          min={1}
          max={50}
          value={av.maxAppointmentsPerDay}
          onChange={(e) => setProfile({ ...profile, availability: { ...av, maxAppointmentsPerDay: Number(e.target.value) } })}
          className="dd-input max-w-[120px]"
        />
      </div>

      {/* Save Button */}
      <div className="flex justify-end pb-8">
        <button
          type="button"
          onClick={save}
          disabled={saving}
          className="btn-primary py-3 px-8 text-sm font-semibold rounded-full shadow-lg disabled:opacity-60"
        >
          {saving ? (
            <span className="flex items-center gap-2">
              <span className="h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent" />
              Saving...
            </span>
          ) : 'Save Availability'}
        </button>
      </div>
    </div>
  );
}
