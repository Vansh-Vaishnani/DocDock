'use client';

import React from 'react';

// ─── Skeleton Loader Components ───────────────────────────────

interface SkeletonProps {
  className?: string;
}

export function Skeleton({ className = '' }: SkeletonProps) {
  return (
    <div className={`skeleton rounded-lg ${className}`} aria-hidden="true" />
  );
}

export function SkeletonText({ lines = 2, className = '' }: { lines?: number; className?: string }) {
  return (
    <div className={`space-y-2 ${className}`} aria-hidden="true">
      {Array.from({ length: lines }).map((_, i) => (
        <Skeleton key={i} className={`h-4 ${i === lines - 1 ? 'w-3/4' : 'w-full'}`} />
      ))}
    </div>
  );
}

export function SkeletonCard({ className = '' }: SkeletonProps) {
  return (
    <div className={`dd-card ${className}`} aria-hidden="true">
      <div className="flex items-start gap-4">
        <Skeleton className="h-12 w-12 rounded-xl flex-shrink-0" />
        <div className="flex-1 space-y-2.5">
          <Skeleton className="h-4 w-1/2" />
          <Skeleton className="h-3 w-3/4" />
          <Skeleton className="h-3 w-1/3" />
        </div>
      </div>
    </div>
  );
}

export function SkeletonStatCard() {
  return (
    <div className="stat-card" aria-hidden="true">
      <div className="flex items-start justify-between">
        <div className="space-y-2.5 flex-1">
          <Skeleton className="h-3 w-20" />
          <Skeleton className="h-9 w-16 mt-2" />
          <Skeleton className="h-3 w-28 mt-1" />
        </div>
        <Skeleton className="h-10 w-10 rounded-xl flex-shrink-0" />
      </div>
    </div>
  );
}

export function SkeletonGrid({ count = 4, className = '' }: { count?: number; className?: string }) {
  return (
    <div className={`grid gap-4 sm:grid-cols-2 lg:grid-cols-4 ${className}`}>
      {Array.from({ length: count }).map((_, i) => (
        <SkeletonStatCard key={i} />
      ))}
    </div>
  );
}

export function SkeletonTable({ rows = 5 }: { rows?: number }) {
  return (
    <div className="dd-table-wrapper">
      {/* Header */}
      <div className="flex gap-4 px-5 py-4" style={{ borderBottom: '1px solid var(--border-color)', background: 'var(--bg-secondary)' }}>
        {['w-1/4', 'w-1/3', 'w-1/4', 'w-1/6'].map((w, i) => (
          <Skeleton key={i} className={`h-3 ${w}`} />
        ))}
      </div>
      {/* Rows */}
      {Array.from({ length: rows }).map((_, i) => (
        <div key={i} className="flex gap-4 px-5 py-4" style={{ borderBottom: i < rows - 1 ? '1px solid var(--border-subtle)' : 'none' }}>
          {['w-1/4', 'w-1/3', 'w-1/4', 'w-1/6'].map((w, j) => (
            <Skeleton key={j} className={`h-3.5 ${w}`} />
          ))}
        </div>
      ))}
    </div>
  );
}

// ─── Empty State Component ────────────────────────────────────

interface EmptyStateProps {
  icon?: React.ReactNode;
  title: string;
  description?: string;
  action?: React.ReactNode;
  className?: string;
}

export function EmptyState({ icon, title, description, action, className = '' }: EmptyStateProps) {
  return (
    <div className={`flex flex-col items-center justify-center py-20 text-center px-6 ${className}`}>
      {icon && (
        <div className="mb-5 flex h-20 w-20 items-center justify-center rounded-3xl" style={{ background: 'linear-gradient(135deg, rgba(16,185,129,0.1), rgba(16,185,129,0.05))', border: '1px solid rgba(16,185,129,0.15)' }}>
          <div className="text-emerald-500" style={{ transform: 'scale(1.1)' }}>
            {icon}
          </div>
        </div>
      )}
      <h3 className="text-base font-bold tracking-tight" style={{ color: 'var(--text-primary)' }}>{title}</h3>
      {description && (
        <p className="mt-2 max-w-xs text-sm leading-relaxed" style={{ color: 'var(--text-muted)' }}>{description}</p>
      )}
      {action && <div className="mt-6">{action}</div>}
    </div>
  );
}

// Common empty state presets
export function NoAppointments({ action }: { action?: React.ReactNode }) {
  return (
    <EmptyState
      icon={
        <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
          <rect x="3" y="4" width="18" height="18" rx="2" ry="2" /><line x1="16" y1="2" x2="16" y2="6" /><line x1="8" y1="2" x2="8" y2="6" /><line x1="3" y1="10" x2="21" y2="10" />
        </svg>
      }
      title="No appointments yet"
      description="Book your first appointment with a verified doctor near you."
      action={action}
    />
  );
}

export function NoDoctorsFound({ action }: { action?: React.ReactNode }) {
  return (
    <EmptyState
      icon={
        <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
          <path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z" />
        </svg>
      }
      title="No doctors found"
      description="Try adjusting your search filters or location to find available doctors."
      action={action}
    />
  );
}

export function NoNotifications() {
  return (
    <EmptyState
      icon={
        <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
          <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9" /><path d="M13.73 21a2 2 0 0 1-3.46 0" />
        </svg>
      }
      title="All caught up!"
      description="You have no new notifications at this time."
    />
  );
}

export function NoResults({ query, action }: { query?: string; action?: React.ReactNode }) {
  return (
    <EmptyState
      icon={
        <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
          <circle cx="11" cy="11" r="8" /><line x1="21" y1="21" x2="16.65" y2="16.65" />
        </svg>
      }
      title={query ? `No results for "${query}"` : 'No results found'}
      description="Try a different search term or adjust your filters."
      action={action}
    />
  );
}

// ─── Status Badge ─────────────────────────────────────────────

const STATUS_CONFIGS: Record<string, { label: string; classes: string }> = {
  pending:               { label: 'Pending',         classes: 'bg-amber-100 text-amber-700 dark:bg-amber-950/50 dark:text-amber-400' },
  accepted:              { label: 'Accepted',        classes: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-950/50 dark:text-emerald-400' },
  rejected:              { label: 'Rejected',        classes: 'bg-rose-100 text-rose-700 dark:bg-rose-950/50 dark:text-rose-400' },
  auto_rejected:         { label: 'Auto Rejected',   classes: 'bg-rose-100 text-rose-700 dark:bg-rose-950/50 dark:text-rose-400' },
  doctor_on_way:         { label: 'On the way',      classes: 'bg-blue-100 text-blue-700 dark:bg-blue-950/50 dark:text-blue-400' },
  arrived:               { label: 'Arrived',         classes: 'bg-violet-100 text-violet-700 dark:bg-violet-950/50 dark:text-violet-400' },
  in_consultation:       { label: 'In Consultation', classes: 'bg-indigo-100 text-indigo-700 dark:bg-indigo-950/50 dark:text-indigo-400' },
  completed:             { label: 'Completed',       classes: 'bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-400' },
  cancelled_by_patient:  { label: 'Cancelled',       classes: 'bg-rose-100 text-rose-600 dark:bg-rose-950/50 dark:text-rose-400' },
  cancelled_by_doctor:   { label: 'Cancelled',       classes: 'bg-rose-100 text-rose-600 dark:bg-rose-950/50 dark:text-rose-400' },
  approved:              { label: 'Approved',        classes: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-950/50 dark:text-emerald-400' },
  suspended:             { label: 'Suspended',       classes: 'bg-orange-100 text-orange-700 dark:bg-orange-950/50 dark:text-orange-400' },
  paid:                  { label: 'Paid',            classes: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-950/50 dark:text-emerald-400' },
  created:               { label: 'Pending',         classes: 'bg-amber-100 text-amber-700 dark:bg-amber-950/50 dark:text-amber-400' },
  refunded:              { label: 'Refunded',        classes: 'bg-violet-100 text-violet-700 dark:bg-violet-950/50 dark:text-violet-400' },
  active:                { label: 'Active',          classes: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-950/50 dark:text-emerald-400' },
  inactive:              { label: 'Inactive',        classes: 'bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-400' },
};

export function StatusBadge({ status, className = '' }: { status: string; className?: string }) {
  const config = STATUS_CONFIGS[status] ?? {
    label: status.replace(/_/g, ' '),
    classes: 'bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-400'
  };
  return (
    <span className={`status-badge ${config.classes} ${className}`}>
      {config.label}
    </span>
  );
}

// ─── Loading Spinner ─────────────────────────────────────────

export function Spinner({ size = 20, className = '' }: { size?: number; className?: string }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      className={`animate-spin ${className}`}
      aria-hidden="true"
    >
      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
    </svg>
  );
}

// ─── Page Header ─────────────────────────────────────────────

export function PageHeader({
  title,
  subtitle,
  action,
  breadcrumb
}: {
  title: string;
  subtitle?: string;
  action?: React.ReactNode;
  breadcrumb?: string;
}) {
  return (
    <div className="mb-6 flex items-start justify-between gap-4">
      <div>
        {breadcrumb && (
          <p className="mb-1 text-xs font-semibold uppercase tracking-wider" style={{ color: 'var(--text-muted)' }}>{breadcrumb}</p>
        )}
        <h1 className="text-xl font-bold tracking-tight" style={{ color: 'var(--text-primary)', letterSpacing: '-0.03em' }}>{title}</h1>
        {subtitle && <p className="mt-1 text-sm" style={{ color: 'var(--text-secondary)' }}>{subtitle}</p>}
      </div>
      {action && <div className="flex-shrink-0">{action}</div>}
    </div>
  );
}
