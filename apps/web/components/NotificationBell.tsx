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
        className="relative flex h-8 w-8 items-center justify-center rounded-full transition hover:bg-slate-100 dark:hover:bg-slate-800 focus:outline-none"
        style={{ color: 'var(--text-secondary)' }}
        aria-label="View Notifications"
      >
        <svg
          xmlns="http://www.w3.org/2000/svg"
          fill="none"
          viewBox="0 0 24 24"
          strokeWidth={2}
          stroke="currentColor"
          className="h-5 w-5"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            d="M14.857 17.082a23.848 23.848 0 005.454-1.31A8.967 8.967 0 0118 9.75v-.7V9A6 6 0 006 9v.75a8.967 8.967 0 01-2.312 6.022c1.733.64 3.56 1.085 5.455 1.31m5.714 0a24.255 24.255 0 01-5.714 0m5.714 0a3 3 0 11-5.714 0"
          />
        </svg>

        {unreadCount > 0 && (
          <span className="absolute right-0.5 top-0.5 flex h-4 w-4 items-center justify-center rounded-full bg-rose-500 text-[9px] font-bold text-white ring-2 ring-white dark:ring-slate-900 animate-pulse">
            {unreadCount > 9 ? '9+' : unreadCount}
          </span>
        )}
      </button>

      {/* Dropdown Menu */}
      {isOpen && (
        <div
          className="absolute right-0 mt-2 w-80 sm:w-96 origin-top-right rounded-2xl border p-4 shadow-large backdrop-blur-xl animate-slide-up"
          style={{ backgroundColor: 'var(--card-bg)', borderColor: 'var(--card-border)' }}
        >
          <div className="flex items-center justify-between border-b pb-3" style={{ borderColor: 'var(--border-color)' }}>
            <div>
              <h3 className="text-sm font-semibold" style={{ color: 'var(--text-primary)' }}>Notifications</h3>
              <p className="text-[10px] mt-0.5" style={{ color: 'var(--text-muted)' }}>
                {isSocketConnected ? (
                  <span className="flex items-center gap-1.5">
                    <span className="h-1.5 w-1.5 rounded-full bg-emerald-500 animate-pulse"></span> Live
                  </span>
                ) : (
                  <span className="flex items-center gap-1.5">
                    <span className="h-1.5 w-1.5 rounded-full bg-amber-400"></span> Polling
                  </span>
                )}
              </p>
            </div>
            {unreadCount > 0 && (
              <button
                onClick={markAllAsRead}
                className="text-xs font-semibold text-emerald-600 hover:text-emerald-700 transition-colors"
              >
                Mark all read
              </button>
            )}
          </div>

          <div className="mt-3 max-h-80 overflow-y-auto space-y-1 pr-0.5">
            {notifications.length === 0 ? (
              <div className="py-10 text-center">
                <div className="flex h-12 w-12 items-center justify-center rounded-2xl mx-auto mb-3" style={{ backgroundColor: 'var(--bg-tertiary)' }}>
                  <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" style={{ color: 'var(--text-muted)' }}>
                    <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9" />
                    <path d="M13.73 21a2 2 0 0 1-3.46 0" />
                  </svg>
                </div>
                <p className="text-sm font-medium" style={{ color: 'var(--text-secondary)' }}>All caught up!</p>
                <p className="mt-1 text-xs" style={{ color: 'var(--text-muted)' }}>No notifications at this time.</p>
              </div>
            ) : (
              notifications.map((notification) => (
                <div
                  key={notification._id}
                  className={`group relative flex gap-3 rounded-xl p-3 text-left transition cursor-default`}
                  style={{
                    backgroundColor: !notification.isRead ? 'rgba(16,185,129,0.06)' : 'transparent',
                  }}
                  onMouseEnter={(e) => { (e.currentTarget as HTMLDivElement).style.backgroundColor = 'var(--bg-tertiary)'; }}
                  onMouseLeave={(e) => { (e.currentTarget as HTMLDivElement).style.backgroundColor = !notification.isRead ? 'rgba(16,185,129,0.06)' : 'transparent'; }}
                >
                  {!notification.isRead && (
                    <span className="absolute left-2 top-1/2 -translate-y-1/2 h-1.5 w-1.5 rounded-full bg-emerald-500 flex-shrink-0"></span>
                  )}
                  <div className={`flex-1 min-w-0 ${!notification.isRead ? 'pl-2' : ''}`}>
                    <div className="flex items-start justify-between gap-2">
                      <p className="text-xs font-semibold leading-tight" style={{ color: 'var(--text-primary)' }}>
                        {notification.title}
                      </p>
                      {!notification.isRead && (
                        <button
                          onClick={() => void markAsRead(notification._id)}
                          className="text-[10px] font-semibold text-emerald-600 hover:text-emerald-700 opacity-0 group-hover:opacity-100 transition duration-150 shrink-0"
                        >
                          Read
                        </button>
                      )}
                    </div>
                    <p className="mt-0.5 text-[11px] leading-relaxed break-words" style={{ color: 'var(--text-secondary)' }}>
                      {notification.message}
                    </p>
                    <p className="mt-1 text-[10px] font-medium" style={{ color: 'var(--text-muted)' }}>
                      {new Date(notification.createdAt).toLocaleDateString([], {
                        month: 'short',
                        day: 'numeric',
                        hour: '2-digit',
                        minute: '2-digit'
                      })}
                    </p>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      )}
    </div>
  );
}
