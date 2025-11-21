import { NextRequest, NextResponse } from 'next/server';
import { createInvoice, generateInvoiceSequenceNumber } from '@/lib/utils/invoiceUtils';

/**
 * Test endpoint to demonstrate the improved invoiceDB functionality
 * This will create an invoice with all data populated from customerDB
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    
    // Generate a sample invoice sequence number for demo
    const sequenceNumber = generateInvoiceSequenceNumber();
    
    // Example: Create invoice with populated data
    const result = await createInvoice({
      customerId: body.customerId, // Required: existing customer ID
      invoiceSequenceNumber: sequenceNumber,
      invoicePromoCode: body.invoicePromoCode || 'WELCOME10',
      invoicePromoDiscount: body.invoicePromoDiscount || 50000, // Rp 50,000
      notes: 'Test invoice with auto-populated data',
    });

    return NextResponse.json({
      success: true,
      message: 'Test invoice created successfully',
      data: {
        id: result.id,
        invoiceNumber: result.invoiceNumber,        // ✅ Format: INV/Cleaning/2025.09.01-00450
        invoiceNo: result.invoiceNo,                // ✅ Sequence number: 450
        invoiceCustomerName: result.invoiceCustomerName, // ✅ From customerDB.customerName
        totalAmount: result.totalAmount,            // ✅ Calculated total
      },
      explanation: {
        'invoiceNumber': 'Auto-generated: INV/Cleaning/yyyy.mm.dd-00000 format',
        'invoiceNo': 'Sequence number extracted from invoiceNumber',
        'invoiceStartDate': 'Populated from customerDB.subscriptionStart',
        'invoiceYears/Months/Days': 'Extracted from invoiceStartDate',
        'invoiceSubscription': 'Hardcoded as "Cleaning"',
        'invoiceCustomerName': 'Populated from customerDB.customerName',
        'invoiceAddress': 'Populated from customerDB.address',
        'invoicePhoneNumber': 'Populated from customerDB.contact',
        'invoiceQty': 'Default value 1 (subscriptionQTY column doesn\'t exist in DB)',
        'invoicePricePerQty': 'Uses customerDB.monthlyFee (subscriptionPerQTY column doesn\'t exist in DB)',
        'invoicePromoCode': 'Free text field for promo codes',
        'invoicePromoDiscount': 'Free amount for discounts',
      }
    });

  } catch (error) {
    return NextResponse.json({
      success: false,
      error: (error as Error).message,
      message: 'Make sure to provide valid customerId with subscriptionStart date'
    }, { status: 400 });
  }
}

/**
 * GET endpoint to demonstrate the improved invoice data structure
 */
export async function GET() {
  return NextResponse.json({
    message: 'InvoiceDB Improvements Documentation',
    improvements: {
      schema_changes: {
        'invoiceNumber': 'Format: INV/Cleaning/yyyy.mm.dd-00000 (auto-generated)',
        'invoiceNo': 'Sequence number from invoiceNumber (5-digit random)',
        'invoiceStartDate': 'Reference from customerDB.subscriptionStart',
        'invoiceYears': 'Year extracted from invoiceStartDate',
        'invoiceMonths': 'Month extracted from invoiceStartDate',
        'invoiceDays': 'Day extracted from invoiceStartDate',
        'invoiceSubscription': 'Hardcoded as "Cleaning"',
        'invoiceCustomerName': 'Populated from customerDB.customerName',
        'invoiceAddress': 'Populated from customerDB.address',
        'invoicePhoneNumber': 'Populated from customerDB.contact',
        'invoiceQty': 'Default value 1 (subscriptionQTY column doesn\'t exist in DB)',
        'invoicePricePerQty': 'Uses customerDB.monthlyFee (subscriptionPerQTY column doesn\'t exist in DB)',
        'invoicePromoCode': 'Free text field for promotional codes',
        'invoicePromoDiscount': 'Free amount field for discounts (Rp 0 default)'
      },
      invoice_number_format: {
        'pattern': 'INV/Cleaning/yyyy.mm.dd-00000',
        'example': 'INV/Cleaning/2025.09.01-00450',
        'date_source': 'customerDB.subscriptionStart',
        'sequence_generation': '5-digit random number (10000-99999)'
      },
      data_population: {
        'automatic_fields': 'All customer and subscription data auto-populated',
        'date_extraction': 'Year, month, day automatically extracted from subscription start',
        'calculation': 'Subtotal and total amount automatically calculated',
        'promo_support': 'Promo codes and discounts supported'
      }
    },
    usage: {
      'POST /api/invoice/test-create': 'Test the improved functionality',
      'required_params': ['customerId'],
      'optional_params': ['invoicePromoCode', 'invoicePromoDiscount'],
      'example_request': {
        'customerId': '879d467b-990e-4cee-a158-53375891805a',
        'invoicePromoCode': 'NEWCUSTOMER20',
        'invoicePromoDiscount': 100000
      }
    }
  });
}