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
      <div className="dd-card">
        <h2 className="text-2xl font-bold" style={{ color: 'var(--text-primary)' }}>Account Settings</h2>
        <p className="mt-2 text-sm" style={{ color: 'var(--text-secondary)' }}>Change your password and manage account security.</p>
        <form className="mt-6 space-y-4" onSubmit={onSubmit}>
          <div>
            <label className="dd-label">Current Password</label>
            <input type="password" placeholder="Current password" value={currentPassword} onChange={(e) => setCurrentPassword(e.target.value)} className="dd-input" required />
          </div>
          <div>
            <label className="dd-label">New Password</label>
            <input type="password" placeholder="New password" value={newPassword} onChange={(e) => setNewPassword(e.target.value)} className="dd-input" required minLength={8} />
          </div>
          <div>
            <label className="dd-label">Confirm New Password</label>
            <input type="password" placeholder="Confirm new password" value={confirmPassword} onChange={(e) => setConfirmPassword(e.target.value)} className="dd-input" required minLength={8} />
          </div>
          <button type="submit" disabled={saving} className="btn-primary py-2.5">
            {saving ? 'Updating...' : 'Change password'}
          </button>
        </form>
      </div>
      <div className="dd-card">
        <h3 className="text-xl font-bold" style={{ color: 'var(--text-primary)' }}>Account Details</h3>
        <div className="mt-4 space-y-2">
          <p className="text-sm" style={{ color: 'var(--text-secondary)' }}><span className="font-semibold">Name:</span> {user?.fullName}</p>
          <p className="text-sm" style={{ color: 'var(--text-secondary)' }}><span className="font-semibold">Email:</span> {user?.email}</p>
          <p className="text-sm" style={{ color: 'var(--text-secondary)' }}>
            <span className="font-semibold">Verification status:</span>{' '}
            <span className={`status-badge text-[10px] uppercase tracking-wide ${user?.isVerified ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-400' : 'bg-amber-100 text-amber-700 dark:bg-amber-950/40 dark:text-amber-400'}`}>
              {user?.isVerified ? 'Approved' : user?.verificationStatus ?? 'Pending'}
            </span>
          </p>
        </div>
      </div>
    </section>
  );
}
