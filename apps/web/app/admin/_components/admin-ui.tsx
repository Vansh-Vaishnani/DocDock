'use client';

export function StatCard({ label, value, detail }: { label: string; value: string | number; detail?: string }) {
  return (
    <div className="rounded-[24px] border border-slate-200 bg-slate-50 p-5">
      <p className="text-sm font-medium text-slate-500">{label}</p>
      <p className="mt-2 text-2xl font-semibold text-slate-900">{value}</p>
      {detail && <p className="mt-2 text-sm text-slate-600">{detail}</p>}
    </div>
  );
}

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
    return <p className="text-sm text-slate-500">No data available yet.</p>;
  }

  const max = Math.max(...data.map((item) => Number(item[valueKey]) || 0), 1);

  return (
    <div className="flex h-48 items-end gap-2">
      {data.map((item) => {
        const value = Number(item[valueKey]) || 0;
        const height = Math.max((value / max) * 100, 4);
        const label = String(item[labelKey]);
        return (
          <div key={label} className="flex min-w-0 flex-1 flex-col items-center gap-2">
            <span className="text-xs font-medium text-slate-600">
              {formatValue ? formatValue(value) : value}
            </span>
            <div className="w-full rounded-t-lg bg-emerald-500/80" style={{ height: `${height}%` }} title={`${label}: ${value}`} />
            <span className="truncate text-[10px] text-slate-500">{label.slice(5) || label}</span>
          </div>
        );
      })}
    </div>
  );
}

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
      <p className="text-sm text-slate-500">
        Page {page} of {totalPages}
      </p>
      <div className="flex gap-2">
        <button
          type="button"
          disabled={page <= 1}
          onClick={() => onPageChange(page - 1)}
          className="rounded-xl border border-slate-300 px-3 py-1.5 text-sm font-medium text-slate-700 disabled:opacity-40"
        >
          Previous
        </button>
        <button
          type="button"
          disabled={page >= totalPages}
          onClick={() => onPageChange(page + 1)}
          className="rounded-xl border border-slate-300 px-3 py-1.5 text-sm font-medium text-slate-700 disabled:opacity-40"
        >
          Next
        </button>
      </div>
    </div>
  );
}

export function formatCurrency(amount: number): string {
  return new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: 0 }).format(amount);
}

export function formatDate(value: string): string {
  return new Date(value).toLocaleString('en-IN', { dateStyle: 'medium', timeStyle: 'short' });
}

export function StatusBadge({ status }: { status: string }) {
  const colors: Record<string, string> = {
    pending: 'bg-amber-100 text-amber-800',
    approved: 'bg-emerald-100 text-emerald-800',
    rejected: 'bg-rose-100 text-rose-800',
    completed: 'bg-emerald-100 text-emerald-800',
    accepted: 'bg-blue-100 text-blue-800',
    paid: 'bg-emerald-100 text-emerald-800',
    refunded: 'bg-orange-100 text-orange-800'
  };
  const style = colors[status] ?? 'bg-slate-100 text-slate-700';
  return <span className={`inline-flex rounded-full px-2.5 py-1 text-xs font-semibold capitalize ${style}`}>{status.replace(/_/g, ' ')}</span>;
}
