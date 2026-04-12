import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { payoutDB, mitraDB } from '@/lib/schema';
import { eq } from 'drizzle-orm';
import { getSession } from '@/lib/auth';
import { jsPDF } from 'jspdf';
import autoTable from 'jspdf-autotable';
import fs from 'fs';
import path from 'path';

interface RouteParams {
    params: Promise<{ id: string }>;
}

const COMPANY_INFO = {
    name: 'PT. HOMA MITRA ANDALAN',
    address1: 'Office 8 - SCBD',
    address2: 'Jalan Senopati No. 8B, Senayan, Kebayoran Baru',
    address3: 'Jakarta Selatan - 12910',
};

function formatCurrency(amount: number): string {
    return `IDR ${Math.round(amount).toLocaleString('id-ID')}`;
}

function formatDate(dateStr: string): string {
    const date = new Date(dateStr);
    const day = date.getDate();
    const month = date.toLocaleDateString('en-US', { month: 'short' });
    const year = date.getFullYear();
    return `${day}-${month}-${year}`;
}

function getMonthName(month: number): string {
    const months = ['January', 'February', 'March', 'April', 'May', 'June',
        'July', 'August', 'September', 'October', 'November', 'December'];
    return months[month - 1] || '';
}

/**
 * Expand a customer breakdown entry into per-invoice-period rows for the PDF.
 *
 * When a customer's billing cycle spans multiple calendar months, the payout
 * generation stores a `monthlyPayoutSplit` array inside calculationDetails.
 * Each entry in that array represents the portion of one calendar month.
 *
 * For the PDF we want one row per INVOICE PERIOD that falls (even partially)
 * in the payout month, showing:
 *   - Tanggal Awal / Tanggal Akhir  = intersection of invoice period with the payout month
 *   - Perhitungan                   = completedVisitsInThisMonth / totalScheduledInFullCycle (%)
 *
 * For a single-month billing cycle (no split), one row is emitted directly.
 */
interface PdfRow {
    customerName: string;
    payout: number;
    dateStart: string;
    dateEnd: string;
    completedVisits: number;
    scheduledVisits: number;
    percentage: number;
    invoicePeriodLabel?: string; // e.g. "Invoice Period-1"
}

function buildPdfRows(customer: any, payoutYear: number, payoutMonth: number): PdfRow[] {
    const details = customer.calculationDetails;
    const customerName: string = customer.customerName || '-';
    const scheduledVisits: number = customer.scheduledVisits || 1;

    // Case 1: New formula with period splitting — multiple invoice periods
    if (details?.monthlyPayoutSplit && details.monthlyPayoutSplit.length > 1) {
        const splits: Array<{ month: number; year: number; amount: number; visitCount: number; percentage: number; invoicePeriodId: string }> =
            details.monthlyPayoutSplit;

        // Find the split entry for THIS payout month
        const thisSplit = splits.find(s => s.month === payoutMonth && s.year === payoutYear);
        if (!thisSplit) return [];

        const completedInMonth = thisSplit.visitCount;
        const percentage = Math.round(thisSplit.percentage);

        return [{
            customerName,
            payout: thisSplit.amount,
            dateStart: customer.billingCycleStart || '',
            dateEnd: customer.billingCycleEnd || '',
            completedVisits: completedInMonth,
            scheduledVisits,
            percentage,
        }];
    }

    // Case 2: Single-month or fallback — one row
    const completedVisits: number = customer.completedVisits || 0;
    let percentage: number;

    if (details?.totalPayoutPercentage !== undefined) {
        percentage = Math.round(details.totalPayoutPercentage);
    } else {
        percentage = scheduledVisits > 0 ? Math.round((completedVisits / scheduledVisits) * 100) : 0;
    }

    return [{
        customerName,
        payout: customer.payout || 0,
        dateStart: customer.billingCycleStart || '',
        dateEnd: customer.billingCycleEnd || '',
        completedVisits,
        scheduledVisits,
        percentage,
    }];
}

export async function GET(
    request: NextRequest,
    { params }: RouteParams
): Promise<NextResponse> {
    try {
        const session = await getSession();
        if (!session) {
            return NextResponse.json(
                { success: false, message: 'Unauthorized' },
                { status: 401 }
            );
        }

        const { id } = await params;
        const { searchParams } = new URL(request.url);
        const format = searchParams.get('format'); // 'json' for preview, default = pdf

        const payoutResult = await db
            .select({
                id: payoutDB.id,
                payoutId: payoutDB.payoutId,
                mitraId: payoutDB.mitraId,
                year: payoutDB.year,
                month: payoutDB.month,
                payoutDate: payoutDB.payoutDate,
                scheduledVisits: payoutDB.scheduledVisits,
                totalVisits: payoutDB.totalVisits,
                basePayout: payoutDB.basePayout,
                bonusAmount: payoutDB.bonusAmount,
                totalPayout: payoutDB.totalPayout,
                status: payoutDB.status,
                bonusEligible: payoutDB.bonusEligible,
                breakdown: payoutDB.breakdown,
                notes: payoutDB.notes,
                mitraName: mitraDB.mitraName,
                mitraCode: mitraDB.mitraCode,
                mitraPhone: mitraDB.mitraPhone,
                mitraBankAccount: mitraDB.mitraBankAccount,
                mitraBankHolderName: mitraDB.mitraBankHolderName,
                mitraBankAccountNumber: mitraDB.mitraBankAccountNumber,
                mitraBonusRate: mitraDB.bonusRate,
            })
            .from(payoutDB)
            .leftJoin(mitraDB, eq(payoutDB.mitraId, mitraDB.id))
            .where(eq(payoutDB.id, id))
            .limit(1);

        if (payoutResult.length === 0) {
            return NextResponse.json(
                { success: false, message: 'Payout not found' },
                { status: 404 }
            );
        }

        const payout = payoutResult[0];

        let breakdown: any = { customers: [], adjustments: [] };
        try {
            if (typeof payout.breakdown === 'string') {
                breakdown = JSON.parse(payout.breakdown);
            } else if (payout.breakdown) {
                breakdown = payout.breakdown;
            }
        } catch (e) {
            console.error('Error parsing breakdown:', e);
        }

        const allCustomers: any[] = breakdown.customers || [];
        const adjustments: any[] = breakdown.adjustments || [];

        const regularCustomers = allCustomers.filter((c: any) =>
            !c.subscriptionPackage?.toLowerCase().includes('trial')
        );
        const trialCustomers = allCustomers.filter((c: any) =>
            c.subscriptionPackage?.toLowerCase().includes('trial')
        );

        // Build expanded rows — one per invoice-period-month intersection
        const regularRows: PdfRow[] = regularCustomers.flatMap((c: any) =>
            buildPdfRows(c, payout.year, payout.month)
        );

        // Parse tunjangan from notes JSON
        function parseTunjangan(notes: string | null) {
            if (!notes) return { uangParkir: 0, kompensasiPromosi: 0, lainnyaAmount: 0, lainnyaLabel: '' };
            try {
                const p = JSON.parse(notes);
                if (typeof p === 'object' && p !== null) {
                    return {
                        uangParkir: Number(p.uangParkir) || 0,
                        kompensasiPromosi: Number(p.kompensasiPromosi) || 0,
                        lainnyaAmount: Number(p.lainnyaAmount) || 0,
                        lainnyaLabel: p.lainnyaLabel || '',
                    };
                }
            } catch {}
            return { uangParkir: 0, kompensasiPromosi: 0, lainnyaAmount: 0, lainnyaLabel: notes };
        }

        const komisiImbalJasa = Number(payout.basePayout) || 0;
        const bonusAmount = Number(payout.bonusAmount) || 0;
        const tunjangan = parseTunjangan(payout.notes);
        const tunjanganTotal = tunjangan.uangParkir + tunjangan.kompensasiPromosi + tunjangan.lainnyaAmount;
        const totalPembayaran = komisiImbalJasa + bonusAmount + tunjanganTotal;

        // ============ JSON PREVIEW RETURN ============
        if (format === 'json') {
            return NextResponse.json({
                payoutId: payout.payoutId,
                period: { year: payout.year, month: payout.month },
                mitra: {
                    name: payout.mitraName || '-',
                    code: payout.mitraCode || '-',
                    phone: payout.mitraPhone || '-',
                    bank: payout.mitraBankAccount && payout.mitraBankAccountNumber
                        ? `${payout.mitraBankAccount} - ${payout.mitraBankAccountNumber}`
                        : '-',
                    bankHolderName: payout.mitraBankHolderName || '-',
                },
                summary: {
                    bonus: bonusAmount,
                    komisiImbalJasa,
                    totalPembayaran,
                    notes: payout.notes || null,
                },
                regularRows: regularRows.map(r => ({
                    customerName: r.customerName,
                    payout: r.payout,
                    dateStart: r.dateStart,
                    dateEnd: r.dateEnd,
                    completedVisits: r.completedVisits,
                    scheduledVisits: r.scheduledVisits,
                    percentage: r.percentage,
                })),
                trialCustomers: trialCustomers.map((c: any) => ({
                    customerName: c.customerName || '-',
                    payout: c.payout || 0,
                    visitDates: (c.visitDates || []) as string[],
                })),
            });
        }

        // ============ BUILD PDF ============
        const doc = new jsPDF({
            orientation: 'portrait',
            unit: 'mm',
            format: 'a4',
        });

        const pageWidth = doc.internal.pageSize.getWidth();
        const margin = 15;
        let yPos = 20;

        // --- HEADER ---
        try {
            const logoPath = path.join(process.cwd(), 'public', 'images', 'homa-logo.png');
            if (fs.existsSync(logoPath)) {
                const logoBuffer = fs.readFileSync(logoPath);
                const logoBase64 = logoBuffer.toString('base64');
                doc.addImage(`data:image/png;base64,${logoBase64}`, 'PNG', margin, yPos - 5, 20, 20);
            }
        } catch (error) {
            doc.setFillColor(59, 130, 246);
            doc.roundedRect(margin, yPos - 5, 20, 20, 3, 3, 'F');
        }

        doc.setFont('helvetica', 'bold');
        doc.setFontSize(24);
        doc.setTextColor(30, 58, 138);
        doc.text('HOMA', margin + 25, yPos + 5);

        doc.setFont('helvetica', 'normal');
        doc.setFontSize(9);
        doc.setTextColor(100, 100, 100);
        doc.text(COMPANY_INFO.name, pageWidth / 2, yPos + 12, { align: 'center' });
        doc.text(COMPANY_INFO.address1, pageWidth / 2, yPos + 16, { align: 'center' });
        doc.text(COMPANY_INFO.address2, pageWidth / 2, yPos + 20, { align: 'center' });
        doc.text(COMPANY_INFO.address3, pageWidth / 2, yPos + 24, { align: 'center' });

        yPos += 35;
        doc.setDrawColor(200, 200, 200);
        doc.setLineWidth(0.3);
        doc.line(margin, yPos, pageWidth - margin, yPos);
        yPos += 10;

        // --- PERIODE & MITRA INFO ---
        doc.setFont('helvetica', 'normal');
        doc.setFontSize(10);
        doc.setTextColor(0, 0, 0);
        doc.text('Periode Pembayaran', margin, yPos);
        doc.text(`:  ${getMonthName(payout.month)}-${payout.year}`, margin + 45, yPos);
        yPos += 10;

        const mitraInfoLabels = [
            { label: 'Nama Mitra', value: payout.mitraName || '-' },
            { label: 'Kode Mitra', value: payout.mitraCode || '-' },
            { label: 'No. Telpon', value: payout.mitraPhone || '-' },
            { label: 'Bank', value: payout.mitraBankAccount && payout.mitraBankAccountNumber ? `${payout.mitraBankAccount} - ${payout.mitraBankAccountNumber}` : '-' },
        ];

        mitraInfoLabels.forEach(item => {
            doc.text(item.label, margin, yPos);
            doc.text(`:  ${item.value}`, margin + 45, yPos);
            yPos += 6;
        });

        yPos += 5;
        doc.setDrawColor(200, 200, 200);
        doc.line(margin, yPos, pageWidth - margin, yPos);
        yPos += 8;

        // --- PAYOUT SUMMARY ---
        doc.setFont('helvetica', 'normal');
        doc.text('Bonus', margin, yPos);
        doc.text(':', margin + 45, yPos);
        doc.text(formatCurrency(bonusAmount), margin + 50, yPos);
        yPos += 6;

        doc.text('Komisi Imbal Jasa', margin, yPos);
        doc.text(':', margin + 45, yPos);
        doc.text(formatCurrency(komisiImbalJasa), margin + 50, yPos);
        yPos += 8;

        // Tunjangan Lainnya — only show if at least one item > 0
        const tunjanganItems: { label: string; amount: number }[] = [];
        if (tunjangan.uangParkir > 0) tunjanganItems.push({ label: 'Uang Parkir', amount: tunjangan.uangParkir });
        if (tunjangan.kompensasiPromosi > 0) tunjanganItems.push({ label: 'Kompensasi Promosi', amount: tunjangan.kompensasiPromosi });
        if (tunjangan.lainnyaAmount > 0) tunjanganItems.push({ label: tunjangan.lainnyaLabel || 'Lainnya', amount: tunjangan.lainnyaAmount });

        if (tunjanganItems.length > 0) {
            doc.setFont('helvetica', 'bold');
            doc.text('Tunjangan Lainnya', margin, yPos);
            doc.setFont('helvetica', 'normal');
            yPos += 6;

            for (const item of tunjanganItems) {
                doc.text(item.label, margin + 3, yPos);
                doc.text(':', margin + 45, yPos);
                doc.text(formatCurrency(item.amount), margin + 50, yPos);
                yPos += 5;
            }
            yPos += 3;
        }

        doc.setDrawColor(200, 200, 200);
        doc.line(margin, yPos, pageWidth - margin, yPos);
        yPos += 6;

        doc.setFont('helvetica', 'bold');
        doc.text('Total Pembayaran', margin, yPos);
        doc.text(':', margin + 45, yPos);
        doc.text(formatCurrency(totalPembayaran), margin + 50, yPos);
        doc.setFont('helvetica', 'normal');
        yPos += 10;

        doc.setDrawColor(200, 200, 200);
        doc.line(margin, yPos, pageWidth - margin, yPos);
        yPos += 8;

        // --- REGULAR CUSTOMERS TABLE ---
        // Columns: Nama Customers | Komisi Imbal Jasa | Tanggal Awal | Tanggal Akhir | Perhitungan Pro-Rata
        if (regularRows.length > 0) {
            const tableHeaders = [
                ['Nama Customers', 'Komisi Imbal Jasa', 'Tanggal Awal', 'Tanggal Akhir', 'Perhitungan Pro-Rata']
            ];

            const tableData = regularRows.map((row) => {
                const perhitungan = `${row.completedVisits}/${row.scheduledVisits} Kedatangan (${row.percentage}%)`;
                return [
                    row.customerName,
                    formatCurrency(row.payout),
                    row.dateStart ? formatDate(row.dateStart) : '-',
                    row.dateEnd ? formatDate(row.dateEnd) : '-',
                    perhitungan,
                ];
            });

            // Total row
            const totalKomisi = regularRows.reduce((sum, r) => sum + r.payout, 0);
            tableData.push(['Total', formatCurrency(totalKomisi), '', '', '']);

            autoTable(doc, {
                head: tableHeaders,
                body: tableData,
                startY: yPos,
                theme: 'plain',
                styles: {
                    fontSize: 8,
                    cellPadding: 2,
                    lineColor: [0, 0, 0],
                    lineWidth: 0.1,
                },
                headStyles: {
                    fillColor: [255, 255, 255],
                    textColor: [0, 0, 0],
                    fontStyle: 'bold',
                    lineColor: [0, 0, 0],
                    lineWidth: 0.3,
                },
                columnStyles: {
                    0: { cellWidth: 38 },  // Nama Customers
                    1: { cellWidth: 32, halign: 'left' },  // Komisi
                    2: { cellWidth: 26 },  // Tanggal Awal
                    3: { cellWidth: 26 },  // Tanggal Akhir
                    4: { cellWidth: 48 },  // Perhitungan Pro-Rata
                },
                margin: { left: margin, right: margin },
                didParseCell: (data) => {
                    // Bold total row
                    if (data.row.index === tableData.length - 1) {
                        data.cell.styles.fontStyle = 'bold';
                    }
                },
            });

            yPos = (doc as any).lastAutoTable.finalY + 8;
        }

        // --- TRIAL CUSTOMERS TABLE --- only render if there are trial customers
        if (trialCustomers.length > 0) {
            const maxVisitCols = trialCustomers.reduce((max: number, c: any) =>
                Math.max(max, (c.visitDates?.length || 0)), 0);
            const visitCols = Math.max(maxVisitCols, 1);

            const trialHeaders = [[
                'Nama Customers\n(Free Trial)',
                'Kompensasi Promosi\nUji Coba',
                ...Array.from({ length: visitCols }, (_, i) => `Uji Coba Ke-${i + 1}`),
            ]];

            const trialData = trialCustomers.map((customer: any) => [
                customer.customerName || '',
                formatCurrency(customer.payout || 0),
                ...Array.from({ length: visitCols }, (_, i) => {
                    const d = customer.visitDates?.[i];
                    return d ? formatDate(d) : '';
                }),
            ]);

            const trialTotal = trialCustomers.reduce((sum: number, c: any) => sum + (c.payout || 0), 0);
            trialData.push(['Total', formatCurrency(trialTotal), ...Array(visitCols).fill('')]);

            const colStyles: Record<number, any> = {
                0: { cellWidth: 45 },
                1: { cellWidth: 38, halign: 'left' },
            };
            const visitColWidth = Math.min(35, (170 - 83) / visitCols);
            for (let i = 0; i < visitCols; i++) {
                colStyles[2 + i] = { cellWidth: visitColWidth };
            }

            autoTable(doc, {
                head: trialHeaders,
                body: trialData,
                startY: yPos,
                theme: 'plain',
                styles: {
                    fontSize: 8,
                    cellPadding: 2,
                    lineColor: [0, 0, 0],
                    lineWidth: 0.1,
                },
                headStyles: {
                    fillColor: [255, 255, 255],
                    textColor: [0, 0, 0],
                    fontStyle: 'bold',
                    lineColor: [0, 0, 0],
                    lineWidth: 0.3,
                },
                columnStyles: colStyles,
                margin: { left: margin, right: margin },
                didParseCell: (data) => {
                    if (data.row.index === trialData.length - 1) {
                        data.cell.styles.fontStyle = 'bold';
                    }
                },
            });
        }

        // Generate PDF
        const pdfBuffer = doc.output('arraybuffer');

        return new NextResponse(pdfBuffer, {
            status: 200,
            headers: {
                'Content-Type': 'application/pdf',
                'Content-Disposition': `attachment; filename="payout-slip-${payout.payoutId?.replace(/\//g, '-') || id}.pdf"`,
            },
        });

    } catch (error) {
        console.error('Error generating PDF:', error);
        return NextResponse.json(
            { success: false, message: 'Failed to generate PDF' },
            { status: 500 }
        );
    }
}
