'use client';

import { useCallback, useEffect, useState } from 'react';

import { useToast } from '../../../auth/toast-provider';
import {
  activateUser,
  deleteUser,
  fetchUsers,
  suspendUser,
  updateUser,
  type AdminUser
} from '../../api';
import { Pagination, StatusBadge } from '../../_components/admin-ui';

const tabs = [
  { id: 'patient', label: 'Patients' },
  { id: 'doctor', label: 'Doctors' },
  { id: 'admin', label: 'Admins' }
] as const;

export default function AdminUsersPage() {
  const { showToast } = useToast();
  const [role, setRole] = useState<'patient' | 'doctor' | 'admin'>('patient');
  const [search, setSearch] = useState('');
  const [status, setStatus] = useState('all');
  const [page, setPage] = useState(1);
  const [users, setUsers] = useState<AdminUser[]>([]);
  const [totalPages, setTotalPages] = useState(1);
  const [loading, setLoading] = useState(true);
  const [editUser, setEditUser] = useState<AdminUser | null>(null);
  const [editForm, setEditForm] = useState({ fullName: '', email: '', phone: '' });

  const loadUsers = useCallback(async () => {
    setLoading(true);
    try {
      const result = await fetchUsers({ role, search: search.trim() || undefined, status, page, limit: 10 });
      setUsers(result.data.items);
      setTotalPages(result.data.totalPages);
    } catch (err: unknown) {
      showToast(err instanceof Error ? err.message : 'Failed to load users', 'error');
    } finally {
      setLoading(false);
    }
  }, [page, role, search, showToast, status]);

  useEffect(() => {
    void loadUsers();
  }, [loadUsers]);

  const openEdit = (user: AdminUser) => {
    setEditUser(user);
    setEditForm({ fullName: user.fullName, email: user.email, phone: user.phone });
  };

  const saveEdit = async () => {
    if (!editUser) return;
    try {
      await updateUser(editUser._id, editForm);
      showToast('User updated', 'success');
      setEditUser(null);
      await loadUsers();
    } catch (err: unknown) {
      showToast(err instanceof Error ? err.message : 'Update failed', 'error');
    }
  };

  const toggleActive = async (user: AdminUser) => {
    try {
      if (user.isActive) {
        await suspendUser(user._id);
        showToast('User suspended', 'success');
      } else {
        await activateUser(user._id);
        showToast('User activated', 'success');
      }
      await loadUsers();
    } catch (err: unknown) {
      showToast(err instanceof Error ? err.message : 'Action failed', 'error');
    }
  };

  const removeUser = async (userId: string) => {
    if (!window.confirm('Soft-delete this user?')) return;
    try {
      await deleteUser(userId);
      showToast('User deleted', 'success');
      await loadUsers();
    } catch (err: unknown) {
      showToast(err instanceof Error ? err.message : 'Delete failed', 'error');
    }
  };

  return (
    <section className="space-y-6">
      <div>
        <h2 className="text-2xl font-semibold">User management</h2>
        <p className="mt-1 text-slate-600">Search, filter, and manage platform users.</p>
      </div>

      <div className="flex flex-wrap gap-2">
        {tabs.map((tab) => (
          <button
            key={tab.id}
            type="button"
            onClick={() => { setRole(tab.id); setPage(1); }}
            className={`rounded-full px-4 py-2 text-sm font-medium ${role === tab.id ? 'bg-emerald-600 text-white' : 'border border-slate-300 text-slate-700'}`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      <div className="flex flex-wrap gap-3">
        <input
          value={search}
          onChange={(e) => { setSearch(e.target.value); setPage(1); }}
          placeholder="Search name, email, phone"
          className="min-w-[220px] flex-1 rounded-2xl border border-slate-300 px-4 py-2 text-sm"
        />
        <select value={status} onChange={(e) => { setStatus(e.target.value); setPage(1); }} className="rounded-2xl border border-slate-300 px-4 py-2 text-sm">
          <option value="all">All statuses</option>
          <option value="active">Active</option>
          <option value="inactive">Inactive</option>
        </select>
      </div>

      <div className="overflow-x-auto rounded-[24px] border border-slate-200">
        <table className="min-w-full text-left text-sm">
          <thead className="bg-slate-50 text-slate-500">
            <tr>
              <th className="px-4 py-3 font-medium">Name</th>
              <th className="px-4 py-3 font-medium">Email</th>
              <th className="px-4 py-3 font-medium">Phone</th>
              <th className="px-4 py-3 font-medium">Status</th>
              <th className="px-4 py-3 font-medium">Actions</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr><td colSpan={5} className="px-4 py-8 text-center text-slate-500">Loading…</td></tr>
            ) : users.length === 0 ? (
              <tr><td colSpan={5} className="px-4 py-8 text-center text-slate-500">No users found.</td></tr>
            ) : users.map((user) => (
              <tr key={user._id} className="border-t border-slate-100">
                <td className="px-4 py-3 font-medium">{user.fullName}</td>
                <td className="px-4 py-3">{user.email}</td>
                <td className="px-4 py-3">{user.phone}</td>
                <td className="px-4 py-3">
                  <StatusBadge status={user.isActive ? 'approved' : 'rejected'} />
                </td>
                <td className="px-4 py-3">
                  <div className="flex flex-wrap gap-2">
                    <button type="button" onClick={() => openEdit(user)} className="rounded-lg border border-slate-300 px-2 py-1 text-xs font-semibold">Edit</button>
                    <button type="button" onClick={() => void toggleActive(user)} className="rounded-lg border border-slate-300 px-2 py-1 text-xs font-semibold">
                      {user.isActive ? 'Suspend' : 'Activate'}
                    </button>
                    <button type="button" onClick={() => void removeUser(user._id)} className="rounded-lg border border-rose-300 px-2 py-1 text-xs font-semibold text-rose-700">Delete</button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <Pagination page={page} totalPages={totalPages} onPageChange={setPage} />

      {editUser && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
          <div className="w-full max-w-md rounded-2xl p-6 shadow-large border" style={{ backgroundColor: 'var(--card-bg)', borderColor: 'var(--border-color)', color: 'var(--text-primary)' }}>
            <h3 className="text-lg font-bold">Edit User</h3>
            <div className="mt-4 space-y-4">
              <div>
                <label className="dd-label">Full Name</label>
                <input value={editForm.fullName} onChange={(e) => setEditForm({ ...editForm, fullName: e.target.value })} className="dd-input" placeholder="Full name" />
              </div>
              <div>
                <label className="dd-label">Email Address</label>
                <input value={editForm.email} onChange={(e) => setEditForm({ ...editForm, email: e.target.value })} className="dd-input" placeholder="Email" />
              </div>
              <div>
                <label className="dd-label">Phone Number</label>
                <input value={editForm.phone} onChange={(e) => setEditForm({ ...editForm, phone: e.target.value })} className="dd-input" placeholder="Phone" />
              </div>
            </div>
            <div className="mt-6 flex gap-3">
              <button type="button" onClick={() => void saveEdit()} className="btn-primary flex-1 text-xs">Save Changes</button>
              <button type="button" onClick={() => setEditUser(null)} className="btn-secondary flex-1 text-xs">Cancel</button>
            </div>
          </div>
        </div>
      )}

    </section>
  );
}
