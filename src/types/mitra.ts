export type MitraGender = 'Pria' | 'Wanita';
export type MitraPartnershipType = 'Full Time' | 'Part Time';
export type MitraStatus = 'Active' | 'Inactive' | 'Exit' | 'Banned' | 'Active-Flag';
export type MitraBonusCommission = 'Eligible' | 'Not Eligible';
export type MitraSubscriptionType = 'Basic' | 'Regular' | 'Frequent';

// Jabodetabek cities for assignment
export type MitraCityAssignment = 'Jakarta' | 'Bogor' | 'Depok' | 'Tangerang' | 'Bekasi' | 'Jakarta Pusat' | 'Jakarta Barat' | 'Jakarta Timur' | 'Jakarta Selatan' | 'Jakarta Utara';

export interface MitraData {
  id: string;
  joinDate: string; // dd/mm/yyyy format
  mitraCode: string; // MITRA-YEARMONTH-SEQUENCE (e.g., MITRA-202407-000046)
  name: string; // Legacy field name for compatibility
  nik: string; // Legacy field name for compatibility
  gender: string; // Legacy field name for compatibility
  bornDate: string; // Legacy field name for compatibility
  phone: string; // Legacy field name for compatibility

  // Legacy fields (for backward compatibility)
  address?: string;

  // Banking information
  bankAccount: string; // Legacy field name for compatibility
  bankHoldersName: string; // Legacy field name for compatibility
  bankAccountNumber: string; // Legacy field name for compatibility

  // Assignment details
  cityAssignment: string; // Legacy field name for compatibility
  locationAssignment: string; // Legacy field name for compatibility (comma-separated)
  partnershipTypes: string; // Legacy field name for compatibility
  tenure: string; // Legacy field name for compatibility (string)
  exitDate?: string; // dd/mm/yyyy format, optional
  bonus: string; // Legacy field name for compatibility

  // Subscription and rate fields
  subscriptionType?: MitraSubscriptionType; // Basic, Regular, Frequent
  payoutRate?: string; // Monthly payout rate in IDR (formatted)
  bonusRate?: string; // Bonus rate in IDR (only when bonus eligible)

  status: MitraStatus;
  createdAt: string;
  updatedAt: string;
  isDeleted?: boolean;
}

export interface CreateMitraRequest {
  mitraName: string;
  mitraNIK: string; // 16 digit number
  mitraGender: MitraGender; // Wanita, Pria
  mitraDOB: string; // mm/dd/yyyy format
  mitraPhone: string; // 10-12 digits

  // Banking information
  mitraBankAccount: string; // Free text (e.g., BCA)
  mitraBankHolderName: string; // Free text
  mitraBankAccountNumber: string; // Number

  // Assignment details
  mitraCityAssignment: MitraCityAssignment; // Jabodetabek cities
  mitraLocationAssignment: string[]; // Array of districts
  mitraPartnership: MitraPartnershipType; // Full Time, Part Time
  mitraTenure: number; // Free number
  mitraExitDate?: string; // dd/mm/yyyy format, optional
  mitraBonusCommission: MitraBonusCommission; // Eligible, Not Eligible

  // Subscription and payout rate
  subscriptionType?: MitraSubscriptionType; // Basic, Regular, Frequent (default: Regular)
  payoutRate?: number; // Monthly payout rate in Rupiah (maps to monthlyBaseRate)
  bonusRate?: number; // Bonus rate in Rupiah (only when bonus eligible)

  // Legacy field (kept for backward compatibility)
  monthlyBaseRate?: number; // Alias for payoutRate

  trialRatePerVisit?: number | null; // Trial rate per visit in Rupiah

  status?: MitraStatus; // Optional, defaults to Active

  // Legacy fields (optional for backward compatibility)
  address?: string;
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
  locationAssignment: string;
  baseRate?: string;
  monthlyBaseRate?: string;
  subscriptionType?: MitraSubscriptionType;
  payoutRate?: string;
  bonusRate?: string;
  bonusCommission?: MitraBonusCommission;
  trialRatePerVisit?: string | null;
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