import Link from 'next/link';
import { formatDistanceKm } from '@/lib/locationUtils';

interface DoctorCardProps {
  doctor: {
    _id: string;
    specialization: string;
    experience: number;
    consultationFee: number;
    averageRating: number;
    reviewCount: number;
    bio?: string;
    languages?: string[];
    qualifications?: string[];
    availability?: { isAvailable?: boolean; lastSeenAt?: string };
    consultationType?: 'home' | 'clinic' | 'both';
    clinicName?: string;
    clinicAddress?: string;
    distance?: number | string;
    userId?: { fullName?: string };
  };
}

const formatFee = (fee: number) => `₹${fee}`;

export function DoctorCard({ doctor }: DoctorCardProps) {
  const name = doctor.userId?.fullName || `Dr. ${doctor.specialization}`;
  const availabilityLabel = doctor.availability?.isAvailable ? 'Available now' : 'On request';
  const distanceValue = typeof doctor.distance === 'number' || typeof doctor.distance === 'string' ? Number(doctor.distance) : NaN;
  const distanceLabel = Number.isFinite(distanceValue) ? formatDistanceKm(distanceValue, true) : '—';
  const eta = Number.isFinite(distanceValue) ? Math.max(5, Math.round((distanceValue / 1000) / 40 * 60)) : undefined; // rough eta assuming 40km/h

  return (
    <article className="flex h-full flex-col rounded-3xl border border-slate-200 bg-white p-6 shadow-sm transition hover:-translate-y-1 hover:shadow-lg">
      <div className="flex items-start justify-between gap-4">
        <div>
          <p className="text-sm font-medium uppercase tracking-[0.2em] text-emerald-600">{doctor.specialization}</p>
          <h3 className="mt-2 text-xl font-semibold text-slate-900">{name}</h3>
          <p className="mt-2 text-sm text-slate-600">{doctor.bio?.slice(0, 120) || 'Compassionate clinician focused on modern, patient-first care.'}</p>
        </div>
        <div className="rounded-full bg-emerald-50 px-3 py-1 text-sm font-medium text-emerald-700">{availabilityLabel}</div>
      </div>

      <div className="mt-5 grid gap-3 text-sm text-slate-600 sm:grid-cols-2">
        <div>
          <p className="font-semibold text-slate-900">Experience</p>
          <p>{doctor.experience} years</p>
        </div>
        <div>
          <p className="font-semibold text-slate-900">Consultation fee</p>
          <p>{formatFee(doctor.consultationFee)}</p>
        </div>
        <div>
          <p className="font-semibold text-slate-900">Rating</p>
          <p>{doctor.averageRating.toFixed(1)} • {doctor.reviewCount} reviews</p>
        </div>
        <div>
          <p className="font-semibold text-slate-900">Languages</p>
          <p>{doctor.languages?.join(', ') || 'English'}</p>
        </div>
        <div>
          <p className="font-semibold text-slate-900">ETA</p>
          <p>{eta ? `${eta} min` : '—'}</p>
        </div>
        <div>
          <p className="font-semibold text-slate-900">Consultation</p>
          <p>{doctor.consultationType === 'both' ? 'Clinic & Home' : (doctor.consultationType === 'home' ? 'Home visit' : 'Clinic')}</p>
        </div>
      </div>

      {doctor.clinicName || doctor.clinicAddress ? (
        <div className="mt-5 rounded-2xl border border-slate-200 bg-slate-50 p-4 text-sm text-slate-700">
          <p className="font-semibold text-slate-900">Clinic</p>
          {doctor.clinicName && <p className="mt-1">{doctor.clinicName}</p>}
          {doctor.clinicAddress && <p className="mt-1 text-slate-600">{doctor.clinicAddress}</p>}
        </div>
      ) : null}
      <div className="mt-5 flex flex-wrap gap-2">
        {doctor.qualifications?.slice(0, 3).map((item) => (
          <span key={item} className="rounded-full bg-slate-100 px-3 py-1 text-xs font-medium text-slate-700">
            {item}
          </span>
        ))}
      </div>
      <div className="mt-6 flex items-center justify-between gap-3">
        <div className="text-sm text-slate-600">{distanceLabel}</div>
        <Link href={`/find-doctors/${doctor._id}`} className="inline-flex items-center justify-center rounded-full bg-slate-900 px-4 py-2 text-sm font-medium text-white transition hover:bg-slate-700">
          View profile
        </Link>
      </div>
    </article>
  );
}
