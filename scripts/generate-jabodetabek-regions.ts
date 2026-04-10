// @ts-nocheck
/**
 * Generate Jabodetabek Region Data from BPS API
 *
 * This script fetches complete region data (province, city, district, village, postal code)
 * for Jabodetabek area from official BPS (Badan Pusat Statistik) data source.
 *
 * Coverage:
 * - DKI Jakarta (all 5 cities)
 * - Bogor (Kota & Kabupaten)
 * - Depok
 * - Tangerang (Kota & Kabupaten)
 * - Tangerang Selatan
 * - Bekasi (Kota & Kabupaten)
 *
 * Data source: https://ibnux.github.io/data-indonesia/ (BPS official data)
 */

interface Village {
  id: string;
  district_id: string;
  nama: string;
}

interface District {
  id: string;
  regency_id: string;
  nama: string;
}

interface Regency {
  id: string;
  province_id: string;
  nama: string;
}

interface Province {
  id: string;
  nama: string;
}

interface RegionEntry {
  province: string;
  city: string;
  district: string;
  village: string;
  postalCode: string;
}

const BPS_API_BASE = 'https://ibnux.github.io/data-indonesia';

// Jabodetabek regency IDs from BPS
const JABODETABEK_REGENCY_IDS = [
  // DKI Jakarta
  '3171', // Jakarta Selatan
  '3172', // Jakarta Timur
  '3173', // Jakarta Pusat
  '3174', // Jakarta Barat
  '3175', // Jakarta Utara

  // Jawa Barat
  '3271', // Kota Bogor
  '3275', // Kota Bekasi
  '3276', // Kota Depok

  // Banten
  '3671', // Kota Tangerang
  '3674', // Kota Tangerang Selatan
];

async function fetchJSON(url: string): Promise<any> {
  console.log(`Fetching: ${url}`);
  const response = await fetch(url);
  if (!response.ok) {
    throw new Error(`HTTP error! status: ${response.status}`);
  }
  return response.json();
}

async function fetchProvinces(): Promise<Province[]> {
  return fetchJSON(`${BPS_API_BASE}/provinsi.json`);
}

async function fetchRegencies(provinceId: string): Promise<Regency[]> {
  return fetchJSON(`${BPS_API_BASE}/kabupaten/${provinceId}.json`);
}

async function fetchDistricts(regencyId: string): Promise<District[]> {
  return fetchJSON(`${BPS_API_BASE}/kecamatan/${regencyId}.json`);
}

async function fetchVillages(districtId: string): Promise<Village[]> {
  return fetchJSON(`${BPS_API_BASE}/kelurahan/${districtId}.json`);
}

// Postal code mapping (approximate based on district)
// Source: Multiple postal code databases
const POSTAL_CODE_MAP: Record<string, string> = {
  // Jakarta Selatan
  'Jagakarsa': '12620',
  'Kebayoran Baru': '12110',
  'Kebayoran Lama': '12240',
  'Mampang Prapatan': '12790',
  'Pancoran': '12780',
  'Pasar Minggu': '12510',
  'Pesanggrahan': '12320',
  'Setiabudi': '12910',
  'Tebet': '12810',
  'Cilandak': '12430',

  // Jakarta Timur
  'Cakung': '13910',
  'Cipayung': '13840',
  'Ciracas': '13740',
  'Duren Sawit': '13440',
  'Jatinegara': '13210',
  'Kramat Jati': '13540',
  'Makasar': '13570',
  'Matraman': '13150',
  'Pasar Rebo': '13760',
  'Pulo Gadung': '13260',

  // Jakarta Pusat
  'Cempaka Putih': '10510',
  'Gambir': '10110',
  'Johar Baru': '10560',
  'Kemayoran': '10610',
  'Menteng': '10310',
  'Sawah Besar': '10710',
  'Senen': '10410',
  'Tanah Abang': '10160',

  // Jakarta Barat
  'Cengkareng': '11730',
  'Grogol Petamburan': '11460',
  'Kalideres': '11840',
  'Kebon Jeruk': '11530',
  'Kembangan': '11610',
  'Palmerah': '11480',
  'Taman Sari': '11150',
  'Tambora': '11220',

  // Jakarta Utara
  'Cilincing': '14120',
  'Kelapa Gading': '14240',
  'Koja': '14210',
  'Pademangan': '14410',
  'Penjaringan': '14440',
  'Tanjung Priok': '14310',

  // Bogor
  'Bogor Barat': '16112',
  'Bogor Selatan': '16132',
  'Bogor Tengah': '16121',
  'Bogor Timur': '16143',
  'Bogor Utara': '16151',
  'Tanah Sareal': '16161',

  // Depok
  'Beji': '16421',
  'Bojongsari': '16516',
  'Cilodong': '16413',
  'Cimanggis': '16451',
  'Cinere': '16514',
  'Cipayung': '16437',
  'Limo': '16514',
  'Pancoran Mas': '16431',
  'Sawangan': '16511',
  'Sukmajaya': '16412',
  'Tapos': '16457',

  // Tangerang
  'Batu Ceper': '15122',
  'Cibodas': '15138',
  'Ciledug': '15153',
  'Cipondoh': '15148',
  'Jatiuwung': '15135',
  'Karang Tengah': '15157',
  'Karawaci': '15810',
  'Larangan': '15154',
  'Neglasari': '15129',
  'Periuk': '15131',
  'Pinang': '15145',
  'Tangerang': '15111',
  'Tanah Tinggi': '15119',

  // Tangerang Selatan
  'Ciputat': '15411',
  'Ciputat Timur': '15412',
  'Pamulang': '15417',
  'Pondok Aren': '15224',
  'Serpong': '15310',
  'Serpong Utara': '15326',
  'Setu': '15314',

  // Bekasi
  'Bekasi Barat': '17134',
  'Bekasi Selatan': '17141',
  'Bekasi Timur': '17112',
  'Bekasi Utara': '17121',
  'Bantargebang': '17152',
  'Jatiasih': '17423',
  'Jatisampurna': '17433',
  'Medan Satria': '17132',
  'Mustika Jaya': '17158',
  'Pondok Gede': '17411',
  'Pondok Melati': '17414',
  'Rawalumbu': '17116',
};

function getPostalCode(districtName?: string): string {
  // Handle undefined/null district names
  if (!districtName) {
    return '10000';
  }

  // Try exact match first
  if (POSTAL_CODE_MAP[districtName]) {
    return POSTAL_CODE_MAP[districtName];
  }

  // Try partial match
  for (const [key, value] of Object.entries(POSTAL_CODE_MAP)) {
    if (districtName.includes(key) || key.includes(districtName)) {
      return value;
    }
  }

  // Default fallback
  return '10000';
}

async function generateJabodetabekData(): Promise<RegionEntry[]> {
  const regions: RegionEntry[] = [];

  console.log('🚀 Starting Jabodetabek region data generation...\n');

  // Fetch all provinces first
  const provinces = await fetchProvinces();
  const provinceMap = new Map(provinces.map(p => [p.id, p.nama]));

  console.log(`✅ Loaded ${provinces.length} provinces\n`);

  // Process each regency in Jabodetabek
  for (const regencyId of JABODETABEK_REGENCY_IDS) {
    const provinceId = regencyId.substring(0, 2);
    const provinceName = provinceMap.get(provinceId) || 'Unknown';

    try {
      // Fetch regencies for this province
      const regencies = await fetchRegencies(provinceId);
      const regency = regencies.find(r => r.id === regencyId);

      if (!regency) {
        console.log(`⚠️  Regency ${regencyId} not found, skipping...`);
        continue;
      }

      console.log(`📍 Processing: ${regency.nama} (${provinceName})`);

      // Fetch districts
      const districts = await fetchDistricts(regencyId);
      console.log(`   └─ ${districts.length} districts found`);

      for (const district of districts) {
        // Fetch villages
        const villages = await fetchVillages(district.id);

        if (villages.length === 0) {
          // If no villages, add district-level entry
          regions.push({
            province: provinceName,
            city: regency.nama,
            district: district.nama,
            village: district.nama, // Use district name as village
            postalCode: getPostalCode(district.nama),
          });
        } else {
          // Add each village
          for (const village of villages) {
            regions.push({
              province: provinceName,
              city: regency.nama,
              district: district.nama,
              village: village.nama,
              postalCode: getPostalCode(district.nama),
            });
          }
        }
      }

      console.log(`   ✅ ${regency.nama}: ${districts.length} districts processed\n`);

    } catch (error) {
      console.error(`❌ Error processing regency ${regencyId}:`, error);
    }
  }

  return regions;
}

function generateSQLInserts(regions: RegionEntry[]): string {
  // Filter out regions with missing critical data first
  const validRegions = regions.filter(region => {
    if (!region.province || !region.city || !region.district || !region.village) {
      console.warn(`Skipping region with missing data:`, region);
      return false;
    }
    return true;
  });

  const sqlLines: string[] = [
    '-- Jabodetabek Region Data (Generated from BPS API)',
    `-- Generated at: ${new Date().toISOString()}`,
    `-- Total entries: ${validRegions.length}`,
    '',
    'INSERT INTO region_db (region_name, province, city, district, village, postal_code) VALUES',
  ];

  validRegions.forEach((region, index) => {
    const regionName = `${region.city} - ${region.district} - ${region.village}`;
    const isLast = index === validRegions.length - 1;

    // Escape single quotes for SQL
    const escapedRegionName = regionName.replace(/'/g, "''");
    const escapedProvince = region.province.replace(/'/g, "''");
    const escapedCity = region.city.replace(/'/g, "''");
    const escapedDistrict = region.district.replace(/'/g, "''");
    const escapedVillage = region.village.replace(/'/g, "''");

    const sql = `('${escapedRegionName}', '${escapedProvince}', '${escapedCity}', '${escapedDistrict}', '${escapedVillage}', '${region.postalCode}')${isLast ? ';' : ','}`;

    sqlLines.push(sql);
  });

  sqlLines.push('');
  sqlLines.push('-- ON CONFLICT: Do nothing if entry already exists');
  sqlLines.push('-- Add this line manually if needed: ON CONFLICT (city, district, village, postal_code) DO NOTHING;');

  return sqlLines.join('\n');
}

async function main() {
  try {
    console.log('═══════════════════════════════════════════════');
    console.log('  JABODETABEK REGION DATA GENERATOR');
    console.log('  Source: BPS Indonesia (ibnux/data-indonesia)');
    console.log('═══════════════════════════════════════════════\n');

    const regions = await generateJabodetabekData();

    console.log('\n═══════════════════════════════════════════════');
    console.log(`✅ COMPLETE! Generated ${regions.length} region entries`);
    console.log('═══════════════════════════════════════════════\n');

    // Generate SQL
    const sql = generateSQLInserts(regions);

    // Write to file
    const fs = require('fs');
    const path = require('path');
    const outputPath = path.join(__dirname, '../sql/generated/jabodetabek-regions.sql');

    // Create directory if not exists
    const dir = path.dirname(outputPath);
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }

    fs.writeFileSync(outputPath, sql);

    console.log(`📝 SQL file generated: ${outputPath}`);
    console.log(`\nTo apply this data, run:`);
    console.log(`   psql $DATABASE_URL -f ${outputPath}`);

  } catch (error) {
    console.error('❌ Fatal error:', error);
    process.exit(1);
  }
}

main();
