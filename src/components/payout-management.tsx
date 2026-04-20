'use client';

import { useState, useEffect } from 'react';
import { SessionData } from '@/types/auth';
import { Icons } from './icons';
import PayoutPdfPreviewModal from './payout-pdf-preview-modal';
import { useToast } from '@/lib/toast';
import { useConfirm } from '@/components/confirm-dialog';

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
  const { toast } = useToast();
  const confirm = useConfirm();
  const [payouts, setPayouts] = useState<PayoutRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [generating, setGenerating] = useState(false);
  const [exporting, setExporting] = useState(false);

  // Filter state
  const [filterYear, setFilterYear] = useState('');
  const [filterMonth, setFilterMonth] = useState('');
  const [filterMitraName, setFilterMitraName] = useState('');
  const [exportFormat, setExportFormat] = useState<'csv' | 'pdf'>('csv');
  const [page, setPage] = useState(1);
  const [limit] = useState(10);
  const [pagination, setPagination] = useState({
    page: 1,
    total: 0,
    totalPages: 0,
  });

  // PDF preview modal state
  const [previewPayout, setPreviewPayout] = useState<PayoutRecord | null>(null);

  // Edit bonus modal state
  const [showBonusModal, setShowBonusModal] = useState(false);
  const [selectedPayout, setSelectedPayout] = useState<PayoutRecord | null>(null);
  const [uangParkir, setUangParkir] = useState('');
  const [kompensasiPromosi, setKompensasiPromosi] = useState('');
  const [lainnyaItems, setLainnyaItems] = useState<{ label: string; amount: string }[]>([{ label: '', amount: '' }]);
  const [updating, setUpdating] = useState(false);

  function parseTunjanganNotes(notes: string | null): { uangParkir: number; kompensasiPromosi: number; lainnyaItems: { label: string; amount: string }[] } {
    if (!notes) return { uangParkir: 0, kompensasiPromosi: 0, lainnyaItems: [{ label: '', amount: '' }] };
    try {
      const parsed = JSON.parse(notes);
      if (typeof parsed === 'object' && parsed !== null) {
        // New format: lainnyaItems array
        if (Array.isArray(parsed.lainnyaItems)) {
          return {
            uangParkir: Number(parsed.uangParkir) || 0,
            kompensasiPromosi: Number(parsed.kompensasiPromosi) || 0,
            lainnyaItems: parsed.lainnyaItems.length > 0 ? parsed.lainnyaItems : [{ label: '', amount: '' }],
          };
        }
        // Legacy format: single lainnyaLabel + lainnyaAmount
        return {
          uangParkir: Number(parsed.uangParkir) || 0,
          kompensasiPromosi: Number(parsed.kompensasiPromosi) || 0,
          lainnyaItems: parsed.lainnyaLabel || parsed.lainnyaAmount
            ? [{ label: parsed.lainnyaLabel || '', amount: parsed.lainnyaAmount ? String(parsed.lainnyaAmount) : '' }]
            : [{ label: '', amount: '' }],
        };
      }
    } catch {}
    // Legacy plain text notes
    return { uangParkir: 0, kompensasiPromosi: 0, lainnyaItems: [{ label: notes, amount: '' }] };
  }

  const totalLainnya = lainnyaItems.reduce((sum, item) => sum + (parseFloat(item.amount) || 0), 0);
  const totalTunjangan = (parseFloat(uangParkir) || 0) + (parseFloat(kompensasiPromosi) || 0) + totalLainnya;

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
      toast('warning', 'Please select year');
      return;
    }

    if (!filterMonth) {
      toast('warning', 'Please select month to generate payouts');
      return;
    }

    const ok = await confirm({ title: 'Generate Payouts', message: `Generate payouts for ${getMonthName(parseInt(filterMonth))} ${filterYear}?`, confirmLabel: 'Generate' });
    if (!ok) return;

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
        toast('success', result.message);
        fetchPayouts();
      } else {
        toast('error', result.error || result.message || 'Failed to generate payouts');
      }
    } catch (error) {
      console.error('Error generating payouts:', error);
      toast('error', 'Failed to generate payouts');
    } finally {
      setGenerating(false);
    }
  };

  const handleEditBonus = (payout: PayoutRecord) => {
    if (!payout.bonusEligible) {
      toast('warning', 'This mitra is not eligible for tunjangan lainnya');
      return;
    }

    const parsed = parseTunjanganNotes(payout.notes);
    setSelectedPayout(payout);
    setUangParkir(parsed.uangParkir > 0 ? parsed.uangParkir.toString() : '');
    setKompensasiPromosi(parsed.kompensasiPromosi > 0 ? parsed.kompensasiPromosi.toString() : '');
    setLainnyaItems(parsed.lainnyaItems);
    setShowBonusModal(true);
  };

  const handleUpdateBonus = async () => {
    if (!selectedPayout) return;

    const total = totalTunjangan;
    const notesPayload = JSON.stringify({
      uangParkir: parseFloat(uangParkir) || 0,
      kompensasiPromosi: parseFloat(kompensasiPromosi) || 0,
      lainnyaItems: lainnyaItems.filter(item => item.label.trim() || item.amount).map(item => ({
        label: item.label.trim(),
        amount: parseFloat(item.amount) || 0,
      })),
    });

    try {
      setUpdating(true);
      const response = await fetch(`/api/payout/${selectedPayout.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          tunjanganAmount: total,
          notes: notesPayload,
        }),
      });

      if (response.ok) {
        toast('success', 'Tunjangan lainnya updated successfully');
        setShowBonusModal(false);
        setSelectedPayout(null);
        fetchPayouts();
      } else {
        const error = await response.json();
        toast('error', error.message || 'Failed to update tunjangan lainnya');
      }
    } catch (error) {
      console.error('Error updating lainnya:', error);
      toast('error', 'Failed to update tunjangan lainnya');
    } finally {
      setUpdating(false);
    }
  };

  const handleExportMonthlyPayout = async () => {
    try {
      setExporting(true);

      if (!filterMonth) {
        toast('warning', 'Please select a month to export monthly payout');
        setExporting(false);
        return;
      }

      const params = new URLSearchParams({
        year: filterYear,
        months: filterMonth,
        format: exportFormat,
      });

      const response = await fetch(`/api/payouts/export?${params.toString()}`);

      if (response.status === 404) {
        const errorData = await response.json();
        toast('warning', errorData.message || `No payouts found for ${getMonthName(parseInt(filterMonth))} ${filterYear}`);
        setExporting(false);
        return;
      }

      if (!response.ok) {
        throw new Error('Failed to export payout data');
      }

      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      const fileExtension = exportFormat === 'pdf' ? 'pdf' : 'csv';
      link.download = `payout-monthly-${filterYear}-${filterMonth.padStart(2, '0')}.${fileExtension}`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      window.URL.revokeObjectURL(url);

      toast('success', `${exportFormat.toUpperCase()} exported successfully`);
    } catch (error) {
      console.error('Error exporting monthly payout:', error);
      toast('error', 'Failed to export monthly payout');
    } finally {
      setExporting(false);
    }
  };

  const handleExportFullReportYearly = async () => {
    try {
      setExporting(true);

      const params = new URLSearchParams({
        year: filterYear,
        months: '1,2,3,4,5,6,7,8,9,10,11,12',
        format: exportFormat,
      });

      const response = await fetch(`/api/payouts/export?${params.toString()}`);

      if (response.status === 404) {
        const errorData = await response.json();
        toast('warning', errorData.message || `No payouts found for year ${filterYear}`);
        setExporting(false);
        return;
      }

      if (!response.ok) {
        throw new Error('Failed to export full report');
      }

      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      const fileExtension = exportFormat === 'pdf' ? 'pdf' : 'csv';
      link.download = `payout-yearly-report-${filterYear}.${fileExtension}`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      window.URL.revokeObjectURL(url);

      toast('success', `Full yearly ${exportFormat.toUpperCase()} report exported`);
    } catch (error) {
      console.error('Error exporting full report:', error);
      toast('error', 'Failed to export full report');
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
    <div className="space-y-8 p-1">
      <style jsx>{`
        @import url('https://fonts.googleapis.com/css2?family=Outfit:wght@400;500;600;700&display=swap');

        .payout-header {
          font-family: 'Outfit', system-ui, -apple-system, sans-serif;
        }

        .financial-card {
          background: linear-gradient(to bottom, #ffffff, #fafafa);
          border: 1px solid #e5e7eb;
          box-shadow: 0 1px 3px rgba(0, 0, 0, 0.05);
          transition: all 0.2s ease;
        }

        .financial-card:hover {
          box-shadow: 0 4px 12px rgba(0, 0, 0, 0.08);
        }

        .filter-input {
          border: 1.5px solid #e5e7eb;
          transition: all 0.2s ease;
          font-size: 0.875rem;
        }

        .filter-input:focus {
          border-color: #3b82f6;
          box-shadow: 0 0 0 3px rgba(59, 130, 246, 0.1);
          outline: none;
        }

        .action-btn {
          transition: all 0.2s ease;
          font-weight: 500;
          box-shadow: 0 1px 2px rgba(0, 0, 0, 0.05);
        }

        .action-btn:hover:not(:disabled) {
          transform: translateY(-1px);
          box-shadow: 0 4px 8px rgba(0, 0, 0, 0.1);
        }

        .action-btn:active:not(:disabled) {
          transform: translateY(0);
        }

        .table-header {
          background: linear-gradient(to bottom, #f8fafc, #f1f5f9);
          font-family: 'Outfit', system-ui, -apple-system, sans-serif;
          letter-spacing: 0.05em;
        }

        .table-row {
          transition: all 0.15s ease;
          border-bottom: 1px solid #f3f4f6;
        }

        .table-row:hover {
          background: linear-gradient(to right, #fafbfc, #f8f9fa);
          transform: scale(1.002);
        }

        .currency-value {
          font-family: 'SF Mono', 'Monaco', 'Consolas', monospace;
          font-variant-numeric: tabular-nums;
        }

        .badge-eligible {
          background: linear-gradient(135deg, #10b981, #059669);
          color: white;
          font-size: 0.7rem;
          padding: 2px 8px;
          border-radius: 9999px;
          font-weight: 600;
          letter-spacing: 0.02em;
        }

        .modal-overlay {
          backdrop-filter: blur(4px);
          animation: fadeIn 0.2s ease;
        }

        .modal-content {
          animation: slideUp 0.3s ease;
          box-shadow: 0 20px 25px -5px rgba(0, 0, 0, 0.1), 0 10px 10px -5px rgba(0, 0, 0, 0.04);
        }

        @keyframes fadeIn {
          from { opacity: 0; }
          to { opacity: 1; }
        }

        @keyframes slideUp {
          from {
            opacity: 0;
            transform: translateY(20px);
          }
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }

        .stat-card {
          background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
          border-radius: 12px;
          padding: 1rem;
          color: white;
        }

        .empty-state {
          opacity: 0;
          animation: fadeInUp 0.5s ease forwards;
        }

        @keyframes fadeInUp {
          from {
            opacity: 0;
            transform: translateY(10px);
          }
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }
      `}</style>

      {/* Header Section */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-slate-900 payout-header">Payout Management</h1>
          <p className="mt-2 text-sm text-slate-600">Manage monthly mitra compensation and generate reports</p>
        </div>
        <div className="flex items-center gap-3 bg-gradient-to-br from-indigo-50 to-purple-50 px-4 py-3 rounded-xl border border-indigo-100">
          <div className="text-right">
            <div className="text-xs text-slate-600 uppercase tracking-wide font-medium">Total Records</div>
            <div className="text-2xl font-bold text-indigo-600 payout-header">{pagination.total}</div>
          </div>
        </div>
      </div>

      {/* Filters Section */}
      <div className="financial-card rounded-xl p-6">
        <h3 className="text-sm font-semibold text-slate-700 uppercase tracking-wide mb-4 payout-header">Filters & Export</h3>
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-4">
          {/* Filter Inputs */}
          <div className="lg:col-span-2">
            <label className="block text-xs font-medium text-slate-700 mb-2 uppercase tracking-wide">Year</label>
            <select
              value={filterYear}
              onChange={(e) => {
                setFilterYear(e.target.value);
                setPage(1);
              }}
              className="filter-input w-full px-3 py-2.5 rounded-lg bg-white"
            >
              <option value="">All Years</option>
              {years.map(year => (
                <option key={year} value={year}>{year}</option>
              ))}
            </select>
          </div>

          <div className="lg:col-span-2">
            <label className="block text-xs font-medium text-slate-700 mb-2 uppercase tracking-wide">Month</label>
            <select
              value={filterMonth}
              onChange={(e) => {
                setFilterMonth(e.target.value);
                setPage(1);
              }}
              className="filter-input w-full px-3 py-2.5 rounded-lg bg-white"
            >
              <option value="">All Months</option>
              {Array.from({ length: 12 }, (_, i) => i + 1).map(month => (
                <option key={month} value={month}>{getMonthName(month)}</option>
              ))}
            </select>
          </div>

          <div className="lg:col-span-3">
            <label className="block text-xs font-medium text-slate-700 mb-2 uppercase tracking-wide">Mitra Name</label>
            <input
              type="text"
              placeholder="Search by name..."
              value={filterMitraName}
              onChange={(e) => {
                setFilterMitraName(e.target.value);
                setPage(1);
              }}
              className="filter-input w-full px-3 py-2.5 rounded-lg bg-white"
            />
          </div>

          <div className="lg:col-span-2">
            <label className="block text-xs font-medium text-slate-700 mb-2 uppercase tracking-wide">Format</label>
            <select
              value={exportFormat}
              onChange={(e) => setExportFormat(e.target.value as 'csv' | 'pdf')}
              className="filter-input w-full px-3 py-2.5 rounded-lg bg-white"
            >
              <option value="csv">CSV</option>
              <option value="pdf">PDF</option>
            </select>
          </div>

          {/* Export Buttons */}
          <div className="lg:col-span-3 flex gap-2">
            <div className="flex-1">
              <label className="block text-xs font-medium text-slate-700 mb-2 uppercase tracking-wide">Actions</label>
              <button
                onClick={handleExportMonthlyPayout}
                disabled={exporting || !filterMonth}
                className="action-btn w-full px-4 py-2.5 bg-blue-600 text-white rounded-lg disabled:opacity-50 disabled:cursor-not-allowed text-sm font-medium"
                title="Export single month"
              >
                <Icons.download className="h-4 w-4 inline mr-1.5" />
                {exporting ? 'Exporting...' : 'Monthly'}
              </button>
            </div>
            <div className="flex-1">
              <label className="block text-xs font-medium text-transparent mb-2 select-none">.</label>
              <button
                onClick={handleExportFullReportYearly}
                disabled={exporting}
                className="action-btn w-full px-4 py-2.5 bg-slate-700 text-white rounded-lg disabled:opacity-50 disabled:cursor-not-allowed text-sm font-medium"
                title="Export full year"
              >
                <Icons.download className="h-4 w-4 inline mr-1.5" />
                {exporting ? 'Exporting...' : 'Yearly'}
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Payout Records Table */}
      <div className="financial-card rounded-xl overflow-hidden">
        {/* Table Header */}
        <div className="px-6 py-5 border-b border-slate-200 bg-gradient-to-r from-slate-50 to-slate-100">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-xl font-bold text-slate-900 payout-header">Payout Records</h2>
              <p className="mt-1 text-sm text-slate-600">Monthly compensation details for all mitras</p>
            </div>
            {['ADMIN', 'OWNER'].includes(session.role) && (
              <button
                onClick={handleGeneratePayouts}
                disabled={generating}
                className="action-btn px-5 py-2.5 bg-gradient-to-r from-emerald-600 to-emerald-700 text-white rounded-lg disabled:opacity-50 disabled:cursor-not-allowed font-medium"
              >
                {generating ? (
                  <>
                    <div className="inline-block animate-spin mr-2 h-4 w-4 border-2 border-white border-t-transparent rounded-full"></div>
                    Generating...
                  </>
                ) : (
                  <>
                    <Icons.plus className="h-4 w-4 inline mr-2" />
                    Generate Payouts
                  </>
                )}
              </button>
            )}
          </div>
        </div>

        {/* Table Content */}
        {loading ? (
          <div className="p-16 text-center empty-state">
            <div className="inline-block animate-spin h-10 w-10 border-4 border-blue-200 border-t-blue-600 rounded-full"></div>
            <p className="mt-4 text-slate-600 font-medium">Loading payout records...</p>
          </div>
        ) : payouts.length === 0 ? (
          <div className="p-16 text-center empty-state">
            <div className="inline-flex items-center justify-center w-16 h-16 bg-slate-100 rounded-full mb-4">
              <Icons.clock className="w-8 h-8 text-slate-400" />
            </div>
            <h3 className="text-lg font-semibold text-slate-900 mb-2 payout-header">No Payout Records Found</h3>
            <p className="text-slate-600 max-w-md mx-auto">
              {filterYear || filterMonth || filterMitraName
                ? 'Try adjusting your filters to see more results.'
                : 'Generate payouts for a specific month to see records here.'}
            </p>
          </div>
        ) : (
          <>
            <div className="overflow-x-auto">
              <table className="min-w-full">
                <thead className="table-header">
                  <tr>
                    <th className="px-6 py-4 text-left text-xs font-bold text-slate-700 uppercase">Payout ID</th>
                    <th className="px-6 py-4 text-left text-xs font-bold text-slate-700 uppercase">Period</th>
                    <th className="px-6 py-4 text-left text-xs font-bold text-slate-700 uppercase">Mitra</th>
                    <th className="px-6 py-4 text-right text-xs font-bold text-slate-700 uppercase">Visits</th>
                    <th className="px-6 py-4 text-right text-xs font-bold text-slate-700 uppercase">Base Payout</th>
                    <th className="px-6 py-4 text-right text-xs font-bold text-slate-700 uppercase">Lainnya</th>
                    <th className="px-6 py-4 text-right text-xs font-bold text-slate-700 uppercase">Total</th>
                    <th className="px-6 py-4 text-center text-xs font-bold text-slate-700 uppercase">Actions</th>
                  </tr>
                </thead>
                <tbody className="bg-white">
                  {payouts.map((payout, index) => (
                    <tr key={payout.id} className="table-row" style={{ animationDelay: `${index * 0.05}s` }}>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="text-xs text-slate-600 font-mono bg-slate-50 px-2 py-1 rounded inline-block">
                          {payout.payoutId}
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="text-sm font-semibold text-slate-900">{getMonthName(payout.month)}</div>
                        <div className="text-xs text-slate-500">{payout.year}</div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="text-sm font-semibold text-slate-900">{payout.mitraName}</div>
                        {payout.bonusEligible && (
                          <div className="badge-eligible inline-block mt-1">Lainnya Eligible</div>
                        )}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-right">
                        <div className="inline-flex items-center justify-center bg-blue-50 text-blue-700 font-bold px-3 py-1 rounded-full text-sm">
                          {payout.totalVisits}
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-right">
                        <div className="text-sm font-semibold text-slate-900 currency-value">{formatCurrency(payout.basePayout)}</div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-right">
                        <div className="text-sm font-semibold text-emerald-600 currency-value">{formatCurrency(payout.bonusAmount)}</div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-right">
                        <div className="text-base font-bold text-slate-900 currency-value bg-slate-50 px-3 py-1.5 rounded-lg inline-block">
                          {formatCurrency(payout.totalPayout)}
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-center">
                        <div className="flex items-center justify-center gap-2">
                          <button
                            onClick={() => setPreviewPayout(payout)}
                            className="action-btn p-2 bg-slate-100 text-slate-700 hover:bg-slate-200 rounded-lg"
                            title="Preview & Download PDF"
                          >
                            <Icons.download className="h-4 w-4" />
                          </button>
                          {payout.bonusEligible && ['ADMIN', 'OWNER'].includes(session.role) && (
                            <button
                              onClick={() => handleEditBonus(payout)}
                              className="action-btn px-3 py-1.5 bg-blue-50 text-blue-700 hover:bg-blue-100 rounded-lg text-xs font-semibold"
                            >
                              Edit
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Pagination */}
            {pagination.totalPages > 1 && (
              <div className="px-6 py-4 border-t border-slate-200 bg-slate-50 flex items-center justify-between">
                <div className="text-sm text-slate-700 font-medium">
                  Showing <span className="font-bold text-slate-900">{((page - 1) * limit) + 1}</span> to{' '}
                  <span className="font-bold text-slate-900">{Math.min(page * limit, pagination.total)}</span> of{' '}
                  <span className="font-bold text-slate-900">{pagination.total}</span> results
                </div>
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => setPage(Math.max(1, page - 1))}
                    disabled={page <= 1}
                    className="action-btn px-4 py-2 bg-white border-2 border-slate-200 rounded-lg text-sm font-semibold text-slate-700 disabled:opacity-40 disabled:cursor-not-allowed hover:border-slate-300"
                  >
                    Previous
                  </button>
                  <span className="text-sm font-semibold text-slate-700 px-3">
                    Page <span className="text-blue-600">{page}</span> of {pagination.totalPages}
                  </span>
                  <button
                    onClick={() => setPage(Math.min(pagination.totalPages, page + 1))}
                    disabled={page >= pagination.totalPages}
                    className="action-btn px-4 py-2 bg-white border-2 border-slate-200 rounded-lg text-sm font-semibold text-slate-700 disabled:opacity-40 disabled:cursor-not-allowed hover:border-slate-300"
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
        <div className="modal-overlay fixed inset-0 bg-black bg-opacity-40 flex items-center justify-center z-50 p-4">
          <div className="modal-content bg-white rounded-2xl max-w-lg w-full overflow-hidden">
            {/* Modal Header */}
            <div className="bg-gradient-to-r from-blue-600 to-indigo-700 px-6 py-5">
              <h3 className="text-xl font-bold text-white payout-header">
                Edit Lainnya
              </h3>
              <p className="text-blue-100 text-sm mt-1">{selectedPayout.mitraName}</p>
            </div>

            {/* Modal Body */}
            <div className="p-6 space-y-4">
              {!selectedPayout.bonusEligible && (
                <div className="flex items-center gap-2 bg-amber-50 border border-amber-200 rounded-lg px-4 py-3 text-sm text-amber-800">
                  <svg className="w-4 h-4 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20"><path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd"/></svg>
                  Mitra ini <strong className="mx-1">Not Eligible</strong> untuk bonus. Input bonus dinonaktifkan.
                </div>
              )}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1.5 uppercase tracking-wide">
                    Uang Parkir
                  </label>
                  <div className="relative">
                    <span className="absolute left-3 top-1/2 -translate-y-1/2 text-sm text-slate-400 pointer-events-none">Rp</span>
                    <input
                      type="text"
                      inputMode="numeric"
                      value={uangParkir ? Number(uangParkir).toLocaleString('id-ID') : ''}
                      onChange={(e) => setUangParkir(e.target.value.replace(/[^\d]/g, ''))}
                      className="filter-input w-full pl-9 pr-3 py-2.5 rounded-lg bg-white font-semibold text-right disabled:bg-slate-100 disabled:text-slate-400 disabled:cursor-not-allowed"
                      placeholder="0"
                      disabled={!selectedPayout.bonusEligible}
                    />
                  </div>
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1.5 uppercase tracking-wide">
                    Kompensasi Promosi
                  </label>
                  <div className="relative">
                    <span className="absolute left-3 top-1/2 -translate-y-1/2 text-sm text-slate-400 pointer-events-none">Rp</span>
                    <input
                      type="text"
                      inputMode="numeric"
                      value={kompensasiPromosi ? Number(kompensasiPromosi).toLocaleString('id-ID') : ''}
                      onChange={(e) => setKompensasiPromosi(e.target.value.replace(/[^\d]/g, ''))}
                      className="filter-input w-full pl-9 pr-3 py-2.5 rounded-lg bg-white font-semibold text-right disabled:bg-slate-100 disabled:text-slate-400 disabled:cursor-not-allowed"
                      placeholder="0"
                      disabled={!selectedPayout.bonusEligible}
                    />
                  </div>
                </div>
              </div>

              <div>
                <div className="flex items-center justify-between mb-1.5">
                  <label className="block text-xs font-bold text-slate-700 uppercase tracking-wide">
                    Lainnya
                  </label>
                  {selectedPayout.bonusEligible && (
                    <button
                      type="button"
                      onClick={() => setLainnyaItems(prev => [...prev, { label: '', amount: '' }])}
                      className="text-xs text-blue-600 font-semibold hover:text-blue-800 flex items-center gap-1"
                    >
                      + Tambah
                    </button>
                  )}
                </div>
                <div className="space-y-2">
                  {lainnyaItems.map((item, idx) => (
                    <div key={idx} className="flex gap-2 items-center">
                      <input
                        type="text"
                        value={item.label}
                        onChange={(e) => setLainnyaItems(prev => prev.map((it, i) => i === idx ? { ...it, label: e.target.value } : it))}
                        className="filter-input flex-1 px-3 py-2.5 rounded-lg bg-white disabled:bg-slate-100 disabled:text-slate-400 disabled:cursor-not-allowed"
                        placeholder="Keterangan (cth: Bonus, THR)"
                        disabled={!selectedPayout.bonusEligible}
                      />
                      <div className="relative w-40">
                        <span className="absolute left-3 top-1/2 -translate-y-1/2 text-sm text-slate-400 pointer-events-none">Rp</span>
                        <input
                          type="text"
                          inputMode="numeric"
                          value={item.amount ? Number(item.amount).toLocaleString('id-ID') : ''}
                          onChange={(e) => setLainnyaItems(prev => prev.map((it, i) => i === idx ? { ...it, amount: e.target.value.replace(/[^\d]/g, '') } : it))}
                          className="filter-input w-full pl-9 pr-3 py-2.5 rounded-lg bg-white font-semibold text-right disabled:bg-slate-100 disabled:text-slate-400 disabled:cursor-not-allowed"
                          placeholder="0"
                          disabled={!selectedPayout.bonusEligible}
                        />
                      </div>
                      {lainnyaItems.length > 1 && selectedPayout.bonusEligible && (
                        <button
                          type="button"
                          onClick={() => setLainnyaItems(prev => prev.filter((_, i) => i !== idx))}
                          className="text-red-400 hover:text-red-600 p-1"
                        >
                          ✕
                        </button>
                      )}
                    </div>
                  ))}
                </div>
              </div>

              {/* Calculation Preview */}
              <div className="bg-gradient-to-br from-slate-50 to-slate-100 p-4 rounded-xl border border-slate-200">
                <div className="space-y-2">
                  <div className="flex justify-between items-center">
                    <span className="text-sm text-slate-600 font-medium">Komisi Imbal Jasa</span>
                    <span className="text-sm font-semibold text-slate-900 currency-value">{formatCurrency(selectedPayout.basePayout)}</span>
                  </div>
                  {(parseFloat(uangParkir) || 0) > 0 && (
                    <div className="flex justify-between items-center">
                      <span className="text-sm text-slate-600 font-medium">Uang Parkir</span>
                      <span className="text-sm font-semibold text-emerald-600 currency-value">+{formatCurrency(uangParkir)}</span>
                    </div>
                  )}
                  {(parseFloat(kompensasiPromosi) || 0) > 0 && (
                    <div className="flex justify-between items-center">
                      <span className="text-sm text-slate-600 font-medium">Kompensasi Promosi</span>
                      <span className="text-sm font-semibold text-emerald-600 currency-value">+{formatCurrency(kompensasiPromosi)}</span>
                    </div>
                  )}
                  {lainnyaItems.map((item, idx) => (parseFloat(item.amount) || 0) > 0 && (
                    <div key={idx} className="flex justify-between items-center">
                      <span className="text-sm text-slate-600 font-medium">{item.label || 'Lainnya'}</span>
                      <span className="text-sm font-semibold text-emerald-600 currency-value">+{formatCurrency(item.amount)}</span>
                    </div>
                  ))}
                  <div className="h-px bg-slate-300"></div>
                  <div className="flex justify-between items-center pt-1">
                    <span className="text-sm font-bold text-slate-800 uppercase tracking-wide">Total Payout</span>
                    <span className="text-xl font-bold text-blue-600 currency-value">
                      {formatCurrency(
                        (parseFloat(selectedPayout.basePayout) + parseFloat(selectedPayout.bonusAmount) + totalTunjangan).toString()
                      )}
                    </span>
                  </div>
                </div>
              </div>
            </div>

            {/* Modal Footer */}
            <div className="px-6 py-4 bg-slate-50 border-t border-slate-200 flex justify-end gap-3">
              <button
                onClick={() => {
                  setShowBonusModal(false);
                  setSelectedPayout(null);
                }}
                className="action-btn px-5 py-2.5 bg-white border-2 border-slate-300 text-slate-700 rounded-lg font-semibold hover:bg-slate-50"
                disabled={updating}
              >
                Cancel
              </button>
              <button
                onClick={handleUpdateBonus}
                className="action-btn px-5 py-2.5 bg-gradient-to-r from-blue-600 to-indigo-700 text-white rounded-lg font-semibold disabled:opacity-50"
                disabled={updating}
              >
                {updating ? (
                  <>
                    <div className="inline-block animate-spin mr-2 h-4 w-4 border-2 border-white border-t-transparent rounded-full"></div>
                    Updating...
                  </>
                ) : (
                  'Update Lainnya'
                )}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* PDF Preview Modal */}
      {previewPayout && (
        <PayoutPdfPreviewModal
          payoutId={previewPayout.id}
          payoutSlipId={previewPayout.payoutId || previewPayout.id}
          onClose={() => setPreviewPayout(null)}
        />
      )}
    </div>
  );
}
