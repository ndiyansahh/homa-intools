# InvoiceDB Schema Improvements

## 🎯 **Overview**
The `invoiceDB` schema has been completely redesigned with automatic invoice number generation, formatted according to the specification, and auto-populated fields from `customerDB`.

## 📊 **New Schema Fields**

### **Invoice Number Format: `INV/Cleaning/yyyy.mm.dd-00000`**

| Field | Description | Example | Source |
|-------|-------------|---------|--------|
| `invoiceNumber` | Auto-generated invoice number | `INV/Cleaning/2025.09.01-00450` | Generated from customerDB.subscriptionStart + random sequence |
| `invoiceNo` | 5-digit sequence number | `450` | Extracted from invoiceNumber |

### **Date Fields (from customerDB.subscriptionStart)**

| Field | Description | Example | Source |
|-------|-------------|---------|--------|
| `invoiceStartDate` | Reference date | `2025-09-01` | `customerDB.subscriptionStart` |
| `invoiceYears` | Year component | `2025` | Extracted from invoiceStartDate |
| `invoiceMonths` | Month component | `9` | Extracted from invoiceStartDate |
| `invoiceDays` | Day component | `1` | Extracted from invoiceStartDate |
| `invoiceSubscription` | Service type | `"Cleaning"` | Hardcoded (used in invoice number) |

### **Customer Information (Dynamic Auto-populated)**

| Field | Description | Source | Dynamic |
|-------|-------------|--------|---------|
| `invoiceCustomerName` | Customer name | `customerDB.customerName` | ✅ **DYNAMIC** - Real-time from database |
| `invoiceAddress` | Customer address | `customerDB.address` | ✅ **DYNAMIC** - Real-time from database |
| `invoicePhoneNumber` | Phone number | `customerDB.contact` | ✅ **DYNAMIC** - Real-time from database |

### **Invoice Line Items (Auto-populated)**

| Field | Description | Source |
|-------|-------------|--------|
| `invoiceQty` | Quantity | `customerDB.subscriptionQTY` |
| `invoicePricePerQty` | Price per quantity | `customerDB.subscriptionPerQTY` |

### **Promotional Fields**

| Field | Description | Default |
|-------|-------------|---------|
| `invoicePromoCode` | Promo code (free text) | `null` |
| `invoicePromoDiscount` | Discount amount | `Rp 0` |

## 🔧 **Utility Functions**

### **1. `generateInvoiceSequenceNumber()`**
```typescript
const sequenceNumber = generateInvoiceSequenceNumber();
// Returns: 45032 (random 5-digit number)
```

### **2. `createInvoice()`**
```typescript
const invoice = await createInvoice({
  customerId: 'customer-uuid',
  invoicePromoCode: 'WELCOME10',
  invoicePromoDiscount: 50000, // Rp 50,000
});
```

**Automatically populates:**
- ✅ Invoice number with correct format
- ✅ All customer information from `customerDB`
- ✅ Date components from subscription start
- ✅ Quantity and pricing from customer subscription
- ✅ Calculates subtotal and total amounts

### **3. `getInvoicesWithFullData()`**
```typescript
const invoices = await getInvoicesWithFullData({
  customerId: 'optional-filter',
  status: 'Pending',
  limit: 50
});
```

### **4. `updateInvoicePayment()`**
```typescript
await updateInvoicePayment(invoiceId, {
  status: 'Paid',
  paymentMethod: 'Bank Transfer',
  paidAt: new Date()
});
```

## 📋 **Dynamic Data Population Process**

### **Customer Data Flow (DYNAMIC)**
```
Invoice Creation Request → customerId: "abc-123"
     ↓
Database Query → SELECT customerName, address, contact FROM customerDB WHERE id = "abc-123"
     ↓
Real-time Results → customerName: "John Doe", address: "123 Main St", contact: "081234567890"
     ↓
Invoice Population:
  - invoiceCustomerName: "John Doe" (DYNAMIC from DB)
  - invoiceAddress: "123 Main St" (DYNAMIC from DB)  
  - invoicePhoneNumber: "081234567890" (DYNAMIC from DB)
```

### **Invoice Number Generation Process**
```
Customer Creation → customerDB.subscriptionStart = "2025-09-01"
     ↓
Generate Random Sequence → 00450
     ↓
Format Invoice Number → "INV/Cleaning/2025.09.01-00450"
     ↓
Extract Components:
  - invoiceNo: 450
  - invoiceYears: 2025
  - invoiceMonths: 9
  - invoiceDays: 1
```

## 🚀 **API Endpoints**

### **POST /api/invoice - Create Invoice**
```json
{
  "customerId": "customer-uuid",
  "invoicePromoCode": "NEWCUSTOMER20",
  "invoicePromoDiscount": 100000,
  "notes": "Welcome discount applied"
}
```

**Response:**
```json
{
  "success": true,
  "data": {
    "id": "invoice-uuid",
    "invoiceNumber": "INV/Cleaning/2025.09.01-00450",
    "invoiceNo": 450,
    "invoiceCustomerName": "John Doe",
    "totalAmount": "500000"
  }
}
```

### **GET /api/invoice - List Invoices**
**Query Parameters:**
- `customerId` - Filter by customer
- `status` - Filter by status (Pending, Paid, Overdue, Cancelled)
- `startDate` / `endDate` - Date range filters
- `q` - Search by invoice number, customer name, address, phone

### **PATCH /api/invoice - Update Payment Status**
```json
{
  "invoiceId": "invoice-uuid",
  "status": "Paid",
  "paymentMethod": "Bank Transfer",
  "paidAt": "2025-01-15T10:30:00Z"
}
```

## 🧪 **Testing**

### **Test Dynamic Data Population:**
```
POST /api/invoice/verify-dynamic
```

**Test dynamic customer name population:**
```json
{
  "customerId": "879d467b-990e-4cee-a158-53375891805a"
}
```

**Dynamic Verification Response:**
```json
{
  "success": true,
  "verification": {
    "database_customer_name": "John Doe",
    "invoice_customer_name": "John Doe", 
    "is_dynamic_data": true,
    "invoice_number": "INV/Cleaning/2025.09.01-12345"
  },
  "proof": {
    "source": "customerDB.customerName (dynamic)",
    "populated_in": "invoiceDB.invoiceCustomerName",
    "verification_status": "✅ DYNAMIC DATA CONFIRMED"
  }
}
```

### **Test Invoice Creation:**
```
POST /api/invoice/test-create
```

**Test with existing customer:**
```json
{
  "customerId": "879d467b-990e-4cee-a158-53375891805a",
  "invoicePromoCode": "WELCOME10",
  "invoicePromoDiscount": 50000
}
```

**Expected Response:**
```json
{
  "success": true,
  "data": {
    "invoiceNumber": "INV/Cleaning/2025.09.01-12345",
    "invoiceNo": 12345,
    "invoiceCustomerName": "Real Customer Name from DB",
    "totalAmount": "450000"
  }
}
```

## ✅ **Benefits**

1. **Formatted Invoice Numbers**: Consistent format `INV/Cleaning/yyyy.mm.dd-00000`
2. **Automatic Data Population**: All customer data auto-populated from database
3. **Date Component Extraction**: Year, month, day automatically extracted
4. **Random Sequence Generation**: 5-digit random numbers for uniqueness
5. **Promo Code Support**: Built-in promotional discount system
6. **Backward Compatibility**: Legacy invoice fields preserved
7. **Calculation Automation**: Subtotal and total amounts calculated automatically

## 🔗 **Related Schema Changes**

### **CustomerDB Enhancements:**
- ✅ `subscriptionQTY`: Quantity for invoicing
- ✅ `subscriptionPerQTY`: Price per quantity for invoicing

### **Example Customer Data:**
```json
{
  "customerName": "John Doe",
  "subscriptionStart": "2025-09-01",
  "subscriptionQTY": 2,
  "subscriptionPerQTY": 250000,
  "contact": "081234567890",
  "address": "Jl. Sudirman No. 123"
}
```

### **Generated Invoice:**
```json
{
  "invoiceNumber": "INV/Cleaning/2025.09.01-45032",
  "invoiceNo": 45032,
  "invoiceStartDate": "2025-09-01",
  "invoiceYears": 2025,
  "invoiceMonths": 9,
  "invoiceDays": 1,
  "invoiceCustomerName": "John Doe",
  "invoiceQty": 2,
  "invoicePricePerQty": "250000",
  "subtotal": "500000",
  "totalAmount": "500000"
}
```

## 📝 **Migration Notes**

- ✅ **Backward Compatible**: All existing invoice functionality preserved
- ✅ **Customer Schema Extended**: New subscription fields added
- ✅ **Auto-generation**: Invoice numbers generated automatically
- ✅ **Data Integrity**: Foreign key relationships maintained
- ✅ **Error Handling**: Comprehensive validation and error handling

## 🎯 **Usage Example**

1. **Create Customer** with subscription details:
```json
{
  "customerName": "Jane Smith",
  "subscriptionStart": "2025-01-15",
  "subscriptionQTY": 3,
  "subscriptionPerQTY": 300000
}
```

2. **Generate Invoice** automatically:
```json
{
  "customerId": "customer-uuid"
}
```

3. **Result**:
```
Invoice Number: INV/Cleaning/2025.01.15-67890
Total Amount: Rp 900,000 (3 × Rp 300,000)
```