'use client';

import { useState, useEffect } from 'react';
import { MitraData, MitraSubscriptionType, MitraBonusCommission } from '@/types/mitra';
import { Icons } from './icons';

interface MitraDetailProps {
  mitraId: string;
  onClose: () => void;
  onUpdate?: () => void; // Callback after successful update
}

const statusColors = {
  'Active': 'bg-green-100 text-green-800',
  'Exit': 'bg-red-100 text-red-800',
  'Active-Flag': 'bg-yellow-100 text-yellow-800',
  'Banned': 'bg-gray-100 text-gray-800',
};

const partnershipColors = {
  'Full Time': 'bg-blue-100 text-blue-800',
  'Part Time': 'bg-purple-100 text-purple-800',
  'Fulltime': 'bg-blue-100 text-blue-800', // Legacy support
  'Partime': 'bg-purple-100 text-purple-800', // Legacy support
};

const bonusColors = {
  'Eligible': 'bg-green-100 text-green-800',
  'Not Eligible': 'bg-red-100 text-red-800',
};

// Helper functions for number formatting with thousands separator
const formatNumberWithSeparator = (value: string | number): string => {
  if (!value && value !== 0) return '';
  const num = typeof value === 'string' ? value.replace(/,/g, '') : String(value);
  const numericValue = num.replace(/[^0-9]/g, '');
  return numericValue.replace(/\B(?=(\d{3})+(?!\d))/g, ',');
};

const parseFormattedNumber = (value: string): number => {
  return parseInt(value.replace(/,/g, ''), 10) || 0;
};

export default function MitraDetailView({ mitraId, onClose, onUpdate }: MitraDetailProps) {
  const [mitra, setMitra] = useState<MitraData | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Editable form state
  const [formData, setFormData] = useState<Partial<MitraData>>({});

  const fetchMitra = async () => {
    try {
      setLoading(true);
      setError(null);

      const response = await fetch(`/api/mitra/${mitraId}?_t=${Date.now()}`);

      if (response.ok) {
        const data = await response.json();
        setMitra(data);
        setFormData(data); // Initialize form with current data
      } else {
        setError('Failed to load mitra details');
      }
    } catch (err) {
      setError('Failed to load mitra details');
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async () => {
    try {
      setSaving(true);

      const response = await fetch(`/api/mitra/${mitraId}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(formData),
      });

      if (response.ok) {
        alert('Mitra updated successfully');
        await fetchMitra(); // Refresh data
        if (onUpdate) onUpdate(); // Trigger parent refresh
      } else {
        const errorData = await response.json();
        alert(`Failed to update mitra: ${errorData.message || 'Unknown error'}`);
      }
    } catch (err) {
      console.error('Error updating mitra:', err);
      alert('Failed to update mitra');
    } finally {
      setSaving(false);
    }
  };

  const handleChange = (field: keyof MitraData, value: any) => {
    setFormData(prev => ({
      ...prev,
      [field]: value
    }));
  };

  useEffect(() => {
    fetchMitra();
  }, [mitraId]);

  if (loading) {
    return (
      <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
        <div className="bg-white rounded-lg p-8 max-w-2xl w-full mx-4">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-4 text-center text-gray-600">Loading mitra details...</p>
        </div>
      </div>
    );
  }

  if (error || !mitra) {
    return (
      <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
        <div className="bg-white rounded-lg p-8 max-w-2xl w-full mx-4">
          <div className="text-center">
            <Icons.close className="w-12 h-12 text-red-400 mx-auto mb-4" />
            <h3 className="text-lg font-medium text-gray-900 mb-2">Error Loading Mitra</h3>
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
        {/* Header with only close button on top right */}
        <div className="px-6 py-4 border-b border-gray-200 flex items-center justify-between sticky top-0 bg-white z-10">
          <div>
            <h2 className="text-2xl font-semibold text-gray-900">Edit Mitra Details</h2>
            <p className="text-sm text-gray-600">Partner: {mitra.name}</p>
            {mitra.mitraCode && (
              <p className="text-xs text-gray-500 font-mono">{mitra.mitraCode}</p>
            )}
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
          {/* Basic Information */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <h3 className="text-lg font-medium text-gray-900 mb-4">Personal Information</h3>
              <div className="space-y-3">
                <div>
                  <label className="block text-sm font-medium text-gray-700">Name</label>
                  <input
                    type="text"
                    value={formData.name || ''}
                    onChange={(e) => handleChange('name', e.target.value)}
                    className="input-field mt-1"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700">NIK</label>
                  <input
                    type="text"
                    value={formData.nik || ''}
                    onChange={(e) => handleChange('nik', e.target.value)}
                    className="input-field mt-1"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700">Gender</label>
                  <select
                    value={formData.gender || ''}
                    onChange={(e) => handleChange('gender', e.target.value)}
                    className="input-field mt-1"
                  >
                    <option value="">Select Gender</option>
                    <option value="Male">Male</option>
                    <option value="Female">Female</option>
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700">Date of Birth</label>
                  <input
                    type="date"
                    value={formData.bornDate || ''}
                    onChange={(e) => handleChange('bornDate', e.target.value)}
                    className="input-field mt-1"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700">Phone</label>
                  <input
                    type="tel"
                    value={formData.phone || ''}
                    onChange={(e) => handleChange('phone', e.target.value)}
                    className="input-field mt-1"
                    placeholder="08xxxxxxxxxx"
                  />
                </div>
              </div>
            </div>

            <div>
              <h3 className="text-lg font-medium text-gray-900 mb-4">Partnership Information</h3>
              <div className="space-y-3">
                <div>
                  <label className="block text-sm font-medium text-gray-700">Mitra Code (Read-only)</label>
                  <div className="mt-1 text-sm font-mono text-gray-900 bg-gray-50 px-3 py-2 rounded border border-gray-300">
                    {mitra.mitraCode}
                  </div>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700">Join Date</label>
                  <input
                    type="date"
                    value={formData.joinDate || ''}
                    onChange={(e) => handleChange('joinDate', e.target.value)}
                    className="input-field mt-1"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700">Partnership Type</label>
                  <select
                    value={formData.partnershipTypes || ''}
                    onChange={(e) => handleChange('partnershipTypes', e.target.value)}
                    className="input-field mt-1"
                  >
                    <option value="">Select Type</option>
                    <option value="Full Time">Full Time</option>
                    <option value="Part Time">Part Time</option>
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700">Status</label>
                  <select
                    value={formData.status || ''}
                    onChange={(e) => handleChange('status', e.target.value)}
                    className="input-field mt-1"
                  >
                    <option value="">Select Status</option>
                    <option value="Active">Active</option>
                    <option value="Exit">Exit</option>
                    <option value="Active-Flag">Active-Flag</option>
                    <option value="Banned">Banned</option>
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700">Tenure (months)</label>
                  <input
                    type="number"
                    value={formData.tenure || ''}
                    onChange={(e) => handleChange('tenure', e.target.value)}
                    className="input-field mt-1"
                    min="0"
                  />
                </div>
                {formData.status === 'Exit' && (
                  <div>
                    <label className="block text-sm font-medium text-gray-700">Exit Date</label>
                    <input
                      type="date"
                      value={formData.exitDate || ''}
                      onChange={(e) => handleChange('exitDate', e.target.value)}
                      className="input-field mt-1"
                    />
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Address */}
          <div>
            <h3 className="text-lg font-medium text-gray-900 mb-4">Address & Assignment</h3>
            <div className="bg-gray-50 rounded-lg p-4 space-y-3">
              <div>
                <label className="block text-sm font-medium text-gray-700">Residential Address</label>
                <textarea
                  value={formData.address || ''}
                  onChange={(e) => handleChange('address', e.target.value)}
                  className="input-field mt-1"
                  rows={2}
                  placeholder="Enter full address"
                />
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700">City Assignment</label>
                  <input
                    type="text"
                    value={formData.cityAssignment || ''}
                    onChange={(e) => handleChange('cityAssignment', e.target.value)}
                    className="input-field mt-1"
                    placeholder="e.g., Jakarta"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700">Location Assignment (Districts, comma-separated)</label>
                  <input
                    type="text"
                    value={formData.locationAssignment || ''}
                    onChange={(e) => handleChange('locationAssignment', e.target.value)}
                    className="input-field mt-1"
                    placeholder="e.g., Kebayoran Baru, Senayan"
                  />
                </div>
              </div>
            </div>
          </div>

          {/* Banking Information */}
          <div>
            <h3 className="text-lg font-medium text-gray-900 mb-4">Banking Information</h3>
            <div className="bg-gray-50 rounded-lg p-4">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700">Bank</label>
                  <input
                    type="text"
                    value={formData.bankAccount || ''}
                    onChange={(e) => handleChange('bankAccount', e.target.value)}
                    className="input-field mt-1"
                    placeholder="e.g., BCA"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700">Account Number</label>
                  <input
                    type="text"
                    value={formData.bankAccountNumber || ''}
                    onChange={(e) => handleChange('bankAccountNumber', e.target.value)}
                    className="input-field mt-1"
                    placeholder="Account number"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700">Account Holder</label>
                  <input
                    type="text"
                    value={formData.bankHoldersName || ''}
                    onChange={(e) => handleChange('bankHoldersName', e.target.value)}
                    className="input-field mt-1"
                    placeholder="Account holder name"
                  />
                </div>
              </div>
            </div>
          </div>

          {/* Subscription, Payout & Bonus Rate Section */}
          <div>
            <h3 className="text-lg font-medium text-gray-900 mb-4">Subscription & Rate Information</h3>
            <div className="bg-gray-50 rounded-lg p-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {/* Subscription Type */}
                <div>
                  <label className="block text-sm font-medium text-gray-700">Subscription Type</label>
                  <select
                    value={(formData as any).subscriptionType || 'Regular'}
                    onChange={(e) => handleChange('subscriptionType' as any, e.target.value)}
                    className="input-field mt-1"
                  >
                    <option value="Basic">Basic</option>
                    <option value="Regular">Regular</option>
                    <option value="Frequent">Frequent</option>
                  </select>
                  <p className="text-xs text-gray-500 mt-1">
                    Basic: 1 visit/week | Regular: 2 visits/week | Frequent: 3 visits/week
                  </p>
                </div>

                {/* Payout Rate */}
                <div>
                  <label className="block text-sm font-medium text-gray-700">Payout Rate (IDR)</label>
                  <input
                    type="text"
                    value={formatNumberWithSeparator((formData as any).payoutRate || 0)}
                    onChange={(e) => {
                      const numericValue = parseFormattedNumber(e.target.value);
                      handleChange('payoutRate' as any, numericValue);
                    }}
                    className="input-field mt-1"
                    placeholder="500,000"
                  />
                  <p className="text-xs text-gray-500 mt-1">Enter payout rate per month</p>
                </div>

                {/* Bonus Commission */}
                <div>
                  <label className="block text-sm font-medium text-gray-700">Bonus Commission</label>
                  <select
                    value={formData.bonus || ''}
                    onChange={(e) => {
                      const newValue = e.target.value;
                      handleChange('bonus', newValue);
                      // Reset bonus rate when not eligible
                      if (newValue === 'Not Eligible') {
                        handleChange('bonusRate' as any, 0);
                      }
                    }}
                    className="input-field mt-1"
                  >
                    <option value="">Select Bonus Commission</option>
                    <option value="Eligible">Eligible</option>
                    <option value="Not Eligible">Not Eligible</option>
                  </select>
                </div>

                {/* Bonus Rate - Only shown when Bonus Commission is Eligible */}
                {formData.bonus === 'Eligible' && (
                  <div>
                    <label className="block text-sm font-medium text-gray-700">Bonus Rate (IDR)</label>
                    <input
                      type="text"
                      value={formatNumberWithSeparator((formData as any).bonusRate || 0)}
                      onChange={(e) => {
                        const numericValue = parseFormattedNumber(e.target.value);
                        handleChange('bonusRate' as any, numericValue);
                      }}
                      className="input-field mt-1"
                      placeholder="500,000"
                    />
                    <p className="text-xs text-gray-500 mt-1">Enter bonus rate per month</p>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* Footer with Save and Cancel buttons */}
        <div className="px-6 py-4 border-t border-gray-200 bg-gray-50 flex justify-end gap-3 sticky bottom-0">
          <button
            onClick={onClose}
            className="btn-secondary"
            disabled={saving}
          >
            Cancel
          </button>
          <button
            onClick={handleSave}
            disabled={saving}
            className="btn-primary"
          >
            {saving ? 'Saving...' : 'Save Changes'}
          </button>
        </div>
      </div>
    </div>
  );
}
