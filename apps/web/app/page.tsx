'use client';

import Link from 'next/link';
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
    color: 'bg-rose-50 text-rose-600 dark:bg-rose-950/40 dark:text-rose-400',
  },
  {
    icon: 'M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z M12 7a3 3 0 1 0 0 6 3 3 0 0 0 0-6z',
    title: 'Live Tracking',
    description: 'Track your doctor in real-time on the map as they travel to your location.',
    color: 'bg-blue-50 text-blue-600 dark:bg-blue-950/40 dark:text-blue-400',
  },
  {
    icon: 'M8 6h13M8 12h13M8 18h13M3 6h.01M3 12h.01M3 18h.01',
    title: 'Instant Booking',
    description: 'Book a home visit appointment in under 60 seconds, any time of day or night.',
    color: 'bg-emerald-50 text-emerald-600 dark:bg-emerald-950/40 dark:text-emerald-400',
  },
  {
    icon: 'M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9 M13.73 21a2 2 0 0 1-3.46 0',
    title: 'OTP Consultation',
    description: 'Secure consultations with OTP verification ensuring only verified patients are seen.',
    color: 'bg-amber-50 text-amber-600 dark:bg-amber-950/40 dark:text-amber-400',
  },
  {
    icon: 'M9 11l3 3L22 4 M21 12v7a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11',
    title: 'Digital Prescriptions',
    description: 'Receive and share digital prescriptions, medical records, and consultation notes.',
    color: 'bg-violet-50 text-violet-600 dark:bg-violet-950/40 dark:text-violet-400',
  },
  {
    icon: 'M12 1v22M17 5H9.5a3.5 3.5 0 1 0 0 7h5a3.5 3.5 0 1 1 0 7H6',
    title: 'Transparent Payments',
    description: 'Secure payments with full receipts, refund tracking, and earnings dashboards.',
    color: 'bg-teal-50 text-teal-600 dark:bg-teal-950/40 dark:text-teal-400',
  },
];

const roleCards = [
  {
    role: 'Patient',
    emoji: '🧑‍⚕️',
    description: 'Find nearby verified doctors, book home visits, track visits live, and manage your complete health record.',
    bullets: ['Smart doctor search', 'Live GPS tracking', 'OTP consultation', 'Digital prescriptions'],
    ctaLabel: 'Book a Doctor',
    ctaHref: '/find-doctors',
    color: 'from-emerald-600 to-emerald-700',
    badge: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-950/50 dark:text-emerald-400',
  },
  {
    role: 'Doctor',
    emoji: '👨‍⚕️',
    description: 'Manage your schedule, appointments, prescriptions, and earnings — all from one powerful dashboard.',
    bullets: ['Appointment management', 'Earnings dashboard', 'Digital prescriptions', 'Real-time notifications'],
    ctaLabel: 'Join as Doctor',
    ctaHref: '/auth/register?role=doctor',
    color: 'from-blue-600 to-blue-700',
    badge: 'bg-blue-100 text-blue-700 dark:bg-blue-950/50 dark:text-blue-400',
  },
];

// ─── Stats ────────────────────────────────────────────────────
const stats = [
  { value: '10,000+', label: 'Consultations' },
  { value: '500+', label: 'Verified Doctors' },
  { value: '50+', label: 'Specialties' },
  { value: '4.8★', label: 'Average Rating' },
];

export default function HomePage() {
  const { user, isHydrated, logout } = useAuth();

  return (
    <div className="min-h-screen" style={{ backgroundColor: 'var(--bg-primary)' }}>
      {/* ─── Top Navbar ─────────────────────────────────────── */}
      <header
        className="sticky top-0 z-50 border-b"
        style={{ backgroundColor: 'var(--header-bg)', borderColor: 'var(--border-color)', backdropFilter: 'blur(20px)' }}
      >
        <div className="mx-auto flex h-14 max-w-7xl items-center justify-between px-4 sm:px-6 lg:px-8">
          {/* Logo */}
          <div className="flex items-center gap-2.5">
            <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-emerald-600">
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M12 2a10 10 0 1 0 0 20 10 10 0 0 0 0-20z" /><path d="M12 8v4M12 16h.01" />
              </svg>
            </div>
            <div>
              <div className="text-base font-bold leading-none" style={{ color: 'var(--text-primary)' }}>DocDock</div>
              <div className="hidden sm:block mt-0.5 text-[10px] leading-none" style={{ color: 'var(--text-muted)' }}>
                Knock-Knock, your doctor is here.
              </div>
            </div>
          </div>

          {/* Actions */}
          <div className="flex items-center gap-2">
            <DarkModeToggle />

            {!isHydrated && (
              <div className="h-8 w-24 skeleton rounded-full" />
            )}

            {isHydrated && !user && (
              <>
                <Link href="/auth/login" className="btn-ghost text-sm">Sign in</Link>
                <Link href="/auth/register" className="btn-primary text-sm">Get Started</Link>
              </>
            )}

            {isHydrated && user && (
              <>
                <Link href={getRoleHomePath(user)} className="btn-primary text-sm">Dashboard</Link>
                <button onClick={logout} className="btn-ghost text-sm">Sign out</button>
              </>
            )}
          </div>
        </div>
      </header>

      {/* ─── Hero ──────────────────────────────────────────── */}
      <section className="relative overflow-hidden">
        {/* Background decoration */}
        <div className="absolute inset-0 overflow-hidden pointer-events-none" aria-hidden="true">
          <div className="absolute -top-40 -right-32 h-[600px] w-[600px] rounded-full bg-emerald-500/8 blur-3xl dark:bg-emerald-500/5" />
          <div className="absolute -bottom-20 -left-32 h-[500px] w-[500px] rounded-full bg-blue-500/8 blur-3xl dark:bg-blue-500/5" />
        </div>

        <div className="relative mx-auto max-w-7xl px-4 py-20 sm:px-6 sm:py-28 lg:px-8">
          <div className="text-center">
            {/* Pill badge */}
            <div className="inline-flex items-center gap-2 rounded-full border px-4 py-1.5 text-xs font-semibold mb-6"
              style={{ borderColor: 'var(--border-color)', color: 'var(--text-secondary)', backgroundColor: 'var(--bg-secondary)' }}>
              <span className="h-2 w-2 rounded-full bg-emerald-500 animate-pulse" />
              Now serving 10,000+ patients across India
            </div>

            <h1 className="text-4xl font-bold leading-tight tracking-tight sm:text-5xl lg:text-6xl" style={{ color: 'var(--text-primary)' }}>
              Healthcare at your{' '}
              <span className="text-gradient">doorstep.</span>
            </h1>
            <p className="mt-5 mx-auto max-w-2xl text-base sm:text-lg leading-relaxed" style={{ color: 'var(--text-secondary)' }}>
              Book a verified doctor for a home visit in minutes. Track them live, consult securely, and receive digital prescriptions — all on DocDock.
            </p>

            {/* CTA */}
            <div className="mt-8 flex flex-col sm:flex-row items-center justify-center gap-3">
              {isHydrated && !user && (
                <>
                  <Link href="/auth/register" className="btn-primary text-base px-8 py-3">
                    Get Started Free
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <path d="M5 12h14M12 5l7 7-7 7" />
                    </svg>
                  </Link>
                  <Link href="/find-doctors" className="btn-secondary text-base px-8 py-3">
                    Browse Doctors
                  </Link>
                </>
              )}
              {isHydrated && user && (
                <Link href={getRoleHomePath(user)} className="btn-primary text-base px-8 py-3">
                  Go to Dashboard
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M5 12h14M12 5l7 7-7 7" />
                  </svg>
                </Link>
              )}
              {!isHydrated && (
                <div className="h-12 w-40 skeleton rounded-full" />
              )}
            </div>
          </div>

          {/* Stats row */}
          <div className="mt-16 grid grid-cols-2 gap-4 sm:grid-cols-4 max-w-3xl mx-auto">
            {stats.map((stat) => (
              <div key={stat.label} className="dd-card text-center py-4">
                <p className="text-2xl font-bold text-emerald-600">{stat.value}</p>
                <p className="mt-1 text-xs font-medium" style={{ color: 'var(--text-muted)' }}>{stat.label}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ─── Features grid ─────────────────────────────────── */}
      <section className="mx-auto max-w-7xl px-4 py-16 sm:px-6 lg:px-8">
        <div className="text-center mb-12">
          <p className="section-header">Why DocDock</p>
          <h2 className="text-2xl font-bold sm:text-3xl" style={{ color: 'var(--text-primary)' }}>
            Everything you need for healthcare at home
          </h2>
        </div>
        <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
          {features.map((f) => (
            <div key={f.title} className="dd-card hover-lift group">
              <div className={`flex h-10 w-10 items-center justify-center rounded-xl ${f.color} mb-4 transition-transform group-hover:scale-110`}>
                <Icon path={f.icon} size={18} />
              </div>
              <h3 className="text-sm font-semibold" style={{ color: 'var(--text-primary)' }}>{f.title}</h3>
              <p className="mt-1.5 text-sm leading-relaxed" style={{ color: 'var(--text-secondary)' }}>{f.description}</p>
            </div>
          ))}
        </div>
      </section>

      {/* ─── Role cards ────────────────────────────────────── */}
      <section className="mx-auto max-w-7xl px-4 py-16 sm:px-6 lg:px-8">
        <div className="text-center mb-12">
          <p className="section-header">Who it's for</p>
          <h2 className="text-2xl font-bold sm:text-3xl" style={{ color: 'var(--text-primary)' }}>
            Built for every member of the healthcare journey
          </h2>
        </div>
        <div className="grid gap-6 md:grid-cols-2 max-w-4xl mx-auto">
          {roleCards.map((card) => (
            <div key={card.role} className="dd-card hover-lift flex flex-col">
              <div className="flex items-center gap-3 mb-4">
                <span className="text-3xl">{card.emoji}</span>
                <span className={`status-badge ${card.badge} text-xs`}>{card.role}</span>
              </div>
              <p className="text-sm leading-relaxed flex-1" style={{ color: 'var(--text-secondary)' }}>{card.description}</p>
              <ul className="mt-4 space-y-2">
                {card.bullets.map((b) => (
                  <li key={b} className="flex items-center gap-2 text-xs" style={{ color: 'var(--text-secondary)' }}>
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#10b981" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                      <path d="M20 6L9 17l-5-5" />
                    </svg>
                    {b}
                  </li>
                ))}
              </ul>
              <Link href={card.ctaHref} className={`mt-5 inline-flex items-center justify-center gap-2 rounded-full px-5 py-2.5 text-sm font-semibold text-white transition-all hover:opacity-90 bg-gradient-to-r ${card.color}`}>
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
      <section className="mx-auto max-w-7xl px-4 py-16 sm:px-6 lg:px-8">
        <div className="relative overflow-hidden rounded-3xl bg-gradient-to-r from-emerald-600 to-emerald-700 p-10 text-white text-center shadow-emerald">
          <div className="absolute inset-0 overflow-hidden pointer-events-none" aria-hidden="true">
            <div className="absolute -top-20 -right-20 h-80 w-80 rounded-full bg-white/10 blur-3xl" />
            <div className="absolute -bottom-20 -left-20 h-80 w-80 rounded-full bg-white/10 blur-3xl" />
          </div>
          <div className="relative">
            <h2 className="text-2xl font-bold sm:text-3xl">Ready to get started?</h2>
            <p className="mt-3 text-emerald-100 max-w-lg mx-auto">
              Join thousands of patients and doctors already using DocDock for better healthcare.
            </p>
            <div className="mt-6 flex flex-col sm:flex-row gap-3 justify-center">
              <Link href="/auth/register" className="inline-flex items-center justify-center gap-2 rounded-full bg-white px-6 py-3 text-sm font-semibold text-emerald-700 transition hover:bg-emerald-50">
                Create Free Account
              </Link>
              <Link href="/find-doctors" className="inline-flex items-center justify-center gap-2 rounded-full border border-white/40 bg-white/10 px-6 py-3 text-sm font-semibold text-white transition hover:bg-white/20">
                Find Doctors
              </Link>
            </div>
          </div>
        </div>
      </section>

      {/* ─── Footer ────────────────────────────────────────── */}
      <footer className="border-t py-8" style={{ borderColor: 'var(--border-color)' }}>
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
            <div className="flex items-center gap-2">
              <div className="flex h-6 w-6 items-center justify-center rounded-lg bg-emerald-600">
                <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M12 2a10 10 0 1 0 0 20 10 10 0 0 0 0-20z" /><path d="M12 8v4M12 16h.01" />
                </svg>
              </div>
              <span className="text-sm font-semibold" style={{ color: 'var(--text-primary)' }}>DocDock</span>
            </div>
            <p className="text-xs" style={{ color: 'var(--text-muted)' }}>
              © {new Date().getFullYear()} DocDock. Doctor-on-demand home consultation platform.
            </p>
            <div className="flex items-center gap-4 text-xs" style={{ color: 'var(--text-muted)' }}>
              <Link href="/find-doctors" className="hover:text-emerald-600 transition-colors">Find Doctors</Link>
              <Link href="/auth/login" className="hover:text-emerald-600 transition-colors">Sign In</Link>
              <Link href="/auth/register" className="hover:text-emerald-600 transition-colors">Register</Link>
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
}
