'use client';

import { useState, useEffect } from 'react';
import { SessionData } from '@/types/auth';
import { Icons } from './icons';

interface CustomerFormProps {
  session: SessionData;
  onClose: () => void;
  onSuccess: () => void;
}

interface CreateCustomerRequest {
  customerName: string;
  acquisition: 'HOMA' | 'Altrix';
  contact: string;
  address: string;
  district: string;
  city: string;
  village: string;
  postalCode: string;
  residentialType: 'House' | 'Office Space' | 'Apartment';
  qtyPackage: number;
  subscriptionPackage: string;
  ltv: number;
  firstDateSubscription: string;
  status: string;
  cleaner1: string;
  cleaner2: string;
  notes: string;
}

interface RegionOption {
  value: string;
  label: string;
}

interface SubscriptionPackage {
  id: string;
  packageName: string;
  packageType: string;
  visitsPerWeek: number;
  pricePerVisit: string;
  totalPrice: string;
  duration: number;
  description: string;
  isActive: boolean;
}

// Helper functions untuk konversi format tanggal
const convertToDateInputFormat = (mmddyyyy: string): string => {
  if (!mmddyyyy || mmddyyyy.length !== 10) return '';
  const [month, day, year] = mmddyyyy.split('/');
  return `${year}-${month.padStart(2, '0')}-${day.padStart(2, '0')}`;
};

const convertFromDateInputFormat = (yyyymmdd: string): string => {
  if (!yyyymmdd) return '';
  const [year, month, day] = yyyymmdd.split('-');
  return `${month}/${day}/${year}`;
};

export default function CustomerForm({ session, onClose, onSuccess }: CustomerFormProps) {
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState<CreateCustomerRequest>({
    customerName: '',
    acquisition: 'HOMA',
    contact: '',
    address: '',
    district: '',
    city: '',
    village: '',
    postalCode: '',
    residentialType: 'House',
    qtyPackage: 1,
    subscriptionPackage: '',
    ltv: 0,
    firstDateSubscription: '',
    status: 'Active',
    cleaner1: '',
    cleaner2: '',
    notes: '',
  });

  // Region state
  const [cities, setCities] = useState<RegionOption[]>([]);
  const [districts, setDistricts] = useState<RegionOption[]>([]);
  const [villages, setVillages] = useState<RegionOption[]>([]);
  const [loadingRegions, setLoadingRegions] = useState(false);

  // Subscription packages state
  const [subscriptionPackages, setSubscriptionPackages] = useState<SubscriptionPackage[]>([]);
  const [loadingPackages, setLoadingPackages] = useState(false);

  // Available cleaners (from PRD sample data)
  const availableCleaners = ['Handi', 'Syeila', 'Imam'];

  // Load initial data
  useEffect(() => {
    fetchCities();
    fetchSubscriptionPackages();
  }, []);

  // Load districts when city changes
  useEffect(() => {
    if (formData.city) {
      fetchDistricts(formData.city);
      // Reset dependent fields
      setFormData(prev => ({ ...prev, district: '', village: '', postalCode: '' }));
      setVillages([]);
    }
  }, [formData.city]);

  // Load villages when district changes
  useEffect(() => {
    if (formData.city && formData.district) {
      fetchVillages(formData.city, formData.district);
      // Reset dependent fields
      setFormData(prev => ({ ...prev, village: '', postalCode: '' }));
    }
  }, [formData.city, formData.district]);

  const fetchCities = async () => {
    try {
      setLoadingRegions(true);
      const response = await fetch('/api/regions/cities');
      if (response.ok) {
        const data = await response.json();
        setCities(data.data.map((city: string) => ({ value: city, label: city })));
      }
    } catch (error) {
      console.error('Error fetching cities:', error);
    } finally {
      setLoadingRegions(false);
    }
  };

  const fetchDistricts = async (city: string) => {
    try {
      setLoadingRegions(true);
      const response = await fetch(`/api/regions/districts?city=${encodeURIComponent(city)}`);
      if (response.ok) {
        const data = await response.json();
        setDistricts(data.data.map((district: string) => ({ value: district, label: district })));
      }
    } catch (error) {
      console.error('Error fetching districts:', error);
      setDistricts([]);
    } finally {
      setLoadingRegions(false);
    }
  };

  const fetchVillages = async (city: string, district: string) => {
    try {
      setLoadingRegions(true);
      const response = await fetch(`/api/regions/villages?city=${encodeURIComponent(city)}&district=${encodeURIComponent(district)}`);
      if (response.ok) {
        const data = await response.json();
        setVillages(data.data.map((item: { village: string, postal_code: string }) => ({
          value: item.village,
          label: item.village,
          postalCode: item.postal_code
        })));
      }
    } catch (error) {
      console.error('Error fetching villages:', error);
      setVillages([]);
    } finally {
      setLoadingRegions(false);
    }
  };

  const fetchSubscriptionPackages = async () => {
    try {
      setLoadingPackages(true);
      const response = await fetch('/api/subscription-packages?active=true');
      if (response.ok) {
        const data = await response.json();
        setSubscriptionPackages(data.data || []);
      }
    } catch (error) {
      console.error('Error fetching subscription packages:', error);
    } finally {
      setLoadingPackages(false);
    }
  };

  const handleVillageChange = (village: string) => {
    const selectedVillage = villages.find(v => v.value === village);
    setFormData(prev => ({
      ...prev,
      village,
      postalCode: selectedVillage?.postalCode || ''
    }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!formData.customerName.trim()) {
      alert('Please enter customer name');
      return;
    }

    if (!formData.contact.trim()) {
      alert('Please enter contact information');
      return;
    }

    if (!formData.city || !formData.district) {
      alert('Please select city and district');
      return;
    }

    if (!formData.subscriptionPackage) {
      alert('Please select a subscription package');
      return;
    }

    if (!formData.firstDateSubscription) {
      alert('Please select first subscription date');
      return;
    }

    try {
      setLoading(true);
      
      // Convert date format untuk API
      const requestData = {
        ...formData,
        firstDateSubscription: convertFromDateInputFormat(formData.firstDateSubscription),
      };

      const response = await fetch('/api/customers', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(requestData),
      });

      if (response.ok) {
        alert('Customer created successfully!');
        onSuccess();
        onClose();
      } else {
        const error = await response.json();
        alert(`Failed to create customer: ${error.message}`);
      }
    } catch (error) {
      console.error('Error creating customer:', error);
      alert('Failed to create customer. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const resetForm = () => {
    setFormData({
      customerName: '',
      acquisition: 'HOMA',
      contact: '',
      address: '',
      district: '',
      city: '',
      village: '',
      postalCode: '',
      residentialType: 'House',
      qtyPackage: 1,
      subscriptionPackage: '',
      ltv: 0,
      firstDateSubscription: '',
      status: 'Active',
      cleaner1: '',
      cleaner2: '',
      notes: '',
    });
    setDistricts([]);
    setVillages([]);
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-xl shadow-xl max-w-4xl w-full max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="sticky top-0 bg-white border-b border-gray-200 px-6 py-4 rounded-t-xl">
          <div className="flex items-center justify-between">
            <h2 className="text-xl font-semibold text-gray-900">Add New Customer</h2>
            <button
              onClick={onClose}
              className="p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-lg transition-colors"
            >
              <Icons.close className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="p-6 space-y-6">
          {/* Basic Customer Information */}
          <div className="space-y-4">
            <h3 className="text-lg font-medium text-gray-900 border-b border-gray-200 pb-2">
              Customer Information
            </h3>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Customer Name *
                </label>
                <input
                  type="text"
                  required
                  value={formData.customerName}
                  onChange={(e) => setFormData(prev => ({ ...prev, customerName: e.target.value }))}
                  className="input-field"
                  placeholder="Enter customer name"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Contact *
                </label>
                <input
                  type="text"
                  required
                  value={formData.contact}
                  onChange={(e) => setFormData(prev => ({ ...prev, contact: e.target.value }))}
                  className="input-field"
                  placeholder="Phone number or email"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Acquisition *
                </label>
                <select
                  value={formData.acquisition}
                  onChange={(e) => setFormData(prev => ({ ...prev, acquisition: e.target.value as 'HOMA' | 'Altrix' }))}
                  className="input-field"
                  required
                >
                  <option value="HOMA">HOMA</option>
                  <option value="Altrix">Altrix</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Residential Type *
                </label>
                <select
                  value={formData.residentialType}
                  onChange={(e) => setFormData(prev => ({ ...prev, residentialType: e.target.value as any }))}
                  className="input-field"
                  required
                >
                  <option value="House">House</option>
                  <option value="Office Space">Office Space</option>
                  <option value="Apartment">Apartment</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Package Quantity *
                </label>
                <input
                  type="number"
                  min="1"
                  required
                  value={formData.qtyPackage}
                  onChange={(e) => setFormData(prev => ({ ...prev, qtyPackage: parseInt(e.target.value) || 1 }))}
                  className="input-field"
                  placeholder="1"
                />
              </div>
            </div>
          </div>

          {/* Location Information */}
          <div className="space-y-4">
            <h3 className="text-lg font-medium text-gray-900 border-b border-gray-200 pb-2">
              Location Information
            </h3>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  City *
                </label>
                <select
                  value={formData.city}
                  onChange={(e) => setFormData(prev => ({ ...prev, city: e.target.value }))}
                  className="input-field"
                  required
                  disabled={loadingRegions || cities.length === 0}
                >
                  <option value="">Select city...</option>
                  {cities.map((city) => (
                    <option key={city.value} value={city.value}>
                      {city.label}
                    </option>
                  ))}
                </select>
                {loadingRegions && <p className="text-xs text-gray-500 mt-1">Loading cities...</p>}
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  District *
                </label>
                <select
                  value={formData.district}
                  onChange={(e) => setFormData(prev => ({ ...prev, district: e.target.value }))}
                  className="input-field"
                  required
                  disabled={loadingRegions || !formData.city || districts.length === 0}
                >
                  <option value="">Select district...</option>
                  {districts.map((district) => (
                    <option key={district.value} value={district.value}>
                      {district.label}
                    </option>
                  ))}
                </select>
                {loadingRegions && formData.city && <p className="text-xs text-gray-500 mt-1">Loading districts...</p>}
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Village
                </label>
                <select
                  value={formData.village}
                  onChange={(e) => handleVillageChange(e.target.value)}
                  className="input-field"
                  disabled={loadingRegions || !formData.district || villages.length === 0}
                >
                  <option value="">Select village...</option>
                  {villages.map((village) => (
                    <option key={village.value} value={village.value}>
                      {village.label}
                    </option>
                  ))}
                </select>
                {loadingRegions && formData.district && <p className="text-xs text-gray-500 mt-1">Loading villages...</p>}
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Postal Code
                </label>
                <input
                  type="text"
                  value={formData.postalCode}
                  onChange={(e) => setFormData(prev => ({ ...prev, postalCode: e.target.value }))}
                  className="input-field"
                  placeholder="Auto-filled from village"
                  readOnly={!!formData.village}
                />
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Address *
              </label>
              <textarea
                required
                value={formData.address}
                onChange={(e) => setFormData(prev => ({ ...prev, address: e.target.value }))}
                className="input-field"
                placeholder="Enter full address"
                rows={3}
              />
            </div>
          </div>

          {/* Subscription Information */}
          <div className="space-y-4">
            <h3 className="text-lg font-medium text-gray-900 border-b border-gray-200 pb-2">
              Subscription Details
            </h3>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="md:col-span-2">
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Subscription Package *
                </label>
                <select
                  value={formData.subscriptionPackage}
                  onChange={(e) => setFormData(prev => ({ ...prev, subscriptionPackage: e.target.value }))}
                  className="input-field"
                  required
                  disabled={loadingPackages || subscriptionPackages.length === 0}
                >
                  <option value="">Select subscription package...</option>
                  {subscriptionPackages.map((pkg) => (
                    <option key={pkg.id} value={pkg.packageName}>
                      {pkg.packageName} - {pkg.visitsPerWeek}x/week - Rp {parseInt(pkg.totalPrice).toLocaleString()}
                    </option>
                  ))}
                </select>
                {loadingPackages && <p className="text-xs text-gray-500 mt-1">Loading packages...</p>}
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  First Subscription Date *
                </label>
                <input
                  type="date"
                  required
                  value={formData.firstDateSubscription}
                  onChange={(e) => setFormData(prev => ({ ...prev, firstDateSubscription: e.target.value }))}
                  className="input-field"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  LTV (Lifetime Value)
                </label>
                <input
                  type="number"
                  min="0"
                  step="1000"
                  value={formData.ltv}
                  onChange={(e) => setFormData(prev => ({ ...prev, ltv: parseInt(e.target.value) || 0 }))}
                  className="input-field"
                  placeholder="0"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Initial Status *
                </label>
                <select
                  value={formData.status}
                  onChange={(e) => setFormData(prev => ({ ...prev, status: e.target.value }))}
                  className="input-field"
                  required
                >
                  <option value="Active">Active</option>
                  <option value="Pending">Pending</option>
                  <option value="Inactive">Inactive</option>
                </select>
              </div>
            </div>
          </div>

          {/* Cleaner Assignment */}
          <div className="space-y-4">
            <h3 className="text-lg font-medium text-gray-900 border-b border-gray-200 pb-2">
              Cleaner Assignment
            </h3>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Primary Cleaner
                </label>
                <select
                  value={formData.cleaner1}
                  onChange={(e) => setFormData(prev => ({ ...prev, cleaner1: e.target.value }))}
                  className="input-field"
                >
                  <option value="">Select primary cleaner...</option>
                  {availableCleaners.map((cleaner) => (
                    <option key={cleaner} value={cleaner}>
                      {cleaner}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Secondary Cleaner
                </label>
                <select
                  value={formData.cleaner2}
                  onChange={(e) => setFormData(prev => ({ ...prev, cleaner2: e.target.value }))}
                  className="input-field"
                >
                  <option value="">Select secondary cleaner...</option>
                  {availableCleaners
                    .filter(cleaner => cleaner !== formData.cleaner1)
                    .map((cleaner) => (
                      <option key={cleaner} value={cleaner}>
                        {cleaner}
                      </option>
                    ))}
                </select>
              </div>
            </div>
          </div>

          {/* Additional Notes */}
          <div className="space-y-4">
            <h3 className="text-lg font-medium text-gray-900 border-b border-gray-200 pb-2">
              Additional Information
            </h3>
            
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Notes
              </label>
              <textarea
                value={formData.notes}
                onChange={(e) => setFormData(prev => ({ ...prev, notes: e.target.value }))}
                className="input-field"
                placeholder="Additional notes or special requirements..."
                rows={4}
              />
            </div>
          </div>

          {/* Form Actions */}
          <div className="sticky bottom-0 bg-white border-t border-gray-200 pt-4 flex justify-end space-x-3">
            <button
              type="button"
              onClick={resetForm}
              className="btn-secondary"
              disabled={loading}
            >
              Reset Form
            </button>
            <button
              type="button"
              onClick={onClose}
              className="btn-secondary"
              disabled={loading}
            >
              Cancel
            </button>
            <button
              type="submit"
              className="btn-primary"
              disabled={loading}
            >
              {loading ? (
                <>
                  <Icons.spinner className="w-4 h-4 mr-2 animate-spin" />
                  Creating...
                </>
              ) : (
                <>
                  <Icons.plus className="w-4 h-4 mr-2" />
                  Create Customer
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}