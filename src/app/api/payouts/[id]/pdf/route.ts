import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { payoutDB, mitraDB, customerDB } from '@/lib/schema';
import { eq, and } from 'drizzle-orm';
import { getSession } from '@/lib/auth';
import { jsPDF } from 'jspdf';
import autoTable from 'jspdf-autotable';
import fs from 'fs';
import path from 'path';

interface RouteParams {
    params: Promise<{ id: string }>;
}

// Company info - can be moved to config or environment variables
const COMPANY_INFO = {
    name: 'PT. HOMA MITRA ANDALAN',
    address1: 'Office 8 - SCBD',
    address2: 'Jalan Senopati No. 8B, Senayan, Kebayoran Baru',
    address3: 'Jakarta Selatan - 12910',
};

// Helper function to format currency
function formatCurrency(amount: number): string {
    return `IDR ${Math.round(amount).toLocaleString('id-ID')}`;
}

// Helper function to format date (1-Dec-2025 format)
function formatDate(dateStr: string): string {
    const date = new Date(dateStr);
    const day = date.getDate();
    const month = date.toLocaleDateString('en-US', { month: 'short' });
    const year = date.getFullYear();
    return `${day}-${month}-${year}`;
}

// Helper function to get month name
function getMonthName(month: number): string {
    const months = ['January', 'February', 'March', 'April', 'May', 'June',
        'July', 'August', 'September', 'October', 'November', 'December'];
    return months[month - 1] || '';
}

// GET /api/payouts/[id]/pdf - Generate PDF payout slip
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

        // Fetch payout with mitra data
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
                // Mitra info
                mitraName: mitraDB.mitraName,
                mitraCode: mitraDB.mitraCode,
                mitraPhone: mitraDB.mitraPhone,
                mitraBankAccount: mitraDB.mitraBankAccount,
                mitraBankHolderName: mitraDB.mitraBankHolderName,
                mitraBankAccountNumber: mitraDB.mitraBankAccountNumber,
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

        // Parse breakdown
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

        const customers = breakdown.customers || [];
        const adjustments = breakdown.adjustments || [];

        // Separate regular customers and trial customers
        const regularCustomers = customers.filter((c: any) =>
            !c.subscriptionPackage?.toLowerCase().includes('trial')
        );
        const trialCustomers = customers.filter((c: any) =>
            c.subscriptionPackage?.toLowerCase().includes('trial')
        );

        // Calculate totals
        const komisiImbalJasa = Number(payout.basePayout) || 0;
        const bonusAmount = Number(payout.bonusAmount) || 0;
        const totalPembayaran = Number(payout.totalPayout) || 0;

        // Create PDF document (A4 size)
        const doc = new jsPDF({
            orientation: 'portrait',
            unit: 'mm',
            format: 'a4',
        });

        const pageWidth = doc.internal.pageSize.getWidth();
        const margin = 15;
        let yPos = 20;

        // ============ HEADER SECTION ============
        // Load HOMA logo
        try {
            const logoPath = path.join(process.cwd(), 'public', 'images', 'homa-logo.png');
            const logoExists = fs.existsSync(logoPath);

            if (logoExists) {
                const logoBuffer = fs.readFileSync(logoPath);
                const logoBase64 = logoBuffer.toString('base64');
                const logoDataUrl = `data:image/png;base64,${logoBase64}`;

                // Add logo image (20mm width, auto height)
                doc.addImage(logoDataUrl, 'PNG', margin, yPos - 5, 20, 20);
            }
        } catch (error) {
            console.error('Error loading logo:', error);
            // Fallback: draw placeholder if logo not found
            doc.setFillColor(59, 130, 246);
            doc.roundedRect(margin, yPos - 5, 20, 20, 3, 3, 'F');
        }

        // Company name
        doc.setFont('helvetica', 'bold');
        doc.setFontSize(24);
        doc.setTextColor(30, 58, 138); // Dark blue
        doc.text('HOMA', margin + 25, yPos + 5);

        // Company details
        doc.setFont('helvetica', 'normal');
        doc.setFontSize(9);
        doc.setTextColor(100, 100, 100);
        doc.text(COMPANY_INFO.name, pageWidth / 2, yPos + 12, { align: 'center' });
        doc.text(COMPANY_INFO.address1, pageWidth / 2, yPos + 16, { align: 'center' });
        doc.text(COMPANY_INFO.address2, pageWidth / 2, yPos + 20, { align: 'center' });
        doc.text(COMPANY_INFO.address3, pageWidth / 2, yPos + 24, { align: 'center' });

        yPos += 35;

        // Separator line
        doc.setDrawColor(200, 200, 200);
        doc.setLineWidth(0.3);
        doc.line(margin, yPos, pageWidth - margin, yPos);
        yPos += 10;

        // ============ PAYOUT PERIOD ============
        doc.setFont('helvetica', 'normal');
        doc.setFontSize(10);
        doc.setTextColor(0, 0, 0);
        doc.text('Periode Pembayaran', margin, yPos);
        doc.text(`:  ${getMonthName(payout.month)}-${payout.year}`, margin + 45, yPos);
        yPos += 10;

        // ============ MITRA INFO ============
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

        // Separator line
        doc.setDrawColor(200, 200, 200);
        doc.line(margin, yPos, pageWidth - margin, yPos);
        yPos += 8;

        // ============ PAYOUT SUMMARY ============
        // Bonus
        doc.setFont('helvetica', 'normal');
        doc.text('Bonus', margin, yPos);
        doc.text(':', margin + 45, yPos);
        doc.text(formatCurrency(bonusAmount), margin + 50, yPos);
        yPos += 6;

        // Komisi Imbal Jasa
        doc.text('Komisi Imbal Jasa', margin, yPos);
        doc.text(':', margin + 45, yPos);
        doc.text(formatCurrency(komisiImbalJasa), margin + 50, yPos);
        yPos += 8;

        // Tunjangan Lainnya section
        doc.setFont('helvetica', 'bold');
        doc.text('Tunjangan Lainnya', margin, yPos);
        doc.setFont('helvetica', 'normal');
        yPos += 6;

        // Uang Parkir
        doc.text('Uang Parkir', margin + 3, yPos);
        doc.text(':', margin + 45, yPos);
        yPos += 5;

        // Kompensasi Promosi Uji Coba
        doc.text('Kompensasi Promosi', margin + 3, yPos);
        yPos += 5;
        doc.text('Uji Coba', margin + 3, yPos);
        doc.text(':', margin + 45, yPos - 5);
        doc.text(formatCurrency(0), margin + 50, yPos - 5);
        yPos += 3;

        // Separator line
        doc.setDrawColor(200, 200, 200);
        doc.line(margin, yPos, pageWidth - margin, yPos);
        yPos += 6;

        // Total Pembayaran
        doc.setFont('helvetica', 'bold');
        doc.text('Total Pembayaran', margin, yPos);
        doc.text(':', margin + 45, yPos);
        doc.text(formatCurrency(totalPembayaran), margin + 50, yPos);
        doc.setFont('helvetica', 'normal');

        yPos += 10;

        // Separator line
        doc.setDrawColor(200, 200, 200);
        doc.line(margin, yPos, pageWidth - margin, yPos);
        yPos += 8;

        // ============ CUSTOMER DETAILS TABLE ============
        if (regularCustomers.length > 0) {
            // Table header
            const tableHeaders = [
                ['Nama Customers', 'Komisi Imbal Jasa', 'Tanggal Awal', 'Tanggal Akhir', 'Perhitungan Pro-Rata']
            ];

            // Table data - Show ALL breakdown rows (multiple rows per customer if rate changes)
            const tableData = regularCustomers.map((customer: any) => {
                const completedVisits = customer.completedVisits || 0;
                const scheduledVisits = customer.scheduledVisits || 1;
                const percentage = Math.round((completedVisits / scheduledVisits) * 100);

                return [
                    customer.customerName || '-',
                    formatCurrency(customer.payout || 0),
                    customer.billingCycleStart ? formatDate(customer.billingCycleStart) : '-',
                    customer.billingCycleEnd ? formatDate(customer.billingCycleEnd) : '-',
                    `${completedVisits}/${scheduledVisits} Kedatangan (${percentage}%)`
                ];
            });

            // Add total row
            tableData.push([
                'Total',
                formatCurrency(komisiImbalJasa),
                '',
                '',
                ''
            ]);

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
                    0: { cellWidth: 40 },
                    1: { cellWidth: 35, halign: 'left' },
                    2: { cellWidth: 30 },
                    3: { cellWidth: 30 },
                    4: { cellWidth: 45 },
                },
                margin: { left: margin, right: margin },
                didParseCell: (data) => {
                    // Bold the total row
                    if (data.row.index === tableData.length - 1) {
                        data.cell.styles.fontStyle = 'bold';
                    }
                },
            });

            // Get the final Y position after the table
            yPos = (doc as any).lastAutoTable.finalY + 10;
        }

        // ============ TRIAL CUSTOMERS TABLE ============
        // Trial section header
        const trialHeaders = [
            ['Nama Customers\n(Free Trial)', 'Kompensasi Promosi\nUji Coba', 'Uji Coba Ke-1', 'Uji Coba Ke-2']
        ];

        // Trial table data (show structure even if empty)
        const trialData = trialCustomers.length > 0
            ? trialCustomers.map((customer: any) => [
                customer.customerName || '',
                formatCurrency(customer.payout || 0),
                customer.billingCycleStart ? formatDate(customer.billingCycleStart) : '',
                customer.billingCycleEnd ? formatDate(customer.billingCycleEnd) : ''
            ])
            : [['', formatCurrency(0), '', '']];

        // Calculate trial total
        const trialTotal = trialCustomers.reduce((sum: number, c: any) => sum + (c.payout || 0), 0);

        // Add empty row and total row
        trialData.push(['', '', '', '']);
        trialData.push(['Total', formatCurrency(trialTotal), '', '']);

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
            columnStyles: {
                0: { cellWidth: 50 },
                1: { cellWidth: 40, halign: 'left' },
                2: { cellWidth: 40 },
                3: { cellWidth: 40 },
            },
            margin: { left: margin, right: margin },
            didParseCell: (data) => {
                // Bold the total row (last row)
                if (data.row.index === trialData.length - 1) {
                    data.cell.styles.fontStyle = 'bold';
                }
            },
        });

        yPos = (doc as any).lastAutoTable.finalY + 5;

        // Generate PDF as buffer
        const pdfBuffer = doc.output('arraybuffer');

        // Return PDF response
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
