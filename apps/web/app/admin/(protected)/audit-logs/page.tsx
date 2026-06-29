'use client';

import { useCallback, useEffect, useState } from 'react';

import { useToast } from '../../../auth/toast-provider';
import { fetchAuditLogs, type AuditLog } from '../../api';
import { formatDate, Pagination } from '../../_components/admin-ui';

export default function AdminAuditLogsPage() {
  const { showToast } = useToast();
  const [logs, setLogs] = useState<AuditLog[]>([]);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [loading, setLoading] = useState(true);

  const loadLogs = useCallback(async () => {
    setLoading(true);
    try {
      const result = await fetchAuditLogs(page, 20);
      setLogs(result.data.items);
      setTotalPages(result.data.totalPages);
    } catch (err: unknown) {
      showToast(err instanceof Error ? err.message : 'Failed to load audit logs', 'error');
    } finally {
      setLoading(false);
    }
  }, [page, showToast]);

  useEffect(() => {
    void loadLogs();
  }, [loadLogs]);

  return (
    <section className="space-y-6">
      <div>
        <h2 className="text-2xl font-semibold">Audit logs</h2>
        <p className="mt-1 text-slate-600">Track admin actions across the platform.</p>
      </div>

      <div className="overflow-x-auto rounded-[24px] border border-slate-200">
        <table className="min-w-full text-left text-sm">
          <thead className="bg-slate-50 text-slate-500">
            <tr>
              <th className="px-4 py-3 font-medium">Time</th>
              <th className="px-4 py-3 font-medium">Admin</th>
              <th className="px-4 py-3 font-medium">Action</th>
              <th className="px-4 py-3 font-medium">Target</th>
              <th className="px-4 py-3 font-medium">IP</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr><td colSpan={5} className="px-4 py-8 text-center text-slate-500">Loading…</td></tr>
            ) : logs.length === 0 ? (
              <tr><td colSpan={5} className="px-4 py-8 text-center text-slate-500">No audit logs yet.</td></tr>
            ) : logs.map((log) => (
              <tr key={log._id} className="border-t border-slate-100">
                <td className="px-4 py-3 whitespace-nowrap">{formatDate(log.createdAt)}</td>
                <td className="px-4 py-3">{log.adminName}</td>
                <td className="px-4 py-3 font-mono text-xs">{log.action}</td>
                <td className="px-4 py-3">{log.target}{log.targetId ? ` · ${log.targetId.slice(-6)}` : ''}</td>
                <td className="px-4 py-3 text-slate-500">{log.ip ?? '—'}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <Pagination page={page} totalPages={totalPages} onPageChange={setPage} />
    </section>
  );
}
