'use client';

import { useMemo, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import Link from 'next/link';

import { buildDoctorSearchParams } from '@/lib/doctorSearch';
import { DoctorCard } from '@/components/doctor-discovery/DoctorCard';
import { DoctorFilters } from '@/components/doctor-discovery/DoctorFilters';

const API_BASE = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000/api/v1';

const defaultFilters = {
  search: '',
  specialization: '',
  sortBy: 'distance',
  radius: '10000',
  minExperience: '',
  maxFee: ''
};

async function fetchDoctors(filters: Record<string, string>) {
  const params = buildDoctorSearchParams({
    latitude: 12.9716,
    longitude: 77.5946,
    specialization: filters.specialization || undefined,
    minExperience: filters.minExperience ? Number(filters.minExperience) : undefined,
    maxFee: filters.maxFee ? Number(filters.maxFee) : undefined,
    search: filters.search || undefined,
    sortBy: filters.sortBy || undefined,
    radius: filters.radius ? Number(filters.radius) : undefined,
    page: 1,
    limit: 9
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

export default function DoctorsPage() {
  const [filters, setFilters] = useState(defaultFilters);
  const [appliedFilters, setAppliedFilters] = useState(defaultFilters);

  const query = useQuery({
    queryKey: ['doctors', appliedFilters],
    queryFn: () => fetchDoctors(appliedFilters),
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
          <div className="grid gap-6 md:grid-cols-2 xl:grid-cols-3">
            {doctors.map((doctor: Record<string, unknown>) => (
              <DoctorCard key={String(doctor._id || doctor.id)} doctor={doctor as any} />
            ))}
          </div>
        )}
      </div>
    </main>
  );
}
