'use client';

import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from 'react';

type ToastType = 'success' | 'error' | 'info' | 'warning';

interface ToastItem {
  id: number;
  type: ToastType;
  message: string;
}

interface ToastContextValue {
  showToast: (message: string, type?: ToastType) => void;
}

const ToastContext = createContext<ToastContextValue | undefined>(undefined);

const TOAST_ICONS: Record<ToastType, string> = {
  success: '✓',
  error: '✕',
  warning: '⚠',
  info: 'ℹ',
};

const TOAST_STYLES: Record<ToastType, { bg: string; border: string; icon: string; text: string }> = {
  success: {
    bg: 'linear-gradient(135deg, #10b981, #059669)',
    border: 'rgba(16,185,129,0.3)',
    icon: 'rgba(255,255,255,0.25)',
    text: '#ffffff',
  },
  error: {
    bg: 'linear-gradient(135deg, #ef4444, #dc2626)',
    border: 'rgba(239,68,68,0.3)',
    icon: 'rgba(255,255,255,0.25)',
    text: '#ffffff',
  },
  warning: {
    bg: 'linear-gradient(135deg, #f59e0b, #d97706)',
    border: 'rgba(245,158,11,0.3)',
    icon: 'rgba(255,255,255,0.25)',
    text: '#ffffff',
  },
  info: {
    bg: 'linear-gradient(135deg, #1e293b, #0f172a)',
    border: 'rgba(255,255,255,0.1)',
    icon: 'rgba(255,255,255,0.2)',
    text: '#ffffff',
  },
};

const TOAST_DURATION = 4000;

export function ToastProvider({ children }: { children: ReactNode }) {
  const [toasts, setToasts] = useState<ToastItem[]>([]);

  const showToast = useCallback((message: string, type: ToastType = 'info') => {
    const id = Date.now() + Math.random();
    setToasts((current) => [...current.slice(-4), { id, type, message }]); // max 5 at once
    window.setTimeout(() => {
      setToasts((current) => current.filter((toast) => toast.id !== id));
    }, TOAST_DURATION);
  }, []);

  const dismiss = useCallback((id: number) => {
    setToasts((current) => current.filter((toast) => toast.id !== id));
  }, []);

  const value = useMemo(() => ({ showToast }), [showToast]);

  return (
    <ToastContext.Provider value={value}>
      {children}
      {/* Toast container — bottom-right on desktop, top-center on mobile */}
      <div
        className="pointer-events-none fixed z-[200] flex flex-col gap-2"
        style={{
          right: 'max(16px, env(safe-area-inset-right))',
          bottom: 'max(24px, env(safe-area-inset-bottom))',
          left: 'max(16px, env(safe-area-inset-left))',
          maxWidth: '380px',
          marginLeft: 'auto',
        }}
        aria-live="polite"
        aria-atomic="false"
        role="status"
      >
        {toasts.map((toast) => {
          const style = TOAST_STYLES[toast.type];
          return (
            <div
              key={toast.id}
              className="pointer-events-auto flex items-start gap-3 rounded-2xl px-4 py-3.5 text-sm font-medium shadow-xl animate-slide-in-right"
              style={{
                background: style.bg,
                color: style.text,
                border: `1px solid ${style.border}`,
                backdropFilter: 'blur(10px)',
                position: 'relative',
                overflow: 'hidden',
              }}
              role="alert"
            >
              {/* Icon */}
              <span
                className="flex h-6 w-6 flex-shrink-0 items-center justify-center rounded-full text-xs font-bold"
                style={{ background: style.icon }}
                aria-hidden="true"
              >
                {TOAST_ICONS[toast.type]}
              </span>

              {/* Message */}
              <span className="flex-1 text-sm leading-relaxed" style={{ color: style.text }}>
                {toast.message}
              </span>

              {/* Close button */}
              <button
                onClick={() => dismiss(toast.id)}
                className="flex-shrink-0 rounded-lg p-0.5 opacity-70 transition-opacity hover:opacity-100"
                style={{ color: style.text }}
                aria-label="Dismiss notification"
              >
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M18 6L6 18M6 6l12 12" />
                </svg>
              </button>

              {/* Progress bar */}
              <div
                className="absolute bottom-0 left-0 h-0.5 rounded-full animate-progress-bar"
                style={{ background: 'rgba(255,255,255,0.4)', animationDuration: `${TOAST_DURATION}ms` }}
                aria-hidden="true"
              />
            </div>
          );
        })}
      </div>
    </ToastContext.Provider>
  );
}

export function useToast() {
  const context = useContext(ToastContext);
  if (!context) {
    throw new Error('useToast must be used inside ToastProvider');
  }
  return context;
}
