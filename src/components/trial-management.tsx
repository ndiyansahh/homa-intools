'use client';

import React, { useState, useEffect, useCallback, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { SessionData } from '@/types/auth';
import { TrialListItem, TrialsResponse, TrialStatus, CreateTrialRequest, TrialFilters, AcquisitionType, ResidentialType } from '@/types/trial';
import { Icons } from './icons';

// Region interfaces
interface City {
  id: string;
  name: string;
}

interface District {
  id: string;
  name: string;
  city_id: string;
}

interface Village {
  id: string;
  name: string;
  district_id: string;
  postal_code: string;
}

// Mitra interface
interface Mitra {
  id: string;
  name: string;
  phone: string;
}

interface TrialManagementProps {
  session: SessionData;
}

const statusColors = {
  'Converted': 'bg-green-100 text-green-800',
  'Not Converted': 'bg-red-100 text-red-800',
  'Stalling/Postpone': 'bg-yellow-100 text-yellow-800',
  'Cancelled': 'bg-gray-100 text-gray-800',
};

const acquisitionColors = {
  'HOMA': 'bg-blue-100 text-blue-800',
  'Altrix': 'bg-purple-100 text-purple-800',
};

const residentialColors = {
  'House': 'bg-green-100 text-green-800',
  'Office Space': 'bg-orange-100 text-orange-800',
  'Apartment': 'bg-indigo-100 text-indigo-800',
};

// Day options for trial schedule
const dayOptions = [
  { value: 'Monday', label: 'Monday' },
  { value: 'Tuesday', label: 'Tuesday' },
  { value: 'Wednesday', label: 'Wednesday' },
  { value: 'Thursday', label: 'Thursday' },
  { value: 'Friday', label: 'Friday' },
  { value: 'Saturday', label: 'Saturday' },
  { value: 'Sunday', label: 'Sunday' },
];

// Helper functions untuk konversi format tanggal
const convertToDateInputFormat = (ddmmyyyy: string): string => {
  if (!ddmmyyyy || ddmmyyyy.length !== 10) return '';
  const [day, month, year] = ddmmyyyy.split('/');
  return `${year}-${month.padStart(2, '0')}-${day.padStart(2, '0')}`;
};

const convertFromDateInputFormat = (yyyymmdd: string): string => {
  if (!yyyymmdd) return '';
  const [year, month, day] = yyyymmdd.split('-');
  return `${day.padStart(2, '0')}/${month.padStart(2, '0')}/${year}`;
};

export default function TrialManagement({ session }: TrialManagementProps) {
  const router = useRouter();
  const [trials, setTrials] = useState<TrialListItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [creating, setCreating] = useState(false);
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null);

  // Form state
  const [showForm, setShowForm] = useState(false);
  const [formData, setFormData] = useState({
    customer_name: '',
    contact: '',
    address: '',
    city_id: '',
    district_id: '',
    village_id: '',
    postal_code: '',
    residential_type: 'House' as ResidentialType,
    // Trial Schedule fields
    trial_date: '', // Changed: single date instead of start_date/end_date/selected_day
    selected_mitra: '',
  });

  // Additional trial dates state (for Feedback 3b: unlimited trial dates)
  const [additionalTrialDates, setAdditionalTrialDates] = useState<{
    date: string; // yyyy-MM-dd format
    mitraId: string;
  }[]>([]);

  // Region dropdown states
  const [cities, setCities] = useState<City[]>([]);
  const [districts, setDistricts] = useState<District[]>([]);
  const [villages, setVillages] = useState<Village[]>([]);
  const [mitras, setMitras] = useState<Mitra[]>([]);

  // Loading states
  const [loadingCities, setLoadingCities] = useState(false);
  const [loadingDistricts, setLoadingDistricts] = useState(false);
  const [loadingVillages, setLoadingVillages] = useState(false);
  const [loadingMitras, setLoadingMitras] = useState(false);

  // Error states
  const [formError, setFormError] = useState<string>('');

  // Filter state
  const [filters, setFilters] = useState<TrialFilters>({
    q: '',
    status: undefined,
    cleaner: '',
    acquisition: undefined,
    city: '',
    residentialType: undefined,
    page: 1,
    limit: 10,
  });

  const [pagination, setPagination] = useState({
    page: 1,
    total: 0,
    totalPages: 0,
  });

  // Fetch functions for cascading dropdowns
  const fetchCities = async () => {
    try {
      setLoadingCities(true);
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 10000); // 10 second timeout

      const response = await fetch('/api/regions/cities', {
        signal: controller.signal
      });

      clearTimeout(timeoutId);

      if (response.ok) {
        const result = await response.json();
        setCities(result.success ? result.data : []);
      } else {
        console.error('Failed to fetch cities:', response.status, response.statusText);
        setCities([]);
      }
    } catch (error) {
      if (error instanceof Error && error.name === 'AbortError') {
        console.error('Cities fetch timed out');
      } else {
        console.error('Error fetching cities:', error);
      }
      setCities([]);
    } finally {
      setLoadingCities(false);
    }
  };

  const fetchDistricts = async (cityId: string) => {
    try {
      setLoadingDistricts(true);
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 10000); // 10 second timeout

      const response = await fetch(`/api/regions/districts?city_id=${encodeURIComponent(cityId)}`, {
        signal: controller.signal
      });

      clearTimeout(timeoutId);

      if (response.ok) {
        const result = await response.json();
        setDistricts(result.success ? result.data : []);
      } else {
        console.error('Failed to fetch districts:', response.status, response.statusText);
        setDistricts([]);
      }
    } catch (error) {
      if (error instanceof Error && error.name === 'AbortError') {
        console.error('Districts fetch timed out');
      } else {
        console.error('Error fetching districts:', error);
      }
      setDistricts([]);
    } finally {
      setLoadingDistricts(false);
    }
  };

  const fetchVillages = async (districtId: string) => {
    try {
      setLoadingVillages(true);
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 10000); // 10 second timeout

      const response = await fetch(`/api/regions/villages?district_id=${encodeURIComponent(districtId)}`, {
        signal: controller.signal
      });

      clearTimeout(timeoutId);

      if (response.ok) {
        const result = await response.json();
        setVillages(result.success ? result.data : []);
      } else {
        console.error('Failed to fetch villages:', response.status, response.statusText);
        setVillages([]);
      }
    } catch (error) {
      if (error instanceof Error && error.name === 'AbortError') {
        console.error('Villages fetch timed out');
      } else {
        console.error('Error fetching villages:', error);
      }
      setVillages([]);
    } finally {
      setLoadingVillages(false);
    }
  };

  const fetchMitras = async (customerCity?: string, customerDistrict?: string) => {
    try {
      setLoadingMitras(true);
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 10000); // 10 second timeout

      // Fetch active mitras
      const params = '?status=Active';
      const response = await fetch(`/api/mitra${params}`, {
        signal: controller.signal
      });

      clearTimeout(timeoutId);

      if (response.ok) {
        const data = await response.json();
        // API returns {items: [], page, total} structure for paginated requests
        const mitrasArray = Array.isArray(data) ? data : (data.items && Array.isArray(data.items) ? data.items : []);

        // Area filter removed per client feedback
        // ("Tidak perlu ada limitasi area mitra")
        // All active mitras are now shown regardless of customer location

        setMitras(mitrasArray);
      } else {
        console.error('Failed to fetch mitras:', response.status, response.statusText);
        setMitras([]);
      }
    } catch (error) {
      if (error instanceof Error && error.name === 'AbortError') {
        console.error('Mitras fetch timed out');
      } else {
        console.error('Error fetching mitras:', error);
      }
      setMitras([]);
    } finally {
      setLoadingMitras(false);
    }
  };

  // Load cities and mitras on component mount
  useEffect(() => {
    fetchCities();
    // Fetch all active mitras immediately (no area restriction per Feedback Feb 1, 2026)
    fetchMitras();

    // Cleanup function to reset loading states if component unmounts
    return () => {
      setLoadingCities(false);
      setLoadingDistricts(false);
      setLoadingVillages(false);
      setLoadingMitras(false);
    };
  }, []);

  // Fetch mitras logic removed from here as it should not depend on city/district
  /* 
  useEffect(() => {
    if (formData.city_id && formData.district_id) {
      fetchMitras(formData.city_id, formData.district_id);
    } else {
      // Reset mitras if city or district changes
      setMitras([]);
    }
  }, [formData.city_id, formData.district_id]);
  */

  // Handle cascading dropdown changes
  const handleCityChange = (cityId: string) => {
    setFormData(prev => ({
      ...prev,
      city_id: cityId,
      district_id: '',
      village_id: '',
      postal_code: '',
      // Reset trial schedule when region changes
      selected_mitra: '',
    }));
    setDistricts([]);
    setVillages([]);
    // setMitras([]); // Do not reset mitras (global list)
    setFormError(''); // Clear any validation errors
    if (cityId) {
      fetchDistricts(cityId);
    }
  };

  const handleDistrictChange = (districtId: string) => {
    setFormData(prev => ({
      ...prev,
      district_id: districtId,
      village_id: '',
      postal_code: '',
      // Reset trial schedule when district changes
      selected_mitra: '',
    }));
    setVillages([]);
    setFormError(''); // Clear any validation errors
    if (districtId) {
      fetchVillages(districtId);
    }
  };

  const handleVillageChange = (villageId: string) => {
    const selectedVillage = villages.find(v => v.id === villageId);
    setFormData(prev => ({
      ...prev,
      village_id: villageId,
      postal_code: selectedVillage?.postal_code || ''
    }));
    setFormError(''); // Clear any validation errors
  };

  const fetchTrials = useCallback(async (isRefresh = false) => {
    try {
      if (isRefresh) {
        setRefreshing(true);
      } else {
        setLoading(true);
      }

      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 30000); // 30 second timeout

      const params = new URLSearchParams();
      if (filters.q) params.append('q', filters.q);
      if (filters.status) params.append('status', filters.status);
      if (filters.cleaner) params.append('cleaner', filters.cleaner);
      if (filters.acquisition) params.append('acquisition', filters.acquisition);
      if (filters.city) params.append('city', filters.city);
      if (filters.residentialType) params.append('residentialType', filters.residentialType);
      params.append('page', filters.page?.toString() || '1');
      params.append('limit', filters.limit?.toString() || '10');

      // Add cache-busting parameter for real-time updates
      params.append('_t', Date.now().toString());

      const response = await fetch(`/api/trials?${params}`, {
        signal: controller.signal
      });

      clearTimeout(timeoutId);

      if (response.ok) {
        const result = await response.json();

        // Handle new API response format
        if (result.success && result.data) {
          setTrials(result.data);
          setPagination({
            page: result.page || result.pagination?.page || 1,
            total: result.total || result.pagination?.total || 0,
            totalPages: result.totalPages || result.pagination?.totalPages || 0,
          });
        } else {
          // Fallback for old format
          const data: TrialsResponse = result;
          setTrials(data.items);
          setPagination({
            page: data.page,
            total: data.total,
            totalPages: data.totalPages,
          });
        }
        setLastUpdated(new Date());
      } else {
        console.error('Failed to fetch trials:', response.status, response.statusText);
        setTrials([]);
        setPagination({ page: 1, total: 0, totalPages: 0 });
      }
    } catch (error) {
      if (error instanceof Error && error.name === 'AbortError') {
        console.error('Trials fetch timed out');
      } else {
        console.error('Error fetching trials:', error);
      }
      setTrials([]);
      setPagination({ page: 1, total: 0, totalPages: 0 });
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [filters]);

  useEffect(() => {
    fetchTrials();
  }, [fetchTrials]);

  // Auto-refresh every 30 seconds for real-time updates
  useEffect(() => {
    const interval = setInterval(() => {
      if (!loading && !refreshing && !creating) {
        fetchTrials(true);
      }
    }, 30000); // 30 seconds

    return () => clearInterval(interval);
  }, [filters, loading, refreshing, creating, fetchTrials]);

  // Fallback timeout to reset loading state
  useEffect(() => {
    const fallbackTimeout = setTimeout(() => {
      if (loading) {
        console.warn('Fallback: Forcing loading state to false after 30 seconds');
        setLoading(false);
      }
    }, 30000);

    return () => clearTimeout(fallbackTimeout);
  }, [loading]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (creating) return;

    try {
      setCreating(true);
      setFormError('');

      // Validate required fields
      if (!formData.customer_name.trim()) {
        setFormError('Customer name is required');
        return;
      }
      if (!formData.contact.trim()) {
        setFormError('Contact is required');
        return;
      }
      if (!formData.address.trim()) {
        setFormError('Address is required');
        return;
      }
      if (!formData.city_id) {
        setFormError('City is required');
        return;
      }
      if (!formData.district_id) {
        setFormError('District is required');
        return;
      }
      if (!formData.village_id) {
        setFormError('Village is required');
        return;
      }

      // Validate trial schedule
      if (!formData.trial_date) {
        setFormError('Trial date is required');
        return;
      }
      if (!formData.selected_mitra) {
        setFormError('Please select a mitra');
        return;
      }

      // Backdate validation removed per client feedback
      // ("Tidak perlu ada limitasi backdate di create trial form")
      // const trialDate = new Date(formData.trial_date);
      // const today = new Date();
      // today.setHours(0, 0, 0, 0);
      // if (trialDate < today) {
      //   setFormError('Trial date cannot be in the past');
      //   return;
      // }

      // Get city and district names from IDs
      const selectedCity = cities.find(c => c.id === formData.city_id);
      const selectedDistrict = districts.find(d => d.id === formData.district_id);
      const selectedVillage = villages.find(v => v.id === formData.village_id);
      const selectedMitra = mitras.find(m => m.id === formData.selected_mitra);

      if (!selectedCity || !selectedDistrict || !selectedMitra) {
        setFormError('Invalid selection. Please refresh and try again.');
        return;
      }

      // Convert date from yyyy-MM-dd (HTML input) to dd/MM/yyyy (API format)
      const [year, month, day] = formData.trial_date.split('-');
      const trialStartFormatted = `${day}/${month}/${year}`;

      // Build CreateTrialRequest payload
      const requestPayload: CreateTrialRequest = {
        customerName: formData.customer_name.trim(),
        acquisition: 'HOMA', // Default to HOMA
        address: formData.address.trim(),
        district: selectedDistrict.name,
        city: selectedCity.name,
        village: selectedVillage?.name,
        postalCode: formData.postal_code,
        residentialType: formData.residential_type,
        assignments: [
          // First trial date
          {
            trialStart: trialStartFormatted,
            assignedCleaner: selectedMitra.name,
            assignedMitraId: selectedMitra.id, // Include mitra ID for DB storage
            status: 'Not Converted', // Default status
          },
          // Additional trial dates
          ...additionalTrialDates
            .filter(td => td.date && td.mitraId) // Only include valid dates
            .map(td => {
              const [y, m, d] = td.date.split('-');
              const formattedDate = `${d}/${m}/${y}`;
              const mitra = mitras.find(mi => mi.id === td.mitraId);

              return {
                trialStart: formattedDate,
                assignedCleaner: mitra?.name || '',
                assignedMitraId: td.mitraId, // Include mitra ID for DB storage
                status: 'Not Converted' as TrialStatus,
              };
            })
        ],
        notes: '', // Add notes if needed
      };

      // Add timeout to form submission
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 30000); // 30 second timeout for form submission

      const response = await fetch('/api/trials', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(requestPayload),
        signal: controller.signal
      });

      clearTimeout(timeoutId);

      if (response.ok) {
        const result = await response.json();
        if (result.success) {
          // Reset form completely
          setFormData({
            customer_name: '',
            contact: '',
            address: '',
            city_id: '',
            district_id: '',
            village_id: '',
            postal_code: '',
            residential_type: 'House' as ResidentialType,
            // Trial Schedule fields
            trial_date: '',
            selected_mitra: '',
          });

          // Reset dropdown states
          setDistricts([]);
          setVillages([]);
          setAdditionalTrialDates([]); // Reset additional trial dates
          setFormError('');
          setShowForm(false);

          // Refresh the trials list
          fetchTrials();

          // Show success message
          const visitsCreated = result.data?.visitsCreated || 0;
          setFormError(''); // Clear any previous errors
          alert(`Trial created successfully with ${visitsCreated} visit(s) scheduled!`);
        } else {
          setFormError(result.message || 'Failed to create trial');
        }
      } else {
        const errorResult = await response.json().catch(() => ({}));
        setFormError(errorResult.message || errorResult.error || 'Failed to create trial');
      }
    } catch (error) {
      if (error instanceof Error && error.name === 'AbortError') {
        console.error('Form submission timed out');
        setFormError('Request timed out. Please try again.');
      } else {
        console.error('Error creating trial:', error);
        setFormError('Network error: Failed to create trial');
      }
    } finally {
      setCreating(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Are you sure you want to delete this trial?')) return;

    try {
      const response = await fetch(`/api/trials/${id}`, { method: 'DELETE' });
      if (response.ok) {
        fetchTrials();
      } else {
        alert('Failed to delete trial');
      }
    } catch (error) {
      console.error('Error deleting trial:', error);
      alert('Failed to delete trial');
    }
  };

  // Removed old assignment functions - using Trial Schedule now

  const handleCancelForm = () => {
    // Reset form data
    setFormData({
      customer_name: '',
      contact: '',
      address: '',
      city_id: '',
      district_id: '',
      village_id: '',
      postal_code: '',
      residential_type: 'House' as ResidentialType,
      // Trial Schedule fields
      trial_date: '',
      selected_mitra: '',
    });

    // Reset dropdown states
    setDistricts([]);
    setVillages([]);
    setFormError('');
    setShowForm(false);
  };

  return (
    <>
      <div className="space-y-6">
        {/* Header with Stats */}
        <div className="card p-6">
          <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-blue-100 rounded-lg">
                <Icons.beaker className="w-6 h-6 text-blue-600" />
              </div>
              <div>
                <span className="text-3xl font-bold text-gray-900">{pagination.total}</span>
                <p className="text-sm text-gray-600">Total Trials</p>
              </div>
            </div>
            {lastUpdated && (
              <div className="text-sm text-gray-500">
                Last updated: {lastUpdated.toLocaleTimeString()}
              </div>
            )}
          </div>
        </div>

        {/* Summary Cards */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <div className="bg-gradient-to-br from-green-50 to-green-100 rounded-xl p-5 border border-green-200 hover:shadow-md transition-shadow">
            <div className="flex items-center justify-between mb-2">
              <Icons.checkCircle className="w-5 h-5 text-green-600" />
              <span className="text-xs font-medium text-green-700">Converted</span>
            </div>
            <div className="flex items-end justify-between">
              <div>
                <p className="text-2xl font-bold text-green-900">
                  {trials.filter(t => t.overallStatus === 'Converted').length}
                </p>
                <p className="text-xs text-green-600 mt-1">Successful Trials</p>
              </div>
            </div>
          </div>

          <div className="bg-gradient-to-br from-red-50 to-red-100 rounded-xl p-5 border border-red-200 hover:shadow-md transition-shadow">
            <div className="flex items-center justify-between mb-2">
              <Icons.xCircle className="w-5 h-5 text-red-600" />
              <span className="text-xs font-medium text-red-700">Not Converted</span>
            </div>
            <div className="flex items-end justify-between">
              <div>
                <p className="text-2xl font-bold text-red-900">
                  {trials.filter(t => t.overallStatus === 'Not Converted').length}
                </p>
                <p className="text-xs text-red-600 mt-1">Unsuccessful</p>
              </div>
            </div>
          </div>

          <div className="bg-gradient-to-br from-yellow-50 to-yellow-100 rounded-xl p-5 border border-yellow-200 hover:shadow-md transition-shadow">
            <div className="flex items-center justify-between mb-2">
              <Icons.clockIcon className="w-5 h-5 text-yellow-600" />
              <span className="text-xs font-medium text-yellow-700">Stalling</span>
            </div>
            <div className="flex items-end justify-between">
              <div>
                <p className="text-2xl font-bold text-yellow-900">
                  {trials.filter(t => t.overallStatus === 'Stalling/Postpone').length}
                </p>
                <p className="text-xs text-yellow-600 mt-1">Pending</p>
              </div>
            </div>
          </div>

          <div className="bg-gradient-to-br from-gray-50 to-gray-100 rounded-xl p-5 border border-gray-200 hover:shadow-md transition-shadow">
            <div className="flex items-center justify-between mb-2">
              <Icons.x className="w-5 h-5 text-gray-600" />
              <span className="text-xs font-medium text-gray-700">Cancelled</span>
            </div>
            <div className="flex items-end justify-between">
              <div>
                <p className="text-2xl font-bold text-gray-900">
                  {trials.filter(t => t.overallStatus === 'Cancelled').length}
                </p>
                <p className="text-xs text-gray-600 mt-1">Cancelled</p>
              </div>
            </div>
          </div>
        </div>

        {/* Create Trial Button */}
        <div className="flex justify-end mb-6">
          <button
            onClick={() => setShowForm(!showForm)}
            className="btn-primary"
          >
            <Icons.plus className="w-4 h-4 mr-2" />
            Add New Trial
          </button>
        </div>

        {/* Create Trial Modal */}
        {showForm && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-xl shadow-xl max-w-4xl w-full max-h-[90vh] overflow-y-auto">
              {/* Header */}
              <div className="sticky top-0 bg-white border-b border-gray-200 px-6 py-4 rounded-t-xl">
                <div className="flex items-center justify-between">
                  <h2 className="text-xl font-semibold text-gray-900">Add New Trial</h2>
                  <button
                    onClick={() => setShowForm(false)}
                    className="p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-lg transition-colors"
                  >
                    <Icons.close className="w-5 h-5" />
                  </button>
                </div>
              </div>

              {/* Form */}
              <form onSubmit={handleSubmit} className="p-6 space-y-6">
              {/* Error Display */}
              {formError && (
                <div className="bg-red-50 border border-red-200 rounded-md p-4">
                  <div className="flex">
                    <div className="flex-shrink-0">
                      <svg className="h-5 w-5 text-red-400" viewBox="0 0 20 20" fill="currentColor">
                        <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.28 7.22a.75.75 0 00-1.06 1.06L8.94 10l-1.72 1.72a.75.75 0 101.06 1.06L10 11.06l1.72 1.72a.75.75 0 101.06-1.06L11.06 10l1.72-1.72a.75.75 0 00-1.06-1.06L10 8.94 8.28 7.22z" clipRule="evenodd" />
                      </svg>
                    </div>
                    <div className="ml-3">
                      <p className="text-sm text-red-800">{formError}</p>
                    </div>
                  </div>
                </div>
              )}

              {/* Basic Customer Information */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Customer Name *
                  </label>
                  <input
                    type="text"
                    required
                    value={formData.customer_name}
                    onChange={(e) => {
                      setFormData(prev => ({ ...prev, customer_name: e.target.value }));
                      if (formError && e.target.value.trim()) setFormError('');
                    }}
                    className={`input-field ${formError && !formData.customer_name.trim() ? 'border-red-300 focus:border-red-500' : ''}`}
                    placeholder="Enter customer name"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Contact *
                  </label>
                  <input
                    type="tel"
                    required
                    value={formData.contact}
                    onChange={(e) => {
                      setFormData(prev => ({ ...prev, contact: e.target.value }));
                      if (formError && e.target.value.trim()) setFormError('');
                    }}
                    className={`input-field ${formError && !formData.contact.trim() ? 'border-red-300 focus:border-red-500' : ''}`}
                    placeholder="+628123456789"
                  />
                </div>
              </div>

              {/* Address Information */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Address *
                </label>
                <textarea
                  required
                  value={formData.address}
                  onChange={(e) => setFormData(prev => ({ ...prev, address: e.target.value }))}
                  className="input-field"
                  rows={3}
                  placeholder="Complete address..."
                />
              </div>

              {/* Cascading Region Dropdowns */}
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    City *
                  </label>
                  <select
                    required
                    value={formData.city_id}
                    onChange={(e) => handleCityChange(e.target.value)}
                    className="input-field"
                    disabled={loadingCities}
                  >
                    <option value="">Select city...</option>
                    {Array.isArray(cities) && cities.map((city) => (
                      <option key={city.id} value={city.id}>
                        {city.name}
                      </option>
                    ))}
                  </select>
                  {loadingCities && (
                    <p className="text-xs text-gray-500 mt-1">Loading cities...</p>
                  )}
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    District *
                  </label>
                  <select
                    required
                    value={formData.district_id}
                    onChange={(e) => handleDistrictChange(e.target.value)}
                    className="input-field"
                    disabled={!formData.city_id || loadingDistricts}
                  >
                    <option value="">Select district...</option>
                    {Array.isArray(districts) && districts.map((district) => (
                      <option key={district.id} value={district.id}>
                        {district.name}
                      </option>
                    ))}
                  </select>
                  {loadingDistricts && (
                    <p className="text-xs text-gray-500 mt-1">Loading districts...</p>
                  )}
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Village *
                  </label>
                  <select
                    required
                    value={formData.village_id}
                    onChange={(e) => handleVillageChange(e.target.value)}
                    className="input-field"
                    disabled={!formData.district_id || loadingVillages}
                  >
                    <option value="">Select village...</option>
                    {Array.isArray(villages) && villages.map((village) => (
                      <option key={village.id} value={village.id}>
                        {village.name}
                      </option>
                    ))}
                  </select>
                  {loadingVillages && (
                    <p className="text-xs text-gray-500 mt-1">Loading villages...</p>
                  )}
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Postal Code *
                  </label>
                  <input
                    type="text"
                    required
                    value={formData.postal_code}
                    readOnly
                    className="input-field bg-gray-50"
                    placeholder="Auto-filled"
                  />
                </div>
              </div>

              {/* Residential Type */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Residential Type *
                </label>
                <select
                  required
                  value={formData.residential_type || 'House'}
                  onChange={(e) => setFormData(prev => ({ ...prev, residential_type: e.target.value as ResidentialType }))}
                  className="input-field"
                >
                  <option value="House">House</option>
                  <option value="Apartment">Apartment</option>
                  <option value="Office Space">Office Space</option>
                </select>
              </div>

              {/* Trial Schedule */}
              <div className="border-t border-gray-200 pt-6">
                <h3 className="text-md font-medium text-gray-900 mb-4">Trial Schedule</h3>

                {/* Show warning if no mitras available (region filter removed per feedback) */}
                {!loadingMitras && mitras.length === 0 && (
                  <div className="bg-red-50 border-l-4 border-red-400 p-4 mb-4">
                    <div className="flex">
                      <div className="flex-shrink-0">
                        <svg className="h-5 w-5 text-red-400" viewBox="0 0 20 20" fill="currentColor">
                          <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
                        </svg>
                      </div>
                      <div className="ml-3">
                        <p className="text-sm text-red-700">
                          No active mitra available. Please contact admin to add active mitras to the system.
                        </p>
                      </div>
                    </div>
                  </div>
                )}

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Trial Date *
                    </label>
                    <input
                      type="date"
                      required
                      value={formData.trial_date}
                      onChange={(e) => setFormData(prev => ({ ...prev, trial_date: e.target.value }))}
                      disabled={mitras.length === 0}
                      className="input-field disabled:bg-gray-100 disabled:cursor-not-allowed"
                    />
                    <p className="text-xs text-gray-500 mt-1">Select one date for the trial visit</p>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Assigned Mitra *
                    </label>
                    <select
                      required
                      value={formData.selected_mitra}
                      onChange={(e) => setFormData(prev => ({ ...prev, selected_mitra: e.target.value }))}
                      disabled={loadingMitras || mitras.length === 0}
                      className="input-field disabled:bg-gray-100 disabled:cursor-not-allowed"
                    >
                      <option value="">
                        {loadingMitras
                          ? 'Loading mitras...'
                          : mitras.length === 0
                            ? 'No mitra available'
                            : 'Select mitra...'}
                      </option>
                      {Array.isArray(mitras) && mitras.map((mitra) => (
                        <option key={mitra.id} value={mitra.id}>
                          {mitra.name} - {mitra.phone || 'No phone'}
                        </option>
                      ))}
                    </select>
                    {loadingMitras && (
                      <p className="text-xs text-blue-500 mt-1">Loading active mitras...</p>
                    )}
                    {!loadingMitras && mitras.length > 0 && (
                      <p className="text-xs text-green-600 mt-1">✓ {mitras.length} active mitra(s) available</p>
                    )}
                  </div>
                </div>

                {/* Additional Trial Dates (Feedback 3b) */}
                {additionalTrialDates.length > 0 && (
                  <div className="space-y-4 mt-6">
                    <div className="flex items-center justify-between">
                      <h4 className="text-sm font-medium text-gray-700">Additional Trial Dates</h4>
                      <span className="text-xs text-gray-500">{additionalTrialDates.length} additional date(s)</span>
                    </div>

                    {additionalTrialDates.map((trialDate, index) => (
                      <div key={index} className="border border-gray-200 rounded-lg p-4 bg-gray-50">
                        <div className="flex items-center justify-between mb-3">
                          <span className="text-sm font-medium text-gray-700">Trial Date #{index + 2}</span>
                          <button
                            type="button"
                            onClick={() => {
                              setAdditionalTrialDates(prev => prev.filter((_, i) => i !== index));
                            }}
                            className="text-red-600 hover:text-red-800 text-sm font-medium"
                          >
                            <Icons.x className="w-4 h-4 inline-block mr-1" />
                            Remove
                          </button>
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                          <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">
                              Date *
                            </label>
                            <input
                              type="date"
                              required
                              value={trialDate.date}
                              onChange={(e) => {
                                const updated = [...additionalTrialDates];
                                updated[index].date = e.target.value;
                                setAdditionalTrialDates(updated);
                              }}
                              className="input-field"
                            />
                          </div>

                          <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">
                              Assigned Mitra *
                            </label>
                            <select
                              required
                              value={trialDate.mitraId}
                              onChange={(e) => {
                                const updated = [...additionalTrialDates];
                                updated[index].mitraId = e.target.value;
                                setAdditionalTrialDates(updated);
                              }}
                              disabled={mitras.length === 0}
                              className="input-field disabled:bg-gray-100 disabled:cursor-not-allowed"
                            >
                              <option value="">Select Mitra...</option>
                              {Array.isArray(mitras) && mitras.map((mitra) => (
                                <option key={mitra.id} value={mitra.id}>
                                  {mitra.name} - {mitra.phone || 'No phone'}
                                </option>
                              ))}
                            </select>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}

                {/* Add Date Button */}
                <div className="mt-4">
                  <button
                    type="button"
                    onClick={() => {
                      setAdditionalTrialDates(prev => [...prev, { date: '', mitraId: '' }]);
                    }}
                    disabled={!formData.trial_date || !formData.selected_mitra}
                    className="btn-secondary disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    <Icons.plus className="w-4 h-4 mr-2" />
                    Add Another Trial Date
                  </button>
                  <p className="text-xs text-gray-500 mt-2">
                    {!formData.trial_date || !formData.selected_mitra
                      ? 'Please fill in the first trial date and mitra before adding more'
                      : 'You can add unlimited trial dates for this customer'}
                  </p>
                </div>

                <p className="text-xs text-gray-500 mt-3">
                  Total trial sessions: {1 + additionalTrialDates.length}
                </p>
              </div>

              {/* Footer Actions */}
              <div className="sticky bottom-0 bg-white border-t border-gray-200 px-6 py-4 rounded-b-xl">
                <div className="flex justify-end space-x-3">
                  <button
                    type="button"
                    onClick={handleCancelForm}
                    disabled={creating}
                    className="px-6 py-2.5 border border-gray-300 rounded-lg text-sm font-medium text-gray-700 hover:bg-gray-50 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={creating}
                    className="inline-flex items-center px-6 py-2.5 border border-transparent text-sm font-medium rounded-lg text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 disabled:opacity-50 disabled:cursor-not-allowed transition-all shadow-md hover:shadow-lg active:scale-95"
                  >
                    {creating ? (
                      <>
                        <Icons.spinner className="w-4 h-4 mr-2 animate-spin" />
                        Creating...
                      </>
                    ) : (
                      <>
                        <Icons.check className="w-4 h-4 mr-2" />
                        Create Trial
                      </>
                    )}
                  </button>
                </div>
              </div>
            </form>
          </div>
        </div>
        )}

        {/* Filters */}
        <div className="card p-6">
          <div className="flex items-center gap-2 mb-4">
            <Icons.filter className="w-5 h-5 text-gray-600" />
            <h3 className="text-lg font-semibold text-gray-900">Filter Trials</h3>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-6 gap-4">
            <div className="relative">
              <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                <Icons.search className="h-5 w-5 text-gray-400" />
              </div>
              <input
                type="text"
                placeholder="Search customers..."
                value={filters.q}
                onChange={(e) => setFilters(prev => ({ ...prev, q: e.target.value, page: 1 }))}
                className="input-field pl-10"
              />
            </div>
            <div className="relative">
              <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                <Icons.package2 className="h-5 w-5 text-gray-400" />
              </div>
              <select
                value={filters.acquisition || ''}
                onChange={(e) => setFilters(prev => ({ ...prev, acquisition: e.target.value as AcquisitionType || undefined, page: 1 }))}
                className="input-field pl-10"
              >
                <option value="">All Acquisition</option>
                <option value="HOMA">HOMA</option>
                <option value="Altrix">Altrix</option>
              </select>
            </div>
            <div className="relative">
              <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                <Icons.mapPin className="h-5 w-5 text-gray-400" />
              </div>
              <input
                type="text"
                placeholder="Filter by city..."
                value={filters.city}
                onChange={(e) => setFilters(prev => ({ ...prev, city: e.target.value, page: 1 }))}
                className="input-field pl-10"
              />
            </div>
            <div className="relative">
              <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                <Icons.home className="h-5 w-5 text-gray-400" />
              </div>
              <select
                value={filters.residentialType || ''}
                onChange={(e) => setFilters(prev => ({ ...prev, residentialType: e.target.value as ResidentialType || undefined, page: 1 }))}
                className="input-field pl-10"
              >
                <option value="">All Types</option>
                <option value="House">House</option>
                <option value="Office Space">Office Space</option>
                <option value="Apartment">Apartment</option>
              </select>
            </div>
            <div className="relative">
              <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                <Icons.checkCircle className="h-5 w-5 text-gray-400" />
              </div>
              <select
                value={filters.status || ''}
                onChange={(e) => setFilters(prev => ({ ...prev, status: e.target.value as TrialStatus || undefined, page: 1 }))}
                className="input-field pl-10"
              >
                <option value="">All Statuses</option>
                <option value="Converted">Converted</option>
                <option value="Not Converted">Not Converted</option>
                <option value="Stalling/Postpone">Stalling/Postpone</option>
                <option value="Cancelled">Cancelled</option>
              </select>
            </div>
            <div className="relative">
              <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                <Icons.user className="h-5 w-5 text-gray-400" />
              </div>
              <input
                type="text"
                placeholder="Filter by cleaner..."
                value={filters.cleaner}
                onChange={(e) => setFilters(prev => ({ ...prev, cleaner: e.target.value, page: 1 }))}
                className="input-field pl-10"
              />
            </div>
          </div>
        </div>

        {/* Trials List */}
        <div className="card">
          <div className="p-6 border-b border-gray-200">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-3">
                <h2 className="text-xl font-semibold text-gray-900">Trials</h2>
              </div>
              <div className="flex items-center space-x-3">
                <div className="text-right">
                  <span className="text-sm text-gray-500">
                    {pagination.total} total trials
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
              <p className="mt-2 text-gray-600">Loading trials...</p>
            </div>
          ) : trials.length === 0 ? (
            <div className="p-8 text-center">
              <Icons.beaker className="w-12 h-12 text-gray-400 mx-auto mb-4" />
              <h3 className="text-lg font-medium text-gray-900 mb-2">No Trials Found</h3>
              <p className="text-gray-600">
                {filters.q || filters.status || filters.cleaner
                  ? 'Try adjusting your filters to see more results.'
                  : 'Get started by creating your first trial.'}
              </p>
            </div>
          ) : (
            <>
              <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-gray-200">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Customer Name
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Acquisition
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        District
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        City
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Residential Type
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
                    {trials.map((trial) => (
                      <React.Fragment key={trial.id}>
                        <tr
                          className="hover:bg-gray-50 cursor-pointer"
                          onClick={() => {
                            router.push(`/app/trial/${trial.id}` as any);
                          }}
                        >
                          <td className="px-6 py-4 whitespace-nowrap">
                            <div className="flex items-center">
                              <div className="flex-shrink-0 h-10 w-10 bg-gradient-to-br from-purple-500 to-pink-600 rounded-full flex items-center justify-center shadow-md">
                                <span className="text-white font-semibold text-sm">
                                  {trial.customerName.charAt(0).toUpperCase()}
                                </span>
                              </div>
                              <div className="ml-4">
                                <div className="text-sm font-medium text-blue-600 hover:text-blue-900">
                                  {trial.customerName}
                                </div>
                                <div className="text-xs text-gray-500">
                                  {trial.assignedCleaners && trial.assignedCleaners.length > 0 ? trial.assignedCleaners.join(', ') : 'No cleaner assigned'}
                                </div>
                              </div>
                            </div>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap">
                            <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${acquisitionColors[trial.acquisition]}`}>
                              {trial.acquisition}
                            </span>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap">
                            <div className="text-sm text-gray-900">
                              {trial.district}
                            </div>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap">
                            <div className="text-sm text-gray-900">
                              {trial.city}
                            </div>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap">
                            <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${residentialColors[trial.residentialType]}`}>
                              {trial.residentialType}
                            </span>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap">
                            {trial.overallStatus ? (
                              <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${statusColors[trial.overallStatus]}`}>
                                {trial.overallStatus}
                              </span>
                            ) : (
                              <span className="text-sm text-gray-500">-</span>
                            )}
                            {trial.nextTrialStartDate && (
                              <div className="text-xs text-gray-500 mt-1">
                                Start: {trial.nextTrialStartDate}
                                {trial.nextTrialEndDate && ` - End: ${trial.nextTrialEndDate}`}
                              </div>
                            )}
                            {trial.ltv !== undefined && (
                              <div className="text-xs text-blue-600 mt-1">
                                LTV: {trial.ltv} months
                              </div>
                            )}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                handleDelete(trial.id);
                              }}
                              className="text-red-600 hover:text-red-900 ml-4"
                            >
                              <Icons.trash className="w-4 h-4" />
                            </button>
                          </td>
                        </tr>
                      </React.Fragment>
                    ))}
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