import { db } from '@/lib/db';
import { visitDB, customerDB } from '@/lib/schema';
import { eq, and, gte, lte } from 'drizzle-orm';

async function main() {
  const result = await db.select({
    visitNumber: visitDB.visitNumber,
    scheduledDate: visitDB.scheduledDate,
    status: visitDB.status,
    mitraId: visitDB.mitraId,
    actualMitraId: visitDB.actualMitraId,
    customerName: customerDB.customerName,
  }).from(visitDB)
  .leftJoin(customerDB, eq(visitDB.customerId, customerDB.id))
  .where(
    and(
      eq(customerDB.customerName, 'Anastasia'),
      gte(visitDB.scheduledDate, '2026-02-01'),
      lte(visitDB.scheduledDate, '2026-02-28')
    )
  );
  console.log(JSON.stringify(result, null, 2));
}
main().catch(console.error).finally(() => process.exit(0));
