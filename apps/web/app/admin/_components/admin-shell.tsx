'use client';

import Link from 'next/link';
import Image from 'next/image';
import { usePathname } from 'next/navigation';
import { type ReactNode, useMemo, useState, useEffect } from 'react';

import { useAuth } from '../../auth/auth-context';
import NotificationBell from '@/components/NotificationBell';
import { DarkModeToggle } from '../../theme-context';

function Icon({ path, size = 18, className = '' }: { path: string; size?: number; className?: string }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" className={className}>
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
  settings: 'M12 15a3 3 0 1 0 0-6 3 3 0 0 0 0 6z M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83-2.83l.06.06A1.65 1.65 0 0 0 4.68 15a1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 2.83-2.83l.06.06A1.65 1.65 0 0 0 9 4.68a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 2.83l-.06.06A1.65 1.65 0 0 0 19.4 9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z',
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
    <div className="flex items-center gap-3">
      <div style={{ width: 34, height: 34, borderRadius: 12, overflow: 'hidden', flexShrink: 0, display: 'inline-flex', boxShadow: '0 2px 8px rgba(139,92,246,0.25)' }}>
        <Image src="/logo.png" alt="DocDock Logo" width={34} height={34} style={{ display: 'block', width: 34, height: 34 }} priority />
      </div>
      <div>
        <div className="text-[15px] font-bold leading-none tracking-tight" style={{ color: 'var(--text-primary)' }}>DocDock</div>
        <div className="mt-0.5 text-[10px] leading-none font-medium" style={{ color: 'var(--text-muted)' }}>Admin Control Panel</div>
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
      className={`nav-link ${isActive ? 'active-violet' : ''} group`}
      aria-current={isActive ? 'page' : undefined}
    >
      <span className={`flex-shrink-0 transition-transform duration-200 ${isActive ? '' : 'group-hover:scale-110'}`}>
        <Icon path={ICONS[icon]} size={16} />
      </span>
      <span className="flex-1 truncate">{label}</span>
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

  const initials = (user?.fullName || 'A').split(' ').map((n: string) => n[0]).join('').slice(0, 2).toUpperCase();

  const sidebarContent = (
    <div className="flex h-full flex-col">
      <div className="px-4 py-5" style={{ borderBottom: '1px solid var(--border-color)' }}>
        <Link href="/" onClick={() => setMobileOpen(false)}><DocDockLogo /></Link>
      </div>

      <div className="px-4 pt-4 pb-2">
        <div className="flex items-center gap-2 rounded-xl px-3 py-2" style={{ background: 'linear-gradient(135deg, rgba(139,92,246,0.1) 0%, rgba(139,92,246,0.05) 100%)', border: '1px solid rgba(139,92,246,0.15)' }}>
          <span className="dot-pulse bg-violet-500" />
          <span className="text-[11px] font-bold uppercase tracking-widest text-violet-600 dark:text-violet-400">Admin Portal</span>
        </div>
      </div>

      <nav className="flex-1 overflow-y-auto px-3 py-2 space-y-0.5" aria-label="Admin navigation">
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

      <div className="px-4 py-4 mt-auto" style={{ borderTop: '1px solid var(--border-color)' }}>
        <div className="rounded-xl p-3" style={{ background: 'var(--bg-secondary)', border: '1px solid var(--border-color)' }}>
          <div className="flex items-center gap-3">
            <div className="relative flex-shrink-0">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl text-sm font-bold"
                style={{ background: 'linear-gradient(135deg, #ede9fe, #ddd6fe)', color: '#6d28d9' }}>
                {initials}
              </div>
              <span className="absolute -bottom-0.5 -right-0.5 h-3 w-3 rounded-full bg-violet-500 ring-2 ring-white dark:ring-slate-900" />
            </div>
            <div className="min-w-0 flex-1">
              <p className="truncate text-sm font-semibold leading-tight" style={{ color: 'var(--text-primary)' }}>{user?.fullName || 'Admin'}</p>
              <p className="text-[11px] font-medium" style={{ color: '#7c3aed' }}>Administrator</p>
            </div>
          </div>
        </div>
        <button
          type="button"
          onClick={logout}
          className="mt-2 flex w-full items-center gap-2.5 rounded-xl px-3 py-2.5 text-sm font-medium text-rose-500 transition-all hover:bg-rose-50 dark:hover:bg-rose-950/25"
          aria-label="Sign out"
        >
          <Icon path={ICONS.logout} size={15} />
          <span>Sign out</span>
        </button>
      </div>
    </div>
  );

  useEffect(() => {
    if (mobileOpen) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = '';
    }
    return () => {
      document.body.style.overflow = '';
    };
  }, [mobileOpen]);

  return (
    <div className="min-h-screen" style={{ backgroundColor: 'var(--bg-primary)' }}>
      <aside
        className="fixed top-0 left-0 z-40 hidden h-full lg:flex flex-col"
        style={{ width: 'var(--sidebar-width)', backgroundColor: 'var(--sidebar-bg)', borderRight: '1px solid var(--sidebar-border)' }}
        aria-label="Sidebar"
      >
        {sidebarContent}
      </aside>

      {mobileOpen && (
        <div className="fixed inset-0 z-40 bg-black/60 backdrop-blur-sm lg:hidden animate-fade-in" onClick={() => setMobileOpen(false)} aria-hidden="true" />
      )}

      <aside
        className={`fixed top-0 left-0 z-50 h-full flex-col border-r lg:hidden transition-all duration-300 ease-out ${mobileOpen ? 'flex translate-x-0 shadow-xl' : 'hidden -translate-x-full'}`}
        style={{ width: 'var(--sidebar-width)', backgroundColor: 'var(--sidebar-bg)', borderColor: 'var(--sidebar-border)' }}
        aria-hidden={!mobileOpen}
      >
        {sidebarContent}
      </aside>

      <div className="lg:ml-[var(--sidebar-width)] flex flex-col min-h-screen">
        <header
          className="sticky top-0 z-30 flex items-center justify-between border-b px-4 sm:px-6"
          style={{
            height: 'var(--header-height)',
            backgroundColor: 'var(--header-bg)',
            borderColor: 'var(--border-color)',
            backdropFilter: 'blur(20px) saturate(180%)',
            WebkitBackdropFilter: 'blur(20px) saturate(180%)',
          }}
          aria-label="Top navigation"
        >
          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={() => setMobileOpen(!mobileOpen)}
              className="btn-icon lg:hidden"
              aria-label="Toggle navigation menu"
              aria-expanded={mobileOpen}
            >
              <Icon path={mobileOpen ? ICONS.close : ICONS.menu} size={18} />
            </button>
            <div className="hidden sm:flex items-center gap-2">
              <span className="text-xs font-medium" style={{ color: 'var(--text-muted)' }}>Admin</span>
              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ color: 'var(--border-color)' }}><path d="M9 18l6-6-6-6" /></svg>
              <span className="text-sm font-semibold" style={{ color: 'var(--text-primary)' }}>{activeItem.label}</span>
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

        <main className="flex-1 px-4 py-6 sm:px-6 lg:px-8 animate-fade-in" id="main-content">
          {children}
        </main>
      </div>
    </div>
  );
}
