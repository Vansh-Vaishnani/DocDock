export interface DoctorSearchFilters {
  latitude?: number;
  longitude?: number;
  specialization?: string;
  minExperience?: number;
  maxFee?: number;
  search?: string;
  sortBy?: string;
  radius?: number;
  page?: number;
  limit?: number;
  availableOnly?: boolean;
}

export declare function buildDoctorSearchParams(filters?: DoctorSearchFilters): URLSearchParams;
