'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';

import { useAuth } from '../../auth/auth-context';
import { fetchPatientProfile, type PatientProfile } from '../api';

function StatCard({ label, value, detail }: { label: string; value: string; detail: string }) {
  return (
    <div className="rounded-[24px] border border-slate-200 bg-white p-5 shadow-sm">
      <p className="text-sm font-medium text-slate-500">{label}</p>
      <p className="mt-2 text-3xl font-semibold text-slate-900">{value}</p>
      <p className="mt-2 text-sm text-slate-600">{detail}</p>
    </div>
  );
}

export default function PatientDashboardPage() {
  const { user } = useAuth();
  const [profile, setProfile] = useState<PatientProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let mounted = true;

    const load = async () => {
      setLoading(true);
      try {
        const result = await fetchPatientProfile();
        if (mounted) {
          setProfile(result);
          setError(null);
        }
      } catch (err: unknown) {
        if (mounted) {
          setProfile(null);
          setError(err instanceof Error ? err.message : 'Unable to load your profile.');
        }
      } finally {
        if (mounted) {
          setLoading(false);
        }
      }
    };

    void load();

    return () => {
      mounted = false;
    };
  }, []);

  const addressCount = profile?.addresses?.length ?? 0;
  const allergyCount = profile?.allergies?.length ?? 0;
  const historyCount = profile?.medicalHistory?.length ?? 0;
  const profileComplete = profile?.fullName && profile?.phone && profile?.bloodGroup;

  return (
    <div className="space-y-6">
      <section className="rounded-[28px] border border-slate-200 bg-white p-6 shadow-sm sm:p-8">
        <div className="flex flex-col gap-6 lg:flex-row lg:items-end lg:justify-between">
          <div className="max-w-3xl">
            <p className="text-sm font-semibold uppercase tracking-[0.35em] text-emerald-600">Patient dashboard</p>
            <h2 className="mt-3 text-3xl font-semibold sm:text-4xl">Welcome back, {user?.fullName || profile?.fullName || 'patient'}</h2>
            <p className="mt-3 text-lg text-slate-600">Keep your profile, address book, allergies, and medical history in one place.</p>
          </div>
          <div className="flex flex-wrap gap-3">
            <Link href="/find-doctors" className="rounded-full bg-emerald-600 px-5 py-3 text-sm font-semibold text-white transition hover:bg-emerald-700">Find doctors</Link>
            <Link href="/patient/appointments" className="rounded-full bg-slate-950 px-5 py-3 text-sm font-semibold text-white transition hover:bg-slate-800">My appointments</Link>
            <Link href="/patient/profile" className="rounded-full border border-slate-300 px-5 py-3 text-sm font-semibold text-slate-700 transition hover:bg-slate-100">View profile</Link>
            <Link href="/patient/addresses" className="rounded-full border border-slate-300 px-5 py-3 text-sm font-semibold text-slate-700 transition hover:bg-slate-100">Manage addresses</Link>
          </div>
        </div>
      </section>

      {error && <div className="rounded-[24px] border border-rose-200 bg-rose-50 px-5 py-4 text-sm text-rose-700">{error}</div>}

      <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        <StatCard
          label="Profile status"
          value={loading ? '...' : profileComplete ? 'Complete' : 'Incomplete'}
          detail={profileComplete ? 'Your profile details are up to date.' : 'Add your blood group and contact details.'}
        />
        <StatCard label="Saved addresses" value={loading ? '...' : String(addressCount)} detail={addressCount > 0 ? 'Addresses ready for home visits.' : 'Add an address for doctor visits.'} />
        <StatCard label="Allergies" value={loading ? '...' : String(allergyCount)} detail={allergyCount > 0 ? 'Allergies recorded for safer care.' : 'No allergies recorded yet.'} />
        <StatCard label="Medical notes" value={loading ? '...' : String(historyCount)} detail={historyCount > 0 ? 'Medical history entries on file.' : 'Add medical history when ready.'} />
      </section>

      <section className="grid gap-6 lg:grid-cols-[1.2fr_0.8fr]">
        <div className="rounded-[24px] border border-slate-200 bg-white p-6 shadow-sm">
          <h3 className="text-xl font-semibold text-slate-900">Your next steps</h3>
          <div className="mt-5 grid gap-4 sm:grid-cols-2">
            {[
              { title: 'Complete profile', description: 'Review your contact details and blood group.', href: '/patient/profile' },
              { title: 'Add addresses', description: 'Store home and emergency locations.', href: '/patient/addresses' },
              { title: 'Update allergies', description: 'Keep medication and food sensitivities current.', href: '/patient/allergies' },
              { title: 'Review settings', description: 'Manage password and account preferences.', href: '/patient/settings' }
            ].map((item) => (
              <Link key={item.title} href={item.href} className="rounded-2xl border border-slate-200 p-4 transition hover:border-emerald-300 hover:bg-emerald-50/50">
                <p className="font-semibold text-slate-900">{item.title}</p>
                <p className="mt-2 text-sm text-slate-600">{item.description}</p>
              </Link>
            ))}
          </div>
        </div>

        <div className="rounded-[24px] bg-slate-950 p-6 text-white shadow-sm">
          <p className="text-sm font-semibold uppercase tracking-[0.35em] text-emerald-300">Quick summary</p>
          <h3 className="mt-3 text-2xl font-semibold">Your health record</h3>
          {loading ? (
            <p className="mt-3 text-sm text-slate-300">Loading profile...</p>
          ) : profile ? (
            <div className="mt-6 space-y-3 text-sm text-slate-300">
              <p>• Blood group: {profile.bloodGroup || 'Not set'}</p>
              <p>• Email: {profile.email}</p>
              <p>• Phone: {profile.phone}</p>
              <p>• Default address: {profile.addresses.find((a) => a.isDefault)?.label || 'None set'}</p>
            </div>
          ) : (
            <p className="mt-3 text-sm text-slate-300">Profile data unavailable.</p>
          )}
        </div>
      </section>
    </div>
  );
}
