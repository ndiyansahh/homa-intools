# Customer Management API Documentation

Complete REST API endpoints for customer management with PostgreSQL integration and TypeScript support.

## Base URL
```
http://localhost:3000/api/customers
```

## Authentication
All endpoints require authentication. Include session cookie or JWT token in requests.

## RBAC Permissions
- **View**: ADMIN, OWNER, STAFF
- **Create**: ADMIN, OWNER, STAFF  
- **Update**: ADMIN, OWNER, STAFF
- **Delete**: ADMIN, OWNER only

---

## 1. GET /api/customers
Get paginated list of customers with filtering support.

### Query Parameters
| Parameter | Type | Description | Example |
|-----------|------|-------------|---------|
| `page` | number | Page number (default: 1) | `?page=2` |
| `limit` | number | Items per page (default: 10, max: 100) | `?limit=20` |
| `q` / `search` | string | Search in name, address, contact | `?q=john` |
| `status` | string | Filter by status | `?status=active` |
| `acquisition` | string | Filter by acquisition (HOMA/Altrix) | `?acquisition=HOMA` |
| `churnTag` | string | Filter by churn tag (Internal/External/N/A) | `?churnTag=Internal` |
| `city` | string | Filter by city | `?city=Jakarta%20Selatan` |
| `residentialType` | string | Filter by type (House/Office Space/Apartment) | `?residentialType=House` |
| `subscriptionPackage` | string | Filter by package name | `?subscriptionPackage=Regular` |

### Request Example
```bash
curl -X GET "http://localhost:3000/api/customers?page=1&limit=20&status=active&city=Jakarta%20Selatan" \
  -H "Content-Type: application/json" \
  -b "session=your-session-cookie"
```

### Response
```json
{
  "success": true,
  "data": [
    {
      "id": "uuid-1",
      "no": 1,
      "customerName": "Handi Sulyansah",
      "acquisition": "HOMA",
      "qtyPackage": 1,
      "subscriptionPackage": "Monthly Subscription of Regular Cleaning (3 hours per visit; 2 visits per week)",
      "status": "Active",
      "churnTag": "N/A",
      "createdAt": "2022-11-25T10:00:00.000Z",
      "updatedAt": "2023-01-15T14:30:00.000Z"
    }
  ],
  "items": [...], // Same as data (for compatibility)
  "pagination": {
    "page": 1,
    "limit": 20,
    "total": 150,
    "totalPages": 8,
    "hasNext": true,
    "hasPrev": false
  },
  "page": 1,
  "total": 150,
  "totalPages": 8
}
```

---

## 2. GET /api/customers/[id]
Get detailed information for a specific customer.

### Parameters
| Parameter | Type | Description |
|-----------|------|-------------|
| `id` | string | Customer UUID |

### Request Example
```bash
curl -X GET "http://localhost:3000/api/customers/uuid-1" \
  -H "Content-Type: application/json" \
  -b "session=your-session-cookie"
```

### Response
```json
{
  "success": true,
  "data": {
    "id": "uuid-1",
    "no": 1,
    "customerName": "Handi Sulyansah",
    "acquisition": "HOMA",
    "contact": "62812916625948",
    "address": "1 Park Residences",
    "village": "Gandaria",
    "district": "Kebayoran Baru",
    "city": "Jakarta Selatan",
    "postalCode": "15148",
    "residentialType": "House",
    "subscriptionPackage": "Monthly Subscription of Regular Cleaning (3 hours per visit; 2 visits per week)",
    "qtyPackage": 1,
    "ltv": 4,
    "firstDateSubscription": "25/11/2022",
    "status": "Active",
    "cleaner1": "Ardi",
    "cleaner2": "Inem",
    "churnTag": "N/A",
    "churnReason": "",
    "createdAt": "2022-11-25T10:00:00.000Z",
    "updatedAt": "2023-01-15T14:30:00.000Z",
    "isDeleted": false
  }
}
```

### Error Responses
```json
// Customer not found
{
  "success": false,
  "message": "Customer not found"
}
```

---

## 3. POST /api/customers
Create a new customer.

### Request Body
```json
{
  "customerName": "John Doe",
  "acquisition": "HOMA",
  "contact": "6281234567890",
  "address": "Jl. Sudirman No. 123",
  "district": "Kebayoran Baru",
  "city": "Jakarta Selatan",
  "village": "Gandaria Utara", // optional
  "postalCode": "12140", // optional, auto-filled from village
  "residentialType": "House",
  "qtyPackage": 1,
  "subscriptionPackage": "Regular Cleaning - Standard",
  "ltv": 0, // optional, auto-calculated by database trigger
  "firstDateSubscription": "12/25/2024", // mm/dd/yyyy format
  "status": "Active", // optional, default: "Active"
  "cleaner1": "Handi", // optional
  "cleaner2": "Syeila", // optional
  "notes": "Special cleaning requirements" // optional
}
```

### Required Fields
- `customerName`
- `contact` 
- `city`
- `district`
- `subscriptionPackage`
- `firstDateSubscription`

### Request Example
```bash
curl -X POST "http://localhost:3000/api/customers" \
  -H "Content-Type: application/json" \
  -b "session=your-session-cookie" \
  -d '{
    "customerName": "John Doe",
    "acquisition": "HOMA",
    "contact": "6281234567890",
    "address": "Jl. Sudirman No. 123",
    "district": "Kebayoran Baru",
    "city": "Jakarta Selatan",
    "residentialType": "House",
    "qtyPackage": 1,
    "subscriptionPackage": "Regular Cleaning - Standard",
    "firstDateSubscription": "12/25/2024"
  }'
```

### Response
```json
{
  "success": true,
  "data": {
    "id": "new-uuid",
    "no": 5,
    "customerName": "John Doe",
    "status": "Active"
  },
  "message": "Customer created successfully"
}
```

### Error Responses
```json
// Validation error
{
  "success": false,
  "message": "Customer name is required"
}

// Database error (with fallback)
{
  "success": true,
  "data": {
    "id": "mock-1640123456789",
    "no": 5,
    "customerName": "John Doe",
    "status": "Active"
  },
  "message": "Customer created successfully (mock mode - database not connected)"
}
```

---

## 4. PATCH /api/customers/[id]
Update customer information (partial update).

### Parameters
| Parameter | Type | Description |
|-----------|------|-------------|
| `id` | string | Customer UUID |

### Request Body (all fields optional)
```json
{
  "customerName": "John Doe Updated",
  "contact": "6281234567890",
  "status": "Churn",
  "churnTag": "Internal",
  "churnReason": "Service quality issues",
  "cleaner1": "Handi",
  "cleaner2": "",
  "ltv": 15
}
```

### Request Example
```bash
curl -X PATCH "http://localhost:3000/api/customers/uuid-1" \
  -H "Content-Type: application/json" \
  -b "session=your-session-cookie" \
  -d '{
    "status": "Churn",
    "churnTag": "Internal",
    "churnReason": "Service quality issues"
  }'
```

### Response
```json
{
  "success": true,
  "data": {
    "id": "uuid-1",
    "customerName": "Handi Sulyansah",
    "status": "Churn",
    "updatedAt": "2024-01-15T14:30:00.000Z"
  },
  "message": "Customer updated successfully"
}
```

### Error Responses
```json
// No fields provided
{
  "success": false,
  "message": "At least one field is required for update"
}

// Customer not found
{
  "success": false,
  "message": "Customer not found"
}
```

---

## 5. DELETE /api/customers/[id]
Delete a customer (soft delete by default, hard delete optional).

### Parameters
| Parameter | Type | Description |
|-----------|------|-------------|
| `id` | string | Customer UUID |

### Query Parameters
| Parameter | Type | Description |
|-----------|------|-------------|
| `hard` | boolean | Hard delete (permanent) if true |

### Request Examples
```bash
# Soft delete (default)
curl -X DELETE "http://localhost:3000/api/customers/uuid-1" \
  -H "Content-Type: application/json" \
  -b "session=your-session-cookie"

# Hard delete (permanent)
curl -X DELETE "http://localhost:3000/api/customers/uuid-1?hard=true" \
  -H "Content-Type: application/json" \
  -b "session=your-session-cookie"
```

### Response
```json
{
  "success": true,
  "message": "Customer moved to trash successfully"
}

// Hard delete response
{
  "success": true,
  "message": "Customer permanently deleted successfully"
}
```

### Error Responses
```json
// Customer not found
{
  "success": false,
  "message": "Customer not found"
}

// Already deleted
{
  "success": false,
  "message": "Customer is already deleted"
}

// Permission denied (STAFF trying to delete)
{
  "success": false,
  "message": "Forbidden - Only admins can delete customers"
}
```

---

## Database Integration Features

### Auto-calculated Fields
- **LTV**: Auto-calculated via database trigger when subscription package changes
- **Sequence Number**: Auto-incremented `no` field for customer numbering
- **Timestamps**: Auto-updated `createdAt` and `updatedAt` timestamps

### Soft Delete Support
- Deleted customers are marked with `isDeleted: true` 
- Soft-deleted customers are excluded from normal queries
- Hard delete permanently removes from database (admin only)

### Regional Data Integration
- **City/District/Village cascade**: Integrated with regions API
- **Postal Code auto-fill**: From village selection in form
- **Region validation**: Ensures data consistency

### Audit Logging
All operations are logged with:
- User ID and email
- Action type (created/updated/deleted)
- Customer details
- Changed fields (for updates)
- Timestamp

### Mock Data Fallback
When database is not connected, APIs return mock data to ensure:
- Development continuity
- UI testing capability
- Graceful degradation

## Error Handling
- **400**: Bad Request (validation errors)
- **401**: Unauthorized (not logged in)
- **403**: Forbidden (insufficient permissions)  
- **404**: Not Found (customer doesn't exist)
- **500**: Internal Server Error (database/system errors)

All error responses follow consistent format:
```json
{
  "success": false,
  "message": "Human readable error message",
  "error": "Technical error details (development only)"
}
```

## Rate Limiting & Performance
- **Pagination**: Maximum 100 items per page
- **Database Indexes**: On frequently queried fields (city, status, acquisition)
- **Connection Pooling**: Configured for optimal performance
- **Query Optimization**: Uses Drizzle ORM with optimized queries

## Next Steps
1. Implement database triggers for LTV calculation
2. Add customer export functionality (CSV/Excel)
3. Customer import from trial conversions
4. Customer analytics and reporting endpoints
5. Customer activity timeline API