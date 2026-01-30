# ADR 0005: Always Use Asia/Jakarta Timezone

**Date:** 2025-12-10  
**Status:** ✅ Accepted  
**Deciders:** Handi, Team  
**Tags:** timezone, dates, backend

---

## Context

The HOMA application operates in Indonesia and needs to handle dates/times correctly. Key challenges:
- Database server (Neon) is in US/EU timezone
- User browsers might be in different timezones
- Scheduled visits must be in Indonesian time
- Payout calculations based on calendar months (Indonesian time)
- Attendance records need consistent timestamps

**Problem:**
Without explicit timezone handling, dates could be off by 7-14 hours, causing:
- Visits scheduled for wrong days
- Payout calculations using wrong months
- Attendance reports showing incorrect dates

---

## Decision

**Always use Asia/Jakarta timezone** for all date/time operations.

### Rules

1. **Database:** Store timestamps in Asia/Jakarta
2. **API:** Convert all inputs to Asia/Jakarta
3. **Calculations:** Use Asia/Jakarta for month boundaries
4. **Display:** Show Asia/Jakarta times in UI
5. **Scheduling:** Schedule visits in Asia/Jakarta

---

## Consequences

### Positive ✅

**1. Consistency**
- All dates/times in one timezone
- No confusion about "which timezone?"
- Audit logs in local time
- Reports match local calendar

**2. Business Logic Correctness**

**Example: Visit Scheduling**
```
User schedules visit: "Jan 29, 09:00"

Without timezone handling:
- Browser (Jakarta): Jan 29, 09:00 → converts to UTC: Jan 29, 02:00
- Database stores: Jan 29, 02:00 UTC
- Display back: Jan 29, 02:00 (WRONG!)

With Asia/Jakarta handling:
- Input: Jan 29, 09:00 Jakarta
- Explicit conversion: Jan 29, 09:00 +07:00
- Database stores: Jan 29, 09:00 Asia/Jakarta
- Display: Jan 29, 09:00 ✅
```

**Example: Payout Calculation**
```
Calculate payout for "Jan 2026"

Without timezone handling:
- Visit on Jan 31, 23:00 Jakarta
- Stored as: Feb 1, 02:00 UTC
- Counted in Feb payout (WRONG!)

With Asia/Jakarta handling:
- Visit: Jan 31, 23:00 +07:00
- Month check: January
- Counted in Jan payout ✅
```

**3. Developer Clarity**
```typescript
// Clear and explicit
const now = getCurrentJakartaTime();
const visitDate = parseJakartaDate('2026-01-29');
```

**4. User Experience**
- Dates match physical calendar
- No "off by one day" bugs
- Schedules make sense locally

---

### Negative ⚠️

**1. Extra Code**
Every date operation needs timezone awareness:
```typescript
// Can't just do this:
const now = new Date();  // ❌ Could be any timezone

// Need to do:
const now = getCurrentJakartaTime();  // ✅ Explicit
```

**2. Library Dependency**
Need timezone library (date-fns-tz or moment-timezone):
```bash
npm install date-fns date-fns-tz
```

**3. Database Timezone Mismatch**
Neon PostgreSQL server is in US/EU timezone, need explicit handling:
```sql
-- Need to set timezone in queries
SET TIME ZONE 'Asia/Jakarta';

-- Or use explicit timezone in queries
SELECT * FROM visits 
WHERE scheduled_date AT TIME ZONE 'Asia/Jakarta' = '2026-01-29';
```

**4. Testing Complexity**
Tests need to mock timezone:
```typescript
// Mock timezone in tests
process.env.TZ = 'Asia/Jakarta';
```

---

## Implementation Details

### Utility Functions
```typescript
// src/lib/date-utils.ts
import { format, toZonedTime, fromZonedTime } from 'date-fns-tz';

const JAKARTA_TZ = 'Asia/Jakarta';

/**
 * Get current time in Asia/Jakarta timezone
 */
export function getCurrentJakartaTime(): Date {
  return toZonedTime(new Date(), JAKARTA_TZ);
}

/**
 * Parse date string as Asia/Jakarta time
 */
export function parseJakartaDate(dateString: string): Date {
  return fromZonedTime(dateString, JAKARTA_TZ);
}

/**
 * Format date to Asia/Jakarta string
 */
export function formatJakartaDate(
  date: Date, 
  formatString: string = 'yyyy-MM-dd HH:mm:ss'
): string {
  const zonedDate = toZonedTime(date, JAKARTA_TZ);
  return format(zonedDate, formatString, { timeZone: JAKARTA_TZ });
}

/**
 * Get start of month in Jakarta timezone
 */
export function getJakartaMonthStart(yearMonth: string): Date {
  // yearMonth format: '2026-01'
  const [year, month] = yearMonth.split('-');
  return fromZonedTime(`${year}-${month}-01 00:00:00`, JAKARTA_TZ);
}

/**
 * Get end of month in Jakarta timezone
 */
export function getJakartaMonthEnd(yearMonth: string): Date {
  const startDate = getJakartaMonthStart(yearMonth);
  const nextMonth = addMonths(startDate, 1);
  return subSeconds(nextMonth, 1);
}

/**
 * Check if date is in given month (Jakarta time)
 */
export function isInJakartaMonth(date: Date, yearMonth: string): boolean {
  const jakartaDate = toZonedTime(date, JAKARTA_TZ);
  const monthStr = format(jakartaDate, 'yyyy-MM', { timeZone: JAKARTA_TZ });
  return monthStr === yearMonth;
}
```

---

### Usage in API Routes
```typescript
// src/app/api/visits/schedule/route.ts
import { getCurrentJakartaTime, parseJakartaDate } from '@/lib/date-utils';

export async function POST(req: Request) {
  const { scheduled_date, scheduled_time } = await req.json();
  
  // Parse date in Jakarta timezone
  const visitDateTime = parseJakartaDate(
    `${scheduled_date} ${scheduled_time}`
  );
  
  // Store with explicit timezone
  await db.insert(scheduledVisits).values({
    scheduled_date: visitDateTime,
    created_at: getCurrentJakartaTime()
  });
  
  return Response.json({ success: true });
}
```

---

### Payout Calculation
```typescript
// src/lib/payout-calculator.ts
import { isInJakartaMonth } from '@/lib/date-utils';

export async function calculateMonthlyPayout(
  mitraId: number,
  periodMonth: string  // 'YYYY-MM'
) {
  // Get all visits in this Jakarta calendar month
  const allVisits = await db.query.scheduledVisits.findMany({
    where: eq(scheduledVisits.mitra_id, mitraId)
  });
  
  // Filter by Jakarta month
  const visitsInMonth = allVisits.filter(visit => 
    isInJakartaMonth(visit.scheduled_date, periodMonth)
  );
  
  // Count scheduled vs attended
  const scheduled = visitsInMonth.length;
  const attended = visitsInMonth.filter(v => v.status === 'completed').length;
  
  // Calculate payout
  const amount = (attended / scheduled) * baseRate;
  
  return amount;
}
```

---

### Database Timezone Configuration

**Option 1: Set Session Timezone (Recommended)**
```typescript
// src/lib/db.ts
import { drizzle } from 'drizzle-orm/postgres-js';
import postgres from 'postgres';

const client = postgres(process.env.DATABASE_URL!, {
  onconnect: async (connection) => {
    // Set timezone for this connection
    await connection.query(`SET TIME ZONE 'Asia/Jakarta'`);
  }
});

export const db = drizzle(client);
```

**Option 2: Use TIMESTAMPTZ (Timezone-Aware Type)**
```sql
-- Store with timezone info
CREATE TABLE scheduled_visits (
  id SERIAL PRIMARY KEY,
  scheduled_date TIMESTAMPTZ NOT NULL,  -- Stores timezone info
  created_at TIMESTAMPTZ DEFAULT NOW()
);
```

---

### Frontend Display
```typescript
// src/components/visit-card.tsx
import { formatJakartaDate } from '@/lib/date-utils';

export function VisitCard({ visit }) {
  // Format for display
  const displayDate = formatJakartaDate(
    visit.scheduled_date, 
    'dd MMM yyyy, HH:mm'
  );
  
  return (
    <div>
      <p>Visit Date: {displayDate}</p>
      <p>Timezone: WIB (Jakarta)</p>
    </div>
  );
}
```

---

## Testing Strategy

### Unit Tests
```typescript
// __tests__/date-utils.test.ts
import { getCurrentJakartaTime, isInJakartaMonth } from '@/lib/date-utils';

describe('Jakarta Timezone Utils', () => {
  beforeAll(() => {
    // Mock system timezone
    process.env.TZ = 'Asia/Jakarta';
  });
  
  test('getCurrentJakartaTime returns Jakarta time', () => {
    const now = getCurrentJakartaTime();
    const offset = now.getTimezoneOffset();
    // Jakarta is UTC+7 = -420 minutes offset
    expect(offset).toBe(-420);
  });
  
  test('isInJakartaMonth correctly identifies month', () => {
    const janDate = new Date('2026-01-15T10:00:00+07:00');
    expect(isInJakartaMonth(janDate, '2026-01')).toBe(true);
    expect(isInJakartaMonth(janDate, '2026-02')).toBe(false);
  });
  
  test('handles month boundary correctly', () => {
    // Jan 31, 23:00 Jakarta = Feb 1, 00:00 UTC (wrong!)
    // But should count as January
    const lastMinuteJan = new Date('2026-01-31T23:59:00+07:00');
    expect(isInJakartaMonth(lastMinuteJan, '2026-01')).toBe(true);
  });
});
```

### Integration Tests
```typescript
describe('Payout Calculation with Timezone', () => {
  test('calculates payout using Jakarta month', async () => {
    // Create visit on Jan 31, 23:00 Jakarta
    const visit = await createVisit({
      scheduled_date: '2026-01-31T23:00:00+07:00'
    });
    
    // Calculate Jan payout
    const payout = await calculateMonthlyPayout(mitraId, '2026-01');
    
    // Visit should be counted in Jan, not Feb
    expect(payout.scheduledVisits).toInclude(visit.id);
  });
});
```

---

## Edge Cases Handled

### 1. Daylight Saving Time
**Issue:** Indonesia doesn't observe DST
**Solution:** ✅ No issue, Jakarta offset always UTC+7

### 2. Leap Seconds
**Issue:** Rare, but can affect timestamps
**Solution:** JavaScript/PostgreSQL handle automatically

### 3. Month Boundaries
```typescript
// Critical: Jan 31 23:59 vs Feb 1 00:00
const lastSecondJan = new Date('2026-01-31T23:59:59+07:00');
const firstSecondFeb = new Date('2026-02-01T00:00:00+07:00');

isInJakartaMonth(lastSecondJan, '2026-01'); // true ✅
isInJakartaMonth(firstSecondFeb, '2026-02'); // true ✅
```

### 4. User in Different Timezone
**Scenario:** Admin traveling to US, accessing system
**Solution:** All operations still use Jakarta time
**UX:** Show "(WIB)" label to indicate timezone

---

## Documentation Requirements

**Required:**
1. ✅ ADR (this file)
2. ✅ Code comments in date-utils.ts
3. ✅ README.md section on timezone
4. ⏳ User documentation (if external users)

**Code Comments:**
```typescript
/**
 * CRITICAL: Always use Asia/Jakarta timezone
 * See: docs/adrs/0005-asia-jakarta-timezone.md
 */
```

---

## Related Decisions

- **ADR 0004:** Pro-Rate Calculation (depends on correct month boundaries)
- **ADR 0003:** Neon PostgreSQL (server timezone mismatch)

---

## Alternative Considered

### Alternative 1: UTC Everywhere
**Approach:** Store all dates in UTC, convert on display

**Pros:**
- Standard practice
- Database-agnostic
- Easy cross-timezone support (if needed later)

**Cons:**
- ❌ **Month boundaries wrong** for business logic
- ❌ **Payout calculations complex** (need timezone conversion in every query)
- ❌ **User confusion** (dates don't match calendar)
- ❌ **Debugging harder** (logs in UTC, operations in Jakarta)

**Why Rejected:** Business logic requires Jakarta calendar months. UTC would complicate every calculation.

---

### Alternative 2: User Timezone
**Approach:** Let each user choose timezone

**Pros:**
- Flexible for future expansion
- Good for international teams

**Cons:**
- ❌ **Over-engineered** for current needs (all users in Indonesia)
- ❌ **Complex payout logic** (which timezone to use?)
- ❌ **Team coordination issues** (different calendars)

**Why Rejected:** No current need. All users in Indonesia.

---

## Migration Plan (If Expanding)

**If we ever need multiple timezones:**
1. Add `user_timezone` column
2. Keep Jakarta as default/business timezone
3. Convert for display only
4. Keep calculations in Jakarta time

**Effort:** 1-2 weeks  
**Risk:** Medium (careful testing needed)

---

## References

- date-fns-tz Docs: https://date-fns.org/v2.29.3/docs/Time-Zones
- PostgreSQL Timezone: https://www.postgresql.org/docs/current/datatype-datetime.html
- Payout Feature Doc: `docs/features/payout-system.md`

---

## Review

**Next Review:** 2026-06-01  
**Success Metrics:**
- Zero date/time bugs
- Payout calculations accurate
- User dates match calendar

**Reassess If:**
- Expanding to other countries
- Need multi-timezone support
- User complaints about dates

---

**Last Updated:** 2025-12-10  
**Author:** Handi