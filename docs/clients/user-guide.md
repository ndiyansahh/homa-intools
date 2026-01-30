# HOMA Internal Management System - User Guide

**Version:** 1.0  
**Last Updated:** February 7, 2026  
**For:** HOMA Staff (Admin, Owner, Staff roles)

---

## Welcome to HOMA! 👋

This guide will help you navigate and use the HOMA Internal Management System effectively. Whether you're managing customers, tracking attendance, or processing payouts, this guide has you covered.

---

## Table of Contents

1. [Getting Started](#getting-started)
2. [Customer Management](#customer-management)
3. [Trial Customers](#trial-customers)
4. [Visit Scheduling](#visit-scheduling)
5. [Attendance Tracking](#attendance-tracking)
6. [Payout Management](#payout-management)
7. [Settings & Configuration](#settings--configuration)
8. [Common Tasks](#common-tasks)
9. [Troubleshooting](#troubleshooting)
10. [FAQ](#faq)

---

## Getting Started

### Logging In

1. Go to: `https://homa-intools.vercel.app`
2. Enter your email and password
3. Click "Login"

**First Time?** Contact your administrator to create your account.

---

### Understanding User Roles

**ADMIN:**
- Full system access
- Can manage customers, mitras, visits, payouts
- Can configure settings (rates, packages)
- Can view all reports

**OWNER:**
- Same as ADMIN
- Business owner account

**STAFF (Mitra):**
- Limited access
- Can clock in/out
- Can view own schedule
- Can view own payout slips

---

### Navigation

**Top Menu:**
```
┌────────────────────────────────────────┐
│ HOMA  [Dashboard] [Customers] [...] │
└────────────────────────────────────────┘
```

**Sidebar (Admin/Owner):**
- Dashboard
- Customers
- Visits
- Attendance
- Payouts
- Mitras
- Settings

**Sidebar (Staff):**
- My Schedule
- Attendance
- My Payouts

---

## Customer Management

### Adding a New Customer

#### Option 1: Trial Customer

**When to use:** Customer wants to try service before subscribing

**Steps:**
1. Click **"Customers"** in sidebar
2. Click **"Add Customer"** button
3. Select **"Trial Customer"**
4. Fill in details:
```
   Name: [Customer name]
   Phone: [08XXXXXXXXXX]
   Email: [Optional]
   Address: [Full address]
```
5. **Add Trial Date:**
```
   Date: [Pick date]
   Time: [Pick time, e.g., 09:00]
```
6. **Want more trial dates?**
   - Click **[+ Add Another Date]**
   - Add as many as needed
7. Click **"Create Customer"**

**Result:** Customer created with trial schedule ✅

---

#### Option 2: Direct Subscription

**When to use:** Customer ready to subscribe immediately

**Steps:**
1. Click **"Customers"** → **"Add Customer"**
2. Select **"Subscription Customer"**
3. Fill in basic info (name, phone, address)
4. **Choose Package:**
```
   ○ Basic (1x/week) - Rp 600,000/month
   ○ Regular (2x/week) - Rp 1,200,000/month
   ○ Frequent (3x/week) - Rp 1,800,000/month
```
5. **Set Schedule:**
```
   Example: Regular (2x/week)
   ☑ Monday [09:00]
   ☐ Tuesday
   ☐ Wednesday
   ☑ Thursday [09:00]
```
6. **Assign Mitra:**
   - Select from dropdown
   - Any mitra can be assigned (no restrictions)
7. **Start Date:** [Pick start date]
8. Click **"Create Customer"**

**Result:** 
- Customer created ✅
- Visits scheduled automatically ✅
- Mitra assigned ✅

---

### Finding a Customer

**Search Bar:**
1. Go to **Customers** page
2. Use search bar (top right)
3. Type: Name or Phone number
4. Results appear instantly

**Filters:**
```
[All ▼] [All Packages ▼] [All Mitras ▼]

Options:
- Type: Trial, Active, Paused, Expired
- Package: Basic, Regular, Frequent
- Mitra: Filter by assigned mitra
```

---

### Editing Customer Details

1. Find customer in list
2. Click customer name
3. Click **"Edit"** button
4. Update any field:
   - Name
   - Phone
   - Address
   - Assigned mitra
5. Click **"Save"**

**Note:** Cannot change package here. See "Changing Subscription" below.

---

### Converting Trial to Subscription

**When:** Trial customer wants to subscribe

**Steps:**
1. Open trial customer page
2. Click **"Convert to Subscription"**
3. **Select Package:**
```
   ○ Basic (1x/week)
   ○ Regular (2x/week)
   ○ Frequent (3x/week)
```
4. **Set Schedule:**
   - Choose days of week
   - Choose time
5. **Assign Mitra** (if not already)
6. **Start Date:** [Pick date]
7. Click **"Convert"**

**Result:**
- Customer type changes to "Subscription" ✅
- Recurring visits scheduled ✅
- Invoice generated ✅

---

### Pausing a Subscription

**When:** Customer traveling, not need service temporarily

**Steps:**
1. Open customer page
2. Click **"Pause Subscription"**
3. Enter reason: `Customer traveling for 2 months`
4. (Optional) Resume date: `2026-04-01`
5. Click **"Confirm"**

**Result:**
- Subscription status: Paused ✅
- Future visits cancelled ✅
- Customer can resume anytime

**To Resume:**
1. Open customer page
2. Click **"Resume Subscription"**
3. Visits recreated automatically ✅

---

## Trial Customers

### Managing Trial Dates

#### Adding More Trial Dates

**When:** Customer wants additional trial before subscribing

**Steps:**
1. Open trial customer page
2. Scroll to **"Trial Schedule"** section
3. Click **[+ Add Another Trial Date]**
4. Pick date and time
5. Click **"Add"**

**Result:** New trial date added ✅

**No Limit:** Add as many trial dates as needed!

---

#### Editing Trial Date

1. Open trial customer page
2. Find trial date in list
3. Click **"Edit"** (pencil icon)
4. Change date or time
5. Click **"Save"**

---

#### Cancelling Trial Date

1. Open trial customer page
2. Find trial date
3. Click **"Cancel"** (X icon)
4. Confirm cancellation

---

## Visit Scheduling

### Viewing Visit Schedule

**Calendar View:**
1. Go to **Visits** page
2. Select **"Calendar"** tab
3. See all visits in calendar format

**List View:**
1. Go to **Visits** page
2. Select **"List"** tab
3. See visits in table format

**Filters:**
```
Month: [February 2026 ▼]
Mitra: [All ▼]
Status: [All ▼]
Customer: [Search...]
```

---

### Rescheduling a Visit

**When:** Customer needs different date/time

**Steps:**
1. Find visit in calendar or list
2. Click visit
3. Click **"Reschedule"**
4. Pick new date and time
5. Enter reason: `Customer request`
6. Click **"Confirm"**

**Result:**
- Original visit marked "Rescheduled" ✅
- New visit created ✅
- Mitra notified ✅

---

### Cancelling a Visit

**When:** Customer cancels service

**Steps:**
1. Find visit
2. Click **"Cancel"**
3. Enter reason: `Customer cancelled`
4. Click **"Confirm"**

**Result:**
- Visit status: Cancelled ✅
- Mitra notified ✅
- Won't count in payout ✅

---

### Scheduling Same-Day Multiple Visits

**Available:** Sprint 6 (Late February 2026)

**Use Case:** Customer wants 2 shifts same day

**Steps:**
1. Click **"Schedule Visit"**
2. **Schedule 1:**
```
   Day: Monday
   Time: 08:00
   Duration: 3 hours
```
3. Click **[+ Add Another Schedule]**
4. **Schedule 2:**
```
   Day: Monday  ← Same day!
   Time: 11:00
   Duration: 3 hours
```
5. Click **"Save"**

**Result:** 2 visits scheduled same day ✅

---

## Attendance Tracking

### For Staff (Mitra): Clock In/Out

#### Clocking In

**Steps:**
1. Login to HOMA
2. Go to **"Attendance"** page
3. Click big **"CLOCK IN"** button
4. (Optional) Allow GPS location
5. (Optional) Take photo
6. Click **"Confirm Clock In"**

**Result:** 
- Clock in recorded ✅
- Time stamped ✅
- GPS captured (if allowed) ✅

---

#### Clocking Out

**Steps:**
1. Go to **"Attendance"** page
2. Click **"CLOCK OUT"** button
3. (Optional) Take photo
4. (Optional) Add notes: `All tasks completed`
5. Click **"Confirm Clock Out"**

**Result:**
- Clock out recorded ✅
- Work hours calculated ✅
- Visit marked "Completed" ✅

---

### For Admin: Marking Attendance

#### Method 1: Individual (Current)

**Steps:**
1. Go to **"Attendance"** → **"Visits"** tab
2. Find visit in list
3. Click **"Mark Attended"** button
4. Confirm

**Note:** This method will be replaced with bulk actions soon!

---

#### Method 2: Bulk Actions (Coming Sprint 5)

**Steps:**
1. Go to **"Attendance"** → **"Visits"** tab
2. **Select visits:**
```
   ☑ Feb 5, 09:00 - Customer A
   ☑ Feb 6, 09:00 - Customer B
   ☑ Feb 7, 09:00 - Customer C
   ☑ Feb 8, 09:00 - Customer D
```
3. Click **"Bulk Mark Attended"**
4. Confirm

**Result:** All selected visits marked ✅

**Tip:** Use **"Select All"** for entire list!

---

### Editing Historical Attendance

**When:** Mistake discovered after period closed

**Example Scenario:**
```
"Paid mitra for 8 visits in January.
Feb 5: Discovered Jan 31 didn't actually attend.
Need to correct."
```

**Steps:**
1. Go to **"Attendance"** → **"History"**
2. Find the visit (e.g., Jan 31)
3. Click **"Edit"** (pencil icon)
4. Change status: `Completed` → `Missed`
5. Enter reason: `Discovered mitra didn't attend`
6. Click **"Save"**

**⚠️ Warning Shown:**
```
Warning: This visit is in a closed payout period.
Editing will create a payout adjustment of -Rp 100,000
in the next payout for this mitra.
```

**Result:**
- Visit status updated ✅
- Payout adjustment created automatically ✅
- Next payout will include correction ✅
- Full audit trail maintained ✅

**No Period Lock:** Can edit ANY historical visit, anytime! ✅

---

### Viewing Attendance Reports

**Monthly Summary:**
1. Go to **"Attendance"** → **"Reports"**
2. Select month: `January 2026`
3. (Optional) Filter by mitra
4. Click **"Generate"**

**Report Shows:**
```
Mitra: Ani Yulianti
Month: January 2026

Scheduled Visits: 20
Attended: 18
Missed: 2
Attendance Rate: 90%
Total Hours: 54 hours
```

**Export:**
- Click **"Export to CSV"**
- Opens in Excel/Google Sheets

---

## Payout Management

### Understanding Payout Calculation

**Formula:**
```
Monthly Payout = (Actual Visits / Scheduled Visits) × Base Rate
```

**Example:**
```
Mitra: Ani
Base Rate: Rp 900,000/month
Scheduled: 8 visits
Attended: 7 visits

Payout = 7/8 × 900,000 = Rp 787,500
```

---

### Generating Monthly Payouts

**When:** Beginning of each month (for previous month)

**Steps:**
1. Go to **"Payouts"** page
2. Click **"Generate Payouts"**
3. Select month: `January 2026`
4. Click **"Generate"**

**System Will:**
- Calculate all mitras automatically ✅
- Apply pro-rate formula ✅
- Include any adjustments ✅
- Create payout slips ✅

**Time:** ~30 seconds for 10 mitras

---

### Reviewing Payout Slip

**Steps:**
1. Go to **"Payouts"** page
2. Find mitra in list
3. Click mitra name

**Payout Slip Shows:**
```
┌────────────────────────────────────┐
│ Payout Slip - January 2026         │
│                                    │
│ Mitra: Ani Yulianti                │
│ Base Rate: Rp 900,000/month        │
│                                    │
│ CALCULATION:                       │
│ Scheduled Visits: 8                │
│ Actual Visits: 7                   │
│ Base Amount: Rp 787,500            │
│                                    │
│ ADJUSTMENTS:                       │
│ (None this month)                  │
│                                    │
│ LAINNYA (Others):                  │
│ Rp 0                               │
│                                    │
│ FINAL AMOUNT: Rp 787,500           │
│                                    │
│ [Approve] [Edit] [Download PDF]    │
└────────────────────────────────────┘
```

**Visit List:**
Shows all visits with attendance status

---

### Understanding Adjustments

**What are adjustments?**
Corrections from previous months carried forward.

**Example:**
```
Scenario:
Jan: Paid Rp 800K for 8 visits
Later: Discovered only 7 visits (1 missed)
Overpaid: Rp 100K

Feb Payout Slip:
┌────────────────────────────┐
│ Base Amount: Rp 200,000    │
│                            │
│ ADJUSTMENTS:               │
│ Jan Correction: -Rp 100,000│
│ Reason: Visit 31-Jan missed│
│                            │
│ FINAL: Rp 100,000          │
└────────────────────────────┘
```

**When Do Adjustments Happen?**
- Historical visit edited after payout paid
- Bonus added manually
- Deduction for any reason

**Transparency:**
- Every adjustment explained
- Link to source visit shown
- Full audit trail

---

### Approving Payouts

**When:** After reviewing calculations

**Steps:**
1. Review payout slip
2. Verify:
   - Calculation correct?
   - Adjustments make sense?
   - Visit list accurate?
3. Click **"Approve"**

**Result:**
- Status: Draft → Approved ✅
- Ready for payment ✅

**Bulk Approve:**
1. Go to **"Payouts"** list
2. Check multiple payouts
3. Click **"Bulk Approve"**

---

### Marking Payout as Paid

**When:** After transferring money to mitra

**Steps:**
1. Open payout slip
2. Click **"Mark as Paid"**
3. Enter payment date
4. (Optional) Add note: `Bank transfer #123456`
5. Click **"Confirm"**

**Result:**
- Status: Approved → Paid ✅
- Payment date recorded ✅
- Mitra can see status

---

### Downloading PDF Slip

**Available:** Sprint 5 (Mid-February 2026)

**Steps:**
1. Open payout slip
2. Click **"Download PDF"**
3. PDF generated and downloaded

**Filename:** `payout-slip-jan-2026-ani-yulianti.pdf`

**Use Case:**
- Print for mitra
- Email to mitra
- File for records

---

### Exporting Payout Report

**For Accounting:**

**Steps:**
1. Go to **"Payouts"** page
2. Select month
3. Click **"Export"**
4. Choose format:
   - CSV (Excel)
   - PDF (Print)

**CSV Contains:**
```
Mitra Name | Period | Base Rate | Scheduled | Attended | Calculated | Adjustments | Final | Status
```

---

## Settings & Configuration

### Managing Payout Rates

**Available:** Sprint 4 (Early February 2026)

**Access:** Admin/Owner only

**Steps:**
1. Go to **"Settings"** → **"Payout Rates"**
2. See current rates:
```
   Basic Package: Rp 600,000/month
   Regular Package: Rp 1,200,000/month
   Frequent Package: Rp 1,800,000/month
```
3. Click **"Edit"** on any rate
4. Change amount
5. Set effective date: `2026-02-01`
6. Click **"Save"**

**Result:**
- New rate applies from effective date ✅
- Old rate preserved in history ✅
- Payouts use correct rate for period ✅

---

### Managing Subscription Packages

**Available:** Sprint 6 (Late February 2026)

**Access:** Admin/Owner only

**Steps:**
1. Go to **"Settings"** → **"Packages"**
2. Click **"Add New Package"**
3. Fill in:
```
   Name: Premium
   Frequency: 4 visits/week
   Price: Rp 2,400,000/month
   Description: High-frequency service
```
4. Click **"Create"**

**Result:**
- New package available in dropdowns ✅
- Customers can subscribe ✅
- Mitras can be assigned ✅

**Editing Package:**
1. Click **"Edit"** on existing package
2. Change any field
3. **Note:** Won't affect existing customers (only new)

**Deactivating Package:**
1. Click **"Deactivate"**
2. Package hidden from new subscriptions
3. Existing customers not affected

---

### Managing Mitras

**Adding New Mitra:**
1. Go to **"Mitras"** page
2. Click **"Add Mitra"**
3. Fill in:
```
   Name: [Full name]
   Phone: [08XXXXXXXXXX]
   Email: [Optional]
   Base Rate: [Rp 900,000/month]
```
4. Create login credentials
5. Click **"Create"**

**Result:**
- Mitra can login ✅
- Can be assigned to customers ✅
- Will receive payouts ✅

---

**Editing Mitra Rate:**
1. Go to **"Mitras"** page
2. Click mitra name
3. Click **"Edit"**
4. Change **"Base Rate"**: `Rp 900,000` → `Rp 950,000`
5. Click **"Save"**

**Note:** 
- Each mitra can have different rate ✅
- No restrictions or locking ✅
- Change anytime ✅

---

## Common Tasks

### Task 1: New Customer Call-In

**Customer calls: "I want to try your service"**

**Steps:**
1. **Customers** → **Add Customer**
2. **Trial Customer**
3. Get info over phone:
   - Name, phone, address
4. Ask: **"When would you like to try?"**
   - Customer: "Maybe this Thursday"
5. Add trial date: `Thursday, 09:00`
6. Ask: **"Would you like to schedule more trial dates now?"**
   - If yes: Click **[+ Add Another Date]**
7. **Create Customer**
8. Tell customer: **"All set! Your trial is scheduled for Thursday at 9 AM."**

---

### Task 2: Customer Wants to Subscribe After Trial

**Customer calls: "I tried the service, want to subscribe"**

**Steps:**
1. Find customer (search by name/phone)
2. Open customer page
3. **Convert to Subscription**
4. Ask: **"How often would you like service?"**
   - Options: 1x, 2x, or 3x per week
5. Ask: **"Which days work best?"**
6. Set schedule
7. Ask: **"When should we start?"**
8. Set start date
9. **Convert**
10. Tell customer: **"Done! Your subscription starts [date]. Invoice will be sent via email."**

---

### Task 3: Customer Moving, Wants to Pause

**Customer calls: "I'm traveling for 2 months, can you pause?"**

**Steps:**
1. Find customer
2. **Pause Subscription**
3. Reason: `Customer traveling`
4. Resume date: `+2 months from now`
5. **Confirm**
6. Tell customer: **"Service paused. We'll resume on [date]. Just call if you need to resume earlier!"**

---

### Task 4: End of Month Payout Process

**Every month beginning:**

**Steps:**
1. **Wait until month ends** (e.g., wait till Feb 1 for Jan payouts)
2. **Payouts** → **Generate Payouts**
3. Month: `January 2026`
4. **Generate** (takes ~30 seconds)
5. **Review each payout slip:**
   - Calculations correct?
   - Adjustments make sense?
   - Any issues?
6. **Approve** all verified payouts
7. **Transfer money** to mitras
8. **Mark as Paid** with payment date
9. **Export CSV** for accounting
10. **Done!** ✅

---

### Task 5: Mitra Didn't Actually Attend (Discovered Late)

**Feb 5: Discover Jan 31 visit didn't happen (already paid)**

**Steps:**
1. **Attendance** → **History**
2. Filter: `January 2026`
3. Find Jan 31 visit
4. **Edit** (pencil icon)
5. Status: `Completed` → `Missed`
6. Reason: `Customer confirmed mitra didn't come`
7. Read warning: `Will create adjustment -Rp 100K`
8. **Save**
9. System automatically:
   - Updates visit ✅
   - Creates adjustment for Feb ✅
   - Feb payout will be corrected ✅

**Next Month:**
Feb payout will show:
```
Base: Rp 200K
Adjustment: -Rp 100K (Jan correction)
Final: Rp 100K ✅
```

---

## Troubleshooting

### Problem: Can't Login

**Symptoms:** Wrong password or email not found

**Solutions:**
1. **Check email spelling** (case-sensitive)
2. **Try "Forgot Password"** link
3. **Contact admin** to reset password
4. **Check keyboard:** Caps Lock off?

---

### Problem: Customer Not Found

**Symptoms:** Search returns no results

**Solutions:**
1. **Try different search:**
   - Full name
   - Just first name
   - Phone number
2. **Check filters:** Set to "All"
3. **Check spelling**
4. **Maybe customer was deleted?** Contact admin

---

### Problem: Can't Schedule Same Day Twice

**Symptoms:** Error: "Customer already has visit on Monday"

**Status:** Known limitation (fixing in Sprint 6)

**Workaround:**
1. Schedule first visit
2. Wait (can't schedule second until feature ready)

**OR:**
3. Use different customer account (not ideal)

**Coming Soon:** Sprint 6 (late Feb) will fix this ✅

---

### Problem: Payout Amount Seems Wrong

**Symptoms:** Expected Rp 800K, showing Rp 700K

**Check:**
1. **Visit list:** Did mitra attend all visits?
   - Missing 1 visit = lower payout
2. **Adjustments:** Any adjustments shown?
   - Previous month correction?
3. **Base rate:** Check mitra's base rate
   - Recently changed?

**If Still Wrong:**
1. Screenshot payout slip
2. Note expected amount
3. Contact developer via WhatsApp

---

### Problem: Page Loading Slow

**Solutions:**
1. **Refresh page:** Ctrl+F5 (Windows) or Cmd+R (Mac)
2. **Clear cache:** Browser settings → Clear cache
3. **Check internet:** Speed test
4. **Try different browser:** Chrome recommended

**If Persistent:**
- Contact developer
- May be server issue

---

## FAQ

### Q1: Can I delete a customer?

**A:** Yes, but it's "soft delete" (not permanent).

**Steps:**
1. Customer page → **"Archive Customer"**
2. Customer hidden from main list
3. Can be restored by admin if needed

**Note:** Can't delete if customer has unpaid invoices.

---

### Q2: Can I change a customer's package?

**A:** Not directly. Workaround:

1. **Cancel** old subscription
2. **Create new** subscription with new package
3. Keep same customer record

**Coming Soon:** Package change feature (Sprint 7?)

---

### Q3: What if mitra doesn't have smartphone for GPS?

**A:** GPS is optional!

**Options:**
1. Mitra can clock in without GPS ✅
2. Admin can manually mark attended ✅
3. GPS nice-to-have, not required

---

### Q4: Can mitra see their own payout?

**A:** Yes!

**Mitra Login:**
1. Go to **"My Payouts"**
2. See all payout slips
3. Can download PDF (when available)

**Privacy:** Mitra only sees own payouts (not other mitras)

---

### Q5: What timezone does system use?

**A:** Asia/Jakarta (WIB) always.

**Example:**
- Clock in 09:00 = 09:00 WIB ✅
- Payout calculation uses Jakarta months ✅
- All timestamps in WIB ✅

---

### Q6: Can I export customer list?

**A:** Yes!

**Steps:**
1. **Customers** page
2. **Export** button (top right)
3. Choose: CSV or PDF
4. Download

**CSV Opens In:** Excel, Google Sheets

---

### Q7: What if I make a mistake?

**A:** Most things can be edited!

**Can Edit:**
- Customer details ✅
- Visit dates/times ✅
- Attendance (even historical) ✅
- Mitra rates ✅

**Can't Edit:**
- Paid invoices (contact admin)
- Deleted customers (contact admin)

**Tip:** System tracks edit history (audit trail)

---

### Q8: How do I print a payout slip?

**Current (Sprint 4):**
1. Open payout slip
2. Browser: File → Print
3. Save as PDF or print

**Coming Soon (Sprint 5):**
- **"Download PDF"** button ✅
- Professional format ✅
- One-click download ✅

---

### Q9: Can two mitras work same customer?

**A:** Yes, but not at same time.

**Scenario:**
- Customer has 2x/week (Mon & Thu)
- Mitra A works Mondays
- Mitra B works Thursdays

**How:**
1. Schedule Mon visit → Assign Mitra A
2. Schedule Thu visit → Assign Mitra B

**Note:** Each visit assigned to one mitra only

---

### Q10: What happens if customer doesn't pay invoice?

**A:** Manual process (outside system)

**System Tracks:**
- Invoice generated ✅
- Payment status (paid/unpaid) ✅

**Follow-up:**
- Admin responsibility to chase payment
- Can pause subscription if not paid
- Can mark invoice as "written off"

**Coming Soon:** Payment gateway integration (future)

---

## Getting Help

### In-App Help

**Look for:** `?` icon (top right)
- Quick tips
- Common questions
- Keyboard shortcuts

---

### Contact Support

**For Bugs or Issues:**
- **WhatsApp:** [Developer's number]
- **Email:** handi.sulyansah@gmail.com
- **Response Time:** 4-24 hours

**Include in Message:**
1. What you were trying to do
2. What happened (error message?)
3. Screenshot if possible
4. Your username

---

### Training Sessions

**Available:** After Sprint 6 completion (March 2026)

**Format:**
- 1-hour group session
- Hands-on walkthrough
- Q&A
- Recording provided

**Schedule:** Contact admin to arrange

---

## Keyboard Shortcuts

**Quick Navigation:**
```
Ctrl+K : Quick search (customers/mitras)
Ctrl+N : New customer
Ctrl+S : Save current form
Esc    : Close modal/cancel
```

**Lists:**
```
↑↓     : Navigate list
Enter  : Open selected item
Space  : Select checkbox
```

**Forms:**
```
Tab    : Next field
Shift+Tab : Previous field
```

---

## Tips & Best Practices

### For Admins

**Tip 1:** Process payouts early in month
- Don't wait until end of month
- Review and approve by 5th

**Tip 2:** Check attendance daily
- Don't let it pile up
- Easier to remember details

**Tip 3:** Backup customer data monthly
- Export CSV monthly
- Store in Google Drive/Dropbox

**Tip 4:** Review payout slips carefully
- Verify calculations
- Check adjustments
- Prevent overpayment

---

### For Mitras

**Tip 1:** Clock in/out consistently
- Don't forget!
- Affects payout

**Tip 2:** Enable GPS if possible
- Helps verify attendance
- Extra proof if dispute

**Tip 3:** Check schedule weekly
- Know upcoming visits
- No surprises

**Tip 4:** Review payout slips
- Understand calculation
- Report issues early

---

## Document Updates

**Version History:**

**v1.0 (Feb 7, 2026):**
- Initial version
- Based on Sprint 4 features
- Pre-Sprint 5 release

**Coming in v1.1 (Feb 17, 2026):**
- PDF export instructions
- Bulk attendance section
- New trial form guide

**Coming in v1.2 (Mar 3, 2026):**
- Configurable packages
- Same-day scheduling
- Invoice ID references

---

## Related Documents

**For Developers:**
- Technical documentation: `docs/technical/`
- API documentation: `docs/technical/api-documentation.md`

**For Business:**
- Meeting notes: `docs/client/meeting-notes/`
- Feedback tracking: `docs/client/feedback-tracking.md`

---

**Need Help?** Contact your administrator or developer! 

**Document Version:** 1.0  
**Last Updated:** February 7, 2026  
**Next Update:** February 17, 2026 (after Sprint 5)