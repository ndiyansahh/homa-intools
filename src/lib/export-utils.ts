/**
 * Export Payout Data Utilities
 * For exporting payout data to CSV for bank transfers
 */

export interface ExportPayoutOptions {
  year?: number;
  months?: number[];
  status?: 'Pending' | 'Paid' | 'Cancelled';
  format?: 'csv' | 'json';
}

/**
 * Export payout data to CSV
 * Usage: Call this from your payout page export button
 */
export async function exportPayoutData(options: ExportPayoutOptions = {}) {
  const {
    year = 2025,
    months = [9, 10], // September & October
    status = 'Paid',
    format = 'csv',
  } = options;

  try {
    // Build query params
    const params = new URLSearchParams({
      year: year.toString(),
      months: months.join(','),
      status,
      format,
    });

    // Fetch export data from API
    const response = await fetch(`/api/payouts/export?${params.toString()}`);

    // Handle 404 - No data found
    if (response.status === 404) {
      const errorData = await response.json();
      return {
        success: false,
        message: errorData.message || `No ${status.toLowerCase()} payouts to export for transfer`,
        total: 0,
      };
    }

    if (!response.ok) {
      throw new Error('Failed to export payout data');
    }

    if (format === 'csv') {
      // Download CSV file
      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `payout-export-${year}-${months.join('-')}.csv`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      window.URL.revokeObjectURL(url);

      return { success: true, message: 'Export successful' };
    } else {
      // Return JSON data
      const data = await response.json();
      return data;
    }
  } catch (error) {
    console.error('Export error:', error);
    return {
      success: false,
      message: error instanceof Error ? error.message : 'Export failed',
    };
  }
}

/**
 * Export specific payouts by IDs
 */
export async function exportPayoutsByIds(payoutIds: string[]) {
  try {
    const params = new URLSearchParams({
      ids: payoutIds.join(','),
      format: 'csv',
    });

    const response = await fetch(`/api/payouts/export?${params.toString()}`);

    if (!response.ok) {
      throw new Error('Failed to export selected payouts');
    }

    const blob = await response.blob();
    const url = window.URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `payout-export-selected-${Date.now()}.csv`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    window.URL.revokeObjectURL(url);

    return { success: true, message: 'Export successful' };
  } catch (error) {
    console.error('Export error:', error);
    return {
      success: false,
      message: error instanceof Error ? error.message : 'Export failed',
    };
  }
}

/**
 * Format currency for display
 */
export function formatCurrency(amount: number | string): string {
  const num = typeof amount === 'string' ? parseFloat(amount) : amount;
  return new Intl.NumberFormat('id-ID', {
    style: 'currency',
    currency: 'IDR',
    minimumFractionDigits: 0,
  }).format(num);
}

/**
 * Validate payout data before export
 */
export function validatePayoutExport(payouts: any[]): {
  valid: boolean;
  errors: string[];
} {
  const errors: string[] = [];

  if (!payouts || payouts.length === 0) {
    errors.push('No payout data to export');
    return { valid: false, errors };
  }

  payouts.forEach((payout, index) => {
    if (!payout.mitraName) {
      errors.push(`Row ${index + 1}: Missing mitra name`);
    }
    if (!payout.bankAccountNumber) {
      errors.push(`Row ${index + 1}: Missing bank account number for ${payout.mitraName}`);
    }
    if (!payout.priceTotal || payout.priceTotal <= 0) {
      errors.push(`Row ${index + 1}: Invalid total amount for ${payout.mitraName}`);
    }
  });

  return {
    valid: errors.length === 0,
    errors,
  };
}
