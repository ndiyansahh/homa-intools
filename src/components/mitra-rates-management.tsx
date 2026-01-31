'use client';

import { useState, useEffect } from 'react';
import { SessionData } from '@/types/auth';
import { Icons } from './icons';

interface Mitra {
  id: string;
  mitraName: string;
  mitraCode: string;
  status: string;
  monthlyBaseRate: string;
  baseRate: string;
  subscriptionType?: string;
}

interface MitraRatesManagementProps {
  session: SessionData;
}

export default function MitraRatesManagement({ session }: MitraRatesManagementProps) {
  const [mitras, setMitras] = useState<Mitra[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // Editing state
  const [editingMitraId, setEditingMitraId] = useState<string | null>(null);
  const [editingValue, setEditingValue] = useState<string>('');

  // Pagination
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const limit = 20;

  useEffect(() => {
    fetchMitras();
  }, [page, searchQuery]);

  const fetchMitras = async () => {
    try {
      setLoading(true);
      const params = new URLSearchParams();
      params.append('page', page.toString());
      params.append('limit', limit.toString());
      if (searchQuery) params.append('q', searchQuery);

      const response = await fetch(`/api/mitra?${params.toString()}`);
      if (!response.ok) throw new Error('Failed to fetch mitras');

      const data = await response.json();
      setMitras(data.data || []);
      setTotalPages(data.totalPages || 1);
    } catch (error) {
      console.error('Error fetching mitras:', error);
      showError('Failed to load mitras');
    } finally {
      setLoading(false);
    }
  };

  const handleEdit = (mitra: Mitra) => {
    setEditingMitraId(mitra.id);
    setEditingValue(mitra.monthlyBaseRate || mitra.baseRate || '0');
  };

  const handleCancel = () => {
    setEditingMitraId(null);
    setEditingValue('');
  };

  const handleSave = async (mitraId: string, mitraName: string) => {
    try {
      setSaving(true);

      const monthlyRate = parseFloat(editingValue);
      if (isNaN(monthlyRate) || monthlyRate < 0) {
        showError('Please enter a valid monthly rate');
        return;
      }

      const response = await fetch(`/api/mitra/${mitraId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          monthlyBaseRate: monthlyRate.toString(),
        }),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Failed to update rate');
      }

      showSuccess(`Updated monthly rate for ${mitraName}`);
      setEditingMitraId(null);
      setEditingValue('');
      fetchMitras(); // Refresh data
    } catch (error: any) {
      console.error('Error updating rate:', error);
      showError(error.message || 'Failed to update monthly rate');
    } finally {
      setSaving(false);
    }
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
      maximumFractionDigits: 0,
    }).format(num);
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h2 className="text-xl font-semibold text-gray-900">Mitra Payout Rates</h2>
        <p className="mt-1 text-sm text-gray-600">
          Configure monthly base payout rates for each mitra. Payout will be prorated based on completed vs scheduled visits.
        </p>
      </div>

      {/* Info Box */}
      <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
        <div className="flex items-start">
          <div className="flex-shrink-0">
            <Icons.info className="h-5 w-5 text-blue-600" />
          </div>
          <div className="ml-3">
            <h3 className="text-sm font-medium text-blue-900">How it works</h3>
            <div className="mt-2 text-sm text-blue-700">
              <p>
                <strong>Payout Calculation:</strong> (Completed Visits / Scheduled Visits) × Monthly Rate
              </p>
              <p className="mt-1">
                <strong>Example:</strong> If monthly rate is Rp 900.000, scheduled 9 visits, completed 8 visits:
                <br />
                Payout = 8/9 × Rp 900.000 = Rp 800.000
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Success/Error Messages */}
      {successMessage && (
        <div className="bg-green-50 border border-green-200 text-green-700 px-4 py-3 rounded-lg flex items-center justify-between">
          <div className="flex items-center">
            <Icons.check className="h-5 w-5 mr-2" />
            <span>{successMessage}</span>
          </div>
          <button onClick={() => setSuccessMessage(null)} className="text-green-700 hover:text-green-900">
            <Icons.close className="h-5 w-5" />
          </button>
        </div>
      )}

      {errorMessage && (
        <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg flex items-center justify-between">
          <div className="flex items-center">
            <Icons.alert className="h-5 w-5 mr-2" />
            <span>{errorMessage}</span>
          </div>
          <button onClick={() => setErrorMessage(null)} className="text-red-700 hover:text-red-900">
            <Icons.close className="h-5 w-5" />
          </button>
        </div>
      )}

      {/* Search */}
      <div className="flex items-center space-x-4">
        <div className="flex-1 relative">
          <input
            type="text"
            placeholder="Search mitra by name or code..."
            value={searchQuery}
            onChange={(e) => {
              setSearchQuery(e.target.value);
              setPage(1); // Reset to first page
            }}
            className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          />
          <Icons.search className="absolute left-3 top-2.5 h-5 w-5 text-gray-400" />
        </div>
      </div>

      {/* Table */}
      <div className="bg-white border border-gray-200 rounded-lg overflow-hidden">
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Mitra
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Code
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Status
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Monthly Base Rate
                </th>
                <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {loading ? (
                <tr>
                  <td colSpan={5} className="px-6 py-12 text-center text-gray-500">
                    <Icons.loader className="h-8 w-8 animate-spin mx-auto mb-2" />
                    Loading mitras...
                  </td>
                </tr>
              ) : mitras.length === 0 ? (
                <tr>
                  <td colSpan={5} className="px-6 py-12 text-center text-gray-500">
                    No mitras found
                  </td>
                </tr>
              ) : (
                mitras.map((mitra) => (
                  <tr key={mitra.id} className="hover:bg-gray-50">
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm font-medium text-gray-900">{mitra.mitraName}</div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm text-gray-500">{mitra.mitraCode}</div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className={`px-2 py-1 inline-flex text-xs leading-5 font-semibold rounded-full ${mitra.status === 'Active' ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-800'
                        }`}>
                        {mitra.status}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      {editingMitraId === mitra.id ? (
                        <div className="flex items-center space-x-2">
                          <span className="text-sm text-gray-500">Rp</span>
                          <input
                            type="number"
                            value={editingValue}
                            onChange={(e) => setEditingValue(e.target.value)}
                            className="w-40 px-3 py-1.5 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                            min="0"
                            step="1000"
                            autoFocus
                            onKeyDown={(e) => {
                              if (e.key === 'Enter') {
                                handleSave(mitra.id, mitra.mitraName);
                              } else if (e.key === 'Escape') {
                                handleCancel();
                              }
                            }}
                          />
                        </div>
                      ) : (
                        <div className="text-sm font-medium text-gray-900">
                          {formatCurrency(mitra.monthlyBaseRate || mitra.baseRate || '0')}
                        </div>
                      )}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                      {editingMitraId === mitra.id ? (
                        <div className="flex items-center justify-end space-x-2">
                          <button
                            onClick={() => handleSave(mitra.id, mitra.mitraName)}
                            disabled={saving}
                            className="inline-flex items-center px-3 py-1.5 border border-transparent text-xs font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed"
                          >
                            {saving ? (
                              <>
                                <Icons.loader className="h-3 w-3 animate-spin mr-1" />
                                Saving...
                              </>
                            ) : (
                              <>
                                <Icons.check className="h-3 w-3 mr-1" />
                                Save
                              </>
                            )}
                          </button>
                          <button
                            onClick={handleCancel}
                            disabled={saving}
                            className="inline-flex items-center px-3 py-1.5 border border-gray-300 text-xs font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed"
                          >
                            <Icons.close className="h-3 w-3 mr-1" />
                            Cancel
                          </button>
                        </div>
                      ) : (
                        <button
                          onClick={() => handleEdit(mitra)}
                          className="inline-flex items-center px-3 py-1.5 border border-gray-300 text-xs font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
                        >
                          <Icons.edit className="h-3 w-3 mr-1" />
                          Edit Rate
                        </button>
                      )}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination */}
        {totalPages > 1 && (
          <div className="bg-white px-4 py-3 border-t border-gray-200 sm:px-6">
            <div className="flex items-center justify-between">
              <div className="flex-1 flex justify-between sm:hidden">
                <button
                  onClick={() => setPage(Math.max(1, page - 1))}
                  disabled={page === 1}
                  className="relative inline-flex items-center px-4 py-2 border border-gray-300 text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  Previous
                </button>
                <button
                  onClick={() => setPage(Math.min(totalPages, page + 1))}
                  disabled={page === totalPages}
                  className="ml-3 relative inline-flex items-center px-4 py-2 border border-gray-300 text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  Next
                </button>
              </div>
              <div className="hidden sm:flex-1 sm:flex sm:items-center sm:justify-between">
                <div>
                  <p className="text-sm text-gray-700">
                    Page <span className="font-medium">{page}</span> of{' '}
                    <span className="font-medium">{totalPages}</span>
                  </p>
                </div>
                <div>
                  <nav className="relative z-0 inline-flex rounded-md shadow-sm -space-x-px" aria-label="Pagination">
                    <button
                      onClick={() => setPage(Math.max(1, page - 1))}
                      disabled={page === 1}
                      className="relative inline-flex items-center px-2 py-2 rounded-l-md border border-gray-300 bg-white text-sm font-medium text-gray-500 hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      <span className="sr-only">Previous</span>
                      <Icons.chevronLeft className="h-5 w-5" />
                    </button>
                    <button
                      onClick={() => setPage(Math.min(totalPages, page + 1))}
                      disabled={page === totalPages}
                      className="relative inline-flex items-center px-2 py-2 rounded-r-md border border-gray-300 bg-white text-sm font-medium text-gray-500 hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      <span className="sr-only">Next</span>
                      <Icons.chevronRight className="h-5 w-5" />
                    </button>
                  </nav>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Help text */}
      <div className="bg-gray-50 border border-gray-200 rounded-lg p-4">
        <h4 className="text-sm font-medium text-gray-900 mb-2">Need Advanced Configuration?</h4>
        <p className="text-sm text-gray-600">
          For configuring different rates per subscription package (Basic/Regular/Frequent),
          use the API endpoints at <code className="px-1 py-0.5 bg-gray-200 rounded text-xs">/api/mitra/[id]/rates</code>.
          Advanced UI coming soon.
        </p>
      </div>
    </div>
  );
}
