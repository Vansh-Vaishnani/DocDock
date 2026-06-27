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
          setError(err instanceof Error ? err.message : 'Patient profile API is not available yet.');
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

  return (
    <div className="space-y-6">
      <section className="rounded-[28px] border border-slate-200 bg-white p-6 shadow-sm sm:p-8">
        <div className="flex flex-col gap-6 lg:flex-row lg:items-end lg:justify-between">
          <div className="max-w-3xl">
            <p className="text-sm font-semibold uppercase tracking-[0.35em] text-emerald-600">Patient dashboard</p>
            <h2 className="mt-3 text-3xl font-semibold sm:text-4xl">Welcome back, {user?.fullName || 'patient'}</h2>
            <p className="mt-3 text-lg text-slate-600">Keep your profile, address book, allergies, and medical history in one place.</p>
          </div>
          <div className="flex flex-wrap gap-3">
            <Link href="/patient/profile" className="rounded-full bg-slate-950 px-5 py-3 text-sm font-semibold text-white transition hover:bg-slate-800">View profile</Link>
            <Link href="/patient/addresses" className="rounded-full border border-slate-300 px-5 py-3 text-sm font-semibold text-slate-700 transition hover:bg-slate-100">Manage addresses</Link>
          </div>
        </div>
      </section>

      {error && <div className="rounded-[24px] border border-amber-200 bg-amber-50 px-5 py-4 text-sm text-amber-800">{error}</div>}

      <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        <StatCard label="Profile status" value={loading ? '...' : profile ? 'Ready' : 'Partial'} detail={profile ? 'Backend profile data loaded.' : 'Core session is active; profile API is pending.'} />
        <StatCard label="Saved addresses" value={loading ? '...' : String(addressCount)} detail="Addresses will sync here once the list endpoint is available." />
        <StatCard label="Allergies" value={loading ? '...' : String(allergyCount)} detail="Medical safety details are kept inside your patient record." />
        <StatCard label="Medical notes" value={loading ? '...' : String(historyCount)} detail="History entries appear here when the API exposes them." />
      </section>

      <section className="grid gap-6 lg:grid-cols-[1.2fr_0.8fr]">
        <div className="rounded-[24px] border border-slate-200 bg-white p-6 shadow-sm">
          <h3 className="text-xl font-semibold text-slate-900">Your next steps</h3>
          <div className="mt-5 grid gap-4 sm:grid-cols-2">
            {[
              { title: 'Complete profile', description: 'Review your contact details and blood group.' },
              { title: 'Add addresses', description: 'Store home and emergency locations.' },
              { title: 'Update allergies', description: 'Keep medication and food sensitivities current.' },
              { title: 'Review settings', description: 'Manage notifications and privacy preferences.' }
            ].map((item) => (
              <div key={item.title} className="rounded-2xl border border-slate-200 p-4">
                <p className="font-semibold text-slate-900">{item.title}</p>
                <p className="mt-2 text-sm text-slate-600">{item.description}</p>
              </div>
            ))}
          </div>
        </div>

        <div className="rounded-[24px] bg-slate-950 p-6 text-white shadow-sm">
          <p className="text-sm font-semibold uppercase tracking-[0.35em] text-emerald-300">Patient account</p>
          <h3 className="mt-3 text-2xl font-semibold">Secure access</h3>
          <p className="mt-3 text-sm leading-6 text-slate-300">Your session, profile, and future patient APIs are routed through the existing auth stack, so the module stays aligned with the current architecture.</p>
          <div className="mt-6 space-y-3 text-sm text-slate-300">
            <p>• Protected patient routes</p>
            <p>• Backend-backed address creation</p>
            <p>• Ready for profile and record APIs</p>
          </div>
        </div>
      </section>
    </div>
  );
}