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
  acquisition: AcquisitionType;
  address: string;
  district: string;
  city: string;
  village?: string;
  postalCode: string;
  residentialType: ResidentialType;
  assignedCleaner?: string | null; // Cleaner extracted from customerNotes
  assignments: TrialAssignment[]; // Multiple trial assignments
  notes: string;
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
  acquisition: AcquisitionType;
  district: string;
  city: string;
  village?: string;
  residentialType: ResidentialType;
  nextTrialStartDate?: string;
  nextTrialEndDate?: string;
  assignedCleaners: string[];
  assignedMitraId?: string; // Mitra ID for editing
  overallStatus?: TrialStatus; // Overall status based on latest assignment
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