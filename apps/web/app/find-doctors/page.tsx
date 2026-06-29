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

  const query = useQuery({
    queryKey: ['find-doctors', appliedFilters, location?.lat, location?.lng],
    queryFn: () => fetchDoctors({ ...appliedFilters, latitude: location?.lat, longitude: location?.lng }),
    enabled: Boolean(location),
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

  useEffect(() => {
    let mounted = true;
    void fetchPatientProfile().then((profile) => {
      if (!mounted) return;
      const defaultAddress = profile.addresses?.find((a) => a.isDefault) || profile.addresses?.[0];
      if (defaultAddress?.location?.coordinates) {
        const [lng, lat] = defaultAddress.location.coordinates;
        setLocation({ lat, lng });
        setLocationLabel(defaultAddress.label || 'Saved address');
        return;
      }
      if (!navigator.geolocation) {
        setMapError('Geolocation not supported by your browser.');
        return;
      }
      navigator.geolocation.getCurrentPosition((pos) => {
        setLocation({ lat: pos.coords.latitude, lng: pos.coords.longitude });
      }, () => {
        setMapError('Location permission denied. Choose a location on the map instead.');
      }, { enableHighAccuracy: true, timeout: 5000 });
    }).catch(() => {
      if (!navigator.geolocation) {
        setMapError('Geolocation not supported by your browser.');
        return;
      }
      navigator.geolocation.getCurrentPosition((pos) => {
        setLocation({ lat: pos.coords.latitude, lng: pos.coords.longitude });
      }, () => {
        setMapError('Location permission denied. Choose a location on the map instead.');
      }, { enableHighAccuracy: true, timeout: 5000 });
    });
    return () => { mounted = false; };
  }, []);

  return (
    <main className="min-h-screen bg-slate-50 px-4 py-8 text-slate-900 sm:px-6 lg:px-8">
      <div className="mx-auto flex max-w-7xl flex-col gap-8">
        <header className="rounded-3xl bg-white p-8 shadow-sm ring-1 ring-slate-200">
          <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
            <div>
              <p className="text-sm font-semibold uppercase tracking-[0.3em] text-emerald-600">Doctor Discovery</p>
              <h1 className="mt-3 text-3xl font-semibold sm:text-4xl">Find the right clinician near you</h1>
              <p className="mt-3 max-w-2xl text-lg text-slate-600">
                Search verified specialists, compare experience and fees, and book an appointment with confidence.
              </p>
            </div>
            <Link href="/" className="inline-flex items-center justify-center rounded-full border border-slate-300 px-4 py-2 text-sm font-medium text-slate-700 transition hover:bg-slate-100">
              Back to home
            </Link>
          </div>
        </header>

        <DoctorFilters values={filters} onChange={updateFilters} onApply={handleApply} onReset={handleReset} />

        <div className="grid gap-6 lg:grid-cols-[1fr_420px]">
          <div className="rounded-2xl border border-slate-200 bg-white p-4">
            <MapPicker
              value={location}
              onChange={(lat, lng, label) => {
                setLocation({ lat, lng });
                setLocationLabel(label || null);
                setMapError(null);
              }}
              minHeight={480}
              placeholder="Search your area"
            >
              {location && (
                <Marker {...({ position: [location.lat, location.lng], icon: createSvgIcon('#0ea5e9') } as any)}>
                  <Popup>Selected location</Popup>
                </Marker>
              )}
              {doctorMarkers.map((doctor: any) => {
                const [lng, lat] = doctor.location.coordinates;
                return (
                  <Marker key={doctor._id} {...({ position: [lat, lng], icon: createSvgIcon('#f59e0b', 30) } as any)}>
                    <Popup>
                      <div className="min-w-[220px] text-sm">
                        <p className="font-semibold text-slate-900">{doctor.userId?.fullName || `Dr. ${doctor.specialization}`}</p>
                        <p className="mt-1 font-medium text-slate-800">{doctor.clinicName || 'Clinic'}</p>
                        <p className="mt-1 text-slate-600">{doctor.clinicAddress || 'Clinic address available on request'}</p>
                        <p className="mt-2 font-semibold text-emerald-700">₹{doctor.consultationFee} Consultation</p>
                        <p className="mt-1 text-slate-600">{doctor.availability?.isAvailable ? 'Available Now' : 'On request'}</p>
                      </div>
                    </Popup>
                  </Marker>
                );
              })}
            </MapPicker>
            <div className="mt-3 flex flex-wrap items-center justify-between gap-3">
              <div className="text-sm text-slate-600">{locationLabel || mapError || 'Search or tap the map to set your location'}</div>
              <button
                type="button"
                onClick={() => {
                  setMapError(null);
                  if (navigator.geolocation) {
                    navigator.geolocation.getCurrentPosition((pos) => {
                      setLocation({ lat: pos.coords.latitude, lng: pos.coords.longitude });
                      setLocationLabel('Current location');
                      setMapError(null);
                    }, () => {
                      setMapError('Location permission denied. Choose a location on the map instead.');
                    });
                  } else {
                    setMapError('Geolocation not supported by your browser.');
                  }
                }}
                className="rounded-full border border-slate-300 px-4 py-2 text-sm font-semibold text-slate-700"
              >
                Use my location
              </button>
            </div>
          </div>

          <div>
            {query.isLoading && (
              <div className="grid gap-5 md:grid-cols-2 xl:grid-cols-3">
                {[1, 2, 3].map((item) => (
                  <div key={item} className="animate-pulse rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
                    <div className="h-4 w-24 rounded bg-slate-200" />
                    <div className="mt-4 h-6 w-40 rounded bg-slate-200" />
                    <div className="mt-4 h-4 w-full rounded bg-slate-200" />
                    <div className="mt-2 h-4 w-3/4 rounded bg-slate-200" />
                    <div className="mt-6 h-10 rounded-full bg-slate-200" />
                  </div>
                ))}
              </div>
            )}

            {!query.isLoading && query.isError && (
              <div className="rounded-3xl border border-amber-200 bg-amber-50 p-8 text-center text-amber-800">
                <h2 className="text-xl font-semibold">We could not load doctor results.</h2>
                <p className="mt-2">Please try again in a moment.</p>
              </div>
            )}
            {!query.isLoading && !query.isError && doctors.length === 0 && (
              <div className="rounded-3xl border border-slate-200 bg-white p-10 text-center shadow-sm">
                <h2 className="text-xl font-semibold text-slate-900">No doctors match these filters yet</h2>
                <p className="mt-2 text-slate-600">Try broadening your search radius or clearing some filters.</p>
              </div>
            )}
            {!query.isLoading && !query.isError && doctors.length > 0 && (
              <div className="space-y-4">
                {doctors.sort((a: any, b: any) => (Number(a.distance) || 0) - (Number(b.distance) || 0)).map((doctor: any) => {
                  const backendDistance = Number(doctor.distance);
                  const distanceLabel = Number.isFinite(backendDistance) && backendDistance > 0
                    ? formatDistanceKm(backendDistance, true)
                    : (location && Array.isArray(doctor.location?.coordinates) ? formatDistanceKm(calculateDistanceKm(location.lat, location.lng, doctor.location.coordinates[1], doctor.location.coordinates[0]), false) : '—');
                  return (
                    <div id={`doctor-card-${doctor._id}`} key={doctor._id} onClick={() => setSelectedDoctorId(doctor._id)}>
                      <DoctorCard doctor={doctor} />
                      <div className="mt-2 flex items-center justify-between text-sm text-slate-600">
                        <span>Distance: {distanceLabel}</span>
                        <Link href={buildDoctorHref(doctor._id)} className="font-semibold text-emerald-600">Book here</Link>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      </div>
    </main>
  );
}

export default function FindDoctorsPage() {
  return <FindDoctorsPageContent />;
}