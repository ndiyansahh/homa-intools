import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { customerDB, mitraDB } from '@/lib/schema';
import { sql, and, or, eq, desc } from 'drizzle-orm';

export async function GET(request: NextRequest): Promise<NextResponse> {
  try {
    console.log('Testing Drizzle ORM with trials...');
    
    // Simple test first - just get customers without JOIN
    console.log('Step 1: Testing basic customer query...');
    const basicCustomers = await db
      .select({
        id: customerDB.id,
        customerName: customerDB.customerName,
        subscriptionStatus: customerDB.subscriptionStatus,
        assignedMitraId: customerDB.assignedMitraId,
      })
      .from(customerDB)
      .where(
        and(
          or(
            eq(customerDB.subscriptionStatus, 'Trial'),
            eq(customerDB.subscriptionStatus, 'Trial Scheduled')
          ),
          or(eq(customerDB.isDeleted, false), sql`${customerDB.isDeleted} IS NULL`)
        )
      )
      .limit(5);
    
    console.log('Basic customers result:', basicCustomers.length);

    // Step 2: Test with JOIN
    console.log('Step 2: Testing with LEFT JOIN...');
    const joinResult = await db
      .select({
        id: customerDB.id,
        customerName: customerDB.customerName,
        assignedMitraId: customerDB.assignedMitraId,
        assignedMitraName: mitraDB.mitraName,
        assignedMitraStatus: mitraDB.status,
      })
      .from(customerDB)
      .leftJoin(mitraDB, eq(customerDB.assignedMitraId, mitraDB.id))
      .where(
        and(
          or(
            eq(customerDB.subscriptionStatus, 'Trial'),
            eq(customerDB.subscriptionStatus, 'Trial Scheduled')
          ),
          or(eq(customerDB.isDeleted, false), sql`${customerDB.isDeleted} IS NULL`)
        )
      )
      .orderBy(desc(customerDB.createdAt))
      .limit(50);

    console.log('JOIN result:', joinResult.length);

    return NextResponse.json({
      success: true,
      message: 'Drizzle ORM test',
      basicCustomers,
      joinResult,
      step1Count: basicCustomers.length,
      step2Count: joinResult.length
    });

  } catch (error) {
    console.error('Drizzle ORM test error:', error);
    return NextResponse.json({
      success: false,
      message: 'Drizzle ORM test failed',
      error: error instanceof Error ? error.message : String(error),
      stack: error instanceof Error ? error.stack : 'No stack trace'
    }, { status: 500 });
  }
}