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

    try {
      // Get all regions and extract unique cities
      const regions = await db
        .select({
          id: regionDB.id,
          city: regionDB.city,
        })
        .from(regionDB)
        .where(
          and(
            or(eq(regionDB.isDeleted, false), sql`${regionDB.isDeleted} IS NULL`),
            or(eq(regionDB.isActive, true), sql`${regionDB.isActive} IS NULL`),
            sql`${regionDB.city} IS NOT NULL AND ${regionDB.city} != ''`
          )
        )
        .orderBy(asc(regionDB.city));

      // Remove duplicates based on city name and create proper response format
      const uniqueCities = Array.from(
        new Map(regions.map(region => [region.city, region])).values()
      ).map(region => ({
        id: region.city, // Use city name as ID since there's no separate city table
        name: region.city
      }));

      return NextResponse.json({
        success: true,
        data: uniqueCities,
        total: uniqueCities.length,
        message: uniqueCities.length === 0 ? 'No cities found' : undefined,
      });

    } catch (dbError) {
      console.error('Database error during cities fetch:', dbError);
      return NextResponse.json(
        { success: false, message: 'Failed to fetch cities - database error' },
        { status: 500 }
      );
    }

  } catch (error) {
    console.error('Cities API error:', error);
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