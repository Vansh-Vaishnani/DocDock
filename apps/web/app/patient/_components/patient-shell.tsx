'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { type ReactNode, useMemo, useState } from 'react';

import { useAuth } from '../../auth/auth-context';
import NotificationBell from '@/components/NotificationBell';
import { DarkModeToggle } from '../../theme-context';

// ─── Icons ───────────────────────────────────────────────────
function Icon({ path, size = 18 }: { path: string; size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <path d={path} />
    </svg>
  );
}

const ICONS: Record<string, string> = {
  dashboard: 'M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z M9 22V12h6v10',
  appointments: 'M8 6h13M8 12h13M8 18h13M3 6h.01M3 12h.01M3 18h.01',
  profile: 'M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2 M12 11a4 4 0 1 0 0-8 4 4 0 0 0 0 8z',
  addresses: 'M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z M12 7a3 3 0 1 0 0 6 3 3 0 0 0 0-6z',
  history: 'M12 8v4l3 3m6-3a9 9 0 1 1-18 0 9 9 0 0 1 18 0z',
  allergies: 'M12 2a10 10 0 1 0 0 20 10 10 0 0 0 0-20z M12 8v4M12 16h.01',
  settings: 'M12 15a3 3 0 1 0 0-6 3 3 0 0 0 0 6z M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83-2.83l.06-.06A1.65 1.65 0 0 0 4.68 15a1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 2.83-2.83l.06.06A1.65 1.65 0 0 0 9 4.68a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 2.83l-.06.06A1.65 1.65 0 0 0 19.4 9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z',
  logout: 'M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4 M16 17l5-5-5-5 M21 12H9',
  menu: 'M3 12h18M3 6h18M3 18h18',
  close: 'M18 6L6 18M6 6l12 12',
};

const navItems = [
  { href: '/patient/dashboard', label: 'Dashboard', icon: 'dashboard' },
  { href: '/patient/appointments', label: 'Appointments', icon: 'appointments' },
  { href: '/patient/profile', label: 'Profile', icon: 'profile' },
  { href: '/patient/addresses', label: 'Addresses', icon: 'addresses' },
  { href: '/patient/medical-history', label: 'Medical History', icon: 'history' },
  { href: '/patient/allergies', label: 'Allergies', icon: 'allergies' },
  { href: '/patient/settings', label: 'Settings', icon: 'settings' },
];

// ─── DocDock Logo ─────────────────────────────────────────────
function DocDockLogo({ collapsed = false }: { collapsed?: boolean }) {
  return (
    <div className="flex items-center gap-2.5">
      <div className="flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-xl bg-emerald-600 shadow-emerald-sm">
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
          <path d="M12 2a10 10 0 1 0 0 20 10 10 0 0 0 0-20z" />
          <path d="M12 8v4M12 16h.01" />
        </svg>
      </div>
      {!collapsed && (
        <div>
          <div className="text-base font-bold leading-none" style={{ color: 'var(--text-primary)' }}>DocDock</div>
          <div className="mt-0.5 text-[10px] leading-none" style={{ color: 'var(--text-muted)' }}>Knock-Knock, your doctor is here.</div>
        </div>
      )}
    </div>
  );
}

// ─── Avatar ───────────────────────────────────────────────────
function Avatar({ name, role }: { name: string; role: string }) {
  const initials = name.split(' ').map(n => n[0]).join('').slice(0, 2).toUpperCase();
  return (
    <div className="flex items-center gap-2.5">
      <div className="flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-full bg-emerald-100 text-xs font-bold text-emerald-700 dark:bg-emerald-950/60 dark:text-emerald-400">
        {initials || 'P'}
      </div>
      <div className="min-w-0">
        <p className="truncate text-sm font-semibold leading-tight" style={{ color: 'var(--text-primary)' }}>{name || 'Patient'}</p>
        <p className="text-[11px] font-medium text-emerald-600 dark:text-emerald-400 capitalize">{role}</p>
      </div>
    </div>
  );
}

// ─── Sidebar Nav Item ─────────────────────────────────────────
function NavItem({ href, label, icon, isActive, onClick }: {
  href: string;
  label: string;
  icon: string;
  isActive: boolean;
  onClick?: () => void;
}) {
  return (
    <Link
      href={href}
      onClick={onClick}
      className={`nav-link ${isActive ? 'active' : ''}`}
    >
      <span className="flex-shrink-0">
        <Icon path={ICONS[icon]} size={17} />
      </span>
      <span className="flex-1 truncate">{label}</span>
      {isActive && (
        <span className="h-1.5 w-1.5 flex-shrink-0 rounded-full bg-white opacity-80" />
      )}
    </Link>
  );
}

// ─── Patient Shell ────────────────────────────────────────────
export function PatientShell({ children }: { children: ReactNode }) {
  const pathname = usePathname();
  const { user, logout } = useAuth();
  const [mobileOpen, setMobileOpen] = useState(false);

  const activeItem = useMemo(() => {
    return navItems.find((item) => pathname === item.href || pathname.startsWith(`${item.href}/`)) ?? navItems[0];
  }, [pathname]);

  const sidebarContent = (
    <div className="flex h-full flex-col">
      {/* Logo */}
      <div className="px-3 py-4 border-b" style={{ borderColor: 'var(--border-color)' }}>
        <Link href="/" onClick={() => setMobileOpen(false)}>
          <DocDockLogo />
        </Link>
      </div>

      {/* Role badge */}
      <div className="px-3 pt-4 pb-2">
        <div className="flex items-center gap-2 rounded-lg bg-emerald-50 dark:bg-emerald-950/30 px-3 py-2">
          <div className="h-1.5 w-1.5 rounded-full bg-emerald-500 animate-pulse" />
          <span className="text-xs font-semibold text-emerald-700 dark:text-emerald-400 uppercase tracking-wide">Patient Portal</span>
        </div>
      </div>

      {/* Nav */}
      <nav className="flex-1 overflow-y-auto px-3 py-2 space-y-0.5">
        {navItems.map((item) => (
          <NavItem
            key={item.href}
            href={item.href}
            label={item.label}
            icon={item.icon}
            isActive={activeItem.href === item.href}
            onClick={() => setMobileOpen(false)}
          />
        ))}
      </nav>

      {/* Quick link */}
      <div className="px-3 pb-2 mt-2">
        <Link
          href="/find-doctors"
          onClick={() => setMobileOpen(false)}
          className="flex items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-emerald-500 to-teal-600 hover:from-emerald-600 hover:to-teal-700 px-4 py-3 text-sm font-bold text-white shadow-emerald-sm transition-all hover:shadow-emerald active:scale-[0.98] group"
        >
          <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" className="group-hover:scale-110 transition-transform">
            <circle cx="11" cy="11" r="8" /><path d="m21 21-4.35-4.35" />
          </svg>
          Find Doctors
        </Link>
      </div>

      {/* User info + logout */}
      <div className="border-t px-3 py-3 space-y-2.5" style={{ borderColor: 'var(--border-color)' }}>
        <Avatar name={user?.fullName || 'Patient'} role={user?.role || 'patient'} />
        <button
          type="button"
          onClick={logout}
          className="flex w-full items-center gap-2.5 rounded-xl px-3 py-2 text-sm font-medium text-rose-600 transition-all hover:bg-rose-50 dark:hover:bg-rose-950/30"
        >
          <Icon path={ICONS.logout} size={15} />
          <span>Sign out</span>
        </button>
      </div>
    </div>
  );

  return (
    <div className="min-h-screen" style={{ backgroundColor: 'var(--bg-primary)' }}>
      {/* ── Desktop sidebar ───────────────────────── */}
      <aside className="fixed top-0 left-0 z-40 hidden h-full w-[240px] lg:flex flex-col border-r"
        style={{ backgroundColor: 'var(--sidebar-bg)', borderColor: 'var(--border-color)' }}>
        {sidebarContent}
      </aside>

      {/* ── Mobile overlay ────────────────────────── */}
      {mobileOpen && (
        <div
          className="fixed inset-0 z-40 bg-black/50 backdrop-blur-sm lg:hidden"
          onClick={() => setMobileOpen(false)}
        />
      )}

      {/* ── Mobile sidebar ────────────────────────── */}
      <aside
        className={`fixed top-0 left-0 z-50 h-full w-[240px] flex-col border-r transition-transform duration-300 lg:hidden ${
          mobileOpen ? 'flex translate-x-0' : 'hidden -translate-x-full'
        }`}
        style={{ backgroundColor: 'var(--sidebar-bg)', borderColor: 'var(--border-color)' }}
      >
        {sidebarContent}
      </aside>

      {/* ── Main content area ─────────────────────── */}
      <div className="lg:ml-[240px] flex flex-col min-h-screen">
        {/* Top bar */}
        <header
          className="sticky top-0 z-30 flex h-14 items-center justify-between border-b px-4 sm:px-6"
          style={{ backgroundColor: 'var(--header-bg)', borderColor: 'var(--border-color)', backdropFilter: 'blur(20px)' }}
        >
          {/* Left: hamburger + breadcrumb */}
          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={() => setMobileOpen(!mobileOpen)}
              className="flex h-8 w-8 items-center justify-center rounded-lg lg:hidden transition-all hover:bg-slate-100 dark:hover:bg-slate-800"
              aria-label="Toggle menu"
            >
              <Icon path={mobileOpen ? ICONS.close : ICONS.menu} size={18} />
            </button>
            <div className="hidden sm:block">
              <p className="text-sm font-semibold" style={{ color: 'var(--text-primary)' }}>{activeItem.label}</p>
            </div>
            <div className="block sm:hidden">
              <Link href="/">
                <DocDockLogo />
              </Link>
            </div>
          </div>

          {/* Right: actions */}
          <div className="flex items-center gap-1.5">
            <DarkModeToggle />
            <NotificationBell />
          </div>
        </header>

        <main className="flex-1 px-4 py-6 sm:px-6 lg:px-8 animate-fade-in">
          {children}
        </main>
      </div>
    </div>
  );
}
