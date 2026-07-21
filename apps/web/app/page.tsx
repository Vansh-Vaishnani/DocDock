'use client';

import Link from 'next/link';
import Image from 'next/image';
import { getRoleHomePath, useAuth } from './auth/auth-context';
import { DarkModeToggle } from './theme-context';

// ─── Inline Icons ─────────────────────────────────────────────
function Icon({ path, size = 20, className = '' }: { path: string; size?: number; className?: string }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" className={className}>
      <path d={path} />
    </svg>
  );
}

// ─── Features ─────────────────────────────────────────────────
const features = [
  {
    icon: 'M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z',
    title: 'Verified Doctors',
    description: 'Every doctor is background-checked and credentials-verified before joining the platform.',
    color: 'from-rose-500/10 to-rose-500/5',
    iconColor: 'text-rose-600 dark:text-rose-400',
    border: 'rgba(244,63,94,0.12)',
  },
  {
    icon: 'M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z M12 7a3 3 0 1 0 0 6 3 3 0 0 0 0-6z',
    title: 'Live GPS Tracking',
    description: 'Track your doctor in real-time on the map as they travel to your location.',
    color: 'from-blue-500/10 to-blue-500/5',
    iconColor: 'text-blue-600 dark:text-blue-400',
    border: 'rgba(59,130,246,0.12)',
  },
  {
    icon: 'M8 6h13M8 12h13M8 18h13M3 6h.01M3 12h.01M3 18h.01',
    title: 'Instant Booking',
    description: 'Book a home visit appointment in under 60 seconds, any time of day or night.',
    color: 'from-emerald-500/10 to-emerald-500/5',
    iconColor: 'text-emerald-600 dark:text-emerald-400',
    border: 'rgba(16,185,129,0.12)',
  },
  {
    icon: 'M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9 M13.73 21a2 2 0 0 1-3.46 0',
    title: 'OTP Consultation',
    description: 'Secure consultations with OTP verification ensuring only verified patients are seen.',
    color: 'from-amber-500/10 to-amber-500/5',
    iconColor: 'text-amber-600 dark:text-amber-400',
    border: 'rgba(245,158,11,0.12)',
  },
  {
    icon: 'M9 11l3 3L22 4 M21 12v7a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11',
    title: 'Digital Prescriptions',
    description: 'Receive and share digital prescriptions, medical records, and consultation notes.',
    color: 'from-violet-500/10 to-violet-500/5',
    iconColor: 'text-violet-600 dark:text-violet-400',
    border: 'rgba(139,92,246,0.12)',
  },
  {
    icon: 'M12 1v22M17 5H9.5a3.5 3.5 0 1 0 0 7h5a3.5 3.5 0 1 1 0 7H6',
    title: 'Transparent Payments',
    description: 'Secure payments with full receipts, refund tracking, and earnings dashboards.',
    color: 'from-teal-500/10 to-teal-500/5',
    iconColor: 'text-teal-600 dark:text-teal-400',
    border: 'rgba(20,184,166,0.12)',
  },
];

const roleCards = [
  {
    role: 'Patient',
    iconPath: 'M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2 M12 11a4 4 0 1 0 0-8 4 4 0 0 0 0 8z',
    description: 'Find nearby verified doctors, book home visits, track visits live, and manage your complete health record.',
    bullets: ['Smart doctor search', 'Live GPS tracking', 'OTP consultation', 'Digital prescriptions'],
    ctaLabel: 'Book a Doctor',
    ctaHref: '/find-doctors',
    gradient: 'linear-gradient(135deg, #10b981, #059669)',
    badgeBg: 'rgba(16,185,129,0.12)',
    badgeColor: '#059669',
  },
  {
    role: 'Doctor',
    iconPath: 'M19 21V5a2 2 0 0 0-2-2H7a2 2 0 0 0-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5',
    description: 'Manage your schedule, appointments, prescriptions, and earnings — all from one powerful dashboard.',
    bullets: ['Appointment management', 'Earnings dashboard', 'Digital prescriptions', 'Real-time notifications'],
    ctaLabel: 'Join as Doctor',
    ctaHref: '/auth/register?role=doctor',
    gradient: 'linear-gradient(135deg, #3b82f6, #2563eb)',
    badgeBg: 'rgba(59,130,246,0.12)',
    badgeColor: '#2563eb',
  },
];

const stats = [
  { value: '10,000+', label: 'Consultations', icon: 'M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2' },
  { value: '500+', label: 'Verified Doctors', icon: 'M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z' },
  { value: '50+', label: 'Specialties', icon: 'M9 11l3 3L22 4' },
  { value: '4.8★', label: 'Average Rating', icon: 'M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z' },
];

export default function HomePage() {
  const { user, isHydrated, logout } = useAuth();

  return (
    <div className="min-h-screen" style={{ backgroundColor: 'var(--bg-primary)' }}>
      {/* ─── Top Navbar ─────────────────────────────────────── */}
      <header
        className="sticky top-0 z-50 border-b"
        style={{
          backgroundColor: 'var(--header-bg)',
          borderColor: 'var(--border-color)',
          backdropFilter: 'blur(20px) saturate(180%)',
          WebkitBackdropFilter: 'blur(20px) saturate(180%)',
        }}
      >
        <div className="mx-auto flex h-[60px] max-w-7xl items-center justify-between px-4 sm:px-6 lg:px-8">
          {/* Logo */}
          <Link href="/" className="flex items-center gap-3">
            <div style={{ width: 34, height: 34, borderRadius: 12, overflow: 'hidden', flexShrink: 0, display: 'inline-flex', boxShadow: '0 2px 8px rgba(16,185,129,0.2)' }}>
              <Image src="/logo.png" alt="DocDock Logo" width={34} height={34} style={{ display: 'block', width: 34, height: 34 }} priority />
            </div>
            <div>
              <div className="text-[15px] font-bold leading-none tracking-tight" style={{ color: 'var(--text-primary)' }}>DocDock</div>
              <div className="hidden sm:block mt-0.5 text-[10px] leading-none font-medium" style={{ color: 'var(--text-muted)' }}>Knock-Knock, your doctor is here.</div>
            </div>
          </Link>

          {/* Actions */}
          <div className="flex items-center gap-2">
            <DarkModeToggle />
            {!isHydrated && (
              <div className="h-8 w-24 skeleton rounded-xl" />
            )}
            {isHydrated && !user && (
              <>
                <Link href="/auth/login" className="btn-ghost text-sm hidden sm:inline-flex">Sign in</Link>
                <Link href="/auth/register" className="btn-primary text-sm">Get Started</Link>
              </>
            )}
            {isHydrated && user && (
              <>
                <Link href={getRoleHomePath(user)} className="btn-primary text-sm">Dashboard</Link>
                <button onClick={logout} className="btn-ghost text-sm hidden sm:inline-flex">Sign out</button>
              </>
            )}
          </div>
        </div>
      </header>

      {/* ─── Hero ──────────────────────────────────────────── */}
      <section className="relative overflow-hidden bg-mesh">
        {/* Background orbs */}
        <div className="absolute inset-0 overflow-hidden pointer-events-none" aria-hidden="true">
          <div className="absolute -top-40 -right-40 h-[700px] w-[700px] rounded-full opacity-40" style={{ background: 'radial-gradient(circle, rgba(16,185,129,0.12) 0%, transparent 70%)' }} />
          <div className="absolute -bottom-32 -left-40 h-[600px] w-[600px] rounded-full opacity-30" style={{ background: 'radial-gradient(circle, rgba(59,130,246,0.1) 0%, transparent 70%)' }} />
          <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 h-[400px] w-[400px] rounded-full opacity-20" style={{ background: 'radial-gradient(circle, rgba(16,185,129,0.08) 0%, transparent 70%)' }} />
        </div>

        <div className="relative mx-auto max-w-7xl px-4 py-24 sm:px-6 sm:py-32 lg:px-8">
          <div className="text-center">
            {/* Status badge */}
            <div className="inline-flex items-center gap-2 rounded-full px-4 py-1.5 text-xs font-semibold mb-8 animate-fade-in-down"
              style={{ border: '1px solid rgba(16,185,129,0.2)', background: 'rgba(16,185,129,0.06)', color: '#059669' }}>
              <span className="dot-pulse bg-emerald-500" />
              Now serving 10,000+ patients across India
            </div>

            <h1 className="text-4xl font-bold leading-[1.1] tracking-tight sm:text-5xl lg:text-6xl xl:text-7xl text-balance animate-slide-up" style={{ color: 'var(--text-primary)', letterSpacing: '-0.04em' }}>
              Healthcare at your{' '}
              <span className="text-gradient">doorstep.</span>
            </h1>

            <p className="mt-6 mx-auto max-w-2xl text-base sm:text-lg leading-relaxed animate-slide-up" style={{ color: 'var(--text-secondary)', animationDelay: '0.1s' }}>
              Book a verified doctor for a home visit in minutes. Track them live, consult securely, and receive digital prescriptions — all on DocDock.
            </p>

            {/* CTA */}
            <div className="mt-10 flex flex-col sm:flex-row items-center justify-center gap-3 animate-slide-up" style={{ animationDelay: '0.2s' }}>
              {isHydrated && !user && (
                <>
                  <Link href="/auth/register" className="btn-primary text-base px-8 py-3.5 rounded-2xl font-bold">
                    Get Started Free
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                      <path d="M5 12h14M12 5l7 7-7 7" />
                    </svg>
                  </Link>
                  <Link href="/find-doctors" className="btn-secondary text-base px-8 py-3.5 rounded-2xl font-bold">
                    Browse Doctors
                  </Link>
                </>
              )}
              {isHydrated && user && (
                <Link href={getRoleHomePath(user)} className="btn-primary text-base px-8 py-3.5 rounded-2xl font-bold">
                  Go to Dashboard
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M5 12h14M12 5l7 7-7 7" />
                  </svg>
                </Link>
              )}
              {!isHydrated && (
                <div className="h-12 w-40 skeleton rounded-2xl" />
              )}
            </div>
          </div>

          {/* Stats row */}
          <div className="mt-20 grid grid-cols-2 gap-4 sm:grid-cols-4 max-w-3xl mx-auto">
            {stats.map((stat, i) => (
              <div key={stat.label} className="dd-card text-center py-5 hover-lift" style={{ animationDelay: `${i * 0.05}s` }}>
                <p className="text-2xl font-bold text-gradient">{stat.value}</p>
                <p className="mt-1.5 text-xs font-semibold" style={{ color: 'var(--text-muted)' }}>{stat.label}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ─── Features grid ─────────────────────────────────── */}
      <section className="mx-auto max-w-7xl px-4 py-20 sm:px-6 lg:px-8">
        <div className="text-center mb-14">
          <p className="section-header mb-3">Why DocDock</p>
          <h2 className="text-2xl font-bold sm:text-3xl tracking-tight" style={{ color: 'var(--text-primary)', letterSpacing: '-0.03em' }}>
            Everything you need for healthcare at home
          </h2>
          <p className="mt-4 mx-auto max-w-xl text-sm leading-relaxed" style={{ color: 'var(--text-secondary)' }}>
            From booking to billing, DocDock handles it all so you can focus on what matters — your health.
          </p>
        </div>

        <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
          {features.map((f, i) => (
            <div
              key={f.title}
              className="dd-card hover-lift group cursor-default"
              style={{ animationDelay: `${i * 0.05}s` }}
            >
              <div className={`flex h-12 w-12 items-center justify-center rounded-2xl bg-gradient-to-br ${f.color} mb-5 transition-transform duration-300 group-hover:scale-110 group-hover:rotate-3`}
                style={{ border: `1px solid ${f.border}` }}>
                <Icon path={f.icon} size={20} className={f.iconColor} />
              </div>
              <h3 className="text-sm font-bold tracking-tight" style={{ color: 'var(--text-primary)' }}>{f.title}</h3>
              <p className="mt-2 text-sm leading-relaxed" style={{ color: 'var(--text-secondary)' }}>{f.description}</p>
            </div>
          ))}
        </div>
      </section>

      {/* ─── Role cards ────────────────────────────────────── */}
      <section className="mx-auto max-w-7xl px-4 py-20 sm:px-6 lg:px-8">
        <div className="text-center mb-14">
          <p className="section-header mb-3">Who it&apos;s for</p>
          <h2 className="text-2xl font-bold sm:text-3xl tracking-tight" style={{ color: 'var(--text-primary)', letterSpacing: '-0.03em' }}>
            Built for every member of the healthcare journey
          </h2>
        </div>

        <div className="grid gap-6 md:grid-cols-2 max-w-4xl mx-auto">
          {roleCards.map((card) => (
            <div
              key={card.role}
              className="dd-card hover-lift flex flex-col overflow-hidden"
            >
              {/* Top accent bar */}
              <div className="h-1 w-full rounded-t-sm -mt-5 mx-[-20px] mb-5" style={{ background: card.gradient, width: 'calc(100% + 40px)' }} />

              <div className="flex items-center gap-3 mb-5">
                <div className="flex h-11 w-11 items-center justify-center rounded-2xl" style={{ background: card.badgeBg, color: card.badgeColor }}>
                  <Icon path={card.iconPath} size={22} />
                </div>
                <span
                  className="rounded-full px-3 py-1 text-xs font-bold"
                  style={{ background: card.badgeBg, color: card.badgeColor }}
                >
                  {card.role}
                </span>
              </div>

              <p className="text-sm leading-relaxed flex-1" style={{ color: 'var(--text-secondary)' }}>{card.description}</p>

              <ul className="mt-5 space-y-2.5">
                {card.bullets.map((b) => (
                  <li key={b} className="flex items-center gap-2.5 text-sm" style={{ color: 'var(--text-secondary)' }}>
                    <span className="flex h-5 w-5 items-center justify-center rounded-full flex-shrink-0" style={{ background: 'rgba(16,185,129,0.12)' }}>
                      <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="#10b981" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
                        <path d="M20 6L9 17l-5-5" />
                      </svg>
                    </span>
                    {b}
                  </li>
                ))}
              </ul>

              <Link
                href={card.ctaHref}
                className="mt-6 inline-flex items-center justify-center gap-2 rounded-xl px-5 py-2.5 text-sm font-bold text-white transition-all hover:opacity-90 hover:-translate-y-0.5"
                style={{ background: card.gradient, boxShadow: '0 4px 14px -3px rgba(0,0,0,0.25)' }}
              >
                {card.ctaLabel}
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M5 12h14M12 5l7 7-7 7" />
                </svg>
              </Link>
            </div>
          ))}
        </div>
      </section>

      {/* ─── CTA Banner ────────────────────────────────────── */}
      <section className="mx-auto max-w-7xl px-4 py-20 sm:px-6 lg:px-8">
        <div
          className="relative overflow-hidden rounded-3xl p-12 text-white text-center"
          style={{ background: 'linear-gradient(135deg, #0f172a 0%, #1e3a5f 50%, #0f4c35 100%)' }}
        >
          {/* Decoration */}
          <div className="absolute inset-0 overflow-hidden pointer-events-none" aria-hidden="true">
            <div className="absolute -top-24 -right-24 h-80 w-80 rounded-full" style={{ background: 'radial-gradient(circle, rgba(16,185,129,0.2), transparent 70%)' }} />
            <div className="absolute -bottom-24 -left-24 h-80 w-80 rounded-full" style={{ background: 'radial-gradient(circle, rgba(59,130,246,0.15), transparent 70%)' }} />
          </div>

          <div className="relative">
            <div className="inline-flex items-center gap-2 rounded-full px-4 py-1.5 text-xs font-bold mb-6" style={{ background: 'rgba(16,185,129,0.15)', border: '1px solid rgba(16,185,129,0.3)', color: '#6ee7b7' }}>
              <span className="dot-pulse bg-emerald-400" />
              Join thousands of patients and doctors
            </div>
            <h2 className="text-2xl font-bold sm:text-3xl tracking-tight" style={{ letterSpacing: '-0.03em' }}>Ready to get started?</h2>
            <p className="mt-4 text-slate-300 max-w-md mx-auto text-sm leading-relaxed">
              Join the platform trusted by thousands of patients and verified doctors for convenient, safe home healthcare.
            </p>
            <div className="mt-8 flex flex-col sm:flex-row gap-3 justify-center">
              <Link
                href="/auth/register"
                className="inline-flex items-center justify-center gap-2 rounded-xl px-6 py-3 text-sm font-bold text-emerald-700 transition-all hover:-translate-y-0.5 hover:shadow-lg"
                style={{ background: '#ffffff' }}
              >
                Create Free Account
              </Link>
              <Link
                href="/find-doctors"
                className="inline-flex items-center justify-center gap-2 rounded-xl px-6 py-3 text-sm font-bold text-white transition-all hover:-translate-y-0.5"
                style={{ background: 'rgba(255,255,255,0.1)', border: '1px solid rgba(255,255,255,0.2)' }}
              >
                Find Doctors
              </Link>
            </div>
          </div>
        </div>
      </section>

      {/* ─── Footer ────────────────────────────────────────── */}
      <footer className="border-t py-10" style={{ borderColor: 'var(--border-color)' }}>
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="flex flex-col sm:flex-row items-center justify-between gap-5">
            <div className="flex items-center gap-2.5">
              <div style={{ width: 28, height: 28, borderRadius: 9, overflow: 'hidden', flexShrink: 0, display: 'inline-flex' }}>
                <Image src="/logo.png" alt="DocDock Logo" width={28} height={28} style={{ display: 'block', width: 28, height: 28 }} />
              </div>
              <div>
                <span className="text-sm font-bold" style={{ color: 'var(--text-primary)' }}>DocDock</span>
                <span className="ml-2 text-xs" style={{ color: 'var(--text-muted)' }}>Doctor-on-demand home consultation</span>
              </div>
            </div>
            <p className="text-xs" style={{ color: 'var(--text-muted)' }}>
              © {new Date().getFullYear()} DocDock. All rights reserved.
            </p>
            <div className="flex items-center gap-5 text-xs" style={{ color: 'var(--text-muted)' }}>
              <Link href="/find-doctors" className="transition-colors hover:text-emerald-600">Find Doctors</Link>
              <Link href="/auth/login" className="transition-colors hover:text-emerald-600">Sign In</Link>
              <Link href="/auth/register" className="transition-colors hover:text-emerald-600">Register</Link>
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
}
