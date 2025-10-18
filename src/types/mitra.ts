export type MitraGender = 'Pria' | 'Wanita';
export type MitraPartnershipType = 'Fulltime' | 'Partime';
export type MitraStatus = 'ACTIVE' | 'EXIT' | 'ACTIVE-FLAG' | 'BANNED';
export type MitraTenure = '3' | '6' | '12';
export type MitraBonus = 'Eligible' | 'Not Eligible';

export interface MitraData {
  id: string;
  joinDate: string; // dd/mm/yyyy format
  mitraCode: string; // MITRA-202210-000001
  nik: string; // 12345678901283782
  name: string;
  gender: MitraGender;
  bornDate: string; // dd/mm/yyyy format
  address: string;
  phone: string; // 6281291662589
  bankAccount: string; // BCA
  bankAccountNumber: string; // 52712364890
  bankHoldersName: string;
  cityAssignment: string;
  locationAssignment: string;
  partnershipTypes: MitraPartnershipType;
  status: MitraStatus;
  tenure: MitraTenure;
  exitDate?: string; // dd/mm/yyyy format, optional
  bonus: MitraBonus;
  createdAt: string;
  updatedAt: string;
  isDeleted?: boolean;
}

export interface CreateMitraRequest {
  name: string;
  nik: string;
  gender: MitraGender;
  bornDate: string;
  address: string;
  phone: string;
  bankAccount: string;
  bankAccountNumber: string;
  bankHoldersName: string;
  cityAssignment: string;
  locationAssignment: string;
  partnershipTypes: MitraPartnershipType;
  status: MitraStatus;
  tenure: MitraTenure;
  exitDate?: string;
  bonus: MitraBonus;
}

export interface UpdateMitraRequest extends Partial<CreateMitraRequest> {
  id: string;
}

export interface MitraListItem {
  id: string;
  joinDate: string;
  name: string;
  nik: string;
  mitraCode: string;
  address: string;
  phone: string;
  bankAccount: string;
  bankAccountNumber: string;
  bankHoldersName: string;
  status: MitraStatus;
  partnershipTypes: MitraPartnershipType;
  cityAssignment: string;
}

export interface MitraResponse {
  items: MitraListItem[];
  page: number;
  total: number;
  totalPages: number;
}

export interface MitraFilters {
  q?: string;
  status?: MitraStatus;
  partnershipType?: MitraPartnershipType;
  city?: string;
  page?: number;
  limit?: number;
}