import { config } from 'dotenv';
config({ path: '.env.local' });

import { db } from '../src/lib/db';
import { customerDB, mitraDB, invoiceDB, visitDB } from '../src/lib/schema';

const MONTHS: Record<string, string> = {
  Jan: '01', Feb: '02', Mar: '03', Apr: '04', May: '05', Jun: '06',
  Jul: '07', Aug: '08', Sep: '09', Oct: '10', Nov: '11', Dec: '12'
};

const toISO = (s: string): string | null => {
  const dateStr = s.trim().replace(/^[A-Za-z]{3},/, '').trim();
  const parts = dateStr.split('-');
  if (parts.length !== 3) return null;
  const [d, m, y] = parts;
  if (!MONTHS[m]) return null;
  return `${y}-${MONTHS[m]}-${d.padStart(2, '0')}`;
};

const CANCEL_KEYWORDS = ['OFF', 'SAKIT', 'IZIN', 'MANGKIR', 'BANJIR', 'LIBUR', 'CUSTOMER'];

// Returns { date, cancelled, reason } for each raw entry
const parseEntry = (raw: string): { date: string; cancelled: boolean; reason: string | null } | null => {
  if (!raw?.trim()) return null;
  const clean = raw.trim();
  const isCancelled = CANCEL_KEYWORDS.some(k => clean.toUpperCase().includes(k));

  if (isCancelled) {
    // Extract date portion (before or separate from reason text)
    const dateMatch = clean.match(/(\d{1,2}-[A-Za-z]+-\d{4})/);
    if (!dateMatch) return null;
    const date = toISO(dateMatch[1]);
    if (!date) return null;
    // Extract reason — everything after the date or on next line
    const reasonRaw = clean.replace(dateMatch[1], '').replace(/[\n\r]+/g, ' ').trim();
    const reason = reasonRaw || null;
    return { date, cancelled: true, reason };
  }

  const date = toISO(clean);
  if (!date) return null;
  return { date, cancelled: false, reason: null };
};

const DAY_NAMES: Record<number, string> = {
  0: 'Sunday', 1: 'Monday', 2: 'Tuesday', 3: 'Wednesday',
  4: 'Thursday', 5: 'Friday', 6: 'Saturday'
};
const getDayName = (d: string) => DAY_NAMES[new Date(d + 'T00:00:00').getDay()];

const ATTENDANCE: Array<{ invoiceNumber: string; customerName: string; mitraCode: string; visitDates: string[] }> = [
  { invoiceNumber: 'INV/Cleaning/2026.1.16-01512', customerName: 'Aom Chuthatuch via Altrix',          mitraCode: 'MITRA-202401-000028', visitDates: ['Thu,22-Jan-2026','Thu,29-Jan-2026','Thu,5-Feb-2026','Thu,12-Feb-2026'] },
  { invoiceNumber: 'INV/Cleaning/2026.2.17-01628', customerName: 'Aom Chuthatuch via Altrix',          mitraCode: 'MITRA-202401-000028', visitDates: ['Wed,18-Feb-2026','Wed,25-Feb-2026','Wed,4-Mar-2026','Wed,11-Mar-2026'] },
  { invoiceNumber: 'INV/Cleaning/2026.3.17-01731', customerName: 'Aom Chuthatuch via Altrix',          mitraCode: 'MITRA-202401-000028', visitDates: ['Wed,18-Mar-2026','Wed,25-Mar-2026','Wed,1-Apr-2026','Wed,8-Apr-2026','Wed,15-Apr-2026'] },
  { invoiceNumber: 'INV/Cleaning/2026.1.22-01540', customerName: 'Natsarin Wittayathaworn via Altrix', mitraCode: 'MITRA-202401-000028', visitDates: ['Thu,29-Jan-2026','Thu,5-Feb-2026','Thu,12-Feb-2026','Thu,19-Feb-2026'] },
  { invoiceNumber: 'INV/Cleaning/2026.2.20-01646', customerName: 'Natsarin Wittayathaworn via Altrix', mitraCode: 'MITRA-202401-000028', visitDates: ['Thu,26-Feb-2026','Thu,5-Mar-2026','Thu,12-Mar-2026','Thu,19-Mar-2026'] },
  { invoiceNumber: 'INV/Cleaning/2026.3.23-01734', customerName: 'Natsarin Wittayathaworn via Altrix', mitraCode: 'MITRA-202401-000028', visitDates: ['Thu,26-Mar-2026','Thu,2-Apr-2026','Thu,9-Apr-2026','Thu,16-Apr-2026'] },
  { invoiceNumber: 'INV/Cleaning/2025.12.31-01467', customerName: 'Kun Ronnie via Altrix',             mitraCode: 'MITRA-202304-000005', visitDates: ['Fri,2-Jan-2026','Tue,6-Jan-2026','Fri,9-Jan-2026','Tue,13-Jan-2026','Fri,16-Jan-2026','Tue,20-Jan-2026','Fri,23-Jan-2026','Tue,27-Jan-2026','Fri,30-Jan-2026'] },
  { invoiceNumber: 'INV/Cleaning/2026.1.30-01574', customerName: 'Kun Ronnie via Altrix',             mitraCode: 'MITRA-202304-000005', visitDates: ['Tue,3-Feb-2026','Fri,6-Feb-2026','Tue,10-Feb-2026','Fri,13-Feb-2026','Tue,17-Feb-2026','Fri,20-Feb-2026','Tue,24-Feb-2026','Fri,27-Feb-2026'] },
  { invoiceNumber: 'INV/Cleaning/2026.2.27-01676', customerName: 'Kun Ronnie via Altrix',             mitraCode: 'MITRA-202304-000005', visitDates: ['Tue,3-Mar-2026','Fri,6-Mar-2026','Tue,10-Mar-2026','Fri,13-Mar-2026','Tue,17-Mar-2026','Fri,20-Mar-2026','Tue,24-Mar-2026','Fri,27-Mar-2026','Tue,31-Mar-2026'] },
  { invoiceNumber: 'INV/Cleaning/2026.3.31-01765', customerName: 'Kun Ronnie via Altrix',             mitraCode: 'MITRA-202304-000005', visitDates: ['Fri,3-Apr-2026','Tue,7-Apr-2026','Fri,10-Apr-2026','Tue,14-Apr-2026','Fri,17-Apr-2026','Tue,21-Apr-2026','Fri,24-Apr-2026','Tue,28-Apr-2026'] },
  { invoiceNumber: 'INV/Cleaning/2026.1.19-01522', customerName: 'Yosuke Fukada',                     mitraCode: 'MITRA-2020509-000105', visitDates: ['Wed,21-Jan-2026','Fri,23-Jan-2026','Mon,26-Jan-2026','Wed,28-Jan-2026','Fri,30-Jan-2026','Mon,2-Feb-2026','Wed,4-Feb-2026','Fri,6-Feb-2026','Mon,9-Feb-2026','Wed,11-Feb-2026','Fri,13-Feb-2026'] },
  { invoiceNumber: 'INV/Cleaning/2026.2.19-01638', customerName: 'Yosuke Fukada',                     mitraCode: 'MITRA-2020509-000105', visitDates: ['Fri,20-Feb-2026','Mon,23-Feb-2026','Wed,25-Feb-2026','Fri,27-Feb-2026','Mon,2-Mar-2026','Wed,4-Mar-2026','Fri,6-Mar-2026','Mon,9-Mar-2026','Wed,11-Mar-2026','Fri,13-Mar-2026','Mon,16-Mar-2026'] },
  { invoiceNumber: 'INV/Cleaning/2026.4.8-01799',  customerName: 'Yosuke Fukada',                     mitraCode: 'MITRA-2020509-000105', visitDates: ['Fri,10-Apr-2026','Wed,15-Apr-2026','Fri,17-Apr-2026','Mon,20-Apr-2026','Wed,22-Apr-2026','Fri,24-Apr-2026','Mon,27-Apr-2026','Wed,29-Apr-2026','Fri,1-May-2026','Mon,4-May-2026'] },
  { invoiceNumber: 'INV/Cleaning/2026.2.7-01644',  customerName: 'Janina',                            mitraCode: 'MITRA-2020506-000095', visitDates: ['Sat,7-Feb-2026','Wed,11-Feb-2026','Sat,14-Feb-2026','Wed,18-Feb-2026','Sat,21-Feb-2026','Wed,25-Feb-2026','Sat,28-Feb-2026','Wed,4-Mar-2026'] },
  { invoiceNumber: 'INV/Cleaning/2026.3.6-01716',  customerName: 'Janina',                            mitraCode: 'MITRA-2020506-000095', visitDates: ['Wed,11-Mar-2026','Sat,14-Mar-2026','Wed,18-Mar-2026','Sat,28-Mar-2026','Wed,1-Apr-2026','Sat,4-Apr-2026','Wed,8-Apr-2026','Wed,22-Apr-2026'] },
  { invoiceNumber: 'INV/Cleaning/2026.1.22-01539', customerName: 'Masaru Kurokawa',                   mitraCode: 'MITRA-202210-000001',  visitDates: ['Fri,23-Jan-2026','Fri,30-Jan-2026','Fri,6-Feb-2026','Fri,13-Feb-2026','Fri,20-Feb-2026'] },
  { invoiceNumber: 'INV/Cleaning/2026.2.20-01647', customerName: 'Masaru Kurokawa',                   mitraCode: 'MITRA-202210-000001',  visitDates: ['Fri,27-Feb-2026','Fri,6-Mar-2026','Fri,13-Mar-2026','Fri,20-Mar-2026'] },
  { invoiceNumber: 'INV/Cleaning/2026.3.23-01737', customerName: 'Masaru Kurokawa',                   mitraCode: 'MITRA-202210-000001',  visitDates: ['Fri,27-Mar-2026','Fri,3-Apr-2026','Fri,10-Apr-2026','Fri,17-Apr-2026'] },
  { invoiceNumber: 'INV/Cleaning/2026.1.2-01475',  customerName: 'Risa Matsuoka',                     mitraCode: 'MITRA-202401-000028',  visitDates: ['Fri,2-Jan-2026','Mon,5-Jan-2026','Fri,9-Jan-2026','Mon,12-Jan-2026','Fri,16-Jan-2026','Mon,19-Jan-2026','Fri,23-Jan-2026','Mon,26-Jan-2026','Fri,30-Jan-2026'] },
  { invoiceNumber: 'INV/Cleaning/2026.1.31-01577', customerName: 'Risa Matsuoka',                     mitraCode: 'MITRA-202401-000028',  visitDates: ['Mon,2-Feb-2026','Fri,6-Feb-2026','Mon,9-Feb-2026','Fri,13-Feb-2026','Mon,16-Feb-2026','Fri,20-Feb-2026','Mon,23-Feb-2026','Fri,27-Feb-2026'] },
  { invoiceNumber: 'INV/Cleaning/2026.3.1-01683',  customerName: 'Risa Matsuoka',                     mitraCode: 'MITRA-202401-000028',  visitDates: ['Mon,2-Mar-2026','Fri,6-Mar-2026','Mon,9-Mar-2026','Fri,13-Mar-2026','Mon,16-Mar-2026','Fri,27-Mar-2026','Mon,30-Mar-2026','Fri,3-Apr-2026','Mon,6-Apr-2026'] },
  { invoiceNumber: 'INV/Cleaning/2026.4.6-01791',  customerName: 'Risa Matsuoka',                     mitraCode: 'MITRA-202401-000028',  visitDates: ['Fri,10-Apr-2026','Mon,13-Apr-2026','Fri,17-Apr-2026','Mon,20-Apr-2026','Fri,24-Apr-2026','Mon,27-Apr-2026','Fri,1-May-2026','Mon,4-May-2026'] },
  { invoiceNumber: 'INV/Cleaning/2026.1.24-01547', customerName: 'Monika',                            mitraCode: 'MITRA-202304-000005',  visitDates: ['Mon,26-Jan-2026','Thu,29-Jan-2026','Mon,2-Feb-2026','Thu,5-Feb-2026','Mon,9-Feb-2026','Thu,12-Feb-2026','Mon,16-Feb-2026','Thu,19-Feb-2026','Mon,23-Feb-2026'] },
  { invoiceNumber: 'INV/Cleaning/2026.2.24-01655', customerName: 'Monika',                            mitraCode: 'MITRA-202304-000005',  visitDates: ['Thu,26-Feb-2026','Mon,2-Mar-2026','Thu,5-Mar-2026','Mon,9-Mar-2026','Thu,12-Mar-2026','Mon,16-Mar-2026'] },
  { invoiceNumber: 'INV/Cleaning/2026.4.13-01805', customerName: 'Monika',                            mitraCode: 'MITRA-202304-000005',  visitDates: ['Thu,16-Apr-2026','Mon,20-Apr-2026','Thu,23-Apr-2026','Mon,27-Apr-2026','Thu,30-Apr-2026','Mon,4-May-2026','Thu,7-May-2026','Mon,11-May-2026'] },
  { invoiceNumber: 'INV/Cleaning/2026.1.20-01530', customerName: 'Wina',                              mitraCode: 'MITRA-202407-000047',  visitDates: ['Tue,3-Feb-2026','Mon,16-Feb-2026','Tue,24-Feb-2026','Tue,3-Mar-2026'] },
  { invoiceNumber: 'INV/Cleaning/2026.3.3-01694',  customerName: 'Wina',                              mitraCode: 'MITRA-202407-000047',  visitDates: ['Tue,10-Mar-2026','Tue,7-Apr-2026','Tue,14-Apr-2026','Tue,21-Apr-2026'] },
  { invoiceNumber: 'INV/Cleaning/2026.1.30-01570', customerName: 'Minarti Prahara',                   mitraCode: 'MITRA-202403-000034',  visitDates: ['Mon,2-Feb-2026','Wed,4-Feb-2026','Fri,6-Feb-2026','Mon,9-Feb-2026','Wed,11-Feb-2026','Fri,13-Feb-2026','Mon,16-Feb-2026','Wed,18-Feb-2026','Fri,20-Feb-2026','Mon,23-Feb-2026','Wed,25-Feb-2026'] },
  { invoiceNumber: 'INV/Cleaning/2026.2.27-01674', customerName: 'Minarti Prahara',                   mitraCode: 'MITRA-202403-000034',  visitDates: ['Mon,2-Mar-2026','Wed,4-Mar-2026','Fri,6-Mar-2026','Mon,9-Mar-2026','Fri,13-Mar-2026','Mon,16-Mar-2026','Wed,18-Mar-2026','Wed,25-Mar-2026'] },
  { invoiceNumber: 'INV/Cleaning/2026.4.7-01796',  customerName: 'Minarti Prahara',                   mitraCode: 'MITRA-202403-000034',  visitDates: ['Wed,8-Apr-2026','Fri,10-Apr-2026','Mon,13-Apr-2026','Wed,15-Apr-2026','Fri,17-Apr-2026','Mon,20-Apr-2026','Wed,22-Apr-2026','Fri,24-Apr-2026','Mon,27-Apr-2026','Wed,29-Apr-2026','Fri,1-May-2026'] },
  { invoiceNumber: 'INV/Cleaning/2026.1.16-01510', customerName: 'Yanuar',                            mitraCode: 'MITRA-2020504-000085', visitDates: ['Tue,20-Jan-2026','Fri,23-Jan-2026','Tue,27-Jan-2026','Fri,30-Jan-2026','Tue,3-Feb-2026','Fri,6-Feb-2026','Tue,10-Feb-2026','Fri,13-Feb-2026'] },
  { invoiceNumber: 'INV/Cleaning/2026.2.16-01624', customerName: 'Yanuar',                            mitraCode: 'MITRA-2020504-000085', visitDates: ['Fri,20-Feb-2026','Tue,24-Feb-2026','Fri,27-Feb-2026','Tue,3-Mar-2026','Fri,6-Mar-2026','Tue,10-Mar-2026','Fri,13-Mar-2026','Tue,17-Mar-2026'] },
  { invoiceNumber: 'INV/Cleaning/2026.3.26-01741', customerName: 'Yanuar',                            mitraCode: 'MITRA-2020504-000085', visitDates: ['Fri,27-Mar-2026','Tue,31-Mar-2026','Fri,3-Apr-2026','Tue,7-Apr-2026','Fri,10-Apr-2026','Tue,14-Apr-2026','Fri,17-Apr-2026','Tue,21-Apr-2026','Fri,24-Apr-2026'] },
  { invoiceNumber: 'INV/Cleaning/2026.3.30-01755', customerName: 'Gabrielle Andhita',                 mitraCode: 'MITRA-202407-000047',  visitDates: ['Tue,31-Mar-2026','Fri,10-Apr-2026','Fri,17-Apr-2026','Fri,24-Apr-2026','Fri,1-May-2026'] },
  { invoiceNumber: 'INV/Cleaning/2026.1.24-01549', customerName: 'A. Prasetyo Pamungkas',             mitraCode: 'MITRA-2020509-000106', visitDates: ['Thu,29-Jan-2026','Mon,2-Feb-2026','Thu,5-Feb-2026','Mon,9-Feb-2026','Thu,12-Feb-2026','Mon,16-Feb-2026','Thu,19-Feb-2026','Mon,23-Feb-2026','Thu,26-Feb-2026'] },
  { invoiceNumber: 'INV/Cleaning/2026.2.26-01662', customerName: 'A. Prasetyo Pamungkas',             mitraCode: 'MITRA-2020509-000106', visitDates: ['Mon,2-Mar-2026','Thu,5-Mar-2026','Mon,9-Mar-2026','Thu,12-Mar-2026','Mon,16-Mar-2026','Thu,26-Mar-2026','Mon,30-Mar-2026','Thu,2-Apr-2026'] },
  { invoiceNumber: 'INV/Cleaning/2026.4.2-01770',  customerName: 'A. Prasetyo Pamungkas',             mitraCode: 'MITRA-2020509-000106', visitDates: ['Mon,6-Apr-2026','Thu,9-Apr-2026','Mon,13-Apr-2026','Thu,16-Apr-2026','Mon,20-Apr-2026','Thu,23-Apr-2026','Mon,27-Apr-2026','Thu,30-Apr-2026'] },
  { invoiceNumber: 'INV/Cleaning/2026.1.10-01494', customerName: 'Shinta',                            mitraCode: 'MITRA-2020505-000086', visitDates: ['Fri,16-Jan-2026','Tue,20-Jan-2026','Fri,23-Jan-2026','Fri,30-Jan-2026','Tue,3-Feb-2026','Thu,5-Feb-2026','Fri,6-Feb-2026','Tue,10-Feb-2026','Fri,13-Feb-2026'] },
  { invoiceNumber: 'INV/Cleaning/2026.2.18-01635', customerName: 'Shinta',                            mitraCode: 'MITRA-2020505-000086', visitDates: ['Fri,20-Feb-2026','Fri,27-Feb-2026','Tue,3-Mar-2026','Fri,6-Mar-2026','Tue,10-Mar-2026','Fri,13-Mar-2026','Tue,31-Mar-2026','Fri,3-Apr-2026'] },
  { invoiceNumber: 'INV/Cleaning/2026.4.3-01777',  customerName: 'Shinta',                            mitraCode: 'MITRA-2020505-000086', visitDates: ['Fri,10-Apr-2026','Tue,14-Apr-2026','Fri,17-Apr-2026','Tue,21-Apr-2026','Fri,24-Apr-2026','Tue,28-Apr-2026','Fri,1-May-2026','Tue,5-May-2026'] },
];

async function main() {
  console.log('=== Staging ETL: Visits ===\n');

  const customers = await db.select({ id: customerDB.id, name: customerDB.customerName }).from(customerDB);
  const custMap = new Map(customers.map(c => [c.name, c.id]));

  const mitras = await db.select({ id: mitraDB.id, code: mitraDB.mitraCode }).from(mitraDB);
  const mitraMap = new Map(mitras.map(m => [m.code, m.id]));

  const invoices = await db.select({ id: invoiceDB.id, invoiceNumber: invoiceDB.invoiceNumber }).from(invoiceDB);
  const invoiceMap = new Map(invoices.map(i => [i.invoiceNumber, i.id]));

  const existingVisits = await db.select({ invoiceId: visitDB.invoiceId }).from(visitDB);
  const invoicesWithVisits = new Set(existingVisits.map(v => v.invoiceId).filter(Boolean));
  console.log(`Invoices already with visits: ${invoicesWithVisits.size}\n`);

  let totalInserted = 0;
  let totalSkipped = 0;
  let errors = 0;

  for (const entry of ATTENDANCE) {
    const invoiceId = invoiceMap.get(entry.invoiceNumber);
    if (!invoiceId) {
      console.log(`  ERROR (invoice not found): ${entry.invoiceNumber}`);
      errors++;
      continue;
    }

    if (invoicesWithVisits.has(invoiceId)) {
      console.log(`  SKIP (visits exist): ${entry.invoiceNumber}`);
      totalSkipped++;
      continue;
    }

    const customerId = custMap.get(entry.customerName);
    const mitraId = mitraMap.get(entry.mitraCode);

    if (!customerId) { console.log(`  ERROR (customer not found): ${entry.customerName}`); errors++; continue; }
    if (!mitraId)    { console.log(`  ERROR (mitra not found): ${entry.mitraCode}`);       errors++; continue; }

    let visitNumber = 1;
    let inserted = 0;

    for (const raw of entry.visitDates) {
      const parsed = parseEntry(raw);
      if (!parsed) continue;

      await db.insert(visitDB).values({
        customerId,
        invoiceId,
        mitraId,
        originalMitraId: mitraId,
        actualMitraId: mitraId,
        visitNumber,
        scheduledDate: parsed.date,
        scheduledDay: getDayName(parsed.date),
        status: parsed.cancelled ? 'Cancelled' : 'Done',
        durationHours: 3,
        visitNotes: parsed.reason,
      });
      visitNumber++;
      inserted++;
    }

    console.log(`  INSERTED: ${entry.invoiceNumber} [${entry.customerName}] — ${inserted} visits`);
    totalInserted += inserted;
  }

  console.log(`\n=== Done ===`);
  console.log(`Total visits inserted: ${totalInserted}, Skipped: ${totalSkipped}, Errors: ${errors}`);

  const finalCount = await db.select({ id: visitDB.id }).from(visitDB);
  console.log(`Total visits in DB: ${finalCount.length}`);
  process.exit(0);
}

main().catch(err => { console.error(err); process.exit(1); });
