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

function Icon({ path, size = 18 }: { path: string; size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
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

function Avatar({ name, role, profilePhotoUrl }: { name: string; role: string; profilePhotoUrl?: string | null }) {
  const initials = name.split(' ').map(n => n[0]).join('').slice(0, 2).toUpperCase();
  return (
    <div className="flex items-center gap-2.5">
      <div className="flex-shrink-0 h-8 w-8 rounded-full overflow-hidden border-2 border-blue-200 dark:border-blue-800">
        {profilePhotoUrl ? (
          <img
            src={profilePhotoUrl}
            alt={name}
            className="h-full w-full object-cover"
          />
        ) : (
          <div className="flex h-full w-full items-center justify-center bg-blue-100 text-xs font-bold text-blue-700 dark:bg-blue-950/60 dark:text-blue-400">
            {initials || 'D'}
          </div>
        )}
      </div>
      <div className="min-w-0">
        <p className="truncate text-sm font-semibold leading-tight" style={{ color: 'var(--text-primary)' }}>Dr. {name || 'Doctor'}</p>
        <p className="text-[11px] font-medium text-blue-600 dark:text-blue-400 capitalize">{role}</p>
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
      className={`nav-link ${isActive ? 'active' : ''} relative`}
    >
      <span className="flex-shrink-0">
        <Icon path={ICONS[icon]} size={17} />
      </span>
      <span className="flex-1 truncate">{label}</span>
      {badgeCount !== undefined && badgeCount > 0 && (
        <span className="ml-2 rounded-full bg-rose-600 px-2 py-0.5 text-[10px] font-bold text-white">
          {badgeCount}
        </span>
      )}
      {isActive && (
        <span className="h-1.5 w-1.5 flex-shrink-0 rounded-full bg-white opacity-80" />
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
      appointmentsList.forEach((appt: any) => {
        counts[appt._id] = appt.unreadMessageCount || 0;
      });
      setAppointmentUnreadCounts(counts);
    } catch (err) {
      console.error('Failed to load initial unread counts:', err);
    }
  }, []);

  useEffect(() => {
    void loadUnreadCounts();
  }, [loadUnreadCounts]);

  // Load profile photo from user avatar and fetch doctor profile to sync
  useEffect(() => {
    if (typeof window === 'undefined') return;
    
    // 1. Initial load from local storage
    try {
      const raw = window.localStorage.getItem('docdock-auth') || window.sessionStorage.getItem('docdock-auth');
      if (raw) {
        const parsed = JSON.parse(raw);
        setProfilePhotoUrl(parsed.user?.avatar || null);
      }
    } catch { /* ignore */ }

    // 2. Fetch doctor profile to sync in background
    const syncProfile = async () => {
      try {
        const profile = await fetchDoctorProfile();
        if (profile?.profilePhotoUrl) {
          setProfilePhotoUrl(profile.profilePhotoUrl);
          // Sync to localStorage
          for (const storage of [window.localStorage, window.sessionStorage]) {
            const raw = storage.getItem('docdock-auth');
            if (raw) {
              const parsed = JSON.parse(raw);
              parsed.user = { ...(parsed.user || {}), avatar: profile.profilePhotoUrl };
              storage.setItem('docdock-auth', JSON.stringify(parsed));
            }
          }
        }
      } catch (err) {
        console.error('Failed to sync doctor profile photo:', err);
      }
    };
    void syncProfile();
  }, [user]);

  // Socket connection — connect once on mount, NOT on pathname change
  useEffect(() => {
    const raw = window.localStorage.getItem('docdock-auth') || window.sessionStorage.getItem('docdock-auth');
    if (!raw) return;
    let token = '';
    let userId = '';
    try {
      const parsed = JSON.parse(raw);
      token = parsed.accessToken || '';
      userId = parsed.user?._id || '';
    } catch (e) {
      return;
    }
    if (!token || !userId) return;

    const SOCKET_BASE = process.env.NEXT_PUBLIC_SOCKET_URL || process.env.NEXT_PUBLIC_API_URL?.replace('/api/v1', '') || 'http://localhost:4000';

    if (socketRef.current?.connected) return;

    const socket = io(`${SOCKET_BASE}/notifications`, {
      transports: ['websocket', 'polling'],
      auth: { token }
    });
    socketRef.current = socket;

    socket.on('connect', () => {
      socket.emit('join', userId);
    });

    socket.on('chat:message_received', (data: { roomId: string; appointmentId: string; message: any }) => {
      setAppointmentUnreadCounts((prev) => ({
        ...prev,
        [data.appointmentId]: (prev[data.appointmentId] || 0) + 1
      }));
    });

    const handleReadMessages = (e: Event) => {
      const { appointmentId } = (e as CustomEvent).detail || {};
      if (appointmentId) {
        setAppointmentUnreadCounts((prev) => ({
          ...prev,
          [appointmentId]: 0
        }));
      }
    };

    const handleClearAll = () => {
      setAppointmentUnreadCounts({});
    };

    const handleProfilePhotoUpdated = (e: Event) => {
      const { url } = (e as CustomEvent).detail || {};
      setProfilePhotoUrl(url || null);
    };

    window.addEventListener('docdock:read_messages', handleReadMessages);
    window.addEventListener('docdock:clear_all_notifications', handleClearAll);
    window.addEventListener('docdock:profile_photo_updated', handleProfilePhotoUpdated);

    return () => {
      socket.disconnect();
      socketRef.current = null;
      window.removeEventListener('docdock:read_messages', handleReadMessages);
      window.removeEventListener('docdock:clear_all_notifications', handleClearAll);
      window.removeEventListener('docdock:profile_photo_updated', handleProfilePhotoUpdated);
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []); // intentionally only once on mount

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

      <div className="px-3 pt-4 pb-2">
        <div className="flex items-center gap-2 rounded-lg bg-blue-50 dark:bg-blue-950/30 px-3 py-2">
          <div className="h-1.5 w-1.5 rounded-full bg-blue-500 animate-pulse" />
          <span className="text-xs font-semibold text-blue-700 dark:text-blue-400 uppercase tracking-wide">Doctor Portal</span>
        </div>
      </div>

      <nav className="flex-1 overflow-y-auto px-3 py-2 space-y-0.5">
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

      {/* User info + logout — clicking avatar area navigates to profile */}
      <div className="border-t px-3 py-3 space-y-2.5" style={{ borderColor: 'var(--border-color)' }}>
        <Link
          href="/doctor/profile"
          onClick={() => setMobileOpen(false)}
          className="block rounded-xl px-2 py-1.5 transition-all hover:bg-slate-100 dark:hover:bg-slate-800"
        >
          <Avatar
            name={user?.fullName || 'Doctor'}
            role={user?.role || 'doctor'}
            profilePhotoUrl={profilePhotoUrl}
          />
        </Link>
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
              className="flex h-8 w-8 items-center justify-center rounded-lg lg:hidden transition-all hover:bg-slate-100 dark:hover:bg-slate-800 relative"
              aria-label="Toggle menu"
            >
              <Icon path={mobileOpen ? ICONS.close : ICONS.menu} size={18} />
              {totalUnread > 0 && !mobileOpen && (
                <span className="absolute -top-1 -right-1 flex h-2 w-2 rounded-full bg-rose-600 ring-2 ring-white animate-pulse" />
              )}
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

        <VerificationBanner />

        <main className="flex-1 px-4 py-6 sm:px-6 lg:px-8 animate-fade-in">
          {children}
        </main>
      </div>
    </div>
  );
}
