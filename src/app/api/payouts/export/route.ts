import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { payoutDB, mitraDB } from '@/lib/schema';
import { eq, and, inArray } from 'drizzle-orm';
import { jsPDF } from 'jspdf';
import autoTable from 'jspdf-autotable';

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

    // Return PDF format
    if (format === 'pdf') {
      console.log('Starting PDF generation with', transformedPayouts.length, 'payouts');

      // Create PDF document (A4 landscape for better table fit)
      const doc = new jsPDF({
        orientation: 'landscape',
        unit: 'mm',
        format: 'a4',
      });

      const pageWidth = doc.internal.pageSize.getWidth();
      const margin = 10;
      let yPos = 15;

      // Header
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(16);
      doc.setTextColor(30, 58, 138);
      doc.text('HOMA - Payout Export Report', pageWidth / 2, yPos, { align: 'center' });

      yPos += 7;
      doc.setFont('helvetica', 'normal');
      doc.setFontSize(10);
      doc.setTextColor(100, 100, 100);

      // Determine period text
      const monthNames = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
      let periodText = '';
      if (months.length === 12) {
        periodText = `Full Year ${year}`;
      } else if (months.length === 1) {
        periodText = `${monthNames[months[0] - 1]} ${year}`;
      } else {
        const monthsText = months.map(m => monthNames[m - 1]).join(', ');
        periodText = `${monthsText} ${year}`;
      }

      doc.text(`Period: ${periodText}`, pageWidth / 2, yPos, { align: 'center' });
      yPos += 3;
      doc.text(`Generated: ${new Date().toLocaleDateString('id-ID')}`, pageWidth / 2, yPos, { align: 'center' });

      yPos += 8;

      // Prepare table data
      const tableHeaders = [
        'Payout ID',
        'Year',
        'Month',
        'Mitra Code',
        'Mitra Name',
        'Bank',
        'Account #',
        'Qty',
        'Price/Qty',
        'Lainnya',
        'Total'
      ];

      const tableData = transformedPayouts.map((p) => [
        p.payoutId || '',
        (p.year || year).toString(),
        (p.month || 1).toString().padStart(2, '0'),
        p.mitraCode || '',
        p.mitraName || '',
        p.bankAccount || '',
        p.bankAccountNumber || '',
        (p.qty || 0).toString(),
        formatCurrency(p.pricePerQty || 0),
        formatCurrency(p.bonusAmount || 0),
        formatCurrency(p.priceTotal || 0),
      ]);

      // Calculate totals
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
      tableData.push([
        '',
        '',
        '',
        '',
        'TOTAL',
        '',
        `${transformedPayouts.length} payouts`,
        totalQty.toString(),
        '',
        formatCurrency(totalBonus),
        formatCurrency(grandTotal),
      ]);

      // Generate table
      autoTable(doc, {
        head: [tableHeaders],
        body: tableData,
        startY: yPos,
        theme: 'striped',
        styles: {
          fontSize: 7,
          cellPadding: 2,
        },
        headStyles: {
          fillColor: [59, 130, 246],
          textColor: [255, 255, 255],
          fontStyle: 'bold',
          halign: 'center',
        },
        columnStyles: {
          0: { cellWidth: 22 },  // Payout ID
          1: { cellWidth: 12, halign: 'center' },  // Year
          2: { cellWidth: 12, halign: 'center' },  // Month
          3: { cellWidth: 18 },  // Mitra Code
          4: { cellWidth: 35 },  // Mitra Name
          5: { cellWidth: 20 },  // Bank
          6: { cellWidth: 25 },  // Account #
          7: { cellWidth: 12, halign: 'right' },  // Qty
          8: { cellWidth: 25, halign: 'right' },  // Price/Qty
          9: { cellWidth: 25, halign: 'right' },  // Lainnya
          10: { cellWidth: 30, halign: 'right' },  // Total
        },
        margin: { left: margin, right: margin },
        didParseCell: (data) => {
          // Bold the summary row
          if (data.row.index === tableData.length - 1) {
            data.cell.styles.fontStyle = 'bold';
            data.cell.styles.fillColor = [240, 240, 240];
          }
        },
      });

      // Generate PDF as buffer
      const pdfBuffer = doc.output('arraybuffer');

      // Return PDF response
      return new NextResponse(pdfBuffer, {
        status: 200,
        headers: {
          'Content-Type': 'application/pdf',
          'Content-Disposition': `attachment; filename="payout-export-${year}-${months.join('-')}.pdf"`,
        },
      });
    }

    return NextResponse.json(
      { error: 'Invalid format. Use csv, json, or pdf' },
      { status: 400 }
    );
  } catch (error) {
    console.error('Export payout error:', error);
    console.error('Error details:', error instanceof Error ? error.message : 'Unknown error');
    console.error('Error stack:', error instanceof Error ? error.stack : '');
    return NextResponse.json(
      {
        error: 'Internal server error'
      },
      { status: 500 }
    );
  }
}
