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
}

const API_BASE = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000/api/v1';
const SOCKET_BASE = process.env.NEXT_PUBLIC_SOCKET_URL || 'http://localhost:4000';

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
        className="relative rounded-full p-2.5 text-slate-700 transition hover:bg-slate-100 hover:text-emerald-600 focus:outline-none focus:ring-2 focus:ring-emerald-500/20"
        aria-label="View Notifications"
      >
        <svg
          xmlns="http://www.w3.org/2000/svg"
          fill="none"
          viewBox="0 0 24 24"
          strokeWidth={2}
          stroke="currentColor"
          className="h-6 w-6"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            d="M14.857 17.082a23.848 23.848 0 005.454-1.31A8.967 8.967 0 0118 9.75v-.7V9A6 6 0 006 9v.75a8.967 8.967 0 01-2.312 6.022c1.733.64 3.56 1.085 5.455 1.31m5.714 0a24.255 24.255 0 01-5.714 0m5.714 0a3 3 0 11-5.714 0"
          />
        </svg>

        {unreadCount > 0 && (
          <span className="absolute right-1.5 top-1.5 flex h-5 w-5 items-center justify-center rounded-full bg-rose-500 text-[10px] font-bold text-white ring-2 ring-white animate-pulse">
            {unreadCount > 9 ? '9+' : unreadCount}
          </span>
        )}
      </button>

      {/* Dropdown Menu */}
      {isOpen && (
        <div className="absolute right-0 mt-3 w-80 sm:w-96 origin-top-right rounded-3xl border border-slate-200/80 bg-white/95 p-4 shadow-[0_20px_50px_-12px_rgba(15,23,42,0.25)] backdrop-blur-xl ring-1 ring-black/5 focus:outline-none transition-all duration-200">
          <div className="flex items-center justify-between border-b border-slate-100 pb-3">
            <div>
              <h3 className="font-semibold text-slate-900">Notifications</h3>
              <p className="text-xs text-slate-500">
                {isSocketConnected ? (
                  <span className="flex items-center gap-1.5">
                    <span className="h-1.5 w-1.5 rounded-full bg-emerald-500"></span> Live Updates
                  </span>
                ) : (
                  <span className="flex items-center gap-1.5">
                    <span className="h-1.5 w-1.5 rounded-full bg-amber-400"></span> Polling fallback
                  </span>
                )}
              </p>
            </div>
            {unreadCount > 0 && (
              <button
                onClick={markAllAsRead}
                className="text-xs font-semibold text-emerald-600 hover:text-emerald-700 transition"
              >
                Mark all as read
              </button>
            )}
          </div>

          {/* List of Notifications */}
          <div className="mt-3 max-h-80 overflow-y-auto space-y-2 pr-1">
            {notifications.length === 0 ? (
              <div className="py-8 text-center">
                <p className="text-sm font-medium text-slate-500">No notifications yet</p>
                <p className="mt-1 text-xs text-slate-400">We will notify you when things change.</p>
              </div>
            ) : (
              notifications.map((notification) => (
                <div
                  key={notification._id}
                  className={`group relative flex gap-3 rounded-2xl p-3 text-left transition ${
                    notification.isRead
                      ? 'bg-transparent hover:bg-slate-50'
                      : 'bg-emerald-50/50 hover:bg-emerald-50 ring-1 ring-emerald-500/10'
                  }`}
                >
                  <div className="flex-1 min-w-0">
                    <div className="flex items-start justify-between gap-2">
                      <p className={`text-sm ${notification.isRead ? 'font-medium text-slate-900' : 'font-semibold text-emerald-950'}`}>
                        {notification.title}
                      </p>
                      {!notification.isRead && (
                        <button
                          onClick={() => void markAsRead(notification._id)}
                          className="text-[10px] font-semibold text-emerald-600 hover:text-emerald-700 opacity-0 group-hover:opacity-100 transition duration-150 shrink-0"
                        >
                          Mark read
                        </button>
                      )}
                    </div>
                    <p className="mt-1 text-xs text-slate-600 leading-normal break-words pr-2">
                      {notification.message}
                    </p>
                    <p className="mt-2 text-[10px] font-medium text-slate-400">
                      {new Date(notification.createdAt).toLocaleDateString([], {
                        month: 'short',
                        day: 'numeric',
                        hour: '2-digit',
                        minute: '2-digit'
                      })}
                    </p>
                  </div>
                  {!notification.isRead && (
                    <span className="absolute right-3.5 bottom-3.5 h-2 w-2 rounded-full bg-emerald-500 shrink-0"></span>
                  )}
                </div>
              ))
            )}
          </div>
        </div>
      )}
    </div>
  );
}
