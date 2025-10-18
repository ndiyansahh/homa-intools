export type AcquisitionType = 'HOMA' | 'Altrix';
export type ResidentialType = 'House' | 'Office Space' | 'Apartment';
export type SubscriptionPackage = 
  | 'Monthly Subscription of Regular Cleaning (3 hours per visit; 2 visits per week)'
  | 'Monthly Subscription of Frequent Cleaning (3 hours per visit; 3 visits per week)'
  | 'Monthly Subscription of Special Partnership (3 hours per visit; 1 visit per week)'
  | 'Monthly Subscription of Basic Cleaning (3 hours per visit; 1 visit per week)';
export type ChurnTag = 'Internal' | 'External' | 'N/A';

export interface CustomerData {
  id: string;
  no: number;
  customerName: string;
  acquisition: AcquisitionType;
  contact: string;
  address: string;
  village: string;
  district: string;
  city: string;
  postalCode: string;
  residentialType: ResidentialType;
  subscriptionPackage: SubscriptionPackage;
  qtyPackage: number;
  ltv: number;
  firstDateSubscription: string; // dd/MM/yyyy format
  status: string; // freetext like "Churn", "Active", etc.
  cleaner1: string;
  cleaner2: string;
  churnTag: ChurnTag;
  churnReason?: string;
  createdAt: string;
  updatedAt: string;
  isDeleted?: boolean;
}

export interface CreateCustomerRequest {
  customerName: string;
  acquisition: AcquisitionType;
  contact: string;
  address: string;
  village: string;
  district: string;
  city: string;
  postalCode: string;
  residentialType: ResidentialType;
  subscriptionPackage: SubscriptionPackage;
  qtyPackage: number;
  ltv: number;
  firstDateSubscription: string;
  status: string;
  cleaner1: string;
  cleaner2: string;
  churnTag: ChurnTag;
  churnReason?: string;
}

export interface UpdateCustomerRequest extends Partial<CreateCustomerRequest> {
  id: string;
}

export interface CustomerListItem {
  id: string;
  customerName: string;
  qtyPackage: number;
  subscriptionPackage: SubscriptionPackage;
  status: string;
  churnTag: ChurnTag;
}

export interface CustomersResponse {
  items: CustomerListItem[];
  page: number;
  total: number;
  totalPages: number;
}

export interface CustomerFilters {
  q?: string;
  acquisition?: AcquisitionType;
  status?: string;
  churnTag?: ChurnTag;
  city?: string;
  residentialType?: ResidentialType;
  subscriptionPackage?: SubscriptionPackage;
  page?: number;
  limit?: number;
}

export interface UpdateDateRequest {
  customerId: string;
  newDate: string; // dd/MM/yyyy format
  endDate?: string; // dd/MM/yyyy format
}

export interface AssigneeCleanerRequest {
  customerId: string;
  cleaner1?: string;
  cleaner2?: string;
}

// AttendanceRecordDB types
export interface AttendanceRecord {
  id: string;
  no: number;
  clientName: string;
  address: string; // Note: PRD shows enum but sample shows address
  package: string;
  startDate: string; // dd/MM/yyyy format
  endDate: string; // dd/MM/yyyy format
  newEndDate?: string; // dd/MM/yyyy format
  cleaner1: string;
  cleaner2: string;
  createdAt: string;
  updatedAt: string;
  isDeleted?: boolean;
}

export interface CreateAttendanceRequest {
  clientName: string;
  address: string;
  package: string;
  startDate: string;
  endDate: string;
  newEndDate?: string;
  cleaner1: string;
  cleaner2: string;
}

export interface UpdateAttendanceRequest extends Partial<CreateAttendanceRequest> {
  id: string;
}

export interface AttendanceResponse {
  items: AttendanceRecord[];
  page: number;
  total: number;
  totalPages: number;
}