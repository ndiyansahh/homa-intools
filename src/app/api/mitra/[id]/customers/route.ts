import { NextRequest, NextResponse } from 'next/server';

interface RouteParams {
  params: Promise<{ id: string }>;
}

export async function GET(
  request: NextRequest,
  { params }: RouteParams
): Promise<NextResponse> {
  try {
    const { id: mitraId } = await params;

    // Forward the request to the customers API with the mitra filter
    const { searchParams } = new URL(request.url);
    
    // Build URL for customers API with mitra filter
    const customerApiUrl = new URL('/api/customers', request.url);
    customerApiUrl.searchParams.set('assignedMitra', mitraId);
    
    // Forward all other search params
    for (const [key, value] of searchParams) {
      if (key !== 'assignedMitra') {
        customerApiUrl.searchParams.set(key, value);
      }
    }

    // Fetch from customers API
    const response = await fetch(customerApiUrl.toString(), {
      headers: {
        'Cookie': request.headers.get('Cookie') || '',
      },
    });

    const data = await response.json();

    if (!response.ok) {
      return NextResponse.json(data, { status: response.status });
    }

    return NextResponse.json({
      ...data,
      message: `Customers assigned to mitra ${mitraId}`,
    });

  } catch (error) {
    console.error('Mitra customers API error:', error);
    return NextResponse.json(
      { success: false, message: 'Failed to fetch mitra customers' },
      { status: 500 }
    );
  }
}