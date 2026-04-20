'use client';

import { useState, useEffect, useCallback } from 'react';
import { SessionData } from '@/types/auth';
import { Icons } from './icons';
import RateEditModal from './rate-edit-modal';

// ─── Constants ────────────────────────────────────────────────────────────────

const VISITS_PER_WEEK = [1, 2, 3, 4, 5, 6, 7] as const;

const NORMAL_RANGES: Record<number, string> = {
  1: '4–5x/month',
  2: '8–9x/month',
  3: '12–13x/month',
  4: '16–18x/month',
  5: '20–22x/month',
  6: '24–27x/month',
  7: '28–31x/month',
};

// ─── Types ────────────────────────────────────────────────────────────────────

interface MitraRow {
  id: string;
  mitraName: string;
  mitraCode: string;
  trialRatePerVisit: string | null;
  mitraBonusCommission: string;
  configuredCount: number;
  rateConfigs: RateConfigRow[];
}

interface RateConfigRow {
  id: string | null;
  visitsPerWeek: number;
  payoutRate: string;
}

interface SaveResult {
  type: 'success' | 'error';
  message: string;
}

interface RateConfigurationManagementProps {
  session: SessionData;
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function formatCurrency(value: string | number): string {
  const num = typeof value === 'string' ? parseFloat(value) : value;
  if (isNaN(num) || num === 0) return '—';
  return new Intl.NumberFormat('id-ID', {
    style: 'currency',
    currency: 'IDR',
    minimumFractionDigits: 0,
  }).format(num);
}

function parseCurrencyInput(raw: string): string {
  return raw.replace(/[^\d]/g, '');
}

// ─── Main Component ───────────────────────────────────────────────────────────

export default function RateConfigurationManagement({ session }: RateConfigurationManagementProps) {
  const isReadOnly = session.role === 'STAFF';

  const [mitras, setMitras] = useState<MitraRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [selectedMitra, setSelectedMitra] = useState<MitraRow | null>(null);

  const loadData = useCallback(async () => {
    try {
      setLoading(true);

      // Fetch all active mitras
      const mitraRes = await fetch('/api/mitra?status=Active&limit=1000&page=1');
      if (!mitraRes.ok) throw new Error('Failed to fetch mitras');
      const mitraData = await mitraRes.json();
      const mitraItems = mitraData.items || [];

      // Fetch all rate configs
      const ratesRes = await fetch('/api/mitra-rates?limit=1000&page=1');
      if (!ratesRes.ok) throw new Error('Failed to fetch rates');
      const ratesData = await ratesRes.json();
      const allRates: Array<{ id: string; mitraId: string; visitsPerWeek: number; payoutRate: string }> =
        ratesData.data || [];

      // Build mitra rows with their rate configs
      const rows: MitraRow[] = mitraItems.map((m: any) => {
        const mitraRates = allRates
          .filter(r => r.mitraId === m.id)
          .map(r => ({ id: r.id, visitsPerWeek: r.visitsPerWeek, payoutRate: r.payoutRate || '' }));

        return {
          id: m.id,
          mitraName: m.name || m.mitraName || '',
          mitraCode: m.mitraCode || '',
          trialRatePerVisit: m.trialRatePerVisit || null,
          mitraBonusCommission: m.mitraBonusCommission || 'Eligible',
          configuredCount: mitraRates.filter(r => r.payoutRate !== '').length,
          rateConfigs: mitraRates,
        };
      });

      setMitras(rows);
    } catch (err) {
      console.error('Failed to load rate config data:', err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const filtered = mitras.filter(
    m =>
      m.mitraName.toLowerCase().includes(search.toLowerCase()) ||
      m.mitraCode.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="space-y-5">

      {/* Header row */}
      <div className="flex items-center gap-3">
        <div className="relative flex-1">
          <Icons.search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400 pointer-events-none" />
          <input
            type="text"
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder="Search mitra by name or code…"
            className="w-full pl-9 pr-4 py-2.5 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          />
        </div>
        <span className="text-sm text-gray-400 whitespace-nowrap">{mitras.length} mitra</span>
      </div>

      {/* Table */}
      <div className="bg-white border border-gray-200 rounded-xl shadow-sm overflow-hidden">
        {/* Column headers */}
        <div className="grid grid-cols-4 px-5 py-3 bg-gray-50 border-b border-gray-200">
          <span className="text-xs font-semibold text-gray-500 uppercase tracking-wide">Mitra</span>
          <span className="text-xs font-semibold text-gray-500 uppercase tracking-wide">Code</span>
          <span className="text-xs font-semibold text-gray-500 uppercase tracking-wide">Bonus</span>
          <span className="text-xs font-semibold text-gray-500 uppercase tracking-wide">Configured</span>
        </div>

        {loading ? (
          <div className="flex flex-col items-center gap-3 py-16 text-gray-400">
            <Icons.loader className="h-7 w-7 animate-spin text-blue-400" />
            <span className="text-sm">Loading…</span>
          </div>
        ) : filtered.length === 0 ? (
          <div className="flex flex-col items-center gap-2 py-16 text-gray-400">
            <Icons.users className="h-10 w-10 text-gray-200" />
            <span className="text-sm">{search ? `No mitra matching "${search}"` : 'No active mitra found'}</span>
          </div>
        ) : (
          <div className="divide-y divide-gray-100">
            {filtered.map(mitra => {
              const isUnconfigured = mitra.configuredCount === 0;
              return (
                <button
                  key={mitra.id}
                  type="button"
                  onClick={() => setSelectedMitra(mitra)}
                  className={`w-full grid grid-cols-4 items-center px-5 py-3.5 text-left hover:bg-blue-50/60 transition-colors group ${
                    isUnconfigured ? 'bg-amber-50/40' : 'bg-white'
                  }`}
                >
                  {/* Mitra name */}
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-medium text-gray-900 group-hover:text-blue-700 transition-colors">
                      {mitra.mitraName}
                    </span>
                    {isUnconfigured && (
                      <span className="text-xs text-amber-600 bg-amber-100 px-1.5 py-0.5 rounded font-medium">
                        Not set
                      </span>
                    )}
                  </div>

                  {/* Code */}
                  <span className="text-xs font-mono text-gray-500">{mitra.mitraCode}</span>

                  {/* Configured count */}
                  <div className="flex items-center gap-2">
                    <div className="flex gap-0.5">
                      {VISITS_PER_WEEK.map(v => {
                        const configured = mitra.rateConfigs.some(r => r.visitsPerWeek === v && r.payoutRate !== '');
                        return (
                          <span
                            key={v}
                            className={`w-2.5 h-2.5 rounded-sm ${configured ? 'bg-blue-500' : 'bg-gray-100'}`}
                            title={`${v}x/week: ${configured ? 'set' : 'not set'}`}
                          />
                        );
                      })}
                    </div>
                    <span className={`text-xs font-medium ${mitra.configuredCount === 7 ? 'text-green-600' : mitra.configuredCount === 0 ? 'text-amber-500' : 'text-gray-500'}`}>
                      {mitra.configuredCount}/7
                    </span>
                  </div>
                </button>
              );
            })}
          </div>
        )}
      </div>

      {/* Edit Modal */}
      {selectedMitra && (
        <RateEditModal
          mitra={selectedMitra}
          isReadOnly={isReadOnly}
          onClose={() => setSelectedMitra(null)}
          onSaved={loadData}
        />
      )}
    </div>
  );
}
