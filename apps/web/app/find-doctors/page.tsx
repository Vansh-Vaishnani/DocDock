"use client";

export const dynamic = 'force-dynamic';

import Link from 'next/link';
import nextDynamic from 'next/dynamic';
import { useEffect, useMemo, useState } from 'react';
import { useQuery } from '@tanstack/react-query';

import { DoctorCard } from '@/components/doctor-discovery/DoctorCard';
import { DoctorFilters } from '@/components/doctor-discovery/DoctorFilters';
import MapPicker, { createSvgIcon } from '@/components/map/MapPicker';
import { buildDoctorSearchParams } from '@/lib/doctorSearch';
import { calculateDistanceKm, formatDistanceKm } from '@/lib/locationUtils';
import { fetchPatientProfile } from '../patient/api';
import { useAuth, getRoleHomePath } from '../auth/auth-context';
import { DarkModeToggle } from '../theme-context';
import 'leaflet/dist/leaflet.css';

const Marker = nextDynamic(() => import('react-leaflet').then((m) => m.Marker), { ssr: false });
const Popup = nextDynamic(() => import('react-leaflet').then((m) => m.Popup), { ssr: false });

const API_BASE = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000/api/v1';

const defaultFilters = {
  search: '',
  specialization: '',
  sortBy: 'distance',
  radius: '10000',
  minExperience: '',
  maxFee: ''
};

async function fetchDoctors(filters: Record<string, any>) {
  const params = buildDoctorSearchParams({
    latitude: typeof filters.latitude === 'number' ? filters.latitude : undefined,
    longitude: typeof filters.longitude === 'number' ? filters.longitude : undefined,
    specialization: filters.specialization || undefined,
    minExperience: filters.minExperience ? Number(filters.minExperience) : undefined,
    maxFee: filters.maxFee ? Number(filters.maxFee) : undefined,
    search: filters.search || undefined,
    sortBy: filters.sortBy || undefined,
    radius: filters.radius ? Number(filters.radius) : undefined,
    page: 1,
    limit: 50
  });

  const response = await fetch(`${API_BASE}/doctors/nearby?${params.toString()}`, {
    method: 'GET',
    headers: { Accept: 'application/json' }
  });

  if (!response.ok) {
    throw new Error('Unable to load doctors right now.');
  }

  const payload = await response.json();
  return payload.data?.doctors ?? [];
}

function FindDoctorsPageContent() {
  const [filters, setFilters] = useState(defaultFilters);
  const [appliedFilters, setAppliedFilters] = useState(defaultFilters);
  const [location, setLocation] = useState<{ lat: number; lng: number } | null>(null);
  const [locationLabel, setLocationLabel] = useState<string | null>(null);
  const [mapError, setMapError] = useState<string | null>(null);
  const [selectedDoctorId, setSelectedDoctorId] = useState<string | null>(null);
  const [mapCenter, setMapCenter] = useState<{ lat: number; lng: number } | null>(null);
  const [savedAddresses, setSavedAddresses] = useState<any[]>([]);
  const [selectedAddressId, setSelectedAddressId] = useState<string | null>(null);
  const [isLocationConfirmed, setIsLocationConfirmed] = useState(false);

  const query = useQuery({
    queryKey: ['find-doctors', appliedFilters, location?.lat, location?.lng],
    queryFn: () => fetchDoctors({ ...appliedFilters, latitude: location?.lat, longitude: location?.lng }),
    staleTime: 30_000
  });

  const doctors = useMemo(() => query.data ?? [], [query.data]);
  const doctorMarkers = useMemo(() => {
    return (doctors as any[]).filter((doctor) => Array.isArray(doctor.location?.coordinates) && doctor.location.coordinates.length === 2);
  }, [doctors]);

  const updateFilters = (updates: Record<string, string>) => {
    setFilters((current) => ({ ...current, ...updates }));
  };

  const handleApply = () => {
    setAppliedFilters(filters);
  };

  const handleReset = () => {
    setFilters(defaultFilters);
    setAppliedFilters(defaultFilters);
  };

  const buildDoctorHref = (doctorId: string) => {
    if (!location) return `/find-doctors/${doctorId}`;
    const params = new URLSearchParams({
      lat: location.lat.toString(),
      lng: location.lng.toString(),
      label: locationLabel || `Lat ${location.lat.toFixed(4)}, Lng ${location.lng.toFixed(4)}`
    });
    return `/find-doctors/${doctorId}?${params.toString()}`;
  };

  const handleDoctorCardClick = (doctor: any) => {
    setSelectedDoctorId(doctor._id);
    if (Array.isArray(doctor.location?.coordinates) && doctor.location.coordinates.length === 2) {
      const [lng, lat] = doctor.location.coordinates;
      setMapCenter({ lat, lng });
      const cardElement = document.getElementById(`doctor-card-${doctor._id}`);
      cardElement?.scrollIntoView({ behavior: 'smooth', block: 'center' });
    }
  };

  const handleMarkerClick = (doctor: any) => {
    setSelectedDoctorId(doctor._id);
    const cardElement = document.getElementById(`doctor-card-${doctor._id}`);
    cardElement?.scrollIntoView({ behavior: 'smooth', block: 'center' });
  };

  useEffect(() => {
    let mounted = true;
    void fetchPatientProfile().then((profile) => {
      if (!mounted) return;
      setSavedAddresses(profile.addresses || []);
      const defaultAddress = profile.addresses?.find((a) => a.isDefault) || profile.addresses?.[0];
      if (defaultAddress?.location?.coordinates) {
        const [lng, lat] = defaultAddress.location.coordinates;
        setLocation({ lat, lng });
        setLocationLabel(defaultAddress.label || 'Saved address');
        if (defaultAddress._id) {
          setSelectedAddressId(defaultAddress._id);
        }
        setIsLocationConfirmed(true);
        return;
      }
    }).catch(() => {
      setSavedAddresses([]);
    });
    return () => { mounted = false; };
  }, []);

  const { user, isHydrated, logout } = useAuth();

  return (
    <div className="min-h-screen flex flex-col" style={{ backgroundColor: 'var(--bg-primary)' }}>
      {/* ─── Top Navbar ─────────────────────────────────────── */}
      <header
        className="sticky top-0 z-50 border-b"
        style={{ backgroundColor: 'var(--header-bg)', borderColor: 'var(--border-color)', backdropFilter: 'blur(20px)' }}
      >
        <div className="mx-auto flex h-14 max-w-7xl items-center justify-between px-4 sm:px-6 lg:px-8">
          {/* Logo */}
          <Link href="/" className="flex items-center gap-2.5">
            <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-emerald-600">
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M12 2a10 10 0 1 0 0 20 10 10 0 0 0 0-20z" /><path d="M12 8v4M12 16h.01" />
              </svg>
            </div>
            <div>
              <div className="text-base font-bold leading-none" style={{ color: 'var(--text-primary)' }}>DocDock</div>
              <div className="hidden sm:block mt-0.5 text-[10px] leading-none" style={{ color: 'var(--text-muted)' }}>
                Knock-Knock, your doctor is here.
              </div>
            </div>
          </Link>

          {/* Actions */}
          <div className="flex items-center gap-2">
            <DarkModeToggle />

            {!isHydrated && (
              <div className="h-8 w-24 skeleton rounded-full" />
            )}

            {isHydrated && !user && (
              <>
                <Link href="/auth/login" className="btn-ghost text-sm">Sign in</Link>
                <Link href="/auth/register" className="btn-primary text-sm">Get Started</Link>
              </>
            )}

            {isHydrated && user && (
              <>
                <Link href={getRoleHomePath(user)} className="btn-primary text-sm">Dashboard</Link>
                <button onClick={logout} className="btn-ghost text-sm">Sign out</button>
              </>
            )}
          </div>
        </div>
      </header>

      {/* Page Content */}
      <main className="flex-1 px-4 py-6 sm:px-6 lg:px-8">
        <div className="mx-auto flex max-w-7xl flex-col gap-6">
          <header className="relative overflow-hidden rounded-3xl p-6 text-white sm:p-8" style={{ background: 'linear-gradient(135deg, #059669 0%, #0f766e 100%)' }}>
            <div className="absolute inset-0 overflow-hidden pointer-events-none" aria-hidden="true">
              <div className="absolute -right-10 -top-10 h-48 w-48 rounded-full bg-white/10 blur-3xl" />
            </div>
            <div className="relative flex flex-col gap-4">
              <p className="text-xs font-semibold uppercase tracking-widest text-emerald-200">Doctor Discovery</p>
              <h1 className="mt-1 text-2xl font-bold sm:text-3xl">Find the right doctor near you</h1>
              <p className="text-sm text-emerald-100 max-w-xl">
                Search verified specialists, compare experience and fees, and book with confidence.
              </p>
            </div>
          </header>

          <DoctorFilters values={filters} onChange={updateFilters} onApply={handleApply} onReset={handleReset} />

          {/* Full Width Map card */}
          <div className="dd-card p-4">
            <h2 className="text-sm font-bold mb-3" style={{ color: 'var(--text-primary)' }}>Set Your Location</h2>
            {isLocationConfirmed ? (
              <div className="mb-4 rounded-xl border border-emerald-200 bg-emerald-50 dark:bg-emerald-950/30 dark:border-emerald-900 px-4 py-3">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-semibold text-emerald-900 dark:text-emerald-300">Selected location</p>
                    <p className="mt-1 text-sm text-emerald-700 dark:text-emerald-400">{locationLabel}</p>
                  </div>
                  <button
                    type="button"
                    onClick={() => setIsLocationConfirmed(false)}
                    className="rounded-full border border-emerald-300 px-3 py-1.5 text-sm font-semibold text-emerald-700 hover:bg-emerald-100 dark:border-emerald-800 dark:text-emerald-400 dark:hover:bg-emerald-950/40"
                  >
                    Change Location
                  </button>
                </div>
              </div>
            ) : (
              <>
                {savedAddresses.length > 0 && (
                  <div className="mb-4 space-y-2">
                    <p className="text-xs font-medium" style={{ color: 'var(--text-secondary)' }}>Saved addresses</p>
                    <div className="flex flex-wrap gap-2">
                      {savedAddresses.map((address) => (
                        <button
                          key={address._id}
                          type="button"
                          onClick={() => {
                            if (address.location?.coordinates) {
                              const [lng, lat] = address.location.coordinates;
                              setLocation({ lat, lng });
                              setLocationLabel(address.label || 'Saved address');
                              setSelectedAddressId(address._id);
                              setMapCenter({ lat, lng });
                            }
                          }}
                          className={`rounded-full border px-4 py-2 text-xs font-medium transition-all ${
                            selectedAddressId === address._id ? 'border-emerald-500 bg-emerald-50 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-400' : 'border-slate-200 hover:bg-slate-50 dark:border-slate-800 dark:hover:bg-slate-900'
                          }`}
                        >
                          {address.label}
                          {address.isDefault && <span className="ml-1 text-[10px] text-emerald-600 dark:text-emerald-400 font-semibold">(Default)</span>}
                        </button>
                      ))}
                    </div>
                  </div>
                )}
                <MapPicker
                  value={mapCenter || location}
                  onChange={(lat, lng, label) => {
                    setLocation({ lat, lng });
                    setLocationLabel(label || null);
                    setMapError(null);
                    setMapCenter(null);
                    setSelectedAddressId(null);
                  }}
                  minHeight={320}
                  placeholder="Search your area"
                >

                  {doctorMarkers.map((doctor: any) => {
                    const [lng, lat] = doctor.location.coordinates;
                    const backendDistance = Number(doctor.distance);
                    const distanceLabel = Number.isFinite(backendDistance) && backendDistance > 0
                      ? formatDistanceKm(backendDistance, true)
                      : (location && Array.isArray(doctor.location?.coordinates) ? formatDistanceKm(calculateDistanceKm(location.lat, location.lng, doctor.location.coordinates[1], doctor.location.coordinates[0]), false) : '—');
                    return (
                      <Marker 
                        key={doctor._id} 
                        {...({ position: [lat, lng], icon: createSvgIcon('#f59e0b', 30) } as any)}
                        eventHandlers={{
                          click: () => handleMarkerClick(doctor)
                        }}
                      >
                        <Popup>
                          <div className="min-w-[220px] text-sm">
                            <p className="font-semibold text-slate-900">{doctor.userId?.fullName || `Dr. ${doctor.specialization}`}</p>
                            <p className="mt-1 font-medium text-slate-800">{doctor.clinicName || 'Clinic'}</p>
                            <p className="mt-1 text-slate-600">{doctor.clinicAddress || 'Clinic address available on request'}</p>
                            <p className="mt-2 font-semibold text-emerald-700">₹{doctor.consultationFee} Consultation</p>
                            <p className="mt-1 text-slate-600">Distance: {distanceLabel}</p>
                            <p className="mt-1 text-slate-600">{doctor.availability?.isAvailable ? 'Available Now' : 'On request'}</p>
                          </div>
                        </Popup>
                      </Marker>
                    );
                  })}
                </MapPicker>
                <div className="mt-3 flex flex-wrap items-center justify-between gap-3">
                  <div className="text-xs" style={{ color: 'var(--text-secondary)' }}>{locationLabel || mapError || (location ? `Lat ${location.lat.toFixed(4)}, Lng ${location.lng.toFixed(4)}` : 'Search or tap the map to set your location')}</div>
                  {location && (
                    <button
                      type="button"
                      onClick={() => setIsLocationConfirmed(true)}
                      className="btn-primary text-xs px-4 py-2"
                    >
                      Confirm Location
                    </button>
                  )}
                </div>
              </>
            )}
          </div>

          {/* Doctors Grid Section */}
          <div className="mt-2">
            <h2 className="text-lg font-bold mb-4" style={{ color: 'var(--text-primary)' }}>Available Doctors</h2>

            {query.isLoading && (
              <div className="grid gap-5 md:grid-cols-2 lg:grid-cols-3">
                {[1, 2, 3].map((item) => (
                  <div key={item} className="animate-pulse dd-card p-6">
                    <div className="h-4 w-24 rounded bg-slate-200 dark:bg-slate-800" />
                    <div className="mt-4 h-6 w-40 rounded bg-slate-200 dark:bg-slate-800" />
                    <div className="mt-4 h-4 w-full rounded bg-slate-200 dark:bg-slate-800" />
                    <div className="mt-2 h-4 w-3/4 rounded bg-slate-200 dark:bg-slate-800" />
                    <div className="mt-6 h-10 rounded-full bg-slate-200 dark:bg-slate-800" />
                  </div>
                ))}
              </div>
            )}

            {!query.isLoading && query.isError && (
              <div className="rounded-2xl border border-amber-200 bg-amber-50 dark:bg-amber-950/30 dark:border-amber-900 p-8 text-center">
                <p className="text-sm font-semibold text-amber-800 dark:text-amber-300">Could not load doctors.</p>
                <p className="mt-1 text-xs text-amber-700 dark:text-amber-400">Please try again in a moment.</p>
              </div>
            )}

            {!query.isLoading && !query.isError && doctors.length === 0 && (
              <div className="rounded-2xl border p-10 text-center" style={{ borderColor: 'var(--border-color)', backgroundColor: 'var(--card-bg)' }}>
                <div className="flex h-14 w-14 items-center justify-center rounded-2xl mx-auto mb-4 text-emerald-600 bg-emerald-50 dark:bg-emerald-950/40">
                  <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2 M12 11a4 4 0 1 0 0-8 4 4 0 0 0 0 8z" />
                  </svg>
                </div>
                <h2 className="text-sm font-semibold" style={{ color: 'var(--text-primary)' }}>No doctors found</h2>
                <p className="mt-1 text-xs" style={{ color: 'var(--text-muted)' }}>Try broadening your search radius or clearing some filters.</p>
              </div>
            )}

            {!query.isLoading && !query.isError && doctors.length > 0 && (
              <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
                {doctors.sort((a: any, b: any) => (Number(a.distance) || 0) - (Number(b.distance) || 0)).map((doctor: any) => {
                  const backendDistance = Number(doctor.distance);
                  const distanceLabel = Number.isFinite(backendDistance) && backendDistance > 0
                    ? formatDistanceKm(backendDistance, true)
                    : (location && Array.isArray(doctor.location?.coordinates) ? formatDistanceKm(calculateDistanceKm(location.lat, location.lng, doctor.location.coordinates[1], doctor.location.coordinates[0]), false) : '—');
                  return (
                    <div 
                      id={`doctor-card-${doctor._id}`} 
                      key={doctor._id} 
                      onClick={() => handleDoctorCardClick(doctor)}
                      className={`cursor-pointer transition duration-200 hover-lift rounded-2xl border ${selectedDoctorId === doctor._id ? 'ring-2 ring-emerald-500' : ''}`}
                      style={{ backgroundColor: 'var(--card-bg)', borderColor: 'var(--border-color)' }}
                    >
                      <DoctorCard doctor={doctor} location={location} locationLabel={locationLabel} />
                      <div className="px-5 pb-4 pt-1 flex items-center justify-between text-xs" style={{ color: 'var(--text-muted)' }}>
                        <span>Distance: {distanceLabel}</span>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      </main>
    </div>
  );
}

export default function FindDoctorsPage() {
  return <FindDoctorsPageContent />;
}