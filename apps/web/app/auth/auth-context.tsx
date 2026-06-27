'use client';

import axios, { type AxiosError, type AxiosInstance } from 'axios';
import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from 'react';
import { useRouter } from 'next/navigation';

const API_BASE = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000/api/v1';
const AUTH_STORAGE_KEY = 'docdock-auth';
const REMEMBER_STORAGE_KEY = 'docdock-auth-remember';

export type AuthRole = 'patient' | 'doctor' | 'admin';

export interface AuthUser {
  _id: string;
  fullName: string;
  email: string;
  role: AuthRole;
  isVerified?: boolean;
  verificationStatus?: 'pending' | 'approved' | 'rejected';
}

export function getRoleHomePath(user: Pick<AuthUser, 'role' | 'isVerified'> | null | undefined) {
  if (!user) {
    return '/auth/login';
  }

  if (user.role === 'patient') {
    return '/patient/dashboard';
  }

  if (user.role === 'doctor') {
    return '/doctor/dashboard';
  }

  return '/admin/dashboard';
}

interface AuthState {
  user: AuthUser | null;
  accessToken: string | null;
  refreshToken: string | null;
}

interface AuthContextValue extends AuthState {
  isHydrated: boolean;
  isLoading: boolean;
  rememberSession: boolean;
  setRememberSession: (value: boolean) => void;
  login: (values: { email: string; password: string }) => Promise<AuthUser>;
  register: (values: { fullName: string; email: string; phone: string; password: string; role: 'patient' | 'doctor' }) => Promise<void>;
  logout: () => void;
  refreshSession: () => Promise<boolean>;
  handleOAuthCallback: (payload: { user: AuthUser; accessToken: string; refreshToken: string }) => void;
}

const AuthContext = createContext<AuthContextValue | undefined>(undefined);

const getStoredAuth = (): AuthState | null => {
  if (typeof window === 'undefined') return null;
  try {
    const raw = window.localStorage.getItem(AUTH_STORAGE_KEY);
    if (!raw) return null;
    return JSON.parse(raw) as AuthState;
  } catch {
    return null;
  }
};

const persistAuth = (state: AuthState | null, remember = true) => {
  if (typeof window === 'undefined') return;
  if (!state) {
    window.localStorage.removeItem(AUTH_STORAGE_KEY);
    window.sessionStorage.removeItem(AUTH_STORAGE_KEY);
    return;
  }
  const storage = remember ? window.localStorage : window.sessionStorage;
  storage.setItem(AUTH_STORAGE_KEY, JSON.stringify(state));
  if (!remember) {
    window.localStorage.removeItem(AUTH_STORAGE_KEY);
  }
};

const apiClient: AxiosInstance = axios.create({
  baseURL: API_BASE,
  headers: { Accept: 'application/json' }
});

export function AuthProvider({ children }: { children: ReactNode }) {
  const [state, setState] = useState<AuthState>({ user: null, accessToken: null, refreshToken: null });
  const [isHydrated, setIsHydrated] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [rememberSession, setRememberSession] = useState(true);

  const applyAuth = useCallback((next: AuthState | null, shouldRemember = rememberSession) => {
    setState(next ?? { user: null, accessToken: null, refreshToken: null });
    persistAuth(next, shouldRemember);
  }, [rememberSession]);

  const clearAuth = useCallback(() => {
    applyAuth(null);
  }, [applyAuth]);

  const refreshSession = useCallback(async () => {
    const stored = getStoredAuth();
    if (!stored?.refreshToken) {
      clearAuth();
      return false;
    }

    try {
      const response = await apiClient.post('/auth/refresh-token', { refreshToken: stored.refreshToken });
      const refreshedTokens = response.data?.data;
      if (!refreshedTokens?.accessToken || !refreshedTokens?.refreshToken) {
        clearAuth();
        return false;
      }

      const nextState = {
        user: stored.user,
        accessToken: refreshedTokens.accessToken,
        refreshToken: refreshedTokens.refreshToken
      };
      applyAuth(nextState);
      return true;
    } catch {
      clearAuth();
      return false;
    }
  }, [applyAuth, clearAuth]);

  useEffect(() => {
    const initialize = async () => {
      const stored = getStoredAuth();
      const remembered = typeof window !== 'undefined' ? window.localStorage.getItem(REMEMBER_STORAGE_KEY) === 'true' : true;
      setRememberSession(remembered);
      if (stored?.user && stored.accessToken) {
        setState(stored);
      }
      if (stored?.refreshToken) {
        await refreshSession();
      }
      setIsHydrated(true);
    };

    void initialize();
  }, [refreshSession]);

  useEffect(() => {
    const requestInterceptor = apiClient.interceptors.request.use((config) => {
      const current = getStoredAuth();
      if (current?.accessToken) {
        config.headers.Authorization = `Bearer ${current.accessToken}`;
      }
      return config;
    });

    const responseInterceptor = apiClient.interceptors.response.use(
      (response) => response,
      async (error: AxiosError) => {
        const originalRequest = error.config as (typeof error.config & { _retry?: boolean }) | undefined;
        if (error.response?.status === 401 && originalRequest && !originalRequest._retry) {
          originalRequest._retry = true;
          const refreshed = await refreshSession();
          if (refreshed) {
            const latest = getStoredAuth();
            if (latest?.accessToken) {
              const headers = new axios.AxiosHeaders(originalRequest.headers);
              headers.set('Authorization', `Bearer ${latest.accessToken}`);
              originalRequest.headers = headers;
              return apiClient(originalRequest);
            }
          }
        }
        return Promise.reject(error);
      }
    );

    return () => {
      apiClient.interceptors.request.eject(requestInterceptor);
      apiClient.interceptors.response.eject(responseInterceptor);
    };
  }, [refreshSession]);

  const login = useCallback(async (values: { email: string; password: string }) => {
    setIsLoading(true);
    try {
      const response = await apiClient.post('/auth/login', values);
      const payload = response.data?.data;
      const nextState = {
        user: payload?.user ?? null,
        accessToken: payload?.tokens?.accessToken ?? null,
        refreshToken: payload?.tokens?.refreshToken ?? null
      };
      applyAuth(nextState);
      return nextState.user as AuthUser;
    } finally {
      setIsLoading(false);
    }
  }, [applyAuth]);

  const register = useCallback(async (values: { fullName: string; email: string; phone: string; password: string; role: 'patient' | 'doctor' }) => {
    await apiClient.post('/auth/register', values);
  }, []);

  const logout = useCallback(() => {
    clearAuth();
  }, [clearAuth]);

  const handleOAuthCallback = useCallback((payload: { user: AuthUser; accessToken: string; refreshToken: string }) => {
    const nextState = {
      user: payload.user,
      accessToken: payload.accessToken,
      refreshToken: payload.refreshToken
    };
    applyAuth(nextState, true);
  }, [applyAuth]);

  const setRememberSessionValue = useCallback((value: boolean) => {
    setRememberSession(value);
    if (typeof window !== 'undefined') {
      window.localStorage.setItem(REMEMBER_STORAGE_KEY, String(value));
    }
  }, []);

  const value = useMemo<AuthContextValue>(() => ({
    ...state,
    isHydrated,
    isLoading,
    rememberSession,
    setRememberSession: setRememberSessionValue,
    login,
    register,
    logout,
    refreshSession,
    handleOAuthCallback
  }), [state, isHydrated, isLoading, rememberSession, setRememberSessionValue, login, register, logout, refreshSession, handleOAuthCallback]);

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used inside AuthProvider');
  }
  return context;
}

export function AuthGuard({ children, allowedRoles }: { children: ReactNode; allowedRoles?: AuthRole[] }) {
  const { user, isHydrated } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (!isHydrated) return;
    if (!user) {
      router.replace('/auth/login');
      return;
    }
    if (allowedRoles && !allowedRoles.includes(user.role)) {
      router.replace(getRoleHomePath(user));
    }
  }, [allowedRoles, isHydrated, router, user]);

  if (!isHydrated) {
    return null;
  }

  if (!user) {
    return null;
  }

  if (allowedRoles && !allowedRoles.includes(user.role)) {
    return null;
  }

  return <>{children}</>;
}
