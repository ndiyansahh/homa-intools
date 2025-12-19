'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { SessionData } from '@/types/auth';
import { CustomerData } from '@/types/customer';
import { Icons } from './icons';

interface CustomerDetailProps {
  customerId: string;
  session: SessionData;
}

const statusColors: { [key: string]: string } = {
  'Active': 'bg-green-100 text-green-800',
  'Churn': 'bg-red-100 text-red-800',
  'Inactive': 'bg-gray-100 text-gray-800',
  'Pending': 'bg-yellow-100 text-yellow-800',
};

const churnTagColors = {
  'Internal': 'bg-red-100 text-red-800',
  'External': 'bg-orange-100 text-orange-800',
  'N/A': 'bg-gray-100 text-gray-800',
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

// Visit types
interface Visit {
  id: string;
  customerId: string;
  mitraId: string;
  originalMitraId: string | null;
  actualMitraId: string | null;
  visitNumber: number;
  scheduledDate: string;
  scheduledDay: string;
  actualDate: string | null;
  status: string;
  durationHours: number;
  visitNotes: string | null;
  mitraName: string | null;
  mitraPhone: string | null;
  subscriptionPackage: string | null;
  subscriptionStart: string | null;
  createdAt: string;
  updatedAt: string;
  completedAt: string | null;
  updatedBy?: string;
  updatedByAt?: string;
}

export default function CustomerDetail({ customerId, session }: CustomerDetailProps) {
  const router = useRouter();
  const [customer, setCustomer] = useState<CustomerData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Action states
  const [showUpdateDate, setShowUpdateDate] = useState(false);
  const [showAssignCleaner, setShowAssignCleaner] = useState(false);
  const [actionLoading, setActionLoading] = useState(false);

  // Form states
  const [newDate, setNewDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [cleaner1, setCleaner1] = useState('');
  const [cleaner2, setCleaner2] = useState('');
  const [availableCleaners, setAvailableCleaners] = useState<string[]>([]);

  // Edit customer form states
  const [editCustomerName, setEditCustomerName] = useState('');
  const [editContact, setEditContact] = useState('');
  const [editAddress, setEditAddress] = useState('');
  const [editCity, setEditCity] = useState('');
  const [editDistrict, setEditDistrict] = useState('');
  const [editVillage, setEditVillage] = useState('');
  const [editPostalCode, setEditPostalCode] = useState('');
  const [editSubscriptionPackage, setEditSubscriptionPackage] = useState('');
  const [editStatus, setEditStatus] = useState('');

  // Region dropdown data
  const [cities, setCities] = useState<Array<{ id: string; name: string }>>([]);
  const [districts, setDistricts] = useState<Array<{ id: string; name: string; city_id: string }>>([]);
  const [villages, setVillages] = useState<Array<{ id: string; name: string; district_id: string; postal_code: string }>>([]);

  // Visit/Attendance states
  const [visits, setVisits] = useState<Visit[]>([]);
  const [loadingVisits, setLoadingVisits] = useState(false);
  const [editingDateVisitId, setEditingDateVisitId] = useState<string | null>(null);
  const [editingDateValue, setEditingDateValue] = useState('');
  const [editingDateMitraId, setEditingDateMitraId] = useState<string | null>(null); // Store mitra ID for availability check
  const [checkingAvailability, setCheckingAvailability] = useState(false);
  const [showAvailabilityWarning, setShowAvailabilityWarning] = useState(false);
  const [availabilityWarningMessage, setAvailabilityWarningMessage] = useState('');
  const [selectedVisitForChange, setSelectedVisitForChange] = useState<Visit | null>(null);
  const [availableMitrasForChange, setAvailableMitrasForChange] = useState<any[]>([]);
  const [selectedNewMitra, setSelectedNewMitra] = useState('');
  const [changeReason, setChangeReason] = useState('');
  const [loadingMitraChange, setLoadingMitraChange] = useState(false);
  const [showHistoryModal, setShowHistoryModal] = useState(false);
  const [selectedVisitHistory, setSelectedVisitHistory] = useState<any>(null);

  // Cancel visit with reason states
  const [showCancelReasonModal, setShowCancelReasonModal] = useState(false);
  const [selectedVisitForCancel, setSelectedVisitForCancel] = useState<Visit | null>(null);
  const [cancelReason, setCancelReason] = useState('');
  const [loadingCancelVisit, setLoadingCancelVisit] = useState(false);

  // Single visit reschedule states
  const [showSingleRescheduleModal, setShowSingleRescheduleModal] = useState(false);
  const [selectedVisitForReschedule, setSelectedVisitForReschedule] = useState<Visit | null>(null);
  const [singleRescheduleDate, setSingleRescheduleDate] = useState('');
  const [singleRescheduleMitra, setSingleRescheduleMitra] = useState('');
  const [availableMitrasForSingle, setAvailableMitrasForSingle] = useState<any[]>([]);
  const [loadingSingleReschedule, setLoadingSingleReschedule] = useState(false);
  const [loadingSingleAvailability, setLoadingSingleAvailability] = useState(false);

  // Generate visit schedule states
  const [showGenerateSchedule, setShowGenerateSchedule] = useState(false);
  const [scheduleStartDate, setScheduleStartDate] = useState('');
  const [scheduleEndDate, setScheduleEndDate] = useState('');
  const [selectedDay, setSelectedDay] = useState('');
  const [selectedMitraForSchedule, setSelectedMitraForSchedule] = useState('');
  const [allMitras, setAllMitras] = useState<any[]>([]);
  const [availableMitras, setAvailableMitras] = useState<any[]>([]);
  const [loadingSchedule, setLoadingSchedule] = useState(false);
  const [loadingAvailability, setLoadingAvailability] = useState(false);

  useEffect(() => {
    fetchCustomer();
    fetchAvailableCleaners();
  }, [customerId]);

  // Load visits when customer data is loaded
  useEffect(() => {
    console.log('🔄 Customer state changed, customer:', customer?.id);
    if (customer) {
      console.log('✅ Customer loaded, fetching visits for:', customer.id);
      fetchVisits();
    } else {
      console.log('⏳ Customer not yet loaded');
    }
  }, [customer]);

  const fetchCustomer = async () => {
    try {
      setLoading(true);
      setError(null);
      const response = await fetch(`/api/customers/${customerId}`);
      
      if (response.ok) {
        const result = await response.json();
        if (result.success && result.data) {
          console.log('📦 Customer data loaded:', result.data.id, result.data.customerName);
          setCustomer(result.data);
          setNewDate(result.data.firstDateSubscription || '');
          setCleaner1(result.data.cleaner1 || '');
          setCleaner2(result.data.cleaner2 || '');
          // Don't set error for warning messages when data loads successfully
          if (result.message && process.env.NODE_ENV === 'development') {
            console.warn('Customer API warning:', result.message);
          }
        } else {
          setError('Failed to load customer details');
          console.error('❌ Failed to load customer, no data in result');
        }
      } else {
        const errorData = await response.json().catch(() => ({}));
        setError(errorData.message || 'Failed to load customer details');
      }
    } catch (err) {
      setError('Failed to load customer details');
    } finally {
      setLoading(false);
    }
  };

  const fetchAvailableCleaners = async () => {
    try {
      const response = await fetch(`/api/customers/${customerId}/assign-cleaner`);
      if (response.ok) {
        const data = await response.json();
        setAvailableCleaners(data.availableCleaners || []);
      }
    } catch (err) {
      console.error('Error fetching cleaners:', err);
    }
  };

  // Fetch customer visits
  const fetchVisits = async () => {
    if (!customer) return;

    try {
      setLoadingVisits(true);
      // Add view=customer parameter to get filtered visits based on subscription package
      const response = await fetch(`/api/trial/${customerId}/visits?view=customer&_t=${Date.now()}`);
      if (response.ok) {
        const result = await response.json();
        if (result.success && result.data) {
          console.log('📊 Customer visits loaded:', {
            total: result.data.length,
            done: result.data.filter((v: any) => v.status === 'Done').length,
            scheduled: result.data.filter((v: any) => v.status === 'Scheduled').length,
            cancelled: result.data.filter((v: any) => v.status === 'Cancelled').length,
            package: customer.subscriptionPackage,
            visits: result.data
          });
          setVisits(result.data);
        } else {
          console.warn('⚠️ No visits data returned:', result);
        }
      } else {
        console.error('❌ Failed to fetch visits, status:', response.status);
        const errorText = await response.text();
        console.error('Error response:', errorText);
      }
    } catch (error) {
      console.error('❌ Error fetching customer visits:', error);
    } finally {
      setLoadingVisits(false);
    }
  };

  // Fetch cities for region dropdown
  const fetchCities = async () => {
    try {
      const response = await fetch('/api/regions/cities');
      if (response.ok) {
        const data = await response.json();
        setCities(data.data || []);
      }
    } catch (error) {
      console.error('Error fetching cities:', error);
    }
  };

  // Fetch districts based on city
  const fetchDistricts = async (cityName: string) => {
    if (!cityName) {
      setDistricts([]);
      return;
    }
    try {
      const response = await fetch(`/api/regions/districts?city_id=${encodeURIComponent(cityName)}`);
      if (response.ok) {
        const data = await response.json();
        setDistricts(data.data || []);
      }
    } catch (error) {
      console.error('Error fetching districts:', error);
    }
  };

  // Fetch villages based on district
  const fetchVillages = async (districtName: string) => {
    if (!districtName) {
      setVillages([]);
      return;
    }
    try {
      const response = await fetch(`/api/regions/villages?district_id=${encodeURIComponent(districtName)}`);
      if (response.ok) {
        const data = await response.json();
        setVillages(data.data || []);
      }
    } catch (error) {
      console.error('Error fetching villages:', error);
    }
  };

  // Update visit attendance
  const updateVisitAttendance = async (visitId: string, attended: boolean) => {
    try {
      const response = await fetch(`/api/trial/${customerId}/visits`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          visitId,
          status: attended ? 'Done' : 'Scheduled',
          actualDate: attended ? new Date().toISOString().split('T')[0] : null,
        }),
      });

      if (response.ok) {
        await fetchVisits(); // Refresh visits
      } else {
        const error = await response.json();
        alert(error.message || 'Failed to update attendance');
      }
    } catch (error) {
      console.error('Error updating attendance:', error);
      alert('Failed to update attendance');
    }
  };

  // Cancel or undo cancel visit
  const handleCancelVisit = async (visitId: string, currentStatus: string) => {
    const isCancelling = currentStatus !== 'Cancelled';

    if (isCancelling) {
      // User is cancelling a scheduled visit - show modal to get reason
      const visit = visits.find(v => v.id === visitId);
      if (visit) {
        setSelectedVisitForCancel(visit);
        setCancelReason('');
        setShowCancelReasonModal(true);
      }
    } else {
      // User is rescheduling a cancelled visit - open modal
      const visit = visits.find(v => v.id === visitId);
      if (visit) {
        setSelectedVisitForReschedule(visit);
        setSingleRescheduleDate(visit.scheduledDate); // Prefill with original date
        setSingleRescheduleMitra(visit.actualMitraId || ''); // Prefill with original mitra
        setShowSingleRescheduleModal(true);
      }
    }
  };

  // Save cancellation with reason
  const saveCancelVisit = async () => {
    if (!selectedVisitForCancel || !cancelReason.trim()) {
      alert('Please provide a reason for cancelling this visit');
      return;
    }

    try {
      setLoadingCancelVisit(true);
      const response = await fetch(`/api/trial/${customerId}/visits`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          visitId: selectedVisitForCancel.id,
          status: 'Cancelled',
          visitNotes: `Cancellation reason: ${cancelReason}`, // Store reason in visitNotes
        }),
      });

      if (response.ok) {
        setShowCancelReasonModal(false);
        setSelectedVisitForCancel(null);
        setCancelReason('');
        await fetchVisits(); // Refresh visits
        alert('Visit cancelled successfully');
      } else {
        const error = await response.json();
        alert(error.message || 'Failed to cancel visit');
      }
    } catch (error) {
      console.error('Error cancelling visit:', error);
      alert('Failed to cancel visit');
    } finally {
      setLoadingCancelVisit(false);
    }
  };

  // Check mitra availability for single visit reschedule
  const checkSingleVisitAvailability = async () => {
    if (!singleRescheduleDate || !customer || !allMitras.length) return;

    try {
      setLoadingSingleAvailability(true);
      const dateObj = new Date(singleRescheduleDate);
      const dayName = dateObj.toLocaleDateString('en-US', { weekday: 'long' });

      const response = await fetch('/api/mitras/check-availability', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          dayPattern: [singleRescheduleDate],
          startDate: singleRescheduleDate,
          endDate: singleRescheduleDate,
          city: customer.city,
          district: customer.district,
        }),
      });

      if (response.ok) {
        const result = await response.json();
        if (result.success && result.data) {
          const available = result.data.availableMitras || [];
          setAvailableMitrasForSingle(available);

          // Auto-select mitra if current selection is available
          if (singleRescheduleMitra) {
            const isAvailable = available.some((m: any) => (m.mitraId || m.id) === singleRescheduleMitra);
            if (!isAvailable && available.length > 0) {
              // Current mitra not available, select first available
              setSingleRescheduleMitra(available[0].mitraId || available[0].id);
            }
          } else if (available.length > 0) {
            // No mitra selected, select first available
            setSingleRescheduleMitra(available[0].mitraId || available[0].id);
          }
        }
      } else {
        // Fallback to all mitras
        setAvailableMitrasForSingle(allMitras);
      }
    } catch (error) {
      console.error('Error checking availability:', error);
      setAvailableMitrasForSingle(allMitras);
    } finally {
      setLoadingSingleAvailability(false);
    }
  };

  // Save single visit reschedule
  const saveSingleVisitReschedule = async () => {
    if (!selectedVisitForReschedule || !singleRescheduleDate || !singleRescheduleMitra) {
      alert('Please select both date and mitra');
      return;
    }

    try {
      setLoadingSingleReschedule(true);

      // Get day name from selected date
      const dateObj = new Date(singleRescheduleDate);
      const dayName = dateObj.toLocaleDateString('en-US', { weekday: 'long' });

      const response = await fetch(`/api/trial/${customerId}/visits`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          visitId: selectedVisitForReschedule.id,
          status: 'Scheduled',
          scheduledDate: singleRescheduleDate,
          scheduledDay: dayName,
          actualMitraId: singleRescheduleMitra,
        }),
      });

      if (response.ok) {
        alert('Visit rescheduled successfully!');
        setShowSingleRescheduleModal(false);
        setSelectedVisitForReschedule(null);
        setSingleRescheduleDate('');
        setSingleRescheduleMitra('');
        setAvailableMitrasForSingle([]);
        await fetchVisits(); // Refresh visits
      } else {
        const error = await response.json();
        alert(error.message || 'Failed to reschedule visit');
      }
    } catch (error) {
      console.error('Error rescheduling visit:', error);
      alert('Failed to reschedule visit');
    } finally {
      setLoadingSingleReschedule(false);
    }
  };

  // Check mitra availability for editing visit date
  const checkMitraAvailabilityForDate = async (mitraId: string, date: string, visitId: string) => {
    if (!mitraId || !date || !customer) return true; // Skip if no mitra, date, or customer

    try {
      setCheckingAvailability(true);

      // Get day name from date
      const dateObj = new Date(date);
      const dayName = dateObj.toLocaleDateString('en-US', { weekday: 'long' });

      // Use the same check-availability endpoint as generate schedule
      const response = await fetch('/api/mitras/check-availability', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          dayPattern: [date], // Single date to check
          startDate: date,
          endDate: date,
          city: customer.city,
          district: customer.district,
        }),
      });

      if (response.ok) {
        const result = await response.json();

        if (result.success && result.data) {
          const availableMitras = result.data.availableMitras || [];

          // Check if current mitra is available on this date
          const isAvailable = availableMitras.some((m: any) =>
            m.mitraId === mitraId || m.id === mitraId
          );

          if (!isAvailable) {
            const mitraName = visits.find(v => v.id === visitId)?.mitraName || 'Assigned mitra';
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

      return true; // Default to allowing if check fails
    } catch (error) {
      console.error('Error checking availability:', error);
      return true; // Default to allowing if error
    } finally {
      setCheckingAvailability(false);
    }
  };

  // Start editing visit date
  const startEditingDate = (visit: Visit) => {
    setEditingDateVisitId(visit.id);
    setEditingDateValue(visit.scheduledDate);
    setEditingDateMitraId(visit.actualMitraId || visit.mitraId);
  };

  // Cancel editing date
  const cancelEditingDate = () => {
    setEditingDateVisitId(null);
    setEditingDateValue('');
    setEditingDateMitraId(null);
    setShowAvailabilityWarning(false);
  };

  // Save edited date
  const saveEditedDate = async (visitId: string, forceUpdate: boolean = false) => {
    if (!editingDateValue) {
      alert('Please select a valid date');
      return;
    }

    // Check mitra availability before saving (unless forced)
    if (!forceUpdate && editingDateMitraId) {
      const isAvailable = await checkMitraAvailabilityForDate(editingDateMitraId, editingDateValue, visitId);
      if (!isAvailable) {
        // Warning modal will be shown, user can choose to continue
        return;
      }
    }

    try {
      const response = await fetch(`/api/trial/${customerId}/visits`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          visitId,
          scheduledDate: editingDateValue,
        }),
      });

      if (response.ok) {
        setEditingDateVisitId(null);
        setEditingDateValue('');
        setEditingDateMitraId(null);
        setShowAvailabilityWarning(false);
        await fetchVisits();
      } else {
        const error = await response.json();
        alert(error.message || 'Failed to update date');
      }
    } catch (error) {
      console.error('Error updating date:', error);
      alert('Failed to update date');
    }
  };

  // Open change mitra modal
  const openChangeMitraModal = async (visit: Visit) => {
    setSelectedVisitForChange(visit);
    setSelectedNewMitra('');
    setChangeReason('');

    // Fetch available mitras for this visit date
    try {
      const response = await fetch(`/api/trial/${customerId}/visits/${visit.id}/available-mitras`);
      if (response.ok) {
        const result = await response.json();
        if (result.success) {
          setAvailableMitrasForChange(result.data.availableMitras || []);
        }
      }
    } catch (error) {
      console.error('Error fetching available mitras:', error);
    }
  };

  // Save mitra change
  const saveMitraChange = async () => {
    if (!selectedVisitForChange || !selectedNewMitra || !changeReason.trim()) {
      alert('Please select a mitra and provide a reason for the change');
      return;
    }

    try {
      setLoadingMitraChange(true);
      const response = await fetch(`/api/trial/${customerId}/visits/${selectedVisitForChange.id}/change-mitra`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          newMitraId: selectedNewMitra,
          reason: changeReason,
        }),
      });

      if (response.ok) {
        const result = await response.json();
        setSelectedVisitForChange(null);
        await fetchVisits();
        alert(result.message || 'Mitra changed successfully.');
      } else {
        const error = await response.json();
        alert(error.message || 'Failed to change mitra');
      }
    } catch (error) {
      console.error('Error changing mitra:', error);
      alert('Failed to change mitra');
    } finally {
      setLoadingMitraChange(false);
    }
  };

  // Open history modal
  const openHistoryModal = (visit: Visit) => {
    setSelectedVisitHistory(visit);
    setShowHistoryModal(true);
  };

  // Fetch all mitras for schedule generation
  const fetchAllMitras = async () => {
    try {
      const response = await fetch('/api/mitra?status=Active');
      if (response.ok) {
        const result = await response.json();
        console.log('Mitra API response:', result);

        // Handle different response formats
        if (result.items && Array.isArray(result.items)) {
          console.log('Setting mitras from result.items:', result.items.length);
          console.log('First mitra structure:', result.items[0]);
          setAllMitras(result.items);
        } else if (result.success && result.data) {
          console.log('Setting mitras from result.data:', result.data.length);
          setAllMitras(result.data);
        } else if (Array.isArray(result)) {
          console.log('Setting mitras from array response:', result.length);
          setAllMitras(result);
        } else if (result.mitras) {
          console.log('Setting mitras from result.mitras:', result.mitras.length);
          setAllMitras(result.mitras);
        } else {
          console.warn('Unexpected mitra response format:', result);
        }
      } else {
        console.error('Mitra API error:', response.status);
      }
    } catch (error) {
      console.error('Error fetching mitras:', error);
    }
  };

  // Check mitra availability for schedule
  const checkMitraAvailability = async () => {
    if (!scheduleStartDate || !selectedDay || !customer) {
      console.log('Missing required data for availability check');
      return;
    }

    try {
      setLoadingAvailability(true);

      // Generate list of dates based on selected day
      const start = new Date(scheduleStartDate);
      const end = scheduleEndDate ? new Date(scheduleEndDate) : new Date(start.getTime() + 30 * 24 * 60 * 60 * 1000);
      const scheduledDates: string[] = [];

      const currentDate = new Date(start);
      while (currentDate <= end) {
        const dayName = currentDate.toLocaleDateString('en-US', { weekday: 'long' });
        if (dayName === selectedDay) {
          scheduledDates.push(currentDate.toISOString().split('T')[0]);
        }
        currentDate.setDate(currentDate.getDate() + 1);
      }

      console.log('Checking availability for dates:', scheduledDates);
      console.log('Customer location:', customer.city, customer.district);

      // Call API to check availability
      const endDateValue = scheduleEndDate || end.toISOString().split('T')[0];
      const response = await fetch('/api/mitras/check-availability', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          dayPattern: scheduledDates,
          startDate: scheduleStartDate,
          endDate: endDateValue,
          city: customer.city,
          district: customer.district,
        }),
      });

      if (response.ok) {
        const result = await response.json();
        console.log('Availability check result:', result);

        if (result.success && result.data) {
          const available = result.data.availableMitras || [];
          console.log('Available mitras:', available.length);
          setAvailableMitras(available);

          if (available.length === 0) {
            alert('No mitras available for all scheduled dates in this area. Please try different dates or contact admin.');
          }
        }
      } else {
        console.error('Availability check failed:', response.status);
        // Fallback: show all mitras if check fails
        setAvailableMitras(allMitras);
      }
    } catch (error) {
      console.error('Error checking availability:', error);
      // Fallback: show all mitras if check fails
      setAvailableMitras(allMitras);
    } finally {
      setLoadingAvailability(false);
    }
  };

  // Check if there are cancelled visits
  const hasCancelledVisits = visits.some(v => v.status === 'Cancelled');

  // Generate visit schedule
  const generateVisitSchedule = async () => {
    if (!scheduleStartDate || !selectedDay || !selectedMitraForSchedule) {
      alert('Please fill in start date, select a day, and assign a mitra');
      return;
    }

    const completedVisits = visits.filter(v => v.status === 'Done').length;
    const scheduledVisits = visits.filter(v => v.status === 'Scheduled').length;
    const cancelledVisits = visits.filter(v => v.status === 'Cancelled').length;

    // Check if there are cancelled visits to reschedule
    if (cancelledVisits === 0) {
      alert('No cancelled visits to reschedule. This feature is only available when you have cancelled visits.');
      return;
    }

    let confirmMessage = `Reschedule ${cancelledVisits} cancelled visit(s) to every ${selectedDay}?`;

    if (visits.length > 0) {
      confirmMessage += `\n\nWhat will happen:`;
      confirmMessage += `\n• ${completedVisits} completed visits → preserved`;
      if (scheduledVisits > 0) confirmMessage += `\n• ${scheduledVisits} scheduled visits → preserved`;
      confirmMessage += `\n• ${cancelledVisits} cancelled visits → replaced with new schedule`;
      confirmMessage += `\n\nYou will create ${cancelledVisits} new visit(s).`;
    }

    if (!confirm(confirmMessage)) {
      return;
    }

    try {
      setLoadingSchedule(true);
      const response = await fetch(`/api/trial/${customerId}/visits`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          startDate: scheduleStartDate,
          endDate: scheduleEndDate || null,
          selectedDay: selectedDay,
          mitraId: selectedMitraForSchedule,
        }),
      });

      if (response.ok) {
        const result = await response.json();
        alert(result.message || 'Cancelled visits have been rescheduled successfully!');
        setShowGenerateSchedule(false);
        await fetchVisits(); // Refresh visits
      } else {
        const error = await response.json();
        alert(error.message || 'Failed to reschedule cancelled visits');
      }
    } catch (error) {
      console.error('Error rescheduling visits:', error);
      alert('Failed to reschedule cancelled visits');
    } finally {
      setLoadingSchedule(false);
    }
  };

  // Initialize schedule modal when opened
  useEffect(() => {
    if (showGenerateSchedule) {
      console.log('Modal opened, auto-detecting schedule data...');

      const hasCancelled = visits.some(v => v.status === 'Cancelled');

      // DON'T auto-set mitra here - wait for availability check first
      // We will set mitra after availableMitras is loaded

      // Fetch all mitras if there are cancelled visits (so user can change)
      if (hasCancelled) {
        console.log('Cancelled visits detected - fetching all mitras for selection');
        fetchAllMitras();
      }

      // Auto-detect visit day from existing visits
      if (visits.length > 0 && visits[0].scheduledDay) {
        console.log('Auto-detected visit day:', visits[0].scheduledDay);
        setSelectedDay(visits[0].scheduledDay);
      }

      // Initialize with customer's subscription dates if available
      if (customer?.firstDateSubscription) {
        try {
          const parts = customer.firstDateSubscription.split('/');
          if (parts.length === 3) {
            setScheduleStartDate(`${parts[2]}-${parts[1].padStart(2, '0')}-${parts[0].padStart(2, '0')}`);
          }
        } catch (e) {
          console.error('Error parsing start date:', e);
        }
      }
      if (customer?.subscriptionEnd) {
        try {
          const parts = customer.subscriptionEnd.split('/');
          if (parts.length === 3) {
            setScheduleEndDate(`${parts[2]}-${parts[1].padStart(2, '0')}-${parts[0].padStart(2, '0')}`);
          }
        } catch (e) {
          console.error('Error parsing end date:', e);
        }
      }
    } else {
      // Reset when modal closes
      setAvailableMitras([]);
      setSelectedMitraForSchedule('');
    }
  }, [showGenerateSchedule, customer, visits]);

  // Check availability when dates or day changes (only if there are cancelled visits)
  useEffect(() => {
    const hasCancelled = visits.some(v => v.status === 'Cancelled');
    if (showGenerateSchedule && scheduleStartDate && selectedDay && allMitras.length > 0 && hasCancelled) {
      console.log('Triggering availability check for cancelled visits...');
      checkMitraAvailability();
    }
  }, [scheduleStartDate, scheduleEndDate, selectedDay, showGenerateSchedule, allMitras, visits]);

  // Set default mitra when availableMitras is loaded - ONLY from available mitras
  useEffect(() => {
    if (showGenerateSchedule && availableMitras.length > 0) {
      console.log('Setting default mitra from available mitras. Count:', availableMitras.length);

      // Priority 1: Try to match with existing visit's mitra (if it's available)
      const currentMitraId = visits.length > 0 ? visits[0].actualMitraId : null;
      if (currentMitraId) {
        const currentMitra = availableMitras.find(m => (m.mitraId || m.id) === currentMitraId);
        if (currentMitra) {
          console.log('✅ Current mitra is available:', currentMitra.mitraName);
          setSelectedMitraForSchedule(currentMitraId);
          return;
        } else {
          console.log('❌ Current mitra NOT available for selected dates');
        }
      }

      // Priority 2: Try to match with customer's cleaner1
      if (customer?.cleaner1) {
        const mitra = availableMitras.find(m => m.mitraName === customer.cleaner1);
        if (mitra) {
          console.log('✅ Found cleaner1 in available mitras:', mitra.mitraName);
          setSelectedMitraForSchedule(mitra.mitraId || mitra.id);
          return;
        }
      }

      // Priority 3: Select first available mitra
      const firstMitra = availableMitras[0];
      console.log('ℹ️ Auto-selecting first available mitra:', firstMitra.mitraName || firstMitra.name);
      setSelectedMitraForSchedule(firstMitra.mitraId || firstMitra.id);
    }
  }, [availableMitras, showGenerateSchedule, customer, visits]);

  // Single visit reschedule modal initialization
  useEffect(() => {
    if (showSingleRescheduleModal && selectedVisitForReschedule) {
      // Fetch all mitras when modal opens
      if (allMitras.length === 0) {
        fetchAllMitras();
      }
    } else {
      // Reset when modal closes
      setAvailableMitrasForSingle([]);
      setSingleRescheduleDate('');
      setSingleRescheduleMitra('');
    }
  }, [showSingleRescheduleModal, selectedVisitForReschedule]);

  // Check availability when date changes in single visit reschedule
  useEffect(() => {
    if (showSingleRescheduleModal && singleRescheduleDate && allMitras.length > 0) {
      console.log('Checking availability for single visit reschedule...');
      checkSingleVisitAvailability();
    }
  }, [showSingleRescheduleModal, singleRescheduleDate, allMitras]);

  const handleUpdateDate = async () => {
    // Validate required fields
    if (!editCustomerName.trim() || !editContact.trim() || !editAddress.trim() || !editCity.trim() || !newDate.trim()) {
      alert('Please fill in all required fields (marked with *)');
      return;
    }

    try {
      setActionLoading(true);
      const response = await fetch(`/api/customers/${customerId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          customerName: editCustomerName,
          contact: editContact,
          address: editAddress,
          city: editCity,
          district: editDistrict,
          village: editVillage,
          postalCode: editPostalCode,
          subscriptionPackage: editSubscriptionPackage,
          status: editStatus,
          firstDateSubscription: newDate,
          subscriptionEnd: endDate || undefined,
        }),
      });

      if (response.ok) {
        alert('Customer updated successfully');
        setShowUpdateDate(false);
        fetchCustomer(); // Refresh customer data
      } else {
        const error = await response.json();
        alert(error.error || 'Failed to update customer');
      }
    } catch (error) {
      console.error('Error updating customer:', error);
      alert('Failed to update customer');
    } finally {
      setActionLoading(false);
    }
  };

  const handleAssignCleaner = async () => {
    try {
      setActionLoading(true);
      const response = await fetch(`/api/customers/${customerId}/assign-cleaner`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          cleaner1: cleaner1 || undefined, 
          cleaner2: cleaner2 || undefined 
        }),
      });

      if (response.ok) {
        alert('Cleaners assigned successfully');
        setShowAssignCleaner(false);
        fetchCustomer(); // Refresh customer data
      } else {
        const error = await response.json();
        alert(error.error || 'Failed to assign cleaners');
      }
    } catch (error) {
      console.error('Error assigning cleaners:', error);
      alert('Failed to assign cleaners');
    } finally {
      setActionLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="p-8 text-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto"></div>
        <p className="mt-2 text-gray-600">Loading customer details...</p>
      </div>
    );
  }

  if (error || !customer) {
    return (
      <div className="p-8 text-center">
        <Icons.close className="w-12 h-12 text-red-400 mx-auto mb-4" />
        <h3 className="text-lg font-medium text-gray-900 mb-2">Error Loading Customer</h3>
        <p className="text-gray-600 mb-4">{error}</p>
        <button 
          onClick={() => router.back()} 
          className="btn-secondary"
        >
          Go Back
        </button>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header with Actions */}
      <div className="flex items-center justify-between">
        <div>
          <button
            onClick={() => router.back()}
            className="text-blue-600 hover:text-blue-700 mb-2 flex items-center"
          >
            <Icons.chevronLeft className="w-4 h-4 mr-1" />
            Back to Customers
          </button>
          <h1 className="text-2xl font-semibold text-gray-900">Customer Details</h1>
          <p className="text-sm text-gray-600">Customer: {customer.customerName}</p>
        </div>
        
        {/* Action Buttons */}
        <div className="flex space-x-3">
          <button
            onClick={async () => {
              // Initialize form with current customer data
              setEditCustomerName(customer.customerName || '');
              setEditContact(customer.contact || '');
              setEditAddress(customer.address || '');
              setEditCity(customer.city || '');
              setEditDistrict(customer.district || '');
              setEditVillage(customer.village || '');
              setEditPostalCode(customer.postalCode || '');
              setEditSubscriptionPackage(customer.subscriptionPackage || '');
              setEditStatus(customer.status || '');
              setNewDate(customer.firstDateSubscription || '');
              setEndDate(customer.subscriptionEnd || '');

              // Fetch regions
              await fetchCities();
              if (customer.city) await fetchDistricts(customer.city);
              if (customer.district) await fetchVillages(customer.district);

              setShowUpdateDate(true);
            }}
            className="btn-primary"
          >
            Edit Customer
          </button>
          <button
            onClick={() => setShowGenerateSchedule(true)}
            className="btn-secondary"
          >
            Bulk Reschedule
          </button>
        </div>
      </div>

      {/* Customer Information Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Basic Information */}
        <div className="card p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Basic Information</h3>
          <div className="space-y-3">
            <div>
              <label className="block text-sm font-medium text-gray-700">Customer Name</label>
              <div className="mt-1 text-sm text-gray-900">{customer.customerName}</div>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700">Acquisition</label>
              <div className="mt-1">
                <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${acquisitionColors[customer.acquisition]}`}>
                  {customer.acquisition}
                </span>
              </div>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700">Contact</label>
              <div className="mt-1 text-sm text-gray-900">{customer.contact}</div>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700">Residential Type</label>
              <div className="mt-1">
                <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${residentialColors[customer.residentialType]}`}>
                  {customer.residentialType}
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* Location Information */}
        <div className="card p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Location Information</h3>
          <div className="space-y-3">
            <div>
              <label className="block text-sm font-medium text-gray-700">Address</label>
              <div className="mt-1 text-sm text-gray-900">{customer.address}</div>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700">Village</label>
              <div className="mt-1 text-sm text-gray-900">{customer.village}</div>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700">District</label>
              <div className="mt-1 text-sm text-gray-900">{customer.district}</div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700">City</label>
                <div className="mt-1 text-sm text-gray-900">{customer.city}</div>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700">Postal Code</label>
                <div className="mt-1 text-sm text-gray-900">{customer.postalCode}</div>
              </div>
            </div>
          </div>
        </div>

        {/* Subscription Information */}
        <div className="card p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Subscription Information</h3>
          <div className="space-y-3">
            <div>
              <label className="block text-sm font-medium text-gray-700">Subscription Package</label>
              <div className="mt-1 text-sm text-gray-900">{customer.subscriptionPackage}</div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700">Qty Package</label>
                <div className="mt-1 text-sm text-gray-900">{customer.qtyPackage}</div>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700">LTV (months)</label>
                <div className="mt-1 text-sm text-gray-900">{customer.ltv}</div>
              </div>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700">Monthly Fee</label>
              <div className="mt-1 text-sm text-gray-900">
                Rp {((customer as any).monthlyFee || 0).toLocaleString('id-ID')}
              </div>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700">First Date Subscription</label>
              <div className="mt-1 text-sm text-gray-900">{customer.firstDateSubscription}</div>
            </div>
            {customer.subscriptionEnd && (
              <div>
                <label className="block text-sm font-medium text-gray-700">EndDate Subscription</label>
                <div className="mt-1 text-sm text-gray-900">{customer.subscriptionEnd}</div>
              </div>
            )}
            <div>
              <label className="block text-sm font-medium text-gray-700">Status Customer</label>
              <div className="mt-1">
                <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${statusColors[customer.status] || 'bg-gray-100 text-gray-800'}`}>
                  {customer.status}
                </span>
              </div>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700">Churn Tag</label>
              <div className="mt-1">
                <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${churnTagColors[customer.churnTag]}`}>
                  {customer.churnTag}
                </span>
              </div>
            </div>
            {customer.churnReason && (
              <div>
                <label className="block text-sm font-medium text-gray-700">Churn Reason</label>
                <div className="mt-1 text-sm text-gray-900 bg-yellow-50 p-2 rounded">{customer.churnReason}</div>
              </div>
            )}
          </div>
        </div>

        {/* Mitra Information */}
        <div className="card p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Mitra Information</h3>
          <div className="space-y-6">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700">Assigned Mitra (Primary)</label>
                <div className="mt-1 text-sm text-gray-900">{customer.cleaner1 || 'Not assigned'}</div>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700">Assigned Mitra (Backup)</label>
                <div className="mt-1 text-sm text-gray-900">{customer.cleaner2 || 'Not assigned'}</div>
              </div>
            </div>

            {/* Attendance Record */}
            {visits.length > 0 && (
              <div className="pt-6 border-t border-gray-200">
                <h4 className="text-md font-medium text-gray-900 mb-4">
                  Attendance Record
                  {(customer.subscriptionPackage as string) !== 'Trial' && (
                    <span className="ml-2 text-xs text-gray-500">(Showing completed & scheduled visits)</span>
                  )}
                </h4>
                <div className="bg-gray-50 rounded-lg p-4">
                  <div className="space-y-3">
                    {visits.map((visit) => {
                      const mitraChanged = visit.originalMitraId && visit.actualMitraId && visit.originalMitraId !== visit.actualMitraId;
                      const isLocked = visit.status === 'Done';
                      const isCancelled = visit.status === 'Cancelled';
                      const isEditingThisDate = editingDateVisitId === visit.id;

                      // Display customer's current subscription package for all visits
                      const packageName = customer?.subscriptionPackage || visit.subscriptionPackage || 'N/A';

                      return (
                        <div key={visit.id} className={`p-4 rounded border ${isCancelled ? 'bg-gray-100 border-gray-300' : 'bg-white border-gray-200'}`}>
                          <div className="flex items-start justify-between">
                            <div className="flex-1">
                              <div className="flex items-center space-x-3 mb-2">
                                <span className="text-sm font-medium text-gray-900">
                                  Visit #{visit.visitNumber}
                                </span>
                                {!isLocked && !isCancelled && isEditingThisDate ? (
                                  <div className="flex items-center space-x-2">
                                    <input
                                      type="date"
                                      value={editingDateValue}
                                      onChange={(e) => setEditingDateValue(e.target.value)}
                                      className="text-sm border border-gray-300 rounded px-2 py-1"
                                    />
                                    <button
                                      onClick={() => saveEditedDate(visit.id)}
                                      className="text-xs text-green-600 hover:text-green-800"
                                    >
                                      ✓ Save
                                    </button>
                                    <button
                                      onClick={cancelEditingDate}
                                      className="text-xs text-red-600 hover:text-red-800"
                                    >
                                      ✗ Cancel
                                    </button>
                                  </div>
                                ) : (
                                  <>
                                    <span className={`text-sm ${isCancelled ? 'text-gray-400 line-through' : 'text-gray-600'}`}>
                                      {visit.scheduledDate} ({visit.scheduledDay})
                                    </span>
                                    {!isLocked && !isCancelled && (
                                      <button
                                        onClick={() => startEditingDate(visit)}
                                        className="text-xs text-indigo-600 hover:text-indigo-800"
                                      >
                                        ✏️ Edit
                                      </button>
                                    )}
                                  </>
                                )}
                                <span className={`px-2 py-1 text-xs font-medium rounded-full ${
                                  visit.status === 'Done'
                                    ? 'bg-green-100 text-green-800'
                                    : visit.status === 'Cancelled'
                                    ? 'bg-red-100 text-red-800'
                                    : 'bg-yellow-100 text-yellow-800'
                                }`}>
                                  {visit.status}
                                </span>
                              </div>

                              <div className="space-y-1">
                                {packageName && (
                                  <div className="text-xs text-gray-600 mb-1">
                                    📦 Package: <span className="font-medium">{packageName}</span>
                                  </div>
                                )}

                                <div className="flex items-center space-x-2 text-sm">
                                  <span className="text-gray-600">👤 Mitra:</span>
                                  <span className={`font-medium ${visit.status === 'Cancelled' ? 'text-gray-400 line-through' : 'text-gray-900'}`}>
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

                                {visit.status === 'Cancelled' && (
                                  <div className="text-xs text-red-600 font-medium">
                                    ✕ This visit has been cancelled
                                  </div>
                                )}
                              </div>
                            </div>

                            <div className="flex flex-col items-end space-y-2 ml-4">
                              {!isLocked && (
                                <div className="flex items-center space-x-2">
                                  {!isCancelled && (
                                    <button
                                      onClick={() => openChangeMitraModal(visit)}
                                      className="text-xs text-indigo-600 hover:text-indigo-800 font-medium"
                                    >
                                      Change Mitra
                                    </button>
                                  )}
                                  {visit.status === 'Cancelled' ? (
                                    <button
                                      onClick={() => handleCancelVisit(visit.id, visit.status)}
                                      className="text-xs text-green-600 hover:text-green-800 font-medium"
                                    >
                                      Mark as Scheduled
                                    </button>
                                  ) : (
                                    <button
                                      onClick={() => handleCancelVisit(visit.id, visit.status)}
                                      className="text-xs text-red-600 hover:text-red-800 font-medium"
                                    >
                                      Cancel Visit
                                    </button>
                                  )}
                                  {mitraChanged && !isCancelled && (
                                    <button
                                      onClick={() => openHistoryModal(visit)}
                                      className="text-xs text-blue-600 hover:text-blue-800 font-medium"
                                    >
                                      View History
                                    </button>
                                  )}
                                </div>
                              )}

                              {visit.status !== 'Cancelled' && (
                                <label className="flex items-center space-x-2 cursor-pointer">
                                  <input
                                    type="checkbox"
                                    checked={visit.status === 'Done'}
                                    onChange={(e) => updateVisitAttendance(visit.id, e.target.checked)}
                                    disabled={isLocked}
                                    className="w-4 h-4 text-indigo-600 border-gray-300 rounded focus:ring-indigo-500 disabled:opacity-50"
                                  />
                                  <span className="text-sm text-gray-700">Attended</span>
                                </label>
                              )}

                              {isLocked && mitraChanged && (
                                <button
                                  onClick={() => openHistoryModal(visit)}
                                  className="text-xs text-gray-600 hover:text-gray-800"
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
                  {visits.length === 0 && (
                    <div className="text-center text-gray-500 py-4">
                      No visits scheduled yet.
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Edit Customer Modal */}
      {showUpdateDate && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 overflow-y-auto">
          <div className="bg-white rounded-lg p-6 max-w-2xl w-full mx-4 my-8">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">Edit Customer</h3>
            <div className="space-y-4 max-h-[70vh] overflow-y-auto pr-2">
              {/* Basic Information */}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Customer Name *
                  </label>
                  <input
                    type="text"
                    value={editCustomerName}
                    onChange={(e) => setEditCustomerName(e.target.value)}
                    className="input-field"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Contact *
                  </label>
                  <input
                    type="text"
                    value={editContact}
                    onChange={(e) => setEditContact(e.target.value)}
                    className="input-field"
                  />
                </div>
              </div>

              {/* Address */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Address *
                </label>
                <textarea
                  value={editAddress}
                  onChange={(e) => setEditAddress(e.target.value)}
                  className="input-field"
                  rows={2}
                />
              </div>

              {/* Location */}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    City *
                  </label>
                  <select
                    value={editCity}
                    onChange={async (e) => {
                      setEditCity(e.target.value);
                      setEditDistrict('');
                      setEditVillage('');
                      setEditPostalCode('');
                      if (e.target.value) {
                        await fetchDistricts(e.target.value);
                      } else {
                        setDistricts([]);
                        setVillages([]);
                      }
                    }}
                    className="input-field"
                  >
                    <option value="">Select City</option>
                    {cities.map(city => (
                      <option key={city.id} value={city.name}>{city.name}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    District
                  </label>
                  <select
                    value={editDistrict}
                    onChange={async (e) => {
                      setEditDistrict(e.target.value);
                      setEditVillage('');
                      setEditPostalCode('');
                      if (e.target.value) {
                        await fetchVillages(e.target.value);
                      } else {
                        setVillages([]);
                      }
                    }}
                    className="input-field"
                    disabled={!editCity}
                  >
                    <option value="">Select District</option>
                    {districts.map(district => (
                      <option key={district.id} value={district.name}>{district.name}</option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Village
                  </label>
                  <select
                    value={editVillage}
                    onChange={(e) => {
                      setEditVillage(e.target.value);
                      // Auto-fill postal code from selected village
                      const selectedVillage = villages.find(v => v.name === e.target.value);
                      if (selectedVillage) {
                        setEditPostalCode(selectedVillage.postal_code || '');
                      }
                    }}
                    className="input-field"
                    disabled={!editDistrict}
                  >
                    <option value="">Select Village</option>
                    {villages.map(village => (
                      <option key={village.id} value={village.name}>{village.name}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Postal Code
                  </label>
                  <input
                    type="text"
                    value={editPostalCode}
                    onChange={(e) => setEditPostalCode(e.target.value)}
                    className="input-field"
                    readOnly
                  />
                </div>
              </div>

              {/* Subscription */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Subscription Package *
                </label>
                <input
                  type="text"
                  value={editSubscriptionPackage}
                  onChange={(e) => setEditSubscriptionPackage(e.target.value)}
                  className="input-field"
                />
              </div>

              {/* Dates */}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Subscription Start (dd/MM/yyyy) *
                  </label>
                  <input
                    type="text"
                    value={newDate}
                    onChange={(e) => setNewDate(e.target.value)}
                    placeholder="25/12/2025"
                    pattern="\d{2}/\d{2}/\d{4}"
                    className="input-field"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Subscription End (dd/MM/yyyy)
                  </label>
                  <input
                    type="text"
                    value={endDate}
                    onChange={(e) => setEndDate(e.target.value)}
                    placeholder="30/12/2025"
                    pattern="\d{2}/\d{2}/\d{4}"
                    className="input-field"
                  />
                </div>
              </div>

              {/* Status */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Status *
                </label>
                <input
                  type="text"
                  value={editStatus}
                  onChange={(e) => setEditStatus(e.target.value)}
                  className="input-field"
                  placeholder="Active, Churn, etc."
                />
              </div>
            </div>

            <div className="flex justify-end space-x-3 mt-6">
              <button
                onClick={() => setShowUpdateDate(false)}
                className="btn-secondary"
                disabled={actionLoading}
              >
                Cancel
              </button>
              <button
                onClick={handleUpdateDate}
                className="btn-primary"
                disabled={actionLoading}
              >
                {actionLoading ? 'Saving...' : 'Save Changes'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Bulk Reschedule Modal */}
      {showGenerateSchedule && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 max-w-lg w-full mx-4">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">Bulk Reschedule Cancelled Visits</h3>

            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Start Date
                  </label>
                  <div className="input-field bg-gray-100 text-gray-600 cursor-not-allowed">
                    {scheduleStartDate || 'Auto-detected'}
                  </div>
                  <p className="text-xs text-gray-500 mt-1">From customer subscription start</p>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    End Date
                  </label>
                  <div className="input-field bg-gray-100 text-gray-600 cursor-not-allowed">
                    {scheduleEndDate || '30 days from start'}
                  </div>
                  <p className="text-xs text-gray-500 mt-1">From customer subscription end</p>
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Visit Day {hasCancelledVisits && <span className="text-red-500">*</span>}
                </label>
                {hasCancelledVisits ? (
                  <>
                    <select
                      value={selectedDay}
                      onChange={(e) => setSelectedDay(e.target.value)}
                      className="input-field"
                    >
                      <option value="">Select day of the week</option>
                      <option value="Monday">Monday</option>
                      <option value="Tuesday">Tuesday</option>
                      <option value="Wednesday">Wednesday</option>
                      <option value="Thursday">Thursday</option>
                      <option value="Friday">Friday</option>
                      <option value="Saturday">Saturday</option>
                      <option value="Sunday">Sunday</option>
                    </select>
                    <p className="text-xs text-orange-600 mt-1">
                      ⚠️ Select visit day to check mitra availability for new schedule.
                    </p>
                  </>
                ) : (
                  <>
                    <div className="input-field bg-gray-100 text-gray-600 cursor-not-allowed">
                      {selectedDay || 'Auto-detected from existing schedule'}
                    </div>
                    <p className="text-xs text-gray-500 mt-1">
                      Day pattern is automatically detected from your existing visits.
                    </p>
                  </>
                )}
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Assigned Mitra {hasCancelledVisits && <span className="text-red-500">*</span>}
                </label>
                {hasCancelledVisits ? (
                  <>
                    <select
                      value={selectedMitraForSchedule}
                      onChange={(e) => setSelectedMitraForSchedule(e.target.value)}
                      className="input-field"
                      disabled={loadingAvailability}
                    >
                      <option value="">
                        {loadingAvailability ? 'Checking availability...' : 'Select mitra'}
                      </option>
                      {(availableMitras.length > 0 ? availableMitras : allMitras).map((mitra) => (
                        <option key={mitra.mitraId || mitra.id} value={mitra.mitraId || mitra.id}>
                          {mitra.mitraName || mitra.name || mitra.mitraCode}
                          {availableMitras.length > 0 && mitra.availableForAllDates ? ' ✓' : ''}
                        </option>
                      ))}
                    </select>
                    <p className="text-xs text-orange-600 mt-1">
                      ⚠️ You have cancelled visits - select mitra and visit day to check availability.
                      {availableMitras.length > 0 && ` (${availableMitras.length} mitra available for all dates)`}
                    </p>
                  </>
                ) : (
                  <>
                    <div className="input-field bg-gray-100 text-gray-600 cursor-not-allowed">
                      {visits.length > 0 && visits[0].mitraName
                        ? visits[0].mitraName
                        : customer?.cleaner1 || 'Auto-detected from existing schedule'}
                    </div>
                    <p className="text-xs text-gray-500 mt-1">
                      Mitra is automatically assigned from your existing schedule.
                    </p>
                  </>
                )}
              </div>

              {visits.length > 0 && (
                <div className={`p-3 border rounded ${hasCancelledVisits ? 'bg-orange-50 border-orange-200' : 'bg-blue-50 border-blue-200'}`}>
                  <p className={`text-sm ${hasCancelledVisits ? 'text-orange-800' : 'text-blue-800'}`}>
                    {hasCancelledVisits ? '⚠️' : 'ℹ️'} Current schedule: {visits.length} visit(s) total
                  </p>
                  <ul className={`text-sm mt-1 ml-4 list-disc ${hasCancelledVisits ? 'text-orange-700' : 'text-blue-700'}`}>
                    <li>{visits.filter(v => v.status === 'Done').length} Completed (will be preserved)</li>
                    <li>{visits.filter(v => v.status === 'Scheduled').length} Scheduled (will be preserved)</li>
                    {visits.filter(v => v.status === 'Cancelled').length > 0 && (
                      <li className="font-medium">{visits.filter(v => v.status === 'Cancelled').length} Cancelled (will be REPLACED with new mitra)</li>
                    )}
                  </ul>
                  <p className={`text-sm mt-2 font-medium ${hasCancelledVisits ? 'text-orange-800' : 'text-blue-800'}`}>
                    {hasCancelledVisits ? (
                      <>→ Will create {visits.filter(v => v.status === 'Cancelled').length} new visit(s) to replace cancelled ones</>
                    ) : (
                      <>ℹ️ No cancelled visits to reschedule. This feature is only available when you have cancelled visits.</>
                    )}
                  </p>
                </div>
              )}
            </div>

            <div className="flex justify-end space-x-3 mt-6">
              <button
                onClick={() => setShowGenerateSchedule(false)}
                className="btn-secondary"
                disabled={loadingSchedule}
              >
                Cancel
              </button>
              <button
                onClick={generateVisitSchedule}
                className="btn-primary disabled:opacity-50 disabled:cursor-not-allowed"
                disabled={
                  loadingSchedule ||
                  !scheduleStartDate ||
                  !selectedDay ||
                  !selectedMitraForSchedule ||
                  !hasCancelledVisits
                }
                title={!hasCancelledVisits ? 'No cancelled visits to reschedule' : ''}
              >
                {loadingSchedule
                  ? 'Rescheduling...'
                  : hasCancelledVisits
                  ? `Reschedule ${visits.filter(v => v.status === 'Cancelled').length} Visit${visits.filter(v => v.status === 'Cancelled').length !== 1 ? 's' : ''}`
                  : 'No Cancelled Visits'
                }
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Assign Cleaner Modal */}
      {showAssignCleaner && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 max-w-md w-full mx-4">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">Assign Cleaners</h3>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Cleaner 1
                </label>
                <select
                  value={cleaner1}
                  onChange={(e) => setCleaner1(e.target.value)}
                  className="input-field"
                >
                  <option value="">Select cleaner 1</option>
                  {availableCleaners.map((cleaner) => (
                    <option key={cleaner} value={cleaner}>{cleaner}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Cleaner 2
                </label>
                <select
                  value={cleaner2}
                  onChange={(e) => setCleaner2(e.target.value)}
                  className="input-field"
                >
                  <option value="">Select cleaner 2</option>
                  {availableCleaners.filter(c => c !== cleaner1).map((cleaner) => (
                    <option key={cleaner} value={cleaner}>{cleaner}</option>
                  ))}
                </select>
              </div>
            </div>
            <div className="flex justify-end space-x-3 mt-6">
              <button
                onClick={() => setShowAssignCleaner(false)}
                className="btn-secondary"
                disabled={actionLoading}
              >
                Cancel
              </button>
              <button
                onClick={handleAssignCleaner}
                className="btn-primary"
                disabled={actionLoading}
              >
                {actionLoading ? 'Assigning...' : 'Assign Cleaners'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Change Mitra Modal */}
      {selectedVisitForChange && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 max-w-md w-full mx-4">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">Change Mitra for Visit #{selectedVisitForChange.visitNumber}</h3>
            <div className="mb-4 p-3 bg-gray-50 rounded">
              <p className="text-sm text-gray-600">
                <strong>Current Mitra:</strong> {selectedVisitForChange.mitraName}
              </p>
              <p className="text-sm text-gray-600">
                <strong>Date:</strong> {selectedVisitForChange.scheduledDate} ({selectedVisitForChange.scheduledDay})
              </p>
            </div>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  New Mitra *
                </label>
                <select
                  value={selectedNewMitra}
                  onChange={(e) => setSelectedNewMitra(e.target.value)}
                  className="input-field"
                >
                  <option value="">Select new mitra</option>
                  {availableMitrasForChange.map((mitra) => (
                    <option key={mitra.mitraId} value={mitra.mitraId}>
                      {mitra.mitraName} (Available: {mitra.availableSlots} slots)
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Reason for Change *
                </label>
                <textarea
                  value={changeReason}
                  onChange={(e) => setChangeReason(e.target.value)}
                  placeholder="Why are you changing the mitra?"
                  rows={3}
                  className="input-field"
                />
              </div>
            </div>
            <div className="flex justify-end space-x-3 mt-6">
              <button
                onClick={() => setSelectedVisitForChange(null)}
                className="btn-secondary"
                disabled={loadingMitraChange}
              >
                Cancel
              </button>
              <button
                onClick={saveMitraChange}
                className="btn-primary"
                disabled={loadingMitraChange}
              >
                {loadingMitraChange ? 'Changing...' : 'Change Mitra'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Cancel Visit Reason Modal */}
      {showCancelReasonModal && selectedVisitForCancel && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 max-w-md w-full mx-4">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">Cancel Visit #{selectedVisitForCancel.visitNumber}</h3>
            <div className="mb-4 p-3 bg-gray-50 rounded">
              <p className="text-sm text-gray-600">
                <strong>Mitra:</strong> {selectedVisitForCancel.mitraName}
              </p>
              <p className="text-sm text-gray-600">
                <strong>Date:</strong> {selectedVisitForCancel.scheduledDate} ({selectedVisitForCancel.scheduledDay})
              </p>
            </div>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Reason for Cancellation *
                </label>
                <textarea
                  value={cancelReason}
                  onChange={(e) => setCancelReason(e.target.value)}
                  placeholder="Why are you cancelling this visit?"
                  rows={4}
                  className="input-field"
                  autoFocus
                />
                <p className="text-xs text-gray-500 mt-1">
                  Please provide a clear reason for cancelling this scheduled visit.
                </p>
              </div>
            </div>
            <div className="flex justify-end space-x-3 mt-6">
              <button
                onClick={() => {
                  setShowCancelReasonModal(false);
                  setSelectedVisitForCancel(null);
                  setCancelReason('');
                }}
                className="btn-secondary"
                disabled={loadingCancelVisit}
              >
                Close
              </button>
              <button
                onClick={saveCancelVisit}
                className="bg-red-600 hover:bg-red-700 text-white px-4 py-2 rounded transition-colors disabled:opacity-50"
                disabled={loadingCancelVisit || !cancelReason.trim()}
              >
                {loadingCancelVisit ? 'Cancelling...' : 'Cancel Visit'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Single Visit Reschedule Modal */}
      {showSingleRescheduleModal && selectedVisitForReschedule && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 max-w-md w-full mx-4">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">
              Reschedule Visit #{selectedVisitForReschedule.visitNumber}
            </h3>

            <div className="mb-4 p-3 bg-gray-50 rounded">
              <p className="text-sm text-gray-600 mb-1">
                <strong>Original Schedule:</strong>
              </p>
              <p className="text-sm text-gray-700">
                📅 {selectedVisitForReschedule.scheduledDate} ({selectedVisitForReschedule.scheduledDay})
              </p>
              <p className="text-sm text-gray-700">
                👤 {selectedVisitForReschedule.mitraName}
              </p>
            </div>

            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  New Date *
                </label>
                <input
                  type="date"
                  value={singleRescheduleDate}
                  onChange={(e) => setSingleRescheduleDate(e.target.value)}
                  className="input-field"
                  min={customer?.subscriptionStart ? (() => {
                    try {
                      // Convert dd/mm/yyyy to yyyy-mm-dd
                      const parts = customer.subscriptionStart.split('/');
                      if (parts.length === 3) {
                        return `${parts[2]}-${parts[1].padStart(2, '0')}-${parts[0].padStart(2, '0')}`;
                      }
                      return new Date().toISOString().split('T')[0];
                    } catch {
                      return new Date().toISOString().split('T')[0];
                    }
                  })() : new Date().toISOString().split('T')[0]}
                  max={customer?.subscriptionEnd ? (() => {
                    try {
                      // Convert dd/mm/yyyy to yyyy-mm-dd
                      const parts = customer.subscriptionEnd.split('/');
                      if (parts.length === 3) {
                        return `${parts[2]}-${parts[1].padStart(2, '0')}-${parts[0].padStart(2, '0')}`;
                      }
                      return undefined;
                    } catch {
                      return undefined;
                    }
                  })() : undefined}
                />
                <p className="text-xs text-gray-500 mt-1">
                  Date must be within subscription period
                  {customer?.subscriptionStart && customer?.subscriptionEnd &&
                    ` (${customer.subscriptionStart} - ${customer.subscriptionEnd})`
                  }
                </p>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  New Mitra *
                  {loadingSingleAvailability && <span className="text-xs text-gray-500 ml-2">(Checking availability...)</span>}
                </label>
                <select
                  value={singleRescheduleMitra}
                  onChange={(e) => setSingleRescheduleMitra(e.target.value)}
                  className="input-field"
                  disabled={loadingSingleAvailability || !singleRescheduleDate}
                >
                  <option value="">
                    {loadingSingleAvailability ? 'Checking availability...' : 'Select mitra'}
                  </option>
                  {(availableMitrasForSingle.length > 0 ? availableMitrasForSingle : allMitras).map((mitra) => (
                    <option key={mitra.mitraId || mitra.id} value={mitra.mitraId || mitra.id}>
                      {mitra.mitraName || mitra.name}
                      {availableMitrasForSingle.length > 0 && mitra.availableForAllDates ? ' ✓' : ''}
                    </option>
                  ))}
                </select>
                {availableMitrasForSingle.length > 0 && (
                  <p className="text-xs text-green-600 mt-1">
                    ✓ {availableMitrasForSingle.length} mitra available for this date
                  </p>
                )}
                {singleRescheduleDate && availableMitrasForSingle.length === 0 && !loadingSingleAvailability && allMitras.length > 0 && (
                  <p className="text-xs text-orange-600 mt-1">
                    ⚠️ No availability data - showing all mitras
                  </p>
                )}
              </div>
            </div>

            <div className="flex justify-end space-x-3 mt-6">
              <button
                onClick={() => {
                  setShowSingleRescheduleModal(false);
                  setSelectedVisitForReschedule(null);
                  setSingleRescheduleDate('');
                  setSingleRescheduleMitra('');
                  setAvailableMitrasForSingle([]);
                }}
                className="btn-secondary"
                disabled={loadingSingleReschedule}
              >
                Cancel
              </button>
              <button
                onClick={saveSingleVisitReschedule}
                className="btn-primary"
                disabled={loadingSingleReschedule || !singleRescheduleDate || !singleRescheduleMitra}
              >
                {loadingSingleReschedule ? 'Rescheduling...' : 'Reschedule Visit'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* View History Modal */}
      {showHistoryModal && selectedVisitHistory && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 max-w-md w-full mx-4">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">Mitra Change History - Visit #{selectedVisitHistory.visitNumber}</h3>
            <div className="mb-4">
              <p className="text-sm text-gray-600">
                <strong>Date:</strong> {selectedVisitHistory.scheduledDate} ({selectedVisitHistory.scheduledDay})
              </p>
            </div>
            <div className="space-y-3">
              <div className="p-3 bg-blue-50 rounded border border-blue-200">
                <p className="text-sm font-medium text-blue-900">Current Mitra</p>
                <p className="text-sm text-blue-700">{selectedVisitHistory.mitraName}</p>
              </div>
              {selectedVisitHistory.originalMitraId && selectedVisitHistory.originalMitraId !== selectedVisitHistory.actualMitraId && (
                <div className="p-3 bg-gray-50 rounded border border-gray-200">
                  <p className="text-sm font-medium text-gray-900">Original Mitra</p>
                  <p className="text-sm text-gray-600">Changed from original assignment</p>
                </div>
              )}
            </div>
            <div className="flex justify-end mt-6">
              <button
                onClick={() => {
                  setShowHistoryModal(false);
                  setSelectedVisitHistory(null);
                }}
                className="btn-secondary"
              >
                Close
              </button>
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
                    saveEditedDate(editingDateVisitId, true); // Force update
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