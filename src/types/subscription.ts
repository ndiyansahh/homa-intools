export interface SubscriptionPackage {
  id: string;
  packageName: string;
  packageType: string;
  visitsPerWeek: number;
  pricePerVisit: string;
  totalPrice: string;
  duration: number;
  description: string;
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
}

export interface SubscriptionPackagesResponse {
  success: boolean;
  data: SubscriptionPackage[];
  message?: string;
}

export interface SubscriptionApiError {
  success: false;
  message: string;
  error?: string;
}