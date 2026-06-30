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
            {isLocationConfirmed ? (
              <div className="mb-4 rounded-2xl border border-emerald-200 bg-emerald-50 px-4 py-3">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-semibold text-emerald-900">Selected location</p>
                    <p className="mt-1 text-sm text-emerald-700">{locationLabel}</p>
                  </div>
                  <button
                    type="button"
                    onClick={() => setIsLocationConfirmed(false)}
                    className="rounded-full border border-emerald-300 px-3 py-1.5 text-sm font-semibold text-emerald-700 hover:bg-emerald-100"
                  >
                    Change
                  </button>
                </div>
              </div>
            ) : (
              <>
                {savedAddresses.length > 0 && (
                  <div className="mb-4 space-y-2">
                    <p className="text-sm font-medium text-slate-700">Saved addresses</p>
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
                        className={`block w-full rounded-xl border p-3 text-left text-sm transition ${
                          selectedAddressId === address._id ? 'border-emerald-500 bg-emerald-50' : 'border-slate-200 hover:bg-slate-50'
                        }`}
                      >
                        <span className="font-medium">{address.label}</span>
                        {address.isDefault && <span className="ml-2 text-xs text-emerald-600">(Default)</span>}
                      </button>
                    ))}
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
                  minHeight={savedAddresses.length > 0 ? 360 : 480}
                  placeholder="Search your area"
                >
                  {location && (
                    <Marker {...({ position: [location.lat, location.lng], icon: createSvgIcon('#0ea5e9') } as any)}>
                      <Popup>Selected location</Popup>
                    </Marker>
                  )}
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
                  <div className="text-sm text-slate-600">{locationLabel || mapError || (location ? `Lat ${location.lat.toFixed(4)}, Lng ${location.lng.toFixed(4)}` : 'Search or tap the map to set your location')}</div>
                  {location && (
                    <button
                      type="button"
                      onClick={() => setIsLocationConfirmed(true)}
                      className="rounded-full bg-emerald-600 px-4 py-2 text-sm font-semibold text-white hover:bg-emerald-700"
                    >
                      Select Location
                    </button>
                  )}
                </div>
              </>
            )}
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
                    <div 
                      id={`doctor-card-${doctor._id}`} 
                      key={doctor._id} 
                      onClick={() => handleDoctorCardClick(doctor)}
                      className={`cursor-pointer transition hover:shadow-lg ${selectedDoctorId === doctor._id ? 'ring-2 ring-emerald-500 rounded-3xl' : ''}`}
                    >
                      <DoctorCard doctor={doctor} location={location} locationLabel={locationLabel} />
                      <div className="mt-2 flex items-center justify-between text-sm text-slate-600">
                        <span>Distance: {distanceLabel}</span>
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