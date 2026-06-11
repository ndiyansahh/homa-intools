import { NextRequest, NextResponse } from 'next/server';
import { db, pool } from '@/lib/db';
import { getSession } from '@/lib/auth';
import fs from 'fs';
import path from 'path';

export async function POST(request: NextRequest) {
  try {
    // Check authentication and authorization
    const session = await getSession();
    if (!session || !['ADMIN', 'OWNER'].includes(session.role)) {
      return NextResponse.json(
        { success: false, message: 'Unauthorized' },
        { status: 401 }
      );
    }

    const { action, force } = await request.json();

    if (action === 'init') {
      // Initialize database with schema
      const sqlPath = path.join(process.cwd(), 'sql', 'init.sql');
      
      if (!fs.existsSync(sqlPath)) {
        return NextResponse.json(
          { success: false, message: 'SQL initialization file not found' },
          { status: 404 }
        );
      }

      const sqlContent = fs.readFileSync(sqlPath, 'utf8');
      
      // Execute SQL script
      const client = await pool.connect();
      
      try {
        await client.query('BEGIN');
        await client.query(sqlContent);
        await client.query('COMMIT');
        
        return NextResponse.json({
          success: true,
          message: 'Database initialized successfully',
          timestamp: new Date().toISOString(),
        });
      } catch (error) {
        await client.query('ROLLBACK');
        throw error;
      } finally {
        client.release();
      }
    }

    if (action === 'seed') {
      // Run seed data
      try {
        // Note: In production, you might want to use a separate endpoint or CLI command
        const { exec } = require('child_process');
        const util = require('util');
        const execAsync = util.promisify(exec);
        
        await execAsync('npm run db:seed');
        
        return NextResponse.json({
          success: true,
          message: 'Database seeded successfully',
          timestamp: new Date().toISOString(),
        });
      } catch (error) {
        console.error('Seed error:', error);
        return NextResponse.json(
          { 
            success: false, 
            message: 'Database seeding failed',
            error: 'Internal server error'
          },
          { status: 500 }
        );
      }
    }

    return NextResponse.json(
      { success: false, message: 'Invalid action' },
      { status: 400 }
    );

  } catch (error) {
    console.error('Database migration error:', error);
    
    return NextResponse.json(
      {
        success: false,
        message: 'Database migration failed',
        error: 'Internal server error',
      },
      { status: 500 }
    );
  }
}

export async function GET(request: NextRequest) {
  try {
    const session = await getSession();
    if (!session || !['ADMIN', 'OWNER'].includes(session.role)) {
      return NextResponse.json(
        { success: false, message: 'Unauthorized' },
        { status: 401 }
      );
    }

    // Get migration status
    const client = await pool.connect();
    
    try {
      // Check if tables exist
      const result = await client.query(`
        SELECT table_name 
        FROM information_schema.tables 
        WHERE table_schema = 'public' 
        AND table_type = 'BASE TABLE'
        ORDER BY table_name;
      `);
      
      const tables = result.rows.map(row => row.table_name);
      
      // Check for expected tables
      const expectedTables = [
        'region_db',
        'subscription_package_db', 
        'customer_db',
        'mitra_db',
        'invoice_db',
        'attendance_schedule_db',
        'attendance_record_db',
        'mitra_payout_db'
      ];
      
      const missingTables = expectedTables.filter(table => !tables.includes(table));
      const isInitialized = missingTables.length === 0;
      
      return NextResponse.json({
        success: true,
        data: {
          isInitialized,
          existingTables: tables,
          missingTables,
          totalTables: tables.length,
          expectedTables: expectedTables.length,
        },
      });
      
    } finally {
      client.release();
    }

  } catch (error) {
    console.error('Migration status check error:', error);
    
    return NextResponse.json(
      {
        success: false,
        message: 'Failed to check migration status',
        error: 'Internal server error',
      },
      { status: 500 }
    );
  }
}