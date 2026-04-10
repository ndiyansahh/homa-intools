'use client';

import { useState, useEffect } from 'react';
import { TrialDetail, TrialData, TrialStatus } from '@/types/trial';
import { Icons } from './icons';
import { useToast } from '@/lib/toast';
import { useConfirm } from '@/components/confirm-dialog';

// Mitra interface for dropdown
interface Mitra {
  id: string;
  name: string;
  phone: string;
}

interface TrialDetailProps {
  trialId: string;
  onClose: () => void;
}

const statusColors: Record<string, string> = {
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
  'Office Space': 'bg-orange-100 text-orange-800',
  'Apartment': 'bg-indigo-100 text-indigo-800',
};

export default function TrialDetailView({ trialId, onClose }: TrialDetailProps) {
  const { toast } = useToast();
  const confirm = useConfirm();
  const [trial, setTrial] = useState<TrialData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  
  // Edit mode states
  const [isEditMode, setIsEditMode] = useState(false);
  const [updating, setUpdating] = useState(false);
  const [mitras, setMitras] = useState<Mitra[]>([]);
  const [loadingMitras, setLoadingMitras] = useState(false);
  const [subscriptionPackages, setSubscriptionPackages] = useState<any[]>([]);
  const [loadingPackages, setLoadingPackages] = useState(false);
  
  // Package-driven subscription states
  const [selectedPackageId, setSelectedPackageId] = useState('');
  const [requiredDays, setRequiredDays] = useState(0);
  const [dayPattern, setDayPattern] = useState({ day1: '', day2: '', day3: '' });
  const [subscriptionStartDate, setSubscriptionStartDate] = useState('');
  const [previewVisits, setPreviewVisits] = useState<any[]>([]);
  const [availableMitras, setAvailableMitras] = useState<any[]>([]);
  const [selectedMitraForSubscription, setSelectedMitraForSubscription] = useState('');
  
  // 2-step workflow states
  const [subscriptionCreated, setSubscriptionCreated] = useState(false);
  const [subscriptionData, setSubscriptionData] = useState<any>(null);
  const [creatingSubscription, setCreatingSubscription] = useState(false);
  const [convertingToCustomer, setConvertingToCustomer] = useState(false);
  const [promoCode, setPromoCode] = useState('');
  const [promoDiscount, setPromoDiscount] = useState<number>(0);
  
  // Edit form data
  const [editData, setEditData] = useState({
    startDate: '',
    endDate: '',
    assignedMitraId: '',
    status: 'Not Converted' as TrialStatus,
    notes: '',
    subscriptionPackage: '',
    totalSessions: 0,
    chosenDays: [] as string[]
  });

  // Fetch mitras for the dropdown
  const fetchMitras = async () => {
    try {
      setLoadingMitras(true);
      const response = await fetch('/api/mitra');
      
      if (response.ok) {
        const data = await response.json();
        const mitrasArray = Array.isArray(data) ? data : [];
        setMitras(mitrasArray);
      } else {
        console.error('Failed to fetch mitras:', response.status, response.statusText);
        setMitras([]);
      }
    } catch (error) {
      console.error('Error fetching mitras:', error);
      setMitras([]);
    } finally {
      setLoadingMitras(false);
    }
  };

  // Fetch subscription packages
  const fetchSubscriptionPackages = async () => {
    try {
      setLoadingPackages(true);
      const response = await fetch('/api/packages');
      
      if (response.ok) {
        const data = await response.json();
        const packagesArray = Array.isArray(data) ? data : (data.success ? data.data : []);
        setSubscriptionPackages(packagesArray);
      } else {
        console.error('Failed to fetch subscription packages:', response.status, response.statusText);
        setSubscriptionPackages([]);
      }
    } catch (error) {
      console.error('Error fetching subscription packages:', error);
      setSubscriptionPackages([]);
    } finally {
      setLoadingPackages(false);
    }
  };

  // Handle package selection for subscription
  const handlePackageSelect = async (packageId: string) => {
    setSelectedPackageId(packageId);
    
    if (!packageId) {
      setRequiredDays(0);
      setDayPattern({ day1: '', day2: '', day3: '' });
      setPreviewVisits([]);
      return;
    }

    // Find the selected package and get its visitsPerWeek
    const selectedPackage = subscriptionPackages.find(pkg => pkg.id === packageId);
    if (selectedPackage) {
      setRequiredDays(selectedPackage.visitsPerWeek || 0);
    }
  };

  // Generate visit preview
  const generateVisitPreview = async () => {
    if (!selectedPackageId || !subscriptionStartDate) return;
    
    // Get selected days from dayPattern
    const selectedDays = [dayPattern.day1, dayPattern.day2, dayPattern.day3]
      .filter(day => day && day !== '');
    
    if (selectedDays.length === 0) return;

    try {
      const response = await fetch('/api/subscriptions/preview', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          subscriptionPackageId: selectedPackageId,
          dayPattern: selectedDays,
          startDate: subscriptionStartDate
        })
      });

      if (response.ok) {
        const data = await response.json();
        if (data.success) {
          setPreviewVisits(data.data.scheduledDates);
        }
      }
    } catch (error) {
      console.error('Error generating visit preview:', error);
    }
  };

  // Check mitra availability
  const checkMitraAvailability = async () => {
    if (!subscriptionStartDate || previewVisits.length === 0) return;

    // Get selected days from dayPattern
    const selectedDays = [dayPattern.day1, dayPattern.day2, dayPattern.day3]
      .filter(day => day && day !== '');
    
    if (selectedDays.length === 0) return;

    // Calculate end date (1 month)
    const startDate = new Date(subscriptionStartDate);
    const endDate = new Date(startDate);
    endDate.setMonth(endDate.getMonth() + 1);
    endDate.setDate(endDate.getDate() - 1);

    try {
      const response = await fetch('/api/mitras/check-availability', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          dayPattern: selectedDays,
          startDate: startDate.toISOString().split('T')[0],
          endDate: endDate.toISOString().split('T')[0]
        })
      });

      if (response.ok) {
        const data = await response.json();
        if (data.success) {
          setAvailableMitras(data.data.availableMitras);
        }
      }
    } catch (error) {
      console.error('Error checking mitra availability:', error);
    }
  };

  // Step 1: Create subscription only (don't convert trial yet)
  const handleCreateSubscription = async () => {
    if (!selectedPackageId || !subscriptionStartDate || !selectedMitraForSubscription) {
      toast('warning', 'Please complete all subscription requirements');
      return;
    }

    setCreatingSubscription(true);
    try {
      const response = await fetch('/api/subscriptions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          customerId: trialId,
          subscriptionPackageId: selectedPackageId,
          dayPattern,
          subscriptionStartDate,
          mitraId: selectedMitraForSubscription
        })
      });

      if (response.ok) {
        const data = await response.json();
        if (data.success) {
          // Store subscription data and mark as created
          setSubscriptionData(data.data);
          setSubscriptionCreated(true);
          // Don't close popup yet - wait for customer conversion
        } else {
          toast('error', data.message || 'Failed to create subscription');
        }
      } else {
        const errorData = await response.json();
        toast('error', errorData.message || 'Failed to create subscription');
      }
    } catch (error) {
      console.error('Error creating subscription:', error);
      toast('error', 'Failed to create subscription');
    } finally {
      setCreatingSubscription(false);
    }
  };

  // Step 2: Convert trial to customer (includes notes update)
  const handleConvertToCustomer = async () => {
    if (!subscriptionData) {
      toast('warning', 'No subscription data available');
      return;
    }

    setConvertingToCustomer(true);
    try {
      // Use only user notes, no automatic subscription info added
      const userNotes = editData.notes?.trim() || '';

      // Get the selected package name from the subscription packages list
      const selectedPackage = subscriptionPackages.find(pkg => pkg.id === selectedPackageId);
      const packageName = selectedPackage?.subscriptionPackage || subscriptionData.packageName;

      // Update trial status to "Active" and save all dynamic data including subscription info
      const response = await fetch(`/api/trial`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          id: trialId,
          start_date: subscriptionData.subscriptionPeriod?.start || editData.startDate,
          end_date: subscriptionData.subscriptionPeriod?.end || editData.endDate,
          assigned_mitra: selectedMitraForSubscription || editData.assignedMitraId,
          subscription_status: 'Active',
          notes: userNotes,
          subscription_package: packageName, // Use the selected package name
          total_sessions: subscriptionData.totalVisits || editData.totalSessions,
          chosen_days: dayPattern ? Object.values(dayPattern).filter(day => day) : editData.chosenDays,
          qty_package: subscriptionData.quantity || 1, // Include quantity for proper pricing and LTV
          convert_to_customer: true, // Use dynamic conversion logic
          promo_code: promoCode || undefined,
          promo_discount: promoDiscount || undefined,
        })
      });

      if (response.ok) {
        const data = await response.json();
        if (data.success) {
          toast('info', `Trial successfully converted to customer! Subscription created with ${subscriptionData.totalVisits} visits.`);
          onClose(); // Now we can close the popup
        } else {
          toast('error', data.message || 'Failed to convert trial to customer');
        }
      } else {
        const errorData = await response.json();
        toast('error', errorData.message || 'Failed to convert trial to customer');
      }
    } catch (error) {
      console.error('Error converting to customer:', error);
      toast('error', 'Failed to convert trial to customer');
    } finally {
      setConvertingToCustomer(false);
    }
  };

  // Auto-generate visit preview when dependencies change
  useEffect(() => {
    generateVisitPreview();
  }, [subscriptionStartDate, dayPattern, selectedPackageId, requiredDays]);

  // Auto-check mitra availability when preview visits change
  useEffect(() => {
    checkMitraAvailability();
  }, [previewVisits]);

  // Fetch trial data function (can be reused)
  const fetchTrialData = async () => {
    try {
      setLoading(true);
      setError(null);
      const response = await fetch(`/api/trials/${trialId}`);
      
      if (response.ok) {
        const result = await response.json();
        if (result.success && result.data) {
          setTrial(result.data);
          
          // Populate edit form data when trial is loaded
          const trialData = result.data;
          const firstAssignment = trialData.assignments?.[0];
          
          console.log('Trial data for edit form:', trialData);
          console.log('First assignment:', firstAssignment);
          
          // Populate edit data with existing trial information
          setEditData({
            startDate: firstAssignment?.trialStart ? convertToDateInputFormat(firstAssignment.trialStart) : '',
            endDate: firstAssignment?.trialEnd ? convertToDateInputFormat(firstAssignment.trialEnd) : '',
            assignedMitraId: trialData.assignedMitraId || '',
            status: firstAssignment?.status || 'Not Converted',
            notes: trialData.customerNotes || '',
            subscriptionPackage: trialData.subscriptionPackage || '',
            totalSessions: trialData.totalSessions || 0,
            chosenDays: trialData.chosenDays || []
          });
        } else {
          setError('Failed to load trial details');
        }
      } else {
        const errorData = await response.json().catch(() => ({}));
        setError(errorData.message || 'Failed to load trial details');
      }
    } catch (err) {
      setError('Failed to load trial details');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchTrialData();
    fetchMitras(); // Load mitras when component mounts
    fetchSubscriptionPackages(); // Load subscription packages
  }, [trialId]);

  // Helper function to convert dd/mm/yyyy to yyyy-mm-dd format for HTML date input
  const convertToDateInputFormat = (ddmmyyyy: string): string => {
    if (!ddmmyyyy || ddmmyyyy.length !== 10) return '';
    const [day, month, year] = ddmmyyyy.split('/');
    return `${year}-${month.padStart(2, '0')}-${day.padStart(2, '0')}`;
  };

  // Helper function to convert yyyy-mm-dd to dd/mm/yyyy format
  const convertFromDateInputFormat = (yyyymmdd: string): string => {
    if (!yyyymmdd) return '';
    const [year, month, day] = yyyymmdd.split('-');
    return `${day.padStart(2, '0')}/${month.padStart(2, '0')}/${year}`;
  };

  const handleLegacyConvertToCustomer = async () => {
    if (!trial || updating) return;

    const ok = await confirm({ title: 'Convert Trial', message: `Convert "${trial.customerName}" to a customer?`, confirmLabel: 'Convert' });
    if (!ok) return;

    try {
      setUpdating(true);
      
      // First update the trial data if in edit mode
      if (isEditMode) {
        console.log('Updating trial data before conversion:', editData);
        
        const updatePayload = {
          id: trialId,
          start_date: editData.startDate,
          end_date: editData.endDate,
          assigned_mitra: editData.assignedMitraId,
          subscription_status: 'Active', // Set as Active when converting to customer
          notes: editData.notes,
          subscription_package: editData.subscriptionPackage,
          total_sessions: editData.totalSessions,
          chosen_days: editData.chosenDays,
          // Add additional fields for customer conversion
          convert_to_customer: true
        };

        console.log('Sending update payload:', updatePayload);

        const updateResponse = await fetch('/api/trial', {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(updatePayload),
        });

        if (!updateResponse.ok) {
          const errorData = await updateResponse.json().catch(() => ({}));
          throw new Error(errorData.message || 'Failed to update trial data');
        }

        const updateResult = await updateResponse.json();
        console.log('Trial update result:', updateResult);
      }

      // Then convert to customer
      const response = await fetch(`/api/trials/${trialId}/convert`, {
        method: 'POST',
      });

      if (response.ok) {
        const result = await response.json();
        if (result.success) {
          toast('success', 'Trial successfully converted to customer!');
          onClose(); // Close the modal after conversion
        } else {
          toast('error', result.message || 'Failed to convert trial');
        }
      } else {
        const errorData = await response.json().catch(() => ({}));
        toast('error', errorData.message || 'Failed to convert trial');
      }
    } catch (err) {
      console.error('Error converting trial:', err);
      toast('info', `Failed to convert trial: ${err instanceof Error ? err.message : String(err)}`);
    } finally {
      setUpdating(false);
    }
  };

  // Save trial changes in edit mode
  const handleSaveTrialChanges = async () => {
    if (!trial || updating) return;

    try {
      setUpdating(true);
      
      const updatePayload = {
        id: trialId,
        start_date: editData.startDate,
        end_date: editData.endDate,
        assigned_mitra_id: editData.assignedMitraId,
        status: editData.status,
        notes: editData.notes,
        subscription_package: editData.subscriptionPackage,
        total_sessions: editData.totalSessions,
        chosen_days: editData.chosenDays
      };

      console.log('Saving trial changes with payload:', updatePayload);

      const response = await fetch(`/api/trials/${trialId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(updatePayload)
      });

      if (response.ok) {
        const result = await response.json();
        if (result.success) {
          toast('success', 'Trial data updated successfully!');
          // Refresh trial data
          fetchTrialData();
          // Exit edit mode
          setIsEditMode(false);
        } else {
          toast('error', result.message || 'Failed to update trial data');
        }
      } else {
        const errorData = await response.json();
        toast('error', errorData.message || 'Failed to update trial data');
      }
    } catch (error) {
      console.error('Error updating trial data:', error);
      toast('error', 'Failed to update trial data');
    } finally {
      setUpdating(false);
    }
  };

  const toggleEditMode = () => {
    if (isEditMode) {
      // Exiting edit mode - reset form data to original trial data
      const firstAssignment = trial?.assignments?.[0];
      if (trial) {
        console.log('Resetting edit form data, trial.assignedMitraId:', trial.assignedMitraId);
        setEditData({
          startDate: firstAssignment?.trialStart ? convertToDateInputFormat(firstAssignment.trialStart) : '',
          endDate: firstAssignment?.trialEnd ? convertToDateInputFormat(firstAssignment.trialEnd) : '',
          assignedMitraId: trial.assignedMitraId || '',
          status: firstAssignment?.status || 'Not Converted',
          notes: (trial as any).customerNotes || '',
          subscriptionPackage: trial.subscriptionPackage || '',
          totalSessions: trial.totalSessions || 0,
          chosenDays: trial.chosenDays || []
        });
      }
    }
    setIsEditMode(!isEditMode);
  };

  if (loading) {
    return (
      <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
        <div className="bg-white rounded-lg p-8 max-w-2xl w-full mx-4">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-4 text-center text-gray-600">Loading trial details...</p>
        </div>
      </div>
    );
  }

  if (error || !trial) {
    return (
      <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
        <div className="bg-white rounded-lg p-8 max-w-2xl w-full mx-4">
          <div className="text-center">
            <Icons.close className="w-12 h-12 text-red-400 mx-auto mb-4" />
            <h3 className="text-lg font-medium text-gray-900 mb-2">Error Loading Trial</h3>
            <p className="text-gray-600 mb-4">{error}</p>
            <button onClick={onClose} className="btn-primary">
              Close
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header Card */}
      <div className="card">
        <div className="p-6 border-b border-gray-200">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <button
                onClick={onClose}
                className="p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-lg transition-colors"
                title="Back to trials"
              >
                <Icons.arrowLeft className="w-5 h-5" />
              </button>
              <div>
                <h1 className="text-2xl font-bold text-gray-900">Trial Details</h1>
                <p className="text-sm text-gray-600 mt-1">Customer: {trial.customerName}</p>
              </div>
            </div>
            <button
              onClick={toggleEditMode}
              className={`px-4 py-2 rounded-lg transition-colors flex items-center gap-2 ${
                isEditMode
                  ? 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                  : 'bg-blue-600 text-white hover:bg-blue-700'
              }`}
            >
              <Icons.edit className="w-4 h-4" />
              {isEditMode ? 'Cancel Edit' : 'Edit'}
            </button>
          </div>
        </div>

        {/* Customer Information */}
        <div className="p-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <h3 className="text-lg font-medium text-gray-900 mb-4">Customer Information</h3>
              <div className="space-y-3">
                <div>
                  <label className="block text-sm font-medium text-gray-700">Customer Name</label>
                  <div className="mt-1 text-sm text-gray-900">{trial.customerName}</div>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700">Acquisition</label>
                  <div className="mt-1">
                    <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${acquisitionColors[trial.acquisition]}`}>
                      {trial.acquisition}
                    </span>
                  </div>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700">Residential Type</label>
                  <div className="mt-1">
                    <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${residentialColors[trial.residentialType]}`}>
                      {trial.residentialType}
                    </span>
                  </div>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700">Assigned Cleaner</label>
                  <div className="mt-1 text-sm text-gray-900">
                    {trial.assignedCleaner ? (
                      <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-green-100 text-green-800">
                        <svg className="w-3 h-3 mr-1" fill="currentColor" viewBox="0 0 20 20">
                          <path fillRule="evenodd" d="M10 9a3 3 0 100-6 3 3 0 000 6zm-7 9a7 7 0 1114 0H3z" clipRule="evenodd" />
                        </svg>
                        {trial.assignedCleaner}
                      </span>
                    ) : (
                      <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-gray-100 text-gray-600">
                        <svg className="w-3 h-3 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                        </svg>
                        No cleaner assigned
                      </span>
                    )}
                  </div>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700">Subscription Package</label>
                  <div className="mt-1 text-sm text-gray-900">
                    {trial.subscriptionPackage ? (
                      <div className="bg-blue-50 border border-blue-200 rounded-md p-3">
                        <div className="font-medium text-blue-900">{trial.subscriptionPackage}</div>
                        {/* Display package details - for Trial status only show subscription_package */}
                        {(() => {
                          // Find matching package from database
                          const selectedPackage = subscriptionPackages.find(pkg => 
                            pkg.subscriptionPackage === trial.subscriptionPackage
                          );
                          
                          return (
                            <div className="mt-2 space-y-1">
                              {selectedPackage && (
                                <>
                                  {/* For Trial package, only show package name, not pricing */}
                                  {selectedPackage.subscriptionPackage === 'Trial' ? (
                                    <div className="text-xs text-blue-700">
                                       Trial Package
                                    </div>
                                  ) : (
                                    <>
                                      <div className="text-xs text-blue-700">
                                        💰 {selectedPackage.pricePerQty} / month
                                      </div>
                                      {/* Extract hours and visits from package name */}
                                      {(() => {
                                        const match = selectedPackage.subscriptionPackage.match(/(\d+)\s*hours?.*?(\d+)\s*visits?\s*per\s*week/i);
                                        if (match) {
                                          return (
                                            <div className="text-xs text-blue-700">
                                              📅 {match[1]} hours per visit • {match[2]} visits per week
                                            </div>
                                          );
                                        }
                                        return null;
                                      })()}
                                    </>
                                  )}
                                </>
                              )}
                              {(trial.totalSessions || 0) > 0 && (
                                <div className="text-xs text-blue-700">
                                  🎯 {trial.totalSessions} total sessions
                                </div>
                              )}
                              {trial.chosenDays && trial.chosenDays.length > 0 && (
                                <div className="text-xs text-blue-700">
                                  📆 Available days: {Array.isArray(trial.chosenDays) ? trial.chosenDays.join(', ') : trial.chosenDays}
                                </div>
                              )}
                            </div>
                          );
                        })()}
                      </div>
                    ) : (
                      <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-gray-100 text-gray-600">
                        No package selected
                      </span>
                    )}
                  </div>
                </div>
              </div>
            </div>

            <div>
              <h3 className="text-lg font-medium text-gray-900 mb-4">Location Details</h3>
              <div className="space-y-3">
                <div>
                  <label className="block text-sm font-medium text-gray-700">Address</label>
                  <div className="mt-1 text-sm text-gray-900">{trial.address}</div>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700">District</label>
                  <div className="mt-1 text-sm text-gray-900">{trial.district}</div>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700">City</label>
                    <div className="mt-1 text-sm text-gray-900">{trial.city}</div>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700">Postal Code</label>
                    <div className="mt-1 text-sm text-gray-900">{trial.postalCode}</div>
                  </div>
                </div>
                {trial.village && (
                  <div className="mt-3">
                    <label className="block text-sm font-medium text-gray-700">Village</label>
                    <div className="mt-1 text-sm text-gray-900">{trial.village}</div>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Trial Assignments Card */}
      <div className="card">
        <div className="p-6">
          <h3 className="text-lg font-medium text-gray-900 mb-4">Trial Assignments</h3>
            
            {isEditMode ? (
              /* Edit Mode - Package-Driven Subscription Management */
              <div>
                <h4 className="text-lg font-medium text-gray-900 mb-4">Package-Driven Subscription Management</h4>
                
                {/* Step 1: Package Selection */}
                <div className="mb-6 p-4 bg-blue-50 border border-blue-200 rounded-lg">
                  <h5 className="text-sm font-medium text-blue-900 mb-2">
                    <span className="inline-flex items-center justify-center w-6 h-6 bg-blue-600 text-white text-xs font-bold rounded-full mr-2">1</span>
                    Select Subscription Package
                  </h5>
                  <select
                    value={selectedPackageId}
                    onChange={(e) => handlePackageSelect(e.target.value)}
                    className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                  >
                    <option value="">Choose a package...</option>
                    {subscriptionPackages
                      .filter(pkg => !pkg.subscriptionPackage.toLowerCase().includes('trial'))
                      .map((pkg) => (
                        <option key={pkg.id} value={pkg.id}>
                          {pkg.subscriptionPackage} - {pkg.pricePerQty}
                        </option>
                      ))}
                  </select>
                  {selectedPackageId && (
                    <div className="mt-2 text-sm text-blue-700">
                      ✅ This package requires selecting {requiredDays} day(s) per week
                    </div>
                  )}
                </div>

                {/* Step 2: Start Date Selection */}
                {selectedPackageId && (
                  <div className="mb-6 p-4 bg-green-50 border border-green-200 rounded-lg">
                    <h5 className="text-sm font-medium text-green-900 mb-2">
                      <span className="inline-flex items-center justify-center w-6 h-6 bg-green-600 text-white text-xs font-bold rounded-full mr-2">2</span>
                      Select Start Date
                    </h5>
                    <input
                      type="date"
                      value={subscriptionStartDate}
                      onChange={(e) => setSubscriptionStartDate(e.target.value)}
                      min={new Date().toISOString().split('T')[0]}
                      className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-green-500"
                    />
                    {subscriptionStartDate && (
                      <div className="mt-2 text-sm text-green-700">
                        ✅ Subscription period: {subscriptionStartDate} to {new Date(new Date(subscriptionStartDate).getTime() + 30*24*60*60*1000).toISOString().split('T')[0]}
                      </div>
                    )}
                  </div>
                )}

                {/* Step 3: Day Pattern Selection */}
                {selectedPackageId && subscriptionStartDate && (
                  <div className="mb-6 p-4 bg-yellow-50 border border-yellow-200 rounded-lg">
                    <h5 className="text-sm font-medium text-yellow-900 mb-2">
                      <span className="inline-flex items-center justify-center w-6 h-6 bg-yellow-600 text-white text-xs font-bold rounded-full mr-2">3</span>
                      Select Day Pattern ({requiredDays} days required)
                    </h5>
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                      {Array.from({ length: requiredDays }, (_, index) => (
                        <div key={index}>
                          <label className="block text-sm font-medium text-gray-700 mb-1">Day {index + 1}</label>
                          <select
                            value={dayPattern[`day${index + 1}` as keyof typeof dayPattern]}
                            onChange={(e) => setDayPattern({ 
                              ...dayPattern, 
                              [`day${index + 1}`]: e.target.value 
                            })}
                            className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-yellow-500"
                          >
                            <option value="">Select day...</option>
                            {['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday']
                              .filter(day => !Object.values(dayPattern).includes(day) || dayPattern[`day${index + 1}` as keyof typeof dayPattern] === day)
                              .map((day) => (
                                <option key={day} value={day}>{day}</option>
                              ))}
                          </select>
                        </div>
                      ))}
                    </div>
                    {Object.values(dayPattern).filter(day => day).length === requiredDays && (
                      <div className="mt-2 text-sm text-yellow-700">
                        ✅ Selected days: {Object.values(dayPattern).filter(day => day).join(', ')}
                      </div>
                    )}
                  </div>
                )}

                {/* Step 4: Visit Preview */}
                {previewVisits.length > 0 && (
                  <div className="mb-6 p-4 bg-purple-50 border border-purple-200 rounded-lg">
                    <h5 className="text-sm font-medium text-purple-900 mb-2">
                      <span className="inline-flex items-center justify-center w-6 h-6 bg-purple-600 text-white text-xs font-bold rounded-full mr-2">4</span>
                      Generated Visits Preview ({previewVisits.length} total)
                    </h5>
                    <div className="max-h-40 overflow-y-auto">
                      <table className="w-full text-xs">
                        <thead className="bg-purple-100">
                          <tr>
                            <th className="p-2 text-left">Visit #</th>
                            <th className="p-2 text-left">Date</th>
                            <th className="p-2 text-left">Day</th>
                            <th className="p-2 text-left">Status</th>
                          </tr>
                        </thead>
                        <tbody>
                          {previewVisits.map((visit) => (
                            <tr key={visit.visitNumber} className="border-t border-purple-200">
                              <td className="p-2">Visit-{visit.visitNumber}</td>
                              <td className="p-2">{visit.date}</td>
                              <td className="p-2">{visit.day}</td>
                              <td className="p-2 text-gray-500">Scheduled</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                    <div className="mt-2 text-sm text-purple-700">
                      ✅ Auto-based on day pattern and calendar dates
                    </div>
                  </div>
                )}

                {/* Step 5: Mitra Selection */}
                {(subscriptionStartDate && previewVisits.length > 0) && (
                  <div className="mb-6 p-4 bg-indigo-50 border border-indigo-200 rounded-lg">
                    <h5 className="text-sm font-medium text-indigo-900 mb-2">
                      <span className="inline-flex items-center justify-center w-6 h-6 bg-indigo-600 text-white text-xs font-bold rounded-full mr-2">5</span>
                      Select Available Mitra
                    </h5>
                    {availableMitras.length > 0 ? (
                      <>
                        <select
                          value={selectedMitraForSubscription}
                          onChange={(e) => setSelectedMitraForSubscription(e.target.value)}
                          className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
                        >
                          <option value="">Choose mitra...</option>
                          {availableMitras.map((mitra) => (
                            <option key={mitra.mitraId} value={mitra.mitraId}>
                              {mitra.mitraName} - Available for all {previewVisits.length} visits
                            </option>
                          ))}
                        </select>
                        {selectedMitraForSubscription && (
                          <div className="mt-2 text-sm text-indigo-700">
                            ✅ Selected mitra is available for complete subscription pattern
                          </div>
                        )}
                        <div className="mt-2 text-sm text-green-600">
                          {availableMitras.length} mitra tersedia untuk jadwal ini
                        </div>
                      </>
                    ) : (
                      <>
                        <select
                          disabled
                          className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm bg-gray-100 text-gray-500 cursor-not-allowed"
                        >
                          <option value="">No mitra available...</option>
                        </select>
                        <div className="mt-2 text-sm text-red-500">
                          Mitra tidak available untuk jadwal yang dipilih. Silakan pilih tanggal atau pola hari yang berbeda.
                        </div>
                      </>
                    )}
                  </div>
                )}

                {/* 2-Step Workflow: Create Subscription + Convert Customer */}
                {selectedPackageId && subscriptionStartDate && previewVisits.length > 0 && availableMitras.length > 0 && selectedMitraForSubscription && !subscriptionCreated && (
                  <div className="bg-gray-50 border border-gray-200 rounded-lg p-4">
                    <button
                      onClick={handleCreateSubscription}
                      disabled={creatingSubscription}
                      className="w-full bg-blue-600 text-white py-3 px-4 rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                    >
                      {creatingSubscription ? (
                        <>
                          <div className="inline-block animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                          Creating Subscription...
                        </>
                      ) : (
                        `Step 1: Create Subscription (${previewVisits.length} visits)`
                      )}
                    </button>
                  </div>
                )}

                {/* Step 2: Subscription Created - Show Success Message Only */}
                {subscriptionCreated && subscriptionData && (
                  <div className="bg-green-50 border border-green-200 rounded-lg p-4">
                    <div className="text-center">
                      <div className="inline-flex items-center justify-center w-12 h-12 bg-green-100 rounded-full mb-3">
                        <svg className="w-6 h-6 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                        </svg>
                      </div>
                      <h3 className="text-lg font-medium text-green-900 mb-2">Subscription Created Successfully!</h3>
                      <div className="text-sm text-green-700 mb-4">
                        <p><strong>Package:</strong> {subscriptionData.packageName}</p>
                        <p><strong>Total Visits:</strong> {subscriptionData.totalVisits}</p>
                        <p><strong>Period:</strong> {subscriptionData.subscriptionPeriod?.start} to {subscriptionData.subscriptionPeriod?.end}</p>
                      </div>
                      <div className="bg-blue-50 border border-blue-200 rounded-lg p-3 mt-4">
                        <p className="text-sm text-blue-700 text-center">
                          <strong>Ready to convert this trial to a customer?</strong><br/>
                          Click "Convert to Customer" below to save all changes and complete the process.
                        </p>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            ) : (
              /* View Mode - Display Information */
              <div className="space-y-4">
                {trial.assignments.map((assignment, index) => (
                  <div key={assignment.id} className="border border-gray-200 rounded-lg p-4">
                    <div className="flex items-center justify-between mb-3">
                      <h4 className="text-sm font-medium text-gray-900">Assignment #{index + 1}</h4>
                      <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${statusColors[assignment.status]}`}>
                        {assignment.status}
                      </span>
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                      <div>
                        <label className="block text-sm font-medium text-gray-700">Start Date</label>
                        <div className="mt-1 text-sm text-gray-900">{assignment.trialStart}</div>
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-700">End Date</label>
                        <div className="mt-1 text-sm text-gray-900">{assignment.trialEnd || 'Ongoing'}</div>
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-700">Assigned Cleaner</label>
                        <div className="mt-1">
                          <span className="inline-flex items-center px-3 py-1 rounded-full text-sm font-medium bg-blue-100 text-blue-800">
                            <Icons.users className="w-4 h-4 mr-1" />
                            {assignment.assignedCleaner}
                          </span>
                        </div>
                      </div>
                    </div>
                    {assignment.ltv !== undefined && (
                      <div className="mt-3">
                        <label className="block text-sm font-medium text-gray-700">LTV (Months)</label>
                        <div className="mt-1">
                          <span className="inline-flex items-center px-3 py-1 rounded-full text-sm font-medium bg-green-100 text-green-800">
                            {assignment.ltv} months
                          </span>
                        </div>
                      </div>
                    )}
                    {assignment.reasonForNotConverting && (
                      <div className="mt-3">
                        <label className="block text-sm font-medium text-gray-700">Reason for Not Converting</label>
                        <div className="mt-1 text-sm text-gray-900 bg-yellow-50 p-2 rounded">
                          {assignment.reasonForNotConverting}
                        </div>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}
        </div>
      </div>

      {/* Timeline Card */}
      <div className="card">
        <div className="p-6">
          <h3 className="text-lg font-medium text-gray-900 mb-4">Timeline</h3>
            <div className="bg-gray-50 rounded-lg p-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700">Created</label>
                  <div className="mt-1 text-sm text-gray-900">
                    {new Date(trial.createdAt).toLocaleString('en-GB', {
                      timeZone: 'Asia/Jakarta',
                      day: '2-digit',
                      month: '2-digit',
                      year: 'numeric',
                      hour: '2-digit',
                      minute: '2-digit',
                    })}
                  </div>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700">Last Updated</label>
                  <div className="mt-1 text-sm text-gray-900">
                    {new Date(trial.updatedAt).toLocaleString('en-GB', {
                      timeZone: 'Asia/Jakarta',
                      day: '2-digit',
                      month: '2-digit',
                      year: 'numeric',
                      hour: '2-digit',
                      minute: '2-digit',
                    })}
                  </div>
                </div>
              </div>
            </div>
        </div>
      </div>

      {/* Notes Card */}
      <div className="card">
        <div className="p-6">
          <h3 className="text-lg font-medium text-gray-900 mb-4">Notes</h3>
            {isEditMode ? (
              <div>
                <textarea
                  value={editData.notes}
                  onChange={(e) => setEditData({ ...editData, notes: e.target.value })}
                  placeholder="Add notes about this trial..."
                  rows={4}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                />
                <p className="text-xs text-gray-500 mt-1">Notes will be saved when you convert this trial to customer.</p>
              </div>
            ) : (
              <div className="bg-gray-50 rounded-lg p-4">
                {(trial as any).customerNotes ? (
                  <p className="text-sm text-gray-900 whitespace-pre-wrap">{(trial as any).customerNotes}</p>
                ) : (
                  <p className="text-sm text-gray-600">No notes added</p>
                )}
              </div>
            )}
        </div>
      </div>

      {/* Action Buttons Card */}
      {isEditMode && subscriptionCreated && subscriptionData && (
        <div className="card">
          <div className="p-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Kode Promo <span className="text-gray-400">(opsional)</span></label>
                <input
                  type="text"
                  value={promoCode}
                  onChange={(e) => setPromoCode(e.target.value)}
                  placeholder="Contoh: REG990"
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Diskon / Promotion (Rp) <span className="text-gray-400">(opsional)</span></label>
                <input
                  type="number"
                  value={promoDiscount}
                  onChange={(e) => setPromoDiscount(Number(e.target.value))}
                  placeholder="0"
                  min={0}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                />
              </div>
            </div>
            <div className="flex items-center justify-between gap-4">
              <button
                onClick={toggleEditMode}
                disabled={convertingToCustomer}
                className="px-4 py-2 bg-gray-600 text-white rounded-lg hover:bg-gray-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={handleConvertToCustomer}
                disabled={convertingToCustomer}
                className="px-6 py-3 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors font-medium flex items-center gap-2"
              >
                {convertingToCustomer ? (
                  <>
                    <div className="inline-block animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                    Converting to Customer...
                  </>
                ) : (
                  <>
                    <Icons.check className="w-4 h-4" />
                    Step 2: Convert to Customer
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}

      {!isEditMode && (
        <div className="card">
          <div className="p-6">
            <div className="flex items-center justify-end gap-4">
              <button
                onClick={handleLegacyConvertToCustomer}
                disabled={updating}
                className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors flex items-center gap-2"
              >
                {updating ? (
                  <>
                    <Icons.spinner className="w-4 h-4 animate-spin" />
                    Converting...
                  </>
                ) : (
                  <>
                    <Icons.check className="w-4 h-4" />
                    Convert to Customer
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}