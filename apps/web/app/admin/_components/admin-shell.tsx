'use client';

import Link from 'next/link';
import Image from 'next/image';
import { usePathname } from 'next/navigation';
import { type ReactNode, useMemo, useState } from 'react';

import { useAuth } from '../../auth/auth-context';
import NotificationBell from '@/components/NotificationBell';
import { DarkModeToggle } from '../../theme-context';

function Icon({ path, size = 18 }: { path: string; size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <path d={path} />
    </svg>
  );
}

const ICONS: Record<string, string> = {
  dashboard: 'M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z M9 22V12h6v10',
  doctors: 'M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2 M12 11a4 4 0 1 0 0-8 4 4 0 0 0 0 8z',
  users: 'M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2 M23 21v-2a4 4 0 0 0-3-3.87 M16 3.13a4 4 0 0 1 0 7.75',
  appointments: 'M8 6h13M8 12h13M8 18h13M3 6h.01M3 12h.01M3 18h.01',
  payments: 'M12 1v22M17 5H9.5a3.5 3.5 0 1 0 0 7h5a3.5 3.5 0 1 1 0 7H6',
  reviews: 'M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z',
  analytics: 'M18 20V10M12 20V4M6 20v-6',
  settings: 'M12 15a3 3 0 1 0 0-6 3 3 0 0 0 0 6z M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83-2.83l.06-.06A1.65 1.65 0 0 0 4.68 15a1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 2.83-2.83l.06.06A1.65 1.65 0 0 0 9 4.68a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 2.83l-.06.06A1.65 1.65 0 0 0 19.4 9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z',
  audit: 'M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z M14 2v6h6 M16 13H8 M16 17H8 M10 9H8',
  logout: 'M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4 M16 17l5-5-5-5 M21 12H9',
  menu: 'M3 12h18M3 6h18M3 18h18',
  close: 'M18 6L6 18M6 6l12 12',
};

const navItems = [
  { href: '/admin/dashboard', label: 'Dashboard', icon: 'dashboard' },
  { href: '/admin/doctors', label: 'Doctor Verification', icon: 'doctors' },
  { href: '/admin/users', label: 'User Management', icon: 'users' },
  { href: '/admin/appointments', label: 'Appointments', icon: 'appointments' },
  { href: '/admin/payments', label: 'Payments', icon: 'payments' },
  { href: '/admin/reviews', label: 'Reviews', icon: 'reviews' },
  { href: '/admin/analytics', label: 'Analytics', icon: 'analytics' },
  { href: '/admin/settings', label: 'Settings', icon: 'settings' },
  { href: '/admin/audit-logs', label: 'Audit Logs', icon: 'audit' },
];

function DocDockLogo() {
  return (
    <div className="flex items-center gap-2.5">
      <div style={{ width: 36, height: 36, borderRadius: 14, overflow: "hidden", flexShrink: 0, display: "inline-flex" }}>
        <Image
          src="/logo.png"
          alt="DocDock Logo"
          width={36}
          height={36}
          style={{ display: "block", width: 36, height: 36 }}
          priority
        />
      </div>
      <div>
        <div className="text-base font-bold leading-none" style={{ color: 'var(--text-primary)' }}>DocDock</div>
        <div className="mt-0.5 text-[10px] leading-none" style={{ color: 'var(--text-muted)' }}>Knock-Knock, your doctor is here.</div>
      </div>
    </div>
  );
}

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
        <Icon path={ICONS[icon]} size={16} />
      </span>
      <span className="flex-1 truncate text-sm">{label}</span>
      {isActive && <span className="h-1.5 w-1.5 flex-shrink-0 rounded-full bg-white opacity-80" />}
    </Link>
  );
}

export function AdminShell({ children }: { children: ReactNode }) {
  const pathname = usePathname();
  const { user, logout } = useAuth();
  const [mobileOpen, setMobileOpen] = useState(false);

  const activeItem = useMemo(() => {
    return navItems.find((item) => pathname === item.href || pathname.startsWith(`${item.href}/`)) ?? navItems[0];
  }, [pathname]);

  const sidebarContent = (
    <div className="flex h-full flex-col">
      <div className="px-3 py-4 border-b" style={{ borderColor: 'var(--border-color)' }}>
        <Link href="/" onClick={() => setMobileOpen(false)}>
          <DocDockLogo />
        </Link>
      </div>

      <div className="px-3 pt-3 pb-2">
        <div className="flex items-center gap-2 rounded-lg bg-violet-50 dark:bg-violet-950/30 px-3 py-2">
          <div className="h-1.5 w-1.5 rounded-full bg-violet-500 animate-pulse" />
          <span className="text-xs font-semibold text-violet-700 dark:text-violet-400 uppercase tracking-wide">Admin Portal</span>
        </div>
      </div>

      <nav className="flex-1 overflow-y-auto px-3 py-1.5 space-y-0.5">
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

      <div className="border-t px-3 py-3 space-y-2.5" style={{ borderColor: 'var(--border-color)' }}>
        <div className="flex items-center gap-2.5">
          <div className="flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-full bg-violet-100 text-xs font-bold text-violet-700 dark:bg-violet-950/60 dark:text-violet-400">
            {(user?.fullName || 'A').charAt(0).toUpperCase()}
          </div>
          <div className="min-w-0">
            <p className="truncate text-sm font-semibold leading-tight" style={{ color: 'var(--text-primary)' }}>{user?.fullName || 'Admin'}</p>
            <p className="text-[11px] font-medium text-violet-600 dark:text-violet-400 capitalize">Administrator</p>
          </div>
        </div>
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
      <aside className="fixed top-0 left-0 z-40 hidden h-full w-[240px] lg:flex flex-col border-r"
        style={{ backgroundColor: 'var(--sidebar-bg)', borderColor: 'var(--border-color)' }}>
        {sidebarContent}
      </aside>

      {mobileOpen && (
        <div className="fixed inset-0 z-40 bg-black/50 backdrop-blur-sm lg:hidden" onClick={() => setMobileOpen(false)} />
      )}

      <aside
        className={`fixed top-0 left-0 z-50 h-full w-[240px] flex-col border-r transition-transform duration-300 lg:hidden ${
          mobileOpen ? 'flex translate-x-0' : 'hidden -translate-x-full'
        }`}
        style={{ backgroundColor: 'var(--sidebar-bg)', borderColor: 'var(--border-color)' }}
      >
        {sidebarContent}
      </aside>

      <div className="lg:ml-[240px] flex flex-col min-h-screen">
        <header
          className="sticky top-0 z-30 flex h-14 items-center justify-between border-b px-4 sm:px-6"
          style={{ backgroundColor: 'var(--header-bg)', borderColor: 'var(--border-color)', backdropFilter: 'blur(20px)' }}
        >
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
              <Link href="/"><DocDockLogo /></Link>
            </div>
          </div>
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
