'use client';

import type { ReactNode } from 'react';

import { AuthGuard } from '../auth/auth-context';
import { PatientShell } from './_components/patient-shell';

export default function PatientLayout({ children }: { children: ReactNode }) {
  return (
    <AuthGuard allowedRoles={['patient']}>
      <PatientShell>{children}</PatientShell>
    </AuthGuard>
  );
}
