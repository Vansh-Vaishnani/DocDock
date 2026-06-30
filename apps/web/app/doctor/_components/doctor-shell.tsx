'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { type ReactNode, useMemo } from 'react';

import { useAuth } from '../../auth/auth-context';
import { VerificationBanner } from './verification-banner';
import NotificationBell from '@/components/NotificationBell';

const navItems = [
  { href: '/doctor/dashboard', label: 'Dashboard' },
  { href: '/doctor/profile', label: 'Profile' },
  { href: '/doctor/availability', label: 'Availability' },
  { href: '/doctor/appointments', label: 'Appointments' },
  { href: '/doctor/prescriptions', label: 'Prescriptions' },
  { href: '/doctor/earnings', label: 'Earnings' },
  { href: '/doctor/settings', label: 'Settings' }
];

export function DoctorShell({ children }: { children: ReactNode }) {
  const pathname = usePathname();
  const { user, logout } = useAuth();

  const activeItem = useMemo(() => {
    return navItems.find((item) => pathname === item.href || pathname.startsWith(`${item.href}/`)) ?? navItems[0];
  }, [pathname]);

  return (
    <div className="min-h-screen bg-[radial-gradient(circle_at_top_left,_#eefaf4,_#f8fafc_45%,_#eff6ff)] text-slate-900">
      <div className="mx-auto grid min-h-screen max-w-7xl gap-6 px-4 py-4 sm:px-6 lg:grid-cols-[280px_minmax(0,1fr)] lg:px-8">
        <aside className="flex flex-col rounded-[28px] border border-slate-200/80 bg-white/90 p-5 shadow-[0_20px_60px_-30px_rgba(15,23,42,0.35)] backdrop-blur">
          <div className="rounded-[22px] bg-slate-950 p-5 text-white">
            <p className="text-xs font-semibold uppercase tracking-[0.35em] text-emerald-300">Doctor portal</p>
            <h1 className="mt-3 text-2xl font-semibold">DocDock</h1>
            <p className="mt-2 text-sm text-slate-300">Practice tools for your dashboard, availability, and appointments.</p>
          </div>

          <nav className="mt-6 space-y-2">
            {navItems.map((item) => {
              const isActive = activeItem.href === item.href;
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  className={`flex items-center justify-between rounded-2xl px-4 py-3 text-sm font-medium transition ${
                    isActive ? 'bg-emerald-600 text-white shadow-lg shadow-emerald-600/20' : 'text-slate-700 hover:bg-slate-100'
                  }`}
                >
                  <span>{item.label}</span>
                  {isActive && <span className="h-2 w-2 rounded-full bg-white" />}
                </Link>
              );
            })}
          </nav>

          <div className="mt-6 rounded-2xl border border-slate-200 bg-slate-50 p-4 text-sm text-slate-600">
            <p className="font-semibold text-slate-900">Signed in as</p>
            <p className="mt-1 break-words">{user?.fullName || 'Doctor'}</p>
            <p className="break-words text-xs text-slate-500">{user?.email}</p>
          </div>

          <div className="mt-auto space-y-3 pt-6">
            <Link href="/find-doctors" className="block rounded-2xl border border-slate-300 px-4 py-3 text-center text-sm font-semibold text-slate-700 transition hover:bg-slate-100">
              Find doctors
            </Link>
            <button type="button" onClick={logout} className="w-full rounded-2xl border border-slate-300 px-4 py-3 text-sm font-semibold text-slate-700 transition hover:bg-slate-100">
              Log out
            </button>
          </div>
        </aside>

        <div className="flex min-w-0 flex-col gap-6">
          <header className="relative z-30 rounded-[28px] border border-slate-200/80 bg-white/90 px-5 py-4 shadow-[0_20px_60px_-30px_rgba(15,23,42,0.28)] backdrop-blur sm:px-6">
            <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
              <div>
                <p className="text-xs font-semibold uppercase tracking-[0.35em] text-emerald-600">{activeItem.label}</p>
                <p className="mt-1 text-sm text-slate-500">Manage your practice from one place.</p>
              </div>
              <div className="flex items-center gap-3">
                <NotificationBell />
                <Link href="/" className="rounded-full bg-slate-950 px-4 py-2 text-sm font-medium text-white transition hover:bg-slate-800">
                  Home
                </Link>
              </div>
            </div>
          </header>

          <VerificationBanner />
          <main className="flex-1">{children}</main>
        </div>
      </div>
    </div>
  );
}
