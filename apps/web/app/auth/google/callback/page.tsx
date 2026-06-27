'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';

import { type AuthUser, useAuth } from '../../auth-context';
import { getRoleHomePath } from '../../auth-context';
import { useToast } from '../../toast-provider';

function GoogleCallbackContent() {
  const router = useRouter();
  const { handleOAuthCallback } = useAuth();
  const { showToast } = useToast();
  const [isReady, setIsReady] = useState(false);

  useEffect(() => {
    setIsReady(true);
  }, []);

  useEffect(() => {
    if (!isReady) {
      return;
    }

    const searchParams = new URLSearchParams(window.location.search);
    const accessToken = searchParams.get('accessToken');
    const refreshToken = searchParams.get('refreshToken');
    const userParam = searchParams.get('user');

    if (!accessToken || !refreshToken || !userParam) {
      showToast('Google sign-in could not be completed.', 'error');
      router.replace('/auth/login?error=google_auth_failed');
      return;
    }

    let user: AuthUser;

    try {
      user = JSON.parse(decodeURIComponent(userParam));
    } catch {
      showToast('Google sign-in could not be completed.', 'error');
      router.replace('/auth/login?error=google_auth_failed');
      return;
    }

    handleOAuthCallback({
      user,
      accessToken,
      refreshToken
    });
    showToast(`Welcome, ${user.fullName || 'there'}!`, 'success');
    window.setTimeout(() => {
      router.replace(getRoleHomePath(user));
    }, 0);
  }, [handleOAuthCallback, isReady, router, showToast]);

  return null;
}

export default function GoogleCallbackPage() {
  return <GoogleCallbackContent />;
}
