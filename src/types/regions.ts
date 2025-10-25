export interface RegionData {
  id: string;
  regionName: string;
  province: string;
  city: string;
  district: string;
  village?: string;
  postalCode: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface CitiesResponse {
  success: boolean;
  data: string[];
  message?: string;
}

export interface DistrictsResponse {
  success: boolean;
  data: string[];
  message?: string;
}

export interface VillagesResponse {
  success: boolean;
  data: Array<{
    village: string;
    postal_code: string;
  }>;
  message?: string;
}

export interface RegionApiError {
  success: false;
  message: string;
  error?: string;
}