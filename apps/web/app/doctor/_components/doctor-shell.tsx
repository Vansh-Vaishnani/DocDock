'use client';

import Link from 'next/link';
import Image from 'next/image';
import { usePathname } from 'next/navigation';
import { type ReactNode, useMemo, useState, useEffect, useCallback, useRef } from 'react';
import { io, Socket } from 'socket.io-client';
import { fetchDoctorAppointments, fetchDoctorProfile } from '../api';

import { useAuth } from '../../auth/auth-context';
import { VerificationBanner } from './verification-banner';
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
  profile: 'M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2 M12 11a4 4 0 1 0 0-8 4 4 0 0 0 0 8z',
  availability: 'M12 2a10 10 0 1 0 0 20 10 10 0 0 0 0-20z M12 6v6l4 2',
  appointments: 'M8 6h13M8 12h13M8 18h13M3 6h.01M3 12h.01M3 18h.01',
  prescriptions: 'M9 11l3 3L22 4 M21 12v7a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11',
  earnings: 'M12 1v22M17 5H9.5a3.5 3.5 0 1 0 0 7h5a3.5 3.5 0 1 1 0 7H6',
  settings: 'M12 15a3 3 0 1 0 0-6 3 3 0 0 0 0 6z M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83-2.83l.06.06A1.65 1.65 0 0 0 4.68 15a1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 2.83-2.83l.06.06A1.65 1.65 0 0 0 9 4.68a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 2.83l-.06.06A1.65 1.65 0 0 0 19.4 9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z',
  logout: 'M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4 M16 17l5-5-5-5 M21 12H9',
  menu: 'M3 12h18M3 6h18M3 18h18',
  close: 'M18 6L6 18M6 6l12 12',
};

const navItems = [
  { href: '/doctor/dashboard', label: 'Dashboard', icon: 'dashboard' },
  { href: '/doctor/availability', label: 'Availability', icon: 'availability' },
  { href: '/doctor/appointments', label: 'Appointments', icon: 'appointments' },
  { href: '/doctor/prescriptions', label: 'Patients', icon: 'prescriptions' },
  { href: '/doctor/earnings', label: 'Earnings', icon: 'earnings' },
  { href: '/doctor/settings', label: 'Settings', icon: 'settings' },
];

function DocDockLogo() {
  return (
    <div className="flex items-center gap-3">
      <div style={{ width: 34, height: 34, borderRadius: 12, overflow: 'hidden', flexShrink: 0, display: 'inline-flex', boxShadow: '0 2px 8px rgba(59,130,246,0.25)' }}>
        <Image src="/logo.png" alt="DocDock Logo" width={34} height={34} style={{ display: 'block', width: 34, height: 34 }} priority />
      </div>
      <div>
        <div className="text-[15px] font-bold leading-none tracking-tight" style={{ color: 'var(--text-primary)' }}>DocDock</div>
        <div className="mt-0.5 text-[10px] leading-none font-medium" style={{ color: 'var(--text-muted)' }}>Knock-Knock, your doctor is here.</div>
      </div>
    </div>
  );
}

function SidebarProfile({ name, role, profilePhotoUrl }: { name: string; role: string; profilePhotoUrl?: string | null }) {
  const initials = name.split(' ').map(n => n[0]).join('').slice(0, 2).toUpperCase();
  return (
    <div className="flex items-center gap-3">
      <div className="relative flex-shrink-0">
        <div className="h-10 w-10 rounded-xl overflow-hidden" style={{ border: '2px solid rgba(59,130,246,0.3)' }}>
          {profilePhotoUrl ? (
            <img src={profilePhotoUrl} alt={name} className="h-full w-full object-cover" />
          ) : (
            <div className="flex h-full w-full items-center justify-center text-sm font-bold"
              style={{ background: 'linear-gradient(135deg, #dbeafe, #bfdbfe)', color: '#1d4ed8' }}>
              {initials || 'D'}
            </div>
          )}
        </div>
        <span className="absolute -bottom-0.5 -right-0.5 h-3 w-3 rounded-full bg-blue-500 ring-2 ring-white dark:ring-slate-900" />
      </div>
      <div className="min-w-0 flex-1">
        <p className="truncate text-sm font-semibold leading-tight" style={{ color: 'var(--text-primary)' }}>Dr. {name || 'Doctor'}</p>
        <p className="text-[11px] font-medium capitalize" style={{ color: '#3b82f6' }}>{role}</p>
      </div>
    </div>
  );
}

function NavItem({ href, label, icon, isActive, onClick, badgeCount }: {
  href: string;
  label: string;
  icon: string;
  isActive: boolean;
  onClick?: () => void;
  badgeCount?: number;
}) {
  return (
    <Link
      href={href}
      onClick={onClick}
      className={`nav-link ${isActive ? 'active-blue' : ''} group`}
      aria-current={isActive ? 'page' : undefined}
    >
      <span className={`flex-shrink-0 transition-transform duration-200 ${isActive ? '' : 'group-hover:scale-110'}`}>
        <Icon path={ICONS[icon]} size={17} />
      </span>
      <span className="flex-1 truncate">{label}</span>
      {badgeCount !== undefined && badgeCount > 0 && (
        <span className="ml-1 flex h-5 min-w-[20px] items-center justify-center rounded-full bg-rose-500 px-1.5 text-[10px] font-bold text-white animate-pop-in">
          {badgeCount > 99 ? '99+' : badgeCount}
        </span>
      )}
    </Link>
  );
}

export function DoctorShell({ children }: { children: ReactNode }) {
  const pathname = usePathname();
  const { user, logout } = useAuth();
  const [mobileOpen, setMobileOpen] = useState(false);
  const [appointmentUnreadCounts, setAppointmentUnreadCounts] = useState<Record<string, number>>({});
  const [profilePhotoUrl, setProfilePhotoUrl] = useState<string | null>(null);
  const socketRef = useRef<Socket | null>(null);

  const totalUnread = useMemo(() => {
    return Object.values(appointmentUnreadCounts).reduce((acc, curr) => acc + curr, 0);
  }, [appointmentUnreadCounts]);

  const loadUnreadCounts = useCallback(async () => {
    try {
      const appointmentsList = await fetchDoctorAppointments('all');
      const counts: Record<string, number> = {};
      appointmentsList.forEach((appt: any) => { counts[appt._id] = appt.unreadMessageCount || 0; });
      setAppointmentUnreadCounts(counts);
    } catch (err) {
      console.error('Failed to load initial unread counts:', err);
    }
  }, []);

  useEffect(() => { void loadUnreadCounts(); }, [loadUnreadCounts]);

  useEffect(() => {
    if (typeof window === 'undefined') return;
    try {
      const raw = window.localStorage.getItem('docdock-auth') || window.sessionStorage.getItem('docdock-auth');
      if (raw) { const parsed = JSON.parse(raw); setProfilePhotoUrl(parsed.user?.avatar || null); }
    } catch { /* ignore */ }

    const syncProfile = async () => {
      try {
        const profile = await fetchDoctorProfile();
        if (profile?.profilePhotoUrl) {
          setProfilePhotoUrl(profile.profilePhotoUrl);
          for (const storage of [window.localStorage, window.sessionStorage]) {
            const raw = storage.getItem('docdock-auth');
            if (raw) {
              const parsed = JSON.parse(raw);
              parsed.user = { ...(parsed.user || {}), avatar: profile.profilePhotoUrl };
              storage.setItem('docdock-auth', JSON.stringify(parsed));
            }
          }
        }
      } catch (err) { console.error('Failed to sync doctor profile photo:', err); }
    };
    void syncProfile();
  }, [user]);

  useEffect(() => {
    const raw = window.localStorage.getItem('docdock-auth') || window.sessionStorage.getItem('docdock-auth');
    if (!raw) return;
    let token = ''; let userId = '';
    try { const parsed = JSON.parse(raw); token = parsed.accessToken || ''; userId = parsed.user?._id || ''; } catch (e) { return; }
    if (!token || !userId) return;

    const SOCKET_BASE = process.env.NEXT_PUBLIC_SOCKET_URL || process.env.NEXT_PUBLIC_API_URL?.replace('/api/v1', '') || 'http://localhost:4000';
    if (socketRef.current?.connected) return;

    const socket = io(`${SOCKET_BASE}/notifications`, { transports: ['websocket', 'polling'], auth: { token } });
    socketRef.current = socket;
    socket.on('connect', () => { socket.emit('join', userId); });
    socket.on('chat:message_received', (data: { roomId: string; appointmentId: string; message: any }) => {
      setAppointmentUnreadCounts((prev) => ({ ...prev, [data.appointmentId]: (prev[data.appointmentId] || 0) + 1 }));
    });

    const handleReadMessages = (e: Event) => {
      const { appointmentId } = (e as CustomEvent).detail || {};
      if (appointmentId) setAppointmentUnreadCounts((prev) => ({ ...prev, [appointmentId]: 0 }));
    };
    const handleClearAll = () => { setAppointmentUnreadCounts({}); };
    const handleProfilePhotoUpdated = (e: Event) => { const { url } = (e as CustomEvent).detail || {}; setProfilePhotoUrl(url || null); };

    window.addEventListener('docdock:read_messages', handleReadMessages);
    window.addEventListener('docdock:clear_all_notifications', handleClearAll);
    window.addEventListener('docdock:profile_photo_updated', handleProfilePhotoUpdated);

    return () => {
      socket.disconnect(); socketRef.current = null;
      window.removeEventListener('docdock:read_messages', handleReadMessages);
      window.removeEventListener('docdock:clear_all_notifications', handleClearAll);
      window.removeEventListener('docdock:profile_photo_updated', handleProfilePhotoUpdated);
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const activeItem = useMemo(() => {
    return navItems.find((item) => pathname === item.href || pathname.startsWith(`${item.href}/`)) ?? navItems[0];
  }, [pathname]);

  const sidebarContent = (
    <div className="flex h-full flex-col">
      <div className="px-4 py-5" style={{ borderBottom: '1px solid var(--border-color)' }}>
        <Link href="/" onClick={() => setMobileOpen(false)}><DocDockLogo /></Link>
      </div>

      <div className="px-4 pt-4 pb-2">
        <div className="flex items-center gap-2 rounded-xl px-3 py-2" style={{ background: 'linear-gradient(135deg, rgba(59,130,246,0.1) 0%, rgba(59,130,246,0.05) 100%)', border: '1px solid rgba(59,130,246,0.15)' }}>
          <span className="dot-pulse bg-blue-500" />
          <span className="text-[11px] font-bold uppercase tracking-widest text-blue-600 dark:text-blue-400">Doctor Portal</span>
        </div>
      </div>

      <nav className="flex-1 overflow-y-auto px-3 py-2 space-y-0.5" aria-label="Doctor navigation">
        {navItems.map((item) => (
          <NavItem
            key={item.href}
            href={item.href}
            label={item.label}
            icon={item.icon}
            isActive={activeItem.href === item.href}
            onClick={() => setMobileOpen(false)}
            badgeCount={item.href === '/doctor/appointments' ? totalUnread : undefined}
          />
        ))}
      </nav>

      <div className="px-4 py-4 mt-auto" style={{ borderTop: '1px solid var(--border-color)' }}>
        <Link
          href="/doctor/profile"
          onClick={() => setMobileOpen(false)}
          className="block rounded-xl p-3 transition-all"
          style={{ background: 'var(--bg-secondary)', border: '1px solid var(--border-color)' }}
        >
          <SidebarProfile name={user?.fullName || 'Doctor'} role={user?.role || 'doctor'} profilePhotoUrl={profilePhotoUrl} />
        </Link>
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
              className="btn-icon lg:hidden relative"
              aria-label="Toggle navigation menu"
              aria-expanded={mobileOpen}
            >
              <Icon path={mobileOpen ? ICONS.close : ICONS.menu} size={18} />
              {totalUnread > 0 && !mobileOpen && (
                <span className="absolute -top-0.5 -right-0.5 flex h-2 w-2 rounded-full bg-rose-500 ring-2 ring-white dark:ring-slate-900 animate-pulse" aria-hidden="true" />
              )}
            </button>
            <div className="hidden sm:flex items-center gap-2">
              <span className="text-xs font-medium" style={{ color: 'var(--text-muted)' }}>Doctor</span>
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

        <VerificationBanner />

        <main className="flex-1 px-4 py-6 sm:px-6 lg:px-8 animate-fade-in" id="main-content">
          {children}
        </main>
      </div>
    </div>
  );
}
