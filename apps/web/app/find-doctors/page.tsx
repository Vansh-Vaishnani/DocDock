"use client";
import dynamic from 'next/dynamic';

import Link from 'next/link';
import { useEffect, useMemo, useRef, useState } from 'react';
import { useQuery } from '@tanstack/react-query';

import { DoctorCard } from '@/components/doctor-discovery/DoctorCard';
import { createSvgIcon } from '@/components/map/LeafletMap';
import { DoctorFilters } from '@/components/doctor-discovery/DoctorFilters';
import { buildDoctorSearchParams } from '@/lib/doctorSearch';
import { addAddress, fetchPatientProfile } from '../patient/api';
import 'leaflet/dist/leaflet.css';
const MapContainer = dynamic(() => import('react-leaflet').then((m) => m.MapContainer), { ssr: false });
const TileLayer = dynamic(() => import('react-leaflet').then((m) => m.TileLayer), { ssr: false });
const CircleMarker = dynamic(() => import('react-leaflet').then((m) => m.CircleMarker), { ssr: false });
const Marker = dynamic(() => import('react-leaflet').then((m) => m.Marker), { ssr: false });
const Popup = dynamic(() => import('react-leaflet').then((m) => m.Popup), { ssr: false });

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

  // Location state
  const [location, setLocation] = useState<{ lat: number; lng: number } | null>(null);
  const [locationLabel, setLocationLabel] = useState<string | null>(null);
  const [mapError, setMapError] = useState<string | null>(null);
  const mapRef = useRef<any | null>(null);
  const [selectedDoctorId, setSelectedDoctorId] = useState<string | null>(null);

  const query = useQuery({
    queryKey: ['find-doctors', appliedFilters, location?.lat, location?.lng],
    queryFn: () => fetchDoctors({ ...appliedFilters, latitude: location?.lat, longitude: location?.lng }),
    enabled: Boolean(location),
    staleTime: 30_000
  });

  const doctors = useMemo(() => query.data ?? [], [query.data]);

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

  const leafletMapProps: any = {
    center: location ? [location.lat, location.lng] : [12.9716, 77.5946],
    zoom: location ? 13 : 10,
    style: { height: 480, width: '100%', borderRadius: 8 },
    whenCreated: (mapInstance: any) => { mapRef.current = mapInstance; }
  };

  // initialize location: prefer patient's default address, then browser geolocation
  useEffect(() => {
    let mounted = true;
    void fetchPatientProfile().then((profile) => {
      if (!mounted) return;
      const defaultAddress = profile.addresses?.find((a) => a.isDefault) || profile.addresses?.[0];
      if (defaultAddress?.location?.coordinates) {
        const [lng, lat] = defaultAddress.location.coordinates;
        setLocation({ lat, lng });
        setLocationLabel(defaultAddress.label);
        return;
      }
      if (!navigator.geolocation) {
        setMapError('Geolocation not supported by your browser.');
        return;
      }
      navigator.geolocation.getCurrentPosition((pos) => {
        setLocation({ lat: pos.coords.latitude, lng: pos.coords.longitude });
      }, (err) => {
        setMapError('Location permission denied. Click on the map to choose location.');
      }, { enableHighAccuracy: true, timeout: 5000 });
    }).catch(() => {
      // fallback to geolocation
      if (!navigator.geolocation) {
        setMapError('Geolocation not supported by your browser.');
        return;
      }
      navigator.geolocation.getCurrentPosition((pos) => {
        setLocation({ lat: pos.coords.latitude, lng: pos.coords.longitude });
      }, (err) => {
        setMapError('Location permission denied. Click on the map to choose location.');
      }, { enableHighAccuracy: true, timeout: 5000 });
    });
    return () => { mounted = false; };
  }, []);

  // attach a click handler to the Leaflet map instance when available
  useEffect(() => {
    const map = mapRef.current as any;
    if (!map) return;
    const onClick = (e: any) => {
      const lat = e.latlng.lat;
      const lng = e.latlng.lng;
      setLocation({ lat, lng });
      fetch(`https://nominatim.openstreetmap.org/reverse?format=jsonv2&lat=${lat}&lon=${lng}`)
        .then((r) => r.json())
        .then((data) => {
          const label = data?.display_name || `Lat ${lat.toFixed(4)}, Lng ${lng.toFixed(4)}`;
          setLocationLabel(label);
        })
        .catch(() => setLocationLabel(`Lat ${lat.toFixed(4)}, Lng ${lng.toFixed(4)}`));
    };
    try {
      map.on('click', onClick);
    } catch (e) {}
    return () => { try { map.off('click', onClick); } catch (e) {} };
  }, [mapRef.current]);

  // compute simple haversine distance in meters
  const haversine = (lat1: number, lon1: number, lat2: number, lon2: number) => {
    const toRad = (v: number) => (v * Math.PI) / 180;
    const R = 6371e3; // meters
    const φ1 = toRad(lat1);
    const φ2 = toRad(lat2);
    const Δφ = toRad(lat2 - lat1);
    const Δλ = toRad(lon2 - lon1);
    const a = Math.sin(Δφ/2) * Math.sin(Δφ/2) + Math.cos(φ1) * Math.cos(φ2) * Math.sin(Δλ/2) * Math.sin(Δλ/2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
    return R * c;
  };

  // enrich doctors with computed distance when location available
  useEffect(() => {
    if (!location || !doctors || doctors.length === 0) return;
    try {
      doctors.forEach((d: any) => {
        if (d.location?.coordinates) {
          const [lng, lat] = d.location.coordinates;
          d.distance = d.distance || haversine(location.lat, location.lng, lat, lng);
        }
      });
    } catch (e) {}
  }, [location, doctors]);

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
            <MapContainer {...leafletMapProps}>
              <TileLayer {...({ url: 'https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', attribution: '&copy; OpenStreetMap contributors' } as any)} />
              {location && (
                <Marker {...({ position: [location.lat, location.lng], draggable: true, icon: createSvgIcon('#0ea5e9') } as any)} eventHandlers={{
                  dragend: (e: any) => {
                    const lat = e.target.getLatLng().lat; const lng = e.target.getLatLng().lng; setLocation({ lat, lng });
                    fetch(`https://nominatim.openstreetmap.org/reverse?format=jsonv2&lat=${lat}&lon=${lng}`).then((r) => r.json()).then((data) => setLocationLabel(data?.display_name || null)).catch(() => {});
                  }
                }}>
                  <Popup>Your location</Popup>
                </Marker>
              )}
              {doctors.map((doc: any) => {
                const coords = doc.location?.coordinates;
                if (!coords || coords.length < 2) return null;
                const lat = coords[1];
                const lng = coords[0];
                const isSelectedId = selectedDoctorId === doc._id;
                const availability = doc.availability || {};
                const lastSeen = availability.lastSeenAt ? new Date(availability.lastSeenAt).getTime() : 0;
                const recent = Date.now() - lastSeen < 3600_000;
                const color = isSelectedId ? '#0ea5e9' : (availability.isAvailable ? '#16a34a' : (recent ? '#f59e0b' : '#9ca3af'));
                return (
                  <CircleMarker
                    key={doc._id}
                    center={[lat, lng]}
                    pathOptions={{ color, fillColor: color }}
                    {...({ radius: isSelectedId ? 10 : 6 } as any)}
                    eventHandlers={{
                      click: () => {
                        setSelectedDoctorId(doc._id);
                        try { mapRef.current?.panTo([lat, lng]); } catch (e) {}
                        const elCard = document.getElementById(`doctor-card-${doc._id}`);
                        if (elCard) elCard.scrollIntoView({ behavior: 'smooth', block: 'center' });
                      }
                    }}
                  >
                    <Popup>
                      <div className="text-sm">
                        <div className="font-semibold">{doc.userId?.fullName || doc.doctorName || doc.name}</div>
                        <div>{doc.specialization}</div>
                        <div className="mt-1 text-xs text-slate-600">{doc.averageRating?.toFixed?.(1) ?? ''} • {doc.reviewCount ?? 0} reviews</div>
                      </div>
                    </Popup>
                  </CircleMarker>
                );
              })}
            </MapContainer>
            <div className="mt-3 flex items-center justify-between gap-3">
              <div className="text-sm text-slate-600">{locationLabel ?? (mapError ?? 'Click on the map to set your location')}</div>
                <div className="flex gap-2">
                  <button
                    type="button"
                    onClick={() => {
                      // re-request browser location
                      setMapError(null);
                      if (navigator.geolocation) {
                        navigator.geolocation.getCurrentPosition((pos) => {
                          setLocation({ lat: pos.coords.latitude, lng: pos.coords.longitude });
                        }, (err) => {
                          setMapError('Location permission denied. Click on the map to choose location.');
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
                {doctors.sort((a: any, b: any) => (a.distance || 0) - (b.distance || 0)).map((doctor: any) => (
                  <div id={`doctor-card-${doctor._id}`} key={doctor._id} onClick={() => {
                    setSelectedDoctorId(doctor._id);
                    // center map on doctor
                    try {
                      if (mapRef.current && doctor.location?.coordinates) {
                        const [lng, lat] = doctor.location.coordinates;
                        mapRef.current.flyTo([lat, lng], 14);
                      }
                    } catch (e) {}
                  }}>
                    <DoctorCard doctor={doctor} />
                    <div className="mt-2 text-sm text-slate-600">Distance: {(doctor.distance / 1000).toFixed(1)} km</div>
                  </div>
                ))}
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