'use client';

import { useState, useEffect } from 'react';
import { SessionData } from '@/types/auth';
import { MitraListItem, MitraResponse, MitraStatus, CreateMitraRequest, MitraFilters, MitraPartnershipType, MitraCityAssignment, MitraGender, MitraBonusCommission, MitraSubscriptionType } from '@/types/mitra';
import { Icons } from './icons';
import MitraDetailView from './mitra-detail';
import RateEditModal, { RateEditMitraData } from './rate-edit-modal';
import { useToast } from '@/lib/toast';
import { useConfirm } from '@/components/confirm-dialog';

interface MitraManagementProps {
  session: SessionData;
}

const statusColors = {
  'Active': 'bg-green-100 text-green-800',
  'Inactive': 'bg-red-100 text-red-800',
  'Exit': 'bg-red-100 text-red-800',
  'Active-Flag': 'bg-yellow-100 text-yellow-800',
  'Banned': 'bg-gray-100 text-gray-800',
};

const partnershipColors = {
  'Full Time': 'bg-blue-100 text-blue-800',
  'Part Time': 'bg-purple-100 text-purple-800',
  'Fulltime': 'bg-blue-100 text-blue-800', // Legacy support
  'Partime': 'bg-purple-100 text-purple-800', // Legacy support
};

// Helper functions for number formatting with thousands separator
const formatNumberWithSeparator = (value: string | number): string => {
  if (!value && value !== 0) return '';
  const num = typeof value === 'string' ? value.replace(/,/g, '') : String(value);
  const numericValue = num.replace(/[^0-9]/g, '');
  return numericValue.replace(/\B(?=(\d{3})+(?!\d))/g, ',');
};

const parseFormattedNumber = (value: string): number => {
  return parseInt(value.replace(/,/g, ''), 10) || 0;
};

export default function MitraManagement({ session }: MitraManagementProps) {
  const { toast } = useToast();
  const confirm = useConfirm();
  const [mitras, setMitras] = useState<MitraListItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [creating, setCreating] = useState(false);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [lastCreatedMitra, setLastCreatedMitra] = useState<any>(null);
  const [rateConfigMitra, setRateConfigMitra] = useState<RateEditMitraData | null>(null);
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null);
  const [selectedMitra, setSelectedMitra] = useState<string | null>(null);
  const [detailViewRefreshTrigger, setDetailViewRefreshTrigger] = useState<number>(0);

  // Filter popup state
  const [showFilterPopup, setShowFilterPopup] = useState(false);

  // Form state with new comprehensive schema
  const [showForm, setShowForm] = useState(false);
  const [formData, setFormData] = useState<CreateMitraRequest>({
    mitraName: '',
    mitraNIK: '',
    mitraGender: 'Wanita' as MitraGender,
    mitraDOB: '',
    mitraPhone: '',
    mitraBankAccount: '',
    mitraBankHolderName: '',
    mitraBankAccountNumber: '',
    mitraCityAssignment: '' as MitraCityAssignment,
    mitraLocationAssignment: [],
    mitraPartnership: 'Full Time' as MitraPartnershipType,
    mitraTenure: 0,
    mitraBonusCommission: 'Eligible' as MitraBonusCommission,
    subscriptionType: 'Regular' as MitraSubscriptionType,
    payoutRate: 0,
    address: '',
    status: 'Active',
  });

  // Districts and city data
  const [availableDistricts, setAvailableDistricts] = useState<string[]>([]);
  const [loadingDistricts, setLoadingDistricts] = useState(false);

  // Valid Jabodetabek cities for dropdown
  const validCities: MitraCityAssignment[] = [
    'Jakarta', 'Jakarta Pusat', 'Jakarta Barat', 'Jakarta Timur', 'Jakarta Selatan', 'Jakarta Utara',
    'Bogor', 'Depok', 'Tangerang', 'Bekasi'
  ];

  // Filter state
  const [filters, setFilters] = useState<MitraFilters>({
    q: '',
    status: undefined,
    partnershipType: undefined,
    city: '',
    page: 1,
    limit: 10,
  });

  const [pagination, setPagination] = useState({
    page: 1,
    total: 0,
    totalPages: 0,
  });

  const fetchMitras = async (isRefresh = false) => {
    try {
      if (isRefresh) {
        setRefreshing(true);
      } else {
        setLoading(true);
      }

      const params = new URLSearchParams();
      if (filters.q) params.append('q', filters.q);
      if (filters.status) params.append('status', filters.status);
      if (filters.partnershipType) params.append('partnershipType', filters.partnershipType);
      if (filters.city) params.append('city', filters.city);
      params.append('page', filters.page?.toString() || '1');
      params.append('limit', filters.limit?.toString() || '10');

      // Add cache-busting parameter for real-time updates
      params.append('_t', Date.now().toString());

      const response = await fetch(`/api/mitra?${params}`);
      if (response.ok) {
        const data: MitraResponse = await response.json();
        setMitras(data.items);
        setPagination({
          page: data.page,
          total: data.total,
          totalPages: data.totalPages,
        });
        setLastUpdated(new Date());

        // Trigger detail view refresh if it's open
        if (selectedMitra) {
          setDetailViewRefreshTrigger(Date.now());
        }
      }
    } catch (error) {
      console.error('Error fetching mitras:', error);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    fetchMitras();
  }, [filters]);

  // Auto-refresh every 30 seconds for real-time updates
  useEffect(() => {
    const interval = setInterval(() => {
      if (!creating && !refreshing) {
        fetchMitras(true);
      }
    }, 30000);

    return () => clearInterval(interval);
  }, [creating, refreshing]);

  // Fetch districts when city changes
  useEffect(() => {
    const fetchDistricts = async () => {
      if (!formData.mitraCityAssignment) {
        setAvailableDistricts([]);
        return;
      }

      try {
        setLoadingDistricts(true);
        const response = await fetch(`/api/districts?city=${encodeURIComponent(formData.mitraCityAssignment)}`);
        if (response.ok) {
          const data = await response.json();
          if (data.success) {
            setAvailableDistricts(data.data.districts || []);
          }
        }
      } catch (error) {
        console.error('Error fetching districts:', error);
        setAvailableDistricts([]);
      } finally {
        setLoadingDistricts(false);
      }
    };

    fetchDistricts();
  }, [formData.mitraCityAssignment]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (creating) return;

    // Validate required fields
    if (!formData.mitraName.trim()) {
      toast('warning', 'Mitra name is required');
      return;
    }

    if (!formData.mitraNIK || formData.mitraNIK.length !== 16) {
      toast('warning', 'NIK must be exactly 16 digits');
      return;
    }

    if (!formData.mitraPhone || formData.mitraPhone.length < 10 || formData.mitraPhone.length > 12) {
      toast('warning', 'Phone must be 10-12 digits');
      return;
    }

    if (!formData.mitraCityAssignment) {
      toast('warning', 'City assignment is required');
      return;
    }

    if (formData.mitraLocationAssignment.length === 0) {
      toast('warning', 'Please select at least one district for location assignment');
      return;
    }

    if (!formData.mitraBankAccount.trim()) {
      toast('warning', 'Bank account is required');
      return;
    }

    if (!formData.mitraBankHolderName.trim()) {
      toast('warning', 'Bank account holder name is required');
      return;
    }

    if (!formData.mitraBankAccountNumber.trim()) {
      toast('warning', 'Bank account number is required');
      return;
    }

    // Validate age (must be at least 17 years old)
    if (formData.mitraDOB) {
      const dobParts = formData.mitraDOB.split('/');
      if (dobParts.length === 3) {
        const [month, day, year] = dobParts.map(Number);
        const birthDate = new Date(year, month - 1, day); // month is 0-indexed
        const today = new Date();
        const age = today.getFullYear() - birthDate.getFullYear();
        const monthDiff = today.getMonth() - birthDate.getMonth();

        // Adjust age if birthday hasn't occurred this year
        const actualAge = (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birthDate.getDate()))
          ? age - 1
          : age;

        if (actualAge < 17) {
          toast('warning', 'Mitra must be at least 17 years old');
          return;
        }

        if (actualAge > 80) {
          toast('warning', 'Please verify the date of birth. Age appears to be over 80 years.');
          return;
        }
      }
    }

    try {
      setCreating(true);
      const response = await fetch('/api/mitra', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData),
      });

      if (response.ok) {
        const result = await response.json();

        // Handle both new format {success, data, message} and legacy format {id, mitraCode}
        if (result.success || result.id) {
          // Store created mitra info for display
          const createdMitra = result.data || result;
          setLastCreatedMitra(createdMitra);

          // Show success message with mitra details
          const mitraCode = createdMitra.mitraCode || 'Generated';
          const mitraName = createdMitra.mitraName || formData.mitraName;
          setSuccessMessage(`Successfully created ${mitraName} with code: ${mitraCode}`);

          // Reset form with new schema
          setFormData({
            mitraName: '',
            mitraNIK: '',
            mitraGender: 'Wanita' as MitraGender,
            mitraDOB: '',
            mitraPhone: '',
            mitraBankAccount: '',
            mitraBankHolderName: '',
            mitraBankAccountNumber: '',
            mitraCityAssignment: '' as MitraCityAssignment,
            mitraLocationAssignment: [],
            mitraPartnership: 'Full Time' as MitraPartnershipType,
            mitraTenure: 0,
            mitraBonusCommission: 'Eligible' as MitraBonusCommission,
            subscriptionType: 'Regular' as MitraSubscriptionType,
            payoutRate: 0,
            address: '',
            status: 'Active',
          });
          setAvailableDistricts([]);
          setShowForm(false);

          // Open rate config modal for newly created mitra
          setRateConfigMitra({
            id: createdMitra.id,
            mitraName: createdMitra.mitraName || formData.mitraName,
            mitraCode: createdMitra.mitraCode || '',
            bonusCommission: (formData.mitraBonusCommission as string) === 'Eligible' ? 'Eligible' : 'Not Eligible',
            trialRatePerVisit: null,
            rateConfigs: [],
            bonusRate: null,
          });

          // Real-time data refresh with indicator
          console.log('🔄 Refreshing mitra list after creation...');
          await fetchMitras(true);
          console.log('✅ Mitra list refreshed successfully');

          // Auto-hide success message after 8 seconds to give user time to see the highlight
          setTimeout(() => {
            setSuccessMessage(null);
            setLastCreatedMitra(null);
          }, 8000);

        } else {
          toast('error', result.message || result.error || 'Failed to create mitra');
        }
      } else {
        const error = await response.json();
        toast('error', error.message || error.error || 'Failed to create mitra');
      }
    } catch (error) {
      console.error('Error creating mitra:', error);
      toast('error', 'Failed to create mitra');
    } finally {
      setCreating(false);
    }
  };

  const handleDelete = async (id: string) => {
    const ok = await confirm({ title: 'Delete Mitra', message: 'Delete this mitra? This cannot be undone.', confirmLabel: 'Delete', danger: true });
    if (!ok) return;

    try {
      const response = await fetch(`/api/mitra/${id}`, { method: 'DELETE' });
      if (response.ok) {
        fetchMitras();
      } else {
        toast('error', 'Failed to delete mitra');
      }
    } catch (error) {
      console.error('Error deleting mitra:', error);
      toast('error', 'Failed to delete mitra');
    }
  };

  return (
    <>
      {selectedMitra && (
        <MitraDetailView
          mitraId={selectedMitra}
          onClose={() => setSelectedMitra(null)}
        />
      )}

      <div className="space-y-6">
        {/* Success Message */}
        {successMessage && (
          <div className="bg-green-50 border border-green-200 rounded-lg p-4 mb-6">
            <div className="flex items-start">
              <div className="flex-shrink-0">
                <Icons.check className="h-5 w-5 text-green-400" />
              </div>
              <div className="ml-3">
                <h3 className="text-sm font-medium text-green-800">
                  Mitra Created Successfully!
                </h3>
                <div className="mt-1 text-sm text-green-700">
                  {successMessage}
                </div>
                {lastCreatedMitra && (
                  <div className="mt-2 text-xs text-green-600">
                    <div><strong>ID:</strong> {lastCreatedMitra.id}</div>
                    <div><strong>NIK:</strong> {lastCreatedMitra.mitraNIK}</div>
                    <div><strong>Gender:</strong> {lastCreatedMitra.mitraGender}</div>
                    <div><strong>Partnership:</strong> {lastCreatedMitra.mitraPartnership}</div>
                  </div>
                )}
              </div>
              <div className="ml-auto pl-3">
                <div className="-mx-1.5 -my-1.5">
                  <button
                    onClick={() => {
                      setSuccessMessage(null);
                      setLastCreatedMitra(null);
                    }}
                    className="inline-flex bg-green-50 rounded-md p-1.5 text-green-500 hover:bg-green-100"
                  >
                    <Icons.x className="h-4 w-4" />
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Simplified Header with Search, Filter, and Add Button */}
        <div className="card p-6">
          <div className="flex flex-col md:flex-row md:items-center gap-4">
            {/* Page Title */}
            <div className="flex items-center gap-3 flex-shrink-0">
              <div className="p-2 bg-blue-100 rounded-lg">
                <Icons.users className="w-6 h-6 text-blue-600" />
              </div>
              <div>
                <h1 className="text-2xl font-bold text-gray-900">Mitra Management</h1>
                <p className="text-sm text-gray-600">{pagination.total} partners</p>
              </div>
            </div>

            {/* Search Input */}
            <div className="flex-1 relative">
              <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                <Icons.search className="h-5 w-5 text-gray-400" />
              </div>
              <input
                type="text"
                placeholder="Search mitras..."
                value={filters.q}
                onChange={(e) => setFilters(prev => ({ ...prev, q: e.target.value, page: 1 }))}
                className="input-field pl-10 w-full"
              />
            </div>

            {/* Filter Button with Popup */}
            <button
              onClick={() => setShowFilterPopup(!showFilterPopup)}
              className={`btn-secondary flex items-center gap-2 relative ${
                (filters.status || filters.partnershipType || filters.city) ? 'bg-blue-50 border-blue-300 text-blue-700' : ''
              }`}
            >
              <Icons.filter className="w-4 h-4" />
              <span>Filters</span>
              {(filters.status || filters.partnershipType || filters.city) && (
                <span className="absolute -top-2 -right-2 bg-blue-600 text-white text-xs rounded-full w-5 h-5 flex items-center justify-center">
                  {[filters.status, filters.partnershipType, filters.city].filter(Boolean).length}
                </span>
              )}
            </button>

            {/* Add New Mitra Button */}
            <button
              onClick={() => {
                setShowForm(!showForm);
                if (showForm) {
                  setSuccessMessage(null);
                  setLastCreatedMitra(null);
                }
              }}
              className="btn-primary flex items-center gap-2"
            >
              <Icons.plus className="w-4 h-4" />
              <span>Add New Mitra</span>
            </button>
          </div>

          {/* Filter Popup */}
          {showFilterPopup && (
            <div className="fixed inset-0 bg-black bg-opacity-25 z-50 flex items-start justify-end p-4">
              <div
                className="absolute inset-0"
                onClick={() => setShowFilterPopup(false)}
              />
              <div className="bg-white rounded-xl shadow-2xl w-full max-w-md mt-20 relative z-10">
                {/* Popup Header */}
                <div className="bg-gradient-to-r from-blue-600 to-indigo-600 text-white px-6 py-4 rounded-t-xl flex items-center justify-between">
                  <h3 className="text-lg font-semibold">Filter Mitra Partners</h3>
                  <button
                    onClick={() => setShowFilterPopup(false)}
                    className="text-white hover:bg-white hover:bg-opacity-20 rounded-full p-1"
                  >
                    <Icons.x className="w-5 h-5" />
                  </button>
                </div>

                {/* Popup Content */}
                <div className="p-6 space-y-4">
                  {/* Status Filter */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Status
                    </label>
                    <select
                      value={filters.status || ''}
                      onChange={(e) => setFilters(prev => ({ ...prev, status: e.target.value as MitraStatus || undefined, page: 1 }))}
                      className="input-field w-full"
                    >
                      <option value="">All Status</option>
                      <option value="ACTIVE">Active</option>
                      <option value="EXIT">Exit</option>
                      <option value="ACTIVE-FLAG">Active-Flag</option>
                      <option value="BANNED">Banned</option>
                    </select>
                  </div>

                  {/* Partnership Type Filter */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Partnership Type
                    </label>
                    <select
                      value={filters.partnershipType || ''}
                      onChange={(e) => setFilters(prev => ({ ...prev, partnershipType: e.target.value as MitraPartnershipType || undefined, page: 1 }))}
                      className="input-field w-full"
                    >
                      <option value="">All Partnership</option>
                      <option value="Full Time">Full Time</option>
                      <option value="Part Time">Part Time</option>
                      <option value="Fulltime">Fulltime (Legacy)</option>
                      <option value="Partime">Partime (Legacy)</option>
                    </select>
                  </div>

                  {/* City Filter */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      City
                    </label>
                    <input
                      type="text"
                      placeholder="Filter by city..."
                      value={filters.city}
                      onChange={(e) => setFilters(prev => ({ ...prev, city: e.target.value, page: 1 }))}
                      className="input-field w-full"
                    />
                  </div>
                </div>

                {/* Popup Footer */}
                <div className="px-6 py-4 bg-gray-50 rounded-b-xl flex items-center justify-between">
                  <button
                    onClick={() => {
                      setFilters(prev => ({ ...prev, status: undefined, partnershipType: undefined, city: '', page: 1 }));
                    }}
                    className="text-sm text-gray-600 hover:text-gray-900"
                  >
                    Clear all
                  </button>
                  <button
                    onClick={() => setShowFilterPopup(false)}
                    className="btn-primary"
                  >
                    Apply Filters
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Create Mitra Form */}
        {showForm && (
          <div className="card p-6">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-xl font-semibold text-gray-900">Create New Mitra</h2>
              <button
                onClick={() => {
                  setShowForm(false);
                  setSuccessMessage(null);
                  setLastCreatedMitra(null);
                }}
                className="text-gray-500 hover:text-gray-700"
              >
                <Icons.x className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {/* Mitra Name */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Mitra Name *
                  </label>
                  <input
                    type="text"
                    required
                    value={formData.mitraName}
                    onChange={(e) => setFormData(prev => ({ ...prev, mitraName: e.target.value }))}
                    className="input-field"
                    placeholder="Enter full name"
                  />
                </div>

                {/* NIK */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    NIK (16 digits) *
                  </label>
                  <input
                    type="text"
                    required
                    value={formData.mitraNIK}
                    onChange={(e) => {
                      const value = e.target.value.replace(/\D/g, '').slice(0, 16);
                      setFormData(prev => ({ ...prev, mitraNIK: value }));
                    }}
                    className="input-field"
                    placeholder="3175081234567890"
                    maxLength={16}
                    pattern="\d{16}"
                  />
                  <p className="text-xs text-gray-500 mt-1">Enter exactly 16 digits</p>
                </div>

                {/* Gender */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Gender *
                  </label>
                  <select
                    value={formData.mitraGender}
                    onChange={(e) => setFormData(prev => ({ ...prev, mitraGender: e.target.value as MitraGender }))}
                    className="input-field"
                    required
                  >
                    <option value="Wanita">Wanita</option>
                    <option value="Pria">Pria</option>
                  </select>
                </div>

                {/* Date of Birth */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Date of Birth *
                  </label>
                  <input
                    type="date"
                    required
                    value={
                      formData.mitraDOB
                        ? (() => {
                          // Convert mm/dd/yyyy to yyyy-mm-dd for date input
                          const parts = formData.mitraDOB.split('/');
                          if (parts.length === 3) {
                            const [month, day, year] = parts;
                            return `${year}-${month.padStart(2, '0')}-${day.padStart(2, '0')}`;
                          }
                          return '';
                        })()
                        : ''
                    }
                    onChange={(e) => {
                      // Convert yyyy-mm-dd to mm/dd/yyyy for storage
                      const dateValue = e.target.value;
                      if (dateValue) {
                        const [year, month, day] = dateValue.split('-');
                        const formattedDate = `${month}/${day}/${year}`;
                        setFormData(prev => ({ ...prev, mitraDOB: formattedDate }));
                      } else {
                        setFormData(prev => ({ ...prev, mitraDOB: '' }));
                      }
                    }}
                    className="input-field"
                    max={new Date().toISOString().split('T')[0]} // Prevent future dates
                    min={(() => {
                      // Set minimum date to 80 years ago (reasonable maximum age)
                      const eightyYearsAgo = new Date();
                      eightyYearsAgo.setFullYear(eightyYearsAgo.getFullYear() - 80);
                      return eightyYearsAgo.toISOString().split('T')[0];
                    })()}
                    title="Date of birth must be between 17-80 years ago"
                  />
                  <p className="text-xs text-gray-500 mt-1">
                    Select date of birth (must be 17+ years old, stored as mm/dd/yyyy)
                  </p>
                </div>

                {/* Phone */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Phone (10-12 digits) *
                  </label>
                  <input
                    type="text"
                    required
                    value={formData.mitraPhone}
                    onChange={(e) => {
                      const value = e.target.value.replace(/\D/g, '').slice(0, 12);
                      setFormData(prev => ({ ...prev, mitraPhone: value }));
                    }}
                    className="input-field"
                    placeholder="081234567890"
                    minLength={10}
                    maxLength={12}
                  />
                  <p className="text-xs text-gray-500 mt-1">Enter 10-12 digits without country code</p>
                </div>

                {/* Bank Account */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Bank Account *
                  </label>
                  <input
                    type="text"
                    required
                    value={formData.mitraBankAccount}
                    onChange={(e) => setFormData(prev => ({ ...prev, mitraBankAccount: e.target.value }))}
                    className="input-field"
                    placeholder="BCA, Mandiri, BNI, BRI, etc."
                  />
                </div>

                {/* Bank Account Holder Name */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Bank Account Holder Name *
                  </label>
                  <input
                    type="text"
                    required
                    value={formData.mitraBankHolderName}
                    onChange={(e) => setFormData(prev => ({ ...prev, mitraBankHolderName: e.target.value }))}
                    className="input-field"
                    placeholder="Name as shown on bank account"
                  />
                </div>

                {/* Bank Account Number */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Bank Account Number *
                  </label>
                  <input
                    type="text"
                    required
                    value={formData.mitraBankAccountNumber}
                    onChange={(e) => setFormData(prev => ({ ...prev, mitraBankAccountNumber: e.target.value }))}
                    className="input-field"
                    placeholder="Account number"
                  />
                </div>

                {/* City Assignment - Dropdown */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    City Assignment *
                  </label>
                  <select
                    value={formData.mitraCityAssignment}
                    onChange={(e) => {
                      setFormData(prev => ({
                        ...prev,
                        mitraCityAssignment: e.target.value as MitraCityAssignment,
                        mitraLocationAssignment: [] // Reset location when city changes
                      }));
                    }}
                    className="input-field"
                    required
                  >
                    <option value="">Select City</option>
                    {validCities.map(city => (
                      <option key={city} value={city}>{city}</option>
                    ))}
                  </select>
                </div>

                {/* Location Assignment - Multiple Choice */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Location Assignment (Districts) *
                  </label>
                  {formData.mitraCityAssignment ? (
                    <div className="space-y-2">
                      {loadingDistricts ? (
                        <div className="text-sm text-gray-500">Loading districts...</div>
                      ) : availableDistricts.length > 0 ? (
                        <div className="max-h-32 overflow-y-auto border border-gray-300 rounded-md p-2 space-y-1">
                          {availableDistricts.map(district => (
                            <label key={district} className="flex items-center space-x-2 text-sm">
                              <input
                                type="checkbox"
                                checked={formData.mitraLocationAssignment.includes(district)}
                                onChange={(e) => {
                                  const updatedLocations = e.target.checked
                                    ? [...formData.mitraLocationAssignment, district]
                                    : formData.mitraLocationAssignment.filter(loc => loc !== district);
                                  setFormData(prev => ({ ...prev, mitraLocationAssignment: updatedLocations }));
                                }}
                                className="rounded border-gray-300"
                              />
                              <span>{district}</span>
                            </label>
                          ))}
                        </div>
                      ) : (
                        <div className="text-sm text-gray-500">No districts available for this city</div>
                      )}
                      {formData.mitraLocationAssignment.length > 0 && (
                        <div className="text-xs text-gray-600">
                          Selected: {formData.mitraLocationAssignment.join(', ')}
                        </div>
                      )}
                    </div>
                  ) : (
                    <div className="text-sm text-gray-500 p-2 border border-gray-200 rounded-md">
                      Please select a city first
                    </div>
                  )}
                  {formData.mitraLocationAssignment.length === 0 && formData.mitraCityAssignment && (
                    <p className="text-xs text-red-500 mt-1">Please select at least one district</p>
                  )}
                </div>

                {/* Tenure - Free Text */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Tenure (months)
                  </label>
                  <input
                    type="number"
                    value={formData.mitraTenure}
                    onChange={(e) => setFormData(prev => ({ ...prev, mitraTenure: parseInt(e.target.value) || 0 }))}
                    className="input-field"
                    placeholder="Enter number of months"
                    min="0"
                    step="1"
                  />
                  <p className="text-xs text-gray-500 mt-1">Enter tenure period in months (can be any number)</p>
                </div>
              </div>

              {/* Address */}
              <div className="md:col-span-2">
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Address
                </label>
                <textarea
                  value={formData.address}
                  onChange={(e) => setFormData(prev => ({ ...prev, address: e.target.value }))}
                  rows={2}
                  className="input-field"
                  placeholder="Complete residential address (optional)"
                />
              </div>

              <div className="flex justify-end space-x-3">
                <button
                  type="button"
                  onClick={() => setShowForm(false)}
                  className="btn-secondary"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={creating}
                  className="btn-primary relative"
                >
                  {creating ? (
                    <>
                      <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                      Creating Mitra...
                    </>
                  ) : (
                    <>
                      <Icons.plus className="w-4 h-4 mr-2" />
                      Create Mitra
                    </>
                  )}
                </button>
              </div>
            </form>
          </div>
        )}

        {/* Mitra List */}
        <div className="card">
          <div className="p-6 border-b border-gray-200">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-3">
                <h2 className="text-xl font-semibold text-gray-900">Mitra Partners</h2>
                {refreshing && (
                  <div className="flex items-center text-blue-600">
                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-blue-600 mr-2"></div>
                    <span className="text-sm">Updating...</span>
                  </div>
                )}
              </div>
              <div className="flex items-center space-x-3">
                <div className="text-right">
                  <span className="text-sm text-gray-500">
                    {pagination.total} total partners
                  </span>
                  {lastUpdated && (
                    <div className="text-xs text-gray-400">
                      Last updated: {lastUpdated.toLocaleTimeString()}
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>

          {loading ? (
            <div className="p-8 text-center">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto"></div>
              <p className="mt-2 text-gray-600">Loading mitras...</p>
            </div>
          ) : mitras.length === 0 ? (
            <div className="p-8 text-center">
              <Icons.users className="w-12 h-12 text-gray-400 mx-auto mb-4" />
              <h3 className="text-lg font-medium text-gray-900 mb-2">No Mitras Found</h3>
              <p className="text-gray-600">
                {filters.q || filters.status || filters.partnershipType || filters.city
                  ? 'Try adjusting your filters to see more results.'
                  : 'Get started by creating your first mitra partner.'}
              </p>
            </div>
          ) : (
            <>
              <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-gray-200">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Partner
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Code / NIK
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Contact
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Assignment
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Status
                      </th>
                      <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Actions
                      </th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-200">
                    {mitras.map((mitra) => {
                      // Highlight newly created mitra
                      const isNewlyCreated = lastCreatedMitra && (
                        mitra.id === lastCreatedMitra.id ||
                        mitra.mitraCode === lastCreatedMitra.mitraCode ||
                        mitra.nik === lastCreatedMitra.mitraNIK
                      );

                      return (
                        <tr
                          key={mitra.id}
                          className={`cursor-pointer transition-colors duration-300 ${isNewlyCreated
                              ? 'bg-green-50 hover:bg-green-100 border-l-4 border-green-400'
                              : 'hover:bg-gray-50'
                            }`}
                          onClick={() => setSelectedMitra(selectedMitra === mitra.id ? null : mitra.id)}
                        >
                          <td className="px-6 py-4 whitespace-nowrap">
                            <div className="flex items-center">
                              <div className="flex-shrink-0 h-10 w-10 bg-gradient-to-br from-blue-500 to-indigo-600 rounded-full flex items-center justify-center shadow-md">
                                <span className="text-white font-semibold text-sm">
                                  {mitra.name.charAt(0).toUpperCase()}
                                </span>
                              </div>
                              <div className="ml-4">
                                <div className="text-sm font-medium text-gray-900">
                                  {mitra.name}
                                </div>
                                <div className="text-xs text-gray-500">
                                  Joined {mitra.joinDate}
                                </div>
                              </div>
                            </div>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap">
                            <div className="text-sm text-gray-900">
                              {mitra.mitraCode}
                            </div>
                            <div className="text-xs text-gray-500">
                              NIK: {mitra.nik}
                            </div>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap">
                            <div className="text-sm text-gray-900">
                              {mitra.phone}
                            </div>
                            <div className="text-xs text-gray-500">
                              {mitra.bankAccount} - {mitra.bankAccountNumber}
                            </div>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap">
                            <div className="text-sm text-gray-900">
                              {mitra.locationAssignment}
                            </div>
                            <div className="flex gap-1 mt-1">
                              <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${partnershipColors[mitra.partnershipTypes] || 'bg-gray-100 text-gray-800'}`}>
                                {mitra.partnershipTypes}
                              </span>
                            </div>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap">
                            <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${statusColors[mitra.status as keyof typeof statusColors] || 'bg-gray-100 text-gray-800'}`}>
                              {mitra.status}
                            </span>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                            {(['ADMIN', 'OWNER'].includes(session.role)) && (
                              <button
                                onClick={(e) => {
                                  e.stopPropagation();
                                  handleDelete(mitra.id);
                                }}
                                className="text-red-600 hover:text-red-900 ml-4"
                              >
                                <Icons.trash className="w-4 h-4" />
                              </button>
                            )}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>

              {/* Pagination */}
              {pagination.totalPages > 1 && (
                <div className="px-6 py-4 border-t border-gray-200 flex items-center justify-between">
                  <div className="text-sm text-gray-700">
                    Showing {((filters.page || 1) - 1) * (filters.limit || 10) + 1} to{' '}
                    {Math.min((filters.page || 1) * (filters.limit || 10), pagination.total)} of{' '}
                    {pagination.total} results
                  </div>
                  <div className="flex items-center space-x-2">
                    <button
                      onClick={() => setFilters(prev => ({ ...prev, page: Math.max(1, (prev.page || 1) - 1) }))}
                      disabled={(filters.page || 1) <= 1}
                      className="px-3 py-1 border border-gray-300 rounded-md text-sm disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-50"
                    >
                      Previous
                    </button>
                    <span className="text-sm text-gray-700">
                      Page {filters.page || 1} of {pagination.totalPages}
                    </span>
                    <button
                      onClick={() => setFilters(prev => ({ ...prev, page: Math.min(pagination.totalPages, (prev.page || 1) + 1) }))}
                      disabled={(filters.page || 1) >= pagination.totalPages}
                      className="px-3 py-1 border border-gray-300 rounded-md text-sm disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-50"
                    >
                      Next
                    </button>
                  </div>
                </div>
              )}
            </>
          )}
        </div>
      </div>

      {/* Rate Config Modal — shown after mitra creation */}
      {rateConfigMitra && (
        <RateEditModal
          mitra={rateConfigMitra}
          isReadOnly={false}
          skipLabel="Skip"
          onClose={() => setRateConfigMitra(null)}
          onSaved={() => setRateConfigMitra(null)}
        />
      )}
    </>
  );
}