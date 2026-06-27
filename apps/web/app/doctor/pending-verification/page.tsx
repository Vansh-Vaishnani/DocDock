'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';

import { useAuth } from '../../auth/auth-context';

export default function DoctorPendingVerificationPage() {
  const router = useRouter();
  const { user } = useAuth();

  useEffect(() => {
    if (user?.isVerified) {
      router.replace('/doctor/dashboard');
    }
  }, [router, user]);

  return (
    <section className="rounded-[28px] border border-amber-200 bg-amber-50 p-6 text-amber-900 shadow-sm">
      <p className="text-sm font-semibold uppercase tracking-[0.35em] text-amber-700">Pending verification</p>
      <h2 className="mt-3 text-2xl font-semibold">Your doctor account is waiting for approval</h2>
      <p className="mt-2 text-amber-800">You can sign in, but the dashboard stays limited until verification is complete.</p>
      <div className="mt-6 rounded-2xl border border-amber-200 bg-white/70 p-5 text-sm text-amber-900">
        We are using the existing session state from the backend. No placeholder account data is created here.
      </div>
    </section>
  );
}