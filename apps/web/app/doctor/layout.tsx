'use client';

import type { ReactNode } from 'react';

import { AuthGuard } from '../auth/auth-context';
import { DoctorShell } from './_components/doctor-shell';

export default function DoctorLayout({ children }: { children: ReactNode }) {
  return (
    <AuthGuard allowedRoles={['doctor']}>
      <DoctorShell>{children}</DoctorShell>
    </AuthGuard>
  );
}