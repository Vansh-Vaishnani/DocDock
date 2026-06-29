'use client';

const API_BASE = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000/api/v1';
const AUTH_STORAGE_KEY = 'docdock-auth';

type AuthState = {
  accessToken?: string | null;
};

const getStoredAccessToken = (): string | null => {
  if (typeof window === 'undefined') return null;

  try {
    const raw = window.localStorage.getItem(AUTH_STORAGE_KEY) || window.sessionStorage.getItem(AUTH_STORAGE_KEY);
    if (!raw) return null;

    const parsed = JSON.parse(raw) as AuthState;
    return parsed.accessToken || null;
  } catch {
    return null;
  }
};

async function request<T>(path: string, init: RequestInit = {}): Promise<T> {
  const headers = new Headers(init.headers);
  headers.set('Accept', 'application/json');
  
  // Don't set Content-Type for FormData - let browser set it with boundary
  if (init.body && !(init.body instanceof FormData)) {
    headers.set('Content-Type', 'application/json');
  }

  const token = getStoredAccessToken();
  if (token) {
    headers.set('Authorization', `Bearer ${token}`);
  }

  const response = await fetch(`${API_BASE}${path}`, {
    ...init,
    headers
  });

  const payload = await response.json().catch(() => null);

  if (!response.ok) {
    const message = payload?.message || payload?.error?.message || 'Request failed';
    throw new Error(message);
  }

  return payload as T;
};

type ApiEnvelope<T> = {
  success: boolean;
  message: string;
  data: T;
};

export async function requestPasswordReset(email: string): Promise<void> {
  await request<ApiEnvelope<Record<string, never>>>('/auth/forgot-password', {
    method: 'POST',
    body: JSON.stringify({ email })
  });
}

export async function resetPassword(token: string, password: string): Promise<void> {
  await request<ApiEnvelope<Record<string, never>>>('/auth/reset-password', {
    method: 'POST',
    body: JSON.stringify({ token, password })
  });
}

export async function changePassword(payload: { currentPassword: string; newPassword: string }): Promise<void> {
  await request<ApiEnvelope<Record<string, never>>>('/auth/change-password', {
    method: 'PATCH',
    body: JSON.stringify(payload)
  });
}
