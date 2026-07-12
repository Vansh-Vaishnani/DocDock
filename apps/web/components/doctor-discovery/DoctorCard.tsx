import Link from 'next/link';
import { formatDistanceKm, calculateDistanceKm } from '@/lib/locationUtils';
import { MapPin } from 'lucide-react';

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
  location?: { lat: number; lng: number } | null;
  locationLabel?: string | null;
}

const formatFee = (fee: number) => `₹${fee}`;

export function DoctorCard({ doctor, location, locationLabel }: DoctorCardProps) {
  const name = doctor.userId?.fullName || `Dr. ${doctor.specialization}`;
  const availabilityLabel = doctor.availability?.isAvailable ? 'Available now' : 'On request';
  const distanceValue = typeof doctor.distance === 'number' || typeof doctor.distance === 'string' ? Number(doctor.distance) : NaN;
  
  const calculateDistance = () => {
    if (Number.isFinite(distanceValue) && distanceValue > 0) {
      return formatDistanceKm(distanceValue, true);
    }
    const coords = (doctor as any).location?.coordinates;
    if (location && Array.isArray(coords) && coords.length === 2) {
      const [lng, lat] = coords;
      const dist = calculateDistanceKm(location.lat, location.lng, lat, lng);
      return formatDistanceKm(dist, false);
    }
    return '—';
  };
  const finalDistanceLabel = calculateDistance();
  const eta = Number.isFinite(distanceValue) ? Math.max(5, Math.round((distanceValue / 1000) / 40 * 60)) : undefined;

  const buildHref = () => {
    if (!location) return `/find-doctors/${doctor._id}`;
    const params = new URLSearchParams({
      lat: location.lat.toString(),
      lng: location.lng.toString(),
      label: locationLabel || `Lat ${location.lat.toFixed(4)}, Lng ${location.lng.toFixed(4)}`
    });
    return `/find-doctors/${doctor._id}?${params.toString()}`;
  };

  const getConsultationLabel = () => {
    const modes = (doctor as any).consultationModes;
    if (Array.isArray(modes) && modes.length > 0) {
      const modeLabels = modes.map((m: string) => {
        if (m === 'clinic') return 'Clinic';
        if (m === 'home') return 'Home Visit';
        if (m === 'online') return 'Online';
        return m;
      });
      return modeLabels.join(' • ');
    }
    return doctor.consultationType === 'both' ? 'Clinic • Home Visit' : (doctor.consultationType === 'home' ? 'Home Visit' : 'Clinic');
  };

  return (
    <article className="flex h-full flex-col rounded-3xl border p-6 shadow-soft transition hover:-translate-y-1 hover:shadow-large" style={{ backgroundColor: 'var(--card-bg)', borderColor: 'var(--card-border)' }}>
      <div className="flex items-start justify-between gap-4">
        <div>
          <p className="text-sm font-semibold uppercase tracking-[0.2em] text-emerald-600">{doctor.specialization}</p>
          <h3 className="mt-2 text-xl font-bold" style={{ color: 'var(--text-primary)' }}>{name}</h3>
          <p className="mt-2 text-sm leading-relaxed" style={{ color: 'var(--text-secondary)' }}>{doctor.bio?.slice(0, 120) || 'Compassionate clinician focused on modern, patient-first care.'}</p>
        </div>
        <div className="rounded-full bg-emerald-50 px-3 py-1 text-xs font-semibold text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-400">{availabilityLabel}</div>
      </div>

      <div className="mt-5 grid gap-3 text-sm sm:grid-cols-2" style={{ color: 'var(--text-secondary)' }}>
        <div>
          <p className="font-semibold" style={{ color: 'var(--text-primary)' }}>Experience</p>
          <p>{doctor.experience} years</p>
        </div>
        <div>
          <p className="font-semibold" style={{ color: 'var(--text-primary)' }}>Consultation fee</p>
          <p className="font-semibold text-emerald-600 dark:text-emerald-400">{formatFee(doctor.consultationFee)}</p>
        </div>
        <div>
          <p className="font-semibold" style={{ color: 'var(--text-primary)' }}>Rating</p>
          <p>{doctor.averageRating.toFixed(1)} • {doctor.reviewCount} reviews</p>
        </div>
        <div>
          <p className="font-semibold" style={{ color: 'var(--text-primary)' }}>Languages</p>
          <p>{doctor.languages?.join(', ') || 'English'}</p>
        </div>
        <div>
          <p className="font-semibold" style={{ color: 'var(--text-primary)' }}>ETA</p>
          <p>{eta ? `${eta} min` : '—'}</p>
        </div>
        <div>
          <p className="font-semibold" style={{ color: 'var(--text-primary)' }}>Consultation</p>
          <p className="font-semibold text-emerald-600 dark:text-emerald-400">{getConsultationLabel()}</p>
        </div>
      </div>

      {doctor.clinicName || doctor.clinicAddress ? (
        <div className="mt-5 rounded-2xl border p-4 text-sm" style={{ borderColor: 'var(--border-color)', backgroundColor: 'var(--bg-secondary)' }}>
          <p className="font-semibold" style={{ color: 'var(--text-primary)' }}>Clinic</p>
          {doctor.clinicName && <p className="mt-1" style={{ color: 'var(--text-primary)' }}>{doctor.clinicName}</p>}
          {doctor.clinicAddress && <p className="mt-1" style={{ color: 'var(--text-secondary)' }}>{doctor.clinicAddress}</p>}
        </div>
      ) : null}
      <div className="mt-5 flex flex-wrap gap-2">
        {doctor.qualifications?.slice(0, 3).map((item) => (
          <span key={item} className="rounded-full bg-slate-100 dark:bg-slate-800 px-3 py-1 text-xs font-medium" style={{ color: 'var(--text-secondary)' }}>
            {item}
          </span>
        ))}
      </div>
      <div className="mt-6 flex flex-wrap items-center justify-between gap-3 pt-4 border-t" style={{ borderColor: 'var(--border-color)' }}>
        <div className="flex items-center gap-1 text-sm font-semibold text-emerald-600 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-950/30 px-3 py-1.5 rounded-full">
          <MapPin className="h-4 w-4" />
          <span>{finalDistanceLabel}</span>
        </div>
        <div className="flex gap-2">
          <Link href={buildHref()} className="rounded-full border border-slate-300 dark:border-slate-700 px-4 py-2 text-xs font-semibold hover:bg-slate-50 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-300 transition-all">
            View Profile
          </Link>
          <Link href={buildHref()} className="btn-primary text-xs px-4 py-2 rounded-full font-semibold">
            Book Appointment
          </Link>
        </div>
      </div>
    </article>
  );
}
