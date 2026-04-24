import { config } from 'dotenv';
config({ path: '.env.local' });

import { db } from '../src/lib/db';
import { mitraDB, mitraRateConfigDB } from '../src/lib/schema';
import { eq } from 'drizzle-orm';

// Helper: parse IDR string to number
const parseIDR = (s: string): string => s.replace(/[^0-9]/g, '');

// Helper: truncate phone to 20 chars max (contact field)
const cleanPhone = (s: string): string => s.replace(/\s/g, '').substring(0, 20);

// Helper: parse join date "24-Oct-2022" -> "2022-10-24"
const parseJoinDate = (s: string): string => {
  const months: Record<string, string> = {
    Jan: '01', Feb: '02', Mar: '03', Apr: '04', May: '05', Jun: '06',
    Jul: '07', Aug: '08', Sep: '09', Oct: '10', Nov: '11', Dec: '12'
  };
  const [d, m, y] = s.split('-');
  return `${y}-${months[m]}-${d.padStart(2, '0')}`;
};

const MITRAS = [
  { joinDate: '24-Oct-2022', mitraCode: 'MITRA-202210-000001', nik: '3315055903810001', name: 'Sulastri', dob: '19/03/1981', address: 'Jl. Nenas No 307 Blok A Cinere, Cinere, Depok', phone: '082135809572', bank: 'BCA', accountNo: '2670515811', holderName: 'Sulastri', rates: { trial: 100000, r1: 375000, r2: 720000, r3: 1080000, r4: 1440000, r5: 1800000, r6: 2160000, r7: 2520000 } },
  { joinDate: '2-Dec-2022', mitraCode: 'MITRA-202212-000002', nik: '', name: 'Parsini', dob: '', address: '', phone: '081295538387', bank: 'BCA', accountNo: '0710304921', holderName: 'Dhimmas Yogi Sulistya', rates: { trial: 100000, r1: 400000, r2: 800000, r3: 1200000, r4: 1600000, r5: 2000000, r6: 2400000, r7: 2800000 } },
  { joinDate: '11-Apr-2023', mitraCode: 'MITRA-202304-000005', nik: '3403034507800003', name: 'Suminten Yulianingrum', dob: '05/07/1980', address: 'Jl. Terogong 3 No.25, RT 09/ RW 10 Cilandak Barat, Jakarta Selatan', phone: '083899781312', bank: 'BCA', accountNo: '7310872533', holderName: 'Suminten Yulianingrum', rates: { trial: 100000, r1: 375000, r2: 720000, r3: 1080000, r4: 1440000, r5: 1800000, r6: 2160000, r7: 2520000 } },
  { joinDate: '25-Apr-2023', mitraCode: 'MITRA-202304-000009', nik: '3173054206880007', name: 'Siti Nuramalia', dob: '02/06/1988', address: 'Jl. Palapa Kampung, Parung Benying RT02/RW18, Ciputat, Sarua', phone: '083871329845', bank: 'BRI', accountNo: '026101085921500', holderName: 'Siti Nurkholifah', rates: { trial: 100000, r1: 375000, r2: 675000, r3: 1012500, r4: 1350000, r5: 1687500, r6: 2025000, r7: 2362500 } },
  { joinDate: '22-Sep-2023', mitraCode: 'MITRA-202309-000017', nik: '3203185205830001', name: 'Ema', dob: '12/05/1983', address: 'Gang bungur samping musolah al hikmah', phone: '081546858409', bank: 'BCA', accountNo: '5475479936', holderName: 'Ema', rates: { trial: 100000, r1: 375000, r2: 675000, r3: 1012500, r4: 1350000, r5: 1687500, r6: 2025000, r7: 2362500 } },
  { joinDate: '18-Jan-2024', mitraCode: 'MITRA-202401-000028', nik: '3171075808820004', name: 'Siti Asih', dob: '18/08/1982', address: 'Jl. Karet Pasar Baru Barat I, RT 06/RW 06, Karet Tengsin, Tanah Abang, Jakarta Pusat', phone: '087788133385', bank: 'BCA', accountNo: '5265237042', holderName: 'Siti Asih', rates: { trial: 100000, r1: 375000, r2: 675000, r3: 1012500, r4: 1350000, r5: 1687500, r6: 2025000, r7: 2362500 } },
  { joinDate: '20-Mar-2024', mitraCode: 'MITRA-202403-000034', nik: '3174076076841002', name: 'Ria Junaeni', dob: '27/06/1984', address: 'Jl. Pandan No. 13 RT 014 / RW 009, Kramat Pela, Kebayoran Baru, Jakarta Selatan', phone: '085710775667', bank: 'BCA', accountNo: '2370511643', holderName: 'Ria Junaeni', rates: { trial: 100000, r1: 375000, r2: 675000, r3: 1012500, r4: 1350000, r5: 1687500, r6: 2025000, r7: 2362500 } },
  { joinDate: '18-May-2024', mitraCode: 'MITRA-202405-000035', nik: '3174105806800002', name: 'Yeni Setiani', dob: '17/06/1980', address: 'Jl. Masjid Al Muflihun RT005/RW010, Pesanggrahan, Bintaro, Jakarta Selatan', phone: '087844568671', bank: 'BCA', accountNo: '5010192767', holderName: 'Yeni Setiani', rates: { trial: 100000, r1: 375000, r2: 675000, r3: 1012500, r4: 1350000, r5: 1687500, r6: 2025000, r7: 2362500 } },
  { joinDate: '25-May-2024', mitraCode: 'MITRA-202405-000038', nik: '3326024511940001', name: 'Iklimatul Atiqoh', dob: '05/11/1994', address: 'Jl. Fani Afandi RT 02/RW 01, Gg. Mushola Al Iklas, Pondok Jagung Timur, Serpong Utara', phone: '081327305685', bank: 'BCA', accountNo: '6044522556', holderName: 'Iklimatul Atiqoh', rates: { trial: 100000, r1: 375000, r2: 675000, r3: 1012500, r4: 1350000, r5: 1687500, r6: 2025000, r7: 2362500 } },
  { joinDate: '7-Jun-2024', mitraCode: 'MITRA-202406-000040', nik: '1802035108860007', name: 'Dwi Lestari', dob: '11/08/1986', address: 'Jl. KH. Hasyim Pd. Cabe RT 05/RW 01, Kembangan Utara, Jakarta Barat', phone: '0895324849489', bank: 'BRI', accountNo: '559301005119537', holderName: 'Dwi Lestari', rates: { trial: 100000, r1: 375000, r2: 675000, r3: 1012500, r4: 1350000, r5: 1687500, r6: 2025000, r7: 2362500 } },
  { joinDate: '24-Jun-2024', mitraCode: 'MITRA-202406-000045', nik: '3172024601910007', name: 'Windi Indriyanti', dob: '06/01/1991', address: 'Jl. Puri Cendana No.7A', phone: '089687317941', bank: 'BCA', accountNo: '4070309276', holderName: 'Windi Indriyanti', rates: { trial: 100000, r1: 375000, r2: 675000, r3: 1012500, r4: 1350000, r5: 1687500, r6: 2025000, r7: 2362500 } },
  { joinDate: '4-Jul-2024', mitraCode: 'MITRA-202407-000047', nik: '3171035904780005', name: 'Marciane', dob: '19/04/1978', address: 'Jl. Kampung Irian III no 32 RT.01/06 Serdang Kemayoran Jakarta Pusat', phone: '0895335561756', bank: 'BCA', accountNo: '0970774874', holderName: 'Marciane', rates: { trial: 100000, r1: 375000, r2: 675000, r3: 1012500, r4: 1350000, r5: 1687500, r6: 2025000, r7: 2362500 } },
  { joinDate: '25-Jul-2024', mitraCode: 'MITRA-202407-000048', nik: '3173054506870009', name: 'Mega Arum Liliana', dob: '05/06/1987', address: 'Jl. KH Aja RT 005/RW 007, Meruya Selatan, Kembangan, Jakarta Barat', phone: '088291676504', bank: 'BCA', accountNo: '8870649968', holderName: 'Mega Arum Liliana', rates: { trial: 100000, r1: 375000, r2: 675000, r3: 1012500, r4: 1350000, r5: 1687500, r6: 2025000, r7: 2362500 } },
  { joinDate: '1-Nov-2024', mitraCode: 'MITRA-202411-000059', nik: '3674056210750009', name: 'Citra Rini Pamularsih', dob: '22/10/1975', address: 'Jl. Jati No. 12B, RT 01 / RW 09, Cirendeu, Ciputat Timur, Tangerang Selatan', phone: '081295523369', bank: 'BCA', accountNo: '0671832239', holderName: 'Citra Rini Pamularsih', rates: { trial: 100000, r1: 375000, r2: 675000, r3: 1012500, r4: 1350000, r5: 1687500, r6: 2025000, r7: 2362500 } },
  { joinDate: '7-Jan-2025', mitraCode: 'MITRA-2020501-000065', nik: '3173074907770002', name: 'Naini Rochmawati', dob: '09/07/1977', address: 'Jl. Gg 7 No 38, RT 012/RW 05, Jatipulo, Palmerah, Jakarta Barat', phone: '087803826036', bank: 'BCA', accountNo: '3100309172', holderName: 'Naini Rochmawati', rates: { trial: 100000, r1: 375000, r2: 675000, r3: 1012500, r4: 1350000, r5: 1687500, r6: 2025000, r7: 2362500 } },
  { joinDate: '9-Jan-2025', mitraCode: 'MITRA-2020501-000067', nik: '3315195610780001', name: 'Darminingsih', dob: '16/10/1978', address: 'Jl. SD III RT 003/008, Pondok Pinang, Kec. Kebayoran Lama, Jakarta Selatan', phone: '085717170357', bank: 'BRI', accountNo: '052001010353500', holderName: 'Darminingsih', rates: { trial: 100000, r1: 375000, r2: 675000, r3: 1012500, r4: 1350000, r5: 1687500, r6: 2025000, r7: 2362500 } },
  { joinDate: '11-Mar-2025', mitraCode: 'MITRA-2020503-000075', nik: '3671015109800003', name: 'Ninuk Hendrini', dob: '11/09/1980', address: 'Jl. Kp Gunung, RT 03/RW 09, Jombang, Ciputat, Tangerang Selatan', phone: '082122161012', bank: 'BCA', accountNo: '1080363091', holderName: 'Ninuk Hendrini', rates: { trial: 100000, r1: 375000, r2: 675000, r3: 1012500, r4: 1350000, r5: 1687500, r6: 2025000, r7: 2362500 } },
  { joinDate: '22-Apr-2025', mitraCode: 'MITRA-2020504-000085', nik: '3402045602890001', name: 'Sunarsih', dob: '16/02/1987', address: 'Jl. Palapa 1 No.1 RT 014/RW 01, Kedoya Selatan, Kebon Jeruk, Jakarta barat', phone: '085795056369', bank: 'BRI', accountNo: '331201016005537', holderName: 'Sunarsih', rates: { trial: 100000, r1: 375000, r2: 675000, r3: 1012500, r4: 1350000, r5: 1687500, r6: 2025000, r7: 2362500 } },
  { joinDate: '14-May-2025', mitraCode: 'MITRA-2020505-000086', nik: '3674034706910001', name: 'Atika Yunianti', dob: '07/06/1991', address: 'Jl. Pertanian No 34, RT 001/RW 021, Parigi Lama, Pondok Aren', phone: '081517043978', bank: 'BCA', accountNo: '6801462356', holderName: 'Atika Yunianti', rates: { trial: 100000, r1: 375000, r2: 675000, r3: 1012500, r4: 1350000, r5: 1687500, r6: 2025000, r7: 2362500 } },
  { joinDate: '22-May-2025', mitraCode: 'MITRA-2020505-000087', nik: '3175056808710005', name: 'Sulistiyowati', dob: '28/08/1971', address: 'Jl. Lebak Sari RT06/RW02, Cijantung, Jakarta Timur', phone: '0895385803479', bank: 'BCA', accountNo: '1663371057', holderName: 'Citra Putri Virgiani', rates: { trial: 100000, r1: 375000, r2: 675000, r3: 1012500, r4: 1350000, r5: 1687500, r6: 2025000, r7: 2362500 } },
  { joinDate: '26-May-2025', mitraCode: 'MITRA-2020505-000088', nik: '3217065809840006', name: 'Susanti', dob: '18/09/1984', address: 'Jl. Nusa Indah 2 Gang 9 No 303, RT 04/RW 05', phone: '085798571912', bank: 'BSI', accountNo: '7135864058', holderName: 'Susanti', rates: { trial: 100000, r1: 375000, r2: 675000, r3: 1012500, r4: 1350000, r5: 1687500, r6: 2025000, r7: 2362500 } },
  { joinDate: '16-Jun-2025', mitraCode: 'MITRA-2020506-000093', nik: '3603124104890015', name: 'Yenita Elismayanti', dob: '01/04/1989', address: 'Jl. Ciledug Raya No 6B RT 011/RW 002, Petukangan Utara, Jakarta Selatan', phone: '082125669393', bank: 'BCA', accountNo: '7131193983', holderName: 'Yenita Elismayanti', rates: { trial: 100000, r1: 375000, r2: 675000, r3: 1012500, r4: 1350000, r5: 1687500, r6: 2025000, r7: 2362500 } },
  { joinDate: '20-Jun-2025', mitraCode: 'MITRA-2020506-000094', nik: '317406704850002', name: 'Mayunita', dob: '07/04/1985', address: 'Jl. Terogong No.55, Cilandak Barat, Jakarta Selatan', phone: '08978808495', bank: 'BCA', accountNo: '2060631231', holderName: 'Mayunita', rates: { trial: 100000, r1: 375000, r2: 675000, r3: 1012500, r4: 1350000, r5: 1687500, r6: 2025000, r7: 2362500 } },
  { joinDate: '24-Jun-2025', mitraCode: 'MITRA-2020506-000095', nik: '3174055506830005', name: 'Rohayani', dob: '15/06/1983', address: 'Jl. Inpres 13B, Gaga, Larangan, Tangerang', phone: '085126191694', bank: 'BRI', accountNo: '092501032537530', holderName: 'Rohayani', rates: { trial: 100000, r1: 375000, r2: 675000, r3: 1012500, r4: 1350000, r5: 1687500, r6: 2025000, r7: 2362500 } },
  { joinDate: '2-Jul-2025', mitraCode: 'MITRA-2020507-000097', nik: '317466808800005', name: 'Siti Fatimah', dob: '28/08/1980', address: 'Jl. Tridharma Utama II No 2, RT06 / RW 012', phone: '081298266073', bank: 'BCA', accountNo: '0710218242', holderName: 'Siti Fatimah', rates: { trial: 100000, r1: 375000, r2: 675000, r3: 1012500, r4: 1350000, r5: 1687500, r6: 2025000, r7: 2362500 } },
  { joinDate: '18-Jul-2025', mitraCode: 'MITRA-2020507-000099', nik: '1812015003910011', name: 'Kiki Rismawati', dob: '10/03/1991', address: 'Jl. Petojo Binatu Raya No. 19, RT013/RW008, Petojo Utara, Gambir', phone: '082269985071', bank: 'BCA', accountNo: '2930822429', holderName: 'Kiki Rismawati', rates: { trial: 100000, r1: 375000, r2: 675000, r3: 1012500, r4: 1350000, r5: 1687500, r6: 2025000, r7: 2362500 } },
  { joinDate: '12-Aug-2025', mitraCode: 'MITRA-2020508-000103', nik: '3302046708880002', name: 'Puji Eka Priana', dob: '27/08/1988', address: 'Jl. Penghulu 1, RT 02/RW 09 Jatiwaringin, Pondok Gede, Kota Bekasi', phone: '082223245922', bank: 'BCA', accountNo: '7510719675', holderName: 'Puji Eka Priana', rates: { trial: 100000, r1: 375000, r2: 675000, r3: 1012500, r4: 1350000, r5: 1687500, r6: 2025000, r7: 2362500 } },
  { joinDate: '15-Sep-2025', mitraCode: 'MITRA-2020509-000105', nik: '3674044303830010', name: 'Rina Triana', dob: '03/03/1983', address: 'Jl. Asmawi Hm, RT06/RW04, Sawah Baru, Ciputat, Tangerang Selatan', phone: '085803031983', bank: 'BCA', accountNo: '2180550138', holderName: 'Rina Triana', rates: { trial: 100000, r1: 375000, r2: 675000, r3: 1012500, r4: 1350000, r5: 1687500, r6: 2025000, r7: 2362500 } },
  { joinDate: '24-Sep-2025', mitraCode: 'MITRA-2020509-000106', nik: '3603126606810003', name: 'Annarul Nurjanati', dob: '26/06/1981', address: 'Jl.Nanas 4 B.32/11 Pondok Makmur Kutabaru Pasar Kemis Tangerang', phone: '085187846551', bank: 'BCA', accountNo: '1087558070', holderName: 'Annarul Nurjanati', rates: { trial: 100000, r1: 375000, r2: 675000, r3: 1012500, r4: 1350000, r5: 1687500, r6: 2025000, r7: 2362500 } },
  { joinDate: '21-Oct-2025', mitraCode: 'MITRA-2020510-000109', nik: '3674074711800001', name: 'Munih', dob: '07/11/1980', address: 'Jl. Citra Prima Serpong No.112, Kp. Sengkol, RT02/RW01, Muncul, Setu, Tangerang Selatan', phone: '08872491513', bank: 'BNI', accountNo: '1409739881', holderName: 'Munih', rates: { trial: 100000, r1: 375000, r2: 675000, r3: 1012500, r4: 1350000, r5: 1687500, r6: 2025000, r7: 2362500 } },
  { joinDate: '26-Nov-2025', mitraCode: 'MITRA-2020511-000112', nik: '3203155802840002', name: 'Ai Sumarni', dob: '18/02/1984', address: 'Jl. Pangeran Antasari, GG Jl. Kenanga RT01/RW011, Cipete Utara, Kebayoran Baru, Jakarta Selatan', phone: '085777404379', bank: 'BRI', accountNo: '325301017843538', holderName: 'Ai Sumarni', rates: { trial: 100000, r1: 375000, r2: 675000, r3: 1012500, r4: 1350000, r5: 1687500, r6: 2025000, r7: 2362500 } },
  { joinDate: '8-Dec-2025', mitraCode: 'MITRA-2020512-000113', nik: '3173075609900005', name: 'Septianah', dob: '16/09/1990', address: 'Jl. Kapuk Raya, Gg. H. Maulana, Kapuk, Cengkareng, Jakarta Barat', phone: '081806866531', bank: 'BCA', accountNo: '7015489928', holderName: 'Septianah', rates: { trial: 100000, r1: 375000, r2: 675000, r3: 1012500, r4: 1350000, r5: 1687500, r6: 2025000, r7: 2362500 } },
  { joinDate: '6-Jan-2026', mitraCode: 'MITRA-202601-000117', nik: '3674074306770003', name: 'Sanimah', dob: '03/06/1977', address: 'Jl. Hutama Karya No.58, RT 05/RW 01, Kp Kademangan, Setu, Tangerang Selatan', phone: '085810649262', bank: 'BCA', accountNo: '8010634327', holderName: 'Sanimah', rates: { trial: 100000, r1: 375000, r2: 675000, r3: 1012500, r4: 1350000, r5: 1687500, r6: 2025000, r7: 2362500 } },
  { joinDate: '9-Jan-2026', mitraCode: 'MITRA-202601-000118', nik: '3578204701770002', name: 'Kristiana', dob: '07/01/1977', address: 'Dasana Indah RM 5 No.44, Bojong Nangka, Kelapa Dua. Kab. Tangerang', phone: '087852755198', bank: 'BCA', accountNo: '8831964260', holderName: 'Kristiana', rates: { trial: 100000, r1: 375000, r2: 675000, r3: 1012500, r4: 1350000, r5: 1687500, r6: 2025000, r7: 2362500 } },
  { joinDate: '12-Jan-2026', mitraCode: 'MITRA-202601-000119', nik: '3217114109080008', name: 'Alsa Ramadani', dob: '01/09/2008', address: 'Jl. Salemba Utan Barat No.133, RT04/RW07, Palmeriam, Matraman, Jakarta Timur', phone: '088290602554', bank: 'BCA', accountNo: '3420802535', holderName: 'Alsa Ramadani', rates: { trial: 100000, r1: 375000, r2: 675000, r3: 1012500, r4: 1350000, r5: 1687500, r6: 2025000, r7: 2362500 } },
  { joinDate: '23-Jan-2026', mitraCode: 'MITRA-202601-000121', nik: '3174014306840214', name: 'Yuni Ramadinah', dob: '03/06/1984', address: 'Jl. H.Matasan No.27E, RT02/RW04, Kebagusan, Pasar Minggu, Jakarta Selatan', phone: '085172315005', bank: 'BCA', accountNo: '5750428519', holderName: 'Yuni Ramadinah', rates: { trial: 100000, r1: 375000, r2: 675000, r3: 1012500, r4: 1350000, r5: 1687500, r6: 2025000, r7: 2362500 } },
  { joinDate: '28-Jan-2026', mitraCode: 'MITRA-202601-000122', nik: '3307116601840002', name: 'Zaidah', dob: '26/01/1984', address: 'Gg. Damai No.29A, Kp. Dongkal, Pondok Jagung Timur, Tangerang Selatan', phone: '085782345636', bank: 'BRI', accountNo: '01201022053539', holderName: 'Zaidah', rates: { trial: 100000, r1: 375000, r2: 675000, r3: 1012500, r4: 1350000, r5: 1687500, r6: 2025000, r7: 2362500 } },
  { joinDate: '30-Jan-2026', mitraCode: 'MITRA-202601-000123', nik: '3175064810790005', name: 'Ochtavia Ingrid Lapya', dob: '08/01/1979', address: 'Jl.Kp.Pisangan, GG.H.Dalih No.57F, Penggilingan, Cakung, Jakarta Timur', phone: '085143091959', bank: 'BCA', accountNo: '6331185890', holderName: 'Ochtavia Ingrid Lapya', rates: { trial: 100000, r1: 375000, r2: 675000, r3: 1012500, r4: 1350000, r5: 1687500, r6: 2025000, r7: 2362500 } },
  { joinDate: '8-Apr-2026', mitraCode: 'MITRA-202604-000125', nik: '3275065501770013', name: 'Nurfadillah', dob: '15/01/1977', address: 'Kaliabang Bungur No.179, RT 01/RW 01, Pejuang, Medan Satria Bekasi, 17131', phone: '085782081143', bank: 'BCA', accountNo: '7411457188', holderName: 'Nurfadillah', rates: { trial: 100000, r1: 375000, r2: 675000, r3: 1012500, r4: 1350000, r5: 1687500, r6: 2025000, r7: 2362500 } },
  { joinDate: '17-Apr-2026', mitraCode: 'MITRA-202604-000126', nik: '3276056103750007', name: 'Sri Wahyuningsih', dob: '21/04/1975', address: 'Jl. H.Jian No.28, RT 02/RW 03, Cipete Utara, Kebayoran Baru, Jakarta Selatan', phone: '085842010823', bank: 'BCA', accountNo: '2180310650', holderName: 'Sri Wahyuningsih', rates: { trial: 100000, r1: 375000, r2: 675000, r3: 1012500, r4: 1350000, r5: 1687500, r6: 2025000, r7: 2362500 } },
  { joinDate: '18-Apr-2026', mitraCode: 'MITRA-202604-000127', nik: '3671045302870003', name: 'Rosyidah', dob: '13/02/1987', address: 'kampung rawa bokor jl. Husein sastranegara rt 01/04 Benda.', phone: '088293744515', bank: 'BCA', accountNo: '7020909824', holderName: 'Rosyidah', rates: { trial: 100000, r1: 375000, r2: 675000, r3: 1012500, r4: 1350000, r5: 1687500, r6: 2025000, r7: 2362500 } },
  { joinDate: '22-Apr-2026', mitraCode: 'MITRA-202604-000128', nik: '3174074411700006', name: 'Emi Pujiyati', dob: '04/11/1970', address: 'Jl. H.Jian, RT 02/RW 03, Cipete Utara, Kebayoran Baru, Jakarta Selatan', phone: '085780359269', bank: 'BCA', accountNo: '7105271174', holderName: 'Emi Pujiyati', rates: { trial: 100000, r1: 375000, r2: 675000, r3: 1012500, r4: 1350000, r5: 1687500, r6: 2025000, r7: 2362500 } },
];

async function main() {
  console.log('=== ETL: Mitras ===\n');

  const existing = await db.select({ id: mitraDB.id, mitraCode: mitraDB.mitraCode, mitraNIK: mitraDB.mitraNIK }).from(mitraDB);
  console.log(`Existing mitras in DB: ${existing.length}`);

  let inserted = 0;
  let skipped = 0;
  let nikFallback = 0;

  for (const m of MITRAS) {
    const byCode = existing.find(e => e.mitraCode === m.mitraCode);
    if (byCode) {
      console.log(`  SKIP (exists): ${m.name} [${m.mitraCode}]`);
      skipped++;
      continue;
    }

    let nik = m.nik.trim().substring(0, 16);
    if (!nik) {
      nik = Math.floor(1000000000000000 + Math.random() * 9000000000000000).toString();
      nikFallback++;
      console.log(`  ⚠️  No NIK for ${m.name}, using random: ${nik}`);
    }

    // Check NIK uniqueness
    const byNIK = existing.find(e => e.mitraNIK === nik);
    if (byNIK) {
      console.log(`  SKIP (NIK conflict): ${m.name} [${nik}]`);
      skipped++;
      continue;
    }

    const mitraRecord = {
      mitraName: m.name.trim(),
      mitraCode: m.mitraCode,
      mitraNIK: nik,
      mitraGender: 'Wanita',
      mitraDOB: m.dob || '01/01/1990',
      mitraPhone: cleanPhone(m.phone).substring(0, 12),
      contact: cleanPhone(m.phone).substring(0, 20),
      address: m.address,
      mitraBankAccount: m.bank,
      mitraBankAccountNumber: m.accountNo,
      mitraBankHolderName: m.holderName,
      joinDate: parseJoinDate(m.joinDate),
      status: 'Active',
      isActive: true,
      isDeleted: false,
      trialRatePerVisit: m.rates.trial.toString(),
      monthlyBaseRate: m.rates.r2.toString(),
    };

    const [inserted_mitra] = await db.insert(mitraDB).values(mitraRecord).returning({ id: mitraDB.id });

    // Insert rate config for each frequency
    await db.insert(mitraRateConfigDB).values([
      { mitraId: inserted_mitra.id, visitsPerWeek: 0, payoutRate: m.rates.trial.toString() },
      { mitraId: inserted_mitra.id, visitsPerWeek: 1, payoutRate: m.rates.r1.toString() },
      { mitraId: inserted_mitra.id, visitsPerWeek: 2, payoutRate: m.rates.r2.toString() },
      { mitraId: inserted_mitra.id, visitsPerWeek: 3, payoutRate: m.rates.r3.toString() },
      { mitraId: inserted_mitra.id, visitsPerWeek: 4, payoutRate: m.rates.r4.toString() },
      { mitraId: inserted_mitra.id, visitsPerWeek: 5, payoutRate: m.rates.r5.toString() },
      { mitraId: inserted_mitra.id, visitsPerWeek: 6, payoutRate: m.rates.r6.toString() },
      { mitraId: inserted_mitra.id, visitsPerWeek: 7, payoutRate: m.rates.r7.toString() },
    ]);

    console.log(`  INSERTED: ${m.name} [${m.mitraCode}]`);
    inserted++;

    // Update existing array to avoid NIK re-collision in same run
    existing.push({ id: inserted_mitra.id, mitraCode: m.mitraCode, mitraNIK: nik });
  }

  console.log(`\n=== Done ===`);
  console.log(`Inserted: ${inserted}, Skipped: ${skipped}, NIK fallback used: ${nikFallback}`);
  process.exit(0);
}

main().catch(err => { console.error(err); process.exit(1); });
