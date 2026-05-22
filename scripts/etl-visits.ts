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

const parseEntry = (raw: string): { date: string; cancelled: boolean; reason: string | null } | null => {
  if (!raw?.trim()) return null;
  const clean = raw.trim();
  const isCancelled = CANCEL_KEYWORDS.some(k => clean.toUpperCase().includes(k));

  if (isCancelled) {
    const dateMatch = clean.match(/(\d{1,2}-[A-Za-z]+-\d{4})/);
    if (!dateMatch) return null;
    const date = toISO(dateMatch[1]);
    if (!date) return null;
    const reasonRaw = clean.replace(dateMatch[1], '').replace(/[\n\r]+/g, ' ').trim();
    return { date, cancelled: true, reason: reasonRaw || null };
  }

  const date = toISO(clean);
  if (!date) return null;
  return { date, cancelled: false, reason: null };
};

const DAY_NAMES: Record<number, string> = {
  0: 'Sunday', 1: 'Monday', 2: 'Tuesday', 3: 'Wednesday',
  4: 'Thursday', 5: 'Friday', 6: 'Saturday'
};

const getDayName = (dateStr: string): string => {
  const d = new Date(dateStr + 'T00:00:00');
  return DAY_NAMES[d.getDay()];
};

// Parse backup mitra from "Nama Mitra (MITRA-xxx)" format → extract mitra code
const parseBackupMitraCode = (raw: string): string | null => {
  if (!raw?.trim()) return null;
  const match = raw.trim().match(/\(([^)]+)\)/);
  return match ? match[1].trim() : null;
};

// Each entry: invoiceNumber → { customerName, mitraCode, visitDates[], backupMitras[] }
// backupMitras index is 1-to-1 with visitDates. Empty string = use default mitraCode.
// CSV columns: visit_1..visit_31, backup_mitra_1..backup_mitra_31
const ATTENDANCE: Array<{
  invoiceNumber: string;
  customerName: string;
  mitraCode: string;
  visitDates: string[];
  backupMitras?: string[]; // optional, same length as visitDates
}> = [
  // INV/Cleaning/2025.12.31-01467 — Kun Ronnie via Altrix — Suminten
  { invoiceNumber: 'INV/Cleaning/2025.12.31-01467', customerName: 'Kun Ronnie via Altrix', mitraCode: 'MITRA-202304-000005', visitDates: ['Fri,2-Jan-2026','Tue,6-Jan-2026','Fri,9-Jan-2026','Tue,13-Jan-2026','Fri,16-Jan-2026','Tue,20-Jan-2026','Fri,23-Jan-2026','Tue,27-Jan-2026','Fri,30-Jan-2026'] },
  // INV/Cleaning/2026.1.2-01475 — Risa Matsuoka — Siti Asih
  { invoiceNumber: 'INV/Cleaning/2026.1.2-01475', customerName: 'Risa Matsuoka', mitraCode: 'MITRA-202401-000028', visitDates: ['Fri,2-Jan-2026','Mon,5-Jan-2026','Fri,9-Jan-2026','Mon,12-Jan-2026','Fri,16-Jan-2026','Mon,19-Jan-2026','Fri,23-Jan-2026','Mon,26-Jan-2026','Fri,30-Jan-2026'] },
  // INV/Cleaning/2026.1.5-01482 — Lesti M — Parsini
  { invoiceNumber: 'INV/Cleaning/2026.1.5-01482', customerName: 'Lesti M', mitraCode: 'MITRA-202212-000002', visitDates: ['Thu,8-Jan-2026','Mon,12-Jan-2026','Thu,15-Jan-2026','Mon,19-Jan-2026','Thu,22-Jan-2026','Mon,26-Jan-2026','Thu,29-Jan-2026','Mon,2-Feb-2026','Thu,5-Feb-2026'] },
  // INV/Cleaning/2026.1.8-01489 — Petrajaya Wiratama — Naini
  { invoiceNumber: 'INV/Cleaning/2026.1.8-01489', customerName: 'Petrajaya Wiratama', mitraCode: 'MITRA-2020501-000065', visitDates: ['Tue,13-Jan-2026','Thu,15-Jan-2026','Tue,20-Jan-2026','Thu,22-Jan-2026','Tue,27-Jan-2026','29-Jan-2026\nNAINI IZIN','Tue,3-Feb-2026','Thu,5-Feb-2026','Tue,10-Feb-2026'] },
  // INV/Cleaning/2026.1.10-01494 — Shinta — Atika
  { invoiceNumber: 'INV/Cleaning/2026.1.10-01494', customerName: 'Shinta', mitraCode: 'MITRA-2020505-000086', visitDates: ['13-Jan-2026\nCUSTOMER OFF','Fri,16-Jan-2026','Tue,20-Jan-2026','Fri,23-Jan-2026','27-Jan-2026\nCUSTOMER OFF','Fri,30-Jan-2026','Tue,3-Feb-2026','Thu,5-Feb-2026','Fri,6-Feb-2026','Tue,10-Feb-2026','Fri,13-Feb-2026'] },
  // INV/Cleaning/2026.1.16-01510 — Yanuar — Sunarsih
  { invoiceNumber: 'INV/Cleaning/2026.1.16-01510', customerName: 'Yanuar', mitraCode: 'MITRA-2020504-000085', visitDates: ['Tue,20-Jan-2026','Fri,23-Jan-2026','Tue,27-Jan-2026','Fri,30-Jan-2026','Tue,3-Feb-2026','Fri,6-Feb-2026','Tue,10-Feb-2026','Fri,13-Feb-2026'] },
  // INV/Cleaning/2026.1.16-01512 — Aom — Siti Asih
  { invoiceNumber: 'INV/Cleaning/2026.1.16-01512', customerName: 'Aom Chuthatuch via Altrix', mitraCode: 'MITRA-202401-000028', visitDates: ['Thu,22-Jan-2026','Thu,29-Jan-2026','Thu,5-Feb-2026','Thu,12-Feb-2026'] },
  // INV/Cleaning/2026.1.19-01522 — Yosuke Fukada — Rina Triana
  { invoiceNumber: 'INV/Cleaning/2026.1.19-01522', customerName: 'Yosuke Fukada', mitraCode: 'MITRA-2020509-000105', visitDates: ['Wed,21-Jan-2026','Fri,23-Jan-2026','Mon,26-Jan-2026','Wed,28-Jan-2026','Fri,30-Jan-2026','Mon,2-Feb-2026','Wed,4-Feb-2026','Fri,6-Feb-2026','Mon,9-Feb-2026','Wed,11-Feb-2026','Fri,13-Feb-2026','Mon,16-Feb-2026','Wed,18-Feb-2026'] },
  // INV/Cleaning/2026.1.20-01530 — Wina — Marciane
  { invoiceNumber: 'INV/Cleaning/2026.1.20-01530', customerName: 'Wina', mitraCode: 'MITRA-202407-000047', visitDates: ['27-Jan-2026\nCUSTOMER OFF','Tue,3-Feb-2026','10-Feb-2026\nCUSTOMER OFF','Mon,16-Feb-2026','Tue,24-Feb-2026','Tue,3-Mar-2026'] },
  // INV/Cleaning/2026.1.22-01539 — Masaru Kurokawa — Sulastri
  { invoiceNumber: 'INV/Cleaning/2026.1.22-01539', customerName: 'Masaru Kurokawa', mitraCode: 'MITRA-202210-000001', visitDates: ['Fri,23-Jan-2026','Fri,30-Jan-2026','Fri,6-Feb-2026','Fri,13-Feb-2026','Fri,20-Feb-2026'] },
  // INV/Cleaning/2026.1.22-01540 — Natsarin — Siti Asih
  { invoiceNumber: 'INV/Cleaning/2026.1.22-01540', customerName: 'Natsarin Wittayathaworn via Altrix', mitraCode: 'MITRA-202401-000028', visitDates: ['Thu,29-Jan-2026','Thu,5-Feb-2026','Thu,12-Feb-2026','Thu,19-Feb-2026'] },
  // INV/Cleaning/2026.1.24-01547 — Monika — Suminten
  { invoiceNumber: 'INV/Cleaning/2026.1.24-01547', customerName: 'Monika', mitraCode: 'MITRA-202304-000005', visitDates: ['Mon,26-Jan-2026','Thu,29-Jan-2026','Mon,2-Feb-2026','Thu,5-Feb-2026','Mon,9-Feb-2026','Thu,12-Feb-2026','Mon,16-Feb-2026','Thu,19-Feb-2026','Mon,23-Feb-2026'] },
  // INV/Cleaning/2026.1.24-01549 — A. Prasetyo — Annarul
  { invoiceNumber: 'INV/Cleaning/2026.1.24-01549', customerName: 'A. Prasetyo Pamungkas', mitraCode: 'MITRA-2020509-000106', visitDates: ['26-Jan-2026\nANNARUL BANJIR','Thu,29-Jan-2026','Mon,2-Feb-2026','Thu,5-Feb-2026','Mon,9-Feb-2026','Thu,12-Feb-2026','Mon,16-Feb-2026','Thu,19-Feb-2026','Mon,23-Feb-2026','Thu,26-Feb-2026'] },
  // INV/Cleaning/2026.1.30-01570 — Minarti — Ria Junaeni
  { invoiceNumber: 'INV/Cleaning/2026.1.30-01570', customerName: 'Minarti Prahara', mitraCode: 'MITRA-202403-000034', visitDates: ['Mon,2-Feb-2026','Wed,4-Feb-2026','Fri,6-Feb-2026','Mon,9-Feb-2026','Wed,11-Feb-2026','Fri,13-Feb-2026','Mon,16-Feb-2026','Wed,18-Feb-2026','Fri,20-Feb-2026','Mon,23-Feb-2026','Wed,25-Feb-2026','Fri,27-Feb-2026'] },
  // INV/Cleaning/2026.1.30-01574 — Kun Ronnie — Suminten
  { invoiceNumber: 'INV/Cleaning/2026.1.30-01574', customerName: 'Kun Ronnie via Altrix', mitraCode: 'MITRA-202304-000005', visitDates: ['Tue,3-Feb-2026','Fri,6-Feb-2026','Tue,10-Feb-2026','Fri,13-Feb-2026','Tue,17-Feb-2026','Fri,20-Feb-2026','Tue,24-Feb-2026','Fri,27-Feb-2026'] },
  // INV/Cleaning/2026.1.31-01577 — Risa Matsuoka — Siti Asih
  { invoiceNumber: 'INV/Cleaning/2026.1.31-01577', customerName: 'Risa Matsuoka', mitraCode: 'MITRA-202401-000028', visitDates: ['Mon,2-Feb-2026','Fri,6-Feb-2026','Mon,9-Feb-2026','Fri,13-Feb-2026','Mon,16-Feb-2026','Fri,20-Feb-2026','Mon,23-Feb-2026','Fri,27-Feb-2026'] },
  // INV/Cleaning/2026.2.5-01595 — Lesti M — Parsini
  { invoiceNumber: 'INV/Cleaning/2026.2.5-01595', customerName: 'Lesti M', mitraCode: 'MITRA-202212-000002', visitDates: ['Mon,9-Feb-2026','Thu,12-Feb-2026','Mon,16-Feb-2026','Thu,19-Feb-2026','Mon,23-Feb-2026','Thu,26-Feb-2026','Mon,2-Mar-2026','Thu,5-Mar-2026'] },
  // INV/Cleaning/2026.2.10-01612 — Petrajaya — Naini
  { invoiceNumber: 'INV/Cleaning/2026.2.10-01612', customerName: 'Petrajaya Wiratama', mitraCode: 'MITRA-2020501-000065', visitDates: ['Thu,12-Feb-2026','17-Feb-2026\nCUSTOMER OFF','Thu,19-Feb-2026','Tue,24-Feb-2026','Thu,26-Feb-2026','Tue,3-Mar-2026','Thu,5-Mar-2026','Tue,10-Mar-2026','Thu,12-Mar-2026'] },
  // INV/Cleaning/2026.2.16-01624 — Yanuar — Sunarsih
  { invoiceNumber: 'INV/Cleaning/2026.2.16-01624', customerName: 'Yanuar', mitraCode: 'MITRA-2020504-000085', visitDates: ['17-Feb-2026\nCUSTOMER OFF','Fri,20-Feb-2026','Tue,24-Feb-2026','Fri,27-Feb-2026','Tue,3-Mar-2026','Fri,6-Mar-2026','Tue,10-Mar-2026','Fri,13-Mar-2026','Tue,17-Mar-2026'] },
  // INV/Cleaning/2026.2.17-01628 — Aom — Siti Asih
  { invoiceNumber: 'INV/Cleaning/2026.2.17-01628', customerName: 'Aom Chuthatuch via Altrix', mitraCode: 'MITRA-202401-000028', visitDates: ['Wed,18-Feb-2026','Wed,25-Feb-2026','Wed,4-Mar-2026','Wed,11-Mar-2026'] },
  // INV/Cleaning/2026.2.18-01635 — Shinta — Atika
  { invoiceNumber: 'INV/Cleaning/2026.2.18-01635', customerName: 'Shinta', mitraCode: 'MITRA-2020505-000086', visitDates: ['Fri,20-Feb-2026','24-Feb-2026\nCUSTOMER OFF','Fri,27-Feb-2026','Tue,3-Mar-2026','Fri,6-Mar-2026','Tue,10-Mar-2026','Fri,13-Mar-2026','17-Mar-2026\nCUSTOMER OFF','20-Mar-2026\nLIBUR IDUL FITRI','Tue,31-Mar-2026','Fri,3-Apr-2026'] },
  // INV/Cleaning/2026.2.19-01638 — Yosuke — Rina Triana
  { invoiceNumber: 'INV/Cleaning/2026.2.19-01638', customerName: 'Yosuke Fukada', mitraCode: 'MITRA-2020509-000105', visitDates: ['Fri,20-Feb-2026','Mon,23-Feb-2026','Wed,25-Feb-2026','Fri,27-Feb-2026','Mon,2-Mar-2026','Wed,4-Mar-2026','Fri,6-Mar-2026','Mon,9-Mar-2026','Wed,11-Mar-2026','Fri,13-Mar-2026','Mon,16-Mar-2026','18-Mar-2026\nLIBUR IDUL FITRI','20-Mar-2026\nLIBUR IDUL FITRI','23-Mar-2026\nLIBUR IDUL FITRI','Wed,8-Apr-2026'] },
  // INV/Cleaning/2026.2.7-01644 — Janina — Rohayani
  { invoiceNumber: 'INV/Cleaning/2026.2.7-01644', customerName: 'Janina', mitraCode: 'MITRA-2020506-000095', visitDates: ['Sat,7-Feb-2026','Wed,11-Feb-2026','Sat,14-Feb-2026','Wed,18-Feb-2026','Sat,21-Feb-2026','Wed,25-Feb-2026','Sat,28-Feb-2026','Wed,4-Mar-2026'] },
  // INV/Cleaning/2026.2.20-01646 — Natsarin — Siti Asih
  { invoiceNumber: 'INV/Cleaning/2026.2.20-01646', customerName: 'Natsarin Wittayathaworn via Altrix', mitraCode: 'MITRA-202401-000028', visitDates: ['Thu,26-Feb-2026','Thu,5-Mar-2026','Thu,12-Mar-2026','Thu,19-Mar-2026'] },
  // INV/Cleaning/2026.2.20-01647 — Masaru — Sulastri
  { invoiceNumber: 'INV/Cleaning/2026.2.20-01647', customerName: 'Masaru Kurokawa', mitraCode: 'MITRA-202210-000001', visitDates: ['Fri,27-Feb-2026','Fri,6-Mar-2026','Fri,13-Mar-2026','Fri,20-Mar-2026'] },
  // INV/Cleaning/2026.2.24-01655 — Monika — Suminten
  { invoiceNumber: 'INV/Cleaning/2026.2.24-01655', customerName: 'Monika', mitraCode: 'MITRA-202304-000005', visitDates: ['Thu,26-Feb-2026','Mon,2-Mar-2026','Thu,5-Mar-2026','Mon,9-Mar-2026','Thu,12-Mar-2026','Mon,16-Mar-2026','19-Mar-2026\nLIBUR IDUL FITRI','23-Mar-2026\nLIBUR IDUL FITRI','26-Mar-2026\nLIBUR IDUL FITRI','30-Mar-2026\nYULIA IZIN','02-Apr-2026\nCUSTOMER OFF','Mon,6-Apr-2026','09-Apr-2026\nCUSTOMER OFF','Mon,13-Apr-2026'] },
  // INV/Cleaning/2026.2.26-01662 — A. Prasetyo — Annarul
  { invoiceNumber: 'INV/Cleaning/2026.2.26-01662', customerName: 'A. Prasetyo Pamungkas', mitraCode: 'MITRA-2020509-000106', visitDates: ['Mon,2-Mar-2026','Thu,5-Mar-2026','Mon,9-Mar-2026','Thu,12-Mar-2026','Mon,16-Mar-2026','19-Mar-2026\nLIBUR IDUL FITRI','23-Mar-2026\nLIBUR IDUL FITRI','Thu,26-Mar-2026','Mon,30-Mar-2026','Thu,2-Apr-2026'] },
  // INV/Cleaning/2026.2.27-01674 — Minarti — Ria Junaeni
  { invoiceNumber: 'INV/Cleaning/2026.2.27-01674', customerName: 'Minarti Prahara', mitraCode: 'MITRA-202403-000034', visitDates: ['Mon,2-Mar-2026','Wed,4-Mar-2026','Fri,6-Mar-2026','Mon,9-Mar-2026','11-Mar-2026\nMBA RIA SAKIT','Fri,13-Mar-2026','Mon,16-Mar-2026','Wed,18-Mar-2026','20-Mar-2026\nLIBUR IDUL FITRI','23-Mar-2026\nLIBUR IDUL FITRI','Wed,25-Mar-2026','Fri,27-Mar-2026','Mon,30-Mar-2026','01-Apr-2026\nMBA RIA IZIN','Fri,3-Apr-2026','Mon,6-Apr-2026'] },
  // INV/Cleaning/2026.2.27-01676 — Kun Ronnie — Suminten
  { invoiceNumber: 'INV/Cleaning/2026.2.27-01676', customerName: 'Kun Ronnie via Altrix', mitraCode: 'MITRA-202304-000005', visitDates: ['Tue,3-Mar-2026','Fri,6-Mar-2026','Tue,10-Mar-2026','Fri,13-Mar-2026','Tue,17-Mar-2026','Fri,20-Mar-2026','Tue,24-Mar-2026','Fri,27-Mar-2026','Tue,31-Mar-2026'] },
  // INV/Cleaning/2026.3.1-01683 — Risa Matsuoka — Siti Asih
  { invoiceNumber: 'INV/Cleaning/2026.3.1-01683', customerName: 'Risa Matsuoka', mitraCode: 'MITRA-202401-000028', visitDates: ['Mon,2-Mar-2026','Fri,6-Mar-2026','Mon,9-Mar-2026','Fri,13-Mar-2026','Mon,16-Mar-2026','20-Mar-2026\nLIBUR IDUL FITRI','23-Mar-2026\nLIBUR IDUL FITRI','Fri,27-Mar-2026','Mon,30-Mar-2026','Fri,3-Apr-2026','Mon,6-Apr-2026'] },
  // INV/Cleaning/2026.3.4-01708 — Lesti M — Parsini
  { invoiceNumber: 'INV/Cleaning/2026.3.4-01708', customerName: 'Lesti M', mitraCode: 'MITRA-202212-000002', visitDates: ['Mon,9-Mar-2026','Thu,12-Mar-2026','Mon,16-Mar-2026','19-Mar-2026\nLIBUR IDUL FITRI','23-Mar-2026\nLIBUR IDUL FITRI','26-Mar-2026\nLIBUR IDUL FITRI','Mon,30-Mar-2026','Thu,2-Apr-2026','Mon,6-Apr-2026','Thu,9-Apr-2026','Mon,13-Apr-2026'] },
  // INV/Cleaning/2026.3.6-01716 — Janina — Rohayani
  { invoiceNumber: 'INV/Cleaning/2026.3.6-01716', customerName: 'Janina', mitraCode: 'MITRA-2020506-000095', visitDates: ['07-Mar-2026\nROHAYANI IZIN','Wed,11-Mar-2026','Sat,14-Mar-2026','Wed,18-Mar-2026','21-Mar-2026\nLIBUR IDUL FITRI','25-Mar-2026\nLIBUR IDUL FITRI','Sat,28-Mar-2026','Wed,1-Apr-2026','Sat,4-Apr-2026','Wed,8-Apr-2026','Wed,22-Apr-2026','Sat,25-Apr-2026'] },
  // INV/Cleaning/2026.3.17-01731 — Aom — Siti Asih
  { invoiceNumber: 'INV/Cleaning/2026.3.17-01731', customerName: 'Aom Chuthatuch via Altrix', mitraCode: 'MITRA-202401-000028', visitDates: ['Wed,18-Mar-2026','Wed,25-Mar-2026','Wed,1-Apr-2026','Wed,8-Apr-2026','Wed,15-Apr-2026'] },
  // INV/Cleaning/2026.3.23-01734 — Natsarin — Siti Asih
  { invoiceNumber: 'INV/Cleaning/2026.3.23-01734', customerName: 'Natsarin Wittayathaworn via Altrix', mitraCode: 'MITRA-202401-000028', visitDates: ['Thu,26-Mar-2026','Thu,2-Apr-2026','Thu,9-Apr-2026','Thu,16-Apr-2026'] },
  // INV/Cleaning/2026.3.23-01737 — Masaru — Sulastri
  { invoiceNumber: 'INV/Cleaning/2026.3.23-01737', customerName: 'Masaru Kurokawa', mitraCode: 'MITRA-202210-000001', visitDates: ['Fri,27-Mar-2026','Fri,3-Apr-2026','Fri,10-Apr-2026','Fri,17-Apr-2026'] },
  // INV/Cleaning/2026.3.26-01741 — Yanuar — Sunarsih
  { invoiceNumber: 'INV/Cleaning/2026.3.26-01741', customerName: 'Yanuar', mitraCode: 'MITRA-2020504-000085', visitDates: ['Fri,27-Mar-2026','Tue,31-Mar-2026','Fri,3-Apr-2026','Tue,7-Apr-2026','Fri,10-Apr-2026','Tue,14-Apr-2026','Fri,17-Apr-2026','Tue,21-Apr-2026','Fri,24-Apr-2026'] },
  // INV/Cleaning/2026.3.31-01765 — Kun Ronnie — Suminten
  { invoiceNumber: 'INV/Cleaning/2026.3.31-01765', customerName: 'Kun Ronnie via Altrix', mitraCode: 'MITRA-202304-000005', visitDates: ['Fri,3-Apr-2026','Tue,7-Apr-2026','Fri,10-Apr-2026','Tue,14-Apr-2026','Fri,17-Apr-2026','Tue,21-Apr-2026','Fri,24-Apr-2026','Tue,28-Apr-2026'] },
  // INV/Cleaning/2026.4.2-01770 — A. Prasetyo — Annarul
  { invoiceNumber: 'INV/Cleaning/2026.4.2-01770', customerName: 'A. Prasetyo Pamungkas', mitraCode: 'MITRA-2020509-000106', visitDates: ['Mon,6-Apr-2026','Thu,9-Apr-2026','Mon,13-Apr-2026','Thu,16-Apr-2026','Mon,20-Apr-2026','Thu,23-Apr-2026','Mon,27-Apr-2026','Thu,30-Apr-2026'] },
  // INV/Cleaning/2026.4.3-01777 — Shinta — Atika
  { invoiceNumber: 'INV/Cleaning/2026.4.3-01777', customerName: 'Shinta', mitraCode: 'MITRA-2020505-000086', visitDates: ['07-Apr-2026\nCUTOMER OFF','Fri,10-Apr-2026','Tue,14-Apr-2026','Fri,17-Apr-2026','Tue,21-Apr-2026','Fri,24-Apr-2026','Tue,28-Apr-2026','Fri,1-May-2026','Tue,5-May-2026'] },
  // INV/Cleaning/2026.4.6-01791 — Risa Matsuoka — Siti Asih
  { invoiceNumber: 'INV/Cleaning/2026.4.6-01791', customerName: 'Risa Matsuoka', mitraCode: 'MITRA-202401-000028', visitDates: ['Fri,10-Apr-2026','Mon,13-Apr-2026','Fri,17-Apr-2026','Mon,20-Apr-2026','Fri,24-Apr-2026','Mon,27-Apr-2026','Fri,1-May-2026','Mon,4-May-2026'] },
  // INV/Cleaning/2026.4.6-01795 — Petrajaya — Naini
  { invoiceNumber: 'INV/Cleaning/2026.4.6-01795', customerName: 'Petrajaya Wiratama', mitraCode: 'MITRA-2020501-000065', visitDates: ['Tue,7-Apr-2026','Thu,9-Apr-2026','Tue,14-Apr-2026','Thu,16-Apr-2026','Tue,21-Apr-2026','Thu,23-Apr-2026','Tue,28-Apr-2026','Thu,30-Apr-2026','Tue,5-May-2026'] },
  // INV/Cleaning/2026.4.7-01796 — Minarti — Ria Junaeni
  { invoiceNumber: 'INV/Cleaning/2026.4.7-01796', customerName: 'Minarti Prahara', mitraCode: 'MITRA-202403-000034', visitDates: ['Wed,8-Apr-2026','Fri,10-Apr-2026','Mon,13-Apr-2026','Wed,15-Apr-2026','Fri,17-Apr-2026','Mon,20-Apr-2026','Wed,22-Apr-2026','Fri,24-Apr-2026','Mon,27-Apr-2026','Wed,29-Apr-2026','Fri,1-May-2026','Mon,4-May-2026','Wed,6-May-2026'] },
  // INV/Cleaning/2026.4.8-01799 — Yosuke — Rina Triana
  { invoiceNumber: 'INV/Cleaning/2026.4.8-01799', customerName: 'Yosuke Fukada', mitraCode: 'MITRA-2020509-000105', visitDates: ['Fri,10-Apr-2026','13-Apr-2026\nCUSTOMER OFF','Wed,15-Apr-2026','Fri,17-Apr-2026','Mon,20-Apr-2026','Wed,22-Apr-2026','Fri,24-Apr-2026','Mon,27-Apr-2026','Wed,29-Apr-2026','Fri,1-May-2026','Mon,4-May-2026','Wed,6-May-2026','Fri,8-May-2026','Mon,11-May-2026'] },
  // INV/Cleaning/2026.4.13-01805 — Monika — Suminten
  { invoiceNumber: 'INV/Cleaning/2026.4.13-01805', customerName: 'Monika', mitraCode: 'MITRA-202304-000005', visitDates: ['Thu,16-Apr-2026','Mon,20-Apr-2026','Thu,23-Apr-2026','Mon,27-Apr-2026','Thu,30-Apr-2026','Mon,4-May-2026','Thu,7-May-2026','Mon,11-May-2026'] },
  // INV/Cleaning/2026.4.13-01824 — Lesti M — Parsini
  { invoiceNumber: 'INV/Cleaning/2026.4.13-01824', customerName: 'Lesti M', mitraCode: 'MITRA-202212-000002', visitDates: ['Thu,16-Apr-2026','Mon,20-Apr-2026','Thu,23-Apr-2026','Mon,27-Apr-2026','Thu,30-Apr-2026','Mon,4-May-2026','Thu,7-May-2026','Mon,11-May-2026'] },
  // INV/Cleaning/2026.4.17-01837 — Aom — Siti Asih
  { invoiceNumber: 'INV/Cleaning/2026.4.17-01837', customerName: 'Aom Chuthatuch via Altrix', mitraCode: 'MITRA-202401-000028', visitDates: ['Wed,22-Apr-2026','Wed,29-Apr-2026','Wed,6-May-2026','Wed,13-May-2026'] },
];

async function main() {
  console.log('=== ETL: Visits ===\n');

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
    if (!customerId) {
      console.log(`  ERROR (customer not found): ${entry.customerName}`);
      errors++;
      continue;
    }

    const mitraId = mitraMap.get(entry.mitraCode);
    if (!mitraId) {
      console.log(`  ERROR (mitra not found): ${entry.mitraCode}`);
      errors++;
      continue;
    }

    let visitNumber = 1;
    let inserted = 0;

    for (let i = 0; i < entry.visitDates.length; i++) {
      const rawDate = entry.visitDates[i];
      const parsed = parseEntry(rawDate);
      if (!parsed) continue;

      // Resolve backup mitra for this visit index
      const backupRaw = entry.backupMitras?.[i];
      const backupCode = parseBackupMitraCode(backupRaw ?? '');
      const effectiveMitraId = backupCode ? (mitraMap.get(backupCode) ?? mitraId) : mitraId;

      if (backupCode && !mitraMap.get(backupCode)) {
        console.log(`  WARN: backup mitra not found [${backupCode}] for ${entry.invoiceNumber} visit ${i + 1} — falling back to mitra_1`);
      }

      await db.insert(visitDB).values({
        customerId,
        invoiceId,
        mitraId: effectiveMitraId,
        originalMitraId: mitraId,
        actualMitraId: effectiveMitraId,
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
  console.log(`Total visits inserted: ${totalInserted}, Invoices skipped: ${totalSkipped}, Errors: ${errors}`);

  const finalCount = await db.select({ id: visitDB.id }).from(visitDB);
  console.log(`Total visits in DB: ${finalCount.length}`);

  process.exit(0);
}

main().catch(err => { console.error(err); process.exit(1); });
