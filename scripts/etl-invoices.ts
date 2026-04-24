import { config } from 'dotenv';
config({ path: '.env.local' });

import { db } from '../src/lib/db';
import { customerDB, invoiceDB } from '../src/lib/schema';

const parseDate = (s: string): string => {
  const months: Record<string, string> = {
    Jan: '01', Feb: '02', Mar: '03', Apr: '04', May: '05', Jun: '06',
    Jul: '07', Aug: '08', Sep: '09', Oct: '10', Nov: '11', Dec: '12'
  };
  const parts = s.trim().split('-');
  const [d, m, y] = parts;
  return `${y}-${months[m]}-${d.padStart(2, '0')}`;
};

const parseAmount = (s: string): string => s.replace(/[^0-9]/g, '');

const INVOICES = [
  // Aom Chuthatuch via Altrix
  { invoiceNumber: 'INV/Cleaning/2026.1.16-01512', invoiceNo: 1512, invoiceDate: '16-Jan-2026', years: 2026, months: 1, days: 16, customerName: 'Aom Chuthatuch via Altrix', address: 'The Capital Residence, Tower 3, Unit 6A\nJl. Jend. Sudirman Kav 52-53 No.52-53, RT.5/RW.1, Senayan, Kec. Kby. Baru, Kota Jakarta Selatan, Daerah Khusus Ibukota Jakarta 12190', phone: '+66 80 266 6477', pkg: 'Monthly Subscription of Basic Cleaning (3 hours per visit; 1 visit per week)', qty: 1, price: '600000', startPeriod: '18-Jan-2026', endPeriod: '17-Feb-2026', status: 'PAID', paidDate: '23-Jan-2026' },
  { invoiceNumber: 'INV/Cleaning/2026.2.17-01628', invoiceNo: 1628, invoiceDate: '17-Feb-2026', years: 2026, months: 2, days: 17, customerName: 'Aom Chuthatuch via Altrix', address: 'The Capital Residence, Tower 3, Unit 6A\nJl. Jend. Sudirman Kav 52-53 No.52-53, RT.5/RW.1, Senayan, Kec. Kby. Baru, Kota Jakarta Selatan, Daerah Khusus Ibukota Jakarta 12190', phone: '+66 80 266 6477', pkg: 'Monthly Subscription of Basic Cleaning (3 hours per visit; 1 visit per week)', qty: 1, price: '600000', startPeriod: '18-Feb-2026', endPeriod: '17-Mar-2026', status: 'PAID', paidDate: '26-Feb-2026' },
  { invoiceNumber: 'INV/Cleaning/2026.3.17-01731', invoiceNo: 1731, invoiceDate: '17-Mar-2026', years: 2026, months: 3, days: 17, customerName: 'Aom Chuthatuch via Altrix', address: 'The Capital Residence, Tower 3, Unit 6A\nJl. Jend. Sudirman Kav 52-53 No.52-53, RT.5/RW.1, Senayan, Kec. Kby. Baru, Kota Jakarta Selatan, Daerah Khusus Ibukota Jakarta 12190', phone: '+66 80 266 6477', pkg: 'Monthly Subscription of Basic Cleaning (3 hours per visit; 1 visit per week)', qty: 1, price: '600000', startPeriod: '18-Mar-2026', endPeriod: '17-Apr-2026', status: 'PAID', paidDate: '31-Mar-2026' },
  { invoiceNumber: 'INV/Cleaning/2026.4.17-01837', invoiceNo: 1837, invoiceDate: '17-Apr-2026', years: 2026, months: 4, days: 17, customerName: 'Aom Chuthatuch via Altrix', address: 'The Capital Residence, Tower 3, Unit 6A\nJl. Jend. Sudirman Kav 52-53 No.52-53, RT.5/RW.1, Senayan, Kec. Kby. Baru, Kota Jakarta Selatan, Daerah Khusus Ibukota Jakarta 12190', phone: '+66 80 266 6477', pkg: 'Monthly Subscription of Basic Cleaning (3 hours per visit; 1 visit per week)', qty: 1, price: '600000', startPeriod: '18-Apr-2026', endPeriod: '17-May-2026', status: null, paidDate: null },

  // Natsarin Wittayathaworn via Altrix
  { invoiceNumber: 'INV/Cleaning/2026.1.22-01540', invoiceNo: 1540, invoiceDate: '22-Jan-2026', years: 2026, months: 1, days: 22, customerName: 'Natsarin Wittayathaworn via Altrix', address: 'Apartemen Casa Domaine\nTower 1 Unit 19C\nJl. K.H. Mas Mansyur Blok 1, RT.6/RW.8, Karet Tengsin, Kecamatan Tanah Abang, Kota Jakarta Pusat, Daerah Khusus Ibukota Jakarta 10250', phone: '+66 81 890 2099', pkg: 'Monthly Subscription of Basic Cleaning (3 hours per visit; 1 visit per week)', qty: 1, price: '600000', startPeriod: '23-Jan-2026', endPeriod: '22-Feb-2026', status: 'PAID', paidDate: '23-Jan-2026' },
  { invoiceNumber: 'INV/Cleaning/2026.2.20-01646', invoiceNo: 1646, invoiceDate: '20-Feb-2026', years: 2026, months: 2, days: 20, customerName: 'Natsarin Wittayathaworn via Altrix', address: 'Apartemen Casa Domaine\nTower 1 Unit 19C\nJl. K.H. Mas Mansyur Blok 1, RT.6/RW.8, Karet Tengsin, Kecamatan Tanah Abang, Kota Jakarta Pusat, Daerah Khusus Ibukota Jakarta 10250', phone: '+66 81 890 2099', pkg: 'Monthly Subscription of Basic Cleaning (3 hours per visit; 1 visit per week)', qty: 1, price: '600000', startPeriod: '23-Feb-2026', endPeriod: '22-Mar-2026', status: 'PAID', paidDate: '26-Feb-2026' },
  { invoiceNumber: 'INV/Cleaning/2026.3.23-01734', invoiceNo: 1734, invoiceDate: '23-Mar-2026', years: 2026, months: 3, days: 23, customerName: 'Natsarin Wittayathaworn via Altrix', address: 'Apartemen Casa Domaine\nTower 1 Unit 19C\nJl. K.H. Mas Mansyur Blok 1, RT.6/RW.8, Karet Tengsin, Kecamatan Tanah Abang, Kota Jakarta Pusat, Daerah Khusus Ibukota Jakarta 10250', phone: '+66 81 890 2099', pkg: 'Monthly Subscription of Basic Cleaning (3 hours per visit; 1 visit per week)', qty: 1, price: '600000', startPeriod: '23-Mar-2026', endPeriod: '22-Apr-2026', status: 'PAID', paidDate: '31-Mar-2026' },

  // Kun Ronnie via Altrix
  { invoiceNumber: 'INV/Cleaning/2025.12.31-01467', invoiceNo: 1467, invoiceDate: '31-Dec-2025', years: 2025, months: 12, days: 31, customerName: 'Kun Ronnie via Altrix', address: 'Essence Dharmawangsa, East Tower, Unit 22E\nJl. Darmawangsa-X No.86, RT.7/RW.8, Cipete Utara, Kec. Kby. Baru, Kota Jakarta Selatan, Daerah Khusus Ibukota Jakarta 12150', phone: '+62 817-5762-324', pkg: 'Monthly Subscription of Regular Cleaning (3 hours per visit; 2 visits per week)', qty: 1, price: '1125000', startPeriod: '1-Jan-2026', endPeriod: '31-Jan-2026', status: 'PAID', paidDate: '23-Jan-2026' },
  { invoiceNumber: 'INV/Cleaning/2026.1.30-01574', invoiceNo: 1574, invoiceDate: '30-Jan-2026', years: 2026, months: 1, days: 30, customerName: 'Kun Ronnie via Altrix', address: 'Essence Dharmawangsa, East Tower, Unit 22E\nJl. Darmawangsa-X No.86, RT.7/RW.8, Cipete Utara, Kec. Kby. Baru, Kota Jakarta Selatan, Daerah Khusus Ibukota Jakarta 12150', phone: '+62 817-5762-324', pkg: 'Monthly Subscription of Regular Cleaning (3 hours per visit; 2 visits per week)', qty: 1, price: '1125000', startPeriod: '1-Feb-2026', endPeriod: '28-Feb-2026', status: 'PAID', paidDate: '26-Feb-2026' },
  { invoiceNumber: 'INV/Cleaning/2026.2.27-01676', invoiceNo: 1676, invoiceDate: '27-Feb-2026', years: 2026, months: 2, days: 27, customerName: 'Kun Ronnie via Altrix', address: 'Essence Dharmawangsa, East Tower, Unit 22E\nJl. Darmawangsa-X No.86, RT.7/RW.8, Cipete Utara, Kec. Kby. Baru, Kota Jakarta Selatan, Daerah Khusus Ibukota Jakarta 12150', phone: '+62 817-5762-324', pkg: 'Monthly Subscription of Regular Cleaning (3 hours per visit; 2 visits per week)', qty: 1, price: '1125000', startPeriod: '1-Mar-2026', endPeriod: '31-Mar-2026', status: 'PAID', paidDate: '31-Mar-2026' },
  { invoiceNumber: 'INV/Cleaning/2026.3.31-01765', invoiceNo: 1765, invoiceDate: '31-Mar-2026', years: 2026, months: 3, days: 31, customerName: 'Kun Ronnie via Altrix', address: 'Essence Dharmawangsa, East Tower, Unit 22E\nJl. Darmawangsa-X No.86, RT.7/RW.8, Cipete Utara, Kec. Kby. Baru, Kota Jakarta Selatan, Daerah Khusus Ibukota Jakarta 12150', phone: '+62 817-5762-324', pkg: 'Monthly Subscription of Regular Cleaning (3 hours per visit; 2 visits per week)', qty: 1, price: '1125000', startPeriod: '1-Apr-2026', endPeriod: '30-Apr-2026', status: null, paidDate: null },

  // Yosuke Fukada
  { invoiceNumber: 'INV/Cleaning/2026.1.19-01522', invoiceNo: 1522, invoiceDate: '19-Jan-2026', years: 2026, months: 1, days: 19, customerName: 'Yosuke Fukada', address: 'Kebayoran Harmony, Block A-05, Bintaro Sektor 7\nJl. Kby. Residence, Pd. Aren, Kec. Pd. Aren, Kota Tangerang Selatan, Banten 15224', phone: '+62 877-8106-4968', pkg: 'Monthly Subscription of Frequent Cleaning (3 hours per visit; 3 visits per week)', qty: 1, price: '1650000', startPeriod: '20-Jan-2026', endPeriod: '19-Feb-2026', status: 'PAID', paidDate: '21-Jan-2026' },
  { invoiceNumber: 'INV/Cleaning/2026.2.19-01638', invoiceNo: 1638, invoiceDate: '19-Feb-2026', years: 2026, months: 2, days: 19, customerName: 'Yosuke Fukada', address: 'Kebayoran Harmony, Block A-05, Bintaro Sektor 7\nJl. Kby. Residence, Pd. Aren, Kec. Pd. Aren, Kota Tangerang Selatan, Banten 15224', phone: '+62 877-8106-4968', pkg: 'Monthly Subscription of Frequent Cleaning (3 hours per visit; 3 visits per week)', qty: 1, price: '1650000', startPeriod: '20-Feb-2026', endPeriod: '19-Mar-2026', status: 'PAID', paidDate: '20-Feb-2026' },
  { invoiceNumber: 'INV/Cleaning/2026.4.8-01799', invoiceNo: 1799, invoiceDate: '8-Apr-2026', years: 2026, months: 4, days: 8, customerName: 'Yosuke Fukada', address: 'Kebayoran Harmony, Block A-05, Bintaro Sektor 7\nJl. Kby. Residence, Pd. Aren, Kec. Pd. Aren, Kota Tangerang Selatan, Banten 15224', phone: '+62 877-8106-4968', pkg: 'Monthly Subscription of Frequent Cleaning (3 hours per visit; 3 visits per week)', qty: 1, price: '1650000', startPeriod: '9-Apr-2026', endPeriod: '8-May-2026', status: 'PAID', paidDate: '10-Apr-2026' },

  // Janina
  { invoiceNumber: 'INV/Cleaning/2026.2.7-01644', invoiceNo: 1644, invoiceDate: '7-Feb-2026', years: 2026, months: 2, days: 7, customerName: 'Janina', address: 'Apartment Simprug Indah U.2607\nJl. Teuku Nyak Arief No.98, RT.5/RW.2, Grogol Sel., Kec. Kby. Lama, Kota Jakarta Selatan, Daerah Khusus Ibukota Jakarta 12220', phone: '+62 812-9614-7199', pkg: 'Monthly Subscription of Regular Cleaning (3 hours per visit; 2 visits per week)', qty: 1, price: '1125000', startPeriod: '7-Feb-2026', endPeriod: '6-Mar-2026', status: 'PAID', paidDate: '21-Feb-2026' },
  { invoiceNumber: 'INV/Cleaning/2026.3.6-01716', invoiceNo: 1716, invoiceDate: '6-Mar-2026', years: 2026, months: 3, days: 6, customerName: 'Janina', address: 'Apartment Simprug Indah U.2607\nJl. Teuku Nyak Arief No.98, RT.5/RW.2, Grogol Sel., Kec. Kby. Lama, Kota Jakarta Selatan, Daerah Khusus Ibukota Jakarta 12220', phone: '+62 812-9614-7199', pkg: 'Monthly Subscription of Regular Cleaning (3 hours per visit; 2 visits per week)', qty: 1, price: '1125000', startPeriod: '7-Mar-2026', endPeriod: '6-Apr-2026', status: 'PAID', paidDate: '11-Mar-2026' },

  // Masaru Kurokawa
  { invoiceNumber: 'INV/Cleaning/2026.1.22-01539', invoiceNo: 1539, invoiceDate: '22-Jan-2026', years: 2026, months: 1, days: 22, customerName: 'Masaru Kurokawa', address: 'Anandamaya Residences Tower 2 - Unit 57E\nJl. Jenderal Sudirman No.5, RT.10/RW.11, Karet Tengsin, Kecamatan Tanah Abang, Kota Jakarta Pusat, Daerah Khusus Ibukota Jakarta 10220', phone: '+62 811-8767-215', pkg: 'Monthly Subscription of Basic Cleaning (3 hours per visit; 1 visit per week)', qty: 1, price: '600000', startPeriod: '23-Jan-2026', endPeriod: '22-Feb-2026', status: null, paidDate: null },
  { invoiceNumber: 'INV/Cleaning/2026.2.20-01647', invoiceNo: 1647, invoiceDate: '20-Feb-2026', years: 2026, months: 2, days: 20, customerName: 'Masaru Kurokawa', address: 'Anandamaya Residences Tower 2 - Unit 57E\nJl. Jenderal Sudirman No.5, RT.10/RW.11, Karet Tengsin, Kecamatan Tanah Abang, Kota Jakarta Pusat, Daerah Khusus Ibukota Jakarta 10220', phone: '+62 811-8767-215', pkg: 'Monthly Subscription of Basic Cleaning (3 hours per visit; 1 visit per week)', qty: 1, price: '600000', startPeriod: '23-Feb-2026', endPeriod: '22-Mar-2026', status: 'PAID', paidDate: '23-Feb-2026' },
  { invoiceNumber: 'INV/Cleaning/2026.3.23-01737', invoiceNo: 1737, invoiceDate: '23-Mar-2026', years: 2026, months: 3, days: 23, customerName: 'Masaru Kurokawa', address: 'Anandamaya Residences Tower 2 - Unit 57E\nJl. Jenderal Sudirman No.5, RT.10/RW.11, Karet Tengsin, Kecamatan Tanah Abang, Kota Jakarta Pusat, Daerah Khusus Ibukota Jakarta 10220', phone: '+62 811-8767-215', pkg: 'Monthly Subscription of Basic Cleaning (3 hours per visit; 1 visit per week)', qty: 1, price: '600000', startPeriod: '23-Mar-2026', endPeriod: '22-Apr-2026', status: 'PAID', paidDate: '31-Mar-2026' },

  // Risa Matsuoka
  { invoiceNumber: 'INV/Cleaning/2026.1.2-01475', invoiceNo: 1475, invoiceDate: '2-Jan-2026', years: 2026, months: 1, days: 2, customerName: 'Risa Matsuoka', address: 'Anandamaya Residences, Tower 3, 35-B\nJl. Jenderal Sudirman No.5, RT.10/RW.11, Karet Tengsin, Kecamatan Tanah Abang, Kota Jakarta Pusat, Daerah Khusus Ibukota Jakarta 10220', phone: '+62 819-4706-1009', pkg: 'Monthly Subscription of Regular Cleaning (3 hours per visit; 2 visits per week)', qty: 1, price: '1125000', startPeriod: '2-Jan-2026', endPeriod: '1-Feb-2026', status: null, paidDate: null },
  { invoiceNumber: 'INV/Cleaning/2026.1.31-01577', invoiceNo: 1577, invoiceDate: '31-Jan-2026', years: 2026, months: 1, days: 31, customerName: 'Risa Matsuoka', address: 'Anandamaya Residences, Tower 3, 35-B\nJl. Jenderal Sudirman No.5, RT.10/RW.11, Karet Tengsin, Kecamatan Tanah Abang, Kota Jakarta Pusat, Daerah Khusus Ibukota Jakarta 10220', phone: '+62 819-4706-1009', pkg: 'Monthly Subscription of Regular Cleaning (3 hours per visit; 2 visits per week)', qty: 1, price: '1125000', startPeriod: '2-Feb-2026', endPeriod: '1-Mar-2026', status: 'PAID', paidDate: '6-Feb-2026' },
  { invoiceNumber: 'INV/Cleaning/2026.3.1-01683', invoiceNo: 1683, invoiceDate: '1-Mar-2026', years: 2026, months: 3, days: 1, customerName: 'Risa Matsuoka', address: 'Anandamaya Residences, Tower 3, 35-B\nJl. Jenderal Sudirman No.5, RT.10/RW.11, Karet Tengsin, Kecamatan Tanah Abang, Kota Jakarta Pusat, Daerah Khusus Ibukota Jakarta 10220', phone: '+62 819-4706-1009', pkg: 'Monthly Subscription of Regular Cleaning (3 hours per visit; 2 visits per week)', qty: 1, price: '1125000', startPeriod: '2-Mar-2026', endPeriod: '1-Apr-2026', status: null, paidDate: null },
  { invoiceNumber: 'INV/Cleaning/2026.4.6-01791', invoiceNo: 1791, invoiceDate: '6-Apr-2026', years: 2026, months: 4, days: 6, customerName: 'Risa Matsuoka', address: 'Anandamaya Residences, Tower 3, 35-B\nJl. Jenderal Sudirman No.5, RT.10/RW.11, Karet Tengsin, Kecamatan Tanah Abang, Kota Jakarta Pusat, Daerah Khusus Ibukota Jakarta 10220', phone: '+62 819-4706-1009', pkg: 'Monthly Subscription of Regular Cleaning (3 hours per visit; 2 visits per week)', qty: 1, price: '1125000', startPeriod: '7-Apr-2026', endPeriod: '6-May-2026', status: 'PAID', paidDate: '9-Apr-2026' },

  // Monika
  { invoiceNumber: 'INV/Cleaning/2026.1.24-01547', invoiceNo: 1547, invoiceDate: '24-Jan-2026', years: 2026, months: 1, days: 24, customerName: 'Monika', address: 'SQ Apartemen\nJl. R.A. Kartini No.Kav.8, Lb. Bulus, Kec. Cilandak, Jakarta, Daerah Khusus Ibukota Jakarta 12430', phone: '+62 852-1949-3252', pkg: 'Monthly Subscription of Regular Cleaning (3 hours per visit; 2 visits per week)', qty: 1, price: '1125000', startPeriod: '25-Jan-2026', endPeriod: '24-Feb-2026', status: 'PAID', paidDate: '26-Jan-2026' },
  { invoiceNumber: 'INV/Cleaning/2026.2.24-01655', invoiceNo: 1655, invoiceDate: '24-Feb-2026', years: 2026, months: 2, days: 24, customerName: 'Monika', address: 'SQ Apartemen\nJl. R.A. Kartini No.Kav.8, Lb. Bulus, Kec. Cilandak, Jakarta, Daerah Khusus Ibukota Jakarta 12430', phone: '+62 852-1949-3252', pkg: 'Monthly Subscription of Regular Cleaning (3 hours per visit; 2 visits per week)', qty: 1, price: '1125000', startPeriod: '25-Feb-2026', endPeriod: '24-Mar-2026', status: 'PAID', paidDate: '24-Feb-2026' },
  { invoiceNumber: 'INV/Cleaning/2026.4.13-01805', invoiceNo: 1805, invoiceDate: '13-Apr-2026', years: 2026, months: 4, days: 13, customerName: 'Monika', address: 'SQ Apartemen\nJl. R.A. Kartini No.Kav.8, Lb. Bulus, Kec. Cilandak, Jakarta, Daerah Khusus Ibukota Jakarta 12430', phone: '+62 852-1949-3252', pkg: 'Monthly Subscription of Regular Cleaning (3 hours per visit; 2 visits per week)', qty: 1, price: '1125000', startPeriod: '14-Apr-2026', endPeriod: '13-May-2026', status: 'PAID', paidDate: '9-Apr-2026' },

  // Minarti Prahara
  { invoiceNumber: 'INV/Cleaning/2026.1.30-01570', invoiceNo: 1570, invoiceDate: '30-Jan-2026', years: 2026, months: 1, days: 30, customerName: 'Minarti Prahara', address: 'Jl. Alam Asri II SB 12\nPd. Pinang, Kec. Kby. Lama, Kota Jakarta Selatan, Daerah Khusus Ibukota Jakarta 12310', phone: '+62 811-919-286', pkg: 'Monthly Subscription of Frequent Cleaning (3 hours per visit; 3 visits per week)', qty: 1, price: '1650000', startPeriod: '31-Jan-2026', endPeriod: '27-Feb-2026', status: 'PAID', paidDate: '31-Jan-2026' },
  { invoiceNumber: 'INV/Cleaning/2026.2.27-01674', invoiceNo: 1674, invoiceDate: '27-Feb-2026', years: 2026, months: 2, days: 27, customerName: 'Minarti Prahara', address: 'Jl. Alam Asri II SB 12\nPd. Pinang, Kec. Kby. Lama, Kota Jakarta Selatan, Daerah Khusus Ibukota Jakarta 12310', phone: '+62 811-919-286', pkg: 'Monthly Subscription of Frequent Cleaning (3 hours per visit; 3 visits per week)', qty: 1, price: '1650000', startPeriod: '28-Feb-2026', endPeriod: '27-Mar-2026', status: 'PAID', paidDate: '1-Mar-2026' },
  { invoiceNumber: 'INV/Cleaning/2026.4.7-01796', invoiceNo: 1796, invoiceDate: '7-Apr-2026', years: 2026, months: 4, days: 7, customerName: 'Minarti Prahara', address: 'Jl. Alam Asri II SB 12\nPd. Pinang, Kec. Kby. Lama, Kota Jakarta Selatan, Daerah Khusus Ibukota Jakarta 12310', phone: '+62 811-919-286', pkg: 'Monthly Subscription of Frequent Cleaning (3 hours per visit; 3 visits per week)', qty: 1, price: '1650000', startPeriod: '7-Apr-2026', endPeriod: '6-May-2026', status: 'PAID', paidDate: '10-Apr-2026' },

  // Petrajaya Wiratama
  { invoiceNumber: 'INV/Cleaning/2026.1.8-01489', invoiceNo: 1489, invoiceDate: '8-Jan-2026', years: 2026, months: 1, days: 8, customerName: 'Petrajaya Wiratama', address: 'Apartemen Atap Merah (Redtop) Unit 1102\nJl. Pecenongan No.72, Kb. Klp., Kecamatan Gambir, Kota Jakarta Pusat, Daerah Khusus Ibukota Jakarta 10120', phone: '+62 812-1095-922', pkg: 'Monthly Subscription of Regular Cleaning (3 hours per visit; 2 visits per week)', qty: 1, price: '1125000', startPeriod: '13-Jan-2026', endPeriod: '12-Feb-2026', status: 'PAID', paidDate: '13-Jan-2026' },
  { invoiceNumber: 'INV/Cleaning/2026.2.10-01612', invoiceNo: 1612, invoiceDate: '10-Feb-2026', years: 2026, months: 2, days: 10, customerName: 'Petrajaya Wiratama', address: 'Apartemen Atap Merah (Redtop) Unit 1102\nJl. Pecenongan No.72, Kb. Klp., Kecamatan Gambir, Kota Jakarta Pusat, Daerah Khusus Ibukota Jakarta 10120', phone: '+62 812-1095-922', pkg: 'Monthly Subscription of Regular Cleaning (3 hours per visit; 2 visits per week)', qty: 1, price: '1125000', startPeriod: '12-Feb-2026', endPeriod: '11-Mar-2026', status: 'PAID', paidDate: '12-Feb-2026' },
  { invoiceNumber: 'INV/Cleaning/2026.4.6-01795', invoiceNo: 1795, invoiceDate: '6-Apr-2026', years: 2026, months: 4, days: 6, customerName: 'Petrajaya Wiratama', address: 'Apartemen Atap Merah (Redtop) Unit 1102\nJl. Pecenongan No.72, Kb. Klp., Kecamatan Gambir, Kota Jakarta Pusat, Daerah Khusus Ibukota Jakarta 10120', phone: '+62 812-1095-922', pkg: 'Monthly Subscription of Regular Cleaning (3 hours per visit; 2 visits per week)', qty: 1, price: '1125000', startPeriod: '7-Apr-2026', endPeriod: '5-May-2026', status: null, paidDate: null },

  // Shinta
  { invoiceNumber: 'INV/Cleaning/2026.1.10-01494', invoiceNo: 1494, invoiceDate: '10-Jan-2026', years: 2026, months: 1, days: 10, customerName: 'Shinta', address: 'DE ROYALDI VILLAGE No. A7\nMuncul, Kec. Setu, Kota Tangerang Selatan, Banten 15314', phone: '+62 852-2227-0787', pkg: 'Monthly Subscription of Regular Cleaning (3 hours per visit; 2 visits per week)', qty: 1, price: '1125000', startPeriod: '13-Jan-2026', endPeriod: '12-Feb-2026', status: 'PAID', paidDate: '16-Jan-2026' },
  { invoiceNumber: 'INV/Cleaning/2026.2.18-01635', invoiceNo: 1635, invoiceDate: '18-Feb-2026', years: 2026, months: 2, days: 18, customerName: 'Shinta', address: 'DE ROYALDI VILLAGE No. A7\nMuncul, Kec. Setu, Kota Tangerang Selatan, Banten 15314', phone: '+62 852-2227-0787', pkg: 'Monthly Subscription of Regular Cleaning (3 hours per visit; 2 visits per week)', qty: 1, price: '1125000', startPeriod: '20-Feb-2026', endPeriod: '31-Mar-2026', status: 'PAID', paidDate: '20-Feb-2026' },
  { invoiceNumber: 'INV/Cleaning/2026.4.3-01777', invoiceNo: 1777, invoiceDate: '3-Apr-2026', years: 2026, months: 4, days: 3, customerName: 'Shinta', address: 'DE ROYALDI VILLAGE No. A7\nMuncul, Kec. Setu, Kota Tangerang Selatan, Banten 15314', phone: '+62 852-2227-0787', pkg: 'Monthly Subscription of Regular Cleaning (3 hours per visit; 2 visits per week)', qty: 1, price: '1125000', startPeriod: '7-Apr-2026', endPeriod: '5-May-2026', status: null, paidDate: null },

  // Yanuar
  { invoiceNumber: 'INV/Cleaning/2026.1.16-01510', invoiceNo: 1510, invoiceDate: '16-Jan-2026', years: 2026, months: 1, days: 16, customerName: 'Yanuar', address: 'Jl. Tanjung Duren Utara 2B No.11\nTanjung Duren Utara, Kec. Grogol Petamburan, Kota Jakarta Barat, Daerah Khusus Ibukota Jakarta 11470', phone: '+62 811-9992-979', pkg: 'Monthly Subscription of Regular Cleaning (3 hours per visit; 2 visits per week)', qty: 1, price: '1125000', startPeriod: '20-Jan-2026', endPeriod: '19-Feb-2026', status: 'PAID', paidDate: '20-Jan-2026' },
  { invoiceNumber: 'INV/Cleaning/2026.2.16-01624', invoiceNo: 1624, invoiceDate: '16-Feb-2026', years: 2026, months: 2, days: 16, customerName: 'Yanuar', address: 'Jl. Tanjung Duren Utara 2B No.11\nTanjung Duren Utara, Kec. Grogol Petamburan, Kota Jakarta Barat, Daerah Khusus Ibukota Jakarta 11470', phone: '+62 811-9992-979', pkg: 'Monthly Subscription of Regular Cleaning (3 hours per visit; 2 visits per week)', qty: 1, price: '1125000', startPeriod: '20-Feb-2026', endPeriod: '19-Mar-2026', status: 'PAID', paidDate: '20-Feb-2026' },
  { invoiceNumber: 'INV/Cleaning/2026.3.26-01741', invoiceNo: 1741, invoiceDate: '26-Mar-2026', years: 2026, months: 3, days: 26, customerName: 'Yanuar', address: 'Jl. Tanjung Duren Utara 2B No.11\nTanjung Duren Utara, Kec. Grogol Petamburan, Kota Jakarta Barat, Daerah Khusus Ibukota Jakarta 11470', phone: '+62 811-9992-979', pkg: 'Monthly Subscription of Regular Cleaning (3 hours per visit; 2 visits per week)', qty: 1, price: '1125000', startPeriod: '27-Mar-2026', endPeriod: '24-Apr-2026', status: null, paidDate: null },

  // Wina
  { invoiceNumber: 'INV/Cleaning/2026.1.20-01530', invoiceNo: 1530, invoiceDate: '20-Jan-2026', years: 2026, months: 1, days: 20, customerName: 'Wina', address: 'Apartemen Paladian Park Tower G Unit 0202\nJl. Perintis Kemerdekaan, Klp. Gading Bar., Kec. Klp. Gading, Kota Jkt Utara, Daerah Khusus Ibukota Jakarta 14240', phone: '+62 852-8156-2826', pkg: 'Monthly Subscription of Basic Cleaning (3 hours per visit; 1 visit per week)', qty: 1, price: '600000', startPeriod: '27-Jan-2026', endPeriod: '26-Feb-2026', status: 'PAID', paidDate: '27-Jan-2026' },

  // A. Prasetyo Pamungkas
  { invoiceNumber: 'INV/Cleaning/2026.1.24-01549', invoiceNo: 1549, invoiceDate: '24-Jan-2026', years: 2026, months: 1, days: 24, customerName: 'A. Prasetyo Pamungkas', address: 'Jl. Kecipir Raya No.6\nCibodas Sari, Kec. Cibodas, Kota Tangerang, Banten 15138', phone: '+62 817-6768-176', pkg: 'Monthly Subscription of Regular Cleaning (3 hours per visit; 2 visits per week)', qty: 1, price: '1125000', startPeriod: '26-Jan-2026', endPeriod: '25-Feb-2026', status: 'PAID', paidDate: '29-Jan-2026' },
  { invoiceNumber: 'INV/Cleaning/2026.2.26-01662', invoiceNo: 1662, invoiceDate: '26-Feb-2026', years: 2026, months: 2, days: 26, customerName: 'A. Prasetyo Pamungkas', address: 'Jl. Kecipir Raya No.6\nCibodas Sari, Kec. Cibodas, Kota Tangerang, Banten 15138', phone: '+62 817-6768-176', pkg: 'Monthly Subscription of Regular Cleaning (3 hours per visit; 2 visits per week)', qty: 1, price: '1125000', startPeriod: '2-Mar-2026', endPeriod: '2-Apr-2026', status: 'PAID', paidDate: '2-Mar-2026' },
  { invoiceNumber: 'INV/Cleaning/2026.4.2-01770', invoiceNo: 1770, invoiceDate: '2-Apr-2026', years: 2026, months: 4, days: 2, customerName: 'A. Prasetyo Pamungkas', address: 'Jl. Kecipir Raya No.6\nCibodas Sari, Kec. Cibodas, Kota Tangerang, Banten 15138', phone: '+62 817-6768-176', pkg: 'Monthly Subscription of Regular Cleaning (3 hours per visit; 2 visits per week)', qty: 1, price: '1125000', startPeriod: '6-Apr-2026', endPeriod: '30-Apr-2026', status: null, paidDate: null },

  // Lesti M
  { invoiceNumber: 'INV/Cleaning/2026.1.5-01482', invoiceNo: 1482, invoiceDate: '5-Jan-2026', years: 2026, months: 1, days: 5, customerName: 'Lesti M', address: 'Lavanya hills residence\nBlok Aleza II no E-16\nJl. Bukit Cinere Raya No.Dalam, Gandul, Kec. Cinere, Kota Depok, Jawa Barat 16514', phone: '+62 811-1919-137', pkg: 'Monthly Subscription of Regular Cleaning (3 hours per visit; 2 visits per week)', qty: 1, price: '1125000', startPeriod: '6-Jan-2026', endPeriod: '5-Feb-2026', status: 'PAID', paidDate: '5-Jan-2026' },
  { invoiceNumber: 'INV/Cleaning/2026.2.5-01595', invoiceNo: 1595, invoiceDate: '5-Feb-2026', years: 2026, months: 2, days: 5, customerName: 'Lesti M', address: 'Lavanya hills residence\nBlok Aleza II no E-16\nJl. Bukit Cinere Raya No.Dalam, Gandul, Kec. Cinere, Kota Depok, Jawa Barat 16514', phone: '+62 811-1919-137', pkg: 'Monthly Subscription of Regular Cleaning (3 hours per visit; 2 visits per week)', qty: 1, price: '1125000', startPeriod: '6-Feb-2026', endPeriod: '5-Mar-2026', status: 'PAID', paidDate: '5-Feb-2026' },
  { invoiceNumber: 'INV/Cleaning/2026.3.4-01708', invoiceNo: 1708, invoiceDate: '4-Mar-2026', years: 2026, months: 3, days: 4, customerName: 'Lesti M', address: 'Lavanya hills residence\nBlok Aleza II no E-16\nJl. Bukit Cinere Raya No.Dalam, Gandul, Kec. Cinere, Kota Depok, Jawa Barat 16514', phone: '+62 811-1919-137', pkg: 'Monthly Subscription of Regular Cleaning (3 hours per visit; 2 visits per week)', qty: 1, price: '1125000', startPeriod: '6-Mar-2026', endPeriod: '5-Apr-2026', status: 'PAID', paidDate: '5-Mar-2026' },
  { invoiceNumber: 'INV/Cleaning/2026.4.13-01824', invoiceNo: 1824, invoiceDate: '13-Apr-2026', years: 2026, months: 4, days: 13, customerName: 'Lesti M', address: 'Lavanya hills residence\nBlok Aleza II no E-16\nJl. Bukit Cinere Raya No.Dalam, Gandul, Kec. Cinere, Kota Depok, Jawa Barat 16514', phone: '+62 811-1919-137', pkg: 'Monthly Subscription of Regular Cleaning (3 hours per visit; 2 visits per week)', qty: 1, price: '1125000', startPeriod: '14-Apr-2026', endPeriod: '13-May-2026', status: 'PAID', paidDate: '13-Apr-2026' },
];

async function main() {
  console.log('=== ETL: Invoices ===\n');

  // Load all customers for lookup
  const customers = await db.select({ id: customerDB.id, name: customerDB.customerName }).from(customerDB);
  const custMap = new Map(customers.map(c => [c.name, c.id]));
  console.log(`Loaded ${customers.length} customers\n`);

  // Load existing invoices to skip duplicates
  const existing = await db.select({ invoiceNumber: invoiceDB.invoiceNumber }).from(invoiceDB);
  const existingSet = new Set(existing.map(e => e.invoiceNumber));
  console.log(`Existing invoices in DB: ${existing.length}\n`);

  let inserted = 0;
  let skipped = 0;
  let errors = 0;

  for (const inv of INVOICES) {
    if (existingSet.has(inv.invoiceNumber)) {
      console.log(`  SKIP (exists): ${inv.invoiceNumber}`);
      skipped++;
      continue;
    }

    const customerId = custMap.get(inv.customerName);
    if (!customerId) {
      console.log(`  ERROR (customer not found): ${inv.customerName} — ${inv.invoiceNumber}`);
      errors++;
      continue;
    }

    const startDate = parseDate(inv.startPeriod);
    const endDate = parseDate(inv.endPeriod);
    const invDate = parseDate(inv.invoiceDate);
    const amount = inv.price;
    const paidAt = inv.paidDate ? new Date(parseDate(inv.paidDate)) : null;
    const status = inv.status === 'PAID' ? 'Paid' : 'Pending';

    await db.insert(invoiceDB).values({
      customerId,
      invoiceNumber: inv.invoiceNumber,
      invoiceNo: inv.invoiceNo,
      invoiceStartDate: startDate,
      invoiceEndDate: endDate,
      invoiceYears: inv.years,
      invoiceMonths: inv.months,
      invoiceDays: inv.days,
      invoiceSubscription: 'Cleaning',
      invoiceCustomerName: inv.customerName,
      invoiceAddress: inv.address,
      invoicePhoneNumber: inv.phone.replace(/[\s\-]/g, '').substring(0, 20),
      invoiceQty: inv.qty,
      invoicePricePerQty: amount,
      invoicePromoCode: null,
      invoicePromoDiscount: '0',
      invoiceDate: new Date(invDate),
      subtotal: amount,
      tax: '0',
      discount: '0',
      totalAmount: amount,
      status,
      paidAt,
      isDeleted: false,
    });

    console.log(`  INSERTED: ${inv.invoiceNumber} [${inv.customerName}] ${startDate} → ${endDate} ${status}`);
    inserted++;
  }

  console.log(`\n=== Done ===`);
  console.log(`Inserted: ${inserted}, Skipped: ${skipped}, Errors: ${errors}`);

  process.exit(0);
}

main().catch(err => { console.error(err); process.exit(1); });
