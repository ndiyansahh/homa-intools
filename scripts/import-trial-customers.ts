import { db } from '@/lib/db';
import { customerDB } from '@/lib/schema';

// 20 trial customer data records
const trialCustomers = [
  {
    customerName: 'Ahmad Rizki',
    contact: '628111111001',
    address: 'Jl. Mangga Dua Raya No. 15',
    village: 'Mangga Dua',
    district: 'Sawah Besar',
    city: 'Jakarta Pusat',
    postalCode: '10730',
    subscriptionPackage: 'Trial Package - Basic Cleaning (1 visit)',
    subscriptionStart: '2025-01-15',
    subscriptionStatus: 'Trial',
    monthlyFee: '0',
    customerNotes: 'Trial customer - HOMA acquisition'
  },
  {
    customerName: 'Siti Nurhaliza',
    contact: '628111111002',
    address: 'Jl. Kemang Raya No. 88',
    village: 'Kemang',
    district: 'Mampang Prapatan',
    city: 'Jakarta Selatan',
    postalCode: '12560',
    subscriptionPackage: 'Trial Package - Regular Cleaning (1 visit)',
    subscriptionStart: '2025-01-16',
    subscriptionStatus: 'Trial',
    monthlyFee: '0',
    customerNotes: 'Trial customer - Altrix acquisition'
  },
  {
    customerName: 'Bambang Sutrisno',
    contact: '628111111003',
    address: 'Jl. Puri Indah Blok A No. 25',
    village: 'Puri Indah',
    district: 'Kembangan',
    city: 'Jakarta Barat',
    postalCode: '11610',
    subscriptionPackage: 'Trial Package - Frequent Cleaning (1 visit)',
    subscriptionStart: '2025-01-17',
    subscriptionStatus: 'Trial',
    monthlyFee: '0',
    customerNotes: 'Trial customer - HOMA acquisition'
  },
  {
    customerName: 'Maya Sari',
    contact: '628111111004',
    address: 'Jl. Kelapa Gading Boulevard No. 102',
    village: 'Kelapa Gading',
    district: 'Kelapa Gading',
    city: 'Jakarta Utara',
    postalCode: '14240',
    subscriptionPackage: 'Trial Package - Office Cleaning (1 visit)',
    subscriptionStart: '2025-01-18',
    subscriptionStatus: 'Trial',
    monthlyFee: '0',
    customerNotes: 'Trial customer - Office space cleaning'
  },
  {
    customerName: 'Dedi Kurniawan',
    contact: '628111111005',
    address: 'Jl. Bintaro Utama Blok B No. 45',
    village: 'Bintaro',
    district: 'Pesanggrahan',
    city: 'Jakarta Selatan',
    postalCode: '12330',
    subscriptionPackage: 'Trial Package - Basic Cleaning (1 visit)',
    subscriptionStart: '2025-01-19',
    subscriptionStatus: 'Trial',
    monthlyFee: '0',
    customerNotes: 'Trial customer - HOMA acquisition'
  },
  {
    customerName: 'Rina Wati',
    contact: '628111111006',
    address: 'Jl. Cipete Raya No. 67',
    village: 'Cipete',
    district: 'Cilandak',
    city: 'Jakarta Selatan',
    postalCode: '12410',
    subscriptionPackage: 'Trial Package - Regular Cleaning (1 visit)',
    subscriptionStart: '2025-01-20',
    subscriptionStatus: 'Trial',
    monthlyFee: '0',
    customerNotes: 'Trial customer - Altrix acquisition'
  },
  {
    customerName: 'Andi Prasetyo',
    contact: '628111111007',
    address: 'Jl. Taman Mini Indonesia Indah No. 33',
    village: 'Ceger',
    district: 'Cipayung',
    city: 'Jakarta Timur',
    postalCode: '13820',
    subscriptionPackage: 'Trial Package - Frequent Cleaning (1 visit)',
    subscriptionStart: '2025-01-21',
    subscriptionStatus: 'Trial',
    monthlyFee: '0',
    customerNotes: 'Trial customer - HOMA acquisition'
  },
  {
    customerName: 'Linda Maharani',
    contact: '628111111008',
    address: 'Jl. Menteng Dalam No. 12',
    village: 'Menteng',
    district: 'Menteng',
    city: 'Jakarta Pusat',
    postalCode: '10310',
    subscriptionPackage: 'Trial Package - Office Cleaning (1 visit)',
    subscriptionStart: '2025-01-22',
    subscriptionStatus: 'Trial',
    monthlyFee: '0',
    customerNotes: 'Trial customer - Office space cleaning'
  },
  {
    customerName: 'Fajar Ramadhan',
    contact: '628111111009',
    address: 'Jl. Pantai Indah Kapuk No. 77',
    village: 'Pantai Indah Kapuk',
    district: 'Penjaringan',
    city: 'Jakarta Utara',
    postalCode: '14470',
    subscriptionPackage: 'Trial Package - Basic Cleaning (1 visit)',
    subscriptionStart: '2025-01-23',
    subscriptionStatus: 'Trial',
    monthlyFee: '0',
    customerNotes: 'Trial customer - HOMA acquisition'
  },
  {
    customerName: 'Dewi Lestari',
    contact: '628111111010',
    address: 'Jl. Radio Dalam No. 55',
    village: 'Radio Dalam',
    district: 'Kebayoran Baru',
    city: 'Jakarta Selatan',
    postalCode: '12140',
    subscriptionPackage: 'Trial Package - Regular Cleaning (1 visit)',
    subscriptionStart: '2025-01-24',
    subscriptionStatus: 'Trial',
    monthlyFee: '0',
    customerNotes: 'Trial customer - Altrix acquisition'
  },
  {
    customerName: 'Rudi Hartono',
    contact: '628111111011',
    address: 'Jl. Cempaka Putih Tengah No. 89',
    village: 'Cempaka Putih',
    district: 'Cempaka Putih',
    city: 'Jakarta Pusat',
    postalCode: '10510',
    subscriptionPackage: 'Trial Package - Frequent Cleaning (1 visit)',
    subscriptionStart: '2025-01-25',
    subscriptionStatus: 'Trial',
    monthlyFee: '0',
    customerNotes: 'Trial customer - HOMA acquisition'
  },
  {
    customerName: 'Putri Indah',
    contact: '628111111012',
    address: 'Jl. Pluit Permai No. 21',
    village: 'Pluit',
    district: 'Penjaringan',
    city: 'Jakarta Utara',
    postalCode: '14450',
    subscriptionPackage: 'Trial Package - Office Cleaning (1 visit)',
    subscriptionStart: '2025-01-26',
    subscriptionStatus: 'Trial',
    monthlyFee: '0',
    customerNotes: 'Trial customer - Office space cleaning'
  },
  {
    customerName: 'Agus Salim',
    contact: '628111111013',
    address: 'Jl. Condet Raya No. 44',
    village: 'Condet',
    district: 'Kramat Jati',
    city: 'Jakarta Timur',
    postalCode: '13560',
    subscriptionPackage: 'Trial Package - Basic Cleaning (1 visit)',
    subscriptionStart: '2025-01-27',
    subscriptionStatus: 'Trial',
    monthlyFee: '0',
    customerNotes: 'Trial customer - HOMA acquisition'
  },
  {
    customerName: 'Lilis Suryani',
    contact: '628111111014',
    address: 'Jl. Kebon Jeruk Raya No. 66',
    village: 'Kebon Jeruk',
    district: 'Kebon Jeruk',
    city: 'Jakarta Barat',
    postalCode: '11530',
    subscriptionPackage: 'Trial Package - Regular Cleaning (1 visit)',
    subscriptionStart: '2025-01-28',
    subscriptionStatus: 'Trial',
    monthlyFee: '0',
    customerNotes: 'Trial customer - Altrix acquisition'
  },
  {
    customerName: 'Hendra Wijaya',
    contact: '628111111015',
    address: 'Jl. Pasar Minggu Raya No. 99',
    village: 'Pasar Minggu',
    district: 'Pasar Minggu',
    city: 'Jakarta Selatan',
    postalCode: '12520',
    subscriptionPackage: 'Trial Package - Frequent Cleaning (1 visit)',
    subscriptionStart: '2025-01-29',
    subscriptionStatus: 'Trial',
    monthlyFee: '0',
    customerNotes: 'Trial customer - HOMA acquisition'
  },
  {
    customerName: 'Yuni Astuti',
    contact: '628111111016',
    address: 'Jl. Sunter Agung No. 11',
    village: 'Sunter Agung',
    district: 'Tanjung Priok',
    city: 'Jakarta Utara',
    postalCode: '14350',
    subscriptionPackage: 'Trial Package - Office Cleaning (1 visit)',
    subscriptionStart: '2025-01-30',
    subscriptionStatus: 'Trial',
    monthlyFee: '0',
    customerNotes: 'Trial customer - Office space cleaning'
  },
  {
    customerName: 'Budi Santoso',
    contact: '628111111017',
    address: 'Jl. Jatinegara Barat No. 22',
    village: 'Jatinegara',
    district: 'Jatinegara',
    city: 'Jakarta Timur',
    postalCode: '13310',
    subscriptionPackage: 'Trial Package - Basic Cleaning (1 visit)',
    subscriptionStart: '2025-01-31',
    subscriptionStatus: 'Trial',
    monthlyFee: '0',
    customerNotes: 'Trial customer - HOMA acquisition'
  },
  {
    customerName: 'Sari Dewi',
    contact: '628111111018',
    address: 'Jl. Tebet Barat Dalam No. 88',
    village: 'Tebet',
    district: 'Tebet',
    city: 'Jakarta Selatan',
    postalCode: '12810',
    subscriptionPackage: 'Trial Package - Regular Cleaning (1 visit)',
    subscriptionStart: '2025-02-01',
    subscriptionStatus: 'Trial',
    monthlyFee: '0',
    customerNotes: 'Trial customer - Altrix acquisition'
  },
  {
    customerName: 'Tony Wijaya',
    contact: '628111111019',
    address: 'Jl. Cengkareng Timur No. 55',
    village: 'Cengkareng',
    district: 'Cengkareng',
    city: 'Jakarta Barat',
    postalCode: '11730',
    subscriptionPackage: 'Trial Package - Frequent Cleaning (1 visit)',
    subscriptionStart: '2025-02-02',
    subscriptionStatus: 'Trial',
    monthlyFee: '0',
    customerNotes: 'Trial customer - HOMA acquisition'
  },
  {
    customerName: 'Indira Sari',
    contact: '628111111020',
    address: 'Jl. Casablanca Raya No. 77',
    village: 'Menteng Dalam',
    district: 'Tebet',
    city: 'Jakarta Selatan',
    postalCode: '12870',
    subscriptionPackage: 'Trial Package - Office Cleaning (1 visit)',
    subscriptionStart: '2025-02-03',
    subscriptionStatus: 'Trial',
    monthlyFee: '0',
    customerNotes: 'Trial customer - Office space cleaning'
  }
];

export async function importTrialCustomers() {
  try {
    console.log('Starting import of 20 trial customers...');
    
    // Insert all trial customers
    const result = await db.insert(customerDB).values(trialCustomers).returning({ id: customerDB.id });
    
    console.log(`Successfully imported ${result.length} trial customers:`);
    result.forEach((customer: { id: string }, index: number) => {
      console.log(`${index + 1}. ${trialCustomers[index].customerName} - ID: ${customer.id}`);
    });
    
    return result;
  } catch (error) {
    console.error('Error importing trial customers:', error);
    throw error;
  }
}

// Run if called directly
if (require.main === module) {
  importTrialCustomers()
    .then(() => {
      console.log('Import completed successfully!');
      process.exit(0);
    })
    .catch((error) => {
      console.error('Import failed:', error);
      process.exit(1);
    });
}