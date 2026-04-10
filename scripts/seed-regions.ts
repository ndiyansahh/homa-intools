/**
 * Seed Region Data (Jabodetabek)
 *
 * Data source: BPS Indonesia via ibnux.github.io/data-indonesia
 * Coverage: DKI Jakarta, Bogor, Depok, Tangerang, Bekasi
 *
 * Usage:
 *   Local:   npx tsx scripts/seed-regions.ts
 *   Staging: DATABASE_URL=<staging_url> npx tsx scripts/seed-regions.ts
 *
 * WARNING: This script TRUNCATES region_db before inserting fresh data.
 *          Safe to run because region_db has no FK references from other tables.
 */

import { config } from 'dotenv';
import { resolve } from 'path';

// Load .env.local first (local dev), fallback to .env (staging/production)
// MUST happen before any db import
config({ path: resolve(process.cwd(), '.env.local') });
config({ path: resolve(process.cwd(), '.env') });

// DB imported dynamically inside seedRegions() to ensure env is loaded first

// Jabodetabek regency IDs from BPS
const JABODETABEK_REGENCY_IDS = [
  '3171', // KOTA ADM. JAKARTA PUSAT
  '3172', // KOTA ADM. JAKARTA UTARA
  '3173', // KOTA ADM. JAKARTA BARAT
  '3174', // KOTA ADM. JAKARTA SELATAN
  '3175', // KOTA ADM. JAKARTA TIMUR
  '3271', // KOTA BOGOR
  '3275', // KOTA BEKASI
  '3276', // KOTA DEPOK
  '3671', // KOTA TANGERANG
  '3674', // KOTA TANGERANG SELATAN
];

const BPS_API_BASE = 'https://ibnux.github.io/data-indonesia';

// Postal code mapping per kelurahan: "CITY|kecamatan|kelurahan" -> kode_pos
const POSTAL_CODE_MAP: Record<string, string> = {
  // JAKARTA PUSAT - Gambir
  'JAKARTA PUSAT|Gambir|Gambir': '10110',
  'JAKARTA PUSAT|Gambir|Kebon Kelapa': '10120',
  'JAKARTA PUSAT|Gambir|Petojo Utara': '10130',
  'JAKARTA PUSAT|Gambir|Duri Pulo': '10140',
  'JAKARTA PUSAT|Gambir|Cideng': '10150',
  'JAKARTA PUSAT|Gambir|Petojo Selatan': '10160',
  // JAKARTA PUSAT - Tanah Abang
  'JAKARTA PUSAT|Tanah Abang|Bendungan Hilir': '10210',
  'JAKARTA PUSAT|Tanah Abang|Karet Tengsin': '10220',
  'JAKARTA PUSAT|Tanah Abang|Kebon Melati': '10230',
  'JAKARTA PUSAT|Tanah Abang|Kebon Kacang': '10240',
  'JAKARTA PUSAT|Tanah Abang|Kampung Bali': '10250',
  'JAKARTA PUSAT|Tanah Abang|Petamburan': '10260',
  'JAKARTA PUSAT|Tanah Abang|Gelora': '10270',
  // JAKARTA PUSAT - Menteng
  'JAKARTA PUSAT|Menteng|Menteng': '10310',
  'JAKARTA PUSAT|Menteng|Pegangsaan': '10320',
  'JAKARTA PUSAT|Menteng|Cikini': '10330',
  'JAKARTA PUSAT|Menteng|Kebon Sirih': '10340',
  'JAKARTA PUSAT|Menteng|Gondangdia': '10350',
  // JAKARTA PUSAT - Senen
  'JAKARTA PUSAT|Senen|Senen': '10410',
  'JAKARTA PUSAT|Senen|Kwitang': '10420',
  'JAKARTA PUSAT|Senen|Kenari': '10430',
  'JAKARTA PUSAT|Senen|Paseban': '10440',
  'JAKARTA PUSAT|Senen|Kramat': '10450',
  'JAKARTA PUSAT|Senen|Bungur': '10460',
  // JAKARTA PUSAT - Cempaka Putih
  'JAKARTA PUSAT|Cempaka Putih|Cempaka Putih Timur': '10510',
  'JAKARTA PUSAT|Cempaka Putih|Cempaka Putih Barat': '10520',
  'JAKARTA PUSAT|Cempaka Putih|Rawasari': '10570',
  // JAKARTA PUSAT - Johar Baru
  'JAKARTA PUSAT|Johar Baru|Galur': '10530',
  'JAKARTA PUSAT|Johar Baru|Tanah Tinggi': '10540',
  'JAKARTA PUSAT|Johar Baru|Kampung Rawa': '10550',
  'JAKARTA PUSAT|Johar Baru|Johar Baru': '10560',
  // JAKARTA PUSAT - Kemayoran
  'JAKARTA PUSAT|Kemayoran|Gunung Sahari Selatan': '10610',
  'JAKARTA PUSAT|Kemayoran|Kemayoran': '10620',
  'JAKARTA PUSAT|Kemayoran|Kebon Kosong': '10630',
  'JAKARTA PUSAT|Kemayoran|Harapan Mulya': '10640',
  'JAKARTA PUSAT|Kemayoran|Cempaka Baru': '10640',
  'JAKARTA PUSAT|Kemayoran|Utan Panjang': '10650',
  'JAKARTA PUSAT|Kemayoran|Sumur Batu': '10640',
  'JAKARTA PUSAT|Kemayoran|Serdang': '10650',
  // JAKARTA PUSAT - Sawah Besar
  'JAKARTA PUSAT|Sawah Besar|Pasar Baru': '10710',
  'JAKARTA PUSAT|Sawah Besar|Gunung Sahari Utara': '10720',
  'JAKARTA PUSAT|Sawah Besar|Mangga Dua Selatan': '10730',
  'JAKARTA PUSAT|Sawah Besar|Karang Anyar': '10740',
  'JAKARTA PUSAT|Sawah Besar|Kartini': '10750',
  // JAKARTA UTARA - Penjaringan
  'JAKARTA UTARA|Penjaringan|Penjaringan': '14440',
  'JAKARTA UTARA|Penjaringan|Pejagalan': '14440',
  'JAKARTA UTARA|Penjaringan|Pluit': '14450',
  'JAKARTA UTARA|Penjaringan|Kapuk Muara': '14460',
  'JAKARTA UTARA|Penjaringan|Kamal Muara': '14470',
  // JAKARTA UTARA - Pademangan
  'JAKARTA UTARA|Pademangan|Pademangan Barat': '14420',
  'JAKARTA UTARA|Pademangan|Pademangan Timur': '14410',
  'JAKARTA UTARA|Pademangan|Ancol': '14430',
  // JAKARTA UTARA - Tanjung Priok
  'JAKARTA UTARA|Tanjung Priok|Tanjung Priok': '14310',
  'JAKARTA UTARA|Tanjung Priok|Kebon Bawang': '14320',
  'JAKARTA UTARA|Tanjung Priok|Sungai Bambu': '14330',
  'JAKARTA UTARA|Tanjung Priok|Sunter Jaya': '14340',
  'JAKARTA UTARA|Tanjung Priok|Papanggo': '14340',
  'JAKARTA UTARA|Tanjung Priok|Warakas': '14340',
  'JAKARTA UTARA|Tanjung Priok|Sunter Agung': '14350',
  // JAKARTA UTARA - Koja
  'JAKARTA UTARA|Koja|Koja': '14220',
  'JAKARTA UTARA|Koja|Rawa Badak Utara': '14230',
  'JAKARTA UTARA|Koja|Rawa Badak Selatan': '14230',
  'JAKARTA UTARA|Koja|Tugu Utara': '14260',
  'JAKARTA UTARA|Koja|Tugu Selatan': '14260',
  'JAKARTA UTARA|Koja|Lagoa': '14270',
  // JAKARTA UTARA - Kelapa Gading
  'JAKARTA UTARA|Kelapa Gading|Kelapa Gading Barat': '14240',
  'JAKARTA UTARA|Kelapa Gading|Kelapa Gading Timur': '14240',
  'JAKARTA UTARA|Kelapa Gading|Pegangsaan Dua': '14250',
  // JAKARTA UTARA - Cilincing
  'JAKARTA UTARA|Cilincing|Kali Baru': '14110',
  'JAKARTA UTARA|Cilincing|Cilincing': '14120',
  'JAKARTA UTARA|Cilincing|Semper Barat': '14130',
  'JAKARTA UTARA|Cilincing|Semper Timur': '14130',
  'JAKARTA UTARA|Cilincing|Sukapura': '14140',
  'JAKARTA UTARA|Cilincing|Rorotan': '14140',
  'JAKARTA UTARA|Cilincing|Marunda': '14150',
  // JAKARTA BARAT - Taman Sari
  'JAKARTA BARAT|Taman Sari|Pinangsia': '11110',
  'JAKARTA BARAT|Taman Sari|Glodok': '11120',
  'JAKARTA BARAT|Taman Sari|Keagungan': '11130',
  'JAKARTA BARAT|Taman Sari|Krukut': '11140',
  'JAKARTA BARAT|Taman Sari|Taman Sari': '11150',
  'JAKARTA BARAT|Taman Sari|Mangga Besar': '11180',
  'JAKARTA BARAT|Taman Sari|Maphar': '11160',
  'JAKARTA BARAT|Taman Sari|Tangki': '11160',
  // JAKARTA BARAT - Tambora
  'JAKARTA BARAT|Tambora|Pekojan': '11240',
  'JAKARTA BARAT|Tambora|Roa Malaka': '11230',
  'JAKARTA BARAT|Tambora|Tambora': '11230',
  'JAKARTA BARAT|Tambora|Jembatan Lima': '11250',
  'JAKARTA BARAT|Tambora|Duri Selatan': '11270',
  'JAKARTA BARAT|Tambora|Kali Anyar': '11310',
  'JAKARTA BARAT|Tambora|Jembatan Besi': '11320',
  'JAKARTA BARAT|Tambora|Angke': '11330',
  'JAKARTA BARAT|Tambora|Duri Utara': '11260',
  // JAKARTA BARAT - Palmerah
  'JAKARTA BARAT|Palmerah|Slipi': '11410',
  'JAKARTA BARAT|Palmerah|Kota Bambu Utara': '11420',
  'JAKARTA BARAT|Palmerah|Kota Bambu Selatan': '11420',
  'JAKARTA BARAT|Palmerah|Jati Pulo': '11430',
  'JAKARTA BARAT|Palmerah|Kemanggisan': '11480',
  'JAKARTA BARAT|Palmerah|Palmerah': '11480',
  // JAKARTA BARAT - Grogol Petamburan
  'JAKARTA BARAT|Grogol Petamburan|Tomang': '11440',
  'JAKARTA BARAT|Grogol Petamburan|Grogol': '11450',
  'JAKARTA BARAT|Grogol Petamburan|Jelambar': '11460',
  'JAKARTA BARAT|Grogol Petamburan|Jelambar Baru': '11460',
  'JAKARTA BARAT|Grogol Petamburan|Wijaya Kusuma': '11460',
  'JAKARTA BARAT|Grogol Petamburan|Tanjung Duren Utara': '11470',
  'JAKARTA BARAT|Grogol Petamburan|Tanjung Duren Selatan': '11470',
  // JAKARTA BARAT - Kebon Jeruk
  'JAKARTA BARAT|Kebon Jeruk|Duri Kepa': '11510',
  'JAKARTA BARAT|Kebon Jeruk|Kedoya Utara': '11520',
  'JAKARTA BARAT|Kebon Jeruk|Kedoya Selatan': '11520',
  'JAKARTA BARAT|Kebon Jeruk|Kebon Jeruk': '11530',
  'JAKARTA BARAT|Kebon Jeruk|Sukabumi Utara': '11540',
  'JAKARTA BARAT|Kebon Jeruk|Sukabumi Selatan': '11540',
  'JAKARTA BARAT|Kebon Jeruk|Kelapa Dua': '11550',
  // JAKARTA BARAT - Kembangan
  'JAKARTA BARAT|Kembangan|Kembangan Utara': '11610',
  'JAKARTA BARAT|Kembangan|Kembangan Selatan': '11610',
  'JAKARTA BARAT|Kembangan|Meruya Utara': '11620',
  'JAKARTA BARAT|Kembangan|Srengseng': '11630',
  'JAKARTA BARAT|Kembangan|Joglo': '11640',
  'JAKARTA BARAT|Kembangan|Meruya Selatan': '11650',
  // JAKARTA BARAT - Kalideres
  'JAKARTA BARAT|Kalideres|Kamal': '11810',
  'JAKARTA BARAT|Kalideres|Tegal Alur': '11820',
  'JAKARTA BARAT|Kalideres|Pegadungan': '11830',
  'JAKARTA BARAT|Kalideres|Kalideres': '11840',
  'JAKARTA BARAT|Kalideres|Semanan': '11850',
  // JAKARTA BARAT - Cengkareng
  'JAKARTA BARAT|Cengkareng|Cengkareng Barat': '11730',
  'JAKARTA BARAT|Cengkareng|Cengkareng Timur': '11730',
  'JAKARTA BARAT|Cengkareng|Kapuk': '11720',
  'JAKARTA BARAT|Cengkareng|Kedaung Kali Angke': '11710',
  'JAKARTA BARAT|Cengkareng|Rawa Buaya': '11740',
  'JAKARTA BARAT|Cengkareng|Duri Kosambi': '11750',
  // JAKARTA SELATAN - Kebayoran Baru
  'JAKARTA SELATAN|Kebayoran Baru|Selong': '12110',
  'JAKARTA SELATAN|Kebayoran Baru|Gunung': '12120',
  'JAKARTA SELATAN|Kebayoran Baru|Kramat Pela': '12130',
  'JAKARTA SELATAN|Kebayoran Baru|Gandaria Utara': '12140',
  'JAKARTA SELATAN|Kebayoran Baru|Cipete Utara': '12150',
  'JAKARTA SELATAN|Kebayoran Baru|Melawai': '12160',
  'JAKARTA SELATAN|Kebayoran Baru|Petogogan': '12170',
  'JAKARTA SELATAN|Kebayoran Baru|Rawa Barat': '12180',
  'JAKARTA SELATAN|Kebayoran Baru|Senayan': '12190',
  'JAKARTA SELATAN|Kebayoran Baru|Pulo': '12160',
  // JAKARTA SELATAN - Kebayoran Lama
  'JAKARTA SELATAN|Kebayoran Lama|Grogol Utara': '12210',
  'JAKARTA SELATAN|Kebayoran Lama|Grogol Selatan': '12220',
  'JAKARTA SELATAN|Kebayoran Lama|Cipulir': '12230',
  'JAKARTA SELATAN|Kebayoran Lama|Kebayoran Lama Utara': '12240',
  'JAKARTA SELATAN|Kebayoran Lama|Kebayoran Lama Selatan': '12240',
  'JAKARTA SELATAN|Kebayoran Lama|Pondok Pinang': '12310',
  // JAKARTA SELATAN - Pesanggrahan
  'JAKARTA SELATAN|Pesanggrahan|Pesanggrahan': '12320',
  'JAKARTA SELATAN|Pesanggrahan|Bintaro': '12330',
  'JAKARTA SELATAN|Pesanggrahan|Ulujami': '12250',
  'JAKARTA SELATAN|Pesanggrahan|Petukangan Utara': '12260',
  'JAKARTA SELATAN|Pesanggrahan|Petukangan Selatan': '12270',
  // JAKARTA SELATAN - Cilandak
  'JAKARTA SELATAN|Cilandak|Lebak Bulus': '12440',
  'JAKARTA SELATAN|Cilandak|Cilandak Barat': '12430',
  'JAKARTA SELATAN|Cilandak|Gandaria Selatan': '12420',
  'JAKARTA SELATAN|Cilandak|Cipete Selatan': '12410',
  'JAKARTA SELATAN|Cilandak|Pondok Labu': '12450',
  // JAKARTA SELATAN - Pasar Minggu
  'JAKARTA SELATAN|Pasar Minggu|Pejaten Barat': '12510',
  'JAKARTA SELATAN|Pasar Minggu|Pejaten Timur': '12510',
  'JAKARTA SELATAN|Pasar Minggu|Pasar Minggu': '12520',
  'JAKARTA SELATAN|Pasar Minggu|Kebagusan': '12520',
  'JAKARTA SELATAN|Pasar Minggu|Tanjung Barat': '12530',
  'JAKARTA SELATAN|Pasar Minggu|Jati Padang': '12540',
  'JAKARTA SELATAN|Pasar Minggu|Ragunan': '12550',
  'JAKARTA SELATAN|Pasar Minggu|Cilandak Timur': '12560',
  // JAKARTA SELATAN - Jagakarsa
  'JAKARTA SELATAN|Jagakarsa|Lenteng Agung': '12610',
  'JAKARTA SELATAN|Jagakarsa|Jagakarsa': '12620',
  'JAKARTA SELATAN|Jagakarsa|Ciganjur': '12630',
  'JAKARTA SELATAN|Jagakarsa|Cipedak': '12630',
  'JAKARTA SELATAN|Jagakarsa|Srengseng Sawah': '12640',
  // JAKARTA SELATAN - Mampang Prapatan
  'JAKARTA SELATAN|Mampang Prapatan|Kuningan Barat': '12710',
  'JAKARTA SELATAN|Mampang Prapatan|Bangka': '12720',
  'JAKARTA SELATAN|Mampang Prapatan|Pela Mampang': '12720',
  'JAKARTA SELATAN|Mampang Prapatan|Tegal Parang': '12790',
  'JAKARTA SELATAN|Mampang Prapatan|Mampang Prapatan': '12790',
  // JAKARTA SELATAN - Pancoran
  'JAKARTA SELATAN|Pancoran|Duren Tiga': '12760',
  'JAKARTA SELATAN|Pancoran|Pancoran': '12780',
  'JAKARTA SELATAN|Pancoran|Kalibata': '12750',
  'JAKARTA SELATAN|Pancoran|Rawajati': '12750',
  'JAKARTA SELATAN|Pancoran|Pengadegan': '12770',
  'JAKARTA SELATAN|Pancoran|Cikoko': '12770',
  // JAKARTA SELATAN - Tebet
  'JAKARTA SELATAN|Tebet|Manggarai': '12850',
  'JAKARTA SELATAN|Tebet|Manggarai Selatan': '12860',
  'JAKARTA SELATAN|Tebet|Menteng Dalam': '12870',
  'JAKARTA SELATAN|Tebet|Tebet Barat': '12810',
  'JAKARTA SELATAN|Tebet|Tebet Timur': '12820',
  'JAKARTA SELATAN|Tebet|Kebon Baru': '12830',
  'JAKARTA SELATAN|Tebet|Bukit Duri': '12840',
  // JAKARTA SELATAN - Setiabudi
  'JAKARTA SELATAN|Setiabudi|Setiabudi': '12910',
  'JAKARTA SELATAN|Setiabudi|Karet': '12920',
  'JAKARTA SELATAN|Setiabudi|Karet Semanggi': '12930',
  'JAKARTA SELATAN|Setiabudi|Karet Kuningan': '12940',
  'JAKARTA SELATAN|Setiabudi|Kuningan Timur': '12950',
  'JAKARTA SELATAN|Setiabudi|Menteng Atas': '12960',
  'JAKARTA SELATAN|Setiabudi|Pasar Manggis': '12970',
  'JAKARTA SELATAN|Setiabudi|Guntur': '12980',
  // JAKARTA TIMUR - Matraman
  'JAKARTA TIMUR|Matraman|Pisangan Baru': '13110',
  'JAKARTA TIMUR|Matraman|Utan Kayu Utara': '13120',
  'JAKARTA TIMUR|Matraman|Utan Kayu Selatan': '13130',
  'JAKARTA TIMUR|Matraman|Matraman': '13140',
  'JAKARTA TIMUR|Matraman|Palmeriam': '13140',
  'JAKARTA TIMUR|Matraman|Kayu Manis': '13150',
  'JAKARTA TIMUR|Matraman|Kebon Manggis': '13150',
  // JAKARTA TIMUR - Pulo Gadung
  'JAKARTA TIMUR|Pulo Gadung|Pisangan Timur': '13230',
  'JAKARTA TIMUR|Pulo Gadung|Cipinang': '13240',
  'JAKARTA TIMUR|Pulo Gadung|Rawamangun': '13220',
  'JAKARTA TIMUR|Pulo Gadung|Kayu Putih': '13210',
  'JAKARTA TIMUR|Pulo Gadung|Pulo Gadung': '13210',
  'JAKARTA TIMUR|Pulo Gadung|Jati': '13220',
  // JAKARTA TIMUR - Jatinegara
  'JAKARTA TIMUR|Jatinegara|Cipinang Cempedak': '13340',
  'JAKARTA TIMUR|Jatinegara|Rawa Bunga': '13320',
  'JAKARTA TIMUR|Jatinegara|Kampung Melayu': '13330',
  'JAKARTA TIMUR|Jatinegara|Jatinegara': '13310',
  'JAKARTA TIMUR|Jatinegara|Bali Mester': '13310',
  'JAKARTA TIMUR|Jatinegara|Cipinang Besar Utara': '13410',
  'JAKARTA TIMUR|Jatinegara|Cipinang Besar Selatan': '13410',
  'JAKARTA TIMUR|Jatinegara|Cipinang Muara': '13420',
  // JAKARTA TIMUR - Duren Sawit
  'JAKARTA TIMUR|Duren Sawit|Pondok Bambu': '13430',
  'JAKARTA TIMUR|Duren Sawit|Duren Sawit': '13440',
  'JAKARTA TIMUR|Duren Sawit|Pondok Kelapa': '13450',
  'JAKARTA TIMUR|Duren Sawit|Klender': '13460',
  'JAKARTA TIMUR|Duren Sawit|Pondok Kopi': '13460',
  'JAKARTA TIMUR|Duren Sawit|Malaka Jaya': '13470',
  'JAKARTA TIMUR|Duren Sawit|Malaka Sari': '13470',
  // JAKARTA TIMUR - Kramat Jati
  'JAKARTA TIMUR|Kramat Jati|Kramat Jati': '13510',
  'JAKARTA TIMUR|Kramat Jati|Batu Ampar': '13520',
  'JAKARTA TIMUR|Kramat Jati|Balekambang': '13530',
  'JAKARTA TIMUR|Kramat Jati|Dukuh': '13550',
  'JAKARTA TIMUR|Kramat Jati|Cawang': '13630',
  'JAKARTA TIMUR|Kramat Jati|Cililitan': '13640',
  // JAKARTA TIMUR - Makasar
  'JAKARTA TIMUR|Makasar|Pinang Ranti': '13560',
  'JAKARTA TIMUR|Makasar|Makasar': '13570',
  'JAKARTA TIMUR|Makasar|Cipinang Melayu': '13620',
  'JAKARTA TIMUR|Makasar|Kebon Pala': '13650',
  'JAKARTA TIMUR|Makasar|Halim Perdana Kusuma': '13650',
  // JAKARTA TIMUR - Pasar Rebo
  'JAKARTA TIMUR|Pasar Rebo|Gedong': '13760',
  'JAKARTA TIMUR|Pasar Rebo|Pasar Rebo': '13760',
  'JAKARTA TIMUR|Pasar Rebo|Baru': '13770',
  'JAKARTA TIMUR|Pasar Rebo|Cijantung': '13770',
  'JAKARTA TIMUR|Pasar Rebo|Kalisari': '13780',
  // JAKARTA TIMUR - Ciracas
  'JAKARTA TIMUR|Ciracas|Cibubur': '13720',
  'JAKARTA TIMUR|Ciracas|Kelapa Dua Wetan': '13730',
  'JAKARTA TIMUR|Ciracas|Ciracas': '13740',
  'JAKARTA TIMUR|Ciracas|Susukan': '13750',
  'JAKARTA TIMUR|Ciracas|Rambutan': '13830',
  // JAKARTA TIMUR - Cipayung
  'JAKARTA TIMUR|Cipayung|Lubang Buaya': '13810',
  'JAKARTA TIMUR|Cipayung|Cipayung': '13840',
  'JAKARTA TIMUR|Cipayung|Ceger': '13845',
  'JAKARTA TIMUR|Cipayung|Munjul': '13850',
  'JAKARTA TIMUR|Cipayung|Pondok Rangon': '13860',
  'JAKARTA TIMUR|Cipayung|Cilangkap': '13870',
  'JAKARTA TIMUR|Cipayung|Setu': '13880',
  'JAKARTA TIMUR|Cipayung|Bambu Apus': '13890',
  // JAKARTA TIMUR - Cakung
  'JAKARTA TIMUR|Cakung|Cakung Barat': '13910',
  'JAKARTA TIMUR|Cakung|Cakung Timur': '13910',
  'JAKARTA TIMUR|Cakung|Rawa Terate': '13920',
  'JAKARTA TIMUR|Cakung|Jatinegara Kaum': '13930',
  'JAKARTA TIMUR|Cakung|Penggilingan': '13940',
  'JAKARTA TIMUR|Cakung|Pulo Gebang': '13950',
  // KOTA TANGERANG - Tangerang
  'TANGERANG|Tangerang|Sukarasa': '15111',
  'TANGERANG|Tangerang|Sukasari': '15111',
  'TANGERANG|Tangerang|Buaran Indah': '15119',
  'TANGERANG|Tangerang|Tanah Tinggi': '15119',
  'TANGERANG|Tangerang|Babakan': '15118',
  'TANGERANG|Tangerang|Kelapa Indah': '15119',
  // KOTA TANGERANG - Karawaci
  'TANGERANG|Karawaci|Karawaci': '15116',
  'TANGERANG|Karawaci|Karawaci Baru': '15116',
  'TANGERANG|Karawaci|Nambo Jaya': '15116',
  'TANGERANG|Karawaci|Koang Jaya': '15112',
  'TANGERANG|Karawaci|Pabuaran': '15112',
  'TANGERANG|Karawaci|Pabuaran Tumpeng': '15112',
  'TANGERANG|Karawaci|Cimone': '15114',
  'TANGERANG|Karawaci|Cimone Jaya': '15114',
  'TANGERANG|Karawaci|Sumur Pacing': '15113',
  'TANGERANG|Karawaci|Margasari': '15113',
  'TANGERANG|Karawaci|Gerendeng': '15111',
  // KOTA TANGERANG - Periuk
  'TANGERANG|Periuk|Periuk': '15131',
  'TANGERANG|Periuk|Periuk Jaya': '15131',
  'TANGERANG|Periuk|Gembor': '15132',
  'TANGERANG|Periuk|Sangiang Jaya': '15132',
  // KOTA TANGERANG - Batuceper
  'TANGERANG|Batuceper|Batuceper': '15121',
  'TANGERANG|Batuceper|Batu Jaya': '15121',
  'TANGERANG|Batuceper|Batu Sari': '15121',
  'TANGERANG|Batuceper|Kebon Besar': '15122',
  'TANGERANG|Batuceper|Poris Jaya': '15122',
  'TANGERANG|Batuceper|Poris Plawad': '15123',
  'TANGERANG|Batuceper|Poris Plawad Indah': '15123',
  'TANGERANG|Batuceper|Poris Plawad Utara': '15123',
  // KOTA TANGERANG - Benda
  'TANGERANG|Benda|Benda': '15125',
  'TANGERANG|Benda|Jurumudi': '15125',
  'TANGERANG|Benda|Jurumudi Baru': '15125',
  'TANGERANG|Benda|Pajang': '15125',
  // KOTA TANGERANG - Cipondoh
  'TANGERANG|Cipondoh|Cipondoh': '15148',
  'TANGERANG|Cipondoh|Cipondoh Indah': '15148',
  'TANGERANG|Cipondoh|Cipondoh Makmur': '15148',
  'TANGERANG|Cipondoh|Gondrong': '15146',
  'TANGERANG|Cipondoh|Ketapang': '15147',
  'TANGERANG|Cipondoh|Poris Gaga': '15143',
  'TANGERANG|Cipondoh|Poris Gaga Baru': '15143',
  'TANGERANG|Cipondoh|Kenanga': '15148',
  // KOTA TANGERANG - Pinang
  'TANGERANG|Pinang|Pinang': '15151',
  'TANGERANG|Pinang|Neroktog': '15151',
  'TANGERANG|Pinang|Pakojan': '15151',
  'TANGERANG|Pinang|Sudimara Barat': '15153',
  'TANGERANG|Pinang|Sudimara Timur': '15153',
  'TANGERANG|Pinang|Sudimara Selatan': '15154',
  'TANGERANG|Pinang|Sudimara Jaya': '15154',
  'TANGERANG|Pinang|Kunciran': '15155',
  'TANGERANG|Pinang|Kunciran Indah': '15155',
  'TANGERANG|Pinang|Kunciran Jaya': '15155',
  // KOTA TANGERANG - Karang Tengah
  'TANGERANG|Karang Tengah|Karang Tengah': '15157',
  'TANGERANG|Karang Tengah|Karang Mulya': '15157',
  'TANGERANG|Karang Tengah|Karang Timur': '15157',
  'TANGERANG|Karang Tengah|Pedurenan': '15156',
  'TANGERANG|Karang Tengah|Parung Jaya': '15156',
  'TANGERANG|Karang Tengah|Pondok Bahar': '15156',
  // KOTA TANGERANG - Ciledug
  'TANGERANG|Ciledug|Ciledug': '15153',
  'TANGERANG|Ciledug|Paninggilan': '15152',
  'TANGERANG|Ciledug|Paninggilan Utara': '15152',
  'TANGERANG|Ciledug|Tajur': '15152',
  'TANGERANG|Ciledug|Parung Serab': '15153',
  // KOTA TANGERANG - Larangan
  'TANGERANG|Larangan|Larangan': '15154',
  'TANGERANG|Larangan|Larangan Selatan': '15154',
  'TANGERANG|Larangan|Larangan Utara': '15154',
  'TANGERANG|Larangan|Kreo': '15156',
  'TANGERANG|Larangan|Kreo Selatan': '15156',
  'TANGERANG|Larangan|Gaga': '15156',
  // KOTA TANGERANG - Jatiuwung
  'TANGERANG|Jatiuwung|Jatiuwung': '15135',
  'TANGERANG|Jatiuwung|Keroncong': '15135',
  'TANGERANG|Jatiuwung|Pasir Jaya': '15135',
  'TANGERANG|Jatiuwung|Alam Jaya': '15136',
  'TANGERANG|Jatiuwung|Gandasari': '15136',
  'TANGERANG|Jatiuwung|Manis Jaya': '15136',
  // KOTA TANGERANG - Neglasari
  'TANGERANG|Neglasari|Neglasari': '15129',
  'TANGERANG|Neglasari|Karang Sari': '15129',
  'TANGERANG|Neglasari|Karang Anyar': '15129',
  'TANGERANG|Neglasari|Mekarsari': '15129',
  'TANGERANG|Neglasari|Selapajang Jaya': '15129',
  'TANGERANG|Neglasari|Kedaung Wetan': '15128',
  'TANGERANG|Neglasari|Tugu': '15128',
  // TANGERANG SELATAN - Serpong
  'TANGERANG SELATAN|Serpong|Serpong': '15310',
  'TANGERANG SELATAN|Serpong|Buaran': '15310',
  'TANGERANG SELATAN|Serpong|Cilenggang': '15310',
  'TANGERANG SELATAN|Serpong|Ciater': '15310',
  'TANGERANG SELATAN|Serpong|Rawa Mekar Jaya': '15311',
  'TANGERANG SELATAN|Serpong|Rawa Buntu': '15311',
  'TANGERANG SELATAN|Serpong|Lengkong Gudang': '15310',
  'TANGERANG SELATAN|Serpong|Lengkong Gudang Timur': '15310',
  'TANGERANG SELATAN|Serpong|Lengkong Wetan': '15310',
  // TANGERANG SELATAN - Serpong Utara
  'TANGERANG SELATAN|Serpong Utara|Jelupang': '15321',
  'TANGERANG SELATAN|Serpong Utara|Pakualam': '15321',
  'TANGERANG SELATAN|Serpong Utara|Pakujaya': '15322',
  'TANGERANG SELATAN|Serpong Utara|Pondok Jagung': '15322',
  'TANGERANG SELATAN|Serpong Utara|Pondok Jagung Timur': '15322',
  'TANGERANG SELATAN|Serpong Utara|Pakulonan': '15322',
  'TANGERANG SELATAN|Serpong Utara|Paku Jaya': '15322',
  // TANGERANG SELATAN - Ciputat
  'TANGERANG SELATAN|Ciputat|Ciputat': '15411',
  'TANGERANG SELATAN|Ciputat|Sawah': '15413',
  'TANGERANG SELATAN|Ciputat|Sawah Lama': '15413',
  'TANGERANG SELATAN|Ciputat|Serua': '15414',
  'TANGERANG SELATAN|Ciputat|Jombang': '15414',
  'TANGERANG SELATAN|Ciputat|Cipayung': '15411',
  'TANGERANG SELATAN|Ciputat|Ciputat Baru': '15412',
  // TANGERANG SELATAN - Ciputat Timur
  'TANGERANG SELATAN|Ciputat Timur|Rengas': '15412',
  'TANGERANG SELATAN|Ciputat Timur|Rempoa': '15412',
  'TANGERANG SELATAN|Ciputat Timur|Pisangan': '15419',
  'TANGERANG SELATAN|Ciputat Timur|Cempaka Putih': '15412',
  'TANGERANG SELATAN|Ciputat Timur|Pondok Ranji': '15412',
  'TANGERANG SELATAN|Ciputat Timur|Parigi': '15414',
  // TANGERANG SELATAN - Pamulang
  'TANGERANG SELATAN|Pamulang|Pamulang Barat': '15417',
  'TANGERANG SELATAN|Pamulang|Pamulang Timur': '15417',
  'TANGERANG SELATAN|Pamulang|Pondok Benda': '15416',
  'TANGERANG SELATAN|Pamulang|Pondok Cabe Ilir': '15418',
  'TANGERANG SELATAN|Pamulang|Pondok Cabe Udik': '15418',
  'TANGERANG SELATAN|Pamulang|Benda Baru': '15416',
  'TANGERANG SELATAN|Pamulang|Kedaung': '15415',
  'TANGERANG SELATAN|Pamulang|Bambu Apus': '15415',
  // TANGERANG SELATAN - Pondok Aren
  'TANGERANG SELATAN|Pondok Aren|Pondok Aren': '15224',
  'TANGERANG SELATAN|Pondok Aren|Pondok Jaya': '15224',
  'TANGERANG SELATAN|Pondok Aren|Pondok Karya': '15225',
  'TANGERANG SELATAN|Pondok Aren|Pondok Pucung': '15227',
  'TANGERANG SELATAN|Pondok Aren|Pondok Kacang Barat': '15226',
  'TANGERANG SELATAN|Pondok Aren|Pondok Kacang Timur': '15226',
  'TANGERANG SELATAN|Pondok Aren|Pondok Kacang Prima': '15226',
  'TANGERANG SELATAN|Pondok Aren|Jurang Mangu Barat': '15222',
  'TANGERANG SELATAN|Pondok Aren|Jurang Mangu Timur': '15222',
  'TANGERANG SELATAN|Pondok Aren|Perigi': '15228',
  'TANGERANG SELATAN|Pondok Aren|Perigi Baru': '15228',
  // TANGERANG SELATAN - Setu
  'TANGERANG SELATAN|Setu|Setu': '15315',
  'TANGERANG SELATAN|Setu|Bakti Jaya': '15315',
  'TANGERANG SELATAN|Setu|Kademangan': '15316',
  'TANGERANG SELATAN|Setu|Keranggan': '15316',
  'TANGERANG SELATAN|Setu|Muncul': '15316',
  'TANGERANG SELATAN|Setu|Babakan': '15315',
  // BOGOR - Bogor Tengah
  'BOGOR|Bogor Tengah|Paledang': '16121',
  'BOGOR|Bogor Tengah|Sempur': '16129',
  'BOGOR|Bogor Tengah|Tegallega': '16127',
  'BOGOR|Bogor Tengah|Babakan': '16128',
  'BOGOR|Bogor Tengah|Babakan Pasar': '16128',
  'BOGOR|Bogor Tengah|Gudang': '16123',
  'BOGOR|Bogor Tengah|Cibogor': '16124',
  'BOGOR|Bogor Tengah|Kebon Kalapa': '16111',
  'BOGOR|Bogor Tengah|Panaragan': '16126',
  'BOGOR|Bogor Tengah|Ciwaringin': '16125',
  // BOGOR - Bogor Barat
  'BOGOR|Bogor Barat|Pasir Kuda': '16115',
  'BOGOR|Bogor Barat|Semplak': '16116',
  'BOGOR|Bogor Barat|Sindang Barang': '16117',
  'BOGOR|Bogor Barat|Menteng': '16111',
  'BOGOR|Bogor Barat|Cilendek Barat': '16112',
  'BOGOR|Bogor Barat|Cilendek Timur': '16112',
  'BOGOR|Bogor Barat|Curug': '16113',
  'BOGOR|Bogor Barat|Curugmekar': '16113',
  'BOGOR|Bogor Barat|Loji': '16116',
  'BOGOR|Bogor Barat|Pasir Jaya': '16115',
  'BOGOR|Bogor Barat|Gunung Batu': '16119',
  'BOGOR|Bogor Barat|Margajaya': '16116',
  // BOGOR - Bogor Timur
  'BOGOR|Bogor Timur|Katulampa': '16144',
  'BOGOR|Bogor Timur|Sukasari': '16143',
  'BOGOR|Bogor Timur|Baranang Siang': '16143',
  'BOGOR|Bogor Timur|Sindangrasa': '16143',
  'BOGOR|Bogor Timur|Tajur': '16144',
  'BOGOR|Bogor Timur|Sindangsari': '16143',
  // BOGOR - Bogor Selatan
  'BOGOR|Bogor Selatan|Empang': '16133',
  'BOGOR|Bogor Selatan|Bondongan': '16132',
  'BOGOR|Bogor Selatan|Cikaret': '16132',
  'BOGOR|Bogor Selatan|Lawang Gintung': '16133',
  'BOGOR|Bogor Selatan|Pakuan': '16143',
  'BOGOR|Bogor Selatan|Parung Banteng': '16132',
  'BOGOR|Bogor Selatan|Pamoyanan': '16132',
  'BOGOR|Bogor Selatan|Genteng': '16134',
  'BOGOR|Bogor Selatan|Harjasari': '16134',
  'BOGOR|Bogor Selatan|Muarasari': '16134',
  'BOGOR|Bogor Selatan|Rancamaya': '16134',
  // BOGOR - Bogor Utara
  'BOGOR|Bogor Utara|Tanah Baru': '16152',
  'BOGOR|Bogor Utara|Ciluar': '16153',
  'BOGOR|Bogor Utara|Cibuluh': '16153',
  'BOGOR|Bogor Utara|Bantarjati': '16153',
  'BOGOR|Bogor Utara|Tegalgundil': '16152',
  'BOGOR|Bogor Utara|Kedunghalang': '16161',
  'BOGOR|Bogor Utara|Cimahpar': '16162',
  // BOGOR - Tanah Sareal
  'BOGOR|Tanah Sareal|Kayumanis': '16168',
  'BOGOR|Tanah Sareal|Kedung Jaya': '16166',
  'BOGOR|Tanah Sareal|Kedung Waringin': '16166',
  'BOGOR|Tanah Sareal|Kebon Pedes': '16165',
  'BOGOR|Tanah Sareal|Tanah Sareal': '16163',
  'BOGOR|Tanah Sareal|Sukaresmi': '16163',
  'BOGOR|Tanah Sareal|Cibadak': '16169',
  'BOGOR|Tanah Sareal|Mekarwangi': '16167',
  'BOGOR|Tanah Sareal|Kencana': '16167',
  // BEKASI - Bekasi Timur
  'BEKASI|Bekasi Timur|Aren Jaya': '17111',
  'BEKASI|Bekasi Timur|Duren Jaya': '17111',
  'BEKASI|Bekasi Timur|Bekasi Jaya': '17112',
  'BEKASI|Bekasi Timur|Margahayu': '17113',
  // BEKASI - Bekasi Barat
  'BEKASI|Bekasi Barat|Bintara': '17134',
  'BEKASI|Bekasi Barat|Bintara Jaya': '17134',
  'BEKASI|Bekasi Barat|Kranji': '17135',
  'BEKASI|Bekasi Barat|Kotabaru': '17135',
  'BEKASI|Bekasi Barat|Jakasampurna': '17145',
  // BEKASI - Bekasi Selatan
  'BEKASI|Bekasi Selatan|Pekayon Jaya': '17148',
  'BEKASI|Bekasi Selatan|Kayuringin Jaya': '17144',
  'BEKASI|Bekasi Selatan|Jaka Mulya': '17147',
  'BEKASI|Bekasi Selatan|Jaka Setia': '17147',
  // BEKASI - Bekasi Utara
  'BEKASI|Bekasi Utara|Marga Mulya': '17142',
  'BEKASI|Bekasi Utara|Harapan Baru': '17142',
  'BEKASI|Bekasi Utara|Perwira': '17141',
  'BEKASI|Bekasi Utara|Harapan Jaya': '17141',
  'BEKASI|Bekasi Utara|Kaliabang Tengah': '17143',
  'BEKASI|Bekasi Utara|Teluk Pucung': '17143',
  // BEKASI - Pondokgede
  'BEKASI|Pondokgede|Jatiwaringin': '17411',
  'BEKASI|Pondokgede|Jatibening': '17412',
  'BEKASI|Pondokgede|Jatibening Baru': '17412',
  'BEKASI|Pondokgede|Jatimakmur': '17413',
  'BEKASI|Pondokgede|Pondokgede': '17414',
  // BEKASI - Pondokmelati
  'BEKASI|Pondokmelati|Jatirahayu': '17414',
  'BEKASI|Pondokmelati|Jatimelati': '17415',
  'BEKASI|Pondokmelati|Jatiwarna': '17415',
  'BEKASI|Pondokmelati|Jatimurni': '17416',
  // BEKASI - Jatiasih
  'BEKASI|Jatiasih|Jatiasih': '17423',
  'BEKASI|Jatiasih|Jatisari': '17426',
  'BEKASI|Jatiasih|Jatiluhur': '17424',
  'BEKASI|Jatiasih|Jatikramat': '17421',
  'BEKASI|Jatiasih|Jatirangga': '17422',
  'BEKASI|Jatiasih|Jatiranggon': '17425',
  // BEKASI - Bantargebang
  'BEKASI|Bantargebang|Bantargebang': '17310',
  'BEKASI|Bantargebang|Cikiwul': '17310',
  'BEKASI|Bantargebang|Ciketing Udik': '17310',
  'BEKASI|Bantargebang|Sumur Batu': '17310',
  // BEKASI - Mustikajaya
  'BEKASI|Mustikajaya|Mustika Jaya': '17158',
  'BEKASI|Mustikajaya|Mustika Sari': '17158',
  'BEKASI|Mustikajaya|Pedurenan': '17157',
  'BEKASI|Mustikajaya|Cimuning': '17156',
  // BEKASI - Medansatria
  'BEKASI|Medansatria|Medan Satria': '17132',
  'BEKASI|Medansatria|Pejuang': '17132',
  'BEKASI|Medansatria|Kalibaru': '17133',
  'BEKASI|Medansatria|Harapan Mulya': '17133',
  // BEKASI - Rawalumbu
  'BEKASI|Rawalumbu|Bojong Menteng': '17117',
  'BEKASI|Rawalumbu|Pengasinan': '17116',
  'BEKASI|Rawalumbu|Sepanjang Jaya': '17114',
  'BEKASI|Rawalumbu|Bojong Rawalumbu': '17116',
  // BEKASI - Jatisampurna
  'BEKASI|Jatisampurna|Jatisampurna': '17433',
  'BEKASI|Jatisampurna|Jatirangon': '17431',
  'BEKASI|Jatisampurna|Jatikarya': '17435',
  'BEKASI|Jatisampurna|Cijantung': '17432',
  'BEKASI|Jatisampurna|Cibubur': '17434',
  // DEPOK - Beji
  'DEPOK|Beji|Beji': '16421',
  'DEPOK|Beji|Beji Timur': '16421',
  'DEPOK|Beji|Kemiri Muka': '16421',
  'DEPOK|Beji|Kukusan': '16425',
  'DEPOK|Beji|Tanah Baru': '16426',
  'DEPOK|Beji|Pondok Cina': '16424',
  // DEPOK - Pancoran Mas
  'DEPOK|Pancoran Mas|Depok': '16431',
  'DEPOK|Pancoran Mas|Depok Jaya': '16432',
  'DEPOK|Pancoran Mas|Pancoran Mas': '16436',
  'DEPOK|Pancoran Mas|Mampang': '16433',
  'DEPOK|Pancoran Mas|Rangkapan Jaya': '16434',
  'DEPOK|Pancoran Mas|Rangkapan Jaya Baru': '16435',
  // DEPOK - Sukmajaya
  'DEPOK|Sukmajaya|Sukmajaya': '16412',
  'DEPOK|Sukmajaya|Abadijaya': '16417',
  'DEPOK|Sukmajaya|Baktijaya': '16418',
  'DEPOK|Sukmajaya|Mekarjaya': '16411',
  'DEPOK|Sukmajaya|Tirta Jaya': '16412',
  // DEPOK - Cimanggis
  'DEPOK|Cimanggis|Tugu': '16451',
  'DEPOK|Cimanggis|Mekarsari': '16452',
  'DEPOK|Cimanggis|Curug': '16453',
  'DEPOK|Cimanggis|Harjamukti': '16454',
  'DEPOK|Cimanggis|Cisalak': '16451',
  'DEPOK|Cimanggis|Cimpaeun': '16455',
  'DEPOK|Cimanggis|Leuwinanggung': '16456',
  // DEPOK - Cilodong
  'DEPOK|Cilodong|Cilodong': '16414',
  'DEPOK|Cilodong|Kalimulya': '16413',
  'DEPOK|Cilodong|Kalibaru': '16413',
  'DEPOK|Cilodong|Jatimulya': '16413',
  'DEPOK|Cilodong|Sudimara Jaya': '16415',
  // DEPOK - Limo
  'DEPOK|Limo|Limo': '16513',
  'DEPOK|Limo|Meruyung': '16513',
  'DEPOK|Limo|Grogol': '16512',
  'DEPOK|Limo|Krukut': '16511',
  // DEPOK - Cinere
  'DEPOK|Cinere|Cinere': '16514',
  'DEPOK|Cinere|Gandul': '16514',
  'DEPOK|Cinere|Pangkalan Jati': '16516',
  'DEPOK|Cinere|Pangkalan Jati Baru': '16516',
  // DEPOK - Sawangan
  'DEPOK|Sawangan|Sawangan': '16519',
  'DEPOK|Sawangan|Sawangan Baru': '16519',
  'DEPOK|Sawangan|Duren Mekar': '16511',
  'DEPOK|Sawangan|Duren Seribu': '16511',
  'DEPOK|Sawangan|Kedaung': '16516',
  'DEPOK|Sawangan|Pasir Putih': '16519',
  'DEPOK|Sawangan|Pengasinan': '16511',
  // DEPOK - Bojongsari
  'DEPOK|Bojongsari|Bojongsari Baru': '16517',
  'DEPOK|Bojongsari|Bojongsari Lama': '16517',
  'DEPOK|Bojongsari|Pondok Petir': '16517',
  'DEPOK|Bojongsari|Curug': '16518',
  'DEPOK|Bojongsari|Serua': '16518',
  // DEPOK - Tapos
  'DEPOK|Tapos|Tapos': '16457',
  'DEPOK|Tapos|Sukatani': '16457',
  'DEPOK|Tapos|Sukamaju': '16458',
  'DEPOK|Tapos|Jatijajar': '16459',
  'DEPOK|Tapos|Cilangkap': '16459',
  // DEPOK - Cipayung
  'DEPOK|Cipayung|Cipayung': '16437',
  'DEPOK|Cipayung|Cipayung Jaya': '16437',
  'DEPOK|Cipayung|Ratujaya': '16437',
  'DEPOK|Cipayung|Bojong Pondok Terong': '16437',
  'DEPOK|Cipayung|Pondok Jaya': '16437',
};

// Fix typos/truncations in BPS source data
const CITY_NAME_FIXES: Record<string, string> = {
  'Jakarta Selata': 'Jakarta Selatan',
};

function cleanCityName(name: string): string {
  const cleaned = name
    .replace(/^KOTA ADM\.\s*/i, '')
    .replace(/^KOTA ADMINISTRASI\s*/i, '')
    .replace(/^ADMINISTRASI\s*/i, '')
    .replace(/^KABUPATEN ADMINISTRASI\s*/i, '')
    .replace(/^KOTA\s*/i, '')
    .trim();
  // Apply title case: capitalize first letter of each word
  const titleCase = cleaned.toLowerCase().replace(/\b\w/g, c => c.toUpperCase());
  return CITY_NAME_FIXES[titleCase] ?? titleCase;
}

function getPostalCode(cityName: string, districtName: string, villageName: string): string {
  const key = `${cityName.toUpperCase()}|${districtName}|${villageName}`;
  return POSTAL_CODE_MAP[key] || '';
}

async function fetchJSON(url: string): Promise<any> {
  const response = await fetch(url);
  if (!response.ok) throw new Error(`HTTP ${response.status}: ${url}`);
  return response.json();
}

interface BPSEntry { id: string; nama: string; }

async function fetchRegionData() {
  const regions: Array<{
    regionName: string;
    province: string;
    city: string;
    district: string;
    village: string;
    postalCode: string;
  }> = [];

  const provinces: BPSEntry[] = await fetchJSON(`${BPS_API_BASE}/provinsi.json`);
  const provinceMap = new Map(provinces.map(p => [p.id, p.nama]));

  for (const regencyId of JABODETABEK_REGENCY_IDS) {
    const provinceId = regencyId.substring(0, 2);
    const provinceName = provinceMap.get(provinceId) || 'Unknown';

    const regencies: BPSEntry[] = await fetchJSON(`${BPS_API_BASE}/kabupaten/${provinceId}.json`);
    const regency = regencies.find(r => r.id === regencyId);
    if (!regency) {
      console.warn(`  ⚠️  Regency ${regencyId} not found, skipping`);
      continue;
    }

    const cityName = cleanCityName(regency.nama);
    process.stdout.write(`  📍 ${cityName}...`);

    const districts: BPSEntry[] = await fetchJSON(`${BPS_API_BASE}/kecamatan/${regencyId}.json`);
    let villageCount = 0;

    for (const district of districts) {
      const villages: BPSEntry[] = await fetchJSON(`${BPS_API_BASE}/kelurahan/${district.id}.json`);

      if (villages.length === 0) {
        regions.push({
          regionName: `${cityName} - ${district.nama}`,
          province: provinceName,
          city: cityName,
          district: district.nama,
          village: district.nama,
          postalCode: getPostalCode(cityName, district.nama, district.nama),
        });
        villageCount++;
      } else {
        for (const village of villages) {
          regions.push({
            regionName: `${cityName} - ${district.nama} - ${village.nama}`,
            province: provinceName,
            city: cityName,
            district: district.nama,
            village: village.nama,
            postalCode: getPostalCode(cityName, district.nama, village.nama),
          });
        }
        villageCount += villages.length;
      }
    }

    console.log(` ${districts.length} kecamatan, ${villageCount} kelurahan`);
  }

  return regions;
}

async function seedRegions() {
  const { Pool } = await import('pg');
  const pool = new Pool({ connectionString: process.env.DATABASE_URL });

  console.log('═══════════════════════════════════════════════');
  console.log('  SEED REGION DATA - JABODETABEK (BPS)');
  console.log('═══════════════════════════════════════════════');
  console.log(`  Database: ${process.env.DATABASE_URL?.replace(/:[^:@]+@/, ':***@')}`);
  console.log('');

  console.log('📡 Fetching data from BPS API...\n');
  const regions = await fetchRegionData();

  console.log(`\n✅ Fetched ${regions.length} entries from BPS`);

  const valid = regions.filter(r => r.province && r.city && r.district && r.village);
  const skipped = regions.length - valid.length;
  if (skipped > 0) console.warn(`  ⚠️  Skipping ${skipped} entries with missing data`);

  const client = await pool.connect();
  try {
    console.log('\n🗑️  Truncating region_db...');
    await client.query('TRUNCATE TABLE region_db');

    console.log('💾 Inserting new data...');
    const BATCH_SIZE = 100;
    let inserted = 0;
    for (let i = 0; i < valid.length; i += BATCH_SIZE) {
      const batch = valid.slice(i, i + BATCH_SIZE);
      const values = batch.map((_, j) => {
        return `($${j * 6 + 1}, $${j * 6 + 2}, $${j * 6 + 3}, $${j * 6 + 4}, $${j * 6 + 5}, $${j * 6 + 6})`;
      }).join(', ');
      const params = batch.flatMap(r => [r.regionName, r.province, r.city, r.district, r.village, r.postalCode]);
      await client.query(
        `INSERT INTO region_db (region_name, province, city, district, village, postal_code) VALUES ${values}`,
        params
      );
      inserted += batch.length;
      process.stdout.write(`\r  Progress: ${inserted}/${valid.length}`);
    }

    console.log('\n');
    console.log('═══════════════════════════════════════════════');
    console.log(`  ✅ DONE! ${inserted} region entries seeded`);
    console.log('═══════════════════════════════════════════════');
  } finally {
    client.release();
    await pool.end();
  }

  process.exit(0);
}

seedRegions().catch(err => {
  console.error('\n❌ Fatal error:', err);
  process.exit(1);
});
