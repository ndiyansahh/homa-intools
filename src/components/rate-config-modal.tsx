'use client';

import { useState, useEffect } from 'react';
import SimpleModal from './simple-modal';
import { Icons } from './icons';

interface Mitra {
  id: string;
  name: string;
  mitraCode: string;
}

interface RateConfig {
  id: string;
  mitraId: string;
  mitraName: string;
  mitraCode: string;
  visitsPerWeek: number;
  payoutRate: string;
  trialRatePerVisit?: string | null;

}

interface RateConfigModalProps {
  isOpen: boolean;
  onClose: () => void;
  existingRate: RateConfig | null;
  isAddMode: boolean;
  onSave: () => void;
}

export default function RateConfigModal({
  isOpen,
  onClose,
  existingRate,
  isAddMode,
  onSave,
}: RateConfigModalProps) {
  const [mitras, setMitras] = useState<Mitra[]>([]);
  const [loadingMitras, setLoadingMitras] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [formData, setFormData] = useState({
    mitraId: existingRate?.mitraId || '',
    visitsPerWeek: existingRate?.visitsPerWeek || 1,
    payoutRate: existingRate?.payoutRate || '',
    trialRatePerVisit: existingRate?.trialRatePerVisit || '',
  });

  useEffect(() => {
    if (isOpen && isAddMode) {
      fetchMitras();
    }
  }, [isOpen, isAddMode]);

  useEffect(() => {
    if (existingRate) {
      setFormData({
        mitraId: existingRate.mitraId,
        visitsPerWeek: existingRate.visitsPerWeek,
        payoutRate: existingRate.payoutRate,
        trialRatePerVisit: existingRate.trialRatePerVisit || '',
      });
    }
  }, [existingRate]);

  const fetchMitras = async () => {
    try {
      setLoadingMitras(true);
      const response = await fetch('/api/mitra?limit=1000&status=Active');
      if (!response.ok) throw new Error('Failed to fetch mitras');

      const data = await response.json();
      setMitras(data.items || []);
    } catch (err: any) {
      console.error('Error fetching mitras:', err);
      setError('Failed to load mitras');
    } finally {
      setLoadingMitras(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    // Validation
    if (!formData.mitraId) {
      setError('Please select a mitra');
      return;
    }

    if (!formData.visitsPerWeek || formData.visitsPerWeek < 1 || formData.visitsPerWeek > 7) {
      setError('Visits per week must be between 1 and 7');
      return;
    }

    if (!formData.payoutRate || parseFloat(formData.payoutRate) <= 0) {
      setError('Please enter a valid payout rate');
      return;
    }

    try {
      setSaving(true);

      const url = isAddMode ? '/api/mitra-rates' : `/api/mitra-rates/${existingRate?.id}`;
      const method = isAddMode ? 'POST' : 'PATCH';

      const response = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          mitraId: formData.mitraId,
          visitsPerWeek: parseInt(formData.visitsPerWeek.toString()),
          payoutRate: parseFloat(formData.payoutRate),
          trialRatePerVisit: formData.trialRatePerVisit ? parseFloat(formData.trialRatePerVisit) : null,
        }),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Failed to save');
      }

      onSave();
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

  const visitsPerWeekOptions = [1, 2, 3, 4, 5, 6, 7];

  return (
    <SimpleModal
      isOpen={isOpen}
      onClose={onClose}
      title={isAddMode ? 'Add Rate Configuration' : 'Edit Rate Configuration'}
      size="md"
    >
      <form onSubmit={handleSubmit} className="space-y-6">
        {error && (
          <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg flex items-center">
            <Icons.alert className="h-5 w-5 mr-2" />
            <span>{error}</span>
          </div>
        )}

        {/* Mitra Selection */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Mitra <span className="text-red-500">*</span>
          </label>
          {isAddMode ? (
            loadingMitras ? (
              <div className="flex items-center text-gray-500">
                <Icons.loader className="h-4 w-4 animate-spin mr-2" />
                Loading mitras...
              </div>
            ) : (
              <select
                value={formData.mitraId}
                onChange={(e) => setFormData({ ...formData, mitraId: e.target.value })}
                required
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              >
                <option value="">Select a mitra...</option>
                {mitras.map((mitra) => (
                  <option key={mitra.id} value={mitra.id}>
                    {mitra.name} ({mitra.mitraCode})
                  </option>
                ))}
              </select>
            )
          ) : (
            <div className="text-sm font-medium text-gray-900 py-2">
              {existingRate?.mitraName} ({existingRate?.mitraCode})
            </div>
          )}
          <p className="mt-1 text-xs text-gray-500">
            The mitra who will receive this payout rate
          </p>
        </div>

        {/* Visits Per Week */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Visits Per Week <span className="text-red-500">*</span>
          </label>
          <select
            value={formData.visitsPerWeek}
            onChange={(e) => setFormData({ ...formData, visitsPerWeek: parseInt(e.target.value) })}
            required
            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          >
            {visitsPerWeekOptions.map((num) => (
              <option key={num} value={num}>{num}x per week</option>
            ))}
          </select>
          <p className="mt-1 text-xs text-gray-500">Select visit frequency (1-7 times per week)</p>
        </div>

        {/* Payout Rate */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Monthly Payout Rate <span className="text-red-500">*</span>
          </label>
          <div className="relative">
            <span className="absolute left-3 top-2 text-gray-500">Rp</span>
            <input
              type="text"
              value={formatCurrency(formData.payoutRate)}
              onChange={(e) => {
                const raw = e.target.value.replace(/[^0-9]/g, '');
                setFormData({ ...formData, payoutRate: raw });
              }}
              placeholder="900000"
              required
              className="w-full pl-12 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
          </div>
          <p className="mt-1 text-xs text-gray-500">
            Base monthly rate will be pro-rated: (Completed / Scheduled) × Rate
          </p>
        </div>

        {/* Trial Rate Per Visit */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Trial Rate Per Visit <span className="text-gray-400">(optional)</span>
          </label>
          <div className="relative">
            <span className="absolute left-3 top-2 text-gray-500">Rp</span>
            <input
              type="text"
              value={formData.trialRatePerVisit ? formatCurrency(formData.trialRatePerVisit) : ''}
              onChange={(e) => {
                const raw = e.target.value.replace(/[^0-9]/g, '');
                setFormData({ ...formData, trialRatePerVisit: raw });
              }}
              placeholder="100000"
              className="w-full pl-12 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
          </div>
          <p className="mt-1 text-xs text-gray-500">
            Flat rate per trial visit. Leave empty if mitra is not eligible for trial payout.
          </p>
        </div>

        {/* Unique Constraint Info */}
        {isAddMode && (
          <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-3">
            <div className="flex items-start">
              <Icons.alert className="h-5 w-5 text-yellow-600 mr-2 flex-shrink-0" />
              <div className="text-sm text-yellow-700">
                <strong>Note:</strong> Only one rate can exist per mitra per visits-per-week.
                If a rate already exists for this combination, creation will fail.
              </div>
            </div>
          </div>
        )}

        {/* Actions */}
        <div className="flex items-center justify-end space-x-3 pt-4 border-t border-gray-200">
          <button
            type="button"
            onClick={onClose}
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
                {isAddMode ? 'Add Rate' : 'Update Rate'}
              </>
            )}
          </button>
        </div>
      </form>
    </SimpleModal>
  );
}
