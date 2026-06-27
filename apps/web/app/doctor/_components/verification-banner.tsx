'use client';

import { useEffect, useState } from 'react';

import { fetchDoctorProfile, type DoctorProfile } from '../api';

export function VerificationBanner() {
  const [profile, setProfile] = useState<DoctorProfile | null>(null);

  useEffect(() => {
    void fetchDoctorProfile()
      .then(setProfile)
      .catch(() => setProfile(null));
  }, []);

  if (!profile || profile.verificationStatus === 'approved') {
    return null;
  }

  const message =
    profile.verificationStatus === 'rejected'
      ? 'Your account verification was rejected. Please contact support or update your documents.'
      : 'Your account is awaiting admin verification.';

  return (
    <div className="rounded-[24px] border border-amber-200 bg-amber-50 px-5 py-4 text-sm text-amber-900">
      <p className="font-semibold">{message}</p>
      <p className="mt-1 text-amber-800">You cannot accept appointments until your account is verified.</p>
    </div>
  );
}
