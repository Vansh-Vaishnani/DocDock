'use client';

const API_BASE = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000/api/v1';
const AUTH_STORAGE_KEY = 'docdock-auth';

const getStoredAccessToken = (): string | null => {
  if (typeof window === 'undefined') return null;
  try {
    const raw = window.localStorage.getItem(AUTH_STORAGE_KEY) || window.sessionStorage.getItem(AUTH_STORAGE_KEY);
    if (!raw) return null;
    return (JSON.parse(raw) as { accessToken?: string }).accessToken || null;
  } catch {
    return null;
  }
};

async function request<T>(path: string, init: RequestInit = {}): Promise<T> {
  const headers = new Headers(init.headers);
  headers.set('Accept', 'application/json');
  if (init.body) headers.set('Content-Type', 'application/json');

  const token = getStoredAccessToken();
  if (token) headers.set('Authorization', `Bearer ${token}`);

  const response = await fetch(`${API_BASE}${path}`, { ...init, headers });
  const payload = await response.json().catch(() => null);

  if (!response.ok) {
    const message = payload?.message || payload?.error?.message || 'Request failed';
    const error = new Error(message) as Error & { code?: string };
    error.code = payload?.error?.code;
    throw error;
  }

  return payload as T;
}

type ApiEnvelope<T> = { success: boolean; message: string; data: T };

export type DoctorAvailability = {
  isAvailable: boolean;
  workingDays: string[];
  morningSlot: { start: string; end: string };
  eveningSlot: { start: string; end: string };
  breakTime: { start: string; end: string };
  vacationMode: boolean;
  maxAppointmentsPerDay: number;
};

export type DoctorProfile = {
  _id: string;
  userId: string;
  fullName: string;
  email: string;
  phone: string;
  licenseNumber: string;
  specialization: string;
  qualifications: string[];
  medicalDegree?: string;
  experience: number;
  bio: string;
  languages: string[];
  consultationFee: number;
  gender?: string;
  dateOfBirth?: string;
  clinicName?: string;
  profilePhotoUrl?: string;
  governmentIdUrl?: string;
  medicalLicenseUrl?: string;
  location: { type: 'Point'; coordinates: [number, number] };
  availability: DoctorAvailability;
  verificationStatus: 'pending' | 'approved' | 'rejected';
  averageRating: number;
  reviewCount: number;
  profileCompletionPercent: number;
};

export type DoctorDashboard = {
  profile: DoctorProfile;
  stats: {
    todayAppointments: number;
    upcomingAppointments: number;
    availabilityStatus: boolean;
    verificationStatus: string;
    profileCompletionPercent: number;
    totalPatients: number;
    averageRating: number;
    reviewCount: number;
    totalEarnings: number;
  };
};

export type DoctorAppointment = {
  _id: string;
  scheduledAt: string;
  status: string;
  address: { label: string; location: { type: 'Point'; coordinates: [number, number] } };
  notes?: string;
  patientName: string;
  patientPhone: string;
};

export type DoctorRegisterPayload = {
  fullName: string;
  email: string;
  phone: string;
  password: string;
  gender: 'male' | 'female' | 'other';
  dateOfBirth: string;
  qualification: string;
  medicalDegree: string;
  licenseNumber: string;
  experience: number;
  specialization: string;
  consultationFee: number;
  languages: string[];
  clinicName: string;
  bio: string;
  profilePhoto?: string;
  governmentId?: string;
  medicalLicense?: string;
};

export async function registerDoctor(payload: DoctorRegisterPayload) {
  return request<ApiEnvelope<{ user: unknown; tokens: { accessToken: string; refreshToken: string }; profile: DoctorProfile }>>('/doctors/register', {
    method: 'POST',
    body: JSON.stringify(payload)
  });
}

export async function fetchDoctorProfile(): Promise<DoctorProfile> {
  const res = await request<ApiEnvelope<DoctorProfile>>('/doctors/profile/me');
  return res.data;
}

export async function updateDoctorProfile(payload: Record<string, unknown>): Promise<DoctorProfile> {
  const res = await request<ApiEnvelope<DoctorProfile>>('/doctors/profile/me', {
    method: 'PATCH',
    body: JSON.stringify(payload)
  });
  return res.data;
}

export async function fetchDoctorDashboard(): Promise<DoctorDashboard> {
  const res = await request<ApiEnvelope<DoctorDashboard>>('/doctors/dashboard');
  return res.data;
}

export async function fetchDoctorAppointments(filter: 'today' | 'upcoming' | 'all' = 'all'): Promise<DoctorAppointment[]> {
  const res = await request<ApiEnvelope<DoctorAppointment[]>>(`/doctors/appointments?filter=${filter}`);
  return res.data;
}

export async function updateDoctorAvailability(payload: Partial<DoctorAvailability>): Promise<DoctorProfile> {
  const res = await request<ApiEnvelope<DoctorProfile>>('/doctors/availability', {
    method: 'PATCH',
    body: JSON.stringify(payload)
  });
  return res.data;
}

export async function updateAppointmentStatus(appointmentId: string, status: string): Promise<void> {
  await request<ApiEnvelope<unknown>>(`/appointments/${appointmentId}/status`, {
    method: 'PATCH',
    body: JSON.stringify({ status })
  });
}

export async function fetchDoctorPrescriptions() {
  const res = await request<ApiEnvelope<unknown[]>>('/doctors/prescriptions');
  return res.data;
}

export async function fetchDoctorEarnings() {
  const res = await request<ApiEnvelope<{ totalEarnings: number; payments: unknown[] }>>('/doctors/earnings');
  return res.data;
}

export function fileToBase64(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result as string);
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
}
