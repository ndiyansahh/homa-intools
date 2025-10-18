export type TrialStatus = 'Converted' | 'Not Converted' | 'Stalling/Postpone' | 'Cancelled';
export type AcquisitionType = 'HOMA' | 'Altrix';
export type ResidentialType = 'House' | 'Office Space' | 'Apartment';

export interface TrialAssignment {
  id: string;
  trialDate: string; // dd/mm/yyyy format
  assignedCleaner: string;
  status: TrialStatus;
  reasonForNotConverting?: string;
}

export interface TrialData {
  id: string;
  customerName: string;
  acquisition: AcquisitionType;
  address: string;
  district: string;
  city: string;
  postalCode: string;
  residentialType: ResidentialType;
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
  postalCode: string;
  residentialType: ResidentialType;
  assignments: {
    trialDate: string;
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
  residentialType: ResidentialType;
  nextTrialDate?: string;
  assignedCleaners: string[];
  overallStatus?: TrialStatus; // Overall status based on latest assignment
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