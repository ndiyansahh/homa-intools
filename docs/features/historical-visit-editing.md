# Historical Visit Editing - Complete Documentation

**Status:** ✅ Fully Implemented & Verified
**Last Updated:** 2026-03-07
**Owner:** Handi
**Verified By:** AI Assistant (Claude Code)

---

## Overview

HOMA allows editing of historical visits even after the payout period has ended. This feature ensures that late-discovered information can be corrected without compromising data accuracy, with automatic payout adjustments to maintain financial integrity.

**Key Principle:** Accuracy over convenience - allow corrections at any time with proper adjustment tracking.

---

## Business Requirement (Feedback 6b)

> "Historical visits jangan locked once period habis → kadang ada case dimana baru ada info beyond end of the period, jadi need to look back & do editing."

**Translation:** Historical visits should NOT be locked after period ends - sometimes information is discovered after the period, requiring the ability to look back and edit.

---

## Implementation Status

### ✅ Default Behavior: UNLOCKED

**Setting:** `LOCK_COMPLETED_VISITS = false` (default)

**Files:**
- `src/lib/config.ts` (line 156) - Config key definition
- `src/app/api/trial/[id]/visits/[visitId]/change-mitra/route.ts` (lines 75-88) - Mitra change lock check
- `src/app/api/trial/[id]/visits/route.ts` (lines 445-458) - Visit edit lock check

**Admin Control:**
- Admin can optionally enable lock via system config
- Toggle in database: `system_config_db` table
- Key: `lock_completed_visits`
- Default: `false` (unlocked)

---

## Supported Historical Edits

### 1. Change Mitra (Reassignment)

**Endpoint:** `POST /api/trial/{id}/visits/{visitId}/change-mitra`

**Allowed Changes:**
- Switch actualMitraId to different mitra
- Works even if visit status = 'Done'
- Works even if original payout already paid

**Example:**
```json
{
  "newMitraId": "mitra-002",
  "reason": "Customer requested different mitra after service completed"
}
```

**Automatic Actions:**
1. Updates `actualMitraId` in visit record
2. Creates history record in `visit_mitra_change_history_db`
3. Detects if payout for this period exists and is Paid/Pending
4. Creates adjustment for both old and new mitra
5. Applies adjustment to next payout period

---

### 2. Change Status

**Endpoint:** `PUT /api/trial/{id}/visits/{visitId}`

**Allowed Changes:**
- Done → Cancelled (discovered visit didn't happen)
- Done → Scheduled (mark as incomplete)
- Cancelled → Done (correct mistaken cancellation)
- Scheduled → Done (late completion)

**Example:**
```json
{
  "status": "Cancelled",
  "notes": "Discovered on Feb 5 that Jan 31 visit didn't happen"
}
```

**Automatic Actions:**
1. Updates `status` in visit record
2. Updates `completedAt` (null if not Done)
3. Detects if payout for this period exists and is Paid/Pending
4. Creates adjustment (overpayment or underpayment)
5. Applies adjustment to next payout period

---

### 3. Edit Scheduled Date

**Endpoint:** `PUT /api/trial/{id}/visits/{visitId}`

**Allowed Changes:**
- Modify `scheduledDate` even for completed visits
- Useful for correcting data entry errors

**Note:** Changing date may affect which payout period the visit belongs to.

---

## Payout Adjustment Flow

### When Does Adjustment Happen?

Adjustment is created when:
1. Historical visit is edited (status or mitra change)
2. Original payout for that period exists
3. Original payout status is 'Paid' or 'Pending'

### Adjustment Calculation

**Formula for Status Change:**
```
Per-visit amount = monthlyRate / scheduled_visits_in_billing_cycle

If Done → Cancelled:
  adjustment = -per_visit_amount (overpayment deduction)

If Cancelled → Done:
  adjustment = +per_visit_amount (underpayment addition)
```

**Formula for Mitra Change:**
```
Old mitra: adjustment = -per_visit_amount (deduction)
New mitra: adjustment = +per_visit_amount (addition)
```

### Adjustment Application

**Database Table:** `payout_adjustment_db`

**Fields:**
- `adjustmentId` - Unique ID (format: `ADJ/MitraName/YYYY.MM.DD-XXXXX`)
- `originalPayoutId` - Reference to affected payout
- `mitraId` - Which mitra receives the adjustment
- `adjustmentAmount` - Amount (positive = add, negative = deduct)
- `adjustmentType` - Type (OVERPAYMENT_DEDUCTION, UNDERPAYMENT_ADDITION)
- `reason` - Human-readable explanation
- `relatedVisitId` - Which visit triggered this
- `status` - PENDING → APPLIED

**Status Lifecycle:**
1. `PENDING` - Created when historical edit detected
2. `APPLIED` - Applied to next payout generation
3. Record remains for audit trail

---

## Complete Example Flow

### Scenario: Late Discovery of Missed Visit

**Timeline:**

**Jan 31, 2026:**
- Mitra completes 8 visits in Jan (billing cycle: Jan 7 - Feb 6)
- System generates payout: 8/9 × Rp 900,000 = Rp 800,000
- Payout marked as 'Paid'

**Feb 5, 2026:**
- Customer reports that Jan 31 visit didn't actually happen
- Admin opens visit detail, changes status: Done → Cancelled
- Reason: "Customer confirmed - mitra didn't show up on Jan 31"

**System Actions (Automatic):**
```typescript
// 1. Detect payout adjustment needed
const adjustment = await detectPayoutAdjustment({
  visitId: 'visit-123',
  oldStatus: 'Done',
  newStatus: 'Cancelled',
  // ... other params
});

// 2. Create adjustment record
{
  adjustmentId: 'ADJ/AniYulianti/2026.02.05-12345',
  originalPayoutId: 'payout-jan-2026',
  mitraId: 'mitra-001',
  adjustmentAmount: -100000,  // -1/9 × 900,000
  adjustmentType: 'OVERPAYMENT_DEDUCTION',
  reason: 'Visit #visit-123 for Customer A status changed from Done to Cancelled. Overpayment deduction.',
  relatedVisitId: 'visit-123',
  status: 'PENDING'
}

// 3. Store in database
await db.insert(payoutAdjustmentDB).values(adjustment);
```

**Feb 28, 2026:**
- System generates Feb payout
- Fetches pending adjustments for this mitra
- Applies adjustment automatically

```typescript
// Base payout for Feb
const basePayout = 2/9 × 900,000 = 200,000

// Pending adjustments
const adjustments = -100,000

// Final payout
const finalPayout = 200,000 + (-100,000) = 100,000
```

**Payout Slip Shows:**
```
Base Payout:        Rp 200,000
Adjustments:        -Rp 100,000
  - ADJ/AniYulianti/2026.02.05-12345
    Reason: Visit #visit-123 status changed from Done to Cancelled
    Original Period: Jan 2026
Final Payout:       Rp 100,000
```

---

## API Endpoints

### POST /api/trial/{id}/visits/{visitId}/change-mitra

**Auth:** ADMIN, OWNER, STAFF

**Request:**
```json
{
  "newMitraId": "mitra-002",
  "reason": "Customer request after service completion"
}
```

**Response:**
```json
{
  "success": true,
  "message": "Mitra changed successfully",
  "data": {
    "visitId": "visit-123",
    "fromMitraId": "mitra-001",
    "toMitraId": "mitra-002",
    "sequenceNumber": 1
  }
}
```

**Lock Behavior:**
- If `LOCK_COMPLETED_VISITS = true`: Returns 400 error for completed visits
- If `LOCK_COMPLETED_VISITS = false`: Allows change with adjustment creation

---

### PUT /api/trial/{id}/visits/{visitId}

**Auth:** ADMIN, OWNER, STAFF

**Request:**
```json
{
  "status": "Cancelled",
  "notes": "Visit didn't happen - late discovery"
}
```

**Response:**
```json
{
  "success": true,
  "message": "Visit updated successfully",
  "data": {
    "visitId": "visit-123",
    "oldStatus": "Done",
    "newStatus": "Cancelled"
  }
}
```

**Lock Behavior:**
- If `LOCK_COMPLETED_VISITS = true`: Returns 400 error for date changes on completed visits
- If `LOCK_COMPLETED_VISITS = false`: Allows edit with adjustment creation

---

## Configuration

### Enable/Disable Lock (Admin Only)

**Database:** `system_config_db` table

**Insert/Update:**
```sql
INSERT INTO system_config_db (config_key, config_value, data_type, is_active, updated_by)
VALUES ('lock_completed_visits', 'false', 'boolean', true, 'admin@homa.com')
ON CONFLICT (config_key) DO UPDATE
SET config_value = 'false', updated_at = NOW();
```

**Via Code:**
```typescript
import { setConfig, CONFIG_KEYS } from '@/lib/config';

// Disable lock (allow historical edits)
await setConfig(CONFIG_KEYS.LOCK_COMPLETED_VISITS, false, 'admin@homa.com');

// Enable lock (prevent historical edits)
await setConfig(CONFIG_KEYS.LOCK_COMPLETED_VISITS, true, 'admin@homa.com');
```

**Check Current Setting:**
```typescript
import { getConfig, CONFIG_KEYS } from '@/lib/config';

const isLocked = await getConfig(CONFIG_KEYS.LOCK_COMPLETED_VISITS, false);
// Returns: false (default - unlocked)
```

---

## Audit Trail

### Visit Mitra Change History

**Table:** `visit_mitra_change_history_db`

**Tracks:**
- Who changed the mitra
- When the change happened
- Previous mitra → New mitra
- Reason for change
- Sequence number (multiple changes tracked)

**Example Query:**
```sql
SELECT
  vmch.*,
  m1.mitra_name as from_mitra,
  m2.mitra_name as to_mitra,
  u.email as changed_by_email
FROM visit_mitra_change_history_db vmch
LEFT JOIN mitra_db m1 ON vmch.from_mitra_id = m1.id
LEFT JOIN mitra_db m2 ON vmch.to_mitra_id = m2.id
LEFT JOIN user_db u ON vmch.changed_by = u.id
WHERE vmch.visit_id = 'visit-123'
ORDER BY vmch.sequence_number;
```

### Payout Adjustment History

**Table:** `payout_adjustment_db`

**Tracks:**
- Original payout that was affected
- Adjustment amount and type
- Reason and related visit
- When applied to which payout
- Status (PENDING → APPLIED)

**Example Query:**
```sql
SELECT *
FROM payout_adjustment_db
WHERE related_visit_id = 'visit-123'
ORDER BY created_at DESC;
```

---

## Testing Scenarios

### Test Case 1: Status Change After Paid Payout

**Steps:**
1. Generate Jan payout with 8 visits = Rp 800,000
2. Mark payout as 'Paid'
3. Change visit #8 status: Done → Cancelled
4. Verify adjustment created: -Rp 100,000
5. Generate Feb payout
6. Verify Feb payout includes adjustment

**Expected Result:**
- Feb payout = Base (Rp 200,000) + Adjustment (-Rp 100,000) = Rp 100,000
- Adjustment status changes from PENDING → APPLIED

---

### Test Case 2: Mitra Change After Paid Payout

**Steps:**
1. Generate Jan payout for Mitra A with 8 visits = Rp 800,000
2. Mark payout as 'Paid'
3. Change visit #8 mitra: Mitra A → Mitra B
4. Verify 2 adjustments created:
   - Mitra A: -Rp 100,000 (deduction)
   - Mitra B: +Rp 100,000 (addition)
5. Generate Feb payout
6. Verify both mitras receive adjustments

**Expected Result:**
- Mitra A Feb payout includes -Rp 100,000
- Mitra B Feb payout includes +Rp 100,000

---

### Test Case 3: Lock Enabled

**Steps:**
1. Enable lock: `LOCK_COMPLETED_VISITS = true`
2. Try to change status of completed visit
3. Verify API returns 400 error

**Expected Result:**
```json
{
  "success": false,
  "message": "Cannot change mitra for completed visit (locked by admin)"
}
```

---

## Security Considerations

### Authorization
- Only ADMIN, OWNER, STAFF roles can edit visits
- Middleware enforces RBAC
- Session required for all edit endpoints

### Data Integrity
- All changes logged to history tables
- Original data never lost
- Full audit trail maintained
- Adjustment reasons required and stored

### Financial Impact
- Adjustments clearly labeled (overpayment/underpayment)
- Linked to original payout for traceability
- Applied automatically to prevent manual errors
- Visible in payout slip for transparency

---

## Related Documentation

- **Payout System:** `docs/features/payout-system.md`
- **Visit Tracking:** `docs/features/visit-tracking.md`
- **System Config:** `docs/technical/system-configuration.md`
- **ADR:** `docs/adrs/0004-prorate-payout-calculation.md`

---

## Known Limitations

### Current Limitations
- No UI to view adjustment history (API only)
- Cannot bulk edit historical visits
- Cannot delete adjustments once created
- No notification to mitra when adjustment applied

### Workarounds
- Use API directly for adjustment history
- Edit visits one by one
- Contact admin to delete incorrect adjustments manually
- Email mitras manually with payout slip

---

## Future Enhancements

**Planned:**
1. UI for viewing adjustment history
2. Bulk historical edit capability
3. Adjustment approval workflow (optional)
4. Email notifications to mitras
5. Dashboard showing pending adjustments
6. Adjustment reversal mechanism

---

## Troubleshooting

### Issue: Adjustment Not Created

**Possible Causes:**
1. Original payout status is 'Draft' (only Paid/Pending trigger adjustments)
2. Visit period has no payout generated yet
3. Lock is enabled (`LOCK_COMPLETED_VISITS = true`)

**Solution:**
- Check payout status for that period
- Generate payout first, then edit visit
- Disable lock if needed

---

### Issue: Adjustment Applied Multiple Times

**Possible Causes:**
- Payout generated twice for same period
- Manual database edits

**Solution:**
- Check `payout_adjustment_db.status` - should be 'APPLIED' only once
- Check `applied_payout_id` to see which payout it was applied to
- Contact admin to fix manually

---

**Document maintained by:** Handi
**Last verified:** 2026-03-07
**Questions:** handi.sulyansah@gmail.com
