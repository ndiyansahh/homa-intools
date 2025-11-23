# Quick Integration Guide - Payout Export Feature

## 🚀 5-Minute Setup

### **Step 1: Add Export Button to Your Payout Page**

Find your payout page (probably at `src/app/(dashboard)/payouts/page.tsx` or similar):

```tsx
// Add this import at the top
import { PayoutExportButton } from '@/components/payout-export-button';

// In your component, add the button
export default function PayoutPage() {
  return (
    <div className="p-6">
      {/* Header with Export Button */}
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-bold">Payouts Management</h1>

        {/* ADD THIS */}
        <PayoutExportButton
          year={2025}
          months={[9, 10]}  // September & October
          status="Paid"
        />
      </div>

      {/* Your existing payout table/data */}
      <PayoutTable data={payouts} />
    </div>
  );
}
```

### **Step 2: That's It!**

The export feature is now ready. Click the button to download CSV.

---

## 📊 Output Format

The exported CSV will have these columns:

```
Payout ID | Mitra Code | Mitra Name | Phone | Bank Account | Bank Account Number | Bank Holder Name | Qty | Price per Qty | Bonus Amount | Price Total
```

**Example Row:**
```
PAY/Sri-Rahayu/2025.09.30-08866,MITRA-202510-011,Sri Rahayu,081234567811,Mandiri,5678901211,Sri Rahayu,4,150000,500000,1100000
```

---

## 🎨 Customization Options

### **Option 1: Change Button Style**

```tsx
<PayoutExportButton
  year={2025}
  months={[9, 10]}
  status="Paid"
  variant="default"  // or "outline", "ghost"
  className="bg-blue-600 hover:bg-blue-700"
/>
```

### **Option 2: Add Filter Dropdowns**

```tsx
import { PayoutExportWithFilters } from '@/components/payout-export-button';

// Replace simple button with advanced version
<PayoutExportWithFilters />
```

This gives users dropdowns to select:
- Year (2024, 2025, 2026)
- Months (Sep, Oct, Nov, Dec)
- Status (Pending, Paid, Cancelled)

### **Option 3: Export Selected Rows**

If you have row selection in your table:

```tsx
import { exportPayoutsByIds } from '@/lib/export-utils';

const [selectedRows, setSelectedRows] = useState<string[]>([]);

const handleExportSelected = async () => {
  await exportPayoutsByIds(selectedRows);
};

// In your JSX
<Button onClick={handleExportSelected} disabled={selectedRows.length === 0}>
  Export Selected ({selectedRows.length})
</Button>
```

---

## 🔧 Advanced Integration

### **Add to Existing UI Component**

If you already have a toolbar/action bar:

```tsx
<div className="flex items-center gap-2">
  <Button onClick={handleRefresh}>Refresh</Button>
  <Button onClick={handleFilter}>Filter</Button>

  {/* Add export button */}
  <PayoutExportButton year={2025} months={[9, 10]} status="Paid" />
</div>
```

### **Conditional Export**

Only show export when there's data:

```tsx
{payouts.length > 0 && (
  <PayoutExportButton year={2025} months={[9, 10]} status="Paid" />
)}
```

### **Dynamic Year/Month**

Export current period automatically:

```tsx
const currentYear = new Date().getFullYear();
const currentMonth = new Date().getMonth() + 1;

<PayoutExportButton
  year={currentYear}
  months={[currentMonth]}
  status="Paid"
/>
```

---

## 🧪 Testing

### **1. Test in Development**

```bash
# Start dev server
npm run dev

# Navigate to payout page
open http://localhost:3000/payouts

# Click "Export for Transfer" button
# Check downloaded CSV file
```

### **2. Verify Output**

Check the CSV has:
- ✅ All required columns
- ✅ Correct data (matches database)
- ✅ Proper formatting (no broken commas)
- ✅ All rows included

### **3. Test Different Filters**

```tsx
// Test September only
<PayoutExportButton year={2025} months={[9]} status="Paid" />

// Test multiple months
<PayoutExportButton year={2025} months={[9, 10, 11]} status="Paid" />

// Test pending payouts
<PayoutExportButton year={2025} months={[9, 10]} status="Pending" />
```

---

## 🎯 Real-World Example

Complete payout page with export:

```tsx
'use client';

import { useState, useEffect } from 'react';
import { PayoutExportButton } from '@/components/payout-export-button';
import { useToast } from '@/components/ui/use-toast';

export default function PayoutPage() {
  const [payouts, setPayouts] = useState([]);
  const [loading, setLoading] = useState(true);
  const { toast } = useToast();

  useEffect(() => {
    fetchPayouts();
  }, []);

  const fetchPayouts = async () => {
    try {
      const response = await fetch('/api/payouts?year=2025&months=9,10');
      const data = await response.json();
      setPayouts(data.payouts);
    } catch (error) {
      toast({
        title: 'Error',
        description: 'Failed to load payouts',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="container mx-auto p-6">
      {/* Header */}
      <div className="flex justify-between items-center mb-6">
        <div>
          <h1 className="text-3xl font-bold">Payouts</h1>
          <p className="text-gray-600 mt-1">
            Manage and export payout data for bank transfers
          </p>
        </div>

        {/* Export Button */}
        <PayoutExportButton
          year={2025}
          months={[9, 10]}
          status="Paid"
        />
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-3 gap-4 mb-6">
        <div className="bg-white p-4 rounded-lg shadow">
          <p className="text-sm text-gray-600">Total Payouts</p>
          <p className="text-2xl font-bold">{payouts.length}</p>
        </div>
        <div className="bg-white p-4 rounded-lg shadow">
          <p className="text-sm text-gray-600">Total Amount</p>
          <p className="text-2xl font-bold">
            Rp {payouts.reduce((sum, p) => sum + parseFloat(p.total_payout), 0).toLocaleString()}
          </p>
        </div>
        <div className="bg-white p-4 rounded-lg shadow">
          <p className="text-sm text-gray-600">Paid This Month</p>
          <p className="text-2xl font-bold">
            {payouts.filter(p => p.status === 'Paid').length}
          </p>
        </div>
      </div>

      {/* Payout Table */}
      <div className="bg-white rounded-lg shadow">
        {loading ? (
          <div className="p-8 text-center">Loading...</div>
        ) : (
          <table className="w-full">
            <thead className="bg-gray-50 border-b">
              <tr>
                <th className="px-6 py-3 text-left">Mitra</th>
                <th className="px-6 py-3 text-left">Month</th>
                <th className="px-6 py-3 text-right">Visits</th>
                <th className="px-6 py-3 text-right">Bonus</th>
                <th className="px-6 py-3 text-right">Total</th>
                <th className="px-6 py-3 text-left">Status</th>
              </tr>
            </thead>
            <tbody>
              {payouts.map((payout) => (
                <tr key={payout.id} className="border-b hover:bg-gray-50">
                  <td className="px-6 py-4">{payout.mitra_name}</td>
                  <td className="px-6 py-4">{payout.month}</td>
                  <td className="px-6 py-4 text-right">{payout.total_visits}</td>
                  <td className="px-6 py-4 text-right">
                    Rp {parseFloat(payout.bonus_amount).toLocaleString()}
                  </td>
                  <td className="px-6 py-4 text-right font-semibold">
                    Rp {parseFloat(payout.total_payout).toLocaleString()}
                  </td>
                  <td className="px-6 py-4">
                    <span className={`px-2 py-1 rounded text-sm ${
                      payout.status === 'Paid' ? 'bg-green-100 text-green-800' : 'bg-yellow-100 text-yellow-800'
                    }`}>
                      {payout.status}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}
```

---

## ✅ Checklist

- [ ] Import PayoutExportButton component
- [ ] Add button to payout page
- [ ] Test export functionality
- [ ] Verify CSV format
- [ ] Check all required fields present
- [ ] Confirm bonus amounts correct (Ani = 0)
- [ ] Test with different filters
- [ ] Deploy to staging

---

## 🐛 Troubleshooting

### **Button doesn't work**
- Check browser console for errors
- Verify API route exists: `/api/payouts/export`
- Check database connection

### **CSV file empty**
- Verify payouts exist for selected period
- Check status filter (should be "Paid")
- Confirm year/months are correct

### **Missing bank info**
- Check mitra_db has bank_account_number
- Some mitras may not have bank details yet
- Update mitra data if needed

### **Duplicate exports**
- Clear browser cache
- Check if button clicked multiple times
- Add loading state to prevent double-clicks

---

## 📞 Need Help?

Check:
1. `PAYOUT_EXPORT_FEATURE.md` - Full documentation
2. Browser console for errors
3. Network tab for API responses
4. Database for actual payout data

---

## 🎉 You're Done!

Export feature is ready to use. Just add the button and start exporting!
