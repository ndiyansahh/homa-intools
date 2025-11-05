'use client';

import { useState, useEffect } from 'react';
import { SessionData } from '@/types/auth';
import { MitraListItem, MitraResponse, MitraStatus, CreateMitraRequest, MitraFilters, MitraPartnershipType, MitraCityAssignment, MitraGender, MitraBonusCommission } from '@/types/mitra';
import { Icons } from './icons';
import MitraDetailView from './mitra-detail';

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

export default function MitraManagement({ session }: MitraManagementProps) {
  const [mitras, setMitras] = useState<MitraListItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [creating, setCreating] = useState(false);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [lastCreatedMitra, setLastCreatedMitra] = useState<any>(null);
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null);
  const [selectedMitra, setSelectedMitra] = useState<string | null>(null);
  
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
      alert('Mitra name is required');
      return;
    }
    
    if (!formData.mitraNIK || formData.mitraNIK.length !== 16) {
      alert('NIK must be exactly 16 digits');
      return;
    }
    
    if (!formData.mitraPhone || formData.mitraPhone.length < 10 || formData.mitraPhone.length > 12) {
      alert('Phone must be 10-12 digits');
      return;
    }
    
    if (!formData.mitraCityAssignment) {
      alert('City assignment is required');
      return;
    }
    
    if (formData.mitraLocationAssignment.length === 0) {
      alert('Please select at least one district for location assignment');
      return;
    }
    
    if (!formData.mitraBankAccount.trim()) {
      alert('Bank account is required');
      return;
    }
    
    if (!formData.mitraBankHolderName.trim()) {
      alert('Bank account holder name is required');
      return;
    }
    
    if (!formData.mitraBankAccountNumber.trim()) {
      alert('Bank account number is required');
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
          alert('Mitra must be at least 17 years old');
          return;
        }
        
        if (actualAge > 80) {
          alert('Please verify the date of birth. Age appears to be over 80 years.');
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
          setSuccessMessage(`✅ Successfully created ${mitraName} with code: ${mitraCode}`);
          
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
            address: '',
            status: 'Active',
          });
          setAvailableDistricts([]);
          setShowForm(false);
          
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
          alert(result.message || result.error || 'Failed to create mitra');
        }
      } else {
        const error = await response.json();
        alert(error.message || error.error || 'Failed to create mitra');
      }
    } catch (error) {
      console.error('Error creating mitra:', error);
      alert('Failed to create mitra');
    } finally {
      setCreating(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Are you sure you want to delete this mitra?')) return;

    try {
      const response = await fetch(`/api/mitra/${id}`, { method: 'DELETE' });
      if (response.ok) {
        fetchMitras();
      } else {
        alert('Failed to delete mitra');
      }
    } catch (error) {
      console.error('Error deleting mitra:', error);
      alert('Failed to delete mitra');
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

      {/* Create Mitra Form */}
      <div className="card p-6">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-xl font-semibold text-gray-900">Create New Mitra</h2>
          <button
            onClick={() => {
              setShowForm(!showForm);
              if (showForm) {
                // Clear any success messages when closing form
                setSuccessMessage(null);
                setLastCreatedMitra(null);
              }
            }}
            className="btn-primary"
          >
            <Icons.plus className="w-4 h-4 mr-2" />
            {showForm ? 'Cancel' : 'New Mitra'}
          </button>
        </div>

        {showForm && (
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

              {/* Partnership Type */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Partnership Type *
                </label>
                <select
                  value={formData.mitraPartnership}
                  onChange={(e) => setFormData(prev => ({ ...prev, mitraPartnership: e.target.value as MitraPartnershipType }))}
                  className="input-field"
                  required
                >
                  <option value="Full Time">Full Time</option>
                  <option value="Part Time">Part Time</option>
                </select>
                <p className="text-xs text-gray-500 mt-1">
                  Full Time: 1 week 8 hours work | Part Time: 1 week 4 hours work
                </p>
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

              {/* Bonus Commission */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Bonus Commission *
                </label>
                <select
                  value={formData.mitraBonusCommission}
                  onChange={(e) => setFormData(prev => ({ ...prev, mitraBonusCommission: e.target.value as MitraBonusCommission }))}
                  className="input-field"
                  required
                >
                  <option value="Eligible">Eligible</option>
                  <option value="Not Eligible">Not Eligible</option>
                </select>
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
        )}
      </div>

      {/* Filters */}
      <div className="card p-4">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <div>
            <input
              type="text"
              placeholder="Search mitras..."
              value={filters.q}
              onChange={(e) => setFilters(prev => ({ ...prev, q: e.target.value, page: 1 }))}
              className="input-field"
            />
          </div>
          <div>
            <select
              value={filters.status || ''}
              onChange={(e) => setFilters(prev => ({ ...prev, status: e.target.value as MitraStatus || undefined, page: 1 }))}
              className="input-field"
            >
              <option value="">All Status</option>
              <option value="ACTIVE">Active</option>
              <option value="EXIT">Exit</option>
              <option value="ACTIVE-FLAG">Active-Flag</option>
              <option value="BANNED">Banned</option>
            </select>
          </div>
          <div>
            <select
              value={filters.partnershipType || ''}
              onChange={(e) => setFilters(prev => ({ ...prev, partnershipType: e.target.value as MitraPartnershipType || undefined, page: 1 }))}
              className="input-field"
            >
              <option value="">All Partnership</option>
              <option value="Full Time">Full Time</option>
              <option value="Part Time">Part Time</option>
              <option value="Fulltime">Fulltime (Legacy)</option>
              <option value="Partime">Partime (Legacy)</option>
            </select>
          </div>
          <div>
            <input
              type="text"
              placeholder="Filter by city..."
              value={filters.city}
              onChange={(e) => setFilters(prev => ({ ...prev, city: e.target.value, page: 1 }))}
              className="input-field"
            />
          </div>
        </div>
      </div>

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
              <button
                onClick={() => fetchMitras(true)}
                disabled={refreshing}
                className="text-sm text-blue-600 hover:text-blue-800 disabled:opacity-50"
                title="Refresh data"
              >
                🔄 Refresh
              </button>
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
                      className={`cursor-pointer transition-colors duration-300 ${
                        isNewlyCreated 
                          ? 'bg-green-50 hover:bg-green-100 border-l-4 border-green-400' 
                          : 'hover:bg-gray-50'
                      }`}
                      onClick={() => setSelectedMitra(selectedMitra === mitra.id ? null : mitra.id)}
                    >
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div>
                          <div className="text-sm font-medium text-gray-900">
                            {mitra.name}
                          </div>
                          <div className="text-xs text-gray-500">
                            Joined {mitra.joinDate}
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
    </>
  );
}