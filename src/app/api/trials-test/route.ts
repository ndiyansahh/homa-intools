import { NextRequest, NextResponse } from 'next/server';
import { Pool } from 'pg';

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
});

export async function GET(request: NextRequest): Promise<NextResponse> {
  try {
    console.log('Testing trials with raw SQL...');
    
    const result = await pool.query(`
      SELECT 
        c.id,
        c.customer_name,
        c.city,
        c.district,
        c.assigned_mitra_id,
        m.mitra_name as assigned_mitra_name,
        m.status as assigned_mitra_status,
        c.created_at
      FROM customer_db c
      LEFT JOIN mitra_db m ON c.assigned_mitra_id = m.id
      WHERE c.subscription_status IN ('Trial Scheduled', 'Trial')
      AND (c.is_deleted = false OR c.is_deleted IS NULL)
      ORDER BY c.created_at DESC
      LIMIT 10
    `);

    const trialsWithCleanerData = result.rows.map(row => ({
      id: row.id,
      customerName: row.customer_name,
      city: row.city,
      district: row.district,
      assignedMitraId: row.assigned_mitra_id,
      assignedCleaners: row.assigned_mitra_name ? [row.assigned_mitra_name] : [],
      cleanerStatus: row.assigned_mitra_status,
      createdAt: row.created_at
    }));

    return NextResponse.json({
      success: true,
      message: 'Raw SQL query test',
      total: result.rows.length,
      data: trialsWithCleanerData
    });

  } catch (error) {
    console.error('Raw SQL test error:', error);
    return NextResponse.json({
      success: false,
      message: 'Raw SQL test failed',
      error: 'Internal server error'
    }, { status: 500 });
  }
}