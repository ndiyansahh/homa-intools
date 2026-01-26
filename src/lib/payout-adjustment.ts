/**
 * Payout Adjustment Helper Functions
 * Feature 8b: Detect when historical visits are edited and create adjustments for next payout period
 */

import { db } from '@/lib/db';
import { payoutDB, payoutAdjustmentDB, visitDB, customerDB, mitraDB } from '@/lib/schema';
import { eq, and, or } from 'drizzle-orm';

/**
 * Detect if a visit edit requires payout adjustment
 * Returns adjustment details if needed, null otherwise
 *
 * @param visitId - The visit that was edited
 * @param oldStatus - Previous visit status
 * @param newStatus - New visit status
 * @param oldMitraId - Previous mitra ID
 * @param newMitraId - New mitra ID
 * @param userEmail - User who made the change
 */
export async function detectPayoutAdjustment(params: {
  visitId: string;
  oldStatus: string;
  newStatus: string;
  oldMitraId: string | null;
  newMitraId: string | null;
  oldActualMitraId: string | null;
  newActualMitraId: string | null;
  userEmail: string;
}) {
  const {
    visitId,
    oldStatus,
    newStatus,
    oldMitraId,
    newMitraId,
    oldActualMitraId,
    newActualMitraId,
    userEmail
  } = params;

  // Get visit details
  const visit = await db
    .select({
      visitId: visitDB.id,
      customerId: visitDB.customerId,
      customerName: customerDB.customerName,
      scheduledDate: visitDB.scheduledDate,
      completedAt: visitDB.completedAt,
      mitraId: visitDB.mitraId,
      actualMitraId: visitDB.actualMitraId,
    })
    .from(visitDB)
    .leftJoin(customerDB, eq(visitDB.customerId, customerDB.id))
    .where(eq(visitDB.id, visitId))
    .limit(1);

  if (!visit.length) {
    return null;
  }

  const visitData = visit[0];
  const scheduledDate = new Date(visitData.scheduledDate);
  const visitYear = scheduledDate.getFullYear();
  const visitMonth = scheduledDate.getMonth() + 1;

  // Check if status changed (Done <-> Cancelled or Scheduled)
  const statusChanged = oldStatus !== newStatus;

  // Check if mitra changed
  const mitraChanged = oldActualMitraId !== newActualMitraId;

  if (!statusChanged && !mitraChanged) {
    // No changes that affect payout
    return null;
  }

  // Determine which mitras are affected
  const affectedMitras: string[] = [];

  if (mitraChanged) {
    // Both old and new mitra need adjustment
    if (oldActualMitraId) affectedMitras.push(oldActualMitraId);
    if (newActualMitraId && newActualMitraId !== oldActualMitraId) {
      affectedMitras.push(newActualMitraId);
    }
  } else if (statusChanged) {
    // Status changed but mitra didn't - only current mitra affected
    const currentMitra = newActualMitraId || visitData.actualMitraId;
    if (currentMitra) affectedMitras.push(currentMitra);
  }

  if (affectedMitras.length === 0) {
    return null;
  }

  // For each affected mitra, check if payout exists and is paid
  const adjustments = [];

  for (const mitraId of affectedMitras) {
    // Check if payout for this mitra + period exists and is Paid
    const existingPayout = await db
      .select({
        id: payoutDB.id,
        payoutId: payoutDB.payoutId,
        mitraId: payoutDB.mitraId,
        year: payoutDB.year,
        month: payoutDB.month,
        status: payoutDB.status,
        basePayout: payoutDB.basePayout,
        totalPayout: payoutDB.totalPayout,
        totalVisits: payoutDB.totalVisits,
        scheduledVisits: payoutDB.scheduledVisits,
      })
      .from(payoutDB)
      .where(
        and(
          eq(payoutDB.mitraId, mitraId),
          eq(payoutDB.year, visitYear),
          eq(payoutDB.month, visitMonth),
          or(
            eq(payoutDB.status, 'Paid'),
            eq(payoutDB.status, 'Pending') // Also create adjustment for Pending (can be cancelled if not paid yet)
          )
        )
      )
      .limit(1);

    if (existingPayout.length === 0) {
      // No payout generated yet for this period - no adjustment needed
      continue;
    }

    const payout = existingPayout[0];

    // Get mitra name for adjustment ID
    const mitraData = await db
      .select({ mitraName: mitraDB.mitraName })
      .from(mitraDB)
      .where(eq(mitraDB.id, mitraId))
      .limit(1);

    const mitraName = mitraData.length > 0 ? mitraData[0].mitraName : 'Unknown';

    // Calculate adjustment based on the change
    const adjustment = await calculateAdjustment({
      mitraId,
      mitraName,
      visitId,
      customerId: visitData.customerId,
      customerName: visitData.customerName || 'Unknown',
      oldStatus,
      newStatus,
      oldActualMitraId,
      newActualMitraId,
      scheduledDate: visitData.scheduledDate,
      existingPayout: payout,
      userEmail,
    });

    if (adjustment) {
      adjustments.push(adjustment);
    }
  }

  return adjustments.length > 0 ? adjustments : null;
}

/**
 * Calculate adjustment amount based on visit change
 */
async function calculateAdjustment(params: {
  mitraId: string;
  mitraName: string;
  visitId: string;
  customerId: string;
  customerName: string;
  oldStatus: string;
  newStatus: string;
  oldActualMitraId: string | null;
  newActualMitraId: string | null;
  scheduledDate: string;
  existingPayout: any;
  userEmail: string;
}) {
  const {
    mitraId,
    mitraName,
    visitId,
    customerId,
    customerName,
    oldStatus,
    newStatus,
    oldActualMitraId,
    newActualMitraId,
    scheduledDate,
    existingPayout,
    userEmail,
  } = params;

  // Parse breakdown to get customer-specific payout
  const breakdown = existingPayout.breakdown as any;
  const customers = breakdown?.customers || [];
  const customerPayout = customers.find((c: any) => c.customerId === customerId);

  if (!customerPayout) {
    console.log(`⚠️ No customer payout found in breakdown for ${customerName}`);
    return null;
  }

  // Determine adjustment type and amount
  let adjustmentAmount = 0;
  let adjustmentType = '';
  let reason = '';

  const wasCompleted = oldStatus === 'Done';
  const isCompleted = newStatus === 'Done';
  const oldMitraMatches = oldActualMitraId === mitraId;
  const newMitraMatches = newActualMitraId === mitraId;

  if (oldMitraMatches && !newMitraMatches) {
    // Mitra changed FROM this mitra TO another
    // This mitra was credited in payout but shouldn't have been
    const perVisitAmount = Number(customerPayout.monthlyRate) / Number(customerPayout.scheduledVisits);
    adjustmentAmount = -perVisitAmount; // Deduct
    adjustmentType = 'OVERPAYMENT_DEDUCTION';
    reason = `Visit #${visitId.slice(0, 8)} for ${customerName} was reassigned from ${mitraName} to another mitra. Overpayment deduction.`;
  } else if (!oldMitraMatches && newMitraMatches) {
    // Mitra changed TO this mitra FROM another
    // This mitra should have been credited but wasn't
    const perVisitAmount = Number(customerPayout.monthlyRate) / Number(customerPayout.scheduledVisits);
    adjustmentAmount = perVisitAmount; // Add
    adjustmentType = 'UNDERPAYMENT_ADDITION';
    reason = `Visit #${visitId.slice(0, 8)} for ${customerName} was reassigned to ${mitraName}. Underpayment correction.`;
  } else if (oldMitraMatches && newMitraMatches) {
    // Same mitra, but status changed
    if (wasCompleted && !isCompleted) {
      // Changed from Done to Cancelled/Scheduled
      const perVisitAmount = Number(customerPayout.monthlyRate) / Number(customerPayout.scheduledVisits);
      adjustmentAmount = -perVisitAmount; // Deduct
      adjustmentType = 'OVERPAYMENT_DEDUCTION';
      reason = `Visit #${visitId.slice(0, 8)} for ${customerName} status changed from Done to ${newStatus}. Overpayment deduction.`;
    } else if (!wasCompleted && isCompleted) {
      // Changed from Cancelled/Scheduled to Done
      const perVisitAmount = Number(customerPayout.monthlyRate) / Number(customerPayout.scheduledVisits);
      adjustmentAmount = perVisitAmount; // Add
      adjustmentType = 'UNDERPAYMENT_ADDITION';
      reason = `Visit #${visitId.slice(0, 8)} for ${customerName} status changed from ${oldStatus} to Done. Underpayment correction.`;
    }
  }

  if (adjustmentAmount === 0) {
    return null;
  }

  // Generate adjustment ID: ADJ/MitraName/YYYY.MM.DD-XXXXX
  const now = new Date();
  const dateStr = `${now.getFullYear()}.${String(now.getMonth() + 1).padStart(2, '0')}.${String(now.getDate()).padStart(2, '0')}`;
  const mitraNameClean = mitraName.replace(/\s+/g, '');
  const sequence = String(Math.floor(Math.random() * 99999)).padStart(5, '0');
  const adjustmentId = `ADJ/${mitraNameClean}/${dateStr}-${sequence}`;

  return {
    adjustmentId,
    originalPayoutId: existingPayout.id,
    mitraId,
    adjustmentAmount,
    adjustmentType,
    reason,
    relatedVisitId: visitId,
    relatedCustomerId: customerId,
    originalVisits: existingPayout.totalVisits,
    correctedVisits: isCompleted ? existingPayout.totalVisits : existingPayout.totalVisits - 1,
    originalPayout: Number(existingPayout.basePayout),
    correctedPayout: Number(existingPayout.basePayout) + adjustmentAmount,
    originalYear: existingPayout.year,
    originalMonth: existingPayout.month,
    status: 'PENDING',
    createdBy: userEmail,
  };
}

/**
 * Create adjustment records in database
 */
export async function createPayoutAdjustments(adjustments: any[]) {
  if (adjustments.length === 0) {
    return [];
  }

  const created = await db.insert(payoutAdjustmentDB).values(adjustments).returning();

  console.log(`✅ Created ${created.length} payout adjustment(s)`);

  return created;
}
