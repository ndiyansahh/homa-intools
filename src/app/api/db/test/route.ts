import { NextRequest, NextResponse } from 'next/server';
import { testConnection } from '@/lib/db';

export async function GET(request: NextRequest) {
  try {
    // Test database connection
    const connectionResult = await testConnection();
    
    if (!connectionResult.success) {
      return NextResponse.json(
        {
          success: false,
          message: 'Database connection failed',
          error: connectionResult.error,
        },
        { status: 503 }
      );
    }

    return NextResponse.json({
      success: true,
      message: 'Database connection successful',
      data: {
        timestamp: connectionResult.timestamp,
        database: {
          version: connectionResult.version,
        },
        pool: connectionResult.pool,
        environment: {
          nodeEnv: process.env.NODE_ENV,
          databaseUrl: process.env.DATABASE_URL ? 
            `${process.env.DATABASE_URL.split('@')[1]}` : // Hide credentials
            'Not configured',
        },
      },
    });
  } catch (error) {
    console.error('Database test error:', error);
    
    return NextResponse.json(
      {
        success: false,
        message: 'Database test failed',
        error: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    );
  }
}

// Health check endpoint
export async function HEAD(request: NextRequest) {
  try {
    const result = await testConnection();
    
    if (result.success) {
      return new NextResponse(null, { status: 200 });
    } else {
      return new NextResponse(null, { status: 503 });
    }
  } catch (error) {
    return new NextResponse(null, { status: 500 });
  }
}