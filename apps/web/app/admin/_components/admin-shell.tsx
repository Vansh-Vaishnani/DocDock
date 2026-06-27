'use client';

import Link from 'next/link';
import { type ReactNode } from 'react';

import { useAuth } from '../../auth/auth-context';

export function AdminShell({ children }: { children: ReactNode }) {
  const { user, logout } = useAuth();

  return (
    <div className="min-h-screen bg-[radial-gradient(circle_at_top_left,_#f8fafc,_#eef2ff_45%,_#ecfeff)] text-slate-900">
      <div className="mx-auto max-w-7xl px-4 py-4 sm:px-6 lg:px-8">
        <div className="grid gap-6 lg:grid-cols-[260px_minmax(0,1fr)]">
          <aside className="flex flex-col rounded-[28px] border border-slate-200/80 bg-white/90 p-5 shadow-[0_20px_60px_-30px_rgba(15,23,42,0.35)] backdrop-blur">
            <div className="rounded-[22px] bg-slate-950 p-5 text-white">
              <p className="text-xs font-semibold uppercase tracking-[0.35em] text-emerald-300">Admin portal</p>
              <h1 className="mt-3 text-2xl font-semibold">DocDock</h1>
              <p className="mt-2 text-sm text-slate-300">Platform administration and verification controls.</p>
            </div>

            <div className="mt-6 rounded-2xl border border-slate-200 bg-slate-50 p-4 text-sm text-slate-600">
              <p className="font-semibold text-slate-900">Signed in as</p>
              <p className="mt-1 break-words">{user?.fullName || 'Admin'}</p>
              <p className="break-words text-xs text-slate-500">{user?.email}</p>
            </div>

            <div className="mt-auto pt-6 space-y-3">
              <Link href="/" className="block rounded-2xl border border-slate-300 px-4 py-3 text-center text-sm font-semibold text-slate-700 transition hover:bg-slate-100">
                Home
              </Link>
              <button
                type="button"
                onClick={logout}
                className="w-full rounded-2xl border border-slate-300 px-4 py-3 text-sm font-semibold text-slate-700 transition hover:bg-slate-100"
              >
                Log out
              </button>
            </div>
          </aside>

          <main className="flex min-w-0 flex-col gap-6 rounded-[28px] border border-slate-200/80 bg-white/90 p-6 shadow-[0_20px_60px_-30px_rgba(15,23,42,0.28)] backdrop-blur">
            {children}
          </main>
        </div>
      </div>
    </div>
  );
}