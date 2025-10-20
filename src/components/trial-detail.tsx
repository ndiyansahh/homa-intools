'use client';

import { useState, useEffect } from 'react';
import { TrialDetail, TrialData } from '@/types/trial';
import { Icons } from './icons';

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
  const [converting, setConverting] = useState(false);

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
  }, [trialId]);

  const handleConvertTrial = async () => {
    if (!trial || converting) return;

    if (!confirm(`Are you sure you want to convert trial "${trial.customerName}" to a customer?`)) {
      return;
    }

    try {
      setConverting(true);
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
      alert('Failed to convert trial');
    } finally {
      setConverting(false);
    }
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
          <button
            onClick={onClose}
            className="p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-lg transition-colors"
          >
            <Icons.close className="w-6 h-6" />
          </button>
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

          {/* Trial Assignments with Per-Assignment Status */}
          <div>
            <h3 className="text-lg font-medium text-gray-900 mb-4">Trial Assignments</h3>
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
                      <label className="block text-sm font-medium text-gray-700">Trial Start</label>
                      <div className="mt-1 text-sm text-gray-900">{assignment.trialStart}</div>
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700">Trial End</label>
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
            onClick={handleConvertTrial}
            disabled={converting}
            className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            {converting ? 'Converting...' : 'Convert to Customer'}
          </button>
          <button onClick={onClose} className="btn-primary">
            Close
          </button>
        </div>
      </div>
    </div>
  );
}