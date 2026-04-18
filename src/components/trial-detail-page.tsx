'use client';

import React, { useState, useEffect, useRef } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import { SessionData } from '@/types/auth';
import { TrialListItem, TrialStatus } from '@/types/trial';
import { Icons } from './icons';
import { useBreadcrumbOverride } from '@/lib/breadcrumb-context';
import { useToast } from '@/lib/toast';
import { useConfirm } from '@/components/confirm-dialog';

interface TrialDetailPageProps {
  trialId: string;
  session: SessionData;
}

interface UpdateTrialData {
  id: string;
  start_date?: string;
  end_date?: string;
  assigned_mitra?: string;
  subscription_status?: TrialStatus;
  notes?: string;
  subscription_package?: string;
  total_sessions?: number;
  chosen_days?: string[];
  qty_package?: number;
  // Customer info
  customer_name?: string;
  contact?: string;
  acquisition?: string;
  address?: string;
  city?: string;
  district?: string;
  village?: string;
  postal_code?: string;
  residential_type?: string;
}

const statusColors = {
  'Trial Scheduled': 'bg-blue-100 text-blue-800',
  'Converted': 'bg-green-100 text-green-800',
  'Not Converted': 'bg-red-100 text-red-800',
  'Cancelled': 'bg-gray-100 text-gray-800',
};

const acquisitionColors = {
  'HOMA': 'bg-blue-100 text-blue-800',
  'Altrix': 'bg-purple-100 text-purple-800',
};

const residentialColors = {
  'House': 'bg-green-100 text-green-800',
  'Apartment': 'bg-blue-100 text-blue-800',
  'Office Space': 'bg-purple-100 text-purple-800',
};

export default function TrialDetailPage({ trialId, session }: TrialDetailPageProps) {
  const router = useRouter();
  const pathname = usePathname();
  const { setOverride } = useBreadcrumbOverride();
  const { toast } = useToast();
  const confirm = useConfirm();
  const [trial, setTrial] = useState<TrialListItem | null>(null);
  const [loading, setLoading] = useState(true);
  const [editMode, setEditMode] = useState<string | null>(null);
  const [updateLoading, setUpdateLoading] = useState<string | null>(null);

  // Mitra state
  const [mitras, setMitras] = useState<Array<{ id: string; name: string; phone: string }>>([]);
  const [loadingMitras, setLoadingMitras] = useState(false);
  const [allMitras, setAllMitras] = useState<Array<{ id: string; name: string; phone: string }>>([]);

  // Subscription packages
  const [subscriptionPackages, setSubscriptionPackages] = useState<any[]>([]);
  const [loadingPackages, setLoadingPackages] = useState(false);

  // Region state
  const [cities, setCities] = useState<Array<{ value: string; label: string }>>([]);
  const [districts, setDistricts] = useState<Array<{ value: string; label: string }>>([]);
  const [villages, setVillages] = useState<Array<{ value: string; label: string; postalCode?: string }>>([]);
  const [loadingCities, setLoadingCities] = useState(false);
  const [loadingDistricts, setLoadingDistricts] = useState(false);
  const [loadingVillages, setLoadingVillages] = useState(false);

  // Track if regions have been loaded to prevent re-fetching
  const regionsLoadedRef = useRef<{ city?: string; district?: string }>({});

  // Debounce timer for auto-save
  const debounceTimerRef = useRef<NodeJS.Timeout | null>(null);

  // Trial schedule state
  const [trialVisits, setTrialVisits] = useState<any[]>([]);
  const [loadingVisits, setLoadingVisits] = useState(false);

  // New trial date form state (for adding additional trials)
  const [showAddTrialForm, setShowAddTrialForm] = useState(false);
  const [newTrialDate, setNewTrialDate] = useState('');
  const [newTrialMitra, setNewTrialMitra] = useState('');

  // Mitra change modal state
  const [showChangeMitraModal, setShowChangeMitraModal] = useState(false);
  const [selectedVisitForChange, setSelectedVisitForChange] = useState<any>(null);
  const [availableMitrasForChange, setAvailableMitrasForChange] = useState<any[]>([]);
  const [loadingAvailableMitras, setLoadingAvailableMitras] = useState(false);
  const [newMitraId, setNewMitraId] = useState('');
  const [changeReason, setChangeReason] = useState('');
  const [changingMitra, setChangingMitra] = useState(false);
  const [mitraSearchQuery, setMitraSearchQuery] = useState('');

  // History viewer modal state
  const [showHistoryModal, setShowHistoryModal] = useState(false);
  const [selectedVisitForHistory, setSelectedVisitForHistory] = useState<any>(null);
  const [mitraChangeHistory, setMitraChangeHistory] = useState<any[]>([]);
  const [loadingHistory, setLoadingHistory] = useState(false);

  // Date editing state (maps visitId -> newDate)
  const [editingDateVisitId, setEditingDateVisitId] = useState<string | null>(null);
  const [editingDateValue, setEditingDateValue] = useState<string>('');
  const [editingDateMitraId, setEditingDateMitraId] = useState<string | null>(null);
  const [checkingAvailability, setCheckingAvailability] = useState(false);
  const [showAvailabilityWarning, setShowAvailabilityWarning] = useState(false);
  const [availabilityWarningMessage, setAvailabilityWarningMessage] = useState('');

  // Cancel visit state
  const [showCancelVisitModal, setShowCancelVisitModal] = useState(false);
  const [selectedVisitForCancel, setSelectedVisitForCancel] = useState<any>(null);
  const [cancelReason, setCancelReason] = useState('');
  const [loadingCancelVisit, setLoadingCancelVisit] = useState(false);
  const [pendingCancelStatus, setPendingCancelStatus] = useState<string | null>(null);

  // Conversion form state
  const [showConversionForm, setShowConversionForm] = useState(false);
  const [selectedPackage, setSelectedPackage] = useState('');
  const [selectedPackageId, setSelectedPackageId] = useState('');
  const [quantity, setQuantity] = useState(1);
  const [selectedDays, setSelectedDays] = useState<string[]>([]);
  const [startDate, setStartDate] = useState('');
  const [selectedMitra, setSelectedMitra] = useState('');
  const [promoCode, setPromoCode] = useState('');
  const [promoDiscount, setPromoDiscount] = useState('');
  const [scheduledDates, setScheduledDates] = useState<Array<{ visitNumber: number; date: string; day: string }>>([]);
  const [loadingPreview, setLoadingPreview] = useState(false);

  // Fetch trial data
  const fetchTrial = async () => {
    try {
      setLoading(true);
      const response = await fetch(`/api/trials/${trialId}?_t=${Date.now()}`);
      if (response.ok) {
        const result = await response.json();
        if (result.success && result.data) {
          setTrial(result.data);
          setOverride(pathname, result.data.customerName || result.data.customer_name || '');
        } else {
          console.error('Failed to fetch trial');
          router.push('/app/trial');
        }
      } else {
        console.error('Trial not found');
        router.push('/app/trial');
      }
    } catch (error) {
      console.error('Error fetching trial:', error);
      router.push('/app/trial');
    } finally {
      setLoading(false);
    }
  };

  // Check mitra availability based on selected days and date
  const checkMitraAvailability = async () => {
    const selectedDaysArray = selectedDays.filter(Boolean);

    console.log('=== Mitra Availability Check ===');
    console.log('Start Date:', startDate);
    console.log('Selected Days:', selectedDays);
    console.log('Selected Days Array:', selectedDaysArray);
    console.log('Quantity:', quantity);
    console.log('Selected Package ID:', selectedPackageId);
    console.log('Required Visits Per Week:', requiredVisitsPerWeek);

    // Don't check if package is not selected yet
    if (!selectedPackageId) {
      console.log('❌ No package selected yet, skipping mitra check');
      setMitras([]);
      return;
    }

    // Only check if we have all required data
    if (!startDate || selectedDaysArray.length === 0 || !quantity) {
      console.log('❌ Missing required data, skipping mitra check');
      setMitras([]);
      return;
    }

    // Check if all required days are selected
    if (selectedDaysArray.length !== requiredVisitsPerWeek) {
      console.log(`❌ Not all days selected: ${selectedDaysArray.length}/${requiredVisitsPerWeek}`);
      setMitras([]);
      return;
    }

    console.log('✅ All conditions met, checking mitra availability...');

    try {
      setLoadingMitras(true);
      console.log('Checking mitra availability for:', { startDate, selectedDaysArray, quantity, city: trial?.city, district: trial?.district });

      // Calculate end date
      const start = new Date(startDate);
      const end = new Date(start);
      end.setMonth(end.getMonth() + quantity);

      const response = await fetch('/api/mitras/check-availability', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          startDate: start.toISOString().split('T')[0],
          endDate: end.toISOString().split('T')[0],
          dayPattern: selectedDaysArray,
          quantity: quantity,
          city: trial?.city,
          district: trial?.district,
        }),
      });

      if (response.ok) {
        const data = await response.json();
        console.log('Mitra availability response:', data);

        if (data.success && data.data) {
          const availableMitras = data.data.availableMitras || [];
          console.log('Available mitras count:', availableMitras.length);
          console.log('Available mitras details:', availableMitras);

          setMitras(availableMitras.map((m: any) => ({
            id: m.mitraId,
            name: m.mitraName,
            phone: m.mitraPhone || m.contact || '',
          })));

          // Also log unavailable mitras for debugging
          if (data.data.unavailableMitras && data.data.unavailableMitras.length > 0) {
            console.log('Unavailable mitras:', data.data.unavailableMitras);
          }
        } else {
          setMitras([]);
        }
      } else {
        console.error('Failed to check mitra availability:', response.status);
        setMitras([]);
      }
    } catch (error) {
      console.error('Error checking mitra availability:', error);
      setMitras([]);
    } finally {
      setLoadingMitras(false);
    }
  };

  // Fetch cities
  const fetchCities = async () => {
    try {
      setLoadingCities(true);
      console.log('Fetching cities...');
      const response = await fetch('/api/regions/cities');
      if (response.ok) {
        const result = await response.json();
        if (result.success && result.data) {
          const cityOptions = result.data.map((city: any) => ({
            value: city.name,
            label: city.name
          }));
          console.log('Cities loaded:', cityOptions.length);
          setCities(cityOptions);
        } else {
          console.error('Failed to load cities:', result.message);
          setCities([]);
        }
      } else {
        console.error('Failed to fetch cities:', response.status);
        setCities([]);
      }
    } catch (error) {
      console.error('Error fetching cities:', error);
      setCities([]);
    } finally {
      setLoadingCities(false);
      console.log('loadingCities set to false');
    }
  };

  // Fetch districts based on city
  const fetchDistricts = async (city: string) => {
    if (!city) {
      setDistricts([]);
      setVillages([]);
      return;
    }

    try {
      setLoadingDistricts(true);
      const response = await fetch(`/api/regions/districts?city_id=${encodeURIComponent(city)}`);
      if (response.ok) {
        const result = await response.json();
        if (result.success && result.data) {
          setDistricts(result.data.map((district: any) => ({
            value: district.name,
            label: district.name
          })));
        } else {
          console.error('Failed to load districts:', result.message);
          setDistricts([]);
        }
      } else {
        console.error('Failed to fetch districts:', response.status);
        setDistricts([]);
      }
    } catch (error) {
      console.error('Error fetching districts:', error);
      setDistricts([]);
    } finally {
      setLoadingDistricts(false);
    }
  };

  // Fetch villages based on city and district
  const fetchVillages = async (city: string, district: string) => {
    if (!city || !district) {
      setVillages([]);
      return;
    }

    try {
      setLoadingVillages(true);
      const response = await fetch(`/api/regions/villages?district_id=${encodeURIComponent(district)}`);
      if (response.ok) {
        const result = await response.json();
        if (result.success && result.data) {
          setVillages(result.data.map((village: any) => ({
            value: village.name,
            label: village.name,
            postalCode: village.postal_code
          })));
        } else {
          console.error('Failed to load villages:', result.message);
          setVillages([]);
        }
      } else {
        console.error('Failed to fetch villages:', response.status);
        setVillages([]);
      }
    } catch (error) {
      console.error('Error fetching villages:', error);
      setVillages([]);
    } finally {
      setLoadingVillages(false);
    }
  };

  // Fetch all active mitras (for trial assignment - no availability check needed)
  const fetchAllMitras = async () => {
    try {
      const response = await fetch('/api/mitra?status=Active');
      if (response.ok) {
        const result = await response.json();
        // API returns { items: [...], page, total, totalPages }
        if (result.items && Array.isArray(result.items)) {
          const mitraList = result.items.map((m: any) => ({
            id: m.id,
            name: m.name || m.mitraName,
            phone: m.phone || m.contact || '',
          }));
          setAllMitras(mitraList);
          console.log('All mitras loaded:', mitraList.length);
        }
      }
    } catch (error) {
      console.error('Error fetching all mitras:', error);
    }
  };

  // Fetch trial visits
  const fetchTrialVisits = async () => {
    if (!trial) return;

    try {
      setLoadingVisits(true);
      // Add timestamp to prevent caching
      const response = await fetch(`/api/trial/${trial.id}/visits?_t=${Date.now()}`);
      if (response.ok) {
        const result = await response.json();
        if (result.success && result.data) {
          setTrialVisits(result.data);
          console.log('Trial visits loaded:', result.data.length);
          // Log mitra names for debugging
          result.data.forEach((v: any) => {
            console.log(`Visit #${v.visitNumber}: ${v.mitraName || 'NO NAME'} (actualMitraId: ${v.actualMitraId})`);
          });
        }
      }
    } catch (error) {
      console.error('Error fetching trial visits:', error);
    } finally {
      setLoadingVisits(false);
    }
  };

  // Add single trial visit
  const addTrialVisit = async () => {
    if (!trial || !newTrialDate || !newTrialMitra) {
      toast('warning', 'Please select trial date and assign a mitra');
      return;
    }

    // Validate date is not in the past - REMOVED per feedback 7a (allow backdate)
    /*
    const selectedDate = new Date(newTrialDate);
    const today = new Date();
    today.setHours(0, 0, 0, 0);
  
    if (selectedDate < today) {
      toast('warning', 'Trial date cannot be in the past');
      return;
    }
    */
    try {
      setLoadingVisits(true);
      const response = await fetch(`/api/trial/${trial.id}/visits`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          trialDate: newTrialDate,
          mitraId: newTrialMitra,
        }),
      });

      if (response.ok) {
        const result = await response.json();
        toast('success', result.message || 'Trial visit added successfully');

        // Reset form
        setNewTrialDate('');
        setNewTrialMitra('');
        setShowAddTrialForm(false);

        await fetchTrialVisits(); // Refresh visits
      } else {
        const error = await response.json();
        toast('error', error.message || 'Failed to add trial visit');
      }
    } catch (error) {
      console.error('Error adding trial visit:', error);
      toast('error', 'Failed to add trial visit');
    } finally {
      setLoadingVisits(false);
    }
  };

  // Update visit attendance
  const updateVisitAttendance = async (visitId: string, attended: boolean) => {
    try {
      const response = await fetch(`/api/trial/${trial?.id}/visits`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          visitId,
          status: attended ? 'Done' : 'Cancelled',
          actualDate: attended ? new Date().toISOString().split('T')[0] : null,
        }),
      });

      if (response.ok) {
        await fetchTrialVisits(); // Refresh visits
      } else {
        const error = await response.json();
        toast('error', error.message || 'Failed to update attendance');
      }
    } catch (error) {
      console.error('Error updating attendance:', error);
      toast('error', 'Failed to update attendance');
    }
  };

  // Handle date edit actions
  const startEditingDate = (visit: any) => {
    setEditingDateVisitId(visit.id);
    setEditingDateValue(visit.scheduledDate);
    setEditingDateMitraId(visit.actualMitraId || visit.mitraId);
  };

  const cancelEditingDate = () => {
    setEditingDateVisitId(null);
    setEditingDateValue('');
    setEditingDateMitraId(null);
    setShowAvailabilityWarning(false);
  };

  // Check mitra availability for editing visit date
  const checkMitraAvailabilityForDate = async (mitraId: string, date: string, visitId: string) => {
    if (!mitraId || !date || !trial) return true;

    try {
      setCheckingAvailability(true);

      const dateObj = new Date(date);
      const response = await fetch('/api/mitras/check-availability', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          dayPattern: [date],
          startDate: date,
          endDate: date,
          city: trial.city,
          district: trial.district,
        }),
      });

      if (response.ok) {
        const result = await response.json();

        if (result.success && result.data) {
          const availableMitras = result.data.availableMitras || [];
          const isAvailable = availableMitras.some((m: any) =>
            m.mitraId === mitraId || m.id === mitraId
          );

          if (!isAvailable) {
            const mitraName = trialVisits.find(v => v.id === visitId)?.mitraName || 'Assigned mitra';
            setAvailabilityWarningMessage(
              `⚠️ ${mitraName} is NOT available on ${dateObj.toLocaleDateString('en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}.\n\n` +
              `This mitra may already have 2 customers scheduled for that day (maximum capacity reached).\n\n` +
              `Do you want to continue anyway?`
            );
            setShowAvailabilityWarning(true);
            return false;
          }

          return true;
        }
      }

      return true;
    } catch (error) {
      console.error('Error checking availability:', error);
      return true;
    } finally {
      setCheckingAvailability(false);
    }
  };

  const saveEditedDate = async (visitId: string, forceUpdate: boolean = false) => {
    if (!trial) return;

    // Check mitra availability before saving (unless forced)
    if (!forceUpdate && editingDateMitraId) {
      const isAvailable = await checkMitraAvailabilityForDate(editingDateMitraId, editingDateValue, visitId);
      if (!isAvailable) {
        return;
      }
    }

    try {
      // Use reschedule mode: cancel old visit + create new with Done status
      // Per client requirement (Feb 1, 2026):
      // - Old visit → Cancelled (not present)
      // - New visit → Done (present automatically)
      const response = await fetch(`/api/trial/${trial.id}/visits`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          visitId,
          scheduledDate: editingDateValue,
          reschedule: true, // Enable cancel + create new behavior
          newMitraId: editingDateMitraId, // Pass new mitra if changed
        }),
      });

      if (response.ok) {
        const result = await response.json();
        setEditingDateVisitId(null);
        setEditingDateValue('');
        setEditingDateMitraId(null);
        setShowAvailabilityWarning(false);
        await fetchTrialVisits();
        // Show success message with details
        if (result.data?.newVisitNumber) {
          console.log(`✅ Rescheduled: Old visit cancelled, new visit #${result.data.newVisitNumber} created`);
        }
      } else {
        const error = await response.json();
        toast('error', error.message || 'Failed to update date');
      }
    } catch (error) {
      console.error('Error updating date:', error);
      toast('error', 'Failed to update date');
    }
  };

  // Cancel visit
  const handleCancelVisit = (visit: any) => {
    setSelectedVisitForCancel(visit);
    setCancelReason('');
    setShowCancelVisitModal(true);
  };

  const saveCancelVisit = async () => {
    if (!cancelReason.trim()) {
      toast('warning', 'Please provide a reason for cancelling');
      return;
    }
    try {
      setLoadingCancelVisit(true);

      if (selectedVisitForCancel) {
        // Single visit cancel
        const response = await fetch(`/api/trial/${trial?.id}/visits`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            visitId: selectedVisitForCancel.id,
            status: 'Cancelled',
            visitNotes: `Cancellation reason: ${cancelReason}`,
          }),
        });
        if (!response.ok) {
          const error = await response.json();
          toast('error', error.message || 'Failed to cancel visit');
          return;
        }
      } else if (pendingCancelStatus === 'Cancelled') {
        // Bulk cancel all non-cancelled visits when status set to Cancelled
        const visitsToCancel = trialVisits.filter(v => v.status !== 'Cancelled');
        for (const visit of visitsToCancel) {
          await fetch(`/api/trial/${trial?.id}/visits`, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              visitId: visit.id,
              status: 'Cancelled',
              visitNotes: `Cancellation reason: ${cancelReason}`,
            }),
          });
        }
        // Save the status change
        setTrial(prev => prev ? { ...prev, overallStatus: 'Cancelled' } : null);
        await handleUpdateTrial({ id: trial!.id, subscription_status: 'Cancelled' });
      }

      setShowCancelVisitModal(false);
      setSelectedVisitForCancel(null);
      setPendingCancelStatus(null);
      setCancelReason('');
      await fetchTrialVisits();
    } catch (error) {
      console.error('Error cancelling visit:', error);
      toast('error', 'Failed to cancel visit');
    } finally {
      setLoadingCancelVisit(false);
    }
  };

  // Open change mitra modal
  const openChangeMitraModal = async (visit: any) => {
    setSelectedVisitForChange(visit);
    setNewMitraId('');
    setChangeReason('');
    setMitraSearchQuery(''); // Reset search
    setShowChangeMitraModal(true);

    // Fetch available mitras for this visit
    try {
      setLoadingAvailableMitras(true);
      const response = await fetch(`/api/trial/${trial?.id}/visits/${visit.id}/available-mitras`);
      if (response.ok) {
        const result = await response.json();
        if (result.success && result.data) {
          setAvailableMitrasForChange(result.data.availableMitras || []);
          console.log('Available mitras for change:', result.data.availableMitras.length);
        }
      }
    } catch (error) {
      console.error('Error fetching available mitras:', error);
    } finally {
      setLoadingAvailableMitras(false);
    }
  };

  // Handle mitra change submission
  const handleChangeMitra = async () => {
    if (!selectedVisitForChange || !newMitraId || !changeReason.trim()) {
      toast('warning', 'Please select a mitra and provide a reason for the change');
      return;
    }

    try {
      setChangingMitra(true);
      const response = await fetch(
        `/api/trial/${trial?.id}/visits/${selectedVisitForChange.id}/change-mitra`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            newMitraId,
            reason: changeReason,
          }),
        }
      );

      if (response.ok) {
        const result = await response.json();
        console.log('✅ Mitra change response:', result);

        // Clear modal state
        setShowChangeMitraModal(false);
        setNewMitraId('');
        setChangeReason('');
        setSelectedVisitForChange(null);

        // Refresh both trial data and visits to get updated mitra name
        await Promise.all([
          fetchTrial(),
          fetchTrialVisits()
        ]);

        toast('success', result.message || 'Mitra changed successfully.');
      } else {
        const error = await response.json();
        toast('error', error.message || 'Failed to change mitra');
      }
    } catch (error) {
      console.error('Error changing mitra:', error);
      toast('error', 'Failed to change mitra');
    } finally {
      setChangingMitra(false);
    }
  };

  // Open history modal
  const openHistoryModal = async (visit: any) => {
    setSelectedVisitForHistory(visit);
    setShowHistoryModal(true);

    try {
      setLoadingHistory(true);
      const response = await fetch(`/api/trial/${trial?.id}/visits/${visit.id}/change-mitra`);
      if (response.ok) {
        const result = await response.json();
        if (result.success && result.data) {
          setMitraChangeHistory(result.data);
          console.log('Mitra change history:', result.data.length, 'records');
        }
      }
    } catch (error) {
      console.error('Error fetching history:', error);
    } finally {
      setLoadingHistory(false);
    }
  };

  // Fetch subscription packages
  const fetchSubscriptionPackages = async () => {
    try {
      setLoadingPackages(true);
      const response = await fetch('/api/subscription-packages?_t=' + Date.now());
      if (response.ok) {
        const result = await response.json();
        console.log('Subscription packages response:', result);
        if (result.success && result.data) {
          // API already returns unique packages
          setSubscriptionPackages(result.data);
          console.log('Set subscription packages:', result.data.length, 'packages');
        } else {
          console.error('No subscription packages data:', result);
          setSubscriptionPackages([]);
        }
      } else {
        console.error('Failed to fetch subscription packages:', response.status);
        setSubscriptionPackages([]);
      }
    } catch (error) {
      console.error('Error fetching subscription packages:', error);
      setSubscriptionPackages([]);
    } finally {
      setLoadingPackages(false);
    }
  };

  // Handle update trial (immediate - for dropdowns, dates, etc)
  const handleUpdateTrial = async (updateData: UpdateTrialData) => {
    setUpdateLoading(updateData.id);
    try {
      const response = await fetch('/api/trial', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(updateData),
      });

      if (response.ok) {
        const result = await response.json();
        if (!result.success) {
          toast('error', result.message || 'Failed to update trial');
        }
        // DON'T refresh trial data - it causes unnecessary re-render/reload
        // await fetchTrial(); // ← REMOVED THIS LINE
      } else {
        const errorData = await response.json();
        toast('error', errorData.message || 'Failed to update trial');
      }
    } catch (error) {
      console.error('Error updating trial:', error);
      toast('error', 'Network error: Failed to update trial');
    } finally {
      setUpdateLoading(null);
    }
  };

  // Debounced update for text inputs (wait 800ms after user stops typing)
  const handleDebouncedUpdate = (updateData: UpdateTrialData) => {
    // Clear existing timer
    if (debounceTimerRef.current) {
      clearTimeout(debounceTimerRef.current);
    }

    // Set new timer
    debounceTimerRef.current = setTimeout(() => {
      console.log('Auto-saving:', updateData);
      handleUpdateTrial(updateData);
    }, 800); // 800ms delay
  };

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (debounceTimerRef.current) {
        clearTimeout(debounceTimerRef.current);
      }
    };
  }, []);

  // Convert to customer - full conversion with all form data
  const convertToCustomer = async (trialId: string, conversionData: {
    subscription_package: string;
    chosen_days: string[];
    total_sessions: number;
    qty_package: number;
    start_date: string;
    assigned_mitra?: string;
    promo_code?: string;
    promo_discount?: number;
  }) => {
    const ok = await confirm({ title: 'Convert Trial', message: 'Convert this trial to a customer?', confirmLabel: 'Convert' });
    if (!ok) return;

    try {
      const response = await fetch('/api/trial', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          id: trialId,
          subscription_status: 'Active',
          convert_to_customer: true,
          subscription_package: conversionData.subscription_package,
          chosen_days: conversionData.chosen_days,
          total_sessions: conversionData.total_sessions,
          qty_package: conversionData.qty_package,
          start_date: conversionData.start_date,
          assigned_mitra: conversionData.assigned_mitra,
          promo_code: conversionData.promo_code || undefined,
          promo_discount: conversionData.promo_discount || undefined,
        }),
      });

      if (response.ok) {
        const result = await response.json();
        if (result.success) {
          toast('success', 'Trial successfully converted to customer! Redirecting to customer page...');
          // Redirect to customer page instead of refreshing trial data
          router.push(`/app/customers/${trialId}`);
        } else {
          toast('error', result.message || 'Failed to convert trial');
        }
      } else {
        const errorData = await response.json();
        toast('error', errorData.message || 'Failed to convert trial');
      }
    } catch (error) {
      console.error('Error converting trial:', error);
      toast('error', 'Network error: Failed to convert trial');
    }
  };

  useEffect(() => {
    const loadInitialData = async () => {
      await fetchTrial();
      await fetchSubscriptionPackages();
      await fetchCities(); // Load cities for edit mode
      await fetchAllMitras(); // Load all mitras for trial assignment
    };
    loadInitialData();
  }, [trialId]);

  // Load trial visits when trial data is loaded (both view and edit mode)
  useEffect(() => {
    if (trial) {
      fetchTrialVisits();
    }
  }, [trial]);

  // Note: Trial schedule initialization removed - now using (+) Add Trial Date button instead

  // Load districts and villages when trial data is first loaded (only once per city/district)
  useEffect(() => {
    const loadRegionsForTrial = async () => {
      if (!trial || !trial.city) return;

      // Check if we already loaded districts for this city
      if (regionsLoadedRef.current.city !== trial.city) {
        console.log('Loading districts for city:', trial.city);
        await fetchDistricts(trial.city);
        regionsLoadedRef.current.city = trial.city;
      }

      // Check if we already loaded villages for this city+district
      if (trial.district && regionsLoadedRef.current.district !== trial.district) {
        console.log('Loading villages for district:', trial.district);
        await fetchVillages(trial.city, trial.district);
        regionsLoadedRef.current.district = trial.district;
      }
    };

    loadRegionsForTrial();
  }, [trial?.city, trial?.district]); // Only re-run if city or district changes

  // Fetch visit schedule preview from API
  useEffect(() => {
    const fetchPreview = async () => {
      const selectedDaysArray = selectedDays.filter(Boolean);
      if (!selectedPackageId || selectedDaysArray.length === 0 || !startDate) {
        setScheduledDates([]);
        return;
      }
      try {
        setLoadingPreview(true);
        const response = await fetch('/api/subscriptions/preview', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            subscriptionPackageId: selectedPackageId,
            dayPattern: selectedDaysArray,
            startDate,
            qtyPackage: quantity,
          }),
        });
        if (response.ok) {
          const data = await response.json();
          if (data.success) setScheduledDates(data.data.scheduledDates || []);
        }
      } catch (e) {
        console.error('Error fetching visit preview:', e);
      } finally {
        setLoadingPreview(false);
      }
    };
    if (showConversionForm) fetchPreview();
  }, [selectedPackageId, selectedDays, startDate, quantity, showConversionForm]);

  // Check mitra availability when package, days, start date, or quantity changes
  useEffect(() => {
    if (showConversionForm) {
      checkMitraAvailability();
    }
  }, [selectedPackageId, selectedDays, startDate, quantity, showConversionForm]);

  // Reset conversion form when opened/closed
  useEffect(() => {
    if (showConversionForm) {
      // Reset form state when opening conversion form
      setSelectedPackage('');
      setSelectedPackageId('');
      setQuantity(1);
      setSelectedDays([]);
      setStartDate('');
      setSelectedMitra(trial?.assignedMitraId || '');
      setMitras([]);
      setPromoCode('');
      setPromoDiscount('');
      setScheduledDates([]);
      fetchSubscriptionPackages();
    }
  }, [showConversionForm]);

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Loading trial details...</p>
        </div>
      </div>
    );
  }

  if (!trial) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <p className="text-gray-600">Trial not found</p>
          <button
            onClick={() => router.push('/app/trial')}
            className="mt-4 btn-primary"
          >
            Back to Trials
          </button>
        </div>
      </div>
    );
  }

  const isEditMode = editMode === trial.id;

  // Handle day selection change (dropdown)
  const handleDayChange = (index: number, value: string) => {
    const newSelectedDays = [...selectedDays];
    if (value) {
      newSelectedDays[index] = value;
    } else {
      newSelectedDays.splice(index, 1);
    }
    setSelectedDays(newSelectedDays);
  };

  const handleSaveChanges = () => {
    setEditMode(null);
    setShowConversionForm(false);
  };

  const handleConvert = async () => {
    // Validate required fields
    const selectedDaysArray = selectedDays.filter(Boolean);
    const selectedPackageObj = subscriptionPackages.find(pkg => pkg.id === selectedPackageId);
    const requiredDays = selectedPackageObj?.visitsPerWeek || 0;

    if (!selectedPackage || !startDate) {
      toast('warning', 'Please fill in all required fields for conversion (Package, Start Date)');
      return;
    }

    if (requiredDays === 0) {
      toast('warning', 'Package configuration is invalid (visits per week = 0). Please contact admin.');
      return;
    }

    if (selectedDaysArray.length !== requiredDays) {
      toast('info', `Please select exactly ${requiredDays} service days for this package`);
      return;
    }

    // Calculate total sessions
    const weeksInMonth = 4;
    const totalSessions = selectedDaysArray.length * weeksInMonth * quantity;

    // Prepare conversion data
    const conversionData = {
      subscription_package: selectedPackage,
      chosen_days: selectedDaysArray,
      total_sessions: totalSessions,
      qty_package: quantity,
      start_date: startDate,
      assigned_mitra: selectedMitra || trial.assignedMitraId || undefined,
      promo_code: promoCode || undefined,
      promo_discount: Number(promoDiscount) > 0 ? Number(promoDiscount) : undefined,
    };

    await convertToCustomer(trial.id, conversionData);
  };

  // Calculate visit preview
  const calculateVisitPreview = () => {
    const selectedDaysArray = selectedDays.filter(Boolean);

    if (!selectedPackage || selectedDaysArray.length === 0) {
      return { totalSessions: 0, schedule: '', duration: '' };
    }

    const weeksInMonth = 4;
    const totalSessions = selectedDaysArray.length * weeksInMonth * quantity;
    const schedule = `${selectedDaysArray.join(', ')} (${selectedDaysArray.length}x/week)`;
    const duration = `${quantity} month${quantity > 1 ? 's' : ''}`;

    return { totalSessions, schedule, duration };
  };

  const visitPreview = calculateVisitPreview();

  // Day options for dropdown
  const dayOptions = [
    { value: 'Monday', label: 'Monday' },
    { value: 'Tuesday', label: 'Tuesday' },
    { value: 'Wednesday', label: 'Wednesday' },
    { value: 'Thursday', label: 'Thursday' },
    { value: 'Friday', label: 'Friday' },
    { value: 'Saturday', label: 'Saturday' },
    { value: 'Sunday', label: 'Sunday' },
  ];

  // Get selected package details
  const selectedPackageObj = subscriptionPackages.find(pkg => pkg.id === selectedPackageId);
  const requiredVisitsPerWeek = selectedPackageObj?.visitsPerWeek || 0;
  const selectedDaysCount = selectedDays.length;

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      {/* Header */}
      <div className="mb-6">
        <button
          onClick={() => router.push('/app/trial')}
          className="inline-flex items-center text-sm text-gray-600 hover:text-gray-900 mb-4"
        >
          <Icons.chevronLeft className="w-4 h-4 mr-1" />
          Back to Trials
        </button>
        <h1 className="text-2xl font-semibold text-gray-900">Trial Details</h1>
        <p className="mt-2 text-sm text-gray-700">
          View and manage trial information for {trial.customerName}
        </p>
      </div>

      {/* Main Content Card */}
      <div className="bg-white shadow rounded-lg">
        <div className="space-y-6 p-6">
          {/* Header with Edit and Convert Buttons */}
          <div className="flex items-center justify-between border-b border-gray-300 pb-4">
            <h3 className="text-lg font-medium text-gray-900">
              {showConversionForm
                ? 'Convert Trial to Customer'
                : (isEditMode ? 'Edit Trial Details' : trial.customerName)}
            </h3>
            <div className="flex items-center space-x-3">
              {showConversionForm ? (
                <>
                  <button
                    onClick={handleConvert}
                    disabled={updateLoading === trial.id}
                    className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-green-600 hover:bg-green-700 disabled:opacity-50"
                  >
                    <Icons.check className="w-4 h-4 mr-2" />
                    Confirm Conversion
                  </button>
                  <button
                    onClick={() => setShowConversionForm(false)}
                    className="inline-flex items-center px-4 py-2 border border-gray-300 text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50"
                  >
                    Cancel
                  </button>
                </>
              ) : isEditMode ? (
                <>
                  <button
                    onClick={handleSaveChanges}
                    className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700"
                  >
                    <Icons.check className="w-4 h-4 mr-2" />
                    Save Changes
                  </button>
                  <button
                    onClick={() => {
                      setEditMode(null);
                      setShowConversionForm(false);
                    }}
                    className="inline-flex items-center px-4 py-2 border border-gray-300 text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50"
                  >
                    Cancel
                  </button>
                </>
              ) : (
                <>
                  <button
                    onClick={() => setEditMode(trial.id)}
                    className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-indigo-600 hover:bg-indigo-700"
                  >
                    <Icons.edit className="w-4 h-4 mr-2" />
                    Edit
                  </button>
                  {trial.overallStatus === 'Trial Scheduled' && (
                    <button
                      onClick={() => {
                        setShowConversionForm(true);
                      }}
                      className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-green-600 hover:bg-green-700"
                    >
                      <Icons.check className="w-4 h-4 mr-2" />
                      Convert to Customer
                    </button>
                  )}
                </>
              )}
            </div>
          </div>

          {/* Content - Copy from TrialDetailView component */}
          {showConversionForm ? (
            /* Conversion Form - Same as TrialDetailView */
            <div className="space-y-6">
              <div className="bg-blue-50 border-l-4 border-blue-400 p-4">
                <div className="flex">
                  <div className="flex-shrink-0">
                    <Icons.check className="h-5 w-5 text-blue-400" />
                  </div>
                  <div className="ml-3">
                    <p className="text-sm text-blue-700">
                      Converting <strong>{trial.customerName}</strong> from trial to active customer
                    </p>
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <label className="block text-xs font-semibold text-gray-600 uppercase tracking-wide mb-2">
                    Subscription Package *
                  </label>
                  <select
                    value={selectedPackageId}
                    onChange={(e) => {
                      const pkgId = e.target.value;
                      const pkg = subscriptionPackages.find(p => p.id === pkgId);
                      setSelectedPackageId(pkgId);
                      setSelectedPackage(pkg?.subscriptionPackage || '');
                      // Reset days when package changes
                      setSelectedDays([]);
                    }}
                    className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm"
                    disabled={loadingPackages}
                  >
                    <option value="">
                      {loadingPackages ? 'Loading packages...' : 'Select Package'}
                    </option>
                    {subscriptionPackages && subscriptionPackages.length > 0 ? (
                      subscriptionPackages.map((pkg) => {
                        const visitsPerWeek = pkg.visitsPerWeek || 0;
                        return (
                          <option key={pkg.id} value={pkg.id}>
                            {pkg.subscriptionPackage} - {visitsPerWeek}x/week - Rp {parseInt(pkg.priceNumeric || 0).toLocaleString('id-ID')}
                          </option>
                        );
                      })
                    ) : (
                      !loadingPackages && <option disabled>No packages available</option>
                    )}
                  </select>
                  {loadingPackages && (
                    <div className="text-xs text-blue-500 mt-1">Loading subscription packages...</div>
                  )}
                  {!loadingPackages && subscriptionPackages.length === 0 && (
                    <div className="text-xs text-red-500 mt-1">No subscription packages found</div>
                  )}
                  {!loadingPackages && subscriptionPackages.length > 0 && (
                    <div className="text-xs text-green-500 mt-1">{subscriptionPackages.length} packages available</div>
                  )}
                </div>

                <div>
                  <label className="block text-xs font-semibold text-gray-600 uppercase tracking-wide mb-2">
                    Qty Package * <span className="text-gray-400 font-normal text-xs">(1 qty = 1 bulan)</span>
                  </label>
                  <select
                    value={quantity}
                    onChange={(e) => setQuantity(parseInt(e.target.value))}
                    className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm"
                    disabled={!selectedPackageId}
                  >
                    {Array.from({ length: 12 }, (_, i) => i + 1).map(n => (
                      <option key={n} value={n}>{n} bulan</option>
                    ))}
                  </select>
                  {!selectedPackageId && (
                    <p className="text-xs text-gray-500 mt-1">Please select a package first</p>
                  )}
                </div>

                <div>
                  <label className="block text-xs font-semibold text-gray-600 uppercase tracking-wide mb-2">
                    Start Date *
                  </label>
                  <input
                    type="date"
                    value={startDate}
                    onChange={(e) => setStartDate(e.target.value)}
                    className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm"
                    disabled={!selectedPackageId}
                  />
                  {!selectedPackageId && (
                    <p className="text-xs text-gray-500 mt-1">Please select a package first</p>
                  )}
                </div>

                {/* Service Days Selection - Only show if package is selected */}
                {selectedPackageId && requiredVisitsPerWeek > 0 && (
                  <div className="md:col-span-2">
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Select Service Days ({selectedDaysCount}/{requiredVisitsPerWeek} selected) *
                    </label>
                    <div className="grid grid-cols-4 gap-3">
                      {Array.from({ length: requiredVisitsPerWeek }, (_, i) => i).map((index) => {
                        const currentValue = selectedDays[index] || '';

                        return (
                          <div key={`day-${index}`}>
                            <label className="block text-xs font-medium text-gray-600 mb-1">
                              Day {index + 1} *
                            </label>
                            <select
                              value={currentValue}
                              onChange={(e) => handleDayChange(index, e.target.value)}
                              className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm"
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
                        Please select exactly {requiredVisitsPerWeek} days for this package
                      </p>
                    )}
                    <p className="text-xs text-blue-600 mt-2">
                      💡 You can select the same day multiple times for different time slots (e.g., Monday 08:00-11:00 & Monday 11:00-14:00)
                    </p>
                  </div>
                )}

                {/* Status message - show when days/date selected but mitra not checked yet */}
                {selectedPackageId && requiredVisitsPerWeek > 0 && (
                  <div className="md:col-span-2">
                    {selectedDaysCount < requiredVisitsPerWeek && startDate && (
                      <div className="bg-yellow-50 border-l-4 border-yellow-400 p-3 rounded flex items-start gap-3">
                        <Icons.alertTriangle className="w-5 h-5 text-yellow-600 shrink-0 mt-0.5" />
                        <p className="text-sm text-yellow-700">
                          Please select all {requiredVisitsPerWeek} service days to check mitra availability.
                          Currently selected: {selectedDaysCount}/{requiredVisitsPerWeek}
                        </p>
                      </div>
                    )}

                    {selectedDaysCount === requiredVisitsPerWeek && !startDate && (
                      <div className="bg-yellow-50 border-l-4 border-yellow-400 p-3 rounded flex items-start gap-3">
                        <Icons.alertTriangle className="w-5 h-5 text-yellow-600 shrink-0 mt-0.5" />
                        <p className="text-sm text-yellow-700">
                          Please select start date to check mitra availability
                        </p>
                      </div>
                    )}
                  </div>
                )}

                {/* Mitra selection - Only show after days are selected */}
                {selectedPackageId && selectedDaysCount === requiredVisitsPerWeek && startDate && (
                  <div className="md:col-span-2">
                    <label className="block text-xs font-semibold text-gray-600 uppercase tracking-wide mb-2">
                      Assigned Mitra (Optional)
                    </label>
                    <select
                      value={selectedMitra || trial.assignedMitraId || ''}
                      className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm"
                      disabled={loadingMitras || mitras.length === 0}
                      onChange={(e) => setSelectedMitra(e.target.value)}
                    >
                      <option value="">
                        {loadingMitras ? 'Checking availability...' : mitras.length === 0 ? 'No mitras available' : 'Select Mitra (Optional)'}
                      </option>
                      {mitras.map((mitra) => (
                        <option key={mitra.id} value={mitra.id}>
                          {mitra.name}
                        </option>
                      ))}
                    </select>
                    {loadingMitras && (
                      <div className="text-xs text-blue-500 mt-1">
                        <Icons.spinner className="inline w-3 h-3 mr-1 animate-spin" />
                        Checking mitra availability for selected days and dates...
                      </div>
                    )}
                    {!loadingMitras && mitras.length === 0 && (
                      <div className="text-xs text-red-500 mt-1">
                        No mitra available for all scheduled visits. You can assign a mitra later.
                      </div>
                    )}
                    {!loadingMitras && mitras.length > 0 && (
                      <div className="flex items-center gap-1 text-xs text-green-600 mt-1">
                        <Icons.check className="w-4 h-4" />
                        {mitras.length} mitra(s) available for all scheduled visits
                      </div>
                    )}
                  </div>
                )}

                {/* Promotion / Discount */}
                <div className="md:col-span-2">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-xs font-semibold text-gray-600 uppercase tracking-wide mb-2">
                        Kode Promo <span className="text-gray-400 font-normal text-xs">(opsional)</span>
                      </label>
                      <input
                        type="text"
                        value={promoCode}
                        onChange={(e) => setPromoCode(e.target.value)}
                        placeholder="Contoh: REG990"
                        className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-semibold text-gray-600 uppercase tracking-wide mb-2">
                        Diskon / Promotion <span className="text-gray-400 font-normal text-xs">(opsional)</span>
                      </label>
                      <div className="relative">
                        <span className="absolute left-3 top-1/2 -translate-y-1/2 text-sm text-gray-500 font-medium">Rp</span>
                        <input
                          type="text"
                          inputMode="numeric"
                          value={promoDiscount ? Number(promoDiscount).toLocaleString('id-ID') : ''}
                          onChange={(e) => {
                            const raw = e.target.value.replace(/\./g, '').replace(/[^0-9]/g, '');
                            setPromoDiscount(raw);
                          }}
                          placeholder="0"
                          className="w-full border border-gray-300 rounded-md pl-9 pr-3 py-2 text-sm text-right font-medium focus:outline-none focus:ring-2 focus:ring-blue-500"
                        />
                      </div>
                    </div>
                  </div>
                </div>

                {selectedPackage && selectedDaysCount > 0 && (
                  <div className="md:col-span-2">
                    <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wide mb-3 flex items-center gap-2">
                      <Icons.calendar className="w-4 h-4" />
                      Visit Preview
                    </label>
                    <div className="bg-gradient-to-r from-blue-50 to-indigo-50 border-l-4 border-indigo-500 rounded-md p-4">
                      <div className="grid grid-cols-3 gap-4 text-sm mb-4">
                        <div>
                          <p className="text-gray-600 font-medium">Total Sessions</p>
                          <p className="text-2xl font-bold text-indigo-600">
                            {loadingPreview ? '...' : scheduledDates.length > 0 ? scheduledDates.length : visitPreview.totalSessions} visits
                          </p>
                        </div>
                        <div>
                          <p className="text-gray-600 font-medium">Schedule</p>
                          <p className="text-sm text-gray-900">{visitPreview.schedule}</p>
                        </div>
                        <div>
                          <p className="text-gray-600 font-medium">Duration</p>
                          <p className="text-sm text-gray-900">{visitPreview.duration}</p>
                        </div>
                      </div>
                      {loadingPreview && (
                        <p className="text-xs text-indigo-500">Generating schedule...</p>
                      )}
                      {!loadingPreview && scheduledDates.length > 0 && (
                        <div className="max-h-48 overflow-y-auto">
                          <table className="w-full text-xs">
                            <thead>
                              <tr className="text-left text-indigo-700 border-b border-indigo-200">
                                <th className="pb-1 pr-4">#</th>
                                <th className="pb-1 pr-4">Day</th>
                                <th className="pb-1">Date</th>
                              </tr>
                            </thead>
                            <tbody>
                              {scheduledDates.map((visit) => (
                                <tr key={visit.visitNumber} className="border-t border-indigo-100">
                                  <td className="py-1 pr-4 text-indigo-600 font-medium">Visit-{visit.visitNumber}</td>
                                  <td className="py-1 pr-4 text-gray-700">{visit.day}</td>
                                  <td className="py-1 text-gray-900">{visit.date}</td>
                                </tr>
                              ))}
                            </tbody>
                          </table>
                        </div>
                      )}
                    </div>
                  </div>
                )}
              </div>
            </div>
          ) : (
            isEditMode ? (
              /* Edit Form */
              <div className="space-y-6">
                {/* Customer Information */}
                <div>
                  <h4 className="text-md font-medium text-gray-900 mb-4">Customer Information</h4>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Customer Name *
                      </label>
                      <input
                        type="text"
                        value={trial.customerName || ''}
                        className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm focus:ring-indigo-500 focus:border-indigo-500"
                        onChange={(e) => {
                          setTrial(prev => prev ? { ...prev, customerName: e.target.value } : null);
                          handleDebouncedUpdate({ id: trial.id, customer_name: e.target.value });
                        }}
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Contact *
                      </label>
                      <input
                        type="text"
                        value={trial.contact || ''}
                        className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm focus:ring-indigo-500 focus:border-indigo-500"
                        onChange={(e) => {
                          setTrial(prev => prev ? { ...prev, contact: e.target.value } : null);
                          handleDebouncedUpdate({ id: trial.id, contact: e.target.value });
                        }}
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Acquisition Channel *
                      </label>
                      <select
                        value={trial.acquisition}
                        className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm focus:ring-indigo-500 focus:border-indigo-500"
                        onChange={(e) => {
                          setTrial(prev => prev ? { ...prev, acquisition: e.target.value as any } : null);
                          handleUpdateTrial({ id: trial.id, acquisition: e.target.value as any });
                        }}
                      >
                        <option value="HOMA">HOMA</option>
                        <option value="Altrix">Altrix</option>
                      </select>
                    </div>

                    <div className="md:col-span-2">
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Address *
                      </label>
                      <textarea
                        value={trial.address || ''}
                        rows={2}
                        className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm focus:ring-indigo-500 focus:border-indigo-500"
                        onChange={(e) => {
                          setTrial(prev => prev ? { ...prev, address: e.target.value } : null);
                          handleDebouncedUpdate({ id: trial.id, address: e.target.value });
                        }}
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        City *
                      </label>
                      <select
                        value={trial.city || ''}
                        onChange={(e) => {
                          const newCity = e.target.value;
                          setTrial(prev => prev ? { ...prev, city: newCity, district: '', village: '', postalCode: '' } : null);
                          setDistricts([]);
                          setVillages([]);
                          // Reset ref to allow fetching for new city
                          regionsLoadedRef.current = {};
                          handleUpdateTrial({ id: trial.id, city: newCity, district: '', village: '', postal_code: '' });
                          if (newCity) {
                            fetchDistricts(newCity);
                            regionsLoadedRef.current.city = newCity;
                          }
                        }}
                        className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm focus:ring-indigo-500 focus:border-indigo-500"
                        disabled={loadingCities}
                      >
                        <option value="">Select City...</option>
                        {cities.map((city) => (
                          <option key={city.value} value={city.value}>
                            {city.label}
                          </option>
                        ))}
                      </select>
                      {loadingCities && <p className="text-xs text-gray-500 mt-1">Loading cities...</p>}
                      {!loadingCities && cities.length > 0 && <p className="text-xs text-gray-500 mt-1">{cities.length} cities available</p>}
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        District *
                      </label>
                      <select
                        value={trial.district || ''}
                        onChange={(e) => {
                          const newDistrict = e.target.value;
                          setTrial(prev => prev ? { ...prev, district: newDistrict, village: '', postalCode: '' } : null);
                          setVillages([]);
                          handleUpdateTrial({ id: trial.id, district: newDistrict, village: '', postal_code: '' });
                          if (trial.city && newDistrict) {
                            fetchVillages(trial.city, newDistrict);
                            regionsLoadedRef.current.district = newDistrict;
                          }
                        }}
                        className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm focus:ring-indigo-500 focus:border-indigo-500"
                        disabled={loadingDistricts || !trial.city}
                      >
                        <option value="">Select District...</option>
                        {districts.map((district) => (
                          <option key={district.value} value={district.value}>
                            {district.label}
                          </option>
                        ))}
                      </select>
                      {!trial.city && <p className="text-xs text-gray-500 mt-1">Please select city first</p>}
                      {loadingDistricts && <p className="text-xs text-gray-500 mt-1">Loading districts...</p>}
                      {!loadingDistricts && districts.length > 0 && <p className="text-xs text-gray-500 mt-1">{districts.length} districts available</p>}
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Village *
                      </label>
                      <select
                        value={trial.village || ''}
                        onChange={(e) => {
                          const selectedVillage = villages.find(v => v.value === e.target.value);
                          const newPostalCode = selectedVillage?.postalCode || '';
                          setTrial(prev => prev ? { ...prev, village: e.target.value, postalCode: newPostalCode } : null);
                          handleUpdateTrial({
                            id: trial.id,
                            village: e.target.value,
                            postal_code: newPostalCode
                          });
                        }}
                        className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm focus:ring-indigo-500 focus:border-indigo-500"
                        disabled={loadingVillages || !trial.district}
                      >
                        <option value="">Select Village...</option>
                        {villages.map((village) => (
                          <option key={village.value} value={village.value}>
                            {village.label}
                          </option>
                        ))}
                      </select>
                      {!trial.district && <p className="text-xs text-gray-500 mt-1">Please select district first</p>}
                      {loadingVillages && <p className="text-xs text-gray-500 mt-1">Loading villages...</p>}
                      {!loadingVillages && villages.length > 0 && <p className="text-xs text-gray-500 mt-1">{villages.length} villages available</p>}
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Postal Code
                      </label>
                      <input
                        type="text"
                        value={trial.postalCode || ''}
                        readOnly
                        className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm bg-gray-50"
                      />
                      <p className="text-xs text-gray-500 mt-1">Auto-filled from village selection</p>
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Residential Type *
                      </label>
                      <select
                        value={trial.residentialType}
                        className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm focus:ring-indigo-500 focus:border-indigo-500"
                        onChange={(e) => {
                          setTrial(prev => prev ? { ...prev, residentialType: e.target.value as any } : null);
                          handleUpdateTrial({ id: trial.id, residential_type: e.target.value });
                        }}
                      >
                        <option value="House">House</option>
                        <option value="Apartment">Apartment</option>
                        <option value="Office Space">Office Space</option>
                      </select>
                    </div>
                  </div>
                </div>

                {/* Subscription Information - Read Only */}
                <div className="bg-gray-50 p-4 rounded-lg border border-gray-200">
                  <h4 className="text-md font-medium text-gray-900 mb-4">Subscription Information</h4>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div>
                      <label className="block text-sm font-medium text-gray-600">Subscription Package</label>
                      <div className="mt-1 text-sm text-gray-900">
                        {trial.subscriptionPackage || '-'}
                      </div>
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-600">Subscription Start Date</label>
                      <div className="mt-1 text-sm text-gray-900">
                        {(trial as any).subscriptionStartDate || '-'}
                      </div>
                    </div>

                    {(trial as any).subscriptionEndDate && (
                      <div>
                        <label className="block text-sm font-medium text-gray-600">Subscription End Date</label>
                        <div className="mt-1 text-sm text-gray-900">
                          {(trial as any).subscriptionEndDate}
                        </div>
                      </div>
                    )}

                    <div>
                      <label className="block text-sm font-medium text-gray-600">Status Customer</label>
                      <div className="mt-1">
                        {trial.overallStatus ? (
                          <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${statusColors[trial.overallStatus]}`}>
                            {trial.overallStatus}
                          </span>
                        ) : (
                          <span className="text-sm text-gray-500">-</span>
                        )}
                      </div>
                    </div>
                  </div>
                </div>

                {/* Trial Status */}
                <div>
                  <h4 className="text-md font-medium text-gray-900 mb-4">Trial Status</h4>
                  <div className="grid grid-cols-1 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Status
                      </label>
                      <select
                        value={trial.overallStatus || 'Trial Scheduled'}
                        className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm focus:ring-indigo-500 focus:border-indigo-500"
                        onChange={(e) => {
                          const newStatus = e.target.value as TrialStatus;
                          if (newStatus === 'Cancelled' && trialVisits.some(v => v.status !== 'Cancelled')) {
                            // Show bulk cancel popup before saving status
                            setPendingCancelStatus('Cancelled');
                            setSelectedVisitForCancel(null);
                            setCancelReason('');
                            setShowCancelVisitModal(true);
                          } else {
                            setTrial(prev => prev ? { ...prev, overallStatus: newStatus } : null);
                            handleUpdateTrial({ id: trial.id, subscription_status: newStatus });
                          }
                        }}
                      >
                        <option value="Trial Scheduled">Trial Scheduled</option>
                        <option value="Cancelled">Cancelled</option>
                        <option value="Not Converted">Not Converted</option>
                      </select>
                    </div>
                  </div>
                </div>

                {/* Attendance Tracking */}
                <div>
                  <div className="flex items-center justify-between mb-4">
                    <h4 className="text-md font-medium text-gray-900">Trial Visits</h4>
                    {trial.overallStatus !== 'Cancelled' && (
                      <button
                        onClick={() => setShowAddTrialForm(!showAddTrialForm)}
                        className="inline-flex items-center px-3 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-green-600 hover:bg-green-700"
                      >
                        <Icons.plus className="w-4 h-4 mr-1" />
                        Add Trial Date
                      </button>
                    )}
                  </div>

                  {/* Add Trial Form */}
                  {showAddTrialForm && (
                    <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-4">
                      <h5 className="text-sm font-medium text-gray-900 mb-3">Schedule New Trial Visit</h5>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-2">
                            Trial Date *
                          </label>
                          <input
                            type="date"
                            value={newTrialDate}
                            onChange={(e) => setNewTrialDate(e.target.value)}
                            className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm focus:ring-indigo-500 focus:border-indigo-500"
                          />
                        </div>
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-2">
                            Assigned Mitra *
                          </label>
                          <select
                            value={newTrialMitra}
                            onChange={(e) => setNewTrialMitra(e.target.value)}
                            className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm focus:ring-indigo-500 focus:border-indigo-500"
                          >
                            <option value="">Select Mitra...</option>
                            {allMitras.map((mitra) => (
                              <option key={mitra.id} value={mitra.id}>
                                {mitra.name} - {mitra.phone || 'No phone'}
                              </option>
                            ))}
                          </select>
                        </div>
                      </div>
                      <div className="flex justify-end space-x-2 mt-4">
                        <button
                          onClick={() => {
                            setShowAddTrialForm(false);
                            setNewTrialDate('');
                            setNewTrialMitra('');
                          }}
                          className="px-4 py-2 border border-gray-300 rounded-md text-sm font-medium text-gray-700 hover:bg-gray-50"
                        >
                          Cancel
                        </button>
                        <button
                          onClick={addTrialVisit}
                          disabled={loadingVisits || !newTrialDate || !newTrialMitra}
                          className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                          {loadingVisits ? (
                            <>
                              <Icons.spinner className="w-4 h-4 mr-2 animate-spin" />
                              Adding...
                            </>
                          ) : (
                            <>
                              <Icons.check className="w-4 h-4 mr-2" />
                              Add Trial Visit
                            </>
                          )}
                        </button>
                      </div>
                    </div>
                  )}

                  {/* Visits List */}
                  {trialVisits.length > 0 && (
                    <div className="bg-gray-50 rounded-lg p-4">
                      <div className="space-y-3">
                        {trialVisits.map((visit, index) => {
                          const mitraChanged = visit.originalMitraId && visit.actualMitraId && visit.originalMitraId !== visit.actualMitraId;
                          const isCancelled = visit.status === 'Cancelled';
                          const isEditingThisDate = editingDateVisitId === visit.id;

                          return (
                            <div key={visit.id} className={`p-4 rounded border ${isCancelled ? 'bg-gray-50 border-gray-200' : 'bg-white border-gray-200'}`}>
                              <div className="flex items-start justify-between">
                                <div className="flex-1">
                                  <div className="flex items-center space-x-3 mb-2">
                                    <span className="text-sm font-medium text-gray-900">
                                      Visit #{visit.visitNumber}
                                    </span>
                                    <span className="text-sm text-gray-600">
                                      {visit.scheduledDate} ({visit.scheduledDay})
                                    </span>
                                    <span className={`px-2 py-1 text-xs font-medium rounded-full ${visit.status === 'Done'
                                      ? 'bg-green-100 text-green-800'
                                      : visit.status === 'Cancelled'
                                        ? 'bg-red-100 text-red-800'
                                        : 'bg-yellow-100 text-yellow-800'
                                      }`}>
                                      {visit.status}
                                    </span>
                                  </div>

                                  <div className="space-y-1">
                                    <div className="flex items-center space-x-2 text-sm">
                                      <span className="text-gray-600 flex items-center gap-1"><Icons.user className="w-3 h-3" /> Mitra:</span>
                                      <span className="font-medium text-gray-900">
                                        {visit.mitraName || 'Not assigned'}
                                      </span>
                                      {mitraChanged && (
                                        <span className="px-2 py-0.5 text-xs font-medium bg-blue-100 text-blue-700 rounded">
                                          Changed
                                        </span>
                                      )}
                                    </div>

                                    {visit.actualDate && (
                                      <div className="text-xs text-gray-500 space-y-0.5">
                                        <div>✓ Completed on: {visit.actualDate}</div>
                                        {visit.updatedBy && (
                                          <div className="text-gray-400">
                                            Updated by: {visit.updatedBy}
                                          </div>
                                        )}
                                      </div>
                                    )}
                                  </div>
                                </div>

                                <div className="flex flex-col items-end space-y-2 ml-4">
                                  <label className="flex items-center space-x-2 cursor-pointer">
                                    <input
                                      type="checkbox"
                                      checked={visit.status === 'Done'}
                                      onChange={(e) => updateVisitAttendance(visit.id, e.target.checked)}
                                      disabled={trial.overallStatus !== 'Trial Scheduled'}
                                      className="w-4 h-4 text-indigo-600 border-gray-300 rounded focus:ring-indigo-500 disabled:opacity-50"
                                    />
                                    <span className="text-sm text-gray-700">Attended</span>
                                  </label>
                                </div>
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  )}

                  {trialVisits.length === 0 && !showAddTrialForm && (
                    <div className="text-center text-gray-500 py-8 border-2 border-dashed border-gray-300 rounded-lg">
                      <Icons.beaker className="w-12 h-12 text-gray-400 mx-auto mb-2" />
                      <p className="text-sm">No trial visits scheduled yet.</p>
                      <p className="text-xs text-gray-400 mt-1">Click "Add Trial Date" to schedule your first visit.</p>
                    </div>
                  )}
                </div>

                {updateLoading === trial.id && (
                  <div className="flex items-center justify-center text-sm text-gray-600 py-2">
                    <Icons.spinner className="w-4 h-4 mr-2 animate-spin" />
                    Updating...
                  </div>
                )}
              </div>
            ) : (
              /* View Mode - Read Only */
              <>
                {/* Basic Information */}
                <div className="mb-8">
                  <h3 className="text-xl font-bold text-gray-900 mb-6">Basic Information</h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div>
                      <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1">Customer Name</label>
                      <div className="text-base font-medium text-gray-900">{trial.customerName}</div>
                    </div>

                    <div>
                      <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1">Acquisition</label>
                      <div>
                        <span className={`inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium ${acquisitionColors[trial.acquisition]}`}>
                          {trial.acquisition}
                        </span>
                      </div>
                    </div>

                    <div>
                      <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1">Contact</label>
                      <div className="text-sm text-gray-900 font-mono">{trial.contact || '—'}</div>
                    </div>

                    <div>
                      <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1">Residential Type</label>
                      <div>
                        <span className={`inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium ${residentialColors[trial.residentialType]}`}>
                          {trial.residentialType}
                        </span>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Location Information */}
                <div className="mb-8">
                  <h3 className="text-xl font-bold text-gray-900 mb-6">Location Information</h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div className="md:col-span-2">
                      <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1">Address</label>
                      <div className="text-sm text-gray-900 leading-relaxed">{trial.address || '—'}</div>
                    </div>

                    <div>
                      <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1">Village</label>
                      <div className="text-sm text-gray-900">{trial.village || '—'}</div>
                    </div>

                    <div>
                      <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1">District</label>
                      <div className="text-sm text-gray-900">{trial.district || '—'}</div>
                    </div>

                    <div>
                      <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1">City</label>
                      <div className="text-sm text-gray-900">{trial.city || '—'}</div>
                    </div>

                    <div>
                      <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1">Postal Code</label>
                      <div className="text-sm text-gray-900">{trial.postalCode || '—'}</div>
                    </div>
                  </div>
                </div>

                {/* Subscription Information */}
                <div className="mb-8">
                  <h3 className="text-xl font-bold text-gray-900 mb-6">Subscription Information</h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    {trial.ltv !== undefined && trial.ltv > 0 && (
                      <div>
                        <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1">LTV (months)</label>
                        <div className="text-base font-semibold text-indigo-600">{trial.ltv} months</div>
                      </div>
                    )}

                    <div>
                      <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1">Status</label>
                      <div>
                        {trial.overallStatus ? (
                          <span className={`inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium ${statusColors[trial.overallStatus]}`}>
                            {trial.overallStatus}
                          </span>
                        ) : (
                          <span className="text-sm text-gray-400">—</span>
                        )}
                      </div>
                    </div>

                    <div>
                      <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1">Subscription Package</label>
                      <div className="text-sm text-gray-900 leading-relaxed">
                        {trial.subscriptionPackage || '—'}
                      </div>
                    </div>

                    <div>
                      <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1">Start Date</label>
                      <div className="text-sm text-gray-900 font-mono">
                        {(trial as any).subscriptionStartDate || '—'}
                      </div>
                    </div>

                    <div>
                      <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1">Monthly Fee</label>
                      <div className="text-base font-semibold text-indigo-600">
                        Rp {(trial as any).monthlyFee?.toLocaleString('id-ID') || '0'}
                      </div>
                    </div>
                  </div>
                </div>

                {/* Mitra Information */}
                <div className="mb-8">
                  <h3 className="text-xl font-bold text-gray-900 mb-6">Mitra Information</h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
                    <div>
                      <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1">Assigned Mitra</label>
                      <div className="text-base font-medium text-gray-900">
                        {trial.assignedCleaner || '—'}
                      </div>
                      <p className="text-xs text-gray-400 mt-2">Initial mitra for visit schedule. Can be changed per visit.</p>
                    </div>
                  </div>

                  {/* Attendance Record - View Mode (Read Only) */}
                  {trialVisits.length > 0 && (
                    <div className="pt-6 border-t border-gray-200">
                      <h4 className="text-md font-medium text-gray-900 mb-4">Attendance Record</h4>
                      <div className="bg-gray-50 rounded-lg p-4">
                        <div className="space-y-3">
                          {trialVisits.map((visit) => {
                            const mitraChanged = visit.originalMitraId && visit.actualMitraId && visit.originalMitraId !== visit.actualMitraId;

                            return (
                              <div key={visit.id} className="bg-white p-4 rounded border border-gray-200">
                                <div className="flex items-start justify-between">
                                  <div className="flex-1">
                                    <div className="flex items-center space-x-3 mb-2">
                                      <span className="text-sm font-medium text-gray-900">
                                        Visit #{visit.visitNumber}
                                      </span>
                                      <span className="text-sm text-gray-600">
                                        {visit.scheduledDate} ({visit.scheduledDay})
                                      </span>
                                      <span className={`px-2 py-1 text-xs font-medium rounded-full ${visit.status === 'Done'
                                        ? 'bg-green-100 text-green-800'
                                        : visit.status === 'Cancelled'
                                          ? 'bg-red-100 text-red-800'
                                          : 'bg-yellow-100 text-yellow-800'
                                        }`}>
                                        {visit.status}
                                      </span>
                                    </div>

                                    <div className="space-y-1">
                                      <div className="flex items-center space-x-2 text-sm">
                                        <span className="text-gray-600 flex items-center gap-1"><Icons.user className="w-3 h-3" /> Mitra:</span>
                                        <span className="font-medium text-gray-900">
                                          {visit.mitraName || 'Not assigned'}
                                        </span>
                                        {mitraChanged && (
                                          <span className="px-2 py-0.5 text-xs font-medium bg-blue-100 text-blue-700 rounded">
                                            Changed
                                          </span>
                                        )}
                                      </div>

                                      {visit.actualDate && (
                                        <div className="text-xs text-gray-500 space-y-0.5">
                                          <div>✓ Completed on: {visit.actualDate}</div>
                                          {visit.updatedBy && (
                                            <div className="text-gray-400">
                                              Updated by: {visit.updatedBy}
                                            </div>
                                          )}
                                        </div>
                                      )}

                                      {visit.visitNotes && (
                                        <div className="text-xs text-gray-600 mt-2">
                                          <span className="font-medium">Notes:</span> {visit.visitNotes}
                                        </div>
                                      )}
                                    </div>
                                  </div>

                                  <div className="flex flex-col items-end space-y-2 ml-4">
                                    {mitraChanged && (
                                      <button
                                        onClick={() => openHistoryModal(visit)}
                                        className="text-xs text-blue-600 hover:text-blue-800 font-medium"
                                      >
                                        📋 View Change History
                                      </button>
                                    )}
                                  </div>
                                </div>
                              </div>
                            );
                          })}
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              </>
            )
          )}
        </div>
      </div>

      {/* Change Mitra Modal */}
      {showChangeMitraModal && selectedVisitForChange && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg shadow-xl max-w-md w-full max-h-[90vh] overflow-y-auto">
            <div className="p-6">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-semibold text-gray-900">Change Mitra</h3>
                <button
                  onClick={() => setShowChangeMitraModal(false)}
                  className="text-gray-400 hover:text-gray-600"
                >
                  <span className="text-2xl">&times;</span>
                </button>
              </div>

              <div className="mb-4 p-3 bg-gray-50 rounded-lg">
                <p className="text-sm text-gray-600">Visit #{selectedVisitForChange.visitNumber}</p>
                <p className="text-sm font-medium text-gray-900">
                  {selectedVisitForChange.scheduledDate} ({selectedVisitForChange.scheduledDay})
                </p>
                <p className="text-sm text-gray-600 mt-1">
                  Current Mitra: <span className="font-medium">{selectedVisitForChange.mitraName}</span>
                </p>
              </div>

              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Select New Mitra <span className="text-red-500">*</span>
                  </label>
                  {/* Search Box */}
                  <input
                    type="text"
                    placeholder="🔍 Search mitra by name or code..."
                    value={mitraSearchQuery}
                    onChange={(e) => setMitraSearchQuery(e.target.value)}
                    className="w-full px-3 py-2 mb-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  />
                  {loadingAvailableMitras ? (
                    <div className="text-sm text-gray-500">Loading available mitras...</div>
                  ) : (
                    <select
                      value={newMitraId}
                      onChange={(e) => setNewMitraId(e.target.value)}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                      size={Math.min(availableMitrasForChange.filter(mitra =>
                        mitraSearchQuery === '' ||
                        mitra.mitraName?.toLowerCase().includes(mitraSearchQuery.toLowerCase()) ||
                        mitra.mitraCode?.toLowerCase().includes(mitraSearchQuery.toLowerCase())
                      ).length + 1, 8)}
                    >
                      <option value="">-- Select Mitra --</option>
                      {availableMitrasForChange
                        .filter(mitra =>
                          mitraSearchQuery === '' ||
                          mitra.mitraName?.toLowerCase().includes(mitraSearchQuery.toLowerCase()) ||
                          mitra.mitraCode?.toLowerCase().includes(mitraSearchQuery.toLowerCase())
                        )
                        .map((mitra) => (
                          <option key={mitra.id} value={mitra.id}>
                            {mitra.mitraName} ({mitra.mitraCode}) - {mitra.availableHours}h available
                          </option>
                        ))}
                    </select>
                  )}
                  {!loadingAvailableMitras && availableMitrasForChange.length === 0 && (
                    <p className="text-sm text-red-600 mt-1">
                      No available mitras found for this date
                    </p>
                  )}
                  {!loadingAvailableMitras && availableMitrasForChange.length > 0 &&
                   availableMitrasForChange.filter(mitra =>
                     mitraSearchQuery === '' ||
                     mitra.mitraName?.toLowerCase().includes(mitraSearchQuery.toLowerCase()) ||
                     mitra.mitraCode?.toLowerCase().includes(mitraSearchQuery.toLowerCase())
                   ).length === 0 && (
                    <p className="text-sm text-amber-600 mt-1">
                      No mitras match your search. Try different keywords.
                    </p>
                  )}
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Reason for Change <span className="text-red-500">*</span>
                  </label>
                  <textarea
                    value={changeReason}
                    onChange={(e) => setChangeReason(e.target.value)}
                    placeholder="e.g., Mitra sakit, Mitra ada keperluan mendadak, dll."
                    rows={3}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  />
                </div>
              </div>

              <div className="flex items-center justify-end space-x-3 mt-6 pt-4 border-t">
                <button
                  onClick={() => setShowChangeMitraModal(false)}
                  disabled={changingMitra}
                  className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 disabled:opacity-50"
                >
                  Cancel
                </button>
                <button
                  onClick={handleChangeMitra}
                  disabled={changingMitra || !newMitraId || !changeReason.trim()}
                  className="px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {changingMitra ? 'Changing...' : 'Change Mitra'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* History Viewer Modal */}
      {/* Cancel Visit Modal */}
      {showCancelVisitModal && (selectedVisitForCancel || pendingCancelStatus === 'Cancelled') && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg shadow-xl max-w-md w-full">
            <div className="p-6">
              <h3 className="text-lg font-semibold text-gray-900 mb-4">
                {selectedVisitForCancel
                  ? `Cancel Visit #${selectedVisitForCancel.visitNumber}`
                  : `Cancel All Visits (${trialVisits.filter(v => v.status !== 'Cancelled').length} visits)`}
              </h3>
              {selectedVisitForCancel ? (
                <p className="text-sm text-gray-600 mb-4">
                  {selectedVisitForCancel.scheduledDate} ({selectedVisitForCancel.scheduledDay})
                </p>
              ) : (
                <p className="text-sm text-gray-600 mb-4">
                  Trial status is being set to <strong>Cancelled</strong>. All active visits will be cancelled.
                </p>
              )}
              <div className="mb-4">
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Cancellation Reason *
                </label>
                <textarea
                  value={cancelReason}
                  onChange={(e) => setCancelReason(e.target.value)}
                  placeholder="Enter reason for cancellation..."
                  rows={3}
                  className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm focus:ring-red-500 focus:border-red-500"
                />
              </div>
              <div className="flex justify-end space-x-3">
                <button
                  onClick={() => {
                    setShowCancelVisitModal(false);
                    setSelectedVisitForCancel(null);
                    setPendingCancelStatus(null);
                    setCancelReason('');
                  }}
                  className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50"
                >
                  Back
                </button>
                <button
                  onClick={saveCancelVisit}
                  disabled={loadingCancelVisit || !cancelReason.trim()}
                  className="px-4 py-2 text-sm font-medium text-white bg-red-600 rounded-md hover:bg-red-700 disabled:opacity-50"
                >
                  {loadingCancelVisit ? 'Cancelling...' : 'Cancel Visit'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {showHistoryModal && selectedVisitForHistory && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg shadow-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
            <div className="p-6">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-semibold text-gray-900">Mitra Change History</h3>
                <button
                  onClick={() => setShowHistoryModal(false)}
                  className="text-gray-400 hover:text-gray-600"
                >
                  <span className="text-2xl">&times;</span>
                </button>
              </div>

              <div className="mb-4 p-3 bg-gray-50 rounded-lg">
                <p className="text-sm text-gray-600">Visit #{selectedVisitForHistory.visitNumber}</p>
                <p className="text-sm font-medium text-gray-900">
                  {selectedVisitForHistory.scheduledDate} ({selectedVisitForHistory.scheduledDay})
                </p>
                <p className="text-sm text-gray-600 mt-1">
                  Current Mitra: <span className="font-medium">{selectedVisitForHistory.mitraName}</span>
                </p>
              </div>

              <div className="space-y-3">
                {loadingHistory ? (
                  <div className="text-sm text-gray-500 text-center py-8">Loading history...</div>
                ) : mitraChangeHistory.length === 0 ? (
                  <div className="text-sm text-gray-500 text-center py-8">No change history found</div>
                ) : (
                  <>
                    <div className="text-sm font-medium text-gray-700 mb-2">
                      Total Changes: {mitraChangeHistory.length}
                    </div>
                    {mitraChangeHistory.map((change, index) => (
                      <div key={change.id} className="border border-gray-200 rounded-lg p-4 bg-white">
                        <div className="flex items-start justify-between">
                          <div className="flex-1">
                            <div className="flex items-center space-x-2 mb-2">
                              <span className="inline-flex items-center justify-center w-6 h-6 rounded-full bg-blue-100 text-blue-700 text-xs font-medium">
                                {change.sequenceNumber}
                              </span>
                              <span className="text-sm font-medium text-gray-900">
                                Change #{change.sequenceNumber}
                              </span>
                            </div>

                            <div className="flex items-center space-x-2 mb-2">
                              <span className="text-sm text-gray-700">{change.fromMitraName}</span>
                              <span className="text-gray-400">→</span>
                              <span className="text-sm font-medium text-gray-900">{change.toMitraName}</span>
                            </div>

                            <div className="mb-2">
                              <p className="text-xs text-gray-500 mb-1">Reason:</p>
                              <p className="text-sm text-gray-700">{change.changeReason}</p>
                            </div>

                            <div className="text-xs text-gray-500">
                              Changed on {new Date(change.changedAt).toLocaleString('en-US', {
                                year: 'numeric',
                                month: 'short',
                                day: 'numeric',
                                hour: '2-digit',
                                minute: '2-digit'
                              })}
                            </div>
                          </div>
                        </div>
                      </div>
                    ))}
                  </>
                )}
              </div>

              <div className="flex items-center justify-end mt-6 pt-4 border-t">
                <button
                  onClick={() => setShowHistoryModal(false)}
                  className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50"
                >
                  Close
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Availability Warning Modal */}
      {showAvailabilityWarning && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 max-w-md w-full mx-4">
            <h3 className="text-lg font-semibold text-yellow-900 mb-4 flex items-center">
              <span className="text-2xl mr-2">⚠️</span>
              Mitra Availability Warning
            </h3>
            <div className="mb-6">
              <p className="text-sm text-gray-700 whitespace-pre-line">
                {availabilityWarningMessage}
              </p>
            </div>
            <div className="flex gap-3 justify-end">
              <button
                onClick={() => {
                  setShowAvailabilityWarning(false);
                  cancelEditingDate();
                }}
                className="btn-secondary"
              >
                Cancel
              </button>
              <button
                onClick={() => {
                  if (editingDateVisitId) {
                    saveEditedDate(editingDateVisitId, true);
                  }
                }}
                className="bg-yellow-600 hover:bg-yellow-700 text-white px-4 py-2 rounded transition-colors"
              >
                Continue Anyway
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
