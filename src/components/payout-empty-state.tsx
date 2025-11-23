'use client';

import { FileX, Calendar, DollarSign } from 'lucide-react';

interface PayoutEmptyStateProps {
  year?: number;
  months?: number[];
  status?: string;
  onChangeFilter?: () => void;
}

export function PayoutEmptyState({
  year = 2025,
  months = [9, 10],
  status = 'Paid',
  onChangeFilter,
}: PayoutEmptyStateProps) {
  const monthNames = [
    'January', 'February', 'March', 'April', 'May', 'June',
    'July', 'August', 'September', 'October', 'November', 'December'
  ];

  const selectedMonthNames = months.map(m => monthNames[m - 1]).join(', ');

  return (
    <div className="flex flex-col items-center justify-center py-16 px-4">
      <div className="bg-gray-100 rounded-full p-6 mb-4">
        <FileX className="h-12 w-12 text-gray-400" />
      </div>

      <h3 className="text-xl font-semibold text-gray-900 mb-2">
        No {status} Payouts to Export
      </h3>

      <p className="text-gray-600 text-center max-w-md mb-6">
        No {status.toLowerCase()} payouts found for <strong>{selectedMonthNames} {year}</strong>.
      </p>

      <div className="flex flex-col gap-4 items-center">
        {/* Suggestions */}
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 max-w-md">
          <p className="text-sm font-medium text-blue-900 mb-2">Suggestions:</p>
          <ul className="text-sm text-blue-800 space-y-1 list-disc list-inside">
            <li>Try selecting different months</li>
            <li>Check if payouts have been marked as "{status}"</li>
            <li>Verify payout data exists in the database</li>
            {status === 'Paid' && (
              <li>Try filtering by "Pending" status instead</li>
            )}
          </ul>
        </div>

        {/* Action Buttons */}
        {onChangeFilter && (
          <button onClick={onChangeFilter} className="btn-secondary">
            <Calendar className="mr-2 h-4 w-4" />
            Change Filter
          </button>
        )}
      </div>
    </div>
  );
}

/**
 * Usage Example:
 *
 * import { PayoutEmptyState } from '@/components/payout-empty-state';
 *
 * {payouts.length === 0 && (
 *   <PayoutEmptyState
 *     year={2025}
 *     months={[9, 10]}
 *     status="Paid"
 *     onChangeFilter={() => setShowFilters(true)}
 *   />
 * )}
 */

// Compact version for table empty state
export function PayoutTableEmptyState() {
  return (
    <div className="text-center py-12">
      <DollarSign className="mx-auto h-12 w-12 text-gray-400 mb-4" />
      <h3 className="text-lg font-medium text-gray-900 mb-2">
        No payouts available
      </h3>
      <p className="text-sm text-gray-600">
        Payout data will appear here once generated.
      </p>
    </div>
  );
}
