'use client';

import type { ReactNode } from 'react';

import { AuthGuard } from '../auth/auth-context';
import { AdminShell } from './_components/admin-shell';

export default function AdminLayout({ children }: { children: ReactNode }) {
  return (
    <AuthGuard allowedRoles={['admin']}>
      <AdminShell>{children}</AdminShell>
    </AuthGuard>
  );
}