'use client';

import { useState, useEffect } from 'react';
import { SessionData } from '@/types/auth';
import MitraRateConfigModal from './mitra-rate-config-modal';
import { Icons } from './icons';

interface Mitra {
  id: string;
  name: string;
  mitraCode: string;
  status: string;
  monthlyBaseRate?: string;
  baseRate?: string;
}

interface MitraRatesAdvancedProps {
  session: SessionData;
}

export default function MitraRatesAdvanced({ session }: MitraRatesAdvancedProps) {
  const [mitras, setMitras] = useState<Mitra[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedMitra, setSelectedMitra] = useState<Mitra | null>(null);
  const [showModal, setShowModal] = useState(false);
  const [rateConfigCounts, setRateConfigCounts] = useState<Record<string, number>>({});

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
      setMitras(data.items || []);
      setTotalPages(data.totalPages || 1);

      // Fetch config counts for each mitra
      fetchConfigCounts(data.items || []);
    } catch (error) {
      console.error('Error fetching mitras:', error);
    } finally {
      setLoading(false);
    }
  };

  const fetchConfigCounts = async (mitraList: Mitra[]) => {
    const counts: Record<string, number> = {};

    // Fetch in parallel
    await Promise.all(
      mitraList.map(async (mitra) => {
        try {
          const response = await fetch(`/api/mitra/${mitra.id}/rates`);
          if (response.ok) {
            const data = await response.json();
            counts[mitra.id] = data.data?.length || 0;
          }
        } catch (err) {
          counts[mitra.id] = 0;
        }
      })
    );

    setRateConfigCounts(counts);
  };

  const handleOpenModal = (mitra: Mitra) => {
    setSelectedMitra(mitra);
    setShowModal(true);
  };

  const handleCloseModal = () => {
    setShowModal(false);
    setSelectedMitra(null);
  };

  const handleUpdate = () => {
    fetchMitras(); // Refresh data after update
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

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h2 className="text-xl font-semibold text-gray-900">Mitra Payout Rate Configuration</h2>
        <p className="mt-1 text-sm text-gray-600">
          Configure monthly payout rates per mitra and subscription package type
        </p>
      </div>

      {/* Info Box */}
      <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
        <div className="flex items-start">
          <div className="flex-shrink-0">
            <Icons.info className="h-5 w-5 text-blue-600" />
          </div>
          <div className="ml-3">
            <h3 className="text-sm font-medium text-blue-900">How Rate Configuration Works</h3>
            <div className="mt-2 text-sm text-blue-700 space-y-1">
              <p>• Each mitra has a <strong>default monthly rate</strong> used for all customers</p>
              <p>• You can add <strong>package-specific rates</strong> (Basic, Regular, Frequent)</p>
              <p>• Payout = (Completed Visits / Scheduled Visits) × Monthly Rate</p>
              <p>• Different customers can have different rates based on their subscription package</p>
            </div>
          </div>
        </div>
      </div>

      {/* Search */}
      <div className="flex items-center space-x-4">
        <div className="flex-1 relative">
          <input
            type="text"
            placeholder="Search mitra by name or code..."
            value={searchQuery}
            onChange={(e) => {
              setSearchQuery(e.target.value);
              setPage(1);
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
                  Default Rate
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Package Configs
                </th>
                <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {loading ? (
                <tr>
                  <td colSpan={6} className="px-6 py-12 text-center text-gray-500">
                    <Icons.loader className="h-8 w-8 animate-spin mx-auto mb-2" />
                    Loading mitras...
                  </td>
                </tr>
              ) : mitras.length === 0 ? (
                <tr>
                  <td colSpan={6} className="px-6 py-12 text-center text-gray-500">
                    No mitras found
                  </td>
                </tr>
              ) : (
                mitras.map((mitra) => {
                  const configCount = rateConfigCounts[mitra.id] || 0;
                  const defaultRate = mitra.monthlyBaseRate || mitra.baseRate || '0';

                  return (
                    <tr key={mitra.id} className="hover:bg-gray-50">
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="text-sm font-medium text-gray-900">{mitra.name}</div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="text-sm text-gray-500">{mitra.mitraCode}</div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span
                          className={`px-2 py-1 inline-flex text-xs leading-5 font-semibold rounded-full ${
                            mitra.status === 'Active'
                              ? 'bg-green-100 text-green-800'
                              : 'bg-gray-100 text-gray-800'
                          }`}
                        >
                          {mitra.status}
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="text-sm font-medium text-gray-900">
                          {formatCurrency(defaultRate)}
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        {configCount > 0 ? (
                          <div className="flex items-center">
                            <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800">
                              <Icons.check className="h-3 w-3 mr-1" />
                              {configCount} config{configCount > 1 ? 's' : ''}
                            </span>
                          </div>
                        ) : (
                          <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-yellow-100 text-yellow-800">
                            <Icons.alert className="h-3 w-3 mr-1" />
                            No configs
                          </span>
                        )}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                        <button
                          onClick={() => handleOpenModal(mitra)}
                          className="inline-flex items-center px-3 py-1.5 border border-gray-300 text-xs font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
                        >
                          <Icons.cog className="h-3 w-3 mr-1" />
                          {configCount > 0 ? 'View/Edit' : 'Configure'}
                        </button>
                      </td>
                    </tr>
                  );
                })
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
                  <nav className="relative z-0 inline-flex rounded-md shadow-sm -space-x-px">
                    <button
                      onClick={() => setPage(Math.max(1, page - 1))}
                      disabled={page === 1}
                      className="relative inline-flex items-center px-2 py-2 rounded-l-md border border-gray-300 bg-white text-sm font-medium text-gray-500 hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      <Icons.chevronLeft className="h-5 w-5" />
                    </button>
                    <button
                      onClick={() => setPage(Math.min(totalPages, page + 1))}
                      disabled={page === totalPages}
                      className="relative inline-flex items-center px-2 py-2 rounded-r-md border border-gray-300 bg-white text-sm font-medium text-gray-500 hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      <Icons.chevronRight className="h-5 w-5" />
                    </button>
                  </nav>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Modal */}
      {selectedMitra && (
        <MitraRateConfigModal
          isOpen={showModal}
          onClose={handleCloseModal}
          mitraId={selectedMitra.id}
          mitraName={selectedMitra.name}
          defaultRate={selectedMitra.monthlyBaseRate || selectedMitra.baseRate || '0'}
          onUpdate={handleUpdate}
        />
      )}
    </div>
  );
}
