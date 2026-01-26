import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { payoutDB, mitraDB } from '@/lib/schema';
import { eq, and, inArray } from 'drizzle-orm';

// Helper function to format currency
function formatCurrency(amount: number | string): string {
  const num = typeof amount === 'string' ? parseFloat(amount) : Number(amount);
  if (isNaN(num)) return 'Rp0';
  return `Rp${num.toLocaleString('id-ID')}`;
}

// GET /api/payouts/export
// Export payout data untuk transfer ke bank
export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const year = parseInt(searchParams.get('year') || '2025');
    const months = searchParams.get('months')?.split(',').map(Number) || [9, 10];
    const format = searchParams.get('format') || 'csv'; // csv or json

    console.log('Export request - year:', year, 'months:', months, 'format:', format);

    // Query payout data with mitra info (ALL statuses - no status filter)
    console.log('Fetching payouts from database...');
    const payouts = await db
      .select()
      .from(payoutDB)
      .innerJoin(mitraDB, eq(payoutDB.mitraId, mitraDB.id))
      .where(
        and(
          eq(payoutDB.year, year),
          inArray(payoutDB.month, months)
        )
      );

    console.log('Raw payouts fetched:', payouts.length);
    if (payouts.length > 0) {
      console.log('Sample raw payout keys:', Object.keys(payouts[0]));
      console.log('Sample raw payout:', JSON.stringify(payouts[0], null, 2));
    }

    // Transform to expected format
    const transformedPayouts = payouts.map(row => ({
      payoutId: row.payout_db.payoutId,
      mitraCode: row.mitra_db.mitraCode,
      mitraName: row.mitra_db.mitraName,
      phone: row.mitra_db.mitraPhone,
      bankAccount: row.mitra_db.mitraBankAccount,
      bankAccountNumber: row.mitra_db.mitraBankAccountNumber,
      bankHolderName: row.mitra_db.mitraBankHolderName,
      qty: row.payout_db.totalVisits,
      pricePerQty: row.payout_db.pricePerVisit,
      bonusAmount: row.payout_db.bonusAmount,
      priceTotal: row.payout_db.totalPayout,
      month: row.payout_db.month,
      year: row.payout_db.year,
      status: row.payout_db.status,
      bonusEligible: row.payout_db.bonusEligible,
    }));

    // Sort in JavaScript instead of SQL to avoid Drizzle ORM ordering issues
    transformedPayouts.sort((a, b) => {
      const nameCompare = (a.mitraName || '').localeCompare(b.mitraName || '');
      if (nameCompare !== 0) return nameCompare;
      return (a.month || 0) - (b.month || 0);
    });

    console.log('Query completed. Found', transformedPayouts?.length || 0, 'payouts');

    // Check if no data found
    if (!transformedPayouts || transformedPayouts.length === 0) {
      return NextResponse.json(
        {
          success: false,
          message: `No payouts found for ${year} (months: ${months.join(', ')})`,
          data: [],
          total: 0,
        },
        { status: 404 }
      );
    }

    // Return JSON format
    if (format === 'json') {
      return NextResponse.json({
        success: true,
        data: transformedPayouts,
        total: transformedPayouts.length,
      });
    }

    // Return CSV format
    if (format === 'csv') {
      console.log('Starting CSV generation with', transformedPayouts.length, 'payouts');
      console.log('Sample payout data:', JSON.stringify(transformedPayouts[0] || {}, null, 2));

      const csvHeaders = [
        'Payout ID',
        'Period Year',
        'Period Month',
        'Mitra Code',
        'Mitra Name',
        'Phone',
        'Bank Account',
        'Bank Account Number',
        'Bank Holder Name',
        'Qty',
        'Price per Qty',
        'Lainnya Amount',
        'Price Total',
      ];

      console.log('Mapping CSV rows...');
      const csvRows = transformedPayouts.map((p) => [
        p.payoutId || '',
        (p.year || 2025).toString(),
        (p.month || 1).toString().padStart(2, '0'), // Format: 09, 10, etc
        p.mitraCode || '',
        p.mitraName || '',
        p.phone || '',
        p.bankAccount || '',
        p.bankAccountNumber || '',
        p.bankHolderName || '',
        (p.qty || 0).toString(),
        formatCurrency(p.pricePerQty || 0),
        formatCurrency(p.bonusAmount || 0),
        formatCurrency(p.priceTotal || 0),
      ]);

      // Calculate summary totals
      const totalQty = transformedPayouts.reduce((sum, p) => sum + (Number(p.qty) || 0), 0);
      const totalBonus = transformedPayouts.reduce((sum, p) => {
        const amount = typeof p.bonusAmount === 'string' ? parseFloat(p.bonusAmount) : Number(p.bonusAmount);
        return sum + (isNaN(amount) ? 0 : amount);
      }, 0);
      const grandTotal = transformedPayouts.reduce((sum, p) => {
        const amount = typeof p.priceTotal === 'string' ? parseFloat(p.priceTotal) : Number(p.priceTotal);
        return sum + (isNaN(amount) ? 0 : amount);
      }, 0);

      // Add summary row
      csvRows.push([
        '',
        '',
        '',
        '',
        'TOTAL',
        '',
        '',
        '',
        `${transformedPayouts.length} payouts`,
        totalQty.toString(),
        '',
        formatCurrency(totalBonus),
        formatCurrency(grandTotal),
      ]);

      const csvContent = [
        csvHeaders.join(','),
        ...csvRows.map((row) =>
          row
            .map((cell) => {
              // Escape commas and quotes in CSV
              const cellStr = String(cell);
              if (cellStr.includes(',') || cellStr.includes('"')) {
                return `"${cellStr.replace(/"/g, '""')}"`;
              }
              return cellStr;
            })
            .join(',')
        ),
      ].join('\n');

      return new NextResponse(csvContent, {
        status: 200,
        headers: {
          'Content-Type': 'text/csv',
          'Content-Disposition': `attachment; filename="payout-export-${year}-${months.join('-')}.csv"`,
        },
      });
    }

    return NextResponse.json(
      { error: 'Invalid format. Use csv or json' },
      { status: 400 }
    );
  } catch (error) {
    console.error('Export payout error:', error);
    console.error('Error details:', error instanceof Error ? error.message : 'Unknown error');
    console.error('Error stack:', error instanceof Error ? error.stack : '');
    return NextResponse.json(
      {
        error: 'Failed to export payout data',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}
