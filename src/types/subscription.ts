export interface SubscriptionPackage {
  id: string;
  subscriptionPackage: string;  // Full package name with details
  pricePerQty: string;          // Price in formatted string "Rp1,125,000"
  priceNumeric: number;         // Price in numeric format for calculations
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