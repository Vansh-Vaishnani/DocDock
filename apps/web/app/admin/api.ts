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

export type ApiEnvelope<T> = { success: boolean; message: string; data: T; meta?: { page?: number; total?: number; totalPages?: number } };

export type DashboardOverview = {
  totalPatients: number;
  totalDoctors: number;
  verifiedDoctors: number;
  pendingDoctorVerifications: number;
  totalAppointments: number;
  todaysAppointments: number;
  completedAppointments: number;
  cancelledAppointments: number;
  totalRevenue: number;
  totalRefunds: number;
  refundCount: number;
  averageRating: number;
  charts: {
    appointmentsLast7Days: Array<{ date: string; count: number }>;
    revenueLast7Days: Array<{ date: string; amount: number }>;
  };
};

export type AdminDoctor = {
  _id: string;
  userId: string;
  fullName?: string;
  email?: string;
  phone?: string;
  licenseNumber: string;
  specialization: string;
  qualifications: string[];
  experience: number;
  clinicName?: string;
  clinicAddress?: string;
  profilePhotoUrl?: string;
  medicalLicenseUrl?: string;
  governmentIdUrl?: string;
  verificationStatus: string;
  verificationNote?: string;
  isActive?: boolean;
};

export type AdminUser = {
  _id: string;
  fullName: string;
  email: string;
  phone: string;
  role: 'patient' | 'doctor' | 'admin';
  isVerified: boolean;
  isActive: boolean;
  verificationStatus?: string;
  createdAt: string;
};

export type AdminAppointment = {
  _id: string;
  scheduledAt: string;
  status: string;
  patientName: string;
  doctorName: string;
  specialization?: string;
  address: { label: string };
  notes?: string;
};

export type PlatformSettings = {
  _id: string;
  platformCommission: number;
  maxServiceRadius: number;
  defaultConsultationFee: number;
  maintenanceMode: boolean;
};

export type AuditLog = {
  _id: string;
  adminName: string;
  action: string;
  target: string;
  targetId?: string;
  ip?: string;
  createdAt: string;
};

export const fetchDashboard = () => request<ApiEnvelope<DashboardOverview>>('/admin/dashboard').then((r) => r.data);

export const fetchDoctors = (params: { status?: string; page?: number; limit?: number } = {}) => {
  const query = new URLSearchParams();
  if (params.status) query.set('status', params.status);
  if (params.page) query.set('page', String(params.page));
  if (params.limit) query.set('limit', String(params.limit));
  return request<ApiEnvelope<{ items: AdminDoctor[]; total: number; page: number; totalPages: number }>>(`/admin/doctors/pending?${query}`).then((r) => r);
};

export const fetchDoctorDetail = (doctorId: string) =>
  request<ApiEnvelope<{ doctor: AdminDoctor; user: AdminUser }>>(`/admin/doctors/${doctorId}`).then((r) => r.data);

export const verifyDoctor = (doctorId: string, action: 'approve' | 'reject' | 'suspend', reason?: string) =>
  request<ApiEnvelope<unknown>>(`/admin/doctors/${doctorId}/verify`, {
    method: 'POST',
    body: JSON.stringify({ action, reason })
  });

export const fetchUsers = (params: { role?: string; search?: string; status?: string; page?: number; limit?: number } = {}) => {
  const query = new URLSearchParams();
  if (params.role) query.set('role', params.role);
  if (params.search) query.set('search', params.search);
  if (params.status) query.set('status', params.status);
  if (params.page) query.set('page', String(params.page));
  if (params.limit) query.set('limit', String(params.limit));
  return request<ApiEnvelope<{ items: AdminUser[]; total: number; page: number; totalPages: number }>>(`/admin/users?${query}`).then((r) => r);
};

export const updateUser = (userId: string, body: { fullName?: string; email?: string; phone?: string }) =>
  request<ApiEnvelope<AdminUser>>(`/admin/users/${userId}`, { method: 'PATCH', body: JSON.stringify(body) });

export const suspendUser = (userId: string) =>
  request<ApiEnvelope<AdminUser>>(`/admin/users/${userId}/suspend`, { method: 'PATCH' });

export const activateUser = (userId: string) =>
  request<ApiEnvelope<AdminUser>>(`/admin/users/${userId}/activate`, { method: 'PATCH' });

export const deleteUser = (userId: string) =>
  request<ApiEnvelope<{ deleted: boolean }>>(`/admin/users/${userId}`, { method: 'DELETE' });

export const fetchAppointments = (params: { status?: string; search?: string; date?: string; page?: number; limit?: number } = {}) => {
  const query = new URLSearchParams();
  if (params.status) query.set('status', params.status);
  if (params.search) query.set('search', params.search);
  if (params.date) query.set('date', params.date);
  if (params.page) query.set('page', String(params.page));
  if (params.limit) query.set('limit', String(params.limit));
  return request<ApiEnvelope<{ items: AdminAppointment[]; total: number; page: number; totalPages: number }>>(`/admin/appointments?${query}`).then((r) => r);
};

export const fetchAppointmentDetail = (appointmentId: string) =>
  request<ApiEnvelope<unknown>>(`/admin/appointments/${appointmentId}`).then((r) => r.data);

export const fetchPayments = (period: 'daily' | 'weekly' | 'monthly' = 'daily') =>
  request<ApiEnvelope<{
    totalRevenue: number;
    refundAmount: number;
    refundCount: number;
    pendingPayments: number;
    completedPayments: number;
    chart: Array<{ label: string; revenue: number }>;
    latestTransactions: Array<{ _id: string; amount: number; status: string; patientName: string; createdAt: string }>;
  }>>(`/admin/payments?period=${period}`).then((r) => r.data);

export const fetchReviews = (params: { rating?: number; page?: number; limit?: number } = {}) => {
  const query = new URLSearchParams();
  if (params.rating) query.set('rating', String(params.rating));
  if (params.page) query.set('page', String(params.page));
  if (params.limit) query.set('limit', String(params.limit));
  return request<ApiEnvelope<{ items: Array<{ _id: string; rating: number; comment: string; doctorName: string; patientName: string; createdAt: string }>; total: number; page: number; totalPages: number }>>(`/admin/reviews?${query}`).then((r) => r);
};

export const deleteReview = (reviewId: string) =>
  request<ApiEnvelope<unknown>>(`/admin/reviews/${reviewId}`, { method: 'DELETE' });

export const fetchAnalytics = () =>
  request<ApiEnvelope<{
    appointmentsPerDay: Array<{ date: string; count: number }>;
    revenuePerMonth: Array<{ month: string; revenue: number }>;
    topSpecializations: Array<{ specialization: string; count: number }>;
    topRatedDoctors: Array<{ name: string; specialization: string; averageRating: number; reviewCount: number }>;
    mostActiveCities: Array<{ city: string; count: number }>;
    newUsersGrowth: Array<{ date: string; count: number }>;
  }>>('/admin/analytics').then((r) => r.data);

export const fetchSettings = () => request<ApiEnvelope<PlatformSettings>>('/admin/settings').then((r) => r.data);

export const updateSettings = (body: Partial<PlatformSettings>) =>
  request<ApiEnvelope<PlatformSettings>>('/admin/settings', { method: 'PATCH', body: JSON.stringify(body) });

export const fetchAuditLogs = (page = 1, limit = 30) =>
  request<ApiEnvelope<{ items: AuditLog[]; total: number; page: number; totalPages: number }>>(`/admin/audit-logs?page=${page}&limit=${limit}`).then((r) => r);
