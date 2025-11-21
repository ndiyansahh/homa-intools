export type TrialStatus = 'Converted' | 'Not Converted' | 'Stalling/Postpone' | 'Cancelled';
export type AcquisitionType = 'HOMA' | 'Altrix';
export type ResidentialType = 'House' | 'Office Space' | 'Apartment';

export interface TrialAssignment {
  id: string;
  trialStart: string; // dd/mm/yyyy format
  trialEnd?: string; // dd/mm/yyyy format - optional for ongoing trials
  assignedCleaner: string;
  status: TrialStatus;
  reasonForNotConverting?: string;
  ltv?: number; // Calculated LTV in months
}

export interface TrialData {
  id: string;
  customerName: string;
  contact?: string;
  acquisition: AcquisitionType;
  address: string;
  district: string;
  city: string;
  village?: string;
  postalCode: string;
  residentialType: ResidentialType;
  assignedCleaner?: string | null; // Cleaner name
  assignedMitraId?: string | null; // Cleaner ID for editing
  assignments: TrialAssignment[]; // Multiple trial assignments
  notes: string;
  subscriptionPackage?: string; // Selected subscription package
  subscriptionStartDate?: string; // dd/mm/yyyy format
  subscriptionEndDate?: string; // dd/mm/yyyy format
  monthlyFee?: number; // Monthly subscription fee
  totalSessions?: number; // Total sessions based on mitra availability
  chosenDays?: string[]; // Selected days for service
  overallStatus?: TrialStatus; // Overall status based on latest assignment
  createdAt: string;
  updatedAt: string;
  isDeleted?: boolean;
}

export interface CreateTrialRequest {
  customerName: string;
  acquisition: AcquisitionType;
  address: string;
  district: string;
  city: string;
  village?: string;
  postalCode: string;
  residentialType: ResidentialType;
  assignments: {
    trialStart: string; // dd/mm/yyyy format
    trialEnd?: string; // dd/mm/yyyy format - optional for ongoing trials
    assignedCleaner: string;
    status?: TrialStatus;
    reasonForNotConverting?: string;
  }[];
  notes?: string;
}

export interface TrialListItem {
  id: string;
  customerName: string;
  contact?: string;
  acquisition: AcquisitionType;
  address?: string;
  district: string;
  city: string;
  village?: string;
  postalCode?: string;
  residentialType: ResidentialType;
  nextTrialStartDate?: string;
  nextTrialEndDate?: string;
  assignedCleaners: string[];
  assignedCleaner?: string | null; // Single assigned cleaner name
  assignedMitraId?: string; // Mitra ID for editing
  overallStatus?: TrialStatus; // Overall status based on latest assignment
  subscriptionPackage?: string; // Selected subscription package
  ltv?: number; // Calculated LTV in months
  createdAt: string;
  isDeleted?: boolean;
}

export interface TrialDetail extends TrialData {
  // Full trial data with all assignments
}

export interface TrialsResponse {
  items: TrialListItem[];
  page: number;
  total: number;
  totalPages: number;
}

export interface TrialFilters {
  q?: string;
  status?: TrialStatus;
  cleaner?: string;
  acquisition?: AcquisitionType;
  city?: string;
  residentialType?: ResidentialType;
  page?: number;
  limit?: number;
}