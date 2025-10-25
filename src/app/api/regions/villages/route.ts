import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { regionDB } from '@/lib/schema';
import { sql, eq, or, asc, and } from 'drizzle-orm';
import { getSession } from '@/lib/auth';

export async function GET(request: NextRequest): Promise<NextResponse> {
  try {
    // Check authentication
    const session = await getSession();
    if (!session && process.env.NODE_ENV !== 'development') {
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
    const district_id = searchParams.get('district_id');

    // Validate required parameter
    if (!district_id) {
      return NextResponse.json(
        { success: false, message: 'district_id parameter is required' },
        { status: 400 }
      );
    }

    try {
      // Get villages for the specified district
      const regions = await db
        .select({
          id: regionDB.id,
          village: regionDB.village,
          district: regionDB.district,
          postalCode: regionDB.postalCode,
        })
        .from(regionDB)
        .where(
          and(
            eq(regionDB.district, district_id),
            or(eq(regionDB.isDeleted, false), sql`${regionDB.isDeleted} IS NULL`),
            or(eq(regionDB.isActive, true), sql`${regionDB.isActive} IS NULL`),
            sql`${regionDB.village} IS NOT NULL AND ${regionDB.village} != ''`
          )
        )
        .orderBy(asc(regionDB.village));

      // Remove duplicates based on village name and create proper response format
      const uniqueVillages = Array.from(
        new Map(regions.map(region => [region.village, region])).values()
      ).map(region => ({
        id: region.village, // Use village name as ID
        name: region.village,
        district_id: region.district,
        postal_code: region.postalCode
      }));

      return NextResponse.json({
        success: true,
        data: uniqueVillages,
        total: uniqueVillages.length,
        message: uniqueVillages.length === 0 ? 'No villages found for this district' : undefined,
      });

    } catch (dbError) {
      console.error('Database error during villages fetch:', dbError);
      return NextResponse.json(
        { success: false, message: 'Failed to fetch villages - database error' },
        { status: 500 }
      );
    }

  } catch (error) {
    console.error('Villages API error:', error);
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