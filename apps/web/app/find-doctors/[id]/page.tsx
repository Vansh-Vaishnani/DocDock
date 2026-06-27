'use client';

import Link from 'next/link';
import { useParams } from 'next/navigation';
import { useQuery } from '@tanstack/react-query';

const API_BASE = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000/api/v1';

async function fetchDoctorById(id: string) {
  const response = await fetch(`${API_BASE}/doctors/${id}`);
  if (!response.ok) {
    throw new Error('Doctor not found');
  }
  const payload = await response.json();
  return payload.data ?? payload;
}

function DoctorDetailsPageContent() {
  const params = useParams();
  const id = Array.isArray(params?.id) ? params.id[0] : params?.id;

  const query = useQuery({
    queryKey: ['doctor', id],
    queryFn: () => fetchDoctorById(String(id)),
    enabled: Boolean(id),
    staleTime: 60_000
  });

  if (!id) {
    return null;
  }

  if (query.isLoading) {
    return <div className="mx-auto max-w-5xl px-6 py-10 text-slate-600">Loading doctor profile...</div>;
  }

  if (query.isError || !query.data) {
    return <div className="mx-auto max-w-5xl px-6 py-10 text-slate-600">We could not load this doctor profile.</div>;
  }

  const doctor = query.data;

  return (
    <main className="min-h-screen bg-slate-50 px-4 py-8 text-slate-900 sm:px-6 lg:px-8">
      <div className="mx-auto flex max-w-5xl flex-col gap-6">
        <Link href="/find-doctors" className="text-sm font-semibold text-emerald-600">← Back to discovery</Link>
        <section className="rounded-3xl border border-slate-200 bg-white p-8 shadow-sm">
          <div className="flex flex-col gap-6 lg:flex-row lg:items-start lg:justify-between">
            <div>
              <p className="text-sm font-semibold uppercase tracking-[0.3em] text-emerald-600">{doctor.specialization}</p>
              <h1 className="mt-3 text-3xl font-semibold">{doctor.fullName || doctor.userId?.fullName || 'Doctor profile'}</h1>
              <p className="mt-3 max-w-2xl text-lg text-slate-600">{doctor.bio || 'Dedicated clinician offering compassionate care and modern treatment guidance.'}</p>
            </div>
            <div className="rounded-2xl bg-slate-50 p-5 text-sm text-slate-700">
              <p className="font-semibold text-slate-900">Consultation fee</p>
              <p className="mt-1 text-xl font-semibold text-slate-900">₹{doctor.consultationFee}</p>
              <p className="mt-2">{doctor.averageRating?.toFixed?.(1) ?? 0} rating • {doctor.reviewCount || 0} reviews</p>
            </div>
          </div>

          <div className="mt-8 grid gap-4 md:grid-cols-3">
            <div className="rounded-2xl border border-slate-200 p-4">
              <p className="text-sm font-semibold text-slate-900">Experience</p>
              <p className="mt-2 text-sm text-slate-600">{doctor.experience} years</p>
            </div>
            <div className="rounded-2xl border border-slate-200 p-4">
              <p className="text-sm font-semibold text-slate-900">Languages</p>
              <p className="mt-2 text-sm text-slate-600">{doctor.languages?.join(', ') || 'English'}</p>
            </div>
            <div className="rounded-2xl border border-slate-200 p-4">
              <p className="text-sm font-semibold text-slate-900">Availability</p>
              <p className="mt-2 text-sm text-slate-600">{doctor.availability?.isAvailable ? 'Available now' : 'Available on request'}</p>
            </div>
          </div>
        </section>
      </div>
    </main>
  );
}

export default function DoctorDetailsPage() {
  return <DoctorDetailsPageContent />;
}