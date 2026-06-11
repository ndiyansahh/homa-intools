import { NextRequest, NextResponse } from 'next/server';

/**
 * API endpoint to get districts based on selected city for mitra assignment
 * Returns available districts for each Jabodetabek city
 */

export async function GET(request: NextRequest): Promise<NextResponse> {
  // Jabodetabek cities and their districts for mitra assignment
  const districtsByCity: Record<string, string[]> = {
    'Jakarta': [
      'Menteng', 'Tanah Abang', 'Senen', 'Johar Baru', 'Cempaka Putih',
      'Kemayoran', 'Sawah Besar', 'Gambir'
    ],
    'Jakarta Pusat': [
      'Menteng', 'Tanah Abang', 'Senen', 'Johar Baru', 'Cempaka Putih',
      'Kemayoran', 'Sawah Besar', 'Gambir'
    ],
    'Jakarta Barat': [
      'Kebon Jeruk', 'Palmerah', 'Grogol Petamburan', 'Tambora', 'Taman Sari',
      'Cengkareng', 'Kembangan', 'Kalideres'
    ],
    'Jakarta Timur': [
      'Jatinegara', 'Duren Sawit', 'Kramat Jati', 'Matraman', 'Pulo Gadung',
      'Cakung', 'Cipayung', 'Makasar', 'Pasar Rebo', 'Ciracas'
    ],
    'Jakarta Selatan': [
      'Kebayoran Baru', 'Kebayoran Lama', 'Mampang Prapatan', 'Pancoran',
      'Tebet', 'Setiabudi', 'Jagakarsa', 'Pasar Minggu', 'Cilandak', 'Pesanggrahan'
    ],
    'Jakarta Utara': [
      'Tanjung Priok', 'Koja', 'Kelapa Gading', 'Penjaringan', 'Pademangan',
      'Ancol'
    ],
    'Bogor': [
      'Bogor Tengah', 'Bogor Utara', 'Bogor Selatan', 'Bogor Timur', 'Bogor Barat',
      'Tanah Sareal', 'Cibinong', 'Citeureup', 'Sukaraja', 'Tajur Halang'
    ],
    'Depok': [
      'Pancoran Mas', 'Beji', 'Limo', 'Cinere', 'Cipayung', 'Sukmajaya',
      'Cilodong', 'Cimanggis', 'Tapos', 'Bojongsari', 'Sawangan'
    ],
    'Tangerang': [
      'Tangerang Kota', 'Cipondoh', 'Karawaci', 'Pinang', 'Ciledug', 'Larangan',
      'Karang Tengah', 'Neglasari', 'Benda', 'Periuk', 'Batuceper'
    ],
    'Tangerang Selatan': [
      'Serpong', 'Serpong Utara', 'Pondok Aren', 'Ciputat', 'Ciputat Timur',
      'Pamulang', 'Setu'
    ],
    'Bekasi': [
      'Bekasi Timur', 'Bekasi Barat', 'Bekasi Selatan', 'Bekasi Utara',
      'Medan Satria', 'Bantar Gebang', 'Mustika Jaya', 'Rawalumbu',
      'Jati Asih', 'Jati Sampurna', 'Pondok Gede', 'Pondok Melati'
    ]
  };

  // Get valid Jabodetabek cities
  const validCities = Object.keys(districtsByCity);
  try {
    const { searchParams } = new URL(request.url);
    const city = searchParams.get('city');

    // If no city specified, return all cities
    if (!city) {
      return NextResponse.json({
        success: true,
        data: {
          cities: validCities,
          totalCities: validCities.length
        },
        message: 'Available cities for mitra assignment'
      });
    }

    // Get districts for specific city
    const districts = districtsByCity[city];
    
    if (!districts) {
      return NextResponse.json({
        success: false,
        message: `City '${city}' not found. Valid cities: ${validCities.join(', ')}`
      }, { status: 404 });
    }

    return NextResponse.json({
      success: true,
      data: {
        city: city,
        districts: districts,
        totalDistricts: districts.length
      },
      message: `Districts available in ${city}`
    });

  } catch (error) {
    console.error('Districts API error:', error);
    return NextResponse.json(
      {
        success: false,
        message: 'Failed to fetch districts',
        error: 'Internal server error',
      },
      { status: 500 }
    );
  }
}