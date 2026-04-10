'use client';

import { useState } from 'react';
import { Download, Loader2 } from 'lucide-react';
import { exportPayoutData, ExportPayoutOptions } from '@/lib/export-utils';
import { useToast } from '@/lib/toast';

interface PayoutExportButtonProps {
  year?: number;
  months?: number[];
  status?: 'Pending' | 'Paid' | 'Cancelled';
  variant?: 'default' | 'outline' | 'ghost';
  className?: string;
}

export function PayoutExportButton({
  year = 2025,
  months = [9, 10],
  status = 'Paid',
  variant = 'outline',
  className,
}: PayoutExportButtonProps) {
  const { toast } = useToast();
  const [isExporting, setIsExporting] = useState(false);

  const handleExport = async () => {
    setIsExporting(true);

    try {
      const result = await exportPayoutData({
        year,
        months,
        status,
        format: 'csv',
      });

      if (result.success) {
        toast('success', 'Export successful! Payout data has been downloaded.');
      } else {
        // Show specific message for no data
        toast('error', result.message || `No ${status.toLowerCase()} payouts to export for transfer`);
      }
    } catch (error) {
      toast('error', error instanceof Error ? error.message : 'Failed to export data');
    } finally {
      setIsExporting(false);
    }
  };

  const buttonClass = variant === 'outline' ? 'btn-secondary' : 'btn-primary';

  return (
    <button
      onClick={handleExport}
      disabled={isExporting}
      className={`${buttonClass} ${className || ''}`}
    >
      {isExporting ? (
        <>
          <Loader2 className="mr-2 h-4 w-4 animate-spin" />
          Exporting...
        </>
      ) : (
        <>
          <Download className="mr-2 h-4 w-4" />
          Export for Transfer
        </>
      )}
    </button>
  );
}

/**
 * Example Usage in Payout Page:
 *
 * import { PayoutExportButton } from '@/components/payout-export-button';
 *
 * export default function PayoutPage() {
 *   return (
 *     <div>
 *       <div className="flex justify-between items-center mb-4">
 *         <h1>Payouts</h1>
 *         <PayoutExportButton year={2025} months={[9, 10]} status="Paid" />
 *       </div>
 *
 *       // ... your payout table
 *     </div>
 *   );
 * }
 */

// Advanced version with filter options
export function PayoutExportWithFilters() {
  const { toast } = useToast();
  const [year, setYear] = useState(2025);
  const [selectedMonths, setSelectedMonths] = useState<number[]>([9, 10]);
  const [status, setStatus] = useState<'Pending' | 'Paid' | 'Cancelled'>('Paid');
  const [isExporting, setIsExporting] = useState(false);

  const handleExport = async () => {
    setIsExporting(true);

    try {
      const result = await exportPayoutData({
        year,
        months: selectedMonths,
        status,
        format: 'csv',
      });

      if (result.success) {
        toast('info', `Export successful! Exported ${selectedMonths.length} month(s) of ${status} payouts.`);
      } else {
        // Show info message for no data
        toast('error', result.message || `No ${status.toLowerCase()} payouts to export for transfer`);
      }
    } catch (error) {
      toast('error', error instanceof Error ? error.message : 'Failed to export data');
    } finally {
      setIsExporting(false);
    }
  };

  return (
    <div className="flex items-center gap-4">
      {/* Year selector */}
      <select
        value={year}
        onChange={(e) => setYear(parseInt(e.target.value))}
        className="border rounded px-3 py-2"
      >
        <option value={2024}>2024</option>
        <option value={2025}>2025</option>
        <option value={2026}>2026</option>
      </select>

      {/* Month multi-select */}
      <div className="flex gap-2">
        {[
          { value: 9, label: 'Sep' },
          { value: 10, label: 'Oct' },
          { value: 11, label: 'Nov' },
          { value: 12, label: 'Dec' },
        ].map((month) => (
          <button
            key={month.value}
            onClick={() => {
              setSelectedMonths((prev) =>
                prev.includes(month.value)
                  ? prev.filter((m) => m !== month.value)
                  : [...prev, month.value]
              );
            }}
            className={`px-3 py-1 rounded ${
              selectedMonths.includes(month.value)
                ? 'bg-blue-500 text-white'
                : 'bg-gray-200'
            }`}
          >
            {month.label}
          </button>
        ))}
      </div>

      {/* Status selector */}
      <select
        value={status}
        onChange={(e) => setStatus(e.target.value as any)}
        className="border rounded px-3 py-2"
      >
        <option value="Pending">Pending</option>
        <option value="Paid">Paid</option>
        <option value="Cancelled">Cancelled</option>
      </select>

      {/* Export button */}
      <button
        onClick={handleExport}
        disabled={isExporting || selectedMonths.length === 0}
        className="btn-primary"
      >
        {isExporting ? (
          <>
            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            Exporting...
          </>
        ) : (
          <>
            <Download className="mr-2 h-4 w-4" />
            Export CSV
          </>
        )}
      </button>
    </div>
  );
}
