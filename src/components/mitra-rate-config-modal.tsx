'use client';

import { useState, useEffect } from 'react';
import SimpleModal from './simple-modal';
import RateConfigForm from './rate-config-form';
import { Icons } from './icons';

interface RateConfig {
  id: string;
  subscriptionPackageId: string | null;
  subscriptionPackageName: string | null;
  monthlyRate: string;
  effectiveFrom: string;
  effectiveTo: string | null;
  notes: string;
  isActive: boolean;
}

interface MitraRateConfigModalProps {
  isOpen: boolean;
  onClose: () => void;
  mitraId: string;
  mitraName: string;
  defaultRate: string;
  onUpdate: () => void;
}

export default function MitraRateConfigModal({
  isOpen,
  onClose,
  mitraId,
  mitraName,
  defaultRate,
  onUpdate,
}: MitraRateConfigModalProps) {
  const [configs, setConfigs] = useState<RateConfig[]>([]);
  const [loading, setLoading] = useState(false);
  const [showForm, setShowForm] = useState(false);
  const [editingConfig, setEditingConfig] = useState<RateConfig | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [editingDefaultRate, setEditingDefaultRate] = useState(false);
  const [defaultRateValue, setDefaultRateValue] = useState(defaultRate);
  const [savingDefaultRate, setSavingDefaultRate] = useState(false);

  useEffect(() => {
    if (isOpen) {
      fetchConfigs();
      setDefaultRateValue(defaultRate);
      setEditingDefaultRate(false);
    }
  }, [isOpen, mitraId, defaultRate]);

  const fetchConfigs = async () => {
    try {
      setLoading(true);
      const response = await fetch(`/api/mitra/${mitraId}/rates`);
      if (!response.ok) throw new Error('Failed to fetch configs');

      const data = await response.json();
      setConfigs(data.data || []);
    } catch (err: any) {
      console.error('Error fetching configs:', err);
      showError('Failed to load rate configurations');
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async (formData: any) => {
    try {
      const url = editingConfig
        ? `/api/mitra/${mitraId}/rates`
        : `/api/mitra/${mitraId}/rates`;

      const method = editingConfig ? 'PATCH' : 'POST';
      const body = editingConfig
        ? { ...formData, rateConfigId: editingConfig.id }
        : formData;

      const response = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Failed to save');
      }

      showSuccess(editingConfig ? 'Rate configuration updated' : 'Rate configuration added');
      setShowForm(false);
      setEditingConfig(null);
      fetchConfigs();
      onUpdate();
    } catch (err: any) {
      throw err;
    }
  };

  const handleDelete = async (configId: string) => {
    if (!confirm('Are you sure you want to deactivate this rate configuration?')) {
      return;
    }

    try {
      const response = await fetch(`/api/mitra/${mitraId}/rates?rateConfigId=${configId}`, {
        method: 'DELETE',
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Failed to delete');
      }

      showSuccess('Rate configuration deactivated');
      fetchConfigs();
      onUpdate();
    } catch (err: any) {
      showError(err.message || 'Failed to deactivate configuration');
    }
  };

  const handleSaveDefaultRate = async () => {
    const numValue = parseFloat(defaultRateValue);
    if (isNaN(numValue) || numValue < 0) {
      showError('Please enter a valid rate (must be 0 or greater)');
      return;
    }

    try {
      setSavingDefaultRate(true);
      const response = await fetch(`/api/mitra/${mitraId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ monthlyBaseRate: defaultRateValue }),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Failed to update default rate');
      }

      showSuccess('Default monthly rate updated successfully');
      setEditingDefaultRate(false);
      onUpdate();
    } catch (err: any) {
      showError(err.message || 'Failed to update default rate');
    } finally {
      setSavingDefaultRate(false);
    }
  };

  const handleCancelDefaultRate = () => {
    setDefaultRateValue(defaultRate);
    setEditingDefaultRate(false);
  };

  const showSuccess = (message: string) => {
    setSuccessMessage(message);
    setTimeout(() => setSuccessMessage(null), 5000);
  };

  const showError = (message: string) => {
    setErrorMessage(message);
    setTimeout(() => setErrorMessage(null), 5000);
  };

  const formatCurrency = (value: string | number) => {
    const num = typeof value === 'string' ? parseFloat(value) : value;
    if (isNaN(num)) return 'Rp 0';
    return new Intl.NumberFormat('id-ID', {
      style: 'currency',
      currency: 'IDR',
      minimumFractionDigits: 0,
    }).format(num);
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('id-ID', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    });
  };

  return (
    <SimpleModal
      isOpen={isOpen}
      onClose={() => {
        setShowForm(false);
        setEditingConfig(null);
        onClose();
      }}
      title={`Rate Configuration: ${mitraName}`}
      size="xl"
    >
      {successMessage && (
        <div className="mb-4 bg-green-50 border border-green-200 text-green-700 px-4 py-3 rounded-lg flex items-center">
          <Icons.check className="h-5 w-5 mr-2" />
          <span>{successMessage}</span>
        </div>
      )}

      {errorMessage && (
        <div className="mb-4 bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg flex items-center">
          <Icons.alert className="h-5 w-5 mr-2" />
          <span>{errorMessage}</span>
        </div>
      )}

      {showForm ? (
        <div>
          <h3 className="text-lg font-medium text-gray-900 mb-4">
            {editingConfig ? 'Edit' : 'Add'} Rate Configuration
          </h3>
          <RateConfigForm
            mitraId={mitraId}
            existingConfig={editingConfig || undefined}
            onSave={handleSave}
            onCancel={() => {
              setShowForm(false);
              setEditingConfig(null);
            }}
          />
        </div>
      ) : (
        <div className="space-y-6">
          {/* Default Rate */}
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
            <div className="flex items-center justify-between">
              <div className="flex-1">
                <h3 className="text-sm font-medium text-blue-900">Default Monthly Rate</h3>
                {editingDefaultRate ? (
                  <div className="mt-2 flex items-center gap-2">
                    <input
                      type="number"
                      value={defaultRateValue}
                      onChange={(e) => setDefaultRateValue(e.target.value)}
                      className="block w-48 rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm"
                      placeholder="Enter amount"
                      disabled={savingDefaultRate}
                    />
                    <button
                      onClick={handleSaveDefaultRate}
                      disabled={savingDefaultRate}
                      className="inline-flex items-center px-3 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-green-600 hover:bg-green-700 disabled:opacity-50"
                    >
                      {savingDefaultRate ? <Icons.loader className="h-4 w-4 animate-spin" /> : <Icons.check className="h-4 w-4 mr-1" />}
                      Save
                    </button>
                    <button
                      onClick={handleCancelDefaultRate}
                      disabled={savingDefaultRate}
                      className="inline-flex items-center px-3 py-2 border border-gray-300 text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 disabled:opacity-50"
                    >
                      Cancel
                    </button>
                  </div>
                ) : (
                  <p className="mt-1 text-2xl font-bold text-blue-700">{formatCurrency(defaultRate)}</p>
                )}
                <p className="mt-1 text-xs text-blue-600">
                  Used when no package-specific configuration exists
                </p>
              </div>
              {!editingDefaultRate && (
                <button
                  onClick={() => setEditingDefaultRate(true)}
                  className="inline-flex items-center px-3 py-2 border border-blue-300 text-sm font-medium rounded-md text-blue-700 bg-white hover:bg-blue-50"
                >
                  <Icons.edit className="h-4 w-4 mr-1" />
                  Edit
                </button>
              )}
            </div>
          </div>

          {/* Package-Specific Rates */}
          <div>
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-medium text-gray-900">Package-Specific Rates</h3>
              <button
                onClick={() => setShowForm(true)}
                className="inline-flex items-center px-3 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
              >
                <Icons.plus className="h-4 w-4 mr-2" />
                Add Configuration
              </button>
            </div>

            {loading ? (
              <div className="flex items-center justify-center py-12">
                <Icons.loader className="h-8 w-8 animate-spin text-gray-400" />
              </div>
            ) : configs.length === 0 ? (
              <div className="text-center py-12 bg-gray-50 rounded-lg border-2 border-dashed border-gray-300">
                <Icons.info className="h-12 w-12 text-gray-400 mx-auto mb-3" />
                <p className="text-gray-500 mb-2">No package-specific configurations</p>
                <p className="text-sm text-gray-400 mb-4">
                  Default rate will be used for all customers
                </p>
                <button
                  onClick={() => setShowForm(true)}
                  className="inline-flex items-center px-4 py-2 border border-gray-300 text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50"
                >
                  <Icons.plus className="h-4 w-4 mr-2" />
                  Add First Configuration
                </button>
              </div>
            ) : (
              <div className="border border-gray-200 rounded-lg overflow-hidden">
                <table className="min-w-full divide-y divide-gray-200">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Package
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Monthly Rate
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Effective Period
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Status
                      </th>
                      <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Actions
                      </th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-200">
                    {configs.map((config) => (
                      <tr key={config.id} className="hover:bg-gray-50">
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="text-sm font-medium text-gray-900">
                            {config.subscriptionPackageName || 'Default (All Packages)'}
                          </div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="text-sm font-semibold text-gray-900">
                            {formatCurrency(config.monthlyRate)}
                          </div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="text-sm text-gray-500">
                            {formatDate(config.effectiveFrom)} →{' '}
                            {config.effectiveTo ? formatDate(config.effectiveTo) : 'Active'}
                          </div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <span
                            className={`px-2 py-1 inline-flex text-xs leading-5 font-semibold rounded-full ${
                              config.isActive
                                ? 'bg-green-100 text-green-800'
                                : 'bg-gray-100 text-gray-800'
                            }`}
                          >
                            {config.isActive ? 'Active' : 'Inactive'}
                          </span>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium space-x-2">
                          <button
                            onClick={() => {
                              setEditingConfig(config);
                              setShowForm(true);
                            }}
                            className="text-blue-600 hover:text-blue-900"
                          >
                            Edit
                          </button>
                          <button
                            onClick={() => handleDelete(config.id)}
                            className="text-red-600 hover:text-red-900"
                          >
                            Delete
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>

          {/* Info */}
          <div className="bg-gray-50 border border-gray-200 rounded-lg p-4">
            <h4 className="text-sm font-medium text-gray-900 mb-2">How it works</h4>
            <ul className="text-sm text-gray-600 space-y-1 list-disc list-inside">
              <li>Each configuration applies to a specific subscription package</li>
              <li>Payout calculation: (Completed Visits / Scheduled Visits) × Monthly Rate</li>
              <li>If no package-specific config exists, default rate is used</li>
              <li>Changes take effect from the "Effective From" date</li>
            </ul>
          </div>
        </div>
      )}
    </SimpleModal>
  );
}
