'use client';

// ─── Stat Card ───────────────────────────────────────────────
export function StatCard({ label, value, detail, icon, color }: {
  label: string;
  value: string | number;
  detail?: string;
  icon?: string;
  color?: string;
}) {
  return (
    <div className="dd-card hover-lift">
      {icon && (
        <div className={`flex h-9 w-9 items-center justify-center rounded-xl mb-3 ${color || 'text-emerald-600 bg-emerald-50 dark:bg-emerald-950/40'}`}>
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
            <path d={icon} />
          </svg>
        </div>
      )}
      <p className="text-xs font-medium" style={{ color: 'var(--text-muted)' }}>{label}</p>
      <p className="mt-1.5 text-3xl font-bold tracking-tight" style={{ color: 'var(--text-primary)' }}>{value}</p>
      {detail && <p className="mt-1 text-xs" style={{ color: 'var(--text-secondary)' }}>{detail}</p>}
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
      <div className="flex h-48 items-center justify-center">
        <p className="text-sm" style={{ color: 'var(--text-muted)' }}>No data available yet.</p>
      </div>
    );
  }

  const max = Math.max(...data.map((item) => Number(item[valueKey]) || 0), 1);

  return (
    <div className="flex h-48 items-end gap-2">
      {data.map((item) => {
        const value = Number(item[valueKey]) || 0;
        const height = Math.max((value / max) * 100, 4);
        const label = String(item[labelKey]);
        return (
          <div key={label} className="flex min-w-0 flex-1 flex-col items-center gap-1.5">
            <span className="text-xs font-medium" style={{ color: 'var(--text-secondary)' }}>
              {formatValue ? formatValue(value) : value}
            </span>
            <div
              className="w-full rounded-t-lg bg-emerald-500 transition-all hover:bg-emerald-400"
              style={{ height: `${height}%`, opacity: 0.85 }}
              title={`${label}: ${formatValue ? formatValue(value) : value}`}
            />
            <span className="truncate text-[10px]" style={{ color: 'var(--text-muted)' }}>{label.slice(5) || label}</span>
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

  return (
    <div className="flex items-center justify-between pt-4">
      <p className="text-sm" style={{ color: 'var(--text-muted)' }}>
        Page {page} of {totalPages}
      </p>
      <div className="flex gap-2">
        <button
          type="button"
          disabled={page <= 1}
          onClick={() => onPageChange(page - 1)}
          className="btn-secondary rounded-xl px-3 py-1.5 text-xs disabled:opacity-40"
        >
          Previous
        </button>
        <button
          type="button"
          disabled={page >= totalPages}
          onClick={() => onPageChange(page + 1)}
          className="btn-secondary rounded-xl px-3 py-1.5 text-xs disabled:opacity-40"
        >
          Next
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
    pending: 'bg-amber-100 text-amber-700 dark:bg-amber-950/40 dark:text-amber-400',
    approved: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-400',
    rejected: 'bg-rose-100 text-rose-700 dark:bg-rose-950/40 dark:text-rose-400',
    completed: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-400',
    accepted: 'bg-blue-100 text-blue-700 dark:bg-blue-950/40 dark:text-blue-400',
    paid: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-400',
    refunded: 'bg-violet-100 text-violet-700 dark:bg-violet-950/40 dark:text-violet-400',
    suspended: 'bg-orange-100 text-orange-700 dark:bg-orange-950/40 dark:text-orange-400',
    auto_rejected: 'bg-rose-100 text-rose-700 dark:bg-rose-950/40 dark:text-rose-400',
    cancelled: 'bg-rose-100 text-rose-700 dark:bg-rose-950/40 dark:text-rose-400',
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
    <div className="overflow-x-auto rounded-2xl border" style={{ borderColor: 'var(--border-color)' }}>
      <table className="w-full text-sm">{children}</table>
    </div>
  );
}

export function TableHead({ columns }: { columns: string[] }) {
  return (
    <thead>
      <tr style={{ backgroundColor: 'var(--bg-tertiary)', borderBottom: '1px solid var(--border-color)' }}>
        {columns.map((col) => (
          <th key={col} className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide" style={{ color: 'var(--text-muted)' }}>
            {col}
          </th>
        ))}
      </tr>
    </thead>
  );
}
