'use client';

import Link from 'next/link';

import { getRoleHomePath, useAuth } from './auth/auth-context';

export default function HomePage() {
  const { user, isHydrated, logout } = useAuth();

  const guestActions = [
    { label: 'Login', href: '/auth/login' },
    { label: 'Register', href: '/auth/register' },
    { label: 'Find Doctors', href: '/find-doctors' }
  ];

  const roleActions = user?.role === 'patient'
    ? [
      { label: 'Dashboard', href: getRoleHomePath(user) },
      { label: 'Profile', href: '/patient/profile' },
      { label: 'Find Doctors', href: '/find-doctors' }
    ]
    : user?.role === 'doctor'
      ? [
        { label: 'Dashboard', href: getRoleHomePath(user) },
        { label: 'Profile', href: '/doctor/profile' },
        { label: 'Availability', href: '/doctor/availability' },
        { label: 'Appointments', href: '/doctor/appointments' }
      ]
      : user?.role === 'admin'
        ? [{ label: 'Dashboard', href: getRoleHomePath(user) }]
        : [];

  return (
    <main className="min-h-screen bg-slate-50 p-6 text-slate-900">
      <section className="mx-auto max-w-6xl">
        <div className="rounded-3xl bg-white p-10 shadow-lg ring-1 ring-slate-200">
          <div className="flex flex-col gap-6 lg:flex-row lg:items-end lg:justify-between">
            <div>
              <h1 className="text-4xl font-semibold">DocDock</h1>
              <p className="mt-4 max-w-2xl text-lg text-slate-600">
                Doctor-on-demand home consultation platform for patients, doctors, and admins.
              </p>
            </div>
            <div className="flex flex-wrap gap-3">
              {!isHydrated && (
                <span className="rounded-full border border-slate-200 px-5 py-3 text-sm font-semibold text-slate-500">Loading session...</span>
              )}

              {isHydrated && !user && guestActions.map((action) => (
                <Link
                  key={action.label}
                  href={action.href}
                  className={action.label === 'Login' ? 'inline-flex items-center justify-center rounded-full bg-emerald-600 px-5 py-3 text-sm font-semibold text-white transition hover:bg-emerald-700' : 'rounded-full border border-slate-300 px-5 py-3 text-sm font-semibold text-slate-700 transition hover:bg-slate-100'}
                >
                  {action.label}
                </Link>
              ))}

              {isHydrated && user && roleActions.map((action) => (
                <Link
                  key={action.label}
                  href={action.href}
                  className={action.label.includes('Dashboard') ? 'inline-flex items-center justify-center rounded-full bg-emerald-600 px-5 py-3 text-sm font-semibold text-white transition hover:bg-emerald-700' : 'rounded-full border border-slate-300 px-5 py-3 text-sm font-semibold text-slate-700 transition hover:bg-slate-100'}
                >
                  {action.label}
                </Link>
              ))}

              {isHydrated && user && (
                <button onClick={logout} className="rounded-full border border-slate-300 px-5 py-3 text-sm font-semibold text-slate-700 transition hover:bg-slate-100">
                  Logout
                </button>
              )}
            </div>
          </div>

          <div className="mt-8 grid gap-4 md:grid-cols-3">
            <div className="rounded-2xl border border-slate-200 p-6">
              <h2 className="text-xl font-semibold">Patient</h2>
              <p className="mt-2 text-sm text-slate-600">Find nearby verified doctors, book appointments, and track visits live.</p>
            </div>
            <div className="rounded-2xl border border-slate-200 p-6">
              <h2 className="text-xl font-semibold">Doctor</h2>
              <p className="mt-2 text-sm text-slate-600">Manage availability, appointments, prescriptions, and earnings.</p>
            </div>
            <div className="rounded-2xl border border-slate-200 p-6">
              <h2 className="text-xl font-semibold">Admin</h2>
              <p className="mt-2 text-sm text-slate-600">Verify doctors and monitor platform health.</p>
            </div>
          </div>
        </div>
      </section>
    </main>
  );
}
