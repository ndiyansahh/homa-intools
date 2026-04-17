'use client';

import { useState, useEffect, useRef } from 'react';
import { SessionData } from '@/types/auth';
import { Icons } from './icons';
import { useToast } from '@/lib/toast';

interface RenewalPrefill {
  customerName: string;
  contact: string;
  address: string;
  city: string;
  district: string;
  village: string;
  postalCode: string;
  subscriptionPackageId: string;
  selectedDays: string[];
  startDate: string; // YYYY-MM-DD
  mitraId: string;
  mitraName: string;
  ltv: number;
}

interface CustomerFormProps {
  session: SessionData;
  onClose: () => void;
  onSuccess: () => void;
  mode?: 'create' | 'renew';
  renewalCustomerId?: string;
  renewalPrefill?: RenewalPrefill;
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
  selectedDays: string[]; // Array of day names (e.g., ['Monday', 'Wednesday', 'Friday'])
  ltv: number;
  firstDateSubscription: string;
  status: string;
  cleaner1: string;
  notes: string;
  promoCode?: string;
  promoDiscount?: string;
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

export default function CustomerForm({ session, onClose, onSuccess, mode = 'create', renewalCustomerId, renewalPrefill }: CustomerFormProps) {
  const { toast } = useToast();
  const [loading, setLoading] = useState(false);
  const isMounted = useRef(false);
  const [formData, setFormData] = useState<CreateCustomerRequest>(() => {
    if (mode === 'renew' && renewalPrefill) {
      return {
        customerName: renewalPrefill.customerName,
        acquisition: 'HOMA',
        contact: renewalPrefill.contact,
        address: renewalPrefill.address,
        district: renewalPrefill.district,
        city: renewalPrefill.city,
        village: renewalPrefill.village,
        postalCode: renewalPrefill.postalCode,
        residentialType: 'House',
        qtyPackage: 1,
        subscriptionPackage: '',
        subscriptionPackageId: renewalPrefill.subscriptionPackageId,
        selectedDays: renewalPrefill.selectedDays,
        ltv: renewalPrefill.ltv,
        firstDateSubscription: renewalPrefill.startDate,
        status: 'Active',
        cleaner1: renewalPrefill.mitraName,
        notes: '',
        promoCode: '',
        promoDiscount: '',
      };
    }
    return {
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
      selectedDays: [],
      ltv: 0,
      firstDateSubscription: '',
      status: 'Active',
      cleaner1: '',
      notes: '',
      promoCode: '',
      promoDiscount: '',
    };
  });

  // Region state
  const [cities, setCities] = useState<RegionOption[]>([]);
  const [districts, setDistricts] = useState<RegionOption[]>([]);
  const [villages, setVillages] = useState<RegionOption[]>([]);
  const [loadingRegions, setLoadingRegions] = useState(false);
  const [cityFetchFailed, setCityFetchFailed] = useState(false);
  const [districtFetchFailed, setDistrictFetchFailed] = useState(false);
  const [villageFetchFailed, setVillageFetchFailed] = useState(false);

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
    fetchCities(mode === 'renew' ? renewalPrefill?.city : undefined);
    fetchSubscriptionPackages();
  }, []);

  // Load districts + villages reactively when city/district change
  // isMounted guards against firing on initial render (before prefill is applied)
  useEffect(() => {
    if (!isMounted.current) return;
    if (formData.city && formData.city.trim() !== '') {
      fetchDistricts(formData.city);
      if (!formData.district) {
        setFormData(prev => ({ ...prev, district: '', village: '', postalCode: '' }));
        setVillages([]);
        setDistrictFetchFailed(false);
        setVillageFetchFailed(false);
      }
    } else {
      setDistricts([]);
      setVillages([]);
      setDistrictFetchFailed(false);
      setVillageFetchFailed(false);
    }
  }, [formData.city]);

  useEffect(() => {
    if (!isMounted.current) return;
    if (formData.city && formData.district) {
      fetchVillages(formData.city, formData.district);
      if (!formData.village) {
        setFormData(prev => ({ ...prev, village: '', postalCode: '' }));
        setVillageFetchFailed(false);
      }
    }
  }, [formData.district]);

  // After mount: set isMounted so city/district effects fire on user changes
  // Also pre-load districts & villages for renewal prefill (runs once after mount)
  useEffect(() => {
    isMounted.current = true;
    if (mode === 'renew' && renewalPrefill?.city) {
      fetchDistricts(renewalPrefill.city, renewalPrefill.district).then(() => {
        if (renewalPrefill.district) {
          fetchVillages(renewalPrefill.city!, renewalPrefill.district, renewalPrefill.village);
        }
      });
    }
  }, []);

  // Check mitra availability when visit preview changes
  useEffect(() => {
    if (previewVisits.length > 0) {
      checkMitraAvailability();
    }
  }, [previewVisits]);

  const fetchCities = async (prefillCity?: string) => {
    try {
      setLoadingRegions(true);
      setCityFetchFailed(false);
      const response = await fetch('/api/regions/cities');
      if (response.ok) {
        const data = await response.json();
        const mapped = data.data.map((city: any) => ({
          value: typeof city === 'string' ? city : city.name || city.id,
          label: typeof city === 'string' ? city : city.name || city.id
        }));
        setCities(mapped);
        if (mapped.length === 0) setCityFetchFailed(true);
        // In renewal mode, find the matching city option (case-insensitive) and set it
        if (prefillCity) {
          const match = mapped.find((c: { value: string }) =>
            c.value.toLowerCase() === prefillCity.toLowerCase()
          );
          if (match) {
            setFormData(prev => ({ ...prev, city: match.value }));
          }
        }
      } else {
        setCityFetchFailed(true);
      }
    } catch (error) {
      console.error('Error fetching cities:', error);
      setCityFetchFailed(true);
    } finally {
      setLoadingRegions(false);
    }
  };

  const fetchDistricts = async (city: string, prefillDistrict?: string) => {
    try {
      setLoadingRegions(true);
      setDistrictFetchFailed(false);
      const response = await fetch(`/api/regions/districts?city_id=${encodeURIComponent(city)}`);
      if (response.ok) {
        const data = await response.json();
        if (data.success && data.data && data.data.length > 0) {
          const mappedDistricts = data.data.map((district: any) => ({
            value: typeof district === 'string' ? district : district.name || district.id,
            label: typeof district === 'string' ? district : district.name || district.id
          }));
          setDistricts(mappedDistricts);
          // Match prefill district case-insensitively
          if (prefillDistrict) {
            const match = mappedDistricts.find((d: { value: string }) =>
              d.value.toLowerCase() === prefillDistrict.toLowerCase()
            );
            if (match) {
              setFormData(prev => ({ ...prev, district: match.value }));
            }
          }
        } else {
          setDistricts([]);
          setDistrictFetchFailed(true);
        }
      } else {
        setDistricts([]);
        setDistrictFetchFailed(true);
      }
    } catch (error) {
      console.error('Error fetching districts:', error);
      setDistricts([]);
      setDistrictFetchFailed(true);
    } finally {
      setLoadingRegions(false);
    }
  };

  const fetchVillages = async (city: string, district: string, prefillVillage?: string) => {
    try {
      setLoadingRegions(true);
      setVillageFetchFailed(false);
      const response = await fetch(`/api/regions/villages?district_id=${encodeURIComponent(district)}`);
      if (response.ok) {
        const data = await response.json();
        if (data.success && data.data && data.data.length > 0) {
          const mappedVillages = data.data.map((item: any) => ({
            value: typeof item === 'string' ? item : (item.village || item.name || item.id),
            label: typeof item === 'string' ? item : (item.village || item.name || item.id),
            postalCode: item.postal_code || item.postalCode || ''
          }));
          setVillages(mappedVillages);
          // Match prefill village case-insensitively
          if (prefillVillage) {
            const match = mappedVillages.find((v: { value: string }) =>
              v.value.toLowerCase() === prefillVillage.toLowerCase()
            );
            if (match) {
              setFormData(prev => ({ ...prev, village: match.value, postalCode: match.postalCode || prev.postalCode }));
            }
          }
        } else {
          setVillages([]);
          setVillageFetchFailed(true);
        }
      } else {
        setVillageFetchFailed(true);
      }
    } catch (error) {
      console.error('Error fetching villages:', error);
      setVillages([]);
      setVillageFetchFailed(true);
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
  // MUST match API logic at src/app/api/customers/route.ts:323-344
  const generateVisitPreview = (startDate: string, selectedDays: string[]) => {
    if (!startDate || selectedDays.length === 0 || !formData.qtyPackage) {
      setPreviewVisits([]);
      return;
    }

    const visits: VisitPreview[] = [];
    const start = new Date(startDate);

    // Calculate end date: startDate + qtyPackage months (calendar months, not 4-week periods)
    const end = new Date(start);
    end.setMonth(end.getMonth() + formData.qtyPackage);
    // Subtract 1 day to make it inclusive (same as API logic)
    end.setDate(end.getDate() - 1);

    // selectedDays is already an array of day names
    const chosenDays = selectedDays.filter(Boolean);

    // Iterate day-by-day from start to end (matching API logic exactly)
    const currentDate = new Date(start);
    let visitNumber = 1;

    while (currentDate <= end) {
      const dayName = currentDate.toLocaleDateString('en-US', { weekday: 'long' });
      if (chosenDays.includes(dayName)) {
        visits.push({
          visitNumber,
          scheduledDate: currentDate.toLocaleDateString('id-ID'),
          dayOfWeek: dayName
        });
        visitNumber++;
      }
      currentDate.setDate(currentDate.getDate() + 1);
    }

    setPreviewVisits(visits);
  };

  // Handle package selection
  const handlePackageChange = (packageId: string) => {
    const selectedPackage = subscriptionPackages.find(pkg => pkg.id === packageId);
    if (selectedPackage) {
      setFormData(prev => ({
        ...prev,
        subscriptionPackageId: packageId,
        subscriptionPackage: selectedPackage.packageName,
        selectedDays: [] // Reset days when package changes
      }));
      setPreviewVisits([]); // Clear preview
    }
  };

  // Handle day selection
  const handleDayChange = (index: number, value: string) => {
    const newSelectedDays = [...formData.selectedDays];
    if (value) {
      newSelectedDays[index] = value;
    } else {
      newSelectedDays.splice(index, 1);
    }
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
    if (formData.selectedDays.length > 0) {
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
    if (formData.selectedDays.length > 0 && formData.firstDateSubscription) {
      generateVisitPreview(formData.firstDateSubscription, formData.selectedDays);
    }
  };

  // Check mitra availability for scheduled visits
  const checkMitraAvailability = async () => {
    if (previewVisits.length === 0 || !formData.firstDateSubscription || formData.selectedDays.length === 0) {
      setAvailableMitras([]);
      setMitraAvailabilityMessage('');
      return;
    }

    try {
      setLoadingMitras(true);
      setMitraAvailabilityMessage('Checking mitra availability...');

      // Get the selected days pattern
      const selectedDaysList = formData.selectedDays.filter(Boolean);

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
          // Region filter disabled per client request (Feb 1, 2026)
          // city: formData.city, 
          // district: formData.district,
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
        // Check if it's a coverage issue (no mitras in the area) - only if region filter is enabled
        if (coverageFilterApplied && totalMitrasAfterCoverageFilter === 0) {
          setMitraAvailabilityMessage(
            `⚠️ No active mitras available that service this area. ` +
            `Please contact admin to add active mitras or adjust coverage settings.`
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
  const selectedDaysCount = formData.selectedDays.length;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    // --- RENEWAL MODE ---
    if (mode === 'renew' && renewalCustomerId) {
      if (!formData.subscriptionPackageId) { toast('warning', 'Please select a subscription package'); return; }
      if (selectedDaysCount !== requiredVisitsPerWeek) { toast('info', `Please select exactly ${requiredVisitsPerWeek} day(s) for this package`); return; }
      if (!formData.firstDateSubscription) { toast('warning', 'Please select start date'); return; }
      if (!formData.cleaner1) { toast('warning', 'Please select a mitra'); return; }

      try {
        setLoading(true);
        const selectedMitra = availableMitras.find(m => m.name === formData.cleaner1);
        const body = {
          newStartDate: formData.firstDateSubscription,
          packageId: formData.subscriptionPackageId,
          mitraId: selectedMitra?.id || renewalPrefill?.mitraId || '',
          qtyPackage: formData.qtyPackage,
          dayPattern: {
            day1: formData.selectedDays[0] || null,
            day2: formData.selectedDays[1] || null,
            day3: formData.selectedDays[2] || null,
          },
          address: formData.address,
          city: formData.city,
          district: formData.district,
          village: formData.village,
          postalCode: formData.postalCode,
        };
        const res = await fetch(`/api/customers/${renewalCustomerId}/renew`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(body),
        });
        if (res.ok) {
          toast('success', 'Subscription renewed successfully!');
          onSuccess();
          onClose();
        } else {
          const err = await res.json();
          toast('warning', err.message || 'Failed to renew subscription');
        }
      } catch (err) {
        toast('warning', 'Failed to renew subscription. Please try again.');
      } finally {
        setLoading(false);
      }
      return;
    }

    // --- CREATE MODE ---
    if (!formData.customerName.trim()) {
      toast('warning', 'Please enter customer name');
      return;
    }

    if (!formData.contact.trim()) {
      toast('warning', 'Please enter contact information');
      return;
    }

    if (!formData.city || !formData.district) {
      toast('warning', 'Please select city and district');
      return;
    }

    if (!formData.subscriptionPackageId) {
      toast('warning', 'Please select a subscription package');
      return;
    }

    if (selectedDaysCount !== requiredVisitsPerWeek) {
      toast('info', `Please select exactly ${requiredVisitsPerWeek} day(s) for this package`);
      return;
    }

    if (!formData.firstDateSubscription) {
      toast('warning', 'Please select first subscription date');
      return;
    }

    if (!formData.cleaner1) {
      toast('warning', 'Please select a primary mitra');
      return;
    }

    try {
      setLoading(true);

      // Calculate monthly fee based on selected package and quantity
      const selectedPackage = subscriptionPackages.find(pkg => pkg.id === formData.subscriptionPackageId);
      const monthlyFee = selectedPackage ? selectedPackage.priceNumeric * formData.qtyPackage : 0;

      // Calculate subscription end date based on qtyPackage months
      const startDate = new Date(formData.firstDateSubscription);
      const endDate = new Date(startDate);
      endDate.setMonth(endDate.getMonth() + formData.qtyPackage);
      endDate.setDate(endDate.getDate() - 1); // Make it inclusive

      // Convert date format untuk API
      const requestData = {
        ...formData,
        firstDateSubscription: convertFromDateInputFormat(formData.firstDateSubscription),
        subscriptionStart: convertFromDateInputFormat(formData.firstDateSubscription),
        subscriptionEnd: convertFromDateInputFormat(endDate.toISOString().split('T')[0]),
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
        toast('success', 'Customer created successfully!');
        onSuccess();
        onClose();
      } else {
        const error = await response.json();
        toast('info', `Failed to create customer: ${error.message}`);
      }
    } catch (error) {
      console.error('Error creating customer:', error);
      toast('warning', 'Failed to create customer. Please try again.');
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
      selectedDays: [],
      ltv: 0,
      firstDateSubscription: '',
      status: 'Active',
      cleaner1: '',
      notes: '',
      promoCode: '',
      promoDiscount: '',
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
            <h2 className="text-xl font-semibold text-gray-900">
              {mode === 'renew' ? `Renew Subscription — ${renewalPrefill?.customerName}` : 'Add New Customer'}
            </h2>
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
                  onChange={(e) => { e.currentTarget.setCustomValidity(''); setFormData(prev => ({ ...prev, customerName: e.target.value })) }}
                  onInvalid={(e) => e.currentTarget.setCustomValidity('Customer Name is required')}
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
                  onChange={(e) => { e.currentTarget.setCustomValidity(''); setFormData(prev => ({ ...prev, contact: e.target.value })) }}
                  onInvalid={(e) => e.currentTarget.setCustomValidity('Contact is required')}
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
                  Duration: {formData.qtyPackage} calendar month(s)
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
                {cityFetchFailed ? (
                  <input
                    type="text"
                    value={formData.city}
                    onChange={(e) => handleCityChange(e.target.value)}
                    className="input-field"
                    required
                    placeholder="Enter city manually"
                  />
                ) : (
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
                )}
                {loadingRegions && <p className="text-xs text-gray-500 mt-1">Loading cities...</p>}
                {cityFetchFailed && <p className="text-xs text-yellow-600 mt-1">Data wilayah tidak tersedia, input manual</p>}
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  District *
                </label>
                {districtFetchFailed ? (
                  <input
                    type="text"
                    value={formData.district}
                    onChange={(e) => handleDistrictChange(e.target.value)}
                    className="input-field"
                    required
                    placeholder="Enter district manually"
                  />
                ) : (
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
                )}
                {loadingRegions && formData.city && <p className="text-xs text-gray-500 mt-1">Loading districts...</p>}
                {districtFetchFailed && <p className="text-xs text-yellow-600 mt-1">Data wilayah tidak tersedia, input manual</p>}
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Village
                </label>
                {villageFetchFailed ? (
                  <input
                    type="text"
                    value={formData.village}
                    onChange={(e) => setFormData(prev => ({ ...prev, village: e.target.value }))}
                    className="input-field"
                    placeholder="Enter village manually"
                  />
                ) : (
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
                )}
                {loadingRegions && formData.district && <p className="text-xs text-gray-500 mt-1">Loading villages...</p>}
                {villageFetchFailed && <p className="text-xs text-yellow-600 mt-1">Data wilayah tidak tersedia, input manual</p>}
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
                  placeholder="Enter postal code"
                  readOnly={!!formData.village && !villageFetchFailed && !!formData.postalCode}
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
                  <div className="grid grid-cols-4 gap-3">
                    {Array.from({ length: requiredVisitsPerWeek }, (_, i) => i).map((index) => {
                      const currentValue = formData.selectedDays[index] || '';

                      return (
                        <div key={`day-${index}`}>
                          <label className="block text-xs font-medium text-gray-600 mb-1">
                            Day {index + 1} *
                          </label>
                          <select
                            value={currentValue}
                            onChange={(e) => handleDayChange(index, e.target.value)}
                            className="input-field"
                            required
                          >
                            <option value="">Select day...</option>
                            {dayOptions.map((day) => (
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
                  <p className="text-xs text-blue-600 mt-2 flex items-center">
                    <Icons.alert className="w-3 h-3 mr-1" />
                    You can select the same day multiple times for different time slots (e.g., Monday 08:00-11:00 & Monday 11:00-14:00)
                  </p>
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
                        Subscription Duration: {formData.qtyPackage} calendar month(s)
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
                  {mode === 'renew' ? (
                    <div className="p-3 bg-gray-50 rounded-lg">
                      <p className="text-sm text-gray-600">
                        <span className="font-semibold text-gray-900">{renewalPrefill?.ltv ?? 0} months</span>
                        <span className="mx-2 text-gray-400">→</span>
                        <span className="font-semibold text-green-600">{(renewalPrefill?.ltv ?? 0) + 1} months after renewal</span>
                      </p>
                    </div>
                  ) : (
                    <>
                      <span className="inline-flex items-center px-3 py-2 rounded-md text-sm font-medium bg-green-100 text-green-800 border border-green-200">
                        {formData.ltv} months
                      </span>
                      <p className="text-xs text-gray-500 mt-1">
                        Automatically calculated based on subscription date and quantity
                      </p>
                    </>
                  )}
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

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Kode Promo <span className="text-xs text-gray-400">(opsional)</span>
                </label>
                <input
                  type="text"
                  value={formData.promoCode || ''}
                  onChange={(e) => setFormData(prev => ({ ...prev, promoCode: e.target.value }))}
                  className="input-field"
                  placeholder="Masukkan kode promo"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Diskon / Promotion (Rp) <span className="text-xs text-gray-400">(opsional)</span>
                </label>
                <input
                  type="number"
                  min="0"
                  value={formData.promoDiscount ?? ''}
                  onChange={(e) => setFormData(prev => ({ ...prev, promoDiscount: e.target.value }))}
                  className="input-field"
                  placeholder="0"
                />
              </div>
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
                  {mode === 'renew' ? 'Renewing...' : 'Creating...'}
                </>
              ) : (
                <>
                  <Icons.plus className="w-4 h-4 mr-2" />
                  {mode === 'renew' ? 'Confirm Renewal' : 'Create Customer'}
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}