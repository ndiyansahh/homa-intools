'use client';

import { useState, useEffect } from 'react';
import { Icons } from './icons';

interface SubscriptionPackage {
  id: string;
  subscriptionPackage: string;
  priceNumeric: number;
}

interface RateConfigFormProps {
  mitraId: string;
  existingConfig?: {
    id: string;
    subscriptionPackageId: string | null;
    monthlyRate: string;
    effectiveFrom: string;
    notes: string;
  };
  onSave: (data: any) => Promise<void>;
  onCancel: () => void;
}

export default function RateConfigForm({
  mitraId,
  existingConfig,
  onSave,
  onCancel,
}: RateConfigFormProps) {
  const [packages, setPackages] = useState<SubscriptionPackage[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [formData, setFormData] = useState({
    subscriptionPackageId: existingConfig?.subscriptionPackageId || '',
    monthlyRate: existingConfig?.monthlyRate || '',
    effectiveFrom: existingConfig?.effectiveFrom || new Date().toISOString().split('T')[0],
    notes: existingConfig?.notes || '',
  });

  useEffect(() => {
    fetchPackages();
  }, []);

  const fetchPackages = async () => {
    try {
      setLoading(true);
      const response = await fetch('/api/subscription-packages');
      if (!response.ok) throw new Error('Failed to fetch packages');

      const data = await response.json();
      setPackages(data.data || []);
    } catch (err: any) {
      console.error('Error fetching packages:', err);
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    // Validation
    if (!formData.monthlyRate || parseFloat(formData.monthlyRate) <= 0) {
      setError('Please enter a valid monthly rate');
      return;
    }

    if (!formData.effectiveFrom) {
      setError('Please select an effective date');
      return;
    }

    try {
      setSaving(true);
      await onSave({
        subscriptionPackageId: formData.subscriptionPackageId || null,
        monthlyRate: parseFloat(formData.monthlyRate),
        effectiveFrom: formData.effectiveFrom,
        notes: formData.notes,
      });
    } catch (err: any) {
      setError(err.message || 'Failed to save rate configuration');
      setSaving(false);
    }
  };

  const formatCurrency = (value: string) => {
    const num = parseFloat(value.replace(/[^0-9]/g, ''));
    if (isNaN(num)) return '';
    return new Intl.NumberFormat('id-ID').format(num);
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      {error && (
        <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg flex items-center">
          <Icons.alert className="h-5 w-5 mr-2" />
          <span>{error}</span>
        </div>
      )}

      {/* Subscription Package */}
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-2">
          Subscription Package
        </label>
        {loading ? (
          <div className="flex items-center text-gray-500">
            <Icons.loader className="h-4 w-4 animate-spin mr-2" />
            Loading packages...
          </div>
        ) : (
          <select
            value={formData.subscriptionPackageId}
            onChange={(e) => setFormData({ ...formData, subscriptionPackageId: e.target.value })}
            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          >
            <option value="">Default (All Packages)</option>
            {packages.map((pkg) => (
              <option key={pkg.id} value={pkg.id}>
                {pkg.subscriptionPackage} - Rp {formatCurrency(pkg.priceNumeric.toString())}
              </option>
            ))}
          </select>
        )}
        <p className="mt-1 text-xs text-gray-500">
          Leave as "Default" to apply this rate to all customers, or select a specific package
        </p>
      </div>

      {/* Monthly Rate */}
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-2">
          Monthly Rate <span className="text-red-500">*</span>
        </label>
        <div className="relative">
          <span className="absolute left-3 top-2 text-gray-500">Rp</span>
          <input
            type="text"
            value={formatCurrency(formData.monthlyRate)}
            onChange={(e) => {
              const raw = e.target.value.replace(/[^0-9]/g, '');
              setFormData({ ...formData, monthlyRate: raw });
            }}
            placeholder="900000"
            required
            className="w-full pl-12 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          />
        </div>
        <p className="mt-1 text-xs text-gray-500">
          Monthly payout rate will be prorated based on completed vs scheduled visits
        </p>
      </div>

      {/* Effective From */}
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-2">
          Effective From <span className="text-red-500">*</span>
        </label>
        <input
          type="date"
          value={formData.effectiveFrom}
          onChange={(e) => setFormData({ ...formData, effectiveFrom: e.target.value })}
          required
          className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
        />
        <p className="mt-1 text-xs text-gray-500">
          This rate will be active from this date onwards
        </p>
      </div>

      {/* Notes */}
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-2">
          Notes (Optional)
        </label>
        <textarea
          value={formData.notes}
          onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
          rows={3}
          placeholder="Add any notes about this rate configuration..."
          className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
        />
      </div>

      {/* Actions */}
      <div className="flex items-center justify-end space-x-3 pt-4 border-t border-gray-200">
        <button
          type="button"
          onClick={onCancel}
          disabled={saving}
          className="px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed"
        >
          Cancel
        </button>
        <button
          type="submit"
          disabled={saving}
          className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed flex items-center"
        >
          {saving ? (
            <>
              <Icons.loader className="h-4 w-4 animate-spin mr-2" />
              Saving...
            </>
          ) : (
            <>
              <Icons.check className="h-4 w-4 mr-2" />
              {existingConfig ? 'Update' : 'Add'} Rate
            </>
          )}
        </button>
      </div>
    </form>
  );
}
