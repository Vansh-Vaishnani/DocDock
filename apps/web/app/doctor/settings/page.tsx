'use client';

import { useEffect, useState } from 'react';

import { useAuth } from '../../auth/auth-context';
import { changePassword } from '../../auth/api';
import { useToast } from '../../auth/toast-provider';

export default function DoctorSettingsPage() {
  const { user, logout } = useAuth();
  const { showToast } = useToast();
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [saving, setSaving] = useState(false);

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (newPassword !== confirmPassword) {
      showToast('Passwords do not match.', 'error');
      return;
    }
    setSaving(true);
    try {
      await changePassword({ currentPassword, newPassword });
      showToast('Password changed. Please sign in again.', 'success');
      logout();
    } catch (err: unknown) {
      showToast(err instanceof Error ? err.message : 'Unable to change password.', 'error');
    } finally {
      setSaving(false);
    }
  };

  return (
    <section className="grid gap-6 lg:grid-cols-[1.1fr_0.9fr]">
      <div className="rounded-[28px] border border-slate-200 bg-white p-6 shadow-sm">
        <h2 className="text-2xl font-semibold">Account settings</h2>
        <p className="mt-2 text-slate-600">Change your password and manage account security.</p>
        <form className="mt-6 space-y-4" onSubmit={onSubmit}>
          <input type="password" placeholder="Current password" value={currentPassword} onChange={(e) => setCurrentPassword(e.target.value)} className="w-full rounded-2xl border border-slate-300 px-4 py-3" required />
          <input type="password" placeholder="New password" value={newPassword} onChange={(e) => setNewPassword(e.target.value)} className="w-full rounded-2xl border border-slate-300 px-4 py-3" required minLength={8} />
          <input type="password" placeholder="Confirm new password" value={confirmPassword} onChange={(e) => setConfirmPassword(e.target.value)} className="w-full rounded-2xl border border-slate-300 px-4 py-3" required minLength={8} />
          <button type="submit" disabled={saving} className="rounded-full bg-slate-950 px-5 py-3 text-sm font-semibold text-white disabled:opacity-70">
            {saving ? 'Updating...' : 'Change password'}
          </button>
        </form>
      </div>
      <div className="rounded-[28px] border border-slate-200 bg-white p-6 shadow-sm">
        <h3 className="text-xl font-semibold">Account</h3>
        <p className="mt-4 text-sm text-slate-600">Name: {user?.fullName}</p>
        <p className="text-sm text-slate-600">Email: {user?.email}</p>
        <p className="text-sm text-slate-600">Verification: {user?.isVerified ? 'Approved' : user?.verificationStatus ?? 'Pending'}</p>
      </div>
    </section>
  );
}
