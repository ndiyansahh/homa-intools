'use client';

import { useState, useEffect } from 'react';
import { SessionData } from '@/types/auth';
import { Icons } from './icons';

interface PayoutRecord {
  id: string;
  payoutId: string;
  mitraId: string;
  mitraName: string;
  year: number;
  month: number;
  payoutDate: string;
  totalVisits: number;
  pricePerVisit: string;
  basePayout: string;
  bonusAmount: string;
  totalPayout: string;
  status: string;
  bonusEligible: boolean;
  notes: string | null;
  paidAt: string | null;
  createdAt: string;
  updatedAt: string;
}

interface PayoutManagementProps {
  session: SessionData;
}

export default function PayoutManagement({ session }: PayoutManagementProps) {
  const [payouts, setPayouts] = useState<PayoutRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [generating, setGenerating] = useState(false);
  const [exporting, setExporting] = useState(false);

  // Filter state
  const [filterYear, setFilterYear] = useState(new Date().getFullYear().toString());
  const [filterMonth, setFilterMonth] = useState('');
  const [filterMitraName, setFilterMitraName] = useState('');
  const [page, setPage] = useState(1);
  const [limit] = useState(10);
  const [pagination, setPagination] = useState({
    page: 1,
    total: 0,
    totalPages: 0,
  });

  // Edit bonus modal state
  const [showBonusModal, setShowBonusModal] = useState(false);
  const [selectedPayout, setSelectedPayout] = useState<PayoutRecord | null>(null);
  const [bonusAmount, setBonusAmount] = useState('');
  const [bonusNotes, setBonusNotes] = useState('');
  const [updating, setUpdating] = useState(false);

  const fetchPayouts = async () => {
    try {
      setLoading(true);
      const params = new URLSearchParams();
      if (filterYear) params.append('year', filterYear);
      if (filterMonth) params.append('month', filterMonth);
      if (filterMitraName) params.append('mitraName', filterMitraName);
      params.append('page', page.toString());
      params.append('limit', limit.toString());

      const response = await fetch(`/api/payout?${params}`);
      if (response.ok) {
        const data = await response.json();
        setPayouts(data.items);
        setPagination({
          page: data.page,
          total: data.total,
          totalPages: data.totalPages,
        });
      }
    } catch (error) {
      console.error('Error fetching payouts:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchPayouts();
  }, [filterYear, filterMonth, filterMitraName, page]);

  const handleGeneratePayouts = async () => {
    if (!filterYear) {
      alert('Please select year');
      return;
    }

    if (!filterMonth) {
      alert('Please select month to generate payouts');
      return;
    }

    if (!confirm(`Generate payouts for ${getMonthName(parseInt(filterMonth))} ${filterYear}?`)) {
      return;
    }

    try {
      setGenerating(true);
      const response = await fetch('/api/payout', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          year: parseInt(filterYear),
          month: parseInt(filterMonth),
        }),
      });

      const result = await response.json();

      if (response.ok) {
        alert(result.message);
        fetchPayouts();
      } else {
        alert(result.error || result.message || 'Failed to generate payouts');
      }
    } catch (error) {
      console.error('Error generating payouts:', error);
      alert('Failed to generate payouts');
    } finally {
      setGenerating(false);
    }
  };

  const handleEditBonus = (payout: PayoutRecord) => {
    if (!payout.bonusEligible) {
      alert('This mitra is not eligible for bonus');
      return;
    }

    setSelectedPayout(payout);
    setBonusAmount(payout.bonusAmount);
    setBonusNotes(payout.notes || '');
    setShowBonusModal(true);
  };

  const handleUpdateBonus = async () => {
    if (!selectedPayout) return;

    try {
      setUpdating(true);
      const response = await fetch(`/api/payout/${selectedPayout.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          bonusAmount: parseFloat(bonusAmount),
          notes: bonusNotes,
        }),
      });

      if (response.ok) {
        alert('Bonus updated successfully');
        setShowBonusModal(false);
        setSelectedPayout(null);
        fetchPayouts();
      } else {
        const error = await response.json();
        alert(error.message || 'Failed to update bonus');
      }
    } catch (error) {
      console.error('Error updating bonus:', error);
      alert('Failed to update bonus');
    } finally {
      setUpdating(false);
    }
  };

  // Export Monthly Payout - Single month export
  const handleExportMonthlyPayout = async () => {
    try {
      setExporting(true);

      // Validate month is selected
      if (!filterMonth) {
        alert('Please select a month to export monthly payout');
        setExporting(false);
        return;
      }

      // Build query params
      const params = new URLSearchParams({
        year: filterYear,
        months: filterMonth,
        format: 'csv',
      });

      // Fetch export data from API
      const response = await fetch(`/api/payouts/export?${params.toString()}`);

      // Handle 404 - No data found
      if (response.status === 404) {
        const errorData = await response.json();
        alert(errorData.message || `No payouts found for ${getMonthName(parseInt(filterMonth))} ${filterYear}`);
        setExporting(false);
        return;
      }

      if (!response.ok) {
        throw new Error('Failed to export payout data');
      }

      // Download CSV file
      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `payout-monthly-${filterYear}-${filterMonth.padStart(2, '0')}.csv`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      window.URL.revokeObjectURL(url);

      alert('Export successful! CSV file has been downloaded.');
    } catch (error) {
      console.error('Error exporting monthly payout:', error);
      alert('Failed to export monthly payout');
    } finally {
      setExporting(false);
    }
  };

  // Export Full Report Yearly - All months in a year
  const handleExportFullReportYearly = async () => {
    try {
      setExporting(true);

      // Build query params for all months
      const params = new URLSearchParams({
        year: filterYear,
        months: '1,2,3,4,5,6,7,8,9,10,11,12', // All months
        format: 'csv',
      });

      // Fetch export data from API
      const response = await fetch(`/api/payouts/export?${params.toString()}`);

      // Handle 404 - No data found
      if (response.status === 404) {
        const errorData = await response.json();
        alert(errorData.message || `No payouts found for year ${filterYear}`);
        setExporting(false);
        return;
      }

      if (!response.ok) {
        throw new Error('Failed to export full report');
      }

      // Download CSV file
      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `payout-yearly-report-${filterYear}.csv`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      window.URL.revokeObjectURL(url);

      alert('Export successful! Full yearly report has been downloaded.');
    } catch (error) {
      console.error('Error exporting full report:', error);
      alert('Failed to export full report');
    } finally {
      setExporting(false);
    }
  };

  const getMonthName = (month: number) => {
    const months = ['January', 'February', 'March', 'April', 'May', 'June',
                   'July', 'August', 'September', 'October', 'November', 'December'];
    return months[month - 1] || '';
  };

  const formatCurrency = (amount: string | number) => {
    const num = typeof amount === 'string' ? parseFloat(amount) : amount;
    return `Rp${num.toLocaleString('id-ID')}`;
  };

  const currentYear = new Date().getFullYear();
  const years = Array.from({ length: 5 }, (_, i) => currentYear - i);

  return (
    <div className="space-y-6">
      {/* Filters and Actions */}
      <div className="card p-4">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Year
            </label>
            <select
              value={filterYear}
              onChange={(e) => {
                setFilterYear(e.target.value);
                setPage(1);
              }}
              className="input-field"
            >
              {years.map(year => (
                <option key={year} value={year}>{year}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Month
            </label>
            <select
              value={filterMonth}
              onChange={(e) => {
                setFilterMonth(e.target.value);
                setPage(1);
              }}
              className="input-field"
            >
              <option value="">All Months</option>
              {Array.from({ length: 12 }, (_, i) => i + 1).map(month => (
                <option key={month} value={month}>{getMonthName(month)}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Mitra Name
            </label>
            <input
              type="text"
              placeholder="Search by mitra name..."
              value={filterMitraName}
              onChange={(e) => {
                setFilterMitraName(e.target.value);
                setPage(1);
              }}
              className="input-field"
            />
          </div>
          <div className="flex items-end gap-2">
            <button
              onClick={handleExportMonthlyPayout}
              disabled={exporting || !filterMonth}
              className="btn-primary flex-1"
              title="Export single month payout with bank details (select month first)"
            >
              <Icons.download className="h-4 w-4 mr-2 inline" />
              {exporting ? 'Exporting...' : 'Export Monthly Payout'}
            </button>
            <button
              onClick={handleExportFullReportYearly}
              disabled={exporting}
              className="btn-secondary flex-1"
              title="Export full yearly report (all months for selected year)"
            >
              <Icons.download className="h-4 w-4 mr-2 inline" />
              {exporting ? 'Exporting...' : 'Export Full Report Yearly'}
            </button>
          </div>
        </div>
      </div>

      {/* Payout Records List */}
      <div className="card">
        <div className="p-6 border-b border-gray-200">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-xl font-semibold text-gray-900">Payout Records</h2>
              <p className="mt-1 text-sm text-gray-600">
                Monthly payout calculations for mitras
              </p>
            </div>
            <div className="flex items-center space-x-3">
              <span className="text-sm text-gray-500">
                {pagination.total} total records
              </span>
              {['ADMIN', 'OWNER'].includes(session.role) && (
                <button
                  onClick={handleGeneratePayouts}
                  disabled={generating}
                  className="btn-primary"
                >
                  {generating ? 'Generating...' : 'Generate Payouts'}
                </button>
              )}
            </div>
          </div>
        </div>

        {loading ? (
          <div className="p-8 text-center">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto"></div>
            <p className="mt-2 text-gray-600">Loading payout records...</p>
          </div>
        ) : payouts.length === 0 ? (
          <div className="p-8 text-center">
            <Icons.clock className="w-12 h-12 text-gray-400 mx-auto mb-4" />
            <h3 className="text-lg font-medium text-gray-900 mb-2">No Payout Records Found</h3>
            <p className="text-gray-600">
              {filterYear || filterMonth || filterMitraName
                ? 'Try adjusting your filters to see more results.'
                : 'Generate payouts for a specific month to see records here.'}
            </p>
          </div>
        ) : (
          <>
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Payout ID
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Year
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Month
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Mitra Name
                    </th>
                    <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Visits
                    </th>
                    <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Base Payout
                    </th>
                    <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Bonus
                    </th>
                    <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Total Payout
                    </th>
                    <th className="px-6 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Actions
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {payouts.map((payout) => (
                    <tr key={payout.id} className="hover:bg-gray-50">
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="text-xs text-gray-900 font-mono">
                          {payout.payoutId}
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="text-sm text-gray-900">{payout.year}</div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="text-sm text-gray-900">{getMonthName(payout.month)}</div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="text-sm font-medium text-gray-900">{payout.mitraName}</div>
                        {payout.bonusEligible && (
                          <div className="text-xs text-green-600">✓ Bonus Eligible</div>
                        )}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-right">
                        <div className="text-sm text-gray-900">{payout.totalVisits}</div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-right">
                        <div className="text-sm text-gray-900">{formatCurrency(payout.basePayout)}</div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-right">
                        <div className="text-sm text-gray-900">{formatCurrency(payout.bonusAmount)}</div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-right">
                        <div className="text-sm font-semibold text-gray-900">
                          {formatCurrency(payout.totalPayout)}
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-center">
                        {payout.bonusEligible && ['ADMIN', 'OWNER'].includes(session.role) && (
                          <button
                            onClick={() => handleEditBonus(payout)}
                            className="text-blue-600 hover:text-blue-900 text-sm font-medium"
                          >
                            Edit Bonus
                          </button>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Pagination */}
            {pagination.totalPages > 1 && (
              <div className="px-6 py-4 border-t border-gray-200 flex items-center justify-between">
                <div className="text-sm text-gray-700">
                  Showing {((page - 1) * limit) + 1} to{' '}
                  {Math.min(page * limit, pagination.total)} of{' '}
                  {pagination.total} results
                </div>
                <div className="flex items-center space-x-2">
                  <button
                    onClick={() => setPage(Math.max(1, page - 1))}
                    disabled={page <= 1}
                    className="px-3 py-1 border border-gray-300 rounded-md text-sm disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-50"
                  >
                    Previous
                  </button>
                  <span className="text-sm text-gray-700">
                    Page {page} of {pagination.totalPages}
                  </span>
                  <button
                    onClick={() => setPage(Math.min(pagination.totalPages, page + 1))}
                    disabled={page >= pagination.totalPages}
                    className="px-3 py-1 border border-gray-300 rounded-md text-sm disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-50"
                  >
                    Next
                  </button>
                </div>
              </div>
            )}
          </>
        )}
      </div>

      {/* Edit Bonus Modal */}
      {showBonusModal && selectedPayout && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 max-w-md w-full mx-4">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">
              Edit Bonus - {selectedPayout.mitraName}
            </h3>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Bonus Amount (Rp)
                </label>
                <input
                  type="number"
                  value={bonusAmount}
                  onChange={(e) => setBonusAmount(e.target.value)}
                  className="input-field"
                  min="0"
                  step="1000"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Notes
                </label>
                <textarea
                  value={bonusNotes}
                  onChange={(e) => setBonusNotes(e.target.value)}
                  className="input-field"
                  rows={3}
                  placeholder="Optional notes about bonus..."
                />
              </div>
              <div className="bg-gray-50 p-3 rounded">
                <div className="text-sm text-gray-600 space-y-1">
                  <div className="flex justify-between">
                    <span>Base Payout:</span>
                    <span className="font-medium">{formatCurrency(selectedPayout.basePayout)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Bonus Amount:</span>
                    <span className="font-medium text-green-600">
                      {formatCurrency(bonusAmount || '0')}
                    </span>
                  </div>
                  <div className="flex justify-between pt-2 border-t border-gray-300">
                    <span className="font-semibold">Total Payout:</span>
                    <span className="font-semibold text-blue-600">
                      {formatCurrency(
                        parseFloat(selectedPayout.basePayout) + parseFloat(bonusAmount || '0')
                      )}
                    </span>
                  </div>
                </div>
              </div>
            </div>

            <div className="flex justify-end space-x-3 mt-6">
              <button
                onClick={() => {
                  setShowBonusModal(false);
                  setSelectedPayout(null);
                }}
                className="btn-secondary"
                disabled={updating}
              >
                Cancel
              </button>
              <button
                onClick={handleUpdateBonus}
                className="btn-primary"
                disabled={updating}
              >
                {updating ? 'Updating...' : 'Update Bonus'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
