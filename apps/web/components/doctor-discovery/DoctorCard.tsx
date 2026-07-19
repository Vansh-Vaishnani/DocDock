import Link from 'next/link';
import { formatDistanceKm, calculateDistanceKm } from '@/lib/locationUtils';

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
    profilePhotoUrl?: string;
  };
  location?: { lat: number; lng: number } | null;
  locationLabel?: string | null;
}

const formatFee = (fee: number) => `₹${fee.toLocaleString('en-IN')}`;

function StarRating({ rating }: { rating: number }) {
  return (
    <span className="flex items-center gap-0.5">
      {[1, 2, 3, 4, 5].map((star) => (
        <svg
          key={star}
          width="12"
          height="12"
          viewBox="0 0 24 24"
          fill={rating >= star ? '#f59e0b' : rating >= star - 0.5 ? 'url(#half)' : 'none'}
          stroke="#f59e0b"
          strokeWidth="1.5"
        >
          <defs>
            <linearGradient id="half">
              <stop offset="50%" stopColor="#f59e0b" />
              <stop offset="50%" stopColor="none" />
            </linearGradient>
          </defs>
          <path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z" />
        </svg>
      ))}
    </span>
  );
}

export function DoctorCard({ doctor, location, locationLabel }: DoctorCardProps) {
  const name = doctor.userId?.fullName || `Dr. ${doctor.specialization}`;
  const isAvailable = doctor.availability?.isAvailable ?? false;
  const distanceValue = typeof doctor.distance === 'number' || typeof doctor.distance === 'string' ? Number(doctor.distance) : NaN;
  const initials = name.split(' ').map((n) => n[0]).join('').slice(0, 2).toUpperCase();
  
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
    return null;
  };
  const finalDistanceLabel = calculateDistance();
  const eta = Number.isFinite(distanceValue) && distanceValue > 0 ? Math.max(5, Math.round((distanceValue / 1000) / 40 * 60)) : null;

  const buildHref = () => {
    if (!location) return `/find-doctors/${doctor._id}`;
    const params = new URLSearchParams({
      lat: location.lat.toString(),
      lng: location.lng.toString(),
      label: locationLabel || `Lat ${location.lat.toFixed(4)}, Lng ${location.lng.toFixed(4)}`
    });
    return `/find-doctors/${doctor._id}?${params.toString()}`;
  };

  const getConsultationModes = (): string[] => {
    const modes = (doctor as any).consultationModes;
    if (Array.isArray(modes) && modes.length > 0) return modes;
    if (doctor.consultationType === 'both') return ['home', 'clinic'];
    if (doctor.consultationType) return [doctor.consultationType];
    return ['home'];
  };

  const modeIcons: Record<string, { label: string; icon: string; color: string }> = {
    home: { label: 'Home Visit', icon: '🏠', color: 'bg-emerald-50 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-400' },
    clinic: { label: 'Clinic', icon: '🏥', color: 'bg-blue-50 text-blue-700 dark:bg-blue-950/40 dark:text-blue-400' },
    online: { label: 'Online', icon: '💻', color: 'bg-violet-50 text-violet-700 dark:bg-violet-950/40 dark:text-violet-400' }
  };

  const modes = getConsultationModes();
  const profilePhoto = doctor.profilePhotoUrl || (doctor as any).user?.avatar || null;

  return (
    <article
      className="group flex h-full flex-col rounded-3xl border transition-all duration-300 hover:-translate-y-1.5 hover:shadow-large overflow-hidden"
      style={{ backgroundColor: 'var(--card-bg)', borderColor: 'var(--card-border)' }}
    >
      {/* Card header strip */}
      <div className="relative h-2 w-full bg-gradient-to-r from-emerald-500 to-teal-500" />

      <div className="flex flex-col flex-1 p-5">
        {/* Top: Avatar + Name + Availability */}
        <div className="flex items-start gap-3.5">
          {/* Doctor Avatar */}
          <div className="flex-shrink-0">
            <div className="h-14 w-14 rounded-2xl overflow-hidden border-2 border-emerald-100 dark:border-emerald-900/40 shadow-sm">
              {profilePhoto ? (
                <img
                  src={profilePhoto}
                  alt={`Photo of ${name}`}
                  className="h-full w-full object-cover"
                  loading="lazy"
                />
              ) : (
                <div className="flex h-full w-full items-center justify-center bg-gradient-to-br from-emerald-100 to-teal-100 dark:from-emerald-950/60 dark:to-teal-950/60 text-lg font-bold text-emerald-700 dark:text-emerald-400">
                  {initials}
                </div>
              )}
            </div>
          </div>

          <div className="flex-1 min-w-0">
            <div className="flex items-start justify-between gap-2">
              <div className="min-w-0">
                <p className="text-[11px] font-bold uppercase tracking-widest text-emerald-600 dark:text-emerald-400">{doctor.specialization}</p>
                <h3 className="mt-0.5 text-base font-bold leading-tight truncate" style={{ color: 'var(--text-primary)' }}>
                  {name}
                </h3>
              </div>
              <span className={`flex-shrink-0 rounded-full px-2.5 py-1 text-[10px] font-bold flex items-center gap-1 ${
                isAvailable
                  ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-400'
                  : 'bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-400'
              }`}>
                <span className={`h-1.5 w-1.5 rounded-full ${isAvailable ? 'bg-emerald-500 animate-pulse' : 'bg-slate-400'}`} />
                {isAvailable ? 'Available' : 'On request'}
              </span>
            </div>

            {/* Rating row */}
            <div className="mt-1.5 flex items-center gap-2">
              <StarRating rating={doctor.averageRating} />
              <span className="text-xs font-semibold text-amber-600 dark:text-amber-400">{doctor.averageRating.toFixed(1)}</span>
              <span className="text-xs" style={{ color: 'var(--text-muted)' }}>({doctor.reviewCount} reviews)</span>
            </div>
          </div>
        </div>

        {/* Bio */}
        {doctor.bio && (
          <p className="mt-3 text-xs leading-relaxed line-clamp-2" style={{ color: 'var(--text-secondary)' }}>
            {doctor.bio}
          </p>
        )}

        {/* Key stats row */}
        <div className="mt-3.5 grid grid-cols-3 gap-2">
          <div className="rounded-xl p-2.5 text-center" style={{ backgroundColor: 'var(--bg-secondary)', border: '1px solid var(--border-color)' }}>
            <p className="text-base font-bold text-emerald-600 dark:text-emerald-400">{formatFee(doctor.consultationFee)}</p>
            <p className="text-[10px] font-medium mt-0.5" style={{ color: 'var(--text-muted)' }}>Fee</p>
          </div>
          <div className="rounded-xl p-2.5 text-center" style={{ backgroundColor: 'var(--bg-secondary)', border: '1px solid var(--border-color)' }}>
            <p className="text-base font-bold" style={{ color: 'var(--text-primary)' }}>{doctor.experience}y</p>
            <p className="text-[10px] font-medium mt-0.5" style={{ color: 'var(--text-muted)' }}>Experience</p>
          </div>
          <div className="rounded-xl p-2.5 text-center" style={{ backgroundColor: 'var(--bg-secondary)', border: '1px solid var(--border-color)' }}>
            <p className="text-base font-bold" style={{ color: 'var(--text-primary)' }}>{eta ? `${eta}m` : '—'}</p>
            <p className="text-[10px] font-medium mt-0.5" style={{ color: 'var(--text-muted)' }}>ETA</p>
          </div>
        </div>

        {/* Consultation modes */}
        <div className="mt-3 flex flex-wrap gap-1.5">
          {modes.slice(0, 3).map((m) => {
            const cfg = modeIcons[m] ?? { label: m, icon: '📋', color: 'bg-slate-100 text-slate-600' };
            return (
              <span key={m} className={`rounded-full px-2.5 py-1 text-[10px] font-bold ${cfg.color} flex items-center gap-1`}>
                {cfg.icon} {cfg.label}
              </span>
            );
          })}
        </div>

        {/* Qualifications */}
        {doctor.qualifications && doctor.qualifications.length > 0 && (
          <div className="mt-2.5 flex flex-wrap gap-1">
            {doctor.qualifications.slice(0, 2).map((q) => (
              <span
                key={q}
                className="rounded-full px-2.5 py-0.5 text-[10px] font-medium"
                style={{ backgroundColor: 'var(--bg-tertiary)', color: 'var(--text-muted)', border: '1px solid var(--border-color)' }}
              >
                {q}
              </span>
            ))}
          </div>
        )}

        {/* Clinic */}
        {(doctor.clinicName || doctor.clinicAddress) && (
          <div className="mt-3 flex items-start gap-1.5 text-xs" style={{ color: 'var(--text-secondary)' }}>
            <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="flex-shrink-0 mt-0.5 text-rose-400">
              <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z M12 7a3 3 0 1 0 0 6 3 3 0 0 0 0-6z" />
            </svg>
            <span className="leading-tight">
              {doctor.clinicName && <span className="font-semibold">{doctor.clinicName} · </span>}
              {doctor.clinicAddress && <span className="truncate">{doctor.clinicAddress.slice(0, 50)}{doctor.clinicAddress.length > 50 ? '…' : ''}</span>}
            </span>
          </div>
        )}

        {/* Spacer */}
        <div className="flex-1" />

        {/* Footer: distance + single CTA */}
        <div className="mt-4 flex items-center justify-between gap-3 border-t pt-4" style={{ borderColor: 'var(--border-color)' }}>
          {finalDistanceLabel ? (
            <div className="flex items-center gap-1.5 rounded-full px-3 py-1.5 text-xs font-semibold text-emerald-600 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-950/30">
              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z M12 7a3 3 0 1 0 0 6 3 3 0 0 0 0-6z" />
              </svg>
              {finalDistanceLabel}
            </div>
          ) : (
            <div className="flex items-center gap-1.5 text-xs" style={{ color: 'var(--text-muted)' }}>
              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <circle cx="12" cy="12" r="10" /><path d="M12 8v4l3 3" />
              </svg>
              {doctor.languages?.join(', ') || 'English'}
            </div>
          )}
          <Link
            href={buildHref()}
            className="btn-primary text-xs px-5 py-2.5 rounded-full font-bold shadow-emerald-sm hover:shadow-emerald group-hover:scale-105 transition-all"
          >
            Book Appointment
          </Link>
        </div>
      </div>
    </article>
  );
}
