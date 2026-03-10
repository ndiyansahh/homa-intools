/**
 * One-time script to backfill invoices for existing customers
 * Run this ONCE on staging/production to generate invoices for customers created before invoice feature
 *
 * Usage:
 *   npx tsx scripts/backfill-invoices.ts
 */

import { db } from '@/lib/db';
import { customerDB, invoiceDB } from '@/lib/schema';
import { isNull, sql } from 'drizzle-orm';
import { createInvoice } from '@/lib/utils/invoiceUtils';

async function backfillInvoices() {
  console.log('🔍 Finding customers without invoices...');

  try {
    // Get all customers without invoice_id who have subscriptionStart
    const customersWithoutInvoice = await db
      .select({
        id: customerDB.id,
        customerName: customerDB.customerName,
        subscriptionStart: customerDB.subscriptionStart,
      })
      .from(customerDB)
      .where(
        sql`${customerDB.invoiceId} IS NULL AND ${customerDB.subscriptionStart} IS NOT NULL AND (${customerDB.isDeleted} = false OR ${customerDB.isDeleted} IS NULL)`
      );

    console.log(`📊 Found ${customersWithoutInvoice.length} customers without invoices`);

    if (customersWithoutInvoice.length === 0) {
      console.log('✅ No customers need invoice backfill!');
      return;
    }

    let successCount = 0;
    let errorCount = 0;

    // Process each customer
    for (const customer of customersWithoutInvoice) {
      try {
        console.log(`\n📝 Processing: ${customer.customerName} (${customer.id})`);

        // Create invoice for this customer
        const invoice = await createInvoice({
          customerId: customer.id,
        });

        // Update customer with invoice_id
        await db
          .update(customerDB)
          .set({ invoiceId: invoice.id })
          .where(sql`${customerDB.id} = ${customer.id}`);

        console.log(`  ✅ Created: ${invoice.invoiceNumber}`);
        successCount++;

      } catch (error) {
        console.error(`  ❌ Failed for ${customer.customerName}:`, error);
        errorCount++;
      }
    }

    console.log('\n' + '='.repeat(60));
    console.log('📊 BACKFILL SUMMARY:');
    console.log(`  Total customers: ${customersWithoutInvoice.length}`);
    console.log(`  ✅ Success: ${successCount}`);
    console.log(`  ❌ Errors: ${errorCount}`);
    console.log('='.repeat(60));

  } catch (error) {
    console.error('❌ Fatal error during backfill:', error);
    process.exit(1);
  }
}

// Run the backfill
backfillInvoices()
  .then(() => {
    console.log('\n✅ Backfill complete!');
    process.exit(0);
  })
  .catch((error) => {
    console.error('❌ Backfill failed:', error);
    process.exit(1);
  });
