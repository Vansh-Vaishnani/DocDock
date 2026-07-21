'use client';

import Link from 'next/link';
import Image from 'next/image';
import { usePathname } from 'next/navigation';
import { type ReactNode, useMemo, useState, useEffect, useCallback, useRef } from 'react';
import { io, Socket } from 'socket.io-client';
import { fetchPatientAppointments, fetchPatientProfile } from '../api';

import { useAuth } from '../../auth/auth-context';
import NotificationBell from '@/components/NotificationBell';
import { DarkModeToggle } from '../../theme-context';
import { UnifiedAIAssistant } from '@/components/ai/UnifiedAIAssistant';

// ─── Icons ───────────────────────────────────────────────────
function Icon({ path, size = 18, className = '' }: { path: string; size?: number; className?: string }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" className={className}>
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
  settings: 'M12 15a3 3 0 1 0 0-6 3 3 0 0 0 0 6z M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83-2.83l.06.06A1.65 1.65 0 0 0 4.68 15a1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 2.83-2.83l.06.06A1.65 1.65 0 0 0 9 4.68a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 2.83l-.06.06A1.65 1.65 0 0 0 19.4 9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z',
  logout: 'M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4 M16 17l5-5-5-5 M21 12H9',
  menu: 'M3 12h18M3 6h18M3 18h18',
  close: 'M18 6L6 18M6 6l12 12',
  ai_symptom: 'M9.5 2A2.5 2.5 0 0 1 12 4.5v15a2.5 2.5 0 0 1-4.96.44L2.18 12a2.5 2.5 0 0 1 2.32-3.66H7v-4A2.5 2.5 0 0 1 9.5 2z M14.5 2A2.5 2.5 0 0 0 12 4.5v15a2.5 2.5 0 0 0 4.96.44L21.82 12a2.5 2.5 0 0 0-2.32-3.66H17v-4A2.5 2.5 0 0 0 14.5 2z',
  ai_chat: 'M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z',
  search: 'M21 21l-6-6m2-5a7 7 0 1 1-14 0 7 7 0 0 1 14 0z',
};

const navItems = [
  { href: '/patient/dashboard', label: 'Dashboard', icon: 'dashboard' },
  { href: '/patient/ai-assistant', label: 'AI Assistant', icon: 'ai_chat' },
  { href: '/patient/appointments', label: 'Appointments', icon: 'appointments' },
  { href: '/patient/addresses', label: 'Addresses', icon: 'addresses' },
  { href: '/patient/medical-history', label: 'Medical History', icon: 'history' },
  { href: '/patient/allergies', label: 'Allergies', icon: 'allergies' },
  { href: '/patient/settings', label: 'Settings', icon: 'settings' },
];

// ─── DocDock Logo ─────────────────────────────────────────────
function DocDockLogo({ collapsed = false }: { collapsed?: boolean }) {
  return (
    <div className="flex items-center gap-3">
      <div style={{ width: 34, height: 34, borderRadius: 12, overflow: 'hidden', flexShrink: 0, display: 'inline-flex', boxShadow: '0 2px 8px rgba(16,185,129,0.25)' }}>
        <Image src="/logo.png" alt="DocDock Logo" width={34} height={34} style={{ display: 'block', width: 34, height: 34 }} priority />
      </div>
      {!collapsed && (
        <div>
          <div className="text-[15px] font-bold leading-none tracking-tight" style={{ color: 'var(--text-primary)' }}>DocDock</div>
          <div className="mt-0.5 text-[10px] leading-none font-medium" style={{ color: 'var(--text-muted)' }}>Knock-Knock, your doctor is here.</div>
        </div>
      )}
    </div>
  );
}

// ─── Avatar ───────────────────────────────────────────────────
function SidebarProfile({ name, role, profilePhotoUrl }: { name: string; role: string; profilePhotoUrl?: string | null }) {
  const initials = name.split(' ').map(n => n[0]).join('').slice(0, 2).toUpperCase();
  return (
    <div className="flex items-center gap-3">
      <div className="relative flex-shrink-0">
        <div className="h-10 w-10 rounded-xl overflow-hidden" style={{ border: '2px solid rgba(16,185,129,0.3)' }}>
          {profilePhotoUrl ? (
            <img src={profilePhotoUrl} alt={name} className="h-full w-full object-cover" />
          ) : (
            <div className="flex h-full w-full items-center justify-center text-sm font-bold"
              style={{ background: 'linear-gradient(135deg, #d1fae5, #a7f3d0)', color: '#065f46' }}>
              {initials || 'P'}
            </div>
          )}
        </div>
        <span className="absolute -bottom-0.5 -right-0.5 h-3 w-3 rounded-full bg-emerald-500 ring-2 ring-white dark:ring-slate-900" />
      </div>
      <div className="min-w-0 flex-1">
        <p className="truncate text-sm font-semibold leading-tight" style={{ color: 'var(--text-primary)' }}>{name || 'Patient'}</p>
        <p className="text-[11px] font-medium capitalize" style={{ color: 'var(--emerald)' }}>{role}</p>
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
      className={`nav-link ${isActive ? 'active' : ''} group`}
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

// ─── Patient Shell ────────────────────────────────────────────
export function PatientShell({ children }: { children: ReactNode }) {
  const pathname = usePathname();
  const { user, logout } = useAuth();
  const [mobileOpen, setMobileOpen] = useState(false);
  const [showAIDrawer, setShowAIDrawer] = useState(false);
  const [appointmentUnreadCounts, setAppointmentUnreadCounts] = useState<Record<string, number>>({});
  const [profilePhotoUrl, setProfilePhotoUrl] = useState<string | null>(null);
  const socketRef = useRef<Socket | null>(null);

  const totalUnread = useMemo(() => {
    return Object.values(appointmentUnreadCounts).reduce((acc, curr) => acc + curr, 0);
  }, [appointmentUnreadCounts]);

  const loadUnreadCounts = useCallback(async () => {
    try {
      const appointmentsList = await fetchPatientAppointments('all');
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

  useEffect(() => {
    if (typeof window === 'undefined') return;
    try {
      const raw = window.localStorage.getItem('docdock-auth') || window.sessionStorage.getItem('docdock-auth');
      if (raw) {
        const parsed = JSON.parse(raw);
        setProfilePhotoUrl(parsed.user?.avatar || null);
      }
    } catch { /* ignore */ }

    const syncProfile = async () => {
      try {
        const profile = await fetchPatientProfile();
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
      } catch (err) {
        console.error('Failed to sync patient profile photo:', err);
      }
    };
    void syncProfile();
  }, [user]);

  useEffect(() => {
    if (mobileOpen || showAIDrawer) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = '';
    }
    return () => {
      document.body.style.overflow = '';
    };
  }, [mobileOpen, showAIDrawer]);

  useEffect(() => {
    const raw = window.localStorage.getItem('docdock-auth') || window.sessionStorage.getItem('docdock-auth');
    if (!raw) return;
    let token = '';
    let userId = '';
    try {
      const parsed = JSON.parse(raw);
      token = parsed.accessToken || '';
      userId = parsed.user?._id || '';
    } catch (e) { return; }
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
  }, []);

  const activeItem = useMemo(() => {
    return navItems.find((item) => pathname === item.href || pathname.startsWith(`${item.href}/`)) ?? navItems[0];
  }, [pathname]);

  const sidebarContent = (
    <div className="flex h-full flex-col">
      {/* Logo */}
      <div className="px-4 py-5" style={{ borderBottom: '1px solid var(--border-color)' }}>
        <Link href="/" onClick={() => setMobileOpen(false)}>
          <DocDockLogo />
        </Link>
      </div>

      {/* Role badge */}
      <div className="px-4 pt-4 pb-2">
        <div className="flex items-center gap-2 rounded-xl px-3 py-2" style={{ background: 'linear-gradient(135deg, rgba(16,185,129,0.1) 0%, rgba(16,185,129,0.05) 100%)', border: '1px solid rgba(16,185,129,0.15)' }}>
          <span className="dot-pulse bg-emerald-500" />
          <span className="text-[11px] font-bold uppercase tracking-widest text-emerald-600 dark:text-emerald-400">Patient Portal</span>
        </div>
      </div>

      {/* Nav */}
      <nav className="flex-1 overflow-y-auto px-3 py-2 space-y-0.5" aria-label="Patient navigation">
        {navItems.map((item) => (
          <NavItem
            key={item.href}
            href={item.href}
            label={item.label}
            icon={item.icon}
            isActive={activeItem.href === item.href}
            onClick={() => setMobileOpen(false)}
            badgeCount={item.href === '/patient/appointments' ? totalUnread : undefined}
          />
        ))}
      </nav>

      {/* Find Doctors CTA */}
      <div className="px-4 pb-3 pt-1">
        <Link
          href="/find-doctors"
          onClick={() => setMobileOpen(false)}
          className="flex items-center justify-center gap-2 rounded-xl px-4 py-2.5 text-sm font-bold text-white transition-all group"
          style={{ background: 'linear-gradient(135deg, #10b981 0%, #059669 100%)', boxShadow: '0 4px 14px -3px rgba(16,185,129,0.4)' }}
        >
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" className="transition-transform group-hover:scale-110">
            <circle cx="11" cy="11" r="8" /><path d="m21 21-4.35-4.35" />
          </svg>
          Find Doctors
        </Link>
      </div>

      {/* Sticky Profile Section */}
      <div className="px-4 py-4 mt-auto" style={{ borderTop: '1px solid var(--border-color)' }}>
        <Link
          href="/patient/profile"
          onClick={() => setMobileOpen(false)}
          className="block rounded-xl p-3 transition-all"
          style={{ background: 'var(--bg-secondary)', border: '1px solid var(--border-color)' }}
        >
          <SidebarProfile
            name={user?.fullName || 'Patient'}
            role={user?.role || 'patient'}
            profilePhotoUrl={profilePhotoUrl}
          />
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
      {/* ── Desktop sidebar ───────────────────────── */}
      <aside
        className="fixed top-0 left-0 z-40 hidden h-full lg:flex flex-col"
        style={{ width: 'var(--sidebar-width)', backgroundColor: 'var(--sidebar-bg)', borderRight: '1px solid var(--sidebar-border)' }}
        aria-label="Sidebar"
      >
        {sidebarContent}
      </aside>

      {/* ── Mobile overlay ────────────────────────── */}
      {mobileOpen && (
        <div
          className="fixed inset-0 z-40 bg-black/60 backdrop-blur-sm lg:hidden animate-fade-in"
          onClick={() => setMobileOpen(false)}
          aria-hidden="true"
        />
      )}

      {/* ── Mobile sidebar ────────────────────────── */}
      <aside
        className={`fixed top-0 left-0 z-50 h-full flex-col border-r lg:hidden transition-all duration-300 ease-out ${
          mobileOpen ? 'flex translate-x-0 shadow-xl' : 'hidden -translate-x-full'
        }`}
        style={{ width: 'var(--sidebar-width)', backgroundColor: 'var(--sidebar-bg)', borderColor: 'var(--sidebar-border)' }}
        aria-hidden={!mobileOpen}
      >
        {sidebarContent}
      </aside>

      {/* ── Main content area ───────────────────── */}
      {/* Desktop: offset by sidebar width. Mobile: full width */}
      <div
        className="flex flex-col min-h-screen lg:ml-[var(--sidebar-width)]"
      >
        <div className="flex flex-col min-h-screen">
          {/* Top bar */}
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
            {/* Left: hamburger + breadcrumb */}
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
              {/* Breadcrumb on desktop */}
              <div className="hidden sm:flex items-center gap-2">
                <span className="text-xs font-medium" style={{ color: 'var(--text-muted)' }}>Patient</span>
                <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ color: 'var(--border-color)' }}><path d="M9 18l6-6-6-6" /></svg>
                <span className="text-sm font-semibold" style={{ color: 'var(--text-primary)' }}>{activeItem.label}</span>
              </div>
              {/* Logo on mobile */}
              <div className="block sm:hidden">
                <Link href="/"><DocDockLogo /></Link>
              </div>
            </div>

            {/* Right: actions */}
            <div className="flex items-center gap-1.5">
              <Link
                href="/patient/ai-assistant"
                className="lg:hidden flex items-center gap-1.5 rounded-xl border px-3 py-1.5 text-xs font-semibold transition-all"
                style={{ borderColor: 'rgba(16,185,129,0.25)', background: 'rgba(16,185,129,0.06)', color: '#059669' }}
              >
                <span>✨</span> AI
              </Link>
              <DarkModeToggle />
              <NotificationBell />
            </div>
          </header>

          <main className="flex-1 px-4 py-6 sm:px-6 lg:px-8 animate-fade-in" id="main-content">
            {children}
          </main>
        </div>
      </div>

      {/* Floating AI Button (Desktop only) */}
      <button
        onClick={() => setShowAIDrawer(!showAIDrawer)}
        className="hidden lg:flex fixed bottom-8 right-8 z-50 h-14 w-14 items-center justify-center rounded-2xl text-white transition-all duration-300 hover:scale-110 active:scale-95 group no-print"
        style={{ background: 'linear-gradient(135deg, #10b981, #059669)', boxShadow: '0 8px 30px -4px rgba(16,185,129,0.5)' }}
        aria-label="Open AI Assistant"
        aria-expanded={showAIDrawer}
      >
        <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="transition-transform duration-300 group-hover:rotate-12">
          <path d="M12 2l2.4 7.2L21.6 12l-7.2 2.4L12 21.6l-2.4-7.2L2.4 12l7.2-2.4z" />
        </svg>
      </button>

      {/* Slide-out AI Panel (Desktop only) */}
      {showAIDrawer && (
        <>
          <div
            className="hidden lg:block fixed inset-0 z-40 bg-black/40 backdrop-blur-xs"
            onClick={() => setShowAIDrawer(false)}
            aria-hidden="true"
          />
          <div
            className="hidden lg:flex fixed top-0 right-0 z-50 h-full w-[460px] flex-col animate-slide-in-right"
            style={{ backgroundColor: 'var(--card-bg)', borderLeft: '1px solid var(--border-color)', boxShadow: '-20px 0 60px -20px rgba(0,0,0,0.2)' }}
          >
            <div className="flex items-center justify-between px-5 py-4" style={{ borderBottom: '1px solid var(--border-color)' }}>
              <div className="flex items-center gap-3">
                <div className="flex h-9 w-9 items-center justify-center rounded-xl text-emerald-600 dark:text-emerald-400" style={{ background: 'linear-gradient(135deg, rgba(16,185,129,0.12), rgba(16,185,129,0.06))', border: '1px solid rgba(16,185,129,0.2)' }}>
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M12 2l2.4 7.2L21.6 12l-7.2 2.4L12 21.6l-2.4-7.2L2.4 12l7.2-2.4z" />
                  </svg>
                </div>
                <div>
                  <h3 className="text-sm font-bold" style={{ color: 'var(--text-primary)' }}>DocDock AI Assistant</h3>
                  <p className="text-xs" style={{ color: 'var(--text-muted)' }}>Switch modes or ask medical questions</p>
                </div>
              </div>
              <button
                onClick={() => setShowAIDrawer(false)}
                className="btn-icon"
                aria-label="Close AI Assistant"
              >
                <Icon path={ICONS.close} size={16} />
              </button>
            </div>
            <div className="flex-1 overflow-hidden p-3">
              <UnifiedAIAssistant containerHeight="h-full" defaultMode="chat" />
            </div>
          </div>
        </>
      )}
    </div>
  );
}
