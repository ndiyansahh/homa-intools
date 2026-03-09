import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { regionDB } from '@/lib/schema';
import { sql, eq, or, asc, and } from 'drizzle-orm';
import { getSession } from '@/lib/auth';

export async function GET(request: NextRequest): Promise<NextResponse> {
  try {
    // Check authentication
    const session = await getSession();
    if (!session) {
      return NextResponse.json(
        { success: false, message: 'Unauthorized' },
        { status: 401 }
      );
    }

    // Check RBAC - ADMIN/OWNER/STAFF can access
    if (session && !['ADMIN', 'OWNER', 'STAFF'].includes(session.role)) {
      return NextResponse.json(
        { success: false, message: 'Forbidden' },
        { status: 403 }
      );
    }

    // Get query parameters
    const { searchParams } = new URL(request.url);
    const city_id = searchParams.get('city_id');

    // Validate required parameter
    if (!city_id) {
      return NextResponse.json(
        { success: false, message: 'city_id parameter is required' },
        { status: 400 }
      );
    }

    try {
      // Get districts for the specified city
      const regions = await db
        .select({
          id: regionDB.id,
          district: regionDB.district,
          city: regionDB.city,
        })
        .from(regionDB)
        .where(
          and(
            eq(regionDB.city, city_id),
            or(eq(regionDB.isDeleted, false), sql`${regionDB.isDeleted} IS NULL`),
            or(eq(regionDB.isActive, true), sql`${regionDB.isActive} IS NULL`),
            sql`${regionDB.district} IS NOT NULL AND ${regionDB.district} != ''`
          )
        )
        .orderBy(asc(regionDB.district));

      // Remove duplicates based on district name and create proper response format
      const uniqueDistricts = Array.from(
        new Map(regions.map(region => [region.district, region])).values()
      ).map(region => ({
        id: region.district, // Use district name as ID
        name: region.district,
        city_id: region.city
      }));

      return NextResponse.json({
        success: true,
        data: uniqueDistricts,
        total: uniqueDistricts.length,
        message: uniqueDistricts.length === 0 ? 'No districts found for this city' : undefined,
      });

    } catch (dbError) {
      console.error('Database error during districts fetch:', dbError);
      return NextResponse.json(
        { success: false, message: 'Failed to fetch districts - database error' },
        { status: 500 }
      );
    }

  } catch (error) {
    console.error('Districts API error:', error);
    return NextResponse.json(
      { 
        success: false, 
        message: 'Internal server error',
        error: process.env.NODE_ENV === 'development' ? String(error) : undefined
      },
      { status: 500 }
    );
  }
}