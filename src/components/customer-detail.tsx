'use client';

import { useState, useEffect } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import { SessionData } from '@/types/auth';
import { CustomerData } from '@/types/customer';
import { Icons } from './icons';
import { useBreadcrumbOverride } from '@/lib/breadcrumb-context';
import { useToast } from '@/lib/toast';
import { useConfirm } from '@/components/confirm-dialog';
import CustomerForm from './customer-form';

interface CustomerDetailProps {
  customerId: string;
  session: SessionData;
}

const statusColors: { [key: string]: string } = {
  'Active': 'bg-green-100 text-green-800',
  'Churn': 'bg-red-100 text-red-800',
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
  hasAuditLog: boolean;
  createdAt: string;
  updatedAt: string;
  completedAt: string | null;
  updatedBy?: string;
  updatedByAt?: string;
  invoiceId?: string | null;
}

export default function CustomerDetail({ customerId, session }: CustomerDetailProps) {
  const router = useRouter();
  const pathname = usePathname();
  const { setOverride } = useBreadcrumbOverride();
  const { toast } = useToast();
  const confirm = useConfirm();
  const [customer, setCustomer] = useState<CustomerData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Action states
  const [showUpdateDate, setShowUpdateDate] = useState(false);
  const [showAssignCleaner, setShowAssignCleaner] = useState(false);
  const [actionLoading, setActionLoading] = useState(false);
  const [showRenewForm, setShowRenewForm] = useState(false);

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
  const [allVisits, setAllVisits] = useState<Visit[]>([]); // Unfiltered, for historical slide-over
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
  const [changeMitraDate, setChangeMitraDate] = useState('');
  const [mitraSearchQuery, setMitraSearchQuery] = useState('');
  const [selectedVisitForDateEdit, setSelectedVisitForDateEdit] = useState<Visit | null>(null);
  const [editDateValue, setEditDateValue] = useState('');
  const [savingDateEdit, setSavingDateEdit] = useState(false);
  const [showHistoryModal, setShowHistoryModal] = useState(false);
  const [selectedVisitHistory, setSelectedVisitHistory] = useState<any>(null);
  const [visitAuditLogs, setVisitAuditLogs] = useState<any[]>([]);
  const [loadingAuditLogs, setLoadingAuditLogs] = useState(false);

  // Bulk attendance selection states
  const [selectedVisits, setSelectedVisits] = useState<Set<string>>(new Set());
  const [bulkActionLoading, setBulkActionLoading] = useState(false);

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

  // Add single visit states
  const [showAddVisitForm, setShowAddVisitForm] = useState(false);
  const [newVisitDate, setNewVisitDate] = useState('');
  const [newVisitMitra, setNewVisitMitra] = useState('');

  // Attendance pagination
  const VISITS_PER_PAGE = 7;
  const [attendancePage, setAttendancePage] = useState(1);

  // Invoice states
  const [invoices, setInvoices] = useState<any[]>([]);
  const [previewInvoice, setPreviewInvoice] = useState<{ id: string; number: string; blobUrl?: string } | null>(null);
  const [actualEndDateConfirm, setActualEndDateConfirm] = useState<{ invoiceId: string; invoiceNumber: string; newDate: string } | null>(null);
  const [savingActualEndDate, setSavingActualEndDate] = useState(false);
  const [invoiceStatusEditing, setInvoiceStatusEditing] = useState<string | null>(null);
  const [invoiceStatusSaving, setInvoiceStatusSaving] = useState<string | null>(null);

  // Historical attendance slide-over
  const [historicalSlideOver, setHistoricalSlideOver] = useState<{ invoice: any } | null>(null);

  const openHistoricalAttendance = (inv: any) => setHistoricalSlideOver({ invoice: inv });
  const closeHistoricalAttendance = () => setHistoricalSlideOver(null);

  const getVisitsForInvoice = (inv: any): Visit[] => {
    if (!inv.invoiceStartDate) return [];
    return allVisits.filter(v => {
      if (!v.scheduledDate) return false;
      // If visit has invoiceId, use it as primary anchor (catches beyond-end-date reschedules)
      if (v.invoiceId && inv.id) return v.invoiceId === inv.id;
      // Fallback: date range filter
      const d = v.scheduledDate;
      const afterStart = d >= inv.invoiceStartDate;
      const beforeEnd = !inv.invoiceEndDate || d <= inv.invoiceEndDate;
      return afterStart && beforeEnd;
    });
  };

  // Visits to show in the main attendance section — scoped to active invoice period
  const displayedVisits = (() => {
    if (invoices.length === 0) return visits;
    if (allVisits.length === 0) return visits;
    const todayJkt = new Date(new Date().toLocaleString('en-US', { timeZone: 'Asia/Jakarta' }));
    todayJkt.setHours(0, 0, 0, 0);
    const toDate = (s: string) => new Date(s + 'T00:00:00');
    const ongoingInv = invoices.find(inv => {
      if (!inv.invoiceStartDate || !inv.invoiceEndDate) return false;
      return toDate(inv.invoiceStartDate) <= todayJkt && toDate(inv.invoiceEndDate) >= todayJkt;
    });
    // If ongoing invoice found, show its visits
    if (ongoingInv) return getVisitsForInvoice(ongoingInv);
    // Fallback to latest invoice
    const latestInv = invoices.slice().sort((a, b) =>
      (b.invoiceStartDate ?? '').localeCompare(a.invoiceStartDate ?? '')
    )[0];
    const latestInvVisits = getVisitsForInvoice(latestInv);
    // If any visit has been rescheduled beyond invoice end date, show all visits from latest invoice start onwards
    const hasRescheduledBeyond = latestInv?.invoiceEndDate && allVisits.some(v =>
      v.scheduledDate && v.scheduledDate > latestInv.invoiceEndDate &&
      latestInv.invoiceStartDate && v.scheduledDate >= latestInv.invoiceStartDate
    );
    if (hasRescheduledBeyond) {
      return allVisits.filter(v => v.scheduledDate && latestInv.invoiceStartDate && v.scheduledDate >= latestInv.invoiceStartDate);
    }
    return latestInvVisits;
  })();

  const totalAttendancePages = Math.ceil(displayedVisits.length / VISITS_PER_PAGE);
  const paginatedVisits = displayedVisits.slice(
    (attendancePage - 1) * VISITS_PER_PAGE,
    attendancePage * VISITS_PER_PAGE
  );

  const openInvoicePreview = async (id: string, number: string) => {
    try {
      const res = await fetch(`/api/invoice/${id}/pdf`);
      const blob = await res.blob();
      const blobUrl = URL.createObjectURL(blob);
      setPreviewInvoice({ id, number, blobUrl });
    } catch (e) {
      console.error('Failed to load invoice preview', e);
    }
  };

  const closeInvoicePreview = () => {
    if (previewInvoice?.blobUrl) URL.revokeObjectURL(previewInvoice.blobUrl);
    setPreviewInvoice(null);
  };

  useEffect(() => {
    fetchCustomer();
    fetchAvailableCleaners();
    fetchInvoices();
  }, [customerId]);

  const fetchInvoices = async () => {
    try {
      const res = await fetch(`/api/invoice?customerId=${customerId}`);
      const data = await res.json();
      if (data.success) setInvoices(data.data);
    } catch (err) {
      console.error('Error fetching invoices:', err);
    }
  };

  const handleInvoiceStatusChange = async (invoiceId: string, newStatus: string) => {
    setInvoiceStatusSaving(invoiceId);
    try {
      const res = await fetch('/api/invoice', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ invoiceId, status: newStatus }),
      });
      if (res.ok) {
        setInvoices(prev => prev.map(inv => inv.id === invoiceId ? { ...inv, status: newStatus } : inv));
      }
    } catch (err) {
      console.error('Error updating invoice status:', err);
    } finally {
      setInvoiceStatusSaving(null);
      setInvoiceStatusEditing(null);
    }
  };

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
          setOverride(pathname, result.data.customerName);
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
      const ts = Date.now();
      const [customerRes, allRes] = await Promise.all([
        fetch(`/api/trial/${customerId}/visits?view=customer&_t=${ts}`),
        fetch(`/api/trial/${customerId}/visits?view=all&_t=${ts}`),
      ]);
      if (customerRes.ok) {
        const result = await customerRes.json();
        if (result.success && result.data) { setVisits(result.data); setAttendancePage(1); }
      }
      if (allRes.ok) {
        const result = await allRes.json();
        if (result.success && result.data) setAllVisits(result.data);
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
        toast('error', error.message || 'Failed to update attendance');
      }
    } catch (error) {
      console.error('Error updating attendance:', error);
      toast('error', 'Failed to update attendance');
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
      toast('warning', 'Please provide a reason for cancelling this visit');
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
        toast('success', 'Visit cancelled successfully');
      } else {
        const error = await response.json();
        toast('error', error.message || 'Failed to cancel visit');
      }
    } catch (error) {
      console.error('Error cancelling visit:', error);
      toast('error', 'Failed to cancel visit');
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
      toast('warning', 'Please select both date and mitra');
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
          status: 'Done', // Feedback 13: Rescheduled visit should be Done by default
          scheduledDate: singleRescheduleDate,
          scheduledDay: dayName,
          actualMitraId: singleRescheduleMitra,
        }),
      });

      if (response.ok) {
        toast('success', 'Visit rescheduled successfully!');
        setShowSingleRescheduleModal(false);
        setSelectedVisitForReschedule(null);
        setSingleRescheduleDate('');
        setSingleRescheduleMitra('');
        setAvailableMitrasForSingle([]);
        await fetchVisits(); // Refresh visits
      } else {
        const error = await response.json();
        toast('error', error.message || 'Failed to reschedule visit');
      }
    } catch (error) {
      console.error('Error rescheduling visit:', error);
      toast('error', 'Failed to reschedule visit');
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
      toast('warning', 'Please select a valid date');
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
        toast('error', error.message || 'Failed to update date');
      }
    } catch (error) {
      console.error('Error updating date:', error);
      toast('error', 'Failed to update date');
    }
  };

  // Open change mitra modal
  const openChangeMitraModal = async (visit: Visit) => {
    setSelectedVisitForChange(visit);
    setSelectedNewMitra('');
    setChangeReason('');
    setMitraSearchQuery(''); // empty so dropdown shows on first type
    setChangeMitraDate(visit.scheduledDate); // Initialize with current scheduled date

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
      toast('warning', 'Please select a mitra and provide a reason for the change');
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
          scheduledDate: changeMitraDate || undefined,
        }),
      });

      if (response.ok) {
        const result = await response.json();
        setSelectedVisitForChange(null);
        await fetchVisits();
        toast('success', result.message || 'Mitra changed successfully.');
      } else {
        const error = await response.json();
        toast('error', error.message || 'Failed to change mitra');
      }
    } catch (error) {
      console.error('Error changing mitra:', error);
      toast('error', 'Failed to change mitra');
    } finally {
      setLoadingMitraChange(false);
    }
  };

  const saveVisitDateEdit = async () => {
    if (!selectedVisitForDateEdit || !editDateValue) return;
    try {
      setSavingDateEdit(true);
      const response = await fetch(
        `/api/trial/${customerId}/visits/${selectedVisitForDateEdit.id}/update-date`,
        {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ newDate: editDateValue }),
        }
      );
      if (response.ok) {
        setSelectedVisitForDateEdit(null);
        await fetchVisits();
        toast('success', 'Visit date updated successfully');

        // Check if new date is beyond current invoice end date
        const activeInvoice = invoices.find(inv => {
          if (!inv.invoiceStartDate || !inv.invoiceEndDate) return false;
          const todayJkt = new Date(new Date().toLocaleString('en-US', { timeZone: 'Asia/Jakarta' }));
          todayJkt.setHours(0, 0, 0, 0);
          return new Date(inv.invoiceStartDate + 'T00:00:00') <= todayJkt && new Date(inv.invoiceEndDate + 'T00:00:00') >= todayJkt;
        }) ?? invoices.slice().sort((a, b) => (b.invoiceStartDate ?? '').localeCompare(a.invoiceStartDate ?? ''))[0];

        if (activeInvoice?.invoiceEndDate && editDateValue > activeInvoice.invoiceEndDate) {
          setActualEndDateConfirm({
            invoiceId: activeInvoice.id,
            invoiceNumber: activeInvoice.invoiceNumber,
            newDate: editDateValue,
          });
        }
      } else {
        const error = await response.json();
        toast('error', error.message || 'Failed to update visit date');
      }
    } catch (error) {
      toast('error', 'Failed to update visit date');
    } finally {
      setSavingDateEdit(false);
    }
  };

  const handleConfirmActualEndDate = async () => {
    if (!actualEndDateConfirm) return;
    try {
      setSavingActualEndDate(true);

      // 1. Update invoice actualEndDate
      const invoiceRes = await fetch('/api/invoice', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ invoiceId: actualEndDateConfirm.invoiceId, actualEndDate: actualEndDateConfirm.newDate }),
      });

      if (!invoiceRes.ok) {
        toast('error', 'Gagal update actual end date invoice');
        return;
      }

      // 2. Update customerDB.subscriptionEnd to match the new actual end date
      const customerRes = await fetch(`/api/customers/${customerId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ subscriptionEnd: actualEndDateConfirm.newDate }),
      });

      if (!customerRes.ok) {
        toast('error', 'Invoice diperbarui, tapi gagal update tanggal akhir langganan');
        await fetchInvoices();
        return;
      }

      toast('success', 'Tanggal akhir langganan & invoice diperbarui');
      await Promise.all([fetchInvoices(), fetchCustomer()]);
    } catch {
      toast('error', 'Gagal update actual end date');
    } finally {
      setSavingActualEndDate(false);
      setActualEndDateConfirm(null);
    }
  };

  // Bulk attendance handlers
  const handleToggleVisitSelection = (visitId: string) => {
    const newSelected = new Set(selectedVisits);
    if (newSelected.has(visitId)) {
      newSelected.delete(visitId);
    } else {
      newSelected.add(visitId);
    }
    setSelectedVisits(newSelected);
  };

  const handleSelectAllScheduled = () => {
    const scheduledVisitIds = visits
      .filter(v => v.status === 'Scheduled')
      .map(v => v.id);
    setSelectedVisits(new Set(scheduledVisitIds));
  };

  const handleDeselectAll = () => {
    setSelectedVisits(new Set());
  };

  const handleBulkMarkAttended = async () => {
    if (selectedVisits.size === 0) {
      toast('warning', 'Please select at least one visit');
      return;
    }

    const confirmed = await confirm({ message: `Mark ${selectedVisits.size} visit(s) as attended?`, confirmLabel: 'Mark Attended' });
    if (!confirmed) return;

    try {
      setBulkActionLoading(true);
      let successCount = 0;
      let errorCount = 0;

      for (const visitId of selectedVisits) {
        try {
          const response = await fetch(`/api/trial/${customerId}/visits`, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              visitId,
              status: 'Done',
              actualDate: new Date().toISOString().split('T')[0],
            }),
          });

          if (response.ok) {
            successCount++;
          } else {
            errorCount++;
            console.error(`Failed to mark visit ${visitId} as attended`);
          }
        } catch (error) {
          errorCount++;
          console.error(`Error updating visit ${visitId}:`, error);
        }
      }

      // Clear selection and refresh
      setSelectedVisits(new Set());
      await fetchVisits();

      if (errorCount > 0) {
        toast('info', `Completed: ${successCount} success, ${errorCount} failed`);
      } else {
        toast('info', `Successfully marked ${successCount} visit(s) as attended`);
      }
    } catch (error) {
      console.error('Bulk mark attended error:', error);
      toast('error', 'Failed to process bulk update');
    } finally {
      setBulkActionLoading(false);
    }
  };

  const handleBulkMarkMissed = async () => {
    if (selectedVisits.size === 0) {
      toast('warning', 'Please select at least one visit');
      return;
    }

    const confirmed = await confirm({ message: `Mark ${selectedVisits.size} visit(s) as missed/cancelled?`, confirmLabel: 'Mark Missed', danger: true });
    if (!confirmed) return;

    try {
      setBulkActionLoading(true);
      let successCount = 0;
      let errorCount = 0;

      for (const visitId of selectedVisits) {
        try {
          const response = await fetch(`/api/trial/${customerId}/visits`, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              visitId,
              status: 'Cancelled',
              visitNotes: 'Marked as missed via bulk action',
            }),
          });

          if (response.ok) {
            successCount++;
          } else {
            errorCount++;
            console.error(`Failed to mark visit ${visitId} as missed`);
          }
        } catch (error) {
          errorCount++;
          console.error(`Error updating visit ${visitId}:`, error);
        }
      }

      // Clear selection and refresh
      setSelectedVisits(new Set());
      await fetchVisits();

      if (errorCount > 0) {
        toast('info', `Completed: ${successCount} success, ${errorCount} failed`);
      } else {
        toast('info', `Successfully marked ${successCount} visit(s) as missed`);
      }
    } catch (error) {
      console.error('Bulk mark missed error:', error);
      toast('error', 'Failed to process bulk update');
    } finally {
      setBulkActionLoading(false);
    }
  };

  // Open history modal
  const openHistoryModal = async (visit: Visit) => {
    setSelectedVisitHistory(visit);
    setVisitAuditLogs([]);
    setShowHistoryModal(true);
    setLoadingAuditLogs(true);
    try {
      const res = await fetch(`/api/visits/${visit.id}/history`);
      if (res.ok) {
        const data = await res.json();
        setVisitAuditLogs(data.logs || []);
      }
    } catch {
      setVisitAuditLogs([]);
    } finally {
      setLoadingAuditLogs(false);
    }
  };

  // Fetch all mitras for schedule generation
  const fetchAllMitras = async () => {
    try {
      const response = await fetch('/api/mitra?status=Active');
      if (response.ok) {
        const result = await response.json();
        console.log('Mitra API response:', result);

        // Handle different response formats (prioritize new format)
        if (result.success && result.data && Array.isArray(result.data)) {
          console.log('Setting mitras from result.data:', result.data.length);
          setAllMitras(result.data);
        } else if (result.items && Array.isArray(result.items)) {
          console.log('Setting mitras from result.items:', result.items.length);
          setAllMitras(result.items);
        } else if (Array.isArray(result)) {
          console.log('Setting mitras from array response:', result.length);
          setAllMitras(result);
        } else if (result.mitras) {
          console.log('Setting mitras from result.mitras:', result.mitras.length);
          setAllMitras(result.mitras);
        } else {
          console.error('Unexpected mitra response format:', result);
          setAllMitras([]); // Explicitly set empty array
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
            toast('warning', 'No mitras available for all scheduled dates in this area. Please try different dates or contact admin.');
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
      toast('warning', 'Please fill in start date, select a day, and assign a mitra');
      return;
    }

    const completedVisits = visits.filter(v => v.status === 'Done').length;
    const scheduledVisits = visits.filter(v => v.status === 'Scheduled').length;
    const cancelledVisits = visits.filter(v => v.status === 'Cancelled').length;

    // Check if there are cancelled visits to reschedule
    if (cancelledVisits === 0) {
      toast('warning', 'No cancelled visits to reschedule. This feature is only available when you have cancelled visits.');
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

    const ok = await confirm({ title: 'Reschedule Visits', message: confirmMessage, confirmLabel: 'Reschedule' });
    if (!ok) return;

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
        toast('success', result.message || 'Cancelled visits have been rescheduled successfully!');
        setShowGenerateSchedule(false);
        await fetchVisits(); // Refresh visits
      } else {
        const error = await response.json();
        toast('error', error.message || 'Failed to reschedule cancelled visits');
      }
    } catch (error) {
      console.error('Error rescheduling visits:', error);
      toast('error', 'Failed to reschedule cancelled visits');
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

  // Fetch mitras when Add Visit form opens (Feedback 6 - Bug Fix)
  useEffect(() => {
    if (showAddVisitForm) {
      console.log('Add Visit form opened - fetching mitras...');
      if (allMitras.length === 0) {
        fetchAllMitras();
      }
    }
  }, [showAddVisitForm]);

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
      toast('warning', 'Please fill in all required fields (marked with *)');
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
        toast('success', 'Customer updated successfully');
        setShowUpdateDate(false);
        fetchCustomer(); // Refresh customer data
      } else {
        const error = await response.json();
        toast('error', error.error || 'Failed to update customer');
      }
    } catch (error) {
      console.error('Error updating customer:', error);
      toast('error', 'Failed to update customer');
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
        toast('success', 'Cleaners assigned successfully');
        setShowAssignCleaner(false);
        fetchCustomer(); // Refresh customer data
      } else {
        const error = await response.json();
        toast('error', error.error || 'Failed to assign cleaners');
      }
    } catch (error) {
      console.error('Error assigning cleaners:', error);
      toast('error', 'Failed to assign cleaners');
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

  const renewalStartDate = (() => {
    if (!customer?.subscriptionEndRaw) return '';
    const [y, m, d] = customer.subscriptionEndRaw.split('-').map(Number);
    const next = new Date(y, m - 1, d + 1);
    const pad = (n: number) => String(n).padStart(2, '0');
    return `${next.getFullYear()}-${pad(next.getMonth() + 1)}-${pad(next.getDate())}`;
  })();

  const renewalSelectedDays = (() => {
    if (!customer?.dayPattern) return [];
    try {
      const p = JSON.parse(customer.dayPattern);
      return [p.day1, p.day2, p.day3].filter(Boolean) as string[];
    } catch {
      return [];
    }
  })();

  return (
    <>
    {showRenewForm && customer && (
      <CustomerForm
        session={session}
        mode="renew"
        renewalCustomerId={customer.id}
        renewalPrefill={{
          customerName: customer.customerName,
          contact: customer.contact || '',
          address: customer.address || '',
          city: customer.city || '',
          district: customer.district || '',
          village: customer.village || '',
          postalCode: customer.postalCode || '',
          subscriptionPackageId: customer.subscriptionPackageId || '',
          selectedDays: renewalSelectedDays,
          startDate: renewalStartDate,
          mitraId: customer.assignedMitraId || '',
          mitraName: customer.assignedMitraName || '',
          ltv: customer.ltv || 0,
        }}
        onClose={() => setShowRenewForm(false)}
        onSuccess={() => {
          setShowRenewForm(false);
          fetchCustomer();
        }}
      />
    )}
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
          {['ADMIN', 'OWNER'].includes(session.role) && customer.status === 'Churn' && (
            <button
              onClick={() => setShowRenewForm(true)}
              className="inline-flex items-center px-4 py-2 bg-green-600 hover:bg-green-700 text-white text-sm font-medium rounded-lg transition-colors"
            >
              <Icons.refresh className="w-4 h-4 mr-2" />
              Renew Subscription
            </button>
          )}
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
        </div>
      </div>


      {/* Customer Information Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Basic Information */}
        <div className="card p-6">
          <h3 className="text-xl font-bold text-gray-900 mb-6">Basic Information</h3>
          <div className="space-y-4">
            <div>
              <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1">Customer Name</label>
              <div className="text-base font-medium text-gray-900">{customer.customerName}</div>
            </div>
            <div>
              <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1">Acquisition</label>
              <div>
                <span className={`inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium ${acquisitionColors[customer.acquisition]}`}>
                  {customer.acquisition}
                </span>
              </div>
            </div>
            <div>
              <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1">Contact</label>
              <div className="text-sm text-gray-900 font-mono">{customer.contact}</div>
            </div>
            <div>
              <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1">Residential Type</label>
              <div>
                <span className={`inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium ${residentialColors[customer.residentialType]}`}>
                  {customer.residentialType}
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* Location Information */}
        <div className="card p-6">
          <h3 className="text-xl font-bold text-gray-900 mb-6">Location Information</h3>
          <div className="space-y-4">
            <div>
              <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1">Address</label>
              <div className="text-sm text-gray-900 leading-relaxed">{customer.address}</div>
            </div>
            <div>
              <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1">Village</label>
              <div className="text-sm text-gray-900">{customer.village}</div>
            </div>
            <div>
              <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1">District</label>
              <div className="text-sm text-gray-900">{customer.district}</div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1">City</label>
                <div className="text-sm text-gray-900">{customer.city}</div>
              </div>
              <div>
                <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1">Postal Code</label>
                <div className="text-sm text-gray-900">{customer.postalCode}</div>
              </div>
            </div>
          </div>
        </div>

        {/* Subscription Information */}
        <div className="card p-6">
          <div className="flex items-center justify-between mb-6">
            <div>
              <h3 className="text-xl font-bold text-gray-900">Subscription Information</h3>
              <p className="text-xs text-gray-400 mt-0.5">Current active period</p>
            </div>
          </div>
          <div className="space-y-4">
            <div>
              <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1">Subscription Package</label>
              <div className="text-sm text-gray-900 leading-relaxed">{customer.subscriptionPackage}</div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1">Qty Package</label>
                <div className="text-sm font-medium text-gray-900">{customer.qtyPackage}</div>
              </div>
              <div>
                <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1">LTV (months)</label>
                <div className="text-sm font-medium text-gray-900">{customer.ltv}</div>
              </div>
            </div>
            <div>
              <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1">Monthly Fee</label>
              <div className="text-base font-semibold text-indigo-600">
                Rp {((customer as any).monthlyFee || 0).toLocaleString('id-ID')}
              </div>
            </div>
            <div>
              <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1">First Date Subscription</label>
              <div className="text-sm text-gray-900 font-mono">{customer.firstDateSubscription}</div>
            </div>
            {customer.subscriptionEnd && (
              <div>
                <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1">End Date Subscription</label>
                <div className="text-sm text-gray-900 font-mono">
                  {(() => {
                    const latestInv = invoices.slice().sort((a: any, b: any) => (b.invoiceStartDate ?? '').localeCompare(a.invoiceStartDate ?? ''))[0];
                    const invoiceEnd = latestInv?.invoiceEndDate;
                    const actualEnd = latestInv?.actualEndDate;
                    const displayEnd = invoiceEnd || customer.subscriptionEnd;
                    return (
                      <>
                        {displayEnd}
                        {actualEnd && actualEnd !== invoiceEnd && (
                          <span className="ml-1 text-amber-600 font-medium text-xs">(actual: {new Date(actualEnd).toLocaleDateString('id-ID', { day: '2-digit', month: 'short', year: 'numeric' })})</span>
                        )}
                      </>
                    );
                  })()}
                </div>
              </div>
            )}
            <div>
              <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1">Status</label>
              <div>
                <span className={`inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium ${statusColors[customer.status] || 'bg-gray-100 text-gray-800'}`}>
                  {customer.status}
                </span>
              </div>
            </div>
            {customer.status === 'Churn' && (
              <div>
                <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1">Churn Tag</label>
                <div>
                  {customer.churnTag && customer.churnTag !== 'N/A' ? (
                    <span className={`inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium ${(churnTagColors as Record<string, string>)[customer.churnTag] || 'bg-gray-100 text-gray-800'}`}>
                      {customer.churnTag}
                    </span>
                  ) : (
                    <span className="text-sm text-gray-400">—</span>
                  )}
                </div>
              </div>
            )}
            {customer.status === 'Churn' && customer.churnReason && (
              <div>
                <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1">Churn Reason</label>
                <div className="text-sm text-gray-900 bg-yellow-50 p-3 rounded-md leading-relaxed">{customer.churnReason}</div>
              </div>
            )}
          </div>
        </div>

        {/* Invoices */}
        {invoices.length > 0 && (
          <div className="card p-6">
            <div className="flex items-center justify-between mb-4">
              <div>
                <h3 className="text-lg font-semibold text-gray-900">Invoices</h3>
                <p className="text-xs text-gray-400 mt-0.5">History of all subscription periods</p>
              </div>
              <span className="text-xs text-gray-400">{invoices.length} invoice{invoices.length > 1 ? 's' : ''}</span>
            </div>
            <div className="space-y-2">
              {invoices.map((inv) => {
                const formatInvDate = (d: string) => {
                  if (!d) return '-';
                  return new Date(d).toLocaleDateString('id-ID', { day: '2-digit', month: 'short', year: 'numeric' });
                };

                // Compute status from dates vs today (Jakarta time)
                const todayJkt = new Date(new Date().toLocaleString('en-US', { timeZone: 'Asia/Jakarta' }));
                todayJkt.setHours(0, 0, 0, 0);
                const start = inv.invoiceStartDate ? new Date(inv.invoiceStartDate + 'T00:00:00') : null;
                const end = inv.invoiceEndDate ? new Date(inv.invoiceEndDate + 'T00:00:00') : null;

                let periodStatus: 'Ongoing' | 'Incoming' | 'Completed' | null = null;
                if (start && end) {
                  if (end < todayJkt) periodStatus = 'Completed';
                  else if (start > todayJkt) periodStatus = 'Incoming';
                  else periodStatus = 'Ongoing';
                }

                const statusStyle: Record<string, string> = {
                  'Ongoing':   'bg-green-100 text-green-700',
                  'Incoming':  'bg-blue-100 text-blue-700',
                  'Completed': 'bg-gray-100 text-gray-500',
                };
                const rowStyle = periodStatus === 'Ongoing'
                  ? 'border-green-200 bg-green-50'
                  : periodStatus === 'Incoming'
                  ? 'border-blue-200 bg-blue-50'
                  : 'border-gray-100 bg-gray-50';

                const invStatusStyle: Record<string, string> = {
                  'Paid':      'bg-green-100 text-green-700',
                  'Open':      'bg-blue-100 text-blue-700',
                  'Overdue':   'bg-red-100 text-red-700',
                  'Cancelled': 'bg-gray-100 text-gray-500',
                };
                const canEditStatus = ['ADMIN', 'OWNER'].includes(session?.role ?? '');

                return (
                  <div
                    key={inv.id}
                    className={`flex items-center justify-between px-3 py-3 rounded-lg border ${rowStyle}`}
                  >
                    <div className="flex flex-col gap-0.5 min-w-0">
                      <div className="flex items-center gap-2">
                        <span className="text-xs font-mono text-gray-700">{inv.invoiceNumber}</span>
                        {periodStatus && (
                          <span className={`inline-flex items-center px-1.5 py-0.5 rounded text-xs font-semibold ${statusStyle[periodStatus]}`}>
                            {periodStatus}
                          </span>
                        )}
                        {/* Payment status */}
                        {invoiceStatusEditing === inv.id && canEditStatus ? (
                          <select
                            autoFocus
                            disabled={invoiceStatusSaving === inv.id}
                            defaultValue={inv.status ?? 'Open'}
                            onBlur={() => setInvoiceStatusEditing(null)}
                            onChange={(e) => handleInvoiceStatusChange(inv.id, e.target.value)}
                            className="text-xs border border-gray-300 rounded px-1 py-0.5 bg-white focus:outline-none focus:ring-1 focus:ring-blue-400"
                          >
                            <option value="Paid">Paid</option>
                            <option value="Open">Open</option>
                            <option value="Overdue">Overdue</option>
                            <option value="Cancelled">Cancelled</option>
                          </select>
                        ) : (
                          <span
                            onClick={() => canEditStatus && setInvoiceStatusEditing(inv.id)}
                            className={`inline-flex items-center px-1.5 py-0.5 rounded text-xs font-semibold ${invStatusStyle[inv.status ?? 'Open'] ?? 'bg-gray-100 text-gray-500'} ${canEditStatus ? 'cursor-pointer hover:opacity-75' : ''}`}
                            title={canEditStatus ? 'Klik untuk ubah status' : undefined}
                          >
                            {inv.status ?? 'Open'}
                          </span>
                        )}
                      </div>
                      {inv.invoiceStartDate && (
                        <span className="text-xs text-gray-400">
                          {formatInvDate(inv.invoiceStartDate)}
                          {inv.invoiceEndDate ? ` → ${formatInvDate(inv.invoiceEndDate)}` : ''}
                          {inv.actualEndDate && inv.actualEndDate !== inv.invoiceEndDate && (
                            <span className="ml-1 text-amber-600 font-medium">(actual: {formatInvDate(inv.actualEndDate)})</span>
                          )}
                        </span>
                      )}
                    </div>
                    <div className="flex items-center gap-1.5 ml-3 shrink-0">
                      <button
                        onClick={() => openHistoricalAttendance(inv)}
                        className="flex items-center gap-1 text-xs px-2 py-1.5 bg-white border border-gray-200 text-gray-700 hover:bg-gray-100 rounded-lg"
                      >
                        <Icons.calendar className="h-3.5 w-3.5" />
                        Attendance
                      </button>
                      <button
                        onClick={() => openInvoicePreview(inv.id, inv.invoiceNumber)}
                        className="flex items-center gap-1 text-xs px-2 py-1.5 bg-white border border-gray-200 text-gray-700 hover:bg-gray-100 rounded-lg"
                      >
                        <Icons.download className="h-3.5 w-3.5" />
                        Preview
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* Mitra Information */}
        <div className="card p-6">
          <h3 className="text-xl font-bold text-gray-900 mb-6">Mitra Information</h3>
          <div className="space-y-6">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1">Primary Mitra</label>
                <div className="text-base font-medium text-gray-900">{customer.cleaner1 || '—'}</div>
              </div>
              <div>
                <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1">Backup Mitra</label>
                <div className="text-base font-medium text-gray-900">{customer.cleaner2 || '—'}</div>
              </div>
            </div>

            {/* Attendance Record */}
            {visits.length > 0 && (
              <div className="pt-6 border-t border-gray-200">
                <div className="flex items-center justify-between mb-4">
                  <div>
                    <h4 className="text-md font-medium text-gray-900">
                      Attendance Record
                      {(customer.subscriptionPackage as string) !== 'Trial' && (
                        <span className="ml-2 text-xs text-gray-500">(Current invoice period)</span>
                      )}
                    </h4>
                  </div>

                  {/* Removed: Bulk attendance marking buttons (auto-Done workflow - feedback: too hassle for user) */}
                </div>
                {/* Summary stats */}
                <div className="flex items-center gap-3 mb-3">
                  <div className="flex items-center gap-1.5 px-3 py-1.5 bg-gray-100 rounded-lg">
                    <span className="text-xs text-gray-500">Total</span>
                    <span className="text-xs font-bold text-gray-800">{displayedVisits.length}</span>
                  </div>
                  <div className="flex items-center gap-1.5 px-3 py-1.5 bg-green-50 rounded-lg">
                    <span className="w-1.5 h-1.5 rounded-full bg-green-500 shrink-0" />
                    <span className="text-xs text-green-700">Done</span>
                    <span className="text-xs font-bold text-green-800">{displayedVisits.filter(v => v.status === 'Done').length}</span>
                  </div>
                  <div className="flex items-center gap-1.5 px-3 py-1.5 bg-red-50 rounded-lg">
                    <span className="w-1.5 h-1.5 rounded-full bg-red-400 shrink-0" />
                    <span className="text-xs text-red-600">Cancelled</span>
                    <span className="text-xs font-bold text-red-700">{displayedVisits.filter(v => v.status === 'Cancelled').length}</span>
                  </div>
                  {displayedVisits.filter(v => v.status === 'Scheduled').length > 0 && (
                    <div className="flex items-center gap-1.5 px-3 py-1.5 bg-amber-50 rounded-lg">
                      <span className="w-1.5 h-1.5 rounded-full bg-amber-400 shrink-0" />
                      <span className="text-xs text-amber-700">Scheduled</span>
                      <span className="text-xs font-bold text-amber-800">{displayedVisits.filter(v => v.status === 'Scheduled').length}</span>
                    </div>
                  )}
                </div>

                <div className="bg-gray-50 rounded-lg p-4">
                  <div className="space-y-3">
                    {paginatedVisits.map((visit, idx) => {
                      const displayNumber = (attendancePage - 1) * VISITS_PER_PAGE + idx + 1;
                      const mitraChanged = visit.originalMitraId && visit.actualMitraId && visit.originalMitraId !== visit.actualMitraId;
                      const hasHistory = mitraChanged || !!visit.updatedBy;
                      const isLocked = visit.status === 'Done';
                      const isCancelled = visit.status === 'Cancelled';
                      const isEditingThisDate = editingDateVisitId === visit.id;

                      // Display customer's current subscription package for all visits
                      const packageName = customer?.subscriptionPackage || visit.subscriptionPackage || 'N/A';

                      return (
                        <div
                          key={visit.id}
                          className={`rounded-xl border transition-all ${
                            isCancelled
                              ? 'bg-gray-50 border-gray-200 opacity-70'
                              : visit.status === 'Done'
                              ? 'bg-white border-green-200'
                              : 'bg-white border-gray-200 hover:border-gray-300 hover:shadow-sm'
                          }`}
                        >
                          {/* Card Header */}
                          <div className="flex items-center justify-between px-4 py-3 border-b border-dashed border-gray-100">
                            <div className="flex items-center gap-3">
                              <span className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold shrink-0 ${
                                isCancelled ? 'bg-gray-200 text-gray-500' : visit.status === 'Done' ? 'bg-green-100 text-green-700' : 'bg-blue-50 text-blue-600'
                              }`}>
                                {displayNumber}
                              </span>
                              <div className="flex items-center gap-2">
                                <span className={`text-sm font-semibold ${isCancelled ? 'text-gray-400 line-through' : 'text-gray-800'}`}>
                                  {visit.scheduledDate}
                                </span>
                                <span className="text-xs text-gray-400">{visit.scheduledDay}</span>
                              </div>
                            </div>
                            <span className={`px-2.5 py-0.5 text-xs font-semibold rounded-full ${
                              visit.status === 'Done'
                                ? 'bg-green-100 text-green-700'
                                : visit.status === 'Cancelled'
                                ? 'bg-red-100 text-red-600'
                                : 'bg-amber-50 text-amber-700 border border-amber-200'
                            }`}>
                              {visit.status}
                            </span>
                          </div>

                          {/* Card Body */}
                          <div className="px-4 py-3 space-y-2">
                            {/* Mitra row */}
                            <div className="flex items-center gap-2">
                              <Icons.user className="w-3.5 h-3.5 text-gray-400 shrink-0" />
                              <span className="text-xs text-gray-500">Mitra</span>
                              <span className={`text-xs font-medium ${isCancelled ? 'text-gray-400 line-through' : 'text-gray-800'}`}>
                                {visit.mitraName || 'Belum ditentukan'}
                              </span>
                              {mitraChanged && (
                                <span className="inline-flex items-center gap-1 px-1.5 py-0.5 text-xs font-medium bg-blue-50 text-blue-600 rounded border border-blue-100">
                                  Diganti
                                </span>
                              )}
                            </div>

                            {/* Package row */}
                            {packageName && (
                              <div className="flex items-center gap-2">
                                <Icons.package2 className="w-3.5 h-3.5 text-gray-400 shrink-0" />
                                <span className="text-xs text-gray-500">Paket</span>
                                <span className="text-xs font-medium text-gray-800">{packageName}</span>
                              </div>
                            )}

                            {/* Completion row */}
                            {visit.actualDate && (
                              <div className="flex items-center gap-2">
                                <Icons.check className="w-3.5 h-3.5 text-green-500 shrink-0" />
                                <span className="text-xs text-gray-500">Selesai</span>
                                <span className="text-xs font-medium text-gray-700">{visit.actualDate}</span>
                                {visit.updatedBy && (
                                  <span className="text-xs text-gray-400">· oleh {visit.updatedBy}</span>
                                )}
                              </div>
                            )}

                            {/* Cancelled notice */}
                            {isCancelled && (
                              <div className="flex items-center gap-2 mt-1">
                                <Icons.close className="w-3.5 h-3.5 text-red-400 shrink-0" />
                                <span className="text-xs text-red-500 font-medium">Visit dibatalkan</span>
                              </div>
                            )}
                          </div>

                          {/* Card Actions */}
                          <div className="flex items-center gap-1.5 px-4 py-2.5 bg-gray-50 rounded-b-xl border-t border-gray-100">
                            {!isCancelled && (
                              <>
                                <button
                                  onClick={() => { setSelectedVisitForDateEdit(visit); setEditDateValue(visit.scheduledDate); }}
                                  className="inline-flex items-center gap-1 px-2.5 py-1 text-xs font-medium text-orange-600 bg-orange-50 hover:bg-orange-100 border border-orange-200 rounded-lg transition-colors"
                                >
                                  <Icons.calendar className="w-3 h-3" />
                                  Edit Tanggal
                                </button>
                                <button
                                  onClick={() => openChangeMitraModal(visit)}
                                  className="inline-flex items-center gap-1 px-2.5 py-1 text-xs font-medium text-indigo-600 bg-indigo-50 hover:bg-indigo-100 border border-indigo-200 rounded-lg transition-colors"
                                >
                                  <Icons.user className="w-3 h-3" />
                                  Ganti Mitra
                                </button>
                              </>
                            )}
                            {isCancelled ? (
                              <button
                                onClick={() => handleCancelVisit(visit.id, visit.status)}
                                className="inline-flex items-center gap-1 px-2.5 py-1 text-xs font-medium text-green-700 bg-green-50 hover:bg-green-100 border border-green-200 rounded-lg transition-colors"
                              >
                                <Icons.check className="w-3 h-3" />
                                Jadwalkan Ulang
                              </button>
                            ) : (
                              <button
                                onClick={() => handleCancelVisit(visit.id, visit.status)}
                                className="inline-flex items-center gap-1 px-2.5 py-1 text-xs font-medium text-red-600 bg-red-50 hover:bg-red-100 border border-red-200 rounded-lg transition-colors"
                              >
                                <Icons.close className="w-3 h-3" />
                                Batalkan
                              </button>
                            )}
                            {hasHistory && (
                              <button
                                onClick={() => openHistoryModal(visit)}
                                className="ml-auto inline-flex items-center gap-1 px-2.5 py-1 text-xs font-medium text-gray-500 bg-white hover:bg-gray-100 border border-gray-200 rounded-lg transition-colors"
                              >
                                <Icons.clockIcon className="w-3 h-3" />
                                Riwayat
                              </button>
                            )}
                          </div>
                        </div>
                      );
                    })}
                  </div>

                  {/* Pagination */}
                  {totalAttendancePages > 1 && (
                    <div className="flex items-center justify-between pt-2 mt-1 border-t border-gray-200">
                      <span className="text-xs text-gray-500">
                        {(attendancePage - 1) * VISITS_PER_PAGE + 1}–{Math.min(attendancePage * VISITS_PER_PAGE, displayedVisits.length)} dari {displayedVisits.length} visit
                      </span>
                      <div className="flex items-center gap-1">
                        <button
                          onClick={() => setAttendancePage(p => Math.max(1, p - 1))}
                          disabled={attendancePage === 1}
                          className="px-2.5 py-1 text-xs font-medium text-gray-600 bg-white border border-gray-200 rounded-lg hover:bg-gray-50 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
                        >
                          ‹ Prev
                        </button>
                        {Array.from({ length: totalAttendancePages }, (_, i) => i + 1).map(p => (
                          <button
                            key={p}
                            onClick={() => setAttendancePage(p)}
                            className={`px-2.5 py-1 text-xs font-medium rounded-lg border transition-colors ${
                              p === attendancePage
                                ? 'bg-indigo-600 text-white border-indigo-600'
                                : 'bg-white text-gray-600 border-gray-200 hover:bg-gray-50'
                            }`}
                          >
                            {p}
                          </button>
                        ))}
                        <button
                          onClick={() => setAttendancePage(p => Math.min(totalAttendancePages, p + 1))}
                          disabled={attendancePage === totalAttendancePages}
                          className="px-2.5 py-1 text-xs font-medium text-gray-600 bg-white border border-gray-200 rounded-lg hover:bg-gray-50 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
                        >
                          Next ›
                        </button>
                      </div>
                    </div>
                  )}

                  {/* Empty state */}
                  {displayedVisits.length === 0 && (
                    <div className="text-center text-gray-500 py-4">
                      No visits scheduled yet.
                    </div>
                  )}
                </div>

                {/* Bulk Action Bar (Feedback 6a) */}
                {selectedVisits.size > 0 && (
                  <div className="mt-4 p-4 bg-indigo-50 border border-indigo-200 rounded-lg">
                    <div className="flex items-center justify-between">
                      <span className="text-sm font-medium text-indigo-900">
                        {selectedVisits.size} visit(s) selected
                      </span>
                      <div className="flex items-center space-x-3">
                        <button
                          onClick={handleBulkMarkAttended}
                          disabled={bulkActionLoading}
                          className="px-4 py-2 text-sm font-medium text-white bg-green-600 rounded-lg hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                          {bulkActionLoading ? 'Processing...' : '✓ Mark as Attended'}
                        </button>
                        <button
                          onClick={() => setSelectedVisits(new Set())}
                          disabled={bulkActionLoading}
                          className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 disabled:opacity-50"
                        >
                          Clear Selection
                        </button>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Actual End Date Confirm Dialog */}
      {actualEndDateConfirm && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-white rounded-2xl p-8 max-w-md w-full mx-4 shadow-2xl">
            {/* Icon */}
            <div className="flex items-center justify-center w-12 h-12 rounded-full bg-amber-100 mb-5 mx-auto">
              <svg className="w-6 h-6 text-amber-600" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
              </svg>
            </div>
            <h3 className="text-lg font-bold text-gray-900 mb-3 text-center">Visit Dipindah ke Luar Periode Invoice</h3>
            {/* Info box */}
            <div className="bg-gray-50 rounded-xl p-4 mb-5 space-y-2">
              <div className="flex items-center justify-between text-sm">
                <span className="text-gray-500">Tanggal baru</span>
                <span className="font-semibold text-gray-900">{actualEndDateConfirm.newDate}</span>
              </div>
              <div className="flex items-center justify-between text-sm">
                <span className="text-gray-500">Invoice</span>
                <span className="font-mono text-xs text-gray-700 bg-white border border-gray-200 px-2 py-0.5 rounded">{actualEndDateConfirm.invoiceNumber}</span>
              </div>
            </div>
            <p className="text-sm text-gray-600 text-center mb-6">
              Update <span className="font-medium text-gray-800">actual end date</span> invoice & tanggal akhir langganan ke tanggal ini?
            </p>
            <div className="flex gap-3">
              <button
                onClick={() => setActualEndDateConfirm(null)}
                disabled={savingActualEndDate}
                className="flex-1 px-4 py-3 text-sm font-medium text-gray-700 border border-gray-200 rounded-xl hover:bg-gray-50 transition-colors"
              >
                Tidak, biarkan
              </button>
              <button
                onClick={handleConfirmActualEndDate}
                disabled={savingActualEndDate}
                className="flex-1 px-4 py-3 text-sm font-semibold text-white bg-gray-900 rounded-xl hover:bg-gray-700 disabled:opacity-50 transition-colors"
              >
                {savingActualEndDate ? 'Menyimpan...' : 'Ya, update'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Historical Attendance Slide-Over */}
      {historicalSlideOver && (() => {
        const inv = historicalSlideOver.invoice;
        const invoiceVisits = getVisitsForInvoice(inv);
        const formatDate = (d: string) => d ? new Date(d).toLocaleDateString('id-ID', { day: '2-digit', month: 'short', year: 'numeric' }) : '-';
        return (
          <>
            {/* Backdrop */}
            <div
              className="fixed inset-0 bg-black/30 z-40 transition-opacity"
              onClick={closeHistoricalAttendance}
            />
            {/* Panel */}
            <div className="fixed top-0 right-0 h-full w-full max-w-md bg-white shadow-2xl z-50 flex flex-col">
              {/* Header */}
              <div className="flex items-start justify-between px-5 py-4 border-b border-gray-100">
                <div>
                  <p className="text-xs text-gray-400 font-mono mb-0.5">{inv.invoiceNumber}</p>
                  <h3 className="text-base font-semibold text-gray-900">Attendance Record</h3>
                  {inv.invoiceStartDate && (
                    <p className="text-xs text-gray-500 mt-0.5">
                      {formatDate(inv.invoiceStartDate)}{inv.invoiceEndDate ? ` → ${formatDate(inv.invoiceEndDate)}` : ''}
                    </p>
                  )}
                </div>
                <button
                  onClick={closeHistoricalAttendance}
                  className="p-1.5 hover:bg-gray-100 rounded-lg text-gray-400 hover:text-gray-600 transition-colors"
                >
                  <Icons.close className="w-4 h-4" />
                </button>
              </div>

              {/* Stats */}
              {invoiceVisits.length > 0 && (
                <div className="flex gap-3 px-5 py-3 border-b border-gray-100 bg-gray-50">
                  <div className="flex-1 text-center">
                    <div className="text-lg font-bold text-gray-900">{invoiceVisits.length}</div>
                    <div className="text-xs text-gray-400">Total</div>
                  </div>
                  <div className="flex-1 text-center">
                    <div className="text-lg font-bold text-green-600">{invoiceVisits.filter(v => v.status === 'Done').length}</div>
                    <div className="text-xs text-gray-400">Done</div>
                  </div>
                  <div className="flex-1 text-center">
                    <div className="text-lg font-bold text-amber-600">{invoiceVisits.filter(v => v.status === 'Scheduled').length}</div>
                    <div className="text-xs text-gray-400">Scheduled</div>
                  </div>
                  <div className="flex-1 text-center">
                    <div className="text-lg font-bold text-red-500">{invoiceVisits.filter(v => v.status === 'Cancelled').length}</div>
                    <div className="text-xs text-gray-400">Cancelled</div>
                  </div>
                </div>
              )}

              {/* Visit List */}
              <div className="flex-1 overflow-y-auto px-5 py-4">
                {invoiceVisits.length === 0 ? (
                  <div className="flex flex-col items-center justify-center h-full text-gray-400 gap-2">
                    <Icons.calendar className="w-8 h-8 opacity-30" />
                    <p className="text-sm">No attendance records for this period.</p>
                  </div>
                ) : (
                  <div className="space-y-2.5">
                    {invoiceVisits.map((visit, idx) => {
                      const displayNumber = idx + 1;
                      const isCancelled = visit.status === 'Cancelled';
                      const isDone = visit.status === 'Done';
                      return (
                        <div
                          key={visit.id}
                          className={`rounded-xl border px-4 py-3 ${
                            isCancelled
                              ? 'bg-gray-50 border-gray-200 opacity-70'
                              : isDone
                              ? 'bg-green-50 border-green-200'
                              : 'bg-white border-gray-200'
                          }`}
                        >
                          <div className="flex items-center justify-between mb-2">
                            <div className="flex items-center gap-2">
                              <span className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold shrink-0 ${
                                isCancelled ? 'bg-gray-200 text-gray-500' : isDone ? 'bg-green-100 text-green-700' : 'bg-blue-50 text-blue-600'
                              }`}>
                                {displayNumber}
                              </span>
                              <span className={`text-sm font-semibold ${isCancelled ? 'text-gray-400 line-through' : 'text-gray-800'}`}>
                                {visit.scheduledDate}
                              </span>
                              <span className="text-xs text-gray-400">{visit.scheduledDay}</span>
                            </div>
                            <span className={`px-2 py-0.5 text-xs font-semibold rounded-full ${
                              isDone ? 'bg-green-100 text-green-700' : isCancelled ? 'bg-red-100 text-red-600' : 'bg-amber-50 text-amber-700 border border-amber-200'
                            }`}>
                              {visit.status}
                            </span>
                          </div>
                          <div className="space-y-1">
                            <div className="flex items-center gap-1.5">
                              <Icons.user className="w-3 h-3 text-gray-400" />
                              <span className="text-xs text-gray-500">Mitra</span>
                              <span className={`text-xs font-medium ${isCancelled ? 'text-gray-400' : 'text-gray-700'}`}>
                                {visit.mitraName || '—'}
                              </span>
                            </div>
                            {visit.actualDate && (
                              <div className="flex items-center gap-1.5">
                                <Icons.check className="w-3 h-3 text-green-500" />
                                <span className="text-xs text-gray-500">Selesai</span>
                                <span className="text-xs font-medium text-gray-700">{visit.actualDate}</span>
                                {visit.updatedBy && (
                                  <span className="text-xs text-gray-400">· {visit.updatedBy}</span>
                                )}
                              </div>
                            )}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            </div>
          </>
        );
      })()}

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
            <h3 className="text-lg font-semibold text-gray-900 mb-4">Ganti Mitra untuk Visit #{selectedVisitForChange.visitNumber}</h3>
            <div className="mb-4 p-3 bg-gray-50 rounded">
              <p className="text-sm text-gray-600">
                <strong>Mitra Saat Ini:</strong> {selectedVisitForChange.mitraName}
              </p>
            </div>
            <div className="space-y-4">
              <div className="relative">
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Mitra Baru *
                </label>
                <input
                  type="text"
                  value={mitraSearchQuery}
                  onChange={(e) => {
                    setMitraSearchQuery(e.target.value);
                    setSelectedNewMitra(''); // clear selection when typing
                  }}
                  onFocus={() => setMitraSearchQuery(mitraSearchQuery)}
                  placeholder="Type to search mitra..."
                  className="input-field"
                  autoComplete="off"
                />
                {/* Selected mitra badge */}
                {selectedNewMitra && (
                  <div className="mt-1 flex items-center gap-2">
                    <span className="flex items-center gap-1 text-sm text-green-700 font-medium">
                      <Icons.check className="w-3 h-3" />
                      {availableMitrasForChange.find(m => m.mitraId === selectedNewMitra)?.mitraName}
                    </span>
                    <button
                      type="button"
                      onClick={() => { setSelectedNewMitra(''); setMitraSearchQuery(''); }}
                      className="flex items-center gap-0.5 text-xs text-gray-400 hover:text-gray-600"
                    >
                      <Icons.close className="w-3 h-3" /> Clear
                    </button>
                  </div>
                )}
                {/* Dropdown list */}
                {!selectedNewMitra && mitraSearchQuery && (
                  <ul className="absolute z-10 w-full bg-white border border-gray-200 rounded-lg shadow-lg mt-1 max-h-48 overflow-y-auto">
                    {availableMitrasForChange
                      .filter(mitra =>
                        mitra.mitraName.toLowerCase().includes(mitraSearchQuery.toLowerCase())
                      )
                      .map((mitra) => (
                        <li
                          key={mitra.mitraId}
                          onClick={() => {
                            setSelectedNewMitra(mitra.mitraId);
                            setMitraSearchQuery(mitra.mitraName);
                          }}
                          className="px-3 py-2 text-sm cursor-pointer hover:bg-indigo-50 hover:text-indigo-700"
                        >
                          {mitra.mitraName}
                          <span className="ml-2 text-xs text-gray-400">({mitra.availableSlots} slots)</span>
                        </li>
                      ))}
                    {availableMitrasForChange.filter(m =>
                      m.mitraName.toLowerCase().includes(mitraSearchQuery.toLowerCase())
                    ).length === 0 && (
                      <li className="px-3 py-2 text-sm text-gray-400">No mitra found</li>
                    )}
                  </ul>
                )}
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Alasan Penggantian *
                </label>
                <textarea
                  value={changeReason}
                  onChange={(e) => setChangeReason(e.target.value)}
                  placeholder="Kenapa mitra diganti?"
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
                Batal
              </button>
              <button
                onClick={saveMitraChange}
                className="btn-primary"
                disabled={loadingMitraChange}
              >
                {loadingMitraChange ? 'Menyimpan...' : 'Ganti Mitra'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Edit Visit Date Modal */}
      {selectedVisitForDateEdit && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 max-w-sm w-full mx-4">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">
              Edit Tanggal Visit #{selectedVisitForDateEdit.visitNumber}
            </h3>
            <div className="mb-4 p-3 bg-gray-50 rounded">
              <p className="text-sm text-gray-600">
                <strong>Tanggal Saat Ini:</strong> {selectedVisitForDateEdit.scheduledDate}
              </p>
            </div>
            <div className="mb-6">
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Tanggal Baru *
              </label>
              <input
                type="date"
                value={editDateValue}
                onChange={(e) => setEditDateValue(e.target.value)}
                className="input-field"
                min={new Date().toLocaleDateString('en-CA', { timeZone: 'Asia/Jakarta' })}
              />
            </div>
            <div className="flex justify-end space-x-3">
              <button
                onClick={() => setSelectedVisitForDateEdit(null)}
                className="btn-secondary"
                disabled={savingDateEdit}
              >
                Batal
              </button>
              <button
                onClick={saveVisitDateEdit}
                className="btn-primary"
                disabled={savingDateEdit || !editDateValue}
              >
                {savingDateEdit ? 'Menyimpan...' : 'Simpan Tanggal'}
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
              <p className="flex items-center gap-1 text-sm text-gray-700">
                <Icons.user className="w-3.5 h-3.5 text-gray-500" /> {selectedVisitForReschedule.mitraName}
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
                  min={customer?.firstDateSubscription ? (() => {
                    try {
                      // Convert dd/mm/yyyy to yyyy-mm-dd
                      const parts = customer.firstDateSubscription.split('/');
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
                  {customer?.firstDateSubscription && customer?.subscriptionEnd &&
                    ` (${customer.firstDateSubscription} - ${customer.subscriptionEnd})`
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
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-white rounded-2xl p-6 max-w-md w-full mx-4 shadow-2xl">
            {/* Header */}
            <div className="flex items-start justify-between mb-1">
              <div>
                <h3 className="text-base font-bold text-gray-900">Riwayat Visit #{selectedVisitHistory.visitNumber}</h3>
                <p className="text-xs text-gray-500 mt-0.5">
                  {selectedVisitHistory.scheduledDate} · {selectedVisitHistory.scheduledDay}
                </p>
              </div>
              <button
                onClick={() => { setShowHistoryModal(false); setSelectedVisitHistory(null); setVisitAuditLogs([]); }}
                className="text-gray-400 hover:text-gray-600 p-1 rounded-lg hover:bg-gray-100"
              >
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            {/* Current state */}
            <div className="flex items-center justify-between bg-gray-50 rounded-xl px-4 py-3 mt-4 mb-5">
              <div>
                <p className="text-xs text-gray-400 mb-0.5">Mitra saat ini</p>
                <p className="text-sm font-semibold text-gray-900">{selectedVisitHistory.mitraName || '—'}</p>
              </div>
              <div className="text-right">
                <p className="text-xs text-gray-400 mb-0.5">Status</p>
                <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${
                  selectedVisitHistory.status === 'Done' ? 'bg-green-100 text-green-700' :
                  selectedVisitHistory.status === 'Cancelled' ? 'bg-red-100 text-red-700' :
                  'bg-gray-100 text-gray-600'
                }`}>{selectedVisitHistory.status}</span>
              </div>
            </div>

            {/* Timeline */}
            <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-3">Riwayat Perubahan</p>
            {loadingAuditLogs ? (
              <div className="text-center py-6 text-sm text-gray-400">Memuat riwayat...</div>
            ) : visitAuditLogs.length === 0 ? (
              <div className="text-center py-6 text-sm text-gray-400">Belum ada riwayat perubahan.</div>
            ) : (
              <div className="space-y-3 max-h-60 overflow-y-auto pr-1">
                {visitAuditLogs.map((log, i) => {
                  const getActionMeta = (log: any) => {
                    if (log.action === 'EDIT_DATE' || log.action === 'RESCHEDULE_VISIT') return { label: 'Edit Tanggal', color: 'bg-amber-100 text-amber-700' };
                    if (log.action === 'CHANGE_MITRA') return { label: 'Ganti Mitra', color: 'bg-blue-100 text-blue-700' };
                    if (log.action === 'CANCEL') return { label: 'Dibatalkan', color: 'bg-red-100 text-red-700' };
                    if (log.action === 'RESTORE') return { label: 'Dijadwalkan Ulang', color: 'bg-green-100 text-green-700' };
                    return { label: log.action, color: 'bg-gray-100 text-gray-600' };
                  };
                  const meta = getActionMeta(log);
                  const date = new Date(log.createdAt);
                  const dateStr = date.toLocaleDateString('id-ID', { day: '2-digit', month: 'short', year: 'numeric' });
                  const timeStr = date.toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' });
                  return (
                    <div key={log.id} className="flex gap-3">
                      <div className="flex flex-col items-center">
                        <div className="w-2 h-2 rounded-full bg-gray-300 mt-1.5 shrink-0" />
                        {i < visitAuditLogs.length - 1 && <div className="w-px flex-1 bg-gray-200 mt-1" />}
                      </div>
                      <div className="pb-3 flex-1">
                        <div className="flex items-center gap-2 mb-1">
                          <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${meta.color}`}>{meta.label}</span>
                          <span className="text-xs text-gray-400">{dateStr} {timeStr}</span>
                        </div>
                        <p className="text-xs text-gray-500">{log.userEmail}</p>
                        {log.oldValue && log.newValue && (
                          <div className="mt-1.5 text-xs text-gray-500 space-y-0.5">
                            {log.oldValue.scheduledDate && log.newValue.scheduledDate && (
                              <p><span className="text-gray-400">Tanggal:</span> <span className="line-through">{log.oldValue.scheduledDate}</span> → <span className="font-medium text-gray-700">{log.newValue.scheduledDate}</span></p>
                            )}
                            {log.oldValue.mitraName && log.newValue.mitraName && (
                              <p><span className="text-gray-400">Mitra:</span> <span className="line-through">{log.oldValue.mitraName}</span> → <span className="font-medium text-gray-700">{log.newValue.mitraName}</span></p>
                            )}
                            {log.newValue.changeReason && (
                              <p><span className="text-gray-400">Alasan:</span> <span className="font-medium text-gray-700">{log.newValue.changeReason}</span></p>
                            )}
                            {log.newValue.reason && (
                              <p><span className="text-gray-400">Alasan:</span> <span className="font-medium text-gray-700">{log.newValue.reason?.replace('Cancellation reason: ', '')}</span></p>
                            )}
                          </div>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
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

      {/* Invoice PDF Preview Modal */}
      {previewInvoice && (
        <div
          className="fixed inset-0 z-[200] flex items-center justify-center bg-black/50 p-4"
          onClick={closeInvoicePreview}
        >
          <div
            className="bg-white rounded-xl shadow-2xl flex flex-col w-full max-w-4xl"
            style={{ height: '88vh' }}
            onClick={(e) => e.stopPropagation()}
          >
            {/* Header */}
            <div className="flex items-center justify-between px-6 py-4 border-b border-gray-200 shrink-0">
              <h2 className="text-sm font-semibold text-gray-800">Preview Invoice</h2>
              <div className="flex items-center gap-2">
                {previewInvoice.blobUrl && (
                  <a
                    href={previewInvoice.blobUrl}
                    download={`invoice-${previewInvoice.number.replace(/\//g, '-')}.pdf`}
                    className="flex items-center gap-1.5 px-3 py-1.5 bg-blue-600 text-white text-xs font-medium rounded-lg hover:bg-blue-700 transition-colors"
                  >
                    <Icons.download className="h-3.5 w-3.5" />
                    Download
                  </a>
                )}
                <button
                  onClick={closeInvoicePreview}
                  className="p-1.5 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-lg transition-colors"
                >
                  <Icons.x className="h-4 w-4" />
                </button>
              </div>
            </div>
            {/* PDF iframe */}
            <div className="flex-1 overflow-hidden rounded-b-xl">
              {previewInvoice.blobUrl ? (
                <iframe
                  src={previewInvoice.blobUrl}
                  className="w-full h-full border-0"
                  title="Invoice Preview"
                />
              ) : (
                <div className="flex items-center justify-center h-full text-sm text-gray-400 gap-2">
                  <Icons.loader className="h-4 w-4 animate-spin" />
                  Loading preview...
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
    </>
  );
}