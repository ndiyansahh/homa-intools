import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { customerDB } from '@/lib/schema';
import { eq } from 'drizzle-orm';
import { createInvoice } from '@/lib/utils/invoiceUtils';

/**
 * Test endpoint to verify that invoiceCustomerName is dynamically populated from customerDB
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    
    if (!body.customerId) {
      return NextResponse.json({
        success: false,
        error: 'customerId is required'
      }, { status: 400 });
    }

    // Step 1: Get the actual customer name from database
    const customerResult = await db
      .select({
        customerName: customerDB.customerName,
        contact: customerDB.contact,
        address: customerDB.address,
      })
      .from(customerDB)
      .where(eq(customerDB.id, body.customerId))
      .limit(1);

    if (customerResult.length === 0) {
      return NextResponse.json({
        success: false,
        error: 'Customer not found'
      }, { status: 404 });
    }

    const actualCustomer = customerResult[0];

    // Step 2: Create invoice using the utility function
    const invoice = await createInvoice({
      customerId: body.customerId,
      invoicePromoCode: 'DYNAMIC-TEST',
      invoicePromoDiscount: 0,
      notes: 'Testing dynamic customer name population',
    });

    // Step 3: Verify that the invoice customer name matches the database
    const isMatching = invoice.invoiceCustomerName === actualCustomer.customerName;

    return NextResponse.json({
      success: true,
      message: 'Dynamic customer name verification test',
      verification: {
        database_customer_name: actualCustomer.customerName,
        invoice_customer_name: invoice.invoiceCustomerName,
        is_dynamic_data: isMatching,
        invoice_number: invoice.invoiceNumber,
        invoice_no: invoice.invoiceNo,
      },
      proof: {
        source: 'customerDB.customerName (dynamic)',
        populated_in: 'invoiceDB.invoiceCustomerName',
        verification_status: isMatching ? '✅ DYNAMIC DATA CONFIRMED' : '❌ STATIC DATA DETECTED',
      },
      explanation: {
        step1: 'Query customerDB to get actual customer name from database',
        step2: 'Create invoice using createInvoice() utility function',
        step3: 'Compare invoice.invoiceCustomerName with actual database value',
        result: isMatching 
          ? 'invoiceCustomerName is dynamically populated from customerDB.customerName' 
          : 'invoiceCustomerName does not match database value (potential issue)',
      }
    });

  } catch (error) {
    return NextResponse.json({
      success: false,
      error: (error as Error).message,
    }, { status: 500 });
  }
}

/**
 * GET endpoint to show how dynamic population works
 */
export async function GET() {
  return NextResponse.json({
    message: 'Invoice Dynamic Data Verification',
    purpose: 'Verify that invoiceCustomerName is dynamically populated from customerDB.customerName',
    flow: {
      step1: 'Query customerDB.customerName for given customerId',
      step2: 'Create invoice using createInvoice() utility',
      step3: 'Verify invoiceCustomerName matches database value',
    },
    implementation: {
      database_query: 'SELECT customerName FROM customerDB WHERE id = customerId',
      invoice_creation: 'invoiceCustomerName: customer.customerName',
      verification: 'Compare invoice.invoiceCustomerName === database.customerName',
    },
    usage: {
      endpoint: 'POST /api/invoice/verify-dynamic',
      payload: { customerId: 'valid-customer-uuid' },
      response: 'Shows database value vs invoice value and confirmation of dynamic data',
    }
  });
}