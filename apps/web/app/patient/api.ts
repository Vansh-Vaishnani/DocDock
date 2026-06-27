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
  if (init.body) {
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
    const error = new Error(message) as Error & { code?: string; details?: unknown };
    error.code = payload?.error?.code;
    error.details = payload?.error?.details;
    throw error;
  }

  return payload as T;
}

export type PatientAddress = {
  _id?: string;
  label: string;
  location: { type: 'Point'; coordinates: [number, number] };
  isDefault: boolean;
};

export type MedicalHistoryEntry = {
  _id?: string;
  note: string;
  createdAt: string;
};

export type PatientProfile = {
  _id: string;
  userId: string;
  fullName: string;
  email: string;
  phone: string;
  bloodGroup?: string;
  allergies: string[];
  medicalHistory: MedicalHistoryEntry[];
  addresses: PatientAddress[];
};

export type ApiEnvelope<T> = {
  success: boolean;
  message: string;
  data: T;
};

export type UpdatePatientProfilePayload = {
  fullName?: string;
  email?: string;
  phone?: string;
  bloodGroup?: string;
  allergies?: string[];
  medicalHistory?: Array<{ note: string; createdAt?: string }>;
};

export type UpdateAddressPayload = {
  label?: string;
  location?: { type: 'Point'; coordinates: [number, number] };
  isDefault?: boolean;
};

export async function fetchPatientProfile(): Promise<PatientProfile> {
  const response = await request<ApiEnvelope<PatientProfile>>('/patients/profile/me');
  return response.data;
}

export async function updatePatientProfile(payload: UpdatePatientProfilePayload): Promise<PatientProfile> {
  const response = await request<ApiEnvelope<PatientProfile>>('/patients/profile/me', {
    method: 'PATCH',
    body: JSON.stringify(payload)
  });
  return response.data;
}

export async function listPatientAddresses(): Promise<PatientAddress[]> {
  const response = await request<ApiEnvelope<PatientAddress[]>>('/patients/addresses');
  return response.data;
}

export async function addAddress(payload: Omit<PatientAddress, '_id'>) {
  return request<ApiEnvelope<PatientProfile>>('/patients/addresses', {
    method: 'POST',
    body: JSON.stringify(payload)
  });
}

export async function updatePatientAddress(addressId: string, payload: UpdateAddressPayload): Promise<PatientProfile> {
  const response = await request<ApiEnvelope<PatientProfile>>(`/patients/addresses/${addressId}`, {
    method: 'PATCH',
    body: JSON.stringify(payload)
  });
  return response.data;
}

export async function deletePatientAddress(addressId: string): Promise<PatientProfile> {
  const response = await request<ApiEnvelope<PatientProfile>>(`/patients/addresses/${addressId}`, {
    method: 'DELETE'
  });
  return response.data;
}

export async function setDefaultPatientAddress(addressId: string): Promise<PatientProfile> {
  const response = await request<ApiEnvelope<PatientProfile>>(`/patients/addresses/${addressId}/default`, {
    method: 'PATCH'
  });
  return response.data;
}

export async function updateMedicalHistory(entries: Array<{ note: string; createdAt?: string }>): Promise<PatientProfile> {
  return updatePatientProfile({ medicalHistory: entries });
}

export async function updateAllergies(allergies: string[]): Promise<PatientProfile> {
  return updatePatientProfile({ allergies });
}
