'use client';

import React from 'react';

// ─── Stat Card ───────────────────────────────────────────────
export function StatCard({ label, value, detail, icon, color, trend }: {
  label: string;
  value: string | number;
  detail?: string;
  icon?: string;
  color?: string;
  trend?: { value: number; label?: string };
}) {
  return (
    <div className="stat-card">
      <div className="flex items-start justify-between">
        <div className="flex-1 min-w-0">
          <p className="text-xs font-semibold uppercase tracking-wider mb-1" style={{ color: 'var(--text-muted)', letterSpacing: '0.07em' }}>{label}</p>
          <p className="text-3xl font-bold tracking-tight" style={{ color: 'var(--text-primary)', letterSpacing: '-0.03em' }}>{value}</p>
          {detail && (
            <p className="mt-1.5 text-xs" style={{ color: 'var(--text-secondary)' }}>{detail}</p>
          )}
          {trend && (
            <div className={`mt-2 inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[11px] font-semibold ${
              trend.value >= 0
                ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-400'
                : 'bg-rose-100 text-rose-700 dark:bg-rose-950/40 dark:text-rose-400'
            }`}>
              <span>{trend.value >= 0 ? '↑' : '↓'}</span>
              <span>{Math.abs(trend.value)}% {trend.label || 'vs last month'}</span>
            </div>
          )}
        </div>
        {icon && (
          <div className={`flex h-11 w-11 flex-shrink-0 items-center justify-center rounded-2xl ${color || 'bg-emerald-100 text-emerald-600 dark:bg-emerald-950/40 dark:text-emerald-400'}`}>
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
              <path d={icon} />
            </svg>
          </div>
        )}
      </div>
    </div>
  );
}

// ─── Bar Chart ───────────────────────────────────────────────
export function BarChart({
  data,
  labelKey,
  valueKey,
  formatValue
}: {
  data: Array<Record<string, string | number>>;
  labelKey: string;
  valueKey: string;
  formatValue?: (value: number) => string;
}) {
  if (!data.length) {
    return (
      <div className="flex h-48 items-center justify-center flex-col gap-2">
        <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" style={{ color: 'var(--text-muted)' }}>
          <path d="M18 20V10M12 20V4M6 20v-6" />
        </svg>
        <p className="text-sm" style={{ color: 'var(--text-muted)' }}>No data available yet.</p>
      </div>
    );
  }

  const max = Math.max(...data.map((item) => Number(item[valueKey]) || 0), 1);

  return (
    <div className="flex h-52 items-end gap-1.5 px-1">
      {data.map((item) => {
        const value = Number(item[valueKey]) || 0;
        const height = Math.max((value / max) * 100, 3);
        const label = String(item[labelKey]);
        const isTop = value === max;
        return (
          <div key={label} className="flex min-w-0 flex-1 flex-col items-center gap-1.5 group">
            <span className={`text-[10px] font-bold transition-all opacity-0 group-hover:opacity-100 ${isTop ? 'opacity-100' : ''}`} style={{ color: 'var(--text-secondary)' }}>
              {formatValue ? formatValue(value) : value}
            </span>
            <div
              className="w-full rounded-t-xl transition-all hover:opacity-80 cursor-pointer"
              style={{
                height: `${height}%`,
                background: isTop
                  ? 'linear-gradient(180deg, #10b981, #059669)'
                  : 'linear-gradient(180deg, rgba(16,185,129,0.7), rgba(16,185,129,0.4))',
              }}
              title={`${label}: ${formatValue ? formatValue(value) : value}`}
            />
            <span className="truncate text-[9px] font-medium w-full text-center" style={{ color: 'var(--text-muted)' }}>
              {label.slice(5) || label}
            </span>
          </div>
        );
      })}
    </div>
  );
}

// ─── Pagination ──────────────────────────────────────────────
export function Pagination({
  page,
  totalPages,
  onPageChange
}: {
  page: number;
  totalPages: number;
  onPageChange: (page: number) => void;
}) {
  if (totalPages <= 1) return null;

  const getPages = (): (number | '...')[] => {
    if (totalPages <= 7) return Array.from({ length: totalPages }, (_, i) => i + 1);
    if (page <= 4) return [1, 2, 3, 4, 5, '...', totalPages];
    if (page >= totalPages - 3) return [1, '...', totalPages - 4, totalPages - 3, totalPages - 2, totalPages - 1, totalPages];
    return [1, '...', page - 1, page, page + 1, '...', totalPages];
  };

  return (
    <div className="flex items-center justify-between pt-5">
      <p className="text-xs font-medium" style={{ color: 'var(--text-muted)' }}>
        Page {page} of {totalPages}
      </p>
      <div className="flex items-center gap-1">
        <button
          type="button"
          disabled={page <= 1}
          onClick={() => onPageChange(page - 1)}
          className="btn-icon disabled:opacity-30"
          aria-label="Previous page"
        >
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M15 18l-6-6 6-6" /></svg>
        </button>

        {getPages().map((p, i) => p === '...' ? (
          <span key={`ellipsis-${i}`} className="px-1 text-xs" style={{ color: 'var(--text-muted)' }}>…</span>
        ) : (
          <button
            key={p}
            type="button"
            onClick={() => onPageChange(p as number)}
            className={`h-8 min-w-[32px] rounded-lg px-2 text-xs font-semibold transition-all ${
              p === page
                ? 'bg-emerald-600 text-white'
                : 'hover:bg-slate-100 dark:hover:bg-slate-800'
            }`}
            style={{ color: p === page ? '#fff' : 'var(--text-secondary)' }}
            aria-label={`Page ${p}`}
            aria-current={p === page ? 'page' : undefined}
          >
            {p}
          </button>
        ))}

        <button
          type="button"
          disabled={page >= totalPages}
          onClick={() => onPageChange(page + 1)}
          className="btn-icon disabled:opacity-30"
          aria-label="Next page"
        >
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M9 18l6-6-6-6" /></svg>
        </button>
      </div>
    </div>
  );
}

// ─── Formatters ──────────────────────────────────────────────
export function formatCurrency(amount: number): string {
  return new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: 0 }).format(amount);
}

export function formatDate(value: string): string {
  return new Date(value).toLocaleString('en-IN', { dateStyle: 'medium', timeStyle: 'short' });
}

// ─── Status Badge ────────────────────────────────────────────
export function StatusBadge({ status }: { status: string }) {
  const colors: Record<string, string> = {
    pending:      'bg-amber-100 text-amber-700 dark:bg-amber-950/40 dark:text-amber-400',
    approved:     'bg-emerald-100 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-400',
    rejected:     'bg-rose-100 text-rose-700 dark:bg-rose-950/40 dark:text-rose-400',
    completed:    'bg-emerald-100 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-400',
    accepted:     'bg-blue-100 text-blue-700 dark:bg-blue-950/40 dark:text-blue-400',
    paid:         'bg-emerald-100 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-400',
    refunded:     'bg-violet-100 text-violet-700 dark:bg-violet-950/40 dark:text-violet-400',
    suspended:    'bg-orange-100 text-orange-700 dark:bg-orange-950/40 dark:text-orange-400',
    auto_rejected:'bg-rose-100 text-rose-700 dark:bg-rose-950/40 dark:text-rose-400',
    cancelled:    'bg-rose-100 text-rose-700 dark:bg-rose-950/40 dark:text-rose-400',
    active:       'bg-emerald-100 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-400',
    inactive:     'bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-400',
    created:      'bg-amber-100 text-amber-700 dark:bg-amber-950/40 dark:text-amber-400',
  };
  const style = colors[status] ?? 'bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-400';
  return (
    <span className={`status-badge ${style}`}>
      {status.replace(/_/g, ' ')}
    </span>
  );
}

// ─── Table helpers ───────────────────────────────────────────
export function TableWrapper({ children }: { children: React.ReactNode }) {
  return (
    <div className="dd-table-wrapper">
      <table className="dd-table">{children}</table>
    </div>
  );
}

export function TableHead({ columns }: { columns: string[] }) {
  return (
    <thead>
      <tr>
        {columns.map((col) => (
          <th key={col}>{col}</th>
        ))}
      </tr>
    </thead>
  );
}

// ─── Search Input ─────────────────────────────────────────────
export function SearchInput({
  value,
  onChange,
  placeholder = 'Search...',
  className = ''
}: {
  value: string;
  onChange: (v: string) => void;
  placeholder?: string;
  className?: string;
}) {
  return (
    <div className={`relative ${className}`}>
      <svg
        width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"
        className="absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none"
        style={{ color: 'var(--text-muted)' }}
        aria-hidden="true"
      >
        <circle cx="11" cy="11" r="8" /><path d="m21 21-4.35-4.35" />
      </svg>
      <input
        type="search"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        className="dd-input pl-10"
        aria-label={placeholder}
      />
    </div>
  );
}
