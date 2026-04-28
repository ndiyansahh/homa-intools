export type AcquisitionType = 'HOMA' | 'Altrix';
export type ResidentialType = 'House' | 'Office Space' | 'Apartment';
export type SubscriptionStatus = 'Active' | 'Churn' | 'Suspended' | 'Cancelled' | 'Trial' | 'Trial Scheduled' | 'Expired';
export type SubscriptionPackage =
  | 'Monthly Subscription of Regular Cleaning (3 hours per visit; 2 visits per week)'
  | 'Monthly Subscription of Frequent Cleaning (3 hours per visit; 3 visits per week)'
  | 'Monthly Subscription of Special Partnership (3 hours per visit; 1 visit per week)'
  | 'Monthly Subscription of Basic Cleaning (3 hours per visit; 1 visit per week)';
export type ChurnTag = string;

export interface CustomerData {
  id: string;
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
  subscriptionEnd?: string; // dd/MM/yyyy format
  status: string; // freetext like "Churn", "Active", etc.
  cleaner1: string;
  cleaner2: string;
  backupMitraNames?: string[];
  churnTag: string;
  churnReason?: string;
  createdAt: string;
  updatedAt: string;
  isDeleted?: boolean;
  // Renewal fields
  subscriptionPackageId?: string;
  assignedMitraId?: string;
  assignedMitraName?: string;
  dayPattern?: string;
  subscriptionEndRaw?: string; // YYYY-MM-DD, for renewal start date computation
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
  churnTag: string;
  churnReason?: string;
}

export interface UpdateCustomerRequest extends Partial<CreateCustomerRequest> {
  id: string;
}

export interface CustomerListItem {
  id: string;
  customerName: string;
  contact: string;
  district: string | null;
  subscriptionPackage: string;
  subscriptionStatus: SubscriptionStatus;
  monthlyFee: number;
  city: string;
  invoiceId?: string; // Invoice number format: INV/Cleaning/YYYY.MM.DD-#### (7a)
  invoiceDbId?: string; // UUID of invoiceDB record, used to download PDF
  createdAt: string;
  updatedAt: string;
}

export interface CustomersResponse {
  success: boolean;
  data: CustomerListItem[];
  items: CustomerListItem[]; // Alias for compatibility
  pagination?: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
    hasNext: boolean;
    hasPrev: boolean;
  };
  // Flat structure for backward compatibility
  page: number;
  total: number;
  totalPages: number;
  message?: string;
}

export interface CustomerApiError {
  success: false;
  message: string;
  error?: string;
}

export interface CustomerFilters {
  q?: string;
  status?: string;
  city?: string;
  subscriptionPackage?: string;
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

// AttendanceRecordDB types - Enhanced with new schema fields
export interface AttendanceRecord {
  id: string;
  no: number;
  clientName: string;
  address: string; // Note: PRD shows enum but sample shows address
  package: string; // Maps to subscriptionPackage in DB
  startDate: string; // dd/MM/yyyy format
  endDate: string; // dd/MM/yyyy format
  newEndDate?: string; // dd/MM/yyyy format
  cleaner1: string;
  cleaner2: string;
  createdAt: string;
  updatedAt: string;
  isDeleted?: boolean;

  // New fields from enhanced schema
  visitNumber?: number; // Sequential visit number
  visitDate?: string; // YYYY-MM-DD format
  visitDay?: string; // Day of week
  attendanceMitraCode?: string; // Dynamic mitra code
  attendanceMitraName?: string; // Dynamic mitra name
  status?: string; // Scheduled, In-Progress, Completed, Cancelled

  // New fields from visit-based data (from API update)
  invoiceId?: string; // Visit ID used as invoice ID
  customerName?: string; // Customer name from customerDB
  mitraName?: string; // Mitra name from mitraDB
  subscriptionPackage?: string; // Subscription package from customerDB
  visitStatus?: string; // Visit status: Done, Scheduled, Cancelled
  scheduledDate?: string; // Scheduled visit date
  actualDate?: string | null; // Actual visit date
  completedAt?: string | null; // Completion timestamp
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