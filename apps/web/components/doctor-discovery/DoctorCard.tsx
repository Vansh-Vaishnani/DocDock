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
          width="13"
          height="13"
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

  const modeConfig: Record<string, { label: string; icon: string; bg: string; color: string }> = {
    home:   { label: 'Home Visit', icon: '🏠', bg: 'rgba(16,185,129,0.08)', color: '#059669' },
    clinic: { label: 'Clinic',     icon: '🏥', bg: 'rgba(59,130,246,0.08)', color: '#2563eb' },
    online: { label: 'Online',     icon: '💻', bg: 'rgba(139,92,246,0.08)', color: '#7c3aed' },
  };

  const modes = getConsultationModes();
  const profilePhoto = doctor.profilePhotoUrl || (doctor as any).user?.avatar || null;

  return (
    <article
      className="group flex h-full flex-col overflow-hidden transition-all duration-300 hover:-translate-y-2"
      style={{
        borderRadius: '20px',
        border: '1px solid var(--card-border)',
        backgroundColor: 'var(--card-bg)',
        boxShadow: 'var(--card-shadow)',
      }}
      onMouseEnter={(e) => {
        (e.currentTarget as HTMLElement).style.boxShadow = 'var(--card-shadow-hover)';
        (e.currentTarget as HTMLElement).style.borderColor = 'rgba(16,185,129,0.3)';
      }}
      onMouseLeave={(e) => {
        (e.currentTarget as HTMLElement).style.boxShadow = 'var(--card-shadow)';
        (e.currentTarget as HTMLElement).style.borderColor = 'var(--card-border)';
      }}
    >
      {/* Gradient top accent */}
      <div className="h-1.5 w-full" style={{ background: 'linear-gradient(90deg, #10b981 0%, #059669 50%, #0d9488 100%)' }} />

      <div className="flex flex-col flex-1 p-5">
        {/* Header: Avatar + Info */}
        <div className="flex items-start gap-4">
          {/* Avatar */}
          <div className="flex-shrink-0">
            <div
              className="h-[72px] w-[72px] rounded-2xl overflow-hidden transition-transform duration-300 group-hover:scale-105"
              style={{ border: '2px solid rgba(16,185,129,0.2)', boxShadow: '0 4px 14px -4px rgba(16,185,129,0.25)' }}
            >
              {profilePhoto ? (
                <img
                  src={profilePhoto}
                  alt={`Photo of ${name}`}
                  className="h-full w-full object-cover"
                  loading="lazy"
                />
              ) : (
                <div
                  className="flex h-full w-full items-center justify-center text-lg font-bold"
                  style={{ background: 'linear-gradient(135deg, #d1fae5, #a7f3d0)', color: '#065f46' }}
                >
                  {initials}
                </div>
              )}
            </div>
          </div>

          {/* Name + Specialization + Rating */}
          <div className="flex-1 min-w-0">
            <div className="flex items-start justify-between gap-2 mb-1">
              <p
                className="text-[10px] font-bold uppercase tracking-widest"
                style={{ color: '#10b981', letterSpacing: '0.1em' }}
              >
                {doctor.specialization}
              </p>
              {/* Availability badge */}
              <span
                className="flex-shrink-0 flex items-center gap-1.5 rounded-full px-2.5 py-1 text-[10px] font-bold"
                style={{
                  background: isAvailable ? 'rgba(16,185,129,0.1)' : 'rgba(100,116,139,0.1)',
                  color: isAvailable ? '#059669' : 'var(--text-muted)',
                  border: isAvailable ? '1px solid rgba(16,185,129,0.2)' : '1px solid rgba(100,116,139,0.15)',
                }}
              >
                <span
                  className={`h-1.5 w-1.5 rounded-full ${isAvailable ? 'animate-pulse' : ''}`}
                  style={{ background: isAvailable ? '#10b981' : 'var(--text-muted)' }}
                />
                {isAvailable ? 'Available' : 'On request'}
              </span>
            </div>

            <h3 className="text-base font-bold leading-tight truncate" style={{ color: 'var(--text-primary)', letterSpacing: '-0.02em' }}>
              {name}
            </h3>

            {/* Rating */}
            <div className="mt-1.5 flex items-center gap-1.5">
              <StarRating rating={doctor.averageRating} />
              <span className="text-xs font-bold" style={{ color: '#f59e0b' }}>{doctor.averageRating.toFixed(1)}</span>
              <span className="text-xs" style={{ color: 'var(--text-muted)' }}>({doctor.reviewCount})</span>
            </div>
          </div>
        </div>

        {/* Bio */}
        {doctor.bio && (
          <p className="mt-3.5 text-xs leading-relaxed truncate-2" style={{ color: 'var(--text-secondary)' }}>
            {doctor.bio}
          </p>
        )}

        {/* Key stats */}
        <div className="mt-4 grid grid-cols-2 gap-2">
          {[
            { label: 'Consultation Fee', value: formatFee(doctor.consultationFee), color: 'text-emerald-600 dark:text-emerald-400' },
            { label: 'Experience', value: `${doctor.experience} Years`, color: 'var(--text-primary)' },
          ].map((stat) => (
            <div
              key={stat.label}
              className="rounded-xl p-2.5 text-center"
              style={{ background: 'var(--bg-secondary)', border: '1px solid var(--border-color)' }}
            >
              <p className={`text-sm font-bold leading-tight ${typeof stat.color === 'string' && stat.color.startsWith('text-') ? stat.color : ''}`}
                style={typeof stat.color === 'string' && !stat.color.startsWith('text-') ? { color: stat.color } : {}}>
                {stat.value}
              </p>
              <p className="text-[10px] font-medium mt-0.5" style={{ color: 'var(--text-muted)' }}>{stat.label}</p>
            </div>
          ))}
        </div>

        {/* Consultation modes */}
        <div className="mt-3 flex flex-wrap gap-1.5">
          {modes.slice(0, 3).map((m) => {
            const modeIcons: Record<string, { label: string; bg: string; color: string; path: string }> = {
              home: { label: 'Home Visit', bg: 'rgba(16,185,129,0.08)', color: '#059669', path: 'M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z' },
              clinic: { label: 'Clinic', bg: 'rgba(59,130,246,0.08)', color: '#2563eb', path: 'M19 21V5a2 2 0 0 0-2-2H7a2 2 0 0 0-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5' },
              online: { label: 'Online', bg: 'rgba(139,92,246,0.08)', color: '#7c3aed', path: 'M23 7l-7 5 7 5V7z M14 5H3a2 2 0 0 0-2 2v10a2 2 0 0 0 2 2h11a2 2 0 0 0 2-2V7a2 2 0 0 0-2-2z' },
            };
            const cfg = modeIcons[m] ?? { label: m, bg: 'rgba(100,116,139,0.1)', color: 'var(--text-secondary)', path: 'M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z' };
            return (
              <span
                key={m}
                className="flex items-center gap-1.5 rounded-full px-2.5 py-1 text-[10px] font-bold"
                style={{ background: cfg.bg, color: cfg.color }}
              >
                <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d={cfg.path} />
                </svg>
                {cfg.label}
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
                style={{ background: 'var(--bg-tertiary)', color: 'var(--text-muted)', border: '1px solid var(--border-color)' }}
              >
                {q}
              </span>
            ))}
          </div>
        )}

        {/* Clinic */}
        {(doctor.clinicName || doctor.clinicAddress) && (
          <div className="mt-3 flex items-start gap-1.5 text-xs" style={{ color: 'var(--text-secondary)' }}>
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="flex-shrink-0 mt-0.5" style={{ color: '#f43f5e' }}>
              <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z M12 7a3 3 0 1 0 0 6 3 3 0 0 0 0-6z" />
            </svg>
            <span className="leading-tight line-clamp-1">
              {doctor.clinicName && <span className="font-semibold">{doctor.clinicName}{doctor.clinicAddress ? ' · ' : ''}</span>}
              {doctor.clinicAddress && <span>{doctor.clinicAddress.slice(0, 45)}{doctor.clinicAddress.length > 45 ? '…' : ''}</span>}
            </span>
          </div>
        )}

        {/* Spacer */}
        <div className="flex-1" />

        {/* Footer: distance + CTA */}
        <div className="mt-4 flex items-center justify-between gap-3 pt-4" style={{ borderTop: '1px solid var(--border-color)' }}>
          {finalDistanceLabel ? (
            <div className="flex items-center gap-1.5 rounded-full px-3 py-1.5 text-xs font-semibold" style={{ background: 'rgba(16,185,129,0.08)', color: '#059669', border: '1px solid rgba(16,185,129,0.15)' }}>
              <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z M12 7a3 3 0 1 0 0 6 3 3 0 0 0 0-6z" />
              </svg>
              {finalDistanceLabel}
            </div>
          ) : (
            <div className="flex items-center gap-1 text-xs" style={{ color: 'var(--text-muted)' }}>
              <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <circle cx="12" cy="12" r="10" /><path d="M12 8v4l3 3" />
              </svg>
              {doctor.languages?.slice(0, 2).join(', ') || 'English'}
            </div>
          )}

          <Link
            href={buildHref()}
            className="btn-primary text-[11px] px-4 py-2 rounded-xl font-bold transition-all group-hover:scale-105"
          >
            Book Now
          </Link>
        </div>
      </div>
    </article>
  );
}
