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
  headers.set('Content-Type', 'application/json');

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
    const error = new Error(message) as Error & { code?: string; details?: unknown };
    error.code = payload?.error?.code;
    error.details = payload?.error?.details;
    throw error;
  }

  return payload as T;
}

export type PatientAddress = {
  label: string;
  location: { type: 'Point'; coordinates: [number, number] };
  isDefault: boolean;
};

export type PatientProfile = {
  _id: string;
  userId: string;
  bloodGroup?: string;
  allergies: string[];
  medicalHistory: Array<{ note: string; createdAt: string }>;
  addresses: PatientAddress[];
};

export type ApiEnvelope<T> = {
  success: boolean;
  message: string;
  data: T;
};

export async function addAddress(payload: PatientAddress) {
  return request<ApiEnvelope<PatientProfile>>('/patients/addresses', {
    method: 'POST',
    body: JSON.stringify(payload)
  });
}

export async function fetchPatientProfile(): Promise<PatientProfile> {
  throw new Error('Patient profile API is not available yet.');
}

export async function updatePatientProfile(): Promise<never> {
  throw new Error('Patient profile update API is not available yet.');
}

export async function listPatientAddresses(): Promise<PatientAddress[]> {
  throw new Error('Patient address listing API is not available yet.');
}

export async function updatePatientAddress(): Promise<never> {
  throw new Error('Patient address update API is not available yet.');
}

export async function deletePatientAddress(): Promise<never> {
  throw new Error('Patient address delete API is not available yet.');
}

export async function setDefaultPatientAddress(): Promise<never> {
  throw new Error('Patient default address API is not available yet.');
}

export async function updateMedicalHistory(): Promise<never> {
  throw new Error('Patient medical history API is not available yet.');
}

export async function updateAllergies(): Promise<never> {
  throw new Error('Patient allergy API is not available yet.');
}

export async function updateAccountSettings(): Promise<never> {
  throw new Error('Patient settings API is not available yet.');
}