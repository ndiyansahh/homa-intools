'use client';

import { useState, useEffect } from 'react';
import { Icons } from './icons';
import { useToast } from '@/lib/toast';
import { useConfirm } from '@/components/confirm-dialog';

interface RateConfig {
  id: string;
  mitraId: string;
  subscriptionPackageId: string | null;
  subscriptionPackageName: string | null;
  monthlyRate: string;
  effectiveFrom: string;
  effectiveTo: string | null;
  notes: string | null;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
  createdBy: string | null;
}

interface SubscriptionPackage {
  id: string;
  subscriptionPackage: string;
  pricePerQty: string;
  priceNumeric: string;
}

interface MitraRateConfigProps {
  mitraId: string;
  mitraName: string;
}

// Helper functions for number formatting
const formatNumberWithSeparator = (value: string | number): string => {
  if (!value && value !== 0) return '';
  const num = typeof value === 'string' ? value.replace(/,/g, '') : String(value);
  const numericValue = num.replace(/[^0-9]/g, '');
  return numericValue.replace(/\B(?=(\d{3})+(?!\d))/g, ',');
};

const parseFormattedNumber = (value: string): number => {
  return parseInt(value.replace(/,/g, ''), 10) || 0;
};

export default function MitraRateConfig({ mitraId, mitraName }: MitraRateConfigProps) {
  const { toast } = useToast();
  const confirm = useConfirm();
  const [rateConfigs, setRateConfigs] = useState<RateConfig[]>([]);
  const [packages, setPackages] = useState<SubscriptionPackage[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [showForm, setShowForm] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Form state
  const [formData, setFormData] = useState({
    subscriptionPackageId: '',
    monthlyRate: '',
    effectiveFrom: new Date().toISOString().split('T')[0],
    effectiveTo: '',
    notes: '',
  });

  const [editingId, setEditingId] = useState<string | null>(null);

  // Fetch rate configs
  const fetchRateConfigs = async () => {
    try {
      setLoading(true);
      setError(null);

      const response = await fetch(`/api/mitra/${mitraId}/rates?_t=${Date.now()}`);

      if (response.ok) {
        const result = await response.json();
        if (result.success) {
          setRateConfigs(result.data || []);
        }
      } else {
        setError('Failed to load rate configurations');
      }
    } catch (err) {
      console.error('Error fetching rate configs:', err);
      setError('Failed to load rate configurations');
    } finally {
      setLoading(false);
    }
  };

  // Fetch subscription packages
  const fetchPackages = async () => {
    try {
      const response = await fetch(`/api/packages?_t=${Date.now()}`);

      if (response.ok) {
        const result = await response.json();
        if (result.success && result.data) {
          setPackages(result.data);
        }
      }
    } catch (err) {
      console.error('Error fetching packages:', err);
    }
  };

  useEffect(() => {
    fetchRateConfigs();
    fetchPackages();
  }, [mitraId]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!formData.monthlyRate || parseFormattedNumber(formData.monthlyRate) <= 0) {
      toast('warning', 'Monthly rate is required and must be greater than 0');
      return;
    }

    if (!formData.effectiveFrom) {
      toast('warning', 'Effective from date is required');
      return;
    }

    try {
      setSaving(true);

      const payload = {
        subscriptionPackageId: formData.subscriptionPackageId || null,
        monthlyRate: parseFormattedNumber(formData.monthlyRate),
        effectiveFrom: formData.effectiveFrom,
        effectiveTo: formData.effectiveTo || null,
        notes: formData.notes || '',
      };

      if (editingId) {
        // Update existing config
        const response = await fetch(`/api/mitra/${mitraId}/rates`, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            rateConfigId: editingId,
            ...payload,
          }),
        });

        if (response.ok) {
          toast('success', 'Rate configuration updated successfully');
          resetForm();
          await fetchRateConfigs();
        } else {
          const errorData = await response.json();
          toast('info', `Failed to update: ${errorData.error || 'Unknown error'}`);
        }
      } else {
        // Create new config
        const response = await fetch(`/api/mitra/${mitraId}/rates`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload),
        });

        if (response.ok) {
          toast('success', 'Rate configuration created successfully');
          resetForm();
          await fetchRateConfigs();
        } else {
          const errorData = await response.json();
          toast('info', `Failed to create: ${errorData.error || 'Unknown error'}`);
        }
      }
    } catch (err) {
      console.error('Error saving rate config:', err);
      toast('error', 'Failed to save rate configuration');
    } finally {
      setSaving(false);
    }
  };

  const handleEdit = (config: RateConfig) => {
    setFormData({
      subscriptionPackageId: config.subscriptionPackageId || '',
      monthlyRate: formatNumberWithSeparator(config.monthlyRate),
      effectiveFrom: config.effectiveFrom,
      effectiveTo: config.effectiveTo || '',
      notes: config.notes || '',
    });
    setEditingId(config.id);
    setShowForm(true);
  };

  const handleDeactivate = async (configId: string) => {
    const ok = await confirm({ title: 'Deactivate Rate', message: 'Deactivate this rate configuration?', confirmLabel: 'Deactivate', danger: true });
    if (!ok) return;

    try {
      const response = await fetch(`/api/mitra/${mitraId}/rates?rateConfigId=${configId}`, {
        method: 'DELETE',
      });

      if (response.ok) {
        toast('success', 'Rate configuration deactivated successfully');
        await fetchRateConfigs();
      } else {
        const errorData = await response.json();
        toast('info', `Failed to deactivate: ${errorData.error || 'Unknown error'}`);
      }
    } catch (err) {
      console.error('Error deactivating rate config:', err);
      toast('error', 'Failed to deactivate rate configuration');
    }
  };

  const resetForm = () => {
    setFormData({
      subscriptionPackageId: '',
      monthlyRate: '',
      effectiveFrom: new Date().toISOString().split('T')[0],
      effectiveTo: '',
      notes: '',
    });
    setEditingId(null);
    setShowForm(false);
  };

  const getPackageName = (packageId: string | null) => {
    if (!packageId) return 'All Packages (Default)';
    const pkg = packages.find(p => p.id === packageId);
    return pkg ? pkg.subscriptionPackage : 'Unknown Package';
  };

  if (loading) {
    return (
      <div className="bg-white rounded-lg border border-gray-200 p-6">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">Rate Configuration</h3>
        <div className="animate-pulse">
          <div className="h-4 bg-gray-200 rounded w-3/4 mb-2"></div>
          <div className="h-4 bg-gray-200 rounded w-1/2"></div>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-lg border border-gray-200 p-6">
      <div className="flex items-center justify-between mb-4">
        <div>
          <h3 className="text-lg font-semibold text-gray-900">Rate Configuration</h3>
          <p className="text-sm text-gray-600">
            Configure payout rates per subscription package for {mitraName}
          </p>
        </div>
        {!showForm && (
          <button
            onClick={() => setShowForm(true)}
            className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700"
          >
            <Icons.plus className="w-4 h-4 mr-2" />
            Add Rate Config
          </button>
        )}
      </div>

      {error && (
        <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-md">
          <p className="text-sm text-red-800">{error}</p>
        </div>
      )}

      {/* Form */}
      {showForm && (
        <form onSubmit={handleSubmit} className="mb-6 p-4 bg-blue-50 border border-blue-200 rounded-lg">
          <h4 className="text-md font-medium text-gray-900 mb-4">
            {editingId ? 'Edit Rate Configuration' : 'New Rate Configuration'}
          </h4>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Subscription Package
              </label>
              <select
                value={formData.subscriptionPackageId}
                onChange={(e) => setFormData({ ...formData, subscriptionPackageId: e.target.value })}
                className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm focus:ring-blue-500 focus:border-blue-500"
              >
                <option value="">All Packages (Default Rate)</option>
                {packages.map(pkg => (
                  <option key={pkg.id} value={pkg.id}>
                    {pkg.subscriptionPackage}
                  </option>
                ))}
              </select>
              <p className="text-xs text-gray-500 mt-1">
                Leave empty to set as default rate for all packages
              </p>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Monthly Rate (Rp) *
              </label>
              <input
                type="text"
                value={formData.monthlyRate}
                onChange={(e) => {
                  const formatted = formatNumberWithSeparator(e.target.value);
                  setFormData({ ...formData, monthlyRate: formatted });
                }}
                placeholder="900,000"
                className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm focus:ring-blue-500 focus:border-blue-500"
                required
              />
              <p className="text-xs text-gray-500 mt-1">
                Base payout per month (will be pro-rated)
              </p>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Effective From *
              </label>
              <input
                type="date"
                value={formData.effectiveFrom}
                onChange={(e) => setFormData({ ...formData, effectiveFrom: e.target.value })}
                className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm focus:ring-blue-500 focus:border-blue-500"
                required
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Effective To (Optional)
              </label>
              <input
                type="date"
                value={formData.effectiveTo}
                onChange={(e) => setFormData({ ...formData, effectiveTo: e.target.value })}
                className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm focus:ring-blue-500 focus:border-blue-500"
              />
              <p className="text-xs text-gray-500 mt-1">
                Leave empty for currently active rate
              </p>
            </div>

            <div className="md:col-span-2">
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Notes (Optional)
              </label>
              <textarea
                value={formData.notes}
                onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                rows={2}
                className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm focus:ring-blue-500 focus:border-blue-500"
                placeholder="Any additional notes about this rate configuration..."
              />
            </div>
          </div>

          <div className="flex justify-end space-x-2 mt-4">
            <button
              type="button"
              onClick={resetForm}
              className="px-4 py-2 border border-gray-300 rounded-md text-sm font-medium text-gray-700 hover:bg-gray-50"
              disabled={saving}
            >
              Cancel
            </button>
            <button
              type="submit"
              className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
              disabled={saving}
            >
              {saving ? (
                <>
                  <Icons.loader className="w-4 h-4 mr-2 animate-spin" />
                  Saving...
                </>
              ) : (
                <>
                  <Icons.check className="w-4 h-4 mr-2" />
                  {editingId ? 'Update' : 'Create'}
                </>
              )}
            </button>
          </div>
        </form>
      )}

      {/* Rate Configs List */}
      <div className="space-y-3">
        {rateConfigs.length === 0 ? (
          <div className="text-center py-8 bg-gray-50 rounded-lg border border-gray-200">
            <Icons.info className="w-12 h-12 text-gray-400 mx-auto mb-3" />
            <p className="text-gray-600 font-medium">No rate configurations yet</p>
            <p className="text-sm text-gray-500 mt-1">
              Add a rate configuration to set payout rates for this mitra
            </p>
          </div>
        ) : (
          rateConfigs.map((config) => (
            <div
              key={config.id}
              className={`border rounded-lg p-4 ${
                config.isActive ? 'border-green-200 bg-green-50' : 'border-gray-200 bg-gray-50'
              }`}
            >
              <div className="flex items-start justify-between">
                <div className="flex-1">
                  <div className="flex items-center space-x-2 mb-2">
                    <h4 className="font-medium text-gray-900">
                      {getPackageName(config.subscriptionPackageId)}
                    </h4>
                    <span
                      className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium ${
                        config.isActive
                          ? 'bg-green-100 text-green-800'
                          : 'bg-gray-100 text-gray-800'
                      }`}
                    >
                      {config.isActive ? 'Active' : 'Inactive'}
                    </span>
                  </div>

                  <div className="grid grid-cols-2 gap-4 text-sm">
                    <div>
                      <span className="text-gray-600">Monthly Rate:</span>
                      <p className="font-medium text-gray-900">
                        Rp {formatNumberWithSeparator(config.monthlyRate)}
                      </p>
                    </div>
                    <div>
                      <span className="text-gray-600">Effective Period:</span>
                      <p className="font-medium text-gray-900">
                        {new Date(config.effectiveFrom).toLocaleDateString('id-ID')}
                        {config.effectiveTo && (
                          <> - {new Date(config.effectiveTo).toLocaleDateString('id-ID')}</>
                        )}
                        {!config.effectiveTo && ' - Present'}
                      </p>
                    </div>
                  </div>

                  {config.notes && (
                    <div className="mt-2">
                      <span className="text-xs text-gray-600">Notes:</span>
                      <p className="text-sm text-gray-700 italic">{config.notes}</p>
                    </div>
                  )}

                  <div className="mt-2 text-xs text-gray-500">
                    Created: {new Date(config.createdAt).toLocaleDateString('id-ID')}
                    {config.createdBy && ` by ${config.createdBy}`}
                  </div>
                </div>

                <div className="flex items-center space-x-2 ml-4">
                  <button
                    onClick={() => handleEdit(config)}
                    className="p-2 text-blue-600 hover:bg-blue-50 rounded"
                    title="Edit"
                  >
                    <Icons.edit className="w-4 h-4" />
                  </button>
                  {config.isActive && (
                    <button
                      onClick={() => handleDeactivate(config.id)}
                      className="p-2 text-red-600 hover:bg-red-50 rounded"
                      title="Deactivate"
                    >
                      <Icons.trash className="w-4 h-4" />
                    </button>
                  )}
                </div>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}
