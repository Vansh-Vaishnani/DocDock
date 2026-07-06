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

export type PatientAppointment = {
  _id: string;
  scheduledAt: string;
  status: string;
  statusLabel: string;
  address: { label: string; location: { type: 'Point'; coordinates: [number, number] } };
  notes?: string;
  doctorId: string;
  doctorName: string;
  specialization: string;
  consultationFee: number;
};

export type AppointmentDetail = {
  appointment: {
    _id: string;
    scheduledAt: string;
    status: string;
    statusLabel: string;
    address: { label: string; location: { type: 'Point'; coordinates: [number, number] } };
    notes?: string;
    createdAt: string;
    updatedAt: string;
    rejectionReason?: string | null;
    otpCode?: string;
    isEmergency?: boolean;
  };
  doctor: {
    _id?: string;
    fullName: string;
    specialization?: string;
    consultationFee?: number;
    email?: string;
    phone?: string;
    profilePhotoUrl?: string;
    clinicName?: string;
    clinicAddress?: string;
    clinicLocation?: { type?: string; coordinates?: [number, number] };
    location?: { type?: string; coordinates?: [number, number] };
  };
  patient: {
    _id?: string;
    fullName: string;
    email?: string;
    phone?: string;
  };
  payment: {
    _id: string;
    status: string;
    amount: number;
    paidAt?: string;
    razorpayOrderId: string;
    razorpayPaymentId?: string;
    refundId?: string | null;
    refundStatus?: string | null;
  } | null;
  prescription: {
    _id: string;
    issuedAt?: string;
    diagnosis?: string;
    medications?: Array<{ name: string; dosage?: string; frequency?: string }>;
    notes?: string;
    prescriptionPdfUrl?: string;
  } | null;
  review: {
    _id: string;
    rating: number;
    comment: string;
    createdAt: string;
  } | null;
  timeline: {
    currentStatus: string;
    steps: Array<{ key: string; label: string; completed: boolean; active: boolean }>;
  };
};

export type CreateAppointmentPayload = {
  doctorId: string;
  scheduledAt: string;
  address: { label: string; location: { type: 'Point'; coordinates: [number, number] } };
  notes?: string;
};

export async function fetchPatientAppointments(filter: 'upcoming' | 'completed' | 'cancelled' | 'history' | 'all' = 'all'): Promise<PatientAppointment[]> {
  const response = await request<ApiEnvelope<PatientAppointment[]>>(`/appointments?filter=${filter}`);
  return response.data;
}

export async function fetchPatientAppointmentDetail(appointmentId: string): Promise<AppointmentDetail> {
  const response = await request<ApiEnvelope<AppointmentDetail>>(`/appointments/${appointmentId}`);
  return response.data;
}

export async function fetchDoctorAvailableSlots(doctorId: string, date: string): Promise<string[]> {
  const response = await request<ApiEnvelope<string[]>>(`/appointments/doctors/${doctorId}/available-slots?date=${date}`);
  return response.data;
}

export async function createAppointment(payload: CreateAppointmentPayload): Promise<PatientAppointment> {
  const response = await request<ApiEnvelope<PatientAppointment>>('/appointments', {
    method: 'POST',
    body: JSON.stringify(payload)
  });
  return response.data;
}

export async function cancelPatientAppointment(appointmentId: string): Promise<void> {
  await request<ApiEnvelope<unknown>>(`/appointments/${appointmentId}/status`, {
    method: 'PATCH',
    body: JSON.stringify({ status: 'cancelled_by_patient' })
  });
}

export async function createPaymentOrder(payload: { amount: number; doctorId: string; appointmentDate: string; appointmentTime: string; addressId?: string; location?: { label: string; location: { type: 'Point'; coordinates: [number, number] } }; notes?: string; consultationMode?: string }): Promise<{ orderId: string; amount: number; currency: string }> {
  const response = await request<ApiEnvelope<{ orderId: string; amount: number; currency: string }>>('/payments/create-order', {
    method: 'POST',
    body: JSON.stringify(payload)
  });
  return response.data;
}

export async function verifyPayment(payload: { razorpayOrderId: string; razorpayPaymentId: string; razorpaySignature: string }): Promise<{ appointmentId?: string }> {
  const response = await request<ApiEnvelope<{ appointmentId?: string }>>('/payments/verify', {
    method: 'POST',
    body: JSON.stringify(payload)
  });
  return response.data;
}

export async function submitReview(appointmentId: string, payload: { rating: number; comment: string }): Promise<unknown> {
  return request<ApiEnvelope<unknown>>(`/reviews/appointments/${appointmentId}/review`, {
    method: 'POST',
    body: JSON.stringify(payload)
  });
}
