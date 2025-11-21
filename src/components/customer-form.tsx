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
  subscriptionPackageId: string;
  selectedDays: { day1?: string; day2?: string; day3?: string };
  ltv: number;
  firstDateSubscription: string;
  status: string;
  cleaner1: string;
  notes: string;
}

interface RegionOption {
  value: string;
  label: string;
}

interface SubscriptionPackage {
  id: string;
  subscriptionPackage: string;
  packageName: string;
  pricePerQty: string;
  priceNumeric: number;
  visitsPerWeek: number;
  description: string;
  createdAt: Date;
  updatedAt: Date;
}

interface VisitPreview {
  visitNumber: number;
  scheduledDate: string;
  dayOfWeek: string;
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
    subscriptionPackageId: '',
    selectedDays: { day1: '', day2: '', day3: '' },
    ltv: 0,
    firstDateSubscription: '',
    status: 'Active',
    cleaner1: '',
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
  
  // Visit preview state
  const [previewVisits, setPreviewVisits] = useState<VisitPreview[]>([]);
  
  // Mitra availability state
  const [availableMitras, setAvailableMitras] = useState<any[]>([]);
  const [loadingMitras, setLoadingMitras] = useState(false);
  const [mitraAvailabilityMessage, setMitraAvailabilityMessage] = useState('');
  
  // Day options
  const dayOptions = [
    { value: 'Monday', label: 'Monday' },
    { value: 'Tuesday', label: 'Tuesday' },
    { value: 'Wednesday', label: 'Wednesday' },
    { value: 'Thursday', label: 'Thursday' },
    { value: 'Friday', label: 'Friday' },
    { value: 'Saturday', label: 'Saturday' },
    { value: 'Sunday', label: 'Sunday' }
  ];

  // Available cleaners (from PRD sample data)
  const availableCleaners = ['Handi', 'Syeila', 'Imam'];

  // Load initial data
  useEffect(() => {
    fetchCities();
    fetchSubscriptionPackages();
  }, []);

  // Load districts when city changes
  useEffect(() => {
    console.log('City changed to:', formData.city);
    if (formData.city && formData.city.trim() !== '') {
      console.log('Triggering fetchDistricts for:', formData.city);
      fetchDistricts(formData.city);
      // Reset dependent fields
      setFormData(prev => ({ ...prev, district: '', village: '', postalCode: '' }));
      setVillages([]);
    } else {
      console.log('City is empty, clearing districts');
      setDistricts([]);
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

  // Check mitra availability when visit preview changes
  useEffect(() => {
    if (previewVisits.length > 0) {
      checkMitraAvailability();
    }
  }, [previewVisits]);

  const fetchCities = async () => {
    try {
      setLoadingRegions(true);
      const response = await fetch('/api/regions/cities');
      if (response.ok) {
        const data = await response.json();
        setCities(data.data.map((city: any) => ({ 
          value: typeof city === 'string' ? city : city.name || city.id, 
          label: typeof city === 'string' ? city : city.name || city.id 
        })));
      }
    } catch (error) {
      console.error('Error fetching cities:', error);
    } finally {
      setLoadingRegions(false);
    }
  };

  const fetchDistricts = async (city: string) => {
    try {
      console.log('Fetching districts for city:', city);
      setLoadingRegions(true);
      const response = await fetch(`/api/regions/districts?city_id=${encodeURIComponent(city)}`);
      
      if (response.ok) {
        const data = await response.json();
        console.log('Districts API response:', data);
        
        if (data.success && data.data) {
          const mappedDistricts = data.data.map((district: any) => ({ 
            value: typeof district === 'string' ? district : district.name || district.id, 
            label: typeof district === 'string' ? district : district.name || district.id 
          }));
          console.log('Mapped districts:', mappedDistricts);
          setDistricts(mappedDistricts);
        } else {
          console.error('Invalid districts response structure:', data);
          setDistricts([]);
        }
      } else {
        console.error('Districts API failed:', response.status, response.statusText);
        setDistricts([]);
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
      const response = await fetch(`/api/regions/villages?district_id=${encodeURIComponent(district)}`);
      if (response.ok) {
        const data = await response.json();
        if (data.success && data.data) {
          setVillages(data.data.map((item: any) => ({
            value: typeof item === 'string' ? item : (item.village || item.name || item.id),
            label: typeof item === 'string' ? item : (item.village || item.name || item.id),
            postalCode: item.postal_code || item.postalCode || ''
          })));
        } else {
          setVillages([]);
        }
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
      const response = await fetch('/api/packages');
      if (response.ok) {
        const data = await response.json();
        // Handle both array response and object with data property
        const packagesArray = Array.isArray(data) ? data : (data.success ? data.data : []);
        setSubscriptionPackages(packagesArray);
      } else {
        console.error('Failed to fetch subscription packages:', response.status, response.statusText);
      }
    } catch (error) {
      console.error('Error fetching subscription packages:', error);
    } finally {
      setLoadingPackages(false);
    }
  };

  // Handle city change
  const handleCityChange = (city: string) => {
    console.log('City selection changed to:', city);
    setFormData(prev => ({ ...prev, city }));
  };

  // Handle district change  
  const handleDistrictChange = (district: string) => {
    console.log('District selection changed to:', district);
    setFormData(prev => ({ ...prev, district }));
  };

  const handleVillageChange = (village: string) => {
    const selectedVillage = villages.find(v => v.value === village);
    setFormData(prev => ({
      ...prev,
      village,
      postalCode: (selectedVillage as any)?.postalCode || ''
    }));
  };

  // Generate visit preview based on selected days, date, and quantity
  const generateVisitPreview = (startDate: string, selectedDays: { day1?: string; day2?: string; day3?: string }) => {
    if (!startDate || (!selectedDays.day1 && !selectedDays.day2 && !selectedDays.day3) || !formData.qtyPackage) {
      setPreviewVisits([]);
      return;
    }

    const visits: VisitPreview[] = [];
    const start = new Date(startDate);
    const selectedDaysList = [selectedDays.day1, selectedDays.day2, selectedDays.day3].filter(Boolean);
    
    // Calculate total weeks based on quantity (1 qty = 1 month = ~4 weeks)
    const totalWeeks = formData.qtyPackage * 4;
    
    // Generate visits for the entire subscription period
    let visitNumber = 1;
    for (let week = 0; week < totalWeeks; week++) {
      for (const dayName of selectedDaysList) {
        if (dayName) {
          const dayIndex = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'].indexOf(dayName);
          const visitDate = new Date(start);
          visitDate.setDate(start.getDate() + (week * 7) + ((dayIndex - start.getDay() + 7) % 7));
          
          // Only include future dates
          if (visitDate >= start) {
            visits.push({
              visitNumber,
              scheduledDate: visitDate.toLocaleDateString('id-ID'),
              dayOfWeek: dayName
            });
            visitNumber++;
          }
        }
      }
    }
    
    setPreviewVisits(visits); // Show all visits for the subscription period
  };

  // Handle package selection
  const handlePackageChange = (packageId: string) => {
    const selectedPackage = subscriptionPackages.find(pkg => pkg.id === packageId);
    if (selectedPackage) {
      setFormData(prev => ({
        ...prev,
        subscriptionPackageId: packageId,
        subscriptionPackage: selectedPackage.packageName,
        selectedDays: { day1: '', day2: '', day3: '' } // Reset days when package changes
      }));
      setPreviewVisits([]); // Clear preview
    }
  };

  // Handle day selection
  const handleDayChange = (dayKey: 'day1' | 'day2' | 'day3', value: string) => {
    const newSelectedDays = { ...formData.selectedDays, [dayKey]: value };
    setFormData(prev => ({ ...prev, selectedDays: newSelectedDays }));
    
    // Regenerate preview if we have a start date
    if (formData.firstDateSubscription) {
      generateVisitPreview(formData.firstDateSubscription, newSelectedDays);
    }
  };

  // Calculate LTV using same formula as trial page
  const calculateLTV = (startDate: string, quantity: number): number => {
    if (!startDate || !quantity) return 0;
    
    try {
      const start = new Date(startDate);
      const end = new Date(start);
      
      // Calculate end date based on quantity (1 qty = 1 month)
      end.setMonth(start.getMonth() + quantity);
      
      // Add 1 day for inclusive calculation (like Excel DATEDIF)
      end.setDate(end.getDate() + 1);
      
      const yearDiff = end.getFullYear() - start.getFullYear();
      const monthDiff = end.getMonth() - start.getMonth();
      const dayDiff = end.getDate() - start.getDate();
      
      let months = yearDiff * 12 + monthDiff;
      
      // If day difference is negative, subtract a month
      if (dayDiff < 0) {
        months -= 1;
      }
      
      return Math.max(0, months);
    } catch (error) {
      console.error('Error calculating LTV:', error);
      return 0;
    }
  };

  // Handle date change
  const handleDateChange = (date: string) => {
    const newLTV = calculateLTV(date, formData.qtyPackage || 1);
    setFormData(prev => ({ 
      ...prev, 
      firstDateSubscription: date,
      ltv: newLTV
    }));
    
    // Regenerate preview if we have selected days
    if (formData.selectedDays.day1 || formData.selectedDays.day2 || formData.selectedDays.day3) {
      generateVisitPreview(date, formData.selectedDays);
    }
  };

  // Handle quantity change
  const handleQuantityChange = (quantity: number) => {
    const newLTV = calculateLTV(formData.firstDateSubscription || '', quantity);
    setFormData(prev => ({ 
      ...prev, 
      qtyPackage: quantity,
      ltv: newLTV
    }));
    
    // Regenerate preview if we have selected days and date
    if ((formData.selectedDays.day1 || formData.selectedDays.day2 || formData.selectedDays.day3) && formData.firstDateSubscription) {
      generateVisitPreview(formData.firstDateSubscription, formData.selectedDays);
    }
  };

  // Check mitra availability for scheduled visits
  const checkMitraAvailability = async () => {
    if (previewVisits.length === 0 || !formData.firstDateSubscription || !formData.selectedDays) {
      setAvailableMitras([]);
      setMitraAvailabilityMessage('');
      return;
    }

    try {
      setLoadingMitras(true);
      setMitraAvailabilityMessage('Checking mitra availability...');
      
      // Get the selected days pattern
      const selectedDaysList = [formData.selectedDays.day1, formData.selectedDays.day2, formData.selectedDays.day3]
        .filter(Boolean) as string[];

      if (selectedDaysList.length === 0) {
        setAvailableMitras([]);
        setMitraAvailabilityMessage('No days selected');
        return;
      }
      
      // Calculate end date based on quantity (months)
      const startDate = new Date(formData.firstDateSubscription);
      const endDate = new Date(startDate);
      endDate.setMonth(endDate.getMonth() + formData.qtyPackage);
      endDate.setDate(endDate.getDate() - 1); // Last day of subscription period

      // Call the correct API endpoint with proper format
      const response = await fetch('/api/mitras/check-availability', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          dayPattern: selectedDaysList,
          startDate: startDate.toISOString().split('T')[0], // 'yyyy-mm-dd'
          endDate: endDate.toISOString().split('T')[0], // 'yyyy-mm-dd'
          city: formData.city, // Add city for coverage area filtering
          district: formData.district, // Add district for coverage area filtering
        }),
      });

      if (!response.ok) {
        throw new Error(`API returned ${response.status}: ${response.statusText}`);
      }

      const data = await response.json();
      
      if (!data.success) {
        throw new Error(data.message || 'API returned unsuccessful response');
      }

      const availableMitras = data.data?.availableMitras || [];
      const unavailableMitras = data.data?.unavailableMitras || [];
      const totalMitrasAfterCoverageFilter = data.data?.totalMitrasAfterCoverageFilter || 0;
      const coverageFilterApplied = data.data?.coverageFilterApplied || false;

      setAvailableMitras(availableMitras.map((result: any) => ({
        id: result.mitraId,
        name: result.mitraName
      })));

      if (availableMitras.length === 0) {
        // Check if it's a coverage issue (no mitras in the area)
        if (coverageFilterApplied && totalMitrasAfterCoverageFilter === 0) {
          setMitraAvailabilityMessage(
            `⚠️ No mitras service the area: ${formData.city} - ${formData.district}. ` +
            `Please contact admin to assign mitras to this coverage area, or select a different location.`
          );
        } else {
          // It's a capacity issue (mitras exist but are fully booked)
          const reasons = unavailableMitras.length > 0
            ? `Issues: ${unavailableMitras.map((m: any) => `${m.mitraName} (${m.reason})`).join(', ')}`
            : '';
          setMitraAvailabilityMessage(
            `No mitras available for all ${previewVisits.length} scheduled visits over ${formData.qtyPackage} month(s). ` +
            `${reasons} Please select different days or date.`
          );
        }
      } else {
        setMitraAvailabilityMessage(`${availableMitras.length} mitra(s) available for all ${previewVisits.length} scheduled visits over ${formData.qtyPackage} month(s).`);
      }
      
    } catch (error) {
      console.error('Error checking mitra availability:', error);
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      setMitraAvailabilityMessage(`Error checking mitra availability: ${errorMessage}. Please try again.`);
      setAvailableMitras([]);
    } finally {
      setLoadingMitras(false);
    }
  };

  // Get required visits per week for selected package
  const getSelectedPackage = () => {
    return subscriptionPackages.find(pkg => pkg.id === formData.subscriptionPackageId);
  };

  const selectedPackage = getSelectedPackage();
  const requiredVisitsPerWeek = selectedPackage?.visitsPerWeek || 0;
  const selectedDaysCount = [formData.selectedDays.day1, formData.selectedDays.day2, formData.selectedDays.day3]
    .filter(Boolean).length;

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

    if (!formData.subscriptionPackageId) {
      alert('Please select a subscription package');
      return;
    }

    if (selectedDaysCount !== requiredVisitsPerWeek) {
      alert(`Please select exactly ${requiredVisitsPerWeek} day(s) for this package`);
      return;
    }

    if (!formData.firstDateSubscription) {
      alert('Please select first subscription date');
      return;
    }

    if (!formData.cleaner1) {
      alert('Please select a primary mitra');
      return;
    }

    try {
      setLoading(true);
      
      // Calculate monthly fee based on selected package and quantity
      const selectedPackage = subscriptionPackages.find(pkg => pkg.id === formData.subscriptionPackageId);
      const monthlyFee = selectedPackage ? selectedPackage.priceNumeric * formData.qtyPackage : 0;
      
      // Convert date format untuk API
      const requestData = {
        ...formData,
        firstDateSubscription: convertFromDateInputFormat(formData.firstDateSubscription),
        subscriptionStart: convertFromDateInputFormat(formData.firstDateSubscription),
        subscriptionPackageId: formData.subscriptionPackageId,
        monthlyFee: monthlyFee,
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
      subscriptionPackageId: '',
      selectedDays: { day1: '', day2: '', day3: '' },
      ltv: 0,
      firstDateSubscription: '',
      status: 'Active',
      cleaner1: '',
      notes: '',
    });
    setDistricts([]);
    setVillages([]);
    setPreviewVisits([]);
    setAvailableMitras([]);
    setMitraAvailabilityMessage('');
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
                  Package Quantity * <span className="text-xs text-gray-500">(1 qty = 1 month)</span>
                </label>
                <input
                  type="number"
                  min="1"
                  max="12"
                  required
                  value={formData.qtyPackage}
                  onChange={(e) => handleQuantityChange(parseInt(e.target.value) || 1)}
                  className="input-field"
                  placeholder="1"
                />
                <p className="text-xs text-gray-500 mt-1">
                  Duration: {formData.qtyPackage} month(s) = {formData.qtyPackage * 4} weeks
                </p>
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
                  onChange={(e) => handleCityChange(e.target.value)}
                  className="input-field"
                  required
                  disabled={loadingRegions || cities.length === 0}
                >
                  <option value="">Select city...</option>
                  {cities.map((city, index) => (
                    <option key={`city-${city.value}-${index}`} value={city.value}>
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
                  onChange={(e) => handleDistrictChange(e.target.value)}
                  className="input-field"
                  required
                  disabled={loadingRegions || !formData.city || districts.length === 0}
                >
                  <option value="">Select district...</option>
                  {districts.map((district, index) => (
                    <option key={`district-${district.value}-${index}`} value={district.value}>
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
                  {villages.map((village, index) => (
                    <option key={`${village.value}-${index}`} value={village.value}>
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
          <div className="space-y-6">
            <h3 className="text-lg font-medium text-gray-900 border-b border-gray-200 pb-2">
              Subscription Details
            </h3>
            
            {/* Step 1: Select Subscription Package */}
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  1. Select Subscription Package *
                </label>
                <select
                  value={formData.subscriptionPackageId}
                  onChange={(e) => handlePackageChange(e.target.value)}
                  className="input-field"
                  required
                  disabled={loadingPackages || subscriptionPackages.length === 0}
                >
                  <option value="">Select subscription package...</option>
                  {subscriptionPackages
                    .filter(pkg => !pkg.packageName.toLowerCase().includes('trial'))
                    .map((pkg, index) => (
                      <option key={`pkg-${pkg.id}-${index}`} value={pkg.id}>
                        {String(pkg.packageName)} - {String(pkg.visitsPerWeek)}x/week - Rp {parseInt(String(pkg.priceNumeric) || '0').toLocaleString()}
                      </option>
                    ))}
                </select>
                {loadingPackages && <p className="text-xs text-gray-500 mt-1">Loading packages...</p>}
              </div>
            </div>

            {/* Step 2: Select Days (only show if package is selected) */}
            {formData.subscriptionPackageId && (
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    2. Select Visit Days ({selectedDaysCount}/{requiredVisitsPerWeek} selected) *
                  </label>
                  <div className="grid grid-cols-3 gap-4">
                    {[1, 2, 3].slice(0, requiredVisitsPerWeek).map((dayNum) => {
                      const dayKey = `day${dayNum}` as 'day1' | 'day2' | 'day3';
                      const currentValue = formData.selectedDays[dayKey] || '';
                      const isDisabled = dayNum > requiredVisitsPerWeek;
                      
                      return (
                        <div key={dayKey}>
                          <label className="block text-xs font-medium text-gray-600 mb-1">
                            Day {dayNum} {dayNum <= requiredVisitsPerWeek ? '*' : ''}
                          </label>
                          <select
                            value={currentValue}
                            onChange={(e) => handleDayChange(dayKey, e.target.value)}
                            className="input-field"
                            required={dayNum <= requiredVisitsPerWeek}
                            disabled={isDisabled}
                          >
                            <option value="">Select day...</option>
                            {dayOptions
                              .filter(day => 
                                day.value === currentValue || 
                                !Object.values(formData.selectedDays).includes(day.value)
                              )
                              .map((day) => (
                                <option key={day.value} value={day.value}>
                                  {day.label}
                                </option>
                              ))}
                          </select>
                        </div>
                      );
                    })}
                  </div>
                  {selectedDaysCount !== requiredVisitsPerWeek && (
                    <p className="text-xs text-red-500 mt-1">
                      Please select exactly {requiredVisitsPerWeek} day(s) for this package
                    </p>
                  )}
                </div>
              </div>
            )}

            {/* Step 3: Select Start Date */}
            {formData.subscriptionPackageId && selectedDaysCount === requiredVisitsPerWeek && (
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    3. First Subscription Date *
                  </label>
                  <input
                    type="date"
                    required
                    value={formData.firstDateSubscription}
                    onChange={(e) => handleDateChange(e.target.value)}
                    className="input-field"
                    min={new Date().toISOString().split('T')[0]}
                  />
                </div>
              </div>
            )}

            {/* Step 4: Visit Preview */}
            {previewVisits.length > 0 && (
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    4. Visit Schedule Preview ({formData.qtyPackage} month{formData.qtyPackage > 1 ? 's' : ''} - {previewVisits.length} total visits)
                  </label>
                  <div className="bg-purple-50 border border-purple-200 rounded-lg p-4">
                    <div className="flex justify-between items-center mb-3 text-sm">
                      <span className="font-medium text-purple-900">
                        Subscription Duration: {formData.qtyPackage} month(s) = {formData.qtyPackage * 4} weeks
                      </span>
                      <span className="text-purple-700">
                        Total Visits: {previewVisits.length}
                      </span>
                    </div>
                    <div className="max-h-48 overflow-y-auto">
                      <div className="grid grid-cols-1 gap-2">
                        {previewVisits.map((visit) => (
                          <div key={visit.visitNumber} className="flex justify-between items-center text-sm">
                            <span className="font-medium text-purple-800">Visit #{visit.visitNumber}</span>
                            <span className="text-purple-600">{visit.dayOfWeek}</span>
                            <span className="text-purple-700">{visit.scheduledDate}</span>
                          </div>
                        ))}
                      </div>
                    </div>
                    {previewVisits.length > 10 && (
                      <div className="mt-2 text-xs text-purple-600 text-center">
                        Showing all {previewVisits.length} visits for {formData.qtyPackage} month(s)
                      </div>
                    )}
                  </div>
                </div>
              </div>
            )}

            {/* Additional subscription details */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  LTV (Lifetime Value)
                </label>
                <div className="mt-1">
                  <span className="inline-flex items-center px-3 py-2 rounded-md text-sm font-medium bg-green-100 text-green-800 border border-green-200">
                    {formData.ltv} months
                  </span>
                  <p className="text-xs text-gray-500 mt-1">
                    Automatically calculated based on subscription date and quantity
                  </p>
                </div>
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
              Mitra (Cleaner) Assignment
            </h3>
            
            {/* Mitra Availability Status */}
            {previewVisits.length > 0 && (
              <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                <div className="flex items-start space-x-3">
                  <div className="flex-shrink-0">
                    {loadingMitras ? (
                      <Icons.spinner className="w-5 h-5 text-blue-600 animate-spin" />
                    ) : availableMitras.length > 0 ? (
                      <div className="w-5 h-5 bg-green-500 rounded-full flex items-center justify-center">
                        <svg className="w-3 h-3 text-white" fill="currentColor" viewBox="0 0 20 20">
                          <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                        </svg>
                      </div>
                    ) : (
                      <div className="w-5 h-5 bg-red-500 rounded-full flex items-center justify-center">
                        <svg className="w-3 h-3 text-white" fill="currentColor" viewBox="0 0 20 20">
                          <path fillRule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clipRule="evenodd" />
                        </svg>
                      </div>
                    )}
                  </div>
                  <div className="flex-1">
                    <p className="text-sm font-medium text-blue-900">
                      Mitra Availability Status
                    </p>
                    <p className="text-sm text-blue-700 mt-1">
                      {mitraAvailabilityMessage}
                    </p>
                  </div>
                </div>
              </div>
            )}
            
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Assigned Mitra *
                </label>
                <select
                  value={formData.cleaner1}
                  onChange={(e) => setFormData(prev => ({ ...prev, cleaner1: e.target.value }))}
                  className="input-field"
                  required
                  disabled={loadingMitras || availableMitras.length === 0}
                >
                  <option value="">
                    {loadingMitras ? 'Checking availability...' :
                     availableMitras.length === 0 ? 'No mitras available' :
                     'Select mitra...'}
                  </option>
                  {availableMitras.map((mitra, index) => (
                    <option key={`mitra1-${mitra.id}-${index}`} value={mitra.name}>
                      {mitra.name}
                    </option>
                  ))}
                </select>
                {!loadingMitras && availableMitras.length === 0 && previewVisits.length > 0 && (
                  <p className="text-xs text-red-500 mt-1">
                    No mitras available for selected schedule. Please choose different days or date.
                  </p>
                )}
                {formData.cleaner1 && (
                  <p className="text-xs text-green-600 mt-1">
                    ✓ Mitra selected: {formData.cleaner1}
                  </p>
                )}
              </div>

              {/* Mitra Assignment Summary */}
              {formData.cleaner1 && (
                <div className="bg-green-50 border border-green-200 rounded-lg p-3">
                  <h4 className="text-sm font-medium text-green-900 mb-2">Mitra Assignment</h4>
                  <div className="space-y-1 text-sm">
                    <div className="flex items-center space-x-2">
                      <span className="w-2 h-2 bg-green-500 rounded-full"></span>
                      <span className="text-green-800">
                        <strong>Assigned Mitra:</strong> {formData.cleaner1}
                      </span>
                    </div>
                  </div>
                </div>
              )}
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