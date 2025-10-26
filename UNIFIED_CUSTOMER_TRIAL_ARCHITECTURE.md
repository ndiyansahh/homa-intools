# Unified Customer & Trial Architecture

## Overview
Customer dan Trial sekarang menggunakan **satu database table tunggal**: `customer_db`. Tidak ada lagi pemisahan antara customer dan trial data.

## Database Structure

### Single Source of Truth: `customer_db`
```sql
customer_db:
├── id (UUID)
├── customer_name
├── contact  
├── address, city, district, village, postal_code
├── subscription_package_id (FK to subscription_package_db)
├── subscription_package (name)
├── subscription_start, subscription_end
├── subscription_status ← KEY FIELD
├── monthly_fee, total_paid, outstanding_balance
├── assigned_mitra_id (FK to mitra_db)
├── customer_notes
├── is_active, is_deleted
└── created_at, updated_at
```

### Subscription Status Values
- **`Trial`** - Trial customers (free trial period)
- **`Trial Scheduled`** - Scheduled trial customers  
- **`Active`** - Paying customers
- **`Inactive`** - Suspended customers
- **`Suspended`** - Temporarily suspended
- **`Expired`** - Expired subscriptions
- **`Cancelled`** - Cancelled subscriptions

## Data Flow

### Trial Creation
```
POST /api/trial → customer_db
└── subscription_status = 'Trial'
└── subscription_package = 'Trial' 
└── subscription_package_id = (Trial package ID)
└── monthly_fee = '0'
```

### Trial to Customer Conversion
```
PUT /api/trial (convert_to_customer = true)
└── UPDATE customer_db SET:
    ├── subscription_status = 'Active'
    ├── subscription_package = selected_package
    ├── subscription_package_id = selected_package_id
    ├── monthly_fee = package_price
    └── subscription_end = calculated_end_date
```

### Trial Management
```
GET /api/trials 
└── SELECT * FROM customer_db 
    WHERE subscription_status IN ('Trial', 'Trial Scheduled')

GET /api/trials/[id]
└── SELECT * FROM customer_db 
    WHERE id = trial_id AND subscription_status IN ('Trial', 'Trial Scheduled')
```

## Benefits of Unified Architecture

### ✅ Advantages
1. **Single Source of Truth** - All customer data in one place
2. **Seamless Conversion** - Trial to customer is just status update
3. **Consistent Data Model** - Same fields for all customer types
4. **Simplified Queries** - No complex JOINs between customer/trial tables
5. **Better Data Integrity** - Foreign keys work consistently
6. **Easier Maintenance** - One table to maintain, backup, optimize

### ❌ Previous Issues (Fixed)
- ~~Duplicate customer data in separate tables~~
- ~~Complex data synchronization during conversion~~
- ~~Inconsistent field mappings~~
- ~~Multiple sources of truth~~
- ~~Complex relationship management~~

## API Endpoints

### Trial APIs
- `POST /api/trial` - Create trial customer in customer_db
- `PUT /api/trial` - Update trial + convert to customer
- `GET /api/trials` - List all trial customers
- `GET /api/trials/[id]` - Get trial detail
- `DELETE /api/trials/[id]` - Soft delete trial

### Customer APIs  
- `GET /api/customers` - List all customers (including trials)
- `GET /api/customers/[id]` - Get customer detail
- `PUT /api/customers/[id]` - Update customer

## Subscription Packages

### Single Package Table: `subscription_package_db`
```sql
subscription_package_db:
├── id (UUID)
├── subscription_package (name)
├── price_per_qty (formatted price "Rp1,125,000")  
├── price_numeric (numeric price 1125000)
├── created_at, updated_at
```

### Available Packages
1. **Trial** - "Rp0", 0 (for trial customers)
2. **Monthly Subscription of Regular Cleaning** - "Rp1,125,000", 1125000
3. **Monthly Subscription of Frequent Cleaning** - "Rp1,650,000", 1650000  
4. **Monthly Subscription of Special Partnership** - "Rp562,500", 562500
5. **Monthly Subscription of Basic Cleaning** - "Rp600,000", 600000

## Frontend Logic

### Trial Display
```typescript
// Only show package name for Trial status
if (customer.subscription_status === 'Trial') {
  // Show: "Trial Package" 
  // Hide: pricing information
} else {
  // Show: full package details + pricing
}
```

### Trial Conversion
```typescript
// Convert trial to customer
const updatePayload = {
  id: customerId,
  subscription_package: selectedPackage,
  subscription_status: 'Active',
  convert_to_customer: true
};
```

## Migration Notes

### Removed Components
- ❌ `trialDB` schema (removed)
- ❌ `trialAssignmentDB` schema (removed)  
- ❌ `trial_db` table (never existed)
- ❌ `trial_assignment_db` table (never existed)
- ❌ Separate trial types/interfaces

### Current Architecture
- ✅ Single `customer_db` table for all data
- ✅ `subscription_status` field differentiates trial vs customer
- ✅ Same schema for trials and customers
- ✅ Unified API endpoints using customer_db
- ✅ Seamless trial-to-customer conversion

## Queries Examples

### Get All Trials
```sql
SELECT * FROM customer_db 
WHERE subscription_status IN ('Trial', 'Trial Scheduled')
AND is_deleted = false;
```

### Get All Active Customers  
```sql
SELECT * FROM customer_db 
WHERE subscription_status = 'Active'
AND is_deleted = false;
```

### Convert Trial to Customer
```sql
UPDATE customer_db SET 
  subscription_status = 'Active',
  subscription_package = 'Monthly Subscription of Regular Cleaning...',
  subscription_package_id = 'package-uuid',
  monthly_fee = 1125000,
  subscription_end = '2025-11-26'
WHERE id = 'trial-customer-uuid';
```

## Summary

**Before**: Trial dan Customer terpisah → Kompleks, duplikasi data
**After**: Satu table `customer_db` → Simple, consistent, scalable

Semua functionality trial sekarang menggunakan `customer_db` dengan `subscription_status` sebagai differentiator utama.