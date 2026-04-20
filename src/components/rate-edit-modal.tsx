'use client';

import { useState, useEffect, useRef } from 'react';
import { Icons } from './icons';

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

export interface RateConfigEntry {
  id: string | null;
  visitsPerWeek: number;
  payoutRate: string;
}

export interface RateEditMitraData {
  id: string;
  mitraName: string;
  mitraCode: string;
  trialRatePerVisit: string | null;
  rateConfigs: RateConfigEntry[];
  mitraBonusCommission?: string;
}

interface SaveResult {
  type: 'success' | 'error';
  message: string;
}

interface Props {
  mitra: RateEditMitraData;
  isReadOnly?: boolean;
  skipLabel?: string; // label for cancel/skip button, default "Cancel"
  onClose: () => void;
  onSaved: () => void;
}

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

export default function RateEditModal({ mitra, isReadOnly = false, skipLabel = 'Cancel', onClose, onSaved }: Props) {
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: 0 });
  }, []);

  const [rateRows, setRateRows] = useState<Record<number, RateConfigEntry>>(
    Object.fromEntries(
      VISITS_PER_WEEK.map(v => {
        const existing = mitra.rateConfigs.find(r => r.visitsPerWeek === v);
        return [v, existing || { id: null, visitsPerWeek: v, payoutRate: '' }];
      })
    )
  );
  const [trialRate, setTrialRate] = useState(mitra.trialRatePerVisit || '');
  const [bonusCommission, setBonusCommission] = useState(mitra.mitraBonusCommission || 'Eligible');
  const [saving, setSaving] = useState(false);
  const [saveResult, setSaveResult] = useState<SaveResult | null>(null);

  const handlePayoutRateChange = (visits: number, raw: string) => {
    setRateRows(prev => ({
      ...prev,
      [visits]: { ...prev[visits], payoutRate: parseCurrencyInput(raw) },
    }));
  };

  const handleSave = async () => {
    if (isReadOnly) return;
    setSaving(true);
    setSaveResult(null);
    const errors: string[] = [];

    try {
      for (const visits of VISITS_PER_WEEK) {
        const row = rateRows[visits];
        const hasValue = row.payoutRate.trim() !== '';
        const hasExisting = row.id !== null;

        if (hasValue && hasExisting) {
          const res = await fetch(`/api/mitra-rates/${row.id}`, {
            method: 'PATCH',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ payoutRate: parseFloat(row.payoutRate) }),
          });
          if (!res.ok) {
            const err = await res.json();
            errors.push(`${visits}x/week: ${err.error || 'Update failed'}`);
          }
        } else if (hasValue && !hasExisting) {
          const res = await fetch('/api/mitra-rates', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ mitraId: mitra.id, visitsPerWeek: visits, payoutRate: parseFloat(row.payoutRate) }),
          });
          if (res.ok) {
            const created = await res.json();
            setRateRows(prev => ({
              ...prev,
              [visits]: { ...prev[visits], id: created.data?.id || null },
            }));
          } else {
            const err = await res.json();
            errors.push(`${visits}x/week: ${err.error || 'Create failed'}`);
          }
        } else if (!hasValue && hasExisting) {
          const res = await fetch(`/api/mitra-rates/${row.id}`, { method: 'DELETE' });
          if (!res.ok) {
            const err = await res.json();
            errors.push(`${visits}x/week: ${err.error || 'Delete failed'}`);
          } else {
            setRateRows(prev => ({ ...prev, [visits]: { ...prev[visits], id: null } }));
          }
        }
      }

      const mitraPayload: Record<string, unknown> = {
        trialRatePerVisit: trialRate ? parseFloat(trialRate) : null,
        mitraBonusCommission: bonusCommission,
      };

      const mitraRes = await fetch(`/api/mitra/${mitra.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(mitraPayload),
      });

      if (!mitraRes.ok) {
        const err = await mitraRes.json();
        errors.push(`Bonus/Trial: ${err.error || 'Update failed'}`);
      }

      if (errors.length > 0) {
        setSaveResult({ type: 'error', message: errors.join('\n') });
      } else {
        setSaveResult({ type: 'success', message: 'Saved successfully.' });
        setTimeout(() => {
          onSaved();
          onClose();
        }, 800);
      }
    } catch {
      setSaveResult({ type: 'error', message: 'Unexpected error. Please try again.' });
    } finally {
      setSaving(false);
    }
  };

  const configuredCount = Object.values(rateRows).filter(r => r.payoutRate !== '').length;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" onClick={onClose} />

      <div ref={scrollRef} className="relative bg-white rounded-2xl shadow-2xl w-full max-w-lg max-h-[90vh] overflow-y-auto">

        {/* Header */}
        <div className="sticky top-0 bg-white border-b border-gray-100 px-6 py-4 flex items-start justify-between rounded-t-2xl z-10">
          <div>
            <h2 className="text-base font-semibold text-gray-900">{mitra.mitraName}</h2>
            <p className="text-xs text-gray-500 mt-0.5 font-mono">{mitra.mitraCode}</p>
          </div>
          <div className="flex items-center gap-3">
            <span className="text-xs text-gray-400">{configuredCount}/7 configured</span>
            <button onClick={onClose} className="p-1.5 rounded-lg text-gray-400 hover:text-gray-600 hover:bg-gray-100 transition-colors">
              <Icons.x className="h-4 w-4" />
            </button>
          </div>
        </div>

        <div className="px-6 py-5 space-y-6">

          {/* Rate Grid */}
          <div>
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-sm font-semibold text-gray-800">Payout Rate / Month</h3>
              <span className="text-xs text-gray-400">Leave blank to remove</span>
            </div>
            <div className="grid grid-cols-3 px-3 py-1.5 bg-gray-50 rounded-t-lg border border-gray-200 border-b-0">
              <span className="text-xs font-medium text-gray-500 uppercase tracking-wide">Freq</span>
              <span className="text-xs font-medium text-gray-500 uppercase tracking-wide">Normal Range</span>
              <span className="text-xs font-medium text-gray-500 uppercase tracking-wide text-right">Rate / Month</span>
            </div>
            <div className="border border-gray-200 rounded-b-lg divide-y divide-gray-100">
              {VISITS_PER_WEEK.map(visits => {
                const row = rateRows[visits];
                const hasValue = row.payoutRate.trim() !== '';
                return (
                  <div key={visits} className={`grid grid-cols-3 items-center px-3 py-2.5 ${hasValue ? 'bg-blue-50/50' : ''}`}>
                    <div className="flex items-center gap-2">
                      <span className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold ${hasValue ? 'bg-blue-600 text-white' : 'bg-gray-100 text-gray-400'}`}>
                        {visits}
                      </span>
                      <span className="text-sm text-gray-700">{visits}x/week</span>
                    </div>
                    <span className="text-xs text-gray-400">{NORMAL_RANGES[visits]}</span>
                    <div className="flex justify-end">
                      {isReadOnly ? (
                        <span className={`text-sm font-semibold ${hasValue ? 'text-gray-900' : 'text-gray-300'}`}>
                          {hasValue ? formatCurrency(row.payoutRate) : '—'}
                        </span>
                      ) : (
                        <div className="relative w-36">
                          <span className="absolute left-2.5 top-1/2 -translate-y-1/2 text-xs text-gray-400 pointer-events-none">Rp</span>
                          <input
                            type="text"
                            inputMode="numeric"
                            value={row.payoutRate ? Number(row.payoutRate).toLocaleString('id-ID') : ''}
                            onChange={e => handlePayoutRateChange(visits, e.target.value)}
                            placeholder="—"
                            className={`w-full pl-7 pr-2 py-1.5 border rounded-lg text-sm text-right font-medium focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-colors ${
                              hasValue ? 'border-blue-300 bg-white text-blue-900' : 'border-gray-200 bg-white text-gray-500 placeholder-gray-300'
                            }`}
                          />
                        </div>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Trial Rate */}
          <div className="bg-gray-50 rounded-xl p-4 space-y-2">
            <div>
              <h3 className="text-sm font-semibold text-gray-800">Trial Rate per Visit</h3>
              <p className="text-xs text-gray-500 mt-0.5">Leave empty if not eligible for trial payout</p>
            </div>
            {isReadOnly ? (
              <span className="text-sm font-semibold text-gray-800">
                {trialRate ? <>{formatCurrency(trialRate)}<span className="text-xs text-gray-500 font-normal"> / visit</span></> : <span className="text-gray-400 font-normal">Not set</span>}
              </span>
            ) : (
              <div className="relative w-48">
                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-sm text-gray-400 pointer-events-none">Rp</span>
                <input
                  type="text"
                  inputMode="numeric"
                  value={trialRate ? Number(trialRate).toLocaleString('id-ID') : ''}
                  onChange={e => setTrialRate(parseCurrencyInput(e.target.value))}
                  placeholder="0"
                  className="w-full pl-9 pr-3 py-2 border border-gray-200 rounded-lg text-sm text-right font-medium bg-white focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
              </div>
            )}
          </div>

          {/* Bonus Eligibility */}
          <div className="bg-gray-50 rounded-xl p-4 space-y-2">
            <div>
              <h3 className="text-sm font-semibold text-gray-800">Bonus Eligibility</h3>
              <p className="text-xs text-gray-500 mt-0.5">Mitra yang Not Eligible tidak bisa menerima bonus di payout</p>
            </div>
            {isReadOnly ? (
              <span className={`inline-flex items-center px-2.5 py-1 rounded-full text-xs font-semibold ${bonusCommission === 'Eligible' ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'}`}>
                {bonusCommission}
              </span>
            ) : (
              <select
                value={bonusCommission}
                onChange={e => setBonusCommission(e.target.value)}
                className="w-48 px-3 py-2 border border-gray-200 rounded-lg text-sm bg-white focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              >
                <option value="Eligible">Eligible</option>
                <option value="Not Eligible">Not Eligible</option>
              </select>
            )}
          </div>

          {/* Save result */}
          {saveResult && (
            <div className={`rounded-lg px-4 py-3 flex items-start gap-2 text-sm ${
              saveResult.type === 'success' ? 'bg-green-50 border border-green-200 text-green-800' : 'bg-red-50 border border-red-200 text-red-800'
            }`}>
              {saveResult.type === 'success'
                ? <Icons.checkCircle className="h-4 w-4 flex-shrink-0 mt-0.5 text-green-600" />
                : <Icons.alertTriangle className="h-4 w-4 flex-shrink-0 mt-0.5 text-red-500" />}
              <span>{saveResult.message}</span>
            </div>
          )}
        </div>

        {/* Footer */}
        {!isReadOnly && (
          <div className="sticky bottom-0 bg-white border-t border-gray-100 px-6 py-4 flex justify-end gap-3 rounded-b-2xl">
            <button type="button" onClick={onClose} disabled={saving}
              className="px-4 py-2 text-sm font-medium text-gray-700 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors disabled:opacity-50">
              {skipLabel}
            </button>
            <button type="button" onClick={handleSave} disabled={saving}
              className="px-5 py-2 text-sm font-semibold text-white bg-blue-600 hover:bg-blue-700 rounded-lg transition-colors disabled:opacity-50 flex items-center gap-2">
              {saving ? <><Icons.loader className="h-4 w-4 animate-spin" />Saving…</> : <><Icons.check className="h-4 w-4" />Save Changes</>}
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
