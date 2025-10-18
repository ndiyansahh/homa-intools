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

  useEffect(() => {
    fetchCustomer();
    fetchAvailableCleaners();
  }, [customerId]);

  const fetchCustomer = async () => {
    try {
      setLoading(true);
      setError(null);
      const response = await fetch(`/api/customers/${customerId}`);
      
      if (response.ok) {
        const data = await response.json();
        setCustomer(data);
        setNewDate(data.firstDateSubscription);
        setCleaner1(data.cleaner1);
        setCleaner2(data.cleaner2);
      } else {
        setError('Failed to load customer details');
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

  const handleUpdateDate = async () => {
    if (!newDate.trim()) {
      alert('Please enter a valid date');
      return;
    }

    try {
      setActionLoading(true);
      const response = await fetch(`/api/customers/${customerId}/update-date`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ newDate, endDate: endDate || undefined }),
      });

      if (response.ok) {
        alert('Date updated successfully');
        setShowUpdateDate(false);
        fetchCustomer(); // Refresh customer data
      } else {
        const error = await response.json();
        alert(error.error || 'Failed to update date');
      }
    } catch (error) {
      console.error('Error updating date:', error);
      alert('Failed to update date');
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
            onClick={() => setShowUpdateDate(true)}
            className="btn-primary"
          >
            Update Date
          </button>
          <button
            onClick={() => setShowAssignCleaner(true)}
            className="btn-secondary"
          >
            Assignee Cleaner
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
              <label className="block text-sm font-medium text-gray-700">No</label>
              <div className="mt-1 text-sm text-gray-900">{customer.no}</div>
            </div>
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
                <label className="block text-sm font-medium text-gray-700">LTV</label>
                <div className="mt-1 text-sm text-gray-900">{customer.ltv}</div>
              </div>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700">First Date Subscription</label>
              <div className="mt-1 text-sm text-gray-900">{customer.firstDateSubscription}</div>
            </div>
          </div>
        </div>

        {/* Status & Cleaners */}
        <div className="card p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Status & Cleaners</h3>
          <div className="space-y-3">
            <div>
              <label className="block text-sm font-medium text-gray-700">Status</label>
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
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700">Cleaner 1</label>
                <div className="mt-1 text-sm text-gray-900">{customer.cleaner1 || 'Not assigned'}</div>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700">Cleaner 2</label>
                <div className="mt-1 text-sm text-gray-900">{customer.cleaner2 || 'Not assigned'}</div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Update Date Modal */}
      {showUpdateDate && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 max-w-md w-full mx-4">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">Update Date</h3>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  New Subscription Date * (dd/MM/yyyy)
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
                  End Date (dd/MM/yyyy) - Optional
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
                {actionLoading ? 'Updating...' : 'Update Date'}
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
    </div>
  );
}