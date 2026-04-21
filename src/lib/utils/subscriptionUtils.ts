/**
 * Subscription Management Utilities
 * Package-driven subscription system for cleaning services
 */

import { eq, sql } from 'drizzle-orm';

// Extract visits per week from package name
export function extractVisitsPerWeek(packageName: string): number {
  if (!packageName) return 0;

  // Try to match x/week or "x per week" pattern (e.g. "3x/week" or "3x per week")
  const xMatch = packageName.match(/(\d+)x\s*(?:\/\s*week|per\s*week)/i);
  if (xMatch) return parseInt(xMatch[1]);

  // Try to match "visits per week" pattern (long format)
  const visitsMatch = packageName.match(/(\d+)\s*visits?\s*per\s*week/i);
  if (visitsMatch) return parseInt(visitsMatch[1]);

  // Handle trial packages as fallback
  if (packageName.toLowerCase().includes('trial')) return 0;

  return 1;
}

// Generate schedule dates based on day pattern and start/end date
export function generateScheduleDates(
  startDate: Date,
  endDate: Date,
  dayPattern: string[]
): Date[] {
  const scheduledDates: Date[] = [];
  const currentDate = new Date(startDate);

  while (currentDate <= endDate) {
    const dayName = currentDate.toLocaleDateString('en-US', { weekday: 'long' });

    if (dayPattern.includes(dayName)) {
      scheduledDates.push(new Date(currentDate));
    }

    currentDate.setDate(currentDate.getDate() + 1);
  }

  return scheduledDates;
}

// Check if mitra is available on specific date
// Behavior controlled by ENABLE_MITRA_SCHEDULE_CHECK feature flag:
//   - false (default): Always returns true, allows unlimited assignment (totally free)
//   - true: Enforces 8-hour daily workload limit (max 2 visits @ 3 hours each)
export function isMitraAvailableOnDate(mitraId: string, date: Date, existingVisits: any[]): boolean {
  // Feature flag: Enable schedule checking
  const enableScheduleCheck = process.env.ENABLE_MITRA_SCHEDULE_CHECK === 'true';

  // If schedule check is disabled, always return true (free assignment)
  if (!enableScheduleCheck) {
    return true;
  }

  const dateStr = date.toLocaleDateString('en-CA', { timeZone: 'Asia/Jakarta' });

  // Get visits for this mitra on this date
  const visitsOnDate = existingVisits.filter(visit =>
    visit.mitraId === mitraId &&
    visit.scheduledDate === dateStr &&
    visit.status !== 'Cancelled'
  );

  // Calculate current hours (each visit = 3 hours)
  const currentHours = visitsOnDate.length * 3;

  // Check if can handle one more visit (max 8 hours per day)
  return (currentHours + 3) <= 8;
}

// Get mitra availability for complete day pattern
export function getMitraAvailabilityForPattern(
  dayPattern: string[],
  startDate: Date,
  endDate: Date,
  mitras: any[],
  existingVisits: any[]
): Array<{
  mitraId: string;
  mitraName: string;
  contact: string;
  availableForAllDates: boolean;
  totalSessionsNeeded: number;
  wouldHaveHours: number;
  conflictDates?: string[];
}> {
  // Generate all dates for the pattern
  const allDates = generateScheduleDates(startDate, endDate, dayPattern);

  return mitras.map(mitra => {
    let availableForAll = true;
    const conflictDates: string[] = [];

    // Check availability for each date
    for (const date of allDates) {
      if (!isMitraAvailableOnDate(mitra.id, date, existingVisits)) {
        availableForAll = false;
        conflictDates.push(date.toLocaleDateString('en-CA', { timeZone: 'Asia/Jakarta' }));
      }
    }

    return {
      mitraId: mitra.id,
      mitraName: mitra.mitraName,
      contact: mitra.contact,
      availableForAllDates: availableForAll,
      totalSessionsNeeded: allDates.length,
      wouldHaveHours: allDates.length * 3,
      conflictDates: availableForAll ? undefined : conflictDates
    };
  });
}

// Calculate subscription pricing based on package and duration
export function calculateSubscriptionPrice(
  packagePrice: number,
  durationMonths: number = 1
): number {
  return packagePrice * durationMonths;
}

type DayPattern = {
  day1?: string; day2?: string; day3?: string;
  day4?: string; day5?: string; day6?: string; day7?: string;
};

function extractDaysFromPattern(dayPattern: DayPattern): string[] {
  return [
    dayPattern.day1, dayPattern.day2, dayPattern.day3,
    dayPattern.day4, dayPattern.day5, dayPattern.day6, dayPattern.day7,
  ].filter((day): day is string => !!day && day !== '');
}

// Validate day pattern against package requirements
export function validateDayPattern(
  dayPattern: DayPattern,
  requiredDays: number
): {
  isValid: boolean;
  errors: string[];
} {
  const errors: string[] = [];
  const selectedDays = extractDaysFromPattern(dayPattern);

  if (selectedDays.length !== requiredDays) {
    errors.push(`Please select exactly ${requiredDays} day(s) for this package`);
  }

  // NOTE: Duplicate days are now allowed per Feedback 5a

  return {
    isValid: errors.length === 0,
    errors
  };
}

// Format day pattern for display
export function formatDayPattern(dayPattern: DayPattern): string {
  const selectedDays = extractDaysFromPattern(dayPattern);

  if (selectedDays.length === 0) return 'No days selected';
  if (selectedDays.length === 1) return selectedDays[0];
  if (selectedDays.length === 2) return `${selectedDays[0]} and ${selectedDays[1]}`;
  return selectedDays.slice(0, -1).join(', ') + ', and ' + selectedDays[selectedDays.length - 1];
}

// Create complete subscription with auto-generated visits
export async function createSubscriptionWithDayPattern(params: {
  customerId: string;
  subscriptionPackageId: string;
  dayPattern: DayPattern | string[];
  subscriptionStartDate: Date;
  mitraId: string;
  qtyPackage?: number;
}, db: any, { customerDB, subscriptionPackageDB, visitDB, mitraDB }: any) {

  // Normalise dayPattern — accept both array and object forms
  const normalisedDayPattern: DayPattern = Array.isArray(params.dayPattern)
    ? Object.fromEntries(
        (params.dayPattern as string[])
          .filter(Boolean)
          .map((day, i) => [`day${i + 1}`, day])
      ) as DayPattern
    : params.dayPattern as DayPattern;

  // 1. Get package from database
  const packageResult = await db
    .select()
    .from(subscriptionPackageDB)
    .where(eq(subscriptionPackageDB.id, params.subscriptionPackageId))
    .limit(1);

  if (packageResult.length === 0) {
    throw new Error('Package not found');
  }

  const pkg = packageResult[0];

  // 2. Extract visits per week
  const visitsPerWeek = extractVisitsPerWeek(pkg.subscriptionPackage);

  // 3. Parse day pattern (remove null/empty) — supports up to 7 days
  const selectedDays = extractDaysFromPattern(normalisedDayPattern);

  // 4. VALIDATE: selectedDays.length === visitsPerWeek
  if (selectedDays.length !== visitsPerWeek) {
    throw new Error(
      `Package "${pkg.subscriptionPackage}" requires ${visitsPerWeek} day(s) per week, but ${selectedDays.length} day(s) selected`
    );
  }

  // 5. Calculate subscription end date
  const months = params.qtyPackage && params.qtyPackage > 0 ? params.qtyPackage : 1;
  const endDate = new Date(params.subscriptionStartDate);
  endDate.setMonth(endDate.getMonth() + months);
  endDate.setDate(endDate.getDate() - 1);

  // 6. Generate all scheduled dates
  const scheduledDates = generateScheduleDates(
    params.subscriptionStartDate,
    endDate,
    selectedDays
  );

  // 7. Get existing visits for validation
  const existingVisits = await db.select().from(visitDB);

  // 8. VALIDATE: Check mitra availability for ALL dates
  for (const date of scheduledDates) {
    if (!isMitraAvailableOnDate(params.mitraId, date, existingVisits)) {
      throw new Error(
        `Mitra not available on ${date.toLocaleDateString('en-CA', { timeZone: 'Asia/Jakarta' })}. Please select another mitra or dates.`
      );
    }
  }

  // 9. Start transaction
  return await db.transaction(async (tx: any) => {
    // Update customerDB
    await tx.update(customerDB).set({
      subscriptionPackageId: params.subscriptionPackageId,
      subscriptionPackage: pkg.subscriptionPackage,
      assignedMitraId: params.mitraId,
      subscriptionStart: params.subscriptionStartDate.toLocaleDateString('en-CA', { timeZone: 'Asia/Jakarta' }),
      subscriptionEnd: endDate.toLocaleDateString('en-CA', { timeZone: 'Asia/Jakarta' }),
      subscriptionStatus: "Active",
      qtyPackage: months,
      monthlyFee: (pkg.priceNumeric * months).toString(),
      dayPattern: JSON.stringify({
        day1: normalisedDayPattern.day1 || null,
        day2: normalisedDayPattern.day2 || null,
        day3: normalisedDayPattern.day3 || null,
        day4: normalisedDayPattern.day4 || null,
        day5: normalisedDayPattern.day5 || null,
        day6: normalisedDayPattern.day6 || null,
        day7: normalisedDayPattern.day7 || null,
      }),
      totalSessions: scheduledDates.length,
      updatedAt: new Date()
    }).where(eq(customerDB.id, params.customerId));

    // Create all visit records
    const visitRecords = scheduledDates.map((date, index) => ({
      customerId: params.customerId,
      mitraId: params.mitraId,
      originalMitraId: params.mitraId,
      actualMitraId: params.mitraId,
      visitNumber: index + 1,
      scheduledDate: date.toLocaleDateString('en-CA', { timeZone: 'Asia/Jakarta' }),
      scheduledDay: date.toLocaleDateString('en-US', { weekday: 'long' }),
      status: "Done",
      completedAt: date,
      durationHours: 3,
      createdAt: new Date(),
      updatedAt: new Date()
    }));

    await tx.insert(visitDB).values(visitRecords);

    // Update mitraDB
    await tx.update(mitraDB).set({
      totalVisits: sql`${mitraDB.totalVisits} + ${scheduledDates.length}`,
      updatedAt: new Date()
    }).where(eq(mitraDB.id, params.mitraId));

    // Return summary
    return {
      subscriptionId: params.customerId,
      packageName: pkg.subscriptionPackage,
      totalVisits: scheduledDates.length,
      visitsPerWeek: visitsPerWeek,
      dayPattern: selectedDays,
      scheduledDates: scheduledDates.map(d => d.toLocaleDateString('en-CA', { timeZone: 'Asia/Jakarta' })),
      subscriptionPeriod: {
        start: params.subscriptionStartDate.toLocaleDateString('en-CA', { timeZone: 'Asia/Jakarta' }),
        end: endDate.toLocaleDateString('en-CA', { timeZone: 'Asia/Jakarta' })
      },
      assignedMitra: {
        mitraId: params.mitraId
      }
    };
  });
}