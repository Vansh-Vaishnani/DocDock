import Link from 'next/link';

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
    availability?: { isAvailable?: boolean };
    userId?: { fullName?: string };
  };
}

const formatFee = (fee: number) => `₹${fee}`;

export function DoctorCard({ doctor }: DoctorCardProps) {
  const name = doctor.userId?.fullName || `Dr. ${doctor.specialization}`;
  const availabilityLabel = doctor.availability?.isAvailable ? 'Available now' : 'On request';

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
      </div>

      <div className="mt-5 flex flex-wrap gap-2">
        {doctor.qualifications?.slice(0, 3).map((item) => (
          <span key={item} className="rounded-full bg-slate-100 px-3 py-1 text-xs font-medium text-slate-700">
            {item}
          </span>
        ))}
      </div>

      <Link href={`/find-doctors/${doctor._id}`} className="mt-6 inline-flex items-center justify-center rounded-full bg-slate-900 px-4 py-2 text-sm font-medium text-white transition hover:bg-slate-700">
        View profile
      </Link>
    </article>
  );
}
