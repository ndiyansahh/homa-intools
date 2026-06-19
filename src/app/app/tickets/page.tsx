'use client';

import { useState, useEffect, useCallback } from 'react';
import { Icons } from '@/components/icons';

// --- Types ---
interface Ticket {
  id: string;
  ticketNumber: string;
  reportedByChatId: string;
  reportedByName: string;
  title: string;
  category: string;
  priority: string;
  invoiceId: string | null;
  customerName: string | null;
  mitraName: string | null;
  description: string;
  status: string;
  estimatedDuration: string | null;
  fixNotes: string | null;
  resolvedAt: string | null;
  timeToFix: string | null;
  createdAt: string;
  updatedAt: string;
}

// --- Helpers ---
function formatRelativeTime(dateStr: string): string {
  const date = new Date(dateStr);
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffMins = Math.floor(diffMs / 60000);

  if (diffMins < 1) return 'baru saja';
  if (diffMins < 60) return `${diffMins} menit lalu`;
  const diffHours = Math.floor(diffMins / 60);
  if (diffHours < 24) return `${diffHours} jam lalu`;
  const diffDays = Math.floor(diffHours / 24);
  if (diffDays < 7) return `${diffDays} hari lalu`;
  return date.toLocaleDateString('id-ID', { day: 'numeric', month: 'short', year: 'numeric' });
}

// --- Sub-components ---

function PriorityBadge({ priority }: { priority: string }) {
  const map: Record<string, { label: string; className: string }> = {
    High: { label: 'High', className: 'bg-red-100 text-red-700 border border-red-200' },
    Medium: { label: 'Medium', className: 'bg-yellow-100 text-yellow-700 border border-yellow-200' },
    Low: { label: 'Low', className: 'bg-green-100 text-green-700 border border-green-200' },
  };
  const dot: Record<string, string> = {
    High: 'bg-red-500',
    Medium: 'bg-yellow-500',
    Low: 'bg-green-500',
  };
  const conf = map[priority] ?? { label: priority, className: 'bg-gray-100 text-gray-700 border border-gray-200' };
  return (
    <span className={`inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-xs font-medium ${conf.className}`}>
      <span className={`w-1.5 h-1.5 rounded-full ${dot[priority] ?? 'bg-gray-400'}`} />
      {conf.label}
    </span>
  );
}

function StatusBadge({ status }: { status: string }) {
  const map: Record<string, string> = {
    Open: 'bg-gray-100 text-gray-700 border border-gray-200',
    'In Progress': 'bg-blue-100 text-blue-700 border border-blue-200',
    Resolved: 'bg-green-100 text-green-700 border border-green-200',
  };
  return (
    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${map[status] ?? 'bg-gray-100 text-gray-600'}`}>
      {status}
    </span>
  );
}

function CategoryBadge({ category }: { category: string }) {
  return (
    <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-indigo-50 text-indigo-700 border border-indigo-100">
      {category}
    </span>
  );
}

// --- Ticket Detail Modal ---
interface TicketModalProps {
  ticket: Ticket;
  onClose: () => void;
  onSaved: () => void;
}

function TicketModal({ ticket, onClose, onSaved }: TicketModalProps) {
  const [status, setStatus] = useState(ticket.status);
  const [estimatedDuration, setEstimatedDuration] = useState(ticket.estimatedDuration ?? '');
  const [fixNotes, setFixNotes] = useState(ticket.fixNotes ?? '');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  // Close on ESC
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    document.addEventListener('keydown', handler);
    document.body.style.overflow = 'hidden';
    return () => {
      document.removeEventListener('keydown', handler);
      document.body.style.overflow = 'unset';
    };
  }, [onClose]);

  const handleSave = async () => {
    setSaving(true);
    setError('');
    try {
      const res = await fetch(`/api/tickets/${ticket.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status, estimatedDuration, fixNotes }),
      });
      const data = await res.json();
      if (!res.ok || !data.success) {
        setError(data.message || 'Gagal menyimpan perubahan');
        return;
      }
      onSaved();
      onClose();
    } catch {
      setError('Terjadi kesalahan. Coba lagi.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto">
      <div
        className="fixed inset-0 bg-black bg-opacity-50 transition-opacity"
        onClick={onClose}
      />
      <div className="flex min-h-full items-center justify-center p-4">
        <div
          className="relative bg-white rounded-xl shadow-2xl w-full max-w-2xl max-h-[90vh] flex flex-col"
          onClick={(e) => e.stopPropagation()}
        >
          {/* Modal Header */}
          <div className="flex items-start justify-between px-6 py-4 border-b border-gray-100">
            <div>
              <div className="flex items-center gap-2 mb-1">
                <span className="text-sm font-mono font-semibold text-indigo-600">{ticket.ticketNumber}</span>
                <PriorityBadge priority={ticket.priority} />
                <StatusBadge status={ticket.status} />
              </div>
              <h2 className="text-lg font-semibold text-gray-900 leading-tight">{ticket.title}</h2>
            </div>
            <button
              onClick={onClose}
              className="ml-4 p-1.5 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-lg transition-colors flex-shrink-0"
            >
              <Icons.close className="h-5 w-5" />
            </button>
          </div>

          {/* Modal Body */}
          <div className="flex-1 overflow-y-auto px-6 py-5 space-y-5">
            {/* Reporter + meta */}
            <div className="grid grid-cols-2 gap-4">
              <div>
                <p className="text-xs font-medium text-gray-500 mb-1">Dilaporkan oleh</p>
                <div className="flex items-center gap-2">
                  <div className="w-7 h-7 rounded-full bg-indigo-100 flex items-center justify-center flex-shrink-0">
                    <span className="text-xs font-semibold text-indigo-600">
                      {ticket.reportedByName.charAt(0).toUpperCase()}
                    </span>
                  </div>
                  <span className="text-sm font-medium text-gray-900">{ticket.reportedByName}</span>
                </div>
              </div>
              <div>
                <p className="text-xs font-medium text-gray-500 mb-1">Waktu lapor</p>
                <p className="text-sm text-gray-700">{formatRelativeTime(ticket.createdAt)}</p>
              </div>
              <div>
                <p className="text-xs font-medium text-gray-500 mb-1">Kategori</p>
                <CategoryBadge category={ticket.category} />
              </div>
              {ticket.resolvedAt && (
                <div>
                  <p className="text-xs font-medium text-gray-500 mb-1">Diselesaikan</p>
                  <p className="text-sm text-gray-700">{formatRelativeTime(ticket.resolvedAt)}</p>
                </div>
              )}
              {ticket.timeToFix && (
                <div>
                  <p className="text-xs font-medium text-gray-500 mb-1">Waktu penyelesaian</p>
                  <p className="text-sm text-gray-700">{parseFloat(ticket.timeToFix).toFixed(1)} jam</p>
                </div>
              )}
            </div>

            {/* Optional references */}
            {(ticket.invoiceId || ticket.customerName || ticket.mitraName) && (
              <div className="bg-gray-50 rounded-lg p-3 space-y-1.5">
                <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide">Referensi</p>
                {ticket.invoiceId && (
                  <p className="text-sm text-gray-700"><span className="font-medium">Invoice:</span> {ticket.invoiceId}</p>
                )}
                {ticket.customerName && (
                  <p className="text-sm text-gray-700"><span className="font-medium">Customer:</span> {ticket.customerName}</p>
                )}
                {ticket.mitraName && (
                  <p className="text-sm text-gray-700"><span className="font-medium">Mitra:</span> {ticket.mitraName}</p>
                )}
              </div>
            )}

            {/* Description */}
            <div>
              <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2">Deskripsi</p>
              <p className="text-sm text-gray-700 whitespace-pre-wrap leading-relaxed bg-gray-50 rounded-lg p-3">
                {ticket.description}
              </p>
            </div>

            {/* Divider */}
            <div className="border-t border-gray-100" />

            {/* Update form */}
            <div className="space-y-4">
              <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide">Update Tiket</p>

              {/* Status */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1.5">Status</label>
                <select
                  value={status}
                  onChange={(e) => setStatus(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent bg-white"
                >
                  <option value="Open">Open</option>
                  <option value="In Progress">In Progress</option>
                  <option value="Resolved">Resolved</option>
                </select>
              </div>

              {/* Estimated duration */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1.5">
                  Estimasi Penyelesaian
                  <span className="ml-1 text-xs text-gray-400 font-normal">(contoh: 2 jam, 1 hari)</span>
                </label>
                <input
                  type="text"
                  value={estimatedDuration}
                  onChange={(e) => setEstimatedDuration(e.target.value)}
                  placeholder="Masukkan estimasi..."
                  className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                />
              </div>

              {/* Fix notes */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1.5">Catatan Fix</label>
                <textarea
                  value={fixNotes}
                  onChange={(e) => setFixNotes(e.target.value)}
                  placeholder="Jelaskan apa yang sudah diperbaiki..."
                  rows={4}
                  className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent resize-none"
                />
              </div>

              {error && (
                <div className="flex items-center gap-2 p-3 bg-red-50 border border-red-100 rounded-lg">
                  <Icons.alert className="h-4 w-4 text-red-500 flex-shrink-0" />
                  <p className="text-sm text-red-700">{error}</p>
                </div>
              )}
            </div>
          </div>

          {/* Modal Footer */}
          <div className="flex items-center justify-end gap-3 px-6 py-4 border-t border-gray-100 bg-gray-50/50 rounded-b-xl">
            <button
              onClick={onClose}
              className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors"
            >
              Batal
            </button>
            <button
              onClick={handleSave}
              disabled={saving}
              className="px-5 py-2 text-sm font-medium text-white bg-indigo-600 rounded-lg hover:bg-indigo-700 disabled:opacity-60 disabled:cursor-not-allowed transition-colors flex items-center gap-2"
            >
              {saving && <Icons.spinner className="h-4 w-4 animate-spin" />}
              {saving ? 'Menyimpan...' : 'Simpan'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

// --- Ticket Row ---
interface TicketRowProps {
  ticket: Ticket;
  onSelect: (ticket: Ticket) => void;
}

function TicketRow({ ticket, onSelect }: TicketRowProps) {
  return (
    <tr
      className="hover:bg-gray-50/70 cursor-pointer transition-colors group"
      onClick={() => onSelect(ticket)}
    >
      <td className="px-4 py-3.5 whitespace-nowrap">
        <span className="text-sm font-mono font-semibold text-indigo-600">{ticket.ticketNumber}</span>
      </td>
      <td className="px-4 py-3.5 max-w-xs">
        <div className="flex flex-col gap-1">
          <span className="text-sm font-medium text-gray-900 truncate group-hover:text-indigo-700 transition-colors">
            {ticket.title}
          </span>
          <CategoryBadge category={ticket.category} />
        </div>
      </td>
      <td className="px-4 py-3.5 whitespace-nowrap">
        <PriorityBadge priority={ticket.priority} />
      </td>
      <td className="px-4 py-3.5 whitespace-nowrap">
        <div className="flex items-center gap-2">
          <div className="w-6 h-6 rounded-full bg-gray-100 flex items-center justify-center flex-shrink-0">
            <span className="text-xs font-medium text-gray-600">
              {ticket.reportedByName.charAt(0).toUpperCase()}
            </span>
          </div>
          <span className="text-sm text-gray-700">{ticket.reportedByName}</span>
        </div>
      </td>
      <td className="px-4 py-3.5 whitespace-nowrap">
        <StatusBadge status={ticket.status} />
      </td>
      <td className="px-4 py-3.5 whitespace-nowrap">
        {ticket.status === 'Resolved' && ticket.timeToFix ? (
          <span className="text-sm text-gray-600">{parseFloat(ticket.timeToFix).toFixed(1)} jam</span>
        ) : ticket.estimatedDuration ? (
          <span className="text-sm text-gray-600">{ticket.estimatedDuration}</span>
        ) : (
          <span className="text-sm text-gray-400">-</span>
        )}
      </td>
      <td className="px-4 py-3.5 whitespace-nowrap">
        <span className="text-sm text-gray-500">{formatRelativeTime(ticket.createdAt)}</span>
      </td>
    </tr>
  );
}

// --- Stats Card ---
function StatsCard({
  label,
  count,
  colorClass,
}: {
  label: string;
  count: number;
  colorClass: string;
}) {
  return (
    <div className={`flex items-center gap-3 px-4 py-3 rounded-xl border ${colorClass}`}>
      <div className="text-2xl font-bold">{count}</div>
      <div className="text-sm font-medium">{label}</div>
    </div>
  );
}

// --- Main Page ---
export default function TicketsPage() {
  const [tickets, setTickets] = useState<Ticket[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [selectedTicket, setSelectedTicket] = useState<Ticket | null>(null);

  // Filters
  const [filterStatus, setFilterStatus] = useState('');
  const [filterPriority, setFilterPriority] = useState('');
  const [filterCategory, setFilterCategory] = useState('');

  const fetchTickets = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const params = new URLSearchParams();
      if (filterStatus) params.set('status', filterStatus);
      if (filterPriority) params.set('priority', filterPriority);
      if (filterCategory) params.set('category', filterCategory);

      const res = await fetch(`/api/tickets?${params.toString()}`);
      const data = await res.json();

      if (!res.ok || !data.success) {
        setError(data.message || 'Gagal memuat tiket');
        return;
      }
      setTickets(data.data);
    } catch {
      setError('Terjadi kesalahan. Coba refresh halaman.');
    } finally {
      setLoading(false);
    }
  }, [filterStatus, filterPriority, filterCategory]);

  useEffect(() => {
    fetchTickets();
  }, [fetchTickets]);

  const stats = {
    open: tickets.filter((t) => t.status === 'Open').length,
    inProgress: tickets.filter((t) => t.status === 'In Progress').length,
    resolved: tickets.filter((t) => t.status === 'Resolved').length,
  };

  const categories = Array.from(new Set(tickets.map((t) => t.category))).sort();

  const clearFilters = () => {
    setFilterStatus('');
    setFilterPriority('');
    setFilterCategory('');
  };

  const hasFilters = filterStatus || filterPriority || filterCategory;

  return (
    <div className="h-full">
      {/* Header */}
      <div className="mb-6 flex items-start justify-between flex-wrap gap-4">
        <div>
          <h1 className="text-2xl font-semibold text-gray-900">Ticket Management</h1>
          <p className="mt-1 text-sm text-gray-600">
            Kelola laporan bug dan issue dari tim via Telegram.
          </p>
        </div>
        <button
          onClick={fetchTickets}
          className="flex items-center gap-2 px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors"
        >
          <Icons.refresh className="h-4 w-4" />
          Refresh
        </button>
      </div>

      {/* Stats Bar */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 mb-6">
        <StatsCard
          label="Open"
          count={stats.open}
          colorClass="bg-gray-50 border-gray-200 text-gray-700"
        />
        <StatsCard
          label="In Progress"
          count={stats.inProgress}
          colorClass="bg-blue-50 border-blue-200 text-blue-700"
        />
        <StatsCard
          label="Resolved"
          count={stats.resolved}
          colorClass="bg-green-50 border-green-200 text-green-700"
        />
      </div>

      {/* Filter Bar */}
      <div className="flex flex-wrap items-center gap-3 mb-5 p-4 bg-white border border-gray-200 rounded-xl">
        <div className="flex items-center gap-2 text-sm text-gray-500">
          <Icons.filter className="h-4 w-4" />
          <span className="font-medium">Filter:</span>
        </div>

        <select
          value={filterStatus}
          onChange={(e) => setFilterStatus(e.target.value)}
          className="px-3 py-1.5 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 bg-white"
        >
          <option value="">Semua Status</option>
          <option value="Open">Open</option>
          <option value="In Progress">In Progress</option>
          <option value="Resolved">Resolved</option>
        </select>

        <select
          value={filterPriority}
          onChange={(e) => setFilterPriority(e.target.value)}
          className="px-3 py-1.5 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 bg-white"
        >
          <option value="">Semua Priority</option>
          <option value="High">High</option>
          <option value="Medium">Medium</option>
          <option value="Low">Low</option>
        </select>

        <select
          value={filterCategory}
          onChange={(e) => setFilterCategory(e.target.value)}
          className="px-3 py-1.5 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 bg-white"
        >
          <option value="">Semua Kategori</option>
          {categories.map((cat) => (
            <option key={cat} value={cat}>
              {cat}
            </option>
          ))}
          {/* Static fallback options when no tickets loaded yet */}
          {categories.length === 0 && (
            <>
              <option value="Bug">Bug</option>
              <option value="Feature">Feature</option>
              <option value="Data Seed">Data Seed</option>
              <option value="UI Issue">UI Issue</option>
              <option value="Data Salah">Data Salah</option>
              <option value="Pertanyaan">Pertanyaan</option>
              <option value="Lainnya">Lainnya</option>
            </>
          )}
        </select>

        {hasFilters && (
          <button
            onClick={clearFilters}
            className="flex items-center gap-1.5 px-3 py-1.5 text-sm text-gray-500 hover:text-gray-700 hover:bg-gray-100 rounded-lg transition-colors"
          >
            <Icons.x className="h-3.5 w-3.5" />
            Reset
          </button>
        )}

        <span className="ml-auto text-sm text-gray-500">
          {tickets.length} tiket
        </span>
      </div>

      {/* Table */}
      <div className="bg-white border border-gray-200 rounded-xl overflow-hidden">
        {loading ? (
          <div className="flex items-center justify-center py-20 text-gray-400">
            <Icons.spinner className="h-6 w-6 animate-spin mr-3" />
            <span className="text-sm">Memuat tiket...</span>
          </div>
        ) : error ? (
          <div className="flex flex-col items-center justify-center py-20 text-gray-400 gap-3">
            <Icons.alert className="h-8 w-8 text-red-400" />
            <p className="text-sm text-red-600">{error}</p>
            <button
              onClick={fetchTickets}
              className="text-sm text-indigo-600 hover:underline"
            >
              Coba lagi
            </button>
          </div>
        ) : tickets.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-20 text-gray-400 gap-2">
            <Icons.checkCircle className="h-10 w-10 text-gray-300" />
            <p className="text-sm font-medium text-gray-500">Tidak ada tiket ditemukan</p>
            {hasFilters && (
              <button
                onClick={clearFilters}
                className="text-sm text-indigo-600 hover:underline"
              >
                Hapus filter
              </button>
            )}
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left">
              <thead>
                <tr className="border-b border-gray-100 bg-gray-50/70">
                  <th className="px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide">Ticket #</th>
                  <th className="px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide">Judul</th>
                  <th className="px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide">Priority</th>
                  <th className="px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide">Reporter</th>
                  <th className="px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide">Status</th>
                  <th className="px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide">Estimasi / Fix Time</th>
                  <th className="px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide">Dikirim</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {tickets.map((ticket) => (
                  <TicketRow
                    key={ticket.id}
                    ticket={ticket}
                    onSelect={setSelectedTicket}
                  />
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Detail Modal */}
      {selectedTicket && (
        <TicketModal
          ticket={selectedTicket}
          onClose={() => setSelectedTicket(null)}
          onSaved={fetchTickets}
        />
      )}
    </div>
  );
}
