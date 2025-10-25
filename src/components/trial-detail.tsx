'use client';

import { useState, useEffect } from 'react';
import { TrialDetail, TrialData, TrialStatus } from '@/types/trial';
import { Icons } from './icons';

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

export default function TrialDetailView({ trialId, onClose }: TrialDetailProps) {
  const [trial, setTrial] = useState<TrialData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  
  // Edit mode states
  const [isEditMode, setIsEditMode] = useState(false);
  const [updating, setUpdating] = useState(false);
  const [mitras, setMitras] = useState<Mitra[]>([]);
  const [loadingMitras, setLoadingMitras] = useState(false);
  
  // Edit form data
  const [editData, setEditData] = useState({
    startDate: '',
    endDate: '',
    assignedMitraId: '',
    status: 'Not Converted' as TrialStatus,
    notes: ''
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

  useEffect(() => {
    const fetchTrial = async () => {
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
              notes: trialData.notes || ''
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

    fetchTrial();
    fetchMitras(); // Load mitras when component mounts
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

  const handleConvertToCustomer = async () => {
    if (!trial || updating) return;

    if (!confirm(`Are you sure you want to convert trial "${trial.customerName}" to a customer? This will update the trial information and convert it to an active customer.`)) {
      return;
    }

    try {
      setUpdating(true);
      
      // First update the trial data if in edit mode
      if (isEditMode) {
        const updatePayload = {
          id: trialId,
          start_date: editData.startDate,
          end_date: editData.endDate,
          assigned_mitra: editData.assignedMitraId,
          subscription_status: 'Converted', // Set as converted since we're converting
          notes: editData.notes
        };

        const updateResponse = await fetch('/api/trial', {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(updatePayload),
        });

        if (!updateResponse.ok) {
          const errorData = await updateResponse.json().catch(() => ({}));
          throw new Error(errorData.message || 'Failed to update trial data');
        }
      }

      // Then convert to customer
      const response = await fetch(`/api/trials/${trialId}/convert`, {
        method: 'POST',
      });

      if (response.ok) {
        const result = await response.json();
        if (result.success) {
          alert('Trial successfully converted to customer!');
          onClose(); // Close the modal after conversion
        } else {
          alert(result.message || 'Failed to convert trial');
        }
      } else {
        const errorData = await response.json().catch(() => ({}));
        alert(errorData.message || 'Failed to convert trial');
      }
    } catch (err) {
      console.error('Error converting trial:', err);
      alert(`Failed to convert trial: ${err.message}`);
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
          notes: trial.notes || ''
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
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg shadow-xl max-w-4xl w-full mx-4 max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="px-6 py-4 border-b border-gray-200 flex items-center justify-between">
          <div>
            <h2 className="text-2xl font-semibold text-gray-900">Trial Details</h2>
            <p className="text-sm text-gray-600">Customer: {trial.customerName}</p>
          </div>
          <div className="flex items-center space-x-3">
            <button
              onClick={toggleEditMode}
              className={`px-4 py-2 rounded-lg transition-colors ${
                isEditMode 
                  ? 'bg-gray-100 text-gray-700 hover:bg-gray-200' 
                  : 'bg-blue-600 text-white hover:bg-blue-700'
              }`}
            >
              <Icons.edit className="w-4 h-4 mr-2 inline" />
              {isEditMode ? 'Cancel Edit' : 'Edit'}
            </button>
            <button
              onClick={onClose}
              className="p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-lg transition-colors"
            >
              <Icons.close className="w-6 h-6" />
            </button>
          </div>
        </div>

        {/* Content */}
        <div className="p-6 space-y-6">
          {/* Customer Information */}
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

          {/* Trial Assignments */}
          <div>
            <h3 className="text-lg font-medium text-gray-900 mb-4">Trial Assignments</h3>
            
            {isEditMode ? (
              /* Edit Mode - Editable Form */
              <div className="border border-gray-200 rounded-lg p-6 bg-blue-50">
                <div className="flex items-center justify-between mb-4">
                  <h4 className="text-sm font-medium text-gray-900">Edit Trial Assignment</h4>
                  <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
                    Edit Mode
                  </span>
                </div>
                
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
                  {/* Start Date */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Start Date
                    </label>
                    <input
                      type="date"
                      value={editData.startDate}
                      onChange={(e) => setEditData({ ...editData, startDate: e.target.value })}
                      className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                  </div>
                  
                  {/* End Date */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      End Date
                    </label>
                    <input
                      type="date"
                      value={editData.endDate}
                      onChange={(e) => setEditData({ ...editData, endDate: e.target.value })}
                      className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                  </div>
                  
                  {/* Assigned Cleaner */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Assigned Cleaner
                    </label>
                    <select
                      value={editData.assignedMitraId}
                      onChange={(e) => setEditData({ ...editData, assignedMitraId: e.target.value })}
                      className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                      disabled={loadingMitras}
                    >
                      <option value="">Select Cleaner</option>
                      {mitras.map((mitra) => (
                        <option key={mitra.id} value={mitra.id}>
                          {mitra.name}
                        </option>
                      ))}
                    </select>
                    {loadingMitras && (
                      <div className="text-xs text-blue-600 mt-1">Loading cleaners...</div>
                    )}
                    {!loadingMitras && mitras.length === 0 && (
                      <div className="text-xs text-red-600 mt-1">No cleaners available</div>
                    )}
                    {!loadingMitras && mitras.length > 0 && (
                      <div className="text-xs text-gray-500 mt-1">{mitras.length} cleaners available</div>
                    )}
                  </div>
                  
                  {/* Status */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Status
                    </label>
                    <select
                      value={editData.status}
                      onChange={(e) => setEditData({ ...editData, status: e.target.value as TrialStatus })}
                      className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                    >
                      <option value="Not Converted">Not Converted</option>
                      <option value="Converted">Converted</option>
                      <option value="Stalling/Postpone">Stalling/Postpone</option>
                      <option value="Cancelled">Cancelled</option>
                    </select>
                  </div>
                </div>
                
                {/* Notes Field */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Notes
                  </label>
                  <textarea
                    value={editData.notes}
                    onChange={(e) => setEditData({ ...editData, notes: e.target.value })}
                    className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                    rows={4}
                    placeholder="Add notes about this trial..."
                  />
                </div>
                
                {/* Info Text */}
                <div className="bg-blue-100 border border-blue-200 rounded-md p-3">
                  <div className="flex">
                    <div className="flex-shrink-0">
                      <Icons.users className="h-5 w-5 text-blue-400" />
                    </div>
                    <div className="ml-3">
                      <p className="text-sm text-blue-800">
                        When you convert to customer, all the updated information above will be saved and the trial will become an active customer.
                      </p>
                    </div>
                  </div>
                </div>
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

          {/* Timeline */}
          <div>
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

          {/* Notes */}
          <div>
            <h3 className="text-lg font-medium text-gray-900 mb-4">Notes</h3>
            <div className="bg-gray-50 rounded-lg p-4">
              {trial.notes ? (
                <p className="text-sm text-gray-900 whitespace-pre-wrap">{trial.notes}</p>
              ) : (
                <p className="text-sm text-gray-600">No notes added</p>
              )}
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="px-6 py-4 border-t border-gray-200 flex justify-between">
          <button 
            onClick={handleConvertToCustomer}
            disabled={updating}
            className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            {updating ? (
              <>
                <Icons.spinner className="w-4 h-4 mr-2 inline animate-spin" />
                Converting...
              </>
            ) : (
              <>
                <Icons.check className="w-4 h-4 mr-2 inline" />
                Convert to Customer
              </>
            )}
          </button>
          <button onClick={onClose} className="btn-primary">
            Close
          </button>
        </div>
      </div>
    </div>
  );
}