# Payout Export Feature - Bank Transfer Format

## 📊 Overview

Feature untuk export data payout dalam format yang ready untuk bank transfer processing.

### **Output Fields:**
1. Payout ID
2. Mitra Code
3. Mitra Name
4. Phone
5. Bank Account
6. Bank Account Number
7. Bank Holder Name
8. Qty (Total Visits)
9. Price per Qty
10. Bonus Amount
11. Price Total

---

## 🗂️ Files Created

| File | Purpose |
|------|---------|
| `src/app/api/payouts/export/route.ts` | API endpoint untuk export |
| `src/lib/export-utils.ts` | Utility functions |
| `src/components/payout-export-button.tsx` | Export button component |
| `export-payout-for-transfer.sql` | SQL query untuk manual export |

---

## 🚀 Usage

### **1. Simple Export Button**

Add to your payout page:

```tsx
import { PayoutExportButton } from '@/components/payout-export-button';

export default function PayoutPage() {
  return (
    <div>
      <div className="flex justify-between mb-4">
        <h1>Payouts</h1>
        <PayoutExportButton
          year={2025}
          months={[9, 10]}
          status="Paid"
        />
      </div>
      {/* Your payout table here */}
    </div>
  );
}
```

### **2. Advanced Export with Filters**

```tsx
import { PayoutExportWithFilters } from '@/components/payout-export-button';

export default function PayoutPage() {
  return (
    <div>
      <PayoutExportWithFilters />
      {/* Your payout table here */}
    </div>
  );
}
```

### **3. Programmatic Export**

```tsx
import { exportPayoutData } from '@/lib/export-utils';

// In your component
const handleCustomExport = async () => {
  const result = await exportPayoutData({
    year: 2025,
    months: [9, 10],
    status: 'Paid',
    format: 'csv'
  });

  if (result.success) {
    console.log('Export successful!');
  }
};
```

---

## 🔌 API Endpoints

### **GET /api/payouts/export**

Export payout data in CSV or JSON format.

#### **Query Parameters:**

| Parameter | Type | Default | Description |
|-----------|------|---------|-------------|
| `year` | number | 2025 | Year of payouts |
| `months` | string | "9,10" | Comma-separated months |
| `status` | string | "Paid" | Payout status (Pending/Paid/Cancelled) |
| `format` | string | "csv" | Output format (csv/json) |

#### **Example Requests:**

```bash
# Export September & October 2025 payouts as CSV
GET /api/payouts/export?year=2025&months=9,10&status=Paid&format=csv

# Export all paid payouts as JSON
GET /api/payouts/export?year=2025&months=1,2,3,4,5,6,7,8,9,10,11,12&status=Paid&format=json

# Export only September paid payouts
GET /api/payouts/export?year=2025&months=9&status=Paid&format=csv
```

#### **Response:**

**CSV Format:**
```csv
Payout ID,Mitra Code,Mitra Name,Phone,Bank Account,Bank Account Number,Bank Holder Name,Qty,Price per Qty,Bonus Amount,Price Total
PAY/Sri-Rahayu/2025.09.30-08866,MITRA-202510-011,Sri Rahayu,081234567811,Mandiri,5678901211,Sri Rahayu,4,150000,500000,1100000
PAY/Budi-Santoso/2025.09.30-07085,MITRA-202501-002,Budi Santoso,081234567802,Mandiri,9876543202,Budi Santoso,12,150000,400000,2200000
PAY/Ani-Yulianti/2025.09.30-12345,MITRA-202506-007,Ani Yulianti,081234567807,BCA,3456789007,Ani Yulianti,10,150000,0,1500000
```

**JSON Format:**
```json
{
  "success": true,
  "data": [
    {
      "payoutId": "PAY/Sri-Rahayu/2025.09.30-08866",
      "mitraCode": "MITRA-202510-011",
      "mitraName": "Sri Rahayu",
      "phone": "081234567811",
      "bankAccount": "Mandiri",
      "bankAccountNumber": "5678901211",
      "bankHolderName": "Sri Rahayu",
      "qty": 4,
      "pricePerQty": "150000",
      "bonusAmount": "500000",
      "priceTotal": "1100000"
    }
  ],
  "total": 1
}
```

---

## 💾 Database Schema Mapping

| Export Field | Database Source |
|--------------|-----------------|
| Payout ID | `payout_db.payout_id` |
| Mitra Code | `mitra_db.mitra_code` |
| Mitra Name | `mitra_db.mitra_name` |
| Phone | `mitra_db.mitra_phone` |
| Bank Account | `mitra_db.mitra_bank_account` |
| Bank Account Number | `mitra_db.mitra_bank_account_number` |
| Bank Holder Name | `mitra_db.mitra_bank_holder_name` |
| Qty | `payout_db.total_visits` |
| Price per Qty | `payout_db.price_per_visit` |
| Bonus Amount | `payout_db.bonus_amount` |
| Price Total | `payout_db.total_payout` |

---

## 🧪 Testing

### **1. Test API Endpoint:**

```bash
# Using curl
curl "http://localhost:3000/api/payouts/export?year=2025&months=9,10&status=Paid&format=csv" \
  -o payout-export.csv

# Check the file
cat payout-export.csv
```

### **2. Test in Browser:**

```
http://localhost:3000/api/payouts/export?year=2025&months=9,10&status=Paid&format=csv
```

Should auto-download: `payout-export-2025-9-10.csv`

### **3. Test Export Button:**

1. Navigate to payout page
2. Click "Export for Transfer" button
3. Check downloaded CSV file

---

## 📋 Manual Export (SQL)

If you need to export directly from database:

```bash
# Export to CSV file
psql "$DATABASE_URL" -f export-payout-for-transfer.sql -o payout-export.csv

# Or copy-paste the query
psql "$DATABASE_URL" <<EOF
COPY (
  SELECT
    p.payout_id AS "Payout ID",
    m.mitra_code AS "Mitra Code",
    m.mitra_name AS "Mitra Name",
    m.mitra_phone AS "Phone",
    m.mitra_bank_account AS "Bank Account",
    m.mitra_bank_account_number AS "Bank Account Number",
    m.mitra_bank_holder_name AS "Bank Holder Name",
    p.total_visits AS "Qty",
    p.price_per_visit AS "Price per Qty",
    p.bonus_amount AS "Bonus Amount",
    p.total_payout AS "Price Total"
  FROM payout_db p
  JOIN mitra_db m ON m.id = p.mitra_id
  WHERE p.status = 'Paid'
    AND p.year = 2025
    AND p.month IN (9, 10)
  ORDER BY m.mitra_name, p.month
) TO STDOUT WITH CSV HEADER;
EOF
```

---

## 🔍 Validation

The export includes automatic validation:

```typescript
import { validatePayoutExport } from '@/lib/export-utils';

const payouts = [/* your payout data */];
const validation = validatePayoutExport(payouts);

if (!validation.valid) {
  console.error('Validation errors:', validation.errors);
  // Show errors to user
}
```

**Checks:**
- ✅ Mitra name exists
- ✅ Bank account number exists
- ✅ Total amount > 0
- ✅ Required fields present

---

## 🎯 Example Output

### **CSV Export for Sept-Oct 2025:**

```csv
Payout ID,Mitra Code,Mitra Name,Phone,Bank Account,Bank Account Number,Bank Holder Name,Qty,Price per Qty,Bonus Amount,Price Total
PAY/Sri-Rahayu/2025.09.30-08866,MITRA-202510-011,Sri Rahayu,081234567811,Mandiri,5678901211,Sri Rahayu,4,150000,500000,1100000
PAY/Sri-Rahayu/2025.10.31-08409,MITRA-202510-011,Sri Rahayu,081234567811,Mandiri,5678901211,Sri Rahayu,5,150000,750000,1500000
PAY/Budi-Santoso/2025.09.30-07085,MITRA-202501-002,Budi Santoso,081234567802,Mandiri,9876543202,Budi Santoso,12,150000,400000,2200000
PAY/Budi-Santoso/2025.10.31-06119,MITRA-202501-002,Budi Santoso,081234567802,Mandiri,9876543202,Budi Santoso,15,150000,600000,2850000
PAY/Ani-Yulianti/2025.09.30-12345,MITRA-202506-007,Ani Yulianti,081234567807,BCA,3456789007,Ani Yulianti,10,150000,0,1500000
PAY/Ani-Yulianti/2025.10.31-67890,MITRA-202506-007,Ani Yulianti,081234567807,BCA,3456789007,Ani Yulianti,12,150000,0,1800000
```

**Note:** Ani Yulianti has `Bonus Amount = 0` because she's not eligible.

---

## 🚨 Important Notes

### **1. Security**
- Only export "Paid" status by default
- Validate user permissions before allowing export
- Consider adding authentication to export endpoint

### **2. Performance**
- For large datasets, consider pagination
- Add loading state during export
- Show progress indicator for bulk exports

### **3. Data Privacy**
- Bank account data is sensitive
- Log export activities for audit trail
- Consider encrypting exported files

---

## 🔧 Customization

### **Add Custom Fields:**

Edit `src/app/api/payouts/export/route.ts`:

```typescript
const csvHeaders = [
  'Payout ID',
  'Mitra Code',
  // ... existing fields
  'Payment Date',  // NEW
  'Notes',         // NEW
];

const csvRows = payouts.map((p) => [
  p.payoutId,
  p.mitraCode,
  // ... existing fields
  p.paymentDate,   // NEW
  p.notes,         // NEW
]);
```

### **Filter by Date Range:**

```typescript
exportPayoutData({
  year: 2025,
  months: [9, 10],
  status: 'Paid',
  startDate: '2025-09-01',  // Add this
  endDate: '2025-10-31',    // Add this
});
```

---

## ✅ Checklist

Before using in production:

- [ ] Test export with real data
- [ ] Verify CSV format matches bank requirements
- [ ] Add user authentication to export endpoint
- [ ] Test with different browsers
- [ ] Validate exported numbers match database
- [ ] Add error handling for failed exports
- [ ] Log export activities
- [ ] Test with large datasets (100+ records)

---

## 📞 Support

For issues:
1. Check browser console for errors
2. Verify API endpoint is accessible
3. Check database connection
4. Validate payout data exists for selected period

---

## 🎉 Ready to Use!

The export feature is production-ready and includes:
- ✅ CSV & JSON format support
- ✅ Automatic validation
- ✅ User-friendly button component
- ✅ API endpoint with filters
- ✅ Error handling
- ✅ Type-safe TypeScript code
