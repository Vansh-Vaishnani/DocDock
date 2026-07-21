'use client';

import React, { useEffect, useRef, useState } from 'react';
import { io, Socket } from 'socket.io-client';
import { useAuth } from '../app/auth/auth-context';

interface Notification {
  _id: string;
  userId: string;
  type: string;
  title: string;
  message: string;
  isRead: boolean;
  createdAt: string;
  metadata?: any;
}

const API_BASE = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000/api/v1';
const SOCKET_BASE = process.env.NEXT_PUBLIC_SOCKET_URL || process.env.NEXT_PUBLIC_API_URL?.replace('/api/v1', '') || 'http://localhost:4000';

export default function NotificationBell() {
  const { user, accessToken } = useAuth();
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [isOpen, setIsOpen] = useState(false);
  const [isSocketConnected, setIsSocketConnected] = useState(false);
  const dropdownRef = useRef<HTMLDivElement | null>(null);

  const unreadCount = notifications.filter((n) => !n.isRead).length;

  const fetchNotifications = async () => {
    if (!accessToken) return;
    try {
      const response = await fetch(`${API_BASE}/notifications?limit=50`, {
        headers: {
          Accept: 'application/json',
          Authorization: `Bearer ${accessToken}`
        }
      });
      if (response.ok) {
        const payload = await response.json();
        setNotifications(payload.data?.notifications ?? []);
      }
    } catch (err) {
      console.error('Failed to fetch notifications:', err);
    }
  };

  const markAsRead = async (id: string) => {
    if (!accessToken) return;
    try {
      const response = await fetch(`${API_BASE}/notifications/${id}/read`, {
        method: 'PATCH',
        headers: {
          Accept: 'application/json',
          Authorization: `Bearer ${accessToken}`
        }
      });
      if (response.ok) {
        setNotifications((prev) =>
          prev.map((n) => (n._id === id ? { ...n, isRead: true } : n))
        );
        const notification = notifications.find((n) => n._id === id);
        const apptId = notification?.metadata?.appointmentId || (notification?.metadata as any)?.appointment?._id;
        if (apptId) {
          window.dispatchEvent(new CustomEvent('docdock:read_messages', {
            detail: { appointmentId: apptId }
          }));
        }
      }
    } catch (err) {
      console.error('Failed to mark notification as read:', err);
    }
  };

  const markAllAsRead = async () => {
    if (!accessToken) return;
    try {
      const response = await fetch(`${API_BASE}/notifications/read-all`, {
        method: 'PATCH',
        headers: {
          Accept: 'application/json',
          Authorization: `Bearer ${accessToken}`
        }
      });
      if (response.ok) {
        setNotifications((prev) => prev.map((n) => ({ ...n, isRead: true })));
        window.dispatchEvent(new CustomEvent('docdock:clear_all_notifications'));
      }
    } catch (err) {
      console.error('Failed to mark all notifications as read:', err);
    }
  };

  // Socket.IO and Polling Effect
  useEffect(() => {
    if (!user?._id || !accessToken) return;

    // 1. Fetch initial list
    void fetchNotifications();

    // 2. Setup Socket.IO connection
    const socket: Socket = io(`${SOCKET_BASE}/notifications`, {
      transports: ['websocket', 'polling'],
      auth: { token: accessToken }
    });

    socket.on('connect', () => {
      setIsSocketConnected(true);
      console.log('Socket.io connected to notifications namespace');
      socket.emit('join', user._id);
    });

    socket.on('disconnect', () => {
      setIsSocketConnected(false);
      console.log('Socket.io disconnected from notifications');
    });

    socket.on('notification', (newNotification: Notification) => {
      setNotifications((prev) => {
        // Prevent duplicate notifications in list
        if (prev.some((n) => n._id === newNotification._id)) return prev;
        return [newNotification, ...prev];
      });
    });

    // 3. Fallback Polling if socket fails/is not connected
    const pollingInterval = setInterval(() => {
      if (!socket.connected) {
        console.log('Socket.io disconnected/unavailable. Falling back to polling...');
        void fetchNotifications();
      }
    }, 12000); // poll every 12 seconds if socket is down

    return () => {
      socket.disconnect();
      clearInterval(pollingInterval);
    };
  }, [user?._id, accessToken]);

  // Click outside close
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  return (
    <div className="relative z-50" ref={dropdownRef}>
      {/* Bell Button */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="btn-icon relative"
        aria-label={`View Notifications${unreadCount > 0 ? ` (${unreadCount} unread)` : ''}`}
        aria-expanded={isOpen}
        aria-haspopup="true"
      >
        <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9" />
          <path d="M13.73 21a2 2 0 0 1-3.46 0" />
        </svg>
        {unreadCount > 0 && (
          <span className="absolute -right-0.5 -top-0.5 flex h-[18px] min-w-[18px] items-center justify-center rounded-full bg-rose-500 px-1 text-[9px] font-bold text-white ring-2 ring-white dark:ring-slate-900">
            {unreadCount > 99 ? '99+' : unreadCount}
          </span>
        )}
      </button>

      {/* Dropdown Menu */}
      {isOpen && (
        <div
          className="absolute right-0 mt-2 w-80 sm:w-96 origin-top-right rounded-2xl border shadow-xl animate-fade-in-down"
          style={{ backgroundColor: 'var(--card-bg)', borderColor: 'var(--card-border)', boxShadow: 'var(--shadow-xl)' }}
          role="dialog"
          aria-label="Notifications"
        >
          {/* Header */}
          <div className="flex items-center justify-between px-4 py-3.5" style={{ borderBottom: '1px solid var(--border-color)' }}>
            <div className="flex items-center gap-2.5">
              <h3 className="text-sm font-bold" style={{ color: 'var(--text-primary)' }}>Notifications</h3>
              {unreadCount > 0 && (
                <span className="flex h-5 min-w-[20px] items-center justify-center rounded-full bg-rose-500 px-1.5 text-[10px] font-bold text-white">
                  {unreadCount}
                </span>
              )}
            </div>
            <div className="flex items-center gap-2">
              <span className="flex items-center gap-1.5 text-[10px] font-medium" style={{ color: 'var(--text-muted)' }}>
                <span className={`h-1.5 w-1.5 rounded-full ${isSocketConnected ? 'bg-emerald-500 animate-pulse' : 'bg-amber-400'}`} />
                {isSocketConnected ? 'Live' : 'Polling'}
              </span>
              {unreadCount > 0 && (
                <button
                  onClick={markAllAsRead}
                  className="text-xs font-semibold text-emerald-600 hover:text-emerald-700 transition-colors"
                  aria-label="Mark all notifications as read"
                >
                  Mark all read
                </button>
              )}
            </div>
          </div>

          <div className="max-h-80 overflow-y-auto">
            {notifications.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-12 text-center px-4">
                <div className="flex h-14 w-14 items-center justify-center rounded-2xl mb-3"
                  style={{ background: 'linear-gradient(135deg, rgba(16,185,129,0.1), rgba(16,185,129,0.05))', border: '1px solid rgba(16,185,129,0.15)' }}>
                  <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" style={{ color: '#10b981' }}>
                    <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9" />
                    <path d="M13.73 21a2 2 0 0 1-3.46 0" />
                  </svg>
                </div>
                <p className="text-sm font-semibold" style={{ color: 'var(--text-primary)' }}>All caught up!</p>
                <p className="mt-1 text-xs" style={{ color: 'var(--text-muted)' }}>No new notifications at this time.</p>
              </div>
            ) : (
              <div className="px-2 py-1.5 space-y-0.5">
                {notifications.map((notification) => (
                  <div
                    key={notification._id}
                    className="group relative flex gap-3 rounded-xl px-3 py-3 transition-colors cursor-default"
                    style={{ backgroundColor: !notification.isRead ? 'rgba(16,185,129,0.05)' : 'transparent' }}
                    onMouseEnter={(e) => { (e.currentTarget as HTMLDivElement).style.backgroundColor = 'var(--bg-secondary)'; }}
                    onMouseLeave={(e) => { (e.currentTarget as HTMLDivElement).style.backgroundColor = !notification.isRead ? 'rgba(16,185,129,0.05)' : 'transparent'; }}
                  >
                    {!notification.isRead && (
                      <span className="absolute left-1.5 top-1/2 -translate-y-1/2 h-1.5 w-1.5 rounded-full bg-emerald-500" aria-hidden="true" />
                    )}
                    <div className={`flex-1 min-w-0 ${!notification.isRead ? 'pl-1.5' : ''}`}>
                      <div className="flex items-start justify-between gap-2">
                        <p className="text-xs font-semibold leading-tight" style={{ color: 'var(--text-primary)' }}>
                          {notification.title}
                        </p>
                        {!notification.isRead && (
                          <button
                            onClick={() => void markAsRead(notification._id)}
                            className="text-[10px] font-semibold text-emerald-600 hover:text-emerald-700 opacity-0 group-hover:opacity-100 transition-opacity flex-shrink-0"
                            aria-label={`Mark notification as read: ${notification.title}`}
                          >
                            Mark read
                          </button>
                        )}
                      </div>
                      <p className="mt-0.5 text-[11px] leading-relaxed" style={{ color: 'var(--text-secondary)' }}>
                        {notification.message}
                      </p>
                      <p className="mt-1 text-[10px]" style={{ color: 'var(--text-muted)' }}>
                        {new Date(notification.createdAt).toLocaleString([], { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
