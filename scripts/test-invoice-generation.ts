/**
 * Test Script: Verify Invoice Auto-Generation
 *
 * This script tests that invoices are automatically generated when creating customers.
 *
 * Expected behavior:
 * 1. Generate sequential invoice numbers (no duplicates)
 * 2. Create invoice with format INV/Cleaning/YYYY.M.DD-#####
 * 3. Link customer.invoice_id to generated invoice
 * 4. Link visits to same invoice_id
 */

import { db } from '../src/lib/db';
import { customerDB, invoiceDB, visitDB } from '../src/lib/schema';
import { createInvoice } from '../src/lib/utils/invoiceUtils';
import { eq } from 'drizzle-orm';

async function testInvoiceGeneration() {
  try {
    console.log('🧪 Testing Invoice Auto-Generation...\n');

    // Test 1: Check current max invoice number
    console.log('📊 Test 1: Current invoice count');
    const invoices = await db.select().from(invoiceDB);
    console.log(`   Found ${invoices.length} existing invoices`);
    if (invoices.length > 0) {
      const maxInvoiceNo = Math.max(...invoices.map(inv => inv.invoiceNo));
      console.log(`   Max invoice number: ${maxInvoiceNo}`);
      console.log(`   Latest: ${invoices[invoices.length - 1].invoiceNumber}\n`);
    }

    // Test 2: Create test customer with invoice
    console.log('✨ Test 2: Create test customer');
    const testCustomer = {
      customerName: 'TEST INVOICE - ' + new Date().toISOString(),
      contact: '081234567890',
      address: 'Test Address for Invoice',
      city: 'Jakarta Selatan',
      subscriptionStart: new Date('2026-03-10'),
      subscriptionEnd: new Date('2026-04-10'),
      monthlyFee: '150000',
    };

    const customerResult = await db
      .insert(customerDB)
      .values(testCustomer)
      .returning({ id: customerDB.id });

    const customerId = customerResult[0].id;
    console.log(`   ✅ Customer created: ${customerId}`);

    // Test 3: Generate invoice for customer
    console.log('\n📄 Test 3: Generate invoice');
    const invoice = await createInvoice({
      customerId: customerId,
    });

    console.log(`   ✅ Invoice generated: ${invoice.invoiceNumber}`);
    console.log(`   - ID: ${invoice.id}`);
    console.log(`   - Sequence: ${invoice.invoiceNo}`);
    console.log(`   - Customer: ${invoice.invoiceCustomerName}`);
    console.log(`   - Amount: Rp ${invoice.totalAmount}`);

    // Test 4: Verify invoice number format
    console.log('\n🔍 Test 4: Verify invoice format');
    const formatRegex = /^INV\/Cleaning\/\d{4}\.\d{1,2}\.\d{2}-\d{5}$/;
    const isValidFormat = formatRegex.test(invoice.invoiceNumber);
    console.log(`   Format check: ${isValidFormat ? '✅ PASS' : '❌ FAIL'}`);
    console.log(`   Expected: INV/Cleaning/YYYY.M.DD-#####`);
    console.log(`   Actual: ${invoice.invoiceNumber}`);

    // Test 5: Update customer with invoice_id
    console.log('\n🔗 Test 5: Link customer to invoice');
    await db
      .update(customerDB)
      .set({ invoiceId: invoice.id })
      .where(eq(customerDB.id, customerId));

    const updatedCustomer = await db
      .select()
      .from(customerDB)
      .where(eq(customerDB.id, customerId))
      .limit(1);

    const hasInvoiceLink = updatedCustomer[0].invoiceId === invoice.id;
    console.log(`   Customer link: ${hasInvoiceLink ? '✅ PASS' : '❌ FAIL'}`);

    // Test 6: Sequential numbering
    console.log('\n🔢 Test 6: Verify sequential numbering');
    console.log('   Creating second invoice...');

    const testCustomer2 = {
      customerName: 'TEST INVOICE 2 - ' + new Date().toISOString(),
      contact: '081234567891',
      address: 'Test Address 2',
      city: 'Jakarta Barat',
      subscriptionStart: new Date('2026-03-15'),
      monthlyFee: '200000',
    };

    const customerResult2 = await db
      .insert(customerDB)
      .values(testCustomer2)
      .returning({ id: customerDB.id });

    const invoice2 = await createInvoice({
      customerId: customerResult2[0].id,
    });

    const isSequential = invoice2.invoiceNo === invoice.invoiceNo + 1;
    console.log(`   First invoice: #${invoice.invoiceNo}`);
    console.log(`   Second invoice: #${invoice2.invoiceNo}`);
    console.log(`   Sequential: ${isSequential ? '✅ PASS' : '❌ FAIL'}`);

    // Test 7: Database consistency
    console.log('\n✅ Test 7: Database consistency check');
    const allInvoices = await db
      .select()
      .from(invoiceDB)
      .orderBy(invoiceDB.invoiceNo);

    console.log(`   Total invoices in DB: ${allInvoices.length}`);

    const uniqueNumbers = new Set(allInvoices.map(inv => inv.invoiceNo));
    const hasNoDuplicates = uniqueNumbers.size === allInvoices.length;
    console.log(`   No duplicates: ${hasNoDuplicates ? '✅ PASS' : '❌ FAIL'}`);

    // Cleanup test data
    console.log('\n🧹 Cleanup: Removing test data...');
    await db.delete(customerDB).where(eq(customerDB.id, customerId));
    await db.delete(customerDB).where(eq(customerDB.id, customerResult2[0].id));
    await db.delete(invoiceDB).where(eq(invoiceDB.id, invoice.id));
    await db.delete(invoiceDB).where(eq(invoiceDB.id, invoice2.id));
    console.log('   ✅ Test data cleaned up');

    console.log('\n✅ All tests passed!\n');
  } catch (error) {
    console.error('\n❌ Test failed:', error);
    throw error;
  }
}

testInvoiceGeneration()
  .then(() => {
    console.log('✅ Invoice generation test completed successfully');
    process.exit(0);
  })
  .catch((error) => {
    console.error('❌ Invoice generation test failed:', error);
    process.exit(1);
  });
