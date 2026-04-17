import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { invoiceDB, customerDB } from '@/lib/schema';
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
    address2: 'Jl. Jend. Sudirman Kav 52-53, Jakarta Selatan',
};

const BANK_INFO = {
    line1: 'Pembayaran dapat dilakukan melalui transfer ke:',
    line2: 'Bank Central Asia (BCA)',
    line3: 'PT. Homa Mitra Andalan',
    line4: 'No Rek: 035-317-8901',
};

const TERMS: string[] = [
    'Jasa yang termasuk terbatas terhadap jasa kegiatan kebersihan tempat tinggal, Mitra HOMA berhak menolak kegiatan yang tidak berhubungan dengan kegiatan kebersihan tempat tinggal (cth: pertukangan, kegiatan pijat, asistensi kesehatan, dll). HOMA tidak bertanggung jawab atas berbagai risiko atau dampak yang timbul akibat kegiatan yang tidak berhubungan dengan kegiatan jasa yang ditawarkan.',
    'Periode jadwal yang diberikan HOMA merupakan estimasi kedatangan Mitra HOMA, mohon untuk menunggu di sekitaran waktu yang sudah dipilih.',
    'Pelanggan diharapkan untuk menyimpan berbagai barang berharga dan melakukan pengecekan kembali setelah Mitra selesai melaksanakan pekerjaannya. HOMA tidak bertanggung jawab atas kehilangan barang berharga tanpa bukti pendukung yang kuat.',
    'Penggantian barang rusak dan hilang harus didukung dengan bukti yang kuat. HOMA akan melakukan penggantian dengan bentuk nominal uang sampai dengan Rp 400,000.00 yang akan dilakukan maksimal 14 hari kerja dari klaim kehilangan/kerusakan disetujui oleh pihak HOMA.',
    'Dalam rangka terjadi tindakan seperti namun tidak terbatas kepada kekerasan, perbuatan asusila/pelecehan, dan tindakan kriminal lainnya kepada Mitra HOMA oleh Pelanggan, maka HOMA berhak untuk memutuskan layanan kepada pelanggan tanpa melakukan pengembalian dana dalam bentuk apapun dan dapat membawa ke dalam jalur hukum jika diperlukan.',
    'Jika Pelanggan tidak melakukan pembayaran sesuai tenggat waktu yang tercantum, maka kegiatan jasa dapat ditunda.',
    'Dalam rangka Pelanggan melanjutkan masa berlangganan, maka Pelanggan setuju untuk melakukan langganan tanpa jeda di tanggal mulai untuk bulan berikutnya. HOMA dapat memberikan pengecualian jeda berlangganan, apabila Pelanggan memiliki keperluan untuk berpergian/cuti yang membuat jadwal kunjungan menjadi terlompat lebih dari 1 kali kunjungan.',
    'Jika terdapat sesi pekerjaan yang tidak dijalani oleh Mitra HOMA karena satu dan lain halnya, maka HOMA akan membantu untuk menjadwalkan jadwal pengganti untuk sesi tersebut. Jika pelanggan beberapa kali memiliki halangan dan mengakibatkan mundurnya tanggal akhir berlangganan, maka HOMA akan memberikan 14 hari masa tambahan untuk penyelesaian sesi kerja, dan jika melewati masa tersebut maka masa berlangganan akan berakhir.',
    'Dalam rangka pelanggan tidak menghubungi Customer Service HOMA (Whatsapp 0813-8090-8884) jika memiliki halangan jadwal dan Mitra HOMA telah tiba di lokasi pelanggan, maka sesi kegiatan jasa akan dihitung.',
    'Jalur komunikasi resmi antara pelanggan dan HOMA adalah melalui Customer Service HOMA (Whatsapp 0813-8090-8884). Komunikasi di luar jalur tersebut merupakan komunikasi yang tidak resmi dan tidak dapat dipertanggungjawabkan.',
    'Dengan melakukan pembayaran terhadap invoice ini, pelanggan dianggap setuju dengan syarat dan ketentuan (terms & conditions) yang tertera.',
];

function formatDate(dateValue: string | Date | null | undefined): string {
    if (!dateValue) return '-';
    const date = new Date(dateValue as string);
    if (isNaN(date.getTime())) return '-';
    const day = date.getUTCDate();
    const month = date.toLocaleDateString('en-US', { month: 'short', timeZone: 'UTC' });
    const year = date.getUTCFullYear();
    return `${day}-${month}-${year}`;
}

function formatCurrency(amount: number | string | null | undefined): string {
    const num = Math.round(Number(amount) || 0);
    return `Rp ${num.toLocaleString('id-ID')}`;
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

        const result = await db
            .select({
                id: invoiceDB.id,
                invoiceNumber: invoiceDB.invoiceNumber,
                invoiceDate: invoiceDB.invoiceDate,
                dueDate: invoiceDB.dueDate,
                invoiceStartDate: invoiceDB.invoiceStartDate,
                invoiceSubscription: invoiceDB.invoiceSubscription,
                invoiceCustomerName: invoiceDB.invoiceCustomerName,
                invoiceAddress: invoiceDB.invoiceAddress,
                invoicePhoneNumber: invoiceDB.invoicePhoneNumber,
                invoiceQty: invoiceDB.invoiceQty,
                invoicePricePerQty: invoiceDB.invoicePricePerQty,
                invoicePromoCode: invoiceDB.invoicePromoCode,
                invoicePromoDiscount: invoiceDB.invoicePromoDiscount,
                subtotal: invoiceDB.subtotal,
                totalAmount: invoiceDB.totalAmount,
                // Fallback fields from customerDB for legacy invoices with missing data
                customerMonthlyFee: customerDB.monthlyFee,
                customerSubscriptionPackage: customerDB.subscriptionPackage,
            })
            .from(invoiceDB)
            .leftJoin(customerDB, eq(invoiceDB.customerId, customerDB.id))
            .where(eq(invoiceDB.id, id))
            .limit(1);

        if (result.length === 0) {
            return NextResponse.json(
                { success: false, message: 'Invoice not found' },
                { status: 404 }
            );
        }

        const invoice = result[0];

        // ============ BUILD PDF ============
        const doc = new jsPDF({
            orientation: 'portrait',
            unit: 'mm',
            format: 'a4',
        });

        const pageWidth = doc.internal.pageSize.getWidth();
        const margin = 15;
        let yPos = 15;

        // --- HEADER ---
        // Left: logo + HOMA
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
        doc.setFontSize(18);
        doc.setTextColor(30, 58, 138);
        doc.text('HOMA', margin + 23, yPos + 4);

        // Center: company info
        doc.setFont('helvetica', 'bold');
        doc.setFontSize(9);
        doc.setTextColor(0, 0, 0);
        doc.text(COMPANY_INFO.name, pageWidth / 2, yPos, { align: 'center' });

        doc.setFont('helvetica', 'normal');
        doc.setFontSize(8);
        doc.setTextColor(80, 80, 80);
        doc.text(COMPANY_INFO.address1, pageWidth / 2, yPos + 5, { align: 'center' });
        doc.text(COMPANY_INFO.address2, pageWidth / 2, yPos + 10, { align: 'center' });

        // Right: INVOICE label
        doc.setFont('helvetica', 'bold');
        doc.setFontSize(22);
        doc.setTextColor(30, 58, 138);
        doc.text('INVOICE', pageWidth - margin, yPos + 5, { align: 'right' });

        yPos += 22;

        // Customer service line centered
        doc.setFont('helvetica', 'normal');
        doc.setFontSize(8);
        doc.setTextColor(80, 80, 80);
        doc.text('Customer Service: +62 813-8090-8884 (whatsapp only)', pageWidth / 2, yPos, { align: 'center' });

        yPos += 6;

        // --- DIVIDER ---
        doc.setDrawColor(180, 180, 180);
        doc.setLineWidth(0.5);
        doc.line(margin, yPos, pageWidth - margin, yPos);
        yPos += 8;

        // --- BILL TO (left) + INVOICE META (right) ---
        const leftColX = margin;
        const rightColX = pageWidth / 2 + 10;
        const labelWidth = 28;
        const valueX = rightColX + labelWidth;

        // BILL TO heading
        doc.setFont('helvetica', 'bold');
        doc.setFontSize(9);
        doc.setTextColor(0, 0, 0);
        doc.text('BILL TO', leftColX, yPos);

        // Invoice meta on the right
        // For legacy invoices with no dueDate, fallback to invoiceDate + 2 days
        const dueDateValue = invoice.dueDate ?? (() => {
            if (!invoice.invoiceDate) return null;
            const d = new Date(invoice.invoiceDate as string | Date);
            d.setDate(d.getDate() + 2);
            return d;
        })();

        const metaItems: { label: string; value: string }[] = [
            { label: 'Invoice No:', value: invoice.invoiceNumber || '-' },
            { label: 'Invoice Date:', value: formatDate(invoice.invoiceDate as string | Date | null) },
            { label: 'Due Date:', value: formatDate(dueDateValue as string | Date | null) },
            { label: 'Start Period:', value: formatDate(invoice.invoiceStartDate) },
            { label: 'End Period:', value: (() => {
                if (!invoice.invoiceStartDate) return '-';
                const s = new Date(invoice.invoiceStartDate as string);
                const lastDayNextMonth = new Date(s.getFullYear(), s.getMonth() + 2, 0).getDate();
                const clampedDay = Math.min(s.getDate(), lastDayNextMonth);
                return formatDate(new Date(s.getFullYear(), s.getMonth() + 1, clampedDay));
            })() },
        ];

        const metaStartY = yPos;
        metaItems.forEach((item, index) => {
            const rowY = metaStartY + index * 6;
            doc.setFont('helvetica', 'bold');
            doc.setFontSize(8);
            doc.setTextColor(80, 80, 80);
            doc.text(item.label, rightColX, rowY);
            doc.setFont('helvetica', 'normal');
            doc.setTextColor(0, 0, 0);
            doc.text(item.value, valueX, rowY);
        });

        // BILL TO content
        yPos += 6;
        doc.setFont('helvetica', 'normal');
        doc.setFontSize(9);
        doc.setTextColor(0, 0, 0);
        doc.text(invoice.invoiceCustomerName || '-', leftColX, yPos);
        yPos += 5;

        // Address may be long — split it
        const addressLines = doc.splitTextToSize(invoice.invoiceAddress || '-', pageWidth / 2 - margin - 5);
        doc.text(addressLines, leftColX, yPos);
        yPos += addressLines.length * 5;

        doc.text(invoice.invoicePhoneNumber || '-', leftColX, yPos);

        // Ensure yPos is below both columns
        const metaEndY = metaStartY + metaItems.length * 6 + 4;
        yPos = Math.max(yPos + 8, metaEndY);

        // --- DIVIDER ---
        doc.setDrawColor(180, 180, 180);
        doc.setLineWidth(0.5);
        doc.line(margin, yPos, pageWidth - margin, yPos);
        yPos += 8;

        // --- DESCRIPTION TABLE ---
        // Fallback to customerDB values for legacy invoices that were saved with missing data
        const pricePerQty = Number(invoice.invoicePricePerQty) || Number(invoice.customerMonthlyFee) || 0;
        const promoDiscount = Number(invoice.invoicePromoDiscount) || 0;
        const subtotal = pricePerQty * (invoice.invoiceQty ?? 1);
        const totalAmount = subtotal - promoDiscount;
        // Build description: prefer stored invoiceSubscription, fallback to customerSubscriptionPackage
        // Avoid double-prefixing if the value already starts with "Monthly Subscription"
        const rawDescription = (invoice.invoiceSubscription && invoice.invoiceSubscription !== 'Cleaning')
            ? invoice.invoiceSubscription
            : (invoice.customerSubscriptionPackage || invoice.invoiceSubscription || 'Cleaning');
        const PREFIX = 'Monthly Subscription of ';
        const subscriptionDescription = rawDescription.startsWith(PREFIX)
            ? rawDescription
            : `${PREFIX}${rawDescription}`;

        const tableHeaders = [['DESCRIPTION', 'QTY', 'UNIT PRICE', 'TOTAL']];
        const tableData = [[
            subscriptionDescription,
            String(invoice.invoiceQty ?? 1),
            formatCurrency(pricePerQty),
            formatCurrency(subtotal),
        ]];

        autoTable(doc, {
            head: tableHeaders,
            body: tableData,
            startY: yPos,
            theme: 'plain',
            styles: {
                fontSize: 9,
                cellPadding: 3,
                lineColor: [180, 180, 180],
                lineWidth: 0.1,
            },
            headStyles: {
                fillColor: [240, 240, 240],
                textColor: [0, 0, 0],
                fontStyle: 'bold',
                lineColor: [180, 180, 180],
                lineWidth: 0.3,
            },
            columnStyles: {
                0: { cellWidth: 86, overflow: 'linebreak' },
                1: { cellWidth: 18, halign: 'center' },
                2: { cellWidth: 38, halign: 'right' },
                3: { cellWidth: 38, halign: 'right' },
            },
            margin: { left: margin, right: margin },
        });

        yPos = (doc as any).lastAutoTable.finalY + 8;

        // --- TOTALS + PAYMENT INFO side by side ---
        const paymentX = margin;
        const totalsX = pageWidth / 2 + 5;
        const totalsLabelW = 30;
        const totalsValueX = totalsX + totalsLabelW;

        const totalsStartY = yPos;

        // Payment info (left)
        doc.setFont('helvetica', 'bold');
        doc.setFontSize(9);
        doc.setTextColor(0, 0, 0);
        doc.text('Informasi Pembayaran', paymentX, yPos);
        yPos += 6;

        doc.setFont('helvetica', 'normal');
        doc.setFontSize(8.5);
        doc.setTextColor(60, 60, 60);
        doc.text(BANK_INFO.line1, paymentX, yPos);
        yPos += 5;
        doc.setFont('helvetica', 'bold');
        doc.setTextColor(0, 0, 0);
        doc.text(BANK_INFO.line2, paymentX, yPos);
        yPos += 5;
        doc.setFont('helvetica', 'normal');
        doc.text(BANK_INFO.line3, paymentX, yPos);
        yPos += 5;
        doc.setFont('helvetica', 'bold');
        doc.text(BANK_INFO.line4, paymentX, yPos);

        // Totals section (right) — rendered from totalsStartY
        let totalsY = totalsStartY;

        const renderTotalsRow = (label: string, value: string, bold = false) => {
            doc.setFont('helvetica', bold ? 'bold' : 'normal');
            doc.setFontSize(9);
            doc.setTextColor(80, 80, 80);
            doc.text(label, totalsX, totalsY);
            doc.setTextColor(0, 0, 0);
            doc.text(value, totalsValueX + 25, totalsY, { align: 'right' });
            totalsY += 6;
        };

        renderTotalsRow('SUBTOTAL', formatCurrency(subtotal));

        const hasPromoCode = invoice.invoicePromoCode && invoice.invoicePromoCode.trim() !== '';
        const hasPromoDiscount = promoDiscount > 0;

        if (hasPromoCode) {
            renderTotalsRow('PROMO CODE', invoice.invoicePromoCode as string);
        }

        if (hasPromoDiscount) {
            renderTotalsRow('PROMOTION', `-${formatCurrency(promoDiscount)}`);
        }

        // Divider above total
        doc.setDrawColor(180, 180, 180);
        doc.setLineWidth(0.3);
        doc.line(totalsX, totalsY, pageWidth - margin, totalsY);
        totalsY += 3;

        renderTotalsRow('TOTAL', formatCurrency(subtotal - promoDiscount), true);

        yPos = Math.max(yPos + 8, totalsY + 4);

        // --- TERMS & CONDITIONS ---
        doc.setDrawColor(180, 180, 180);
        doc.setLineWidth(0.5);
        doc.line(margin, yPos, pageWidth - margin, yPos);
        yPos += 7;

        doc.setFont('helvetica', 'bold');
        doc.setFontSize(10);
        doc.setTextColor(0, 0, 0);
        doc.text('Terms & Conditions', margin, yPos);
        yPos += 6;

        doc.setFont('helvetica', 'normal');
        doc.setFontSize(6.5);
        doc.setTextColor(50, 50, 50);

        const usableWidth = pageWidth - margin * 2;
        const lineHeight = 3.8;
        const termSpacing = 1.5;

        TERMS.forEach((term, index) => {
            const bullet = `${index + 1}. `;
            const indentX = margin + 5;
            const textWidth = usableWidth - 5;

            const lines = doc.splitTextToSize(term, textWidth);

            doc.setFont('helvetica', 'bold');
            doc.text(bullet, margin, yPos);
            doc.setFont('helvetica', 'normal');
            lines.forEach((line: string, lineIndex: number) => {
                doc.text(line, indentX, yPos + lineIndex * lineHeight);
            });
            yPos += lines.length * lineHeight + termSpacing;
        });

        // ============ OUTPUT PDF ============
        const pdfBuffer = doc.output('arraybuffer');
        const safeFilename = (invoice.invoiceNumber || id).replace(/\//g, '-');

        return new NextResponse(pdfBuffer, {
            status: 200,
            headers: {
                'Content-Type': 'application/pdf',
                'Content-Disposition': `attachment; filename="invoice-${safeFilename}.pdf"`,
            },
        });

    } catch (error) {
        console.error('Error generating invoice PDF:', error);
        return NextResponse.json(
            { success: false, message: 'Failed to generate PDF' },
            { status: 500 }
        );
    }
}
