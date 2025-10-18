import { db } from '../src/lib/db';
import { regionDB, subscriptionPackageDB, mitraDB } from '../src/lib/schema';
import * as dotenv from 'dotenv';

// Load environment variables
dotenv.config({ path: '.env.local' });

async function seedRegions() {
  console.log('🌍 Seeding regions...');
  
  const regions = [
    {
      regionName: 'Jakarta Selatan',
      province: 'DKI Jakarta',
      city: 'Jakarta Selatan',
      district: 'Kebayoran Baru',
      postalCode: '12110',
    },
    {
      regionName: 'Jakarta Barat',
      province: 'DKI Jakarta', 
      city: 'Jakarta Barat',
      district: 'Kebon Jeruk',
      postalCode: '11530',
    },
    {
      regionName: 'Tangerang',
      province: 'Banten',
      city: 'Tangerang',
      district: 'Karawaci',
      postalCode: '15810',
    },
    {
      regionName: 'Bekasi',
      province: 'Jawa Barat',
      city: 'Bekasi',
      district: 'Bekasi Barat',
      postalCode: '17134',
    },
    {
      regionName: 'Depok',
      province: 'Jawa Barat',
      city: 'Depok',
      district: 'Margonda',
      postalCode: '16423',
    },
    {
      regionName: 'Bogor',
      province: 'Jawa Barat',
      city: 'Bogor',
      district: 'Bogor Tengah',
      postalCode: '16121',
    }
  ];

  try {
    await db.insert(regionDB).values(regions).onConflictDoNothing();
    console.log(`✅ Inserted ${regions.length} regions`);
  } catch (error) {
    console.error('❌ Error seeding regions:', error);
  }
}

async function seedSubscriptionPackages() {
  console.log('📦 Seeding subscription packages...');
  
  const packages = [
    {
      packageName: 'Regular Cleaning - Standard',
      packageType: 'Regular',
      visitsPerWeek: 2,
      pricePerVisit: '50000',
      totalPrice: '400000',
      duration: 30,
      description: 'Standard regular cleaning service - 2 visits per week'
    },
    {
      packageName: 'Regular Cleaning - Premium',
      packageType: 'Regular', 
      visitsPerWeek: 2,
      pricePerVisit: '65000',
      totalPrice: '520000',
      duration: 30,
      description: 'Premium regular cleaning service - 2 visits per week with extra care'
    },
    {
      packageName: 'Frequent Cleaning - Intensive',
      packageType: 'Frequent',
      visitsPerWeek: 3,
      pricePerVisit: '45000',
      totalPrice: '540000',
      duration: 30,
      description: 'Intensive frequent cleaning - 3 visits per week'
    },
    {
      packageName: 'Frequent Cleaning - Premium',
      packageType: 'Frequent',
      visitsPerWeek: 3,
      pricePerVisit: '60000',
      totalPrice: '720000',
      duration: 30,
      description: 'Premium frequent cleaning - 3 visits per week with deep clean'
    },
    {
      packageName: 'Special Partnership - Office',
      packageType: 'Special',
      visitsPerWeek: 1,
      pricePerVisit: '80000',
      totalPrice: '320000',
      duration: 30,
      description: 'Special office cleaning partnership - 1 visit per week'
    },
    {
      packageName: 'Special Partnership - Apartment Complex',
      packageType: 'Special',
      visitsPerWeek: 1,
      pricePerVisit: '70000',
      totalPrice: '280000',
      duration: 30,
      description: 'Special apartment complex cleaning - 1 visit per week'
    },
    {
      packageName: 'Basic Cleaning - Economy',
      packageType: 'Basic',
      visitsPerWeek: 1,
      pricePerVisit: '40000',
      totalPrice: '160000',
      duration: 30,
      description: 'Basic economy cleaning service - 1 visit per week'
    },
    {
      packageName: 'Basic Cleaning - Standard',
      packageType: 'Basic',
      visitsPerWeek: 1,
      pricePerVisit: '55000',
      totalPrice: '220000',
      duration: 30,
      description: 'Basic standard cleaning service - 1 visit per week'
    }
  ];

  try {
    await db.insert(subscriptionPackageDB).values(packages).onConflictDoNothing();
    console.log(`✅ Inserted ${packages.length} subscription packages`);
  } catch (error) {
    console.error('❌ Error seeding subscription packages:', error);
  }
}

async function seedMitra() {
  console.log('👥 Seeding mitra (cleaners)...');
  
  const mitras = [
    {
      mitraName: 'Handi',
      contact: '+62812-3456-7890',
      address: 'Jl. Raya Jakarta No. 123',
      city: 'Jakarta Selatan',
      mitraType: 'Cleaner',
      status: 'Active',
      baseRate: '45000',
      commissionRate: '10.00'
    },
    {
      mitraName: 'Syeila',
      contact: '+62813-4567-8901',
      address: 'Jl. Kemang Raya No. 45',
      city: 'Jakarta Selatan',
      mitraType: 'Cleaner',
      status: 'Active',
      baseRate: '50000',
      commissionRate: '12.00'
    },
    {
      mitraName: 'Imam',
      contact: '+62814-5678-9012',
      address: 'Jl. BSD Boulevard No. 67',
      city: 'Tangerang',
      mitraType: 'Cleaner',
      status: 'Active',
      baseRate: '48000',
      commissionRate: '11.00'
    },
    {
      mitraName: 'Sari',
      contact: '+62815-6789-0123',
      address: 'Jl. Ahmad Yani No. 89',
      city: 'Bekasi',
      mitraType: 'Cleaner',
      status: 'Active',
      baseRate: '47000',
      commissionRate: '10.50'
    },
    {
      mitraName: 'Budi',
      contact: '+62816-7890-1234',
      address: 'Jl. Margonda Raya No. 34',
      city: 'Depok',
      mitraType: 'Supervisor',
      status: 'Active',
      baseRate: '60000',
      commissionRate: '15.00'
    },
    {
      mitraName: 'Rina',
      contact: '+62817-8901-2345',
      address: 'Jl. Pajajaran No. 56',
      city: 'Bogor',
      mitraType: 'Cleaner',
      status: 'Active',
      baseRate: '46000',
      commissionRate: '10.00'
    }
  ];

  try {
    await db.insert(mitraDB).values(mitras).onConflictDoNothing();
    console.log(`✅ Inserted ${mitras.length} mitra records`);
  } catch (error) {
    console.error('❌ Error seeding mitra:', error);
  }
}

async function main() {
  console.log('🚀 Starting database seeding...');
  
  try {
    await seedRegions();
    await seedSubscriptionPackages();
    await seedMitra();
    
    console.log('✨ Database seeding completed successfully!');
  } catch (error) {
    console.error('💥 Database seeding failed:', error);
    process.exit(1);
  }
  
  process.exit(0);
}

// Run the seed script
main();