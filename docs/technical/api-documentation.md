# HOMA API Documentation

**Version:** 1.1  
**Base URL:** `https://homa-intools.vercel.app/api` (Production)  
**Base URL:** `http://localhost:3000/api` (Development)  
**Last Updated:** January 31, 2026

---

## Table of Contents

1. [Overview](#overview)
2. [Authentication](#authentication)
3. [Customers API](#customers-api)
4. [Trials API](#trials-api)
5. [Visits API](#visits-api)
6. [Attendance API](#attendance-api)
7. [Payouts API](#payouts-api)
8. [Mitras API](#mitras-api)
9. [Settings API](#settings-api)
10. [Reports API](#reports-api)
11. [Error Handling](#error-handling)
12. [Rate Limiting](#rate-limiting)

---

## Overview

### API Architecture

**Framework:** Next.js 14 App Router API Routes  
**Authentication:** JWT (HTTP-only cookies)  
**Response Format:** JSON  
**Timezone:** Asia/Jakarta (WIB)

### General Response Format

**Success:**
```json
{
  "success": true,
  "data": { ... },
  "message": "Optional success message"
}
```

**Error:**
```json
{
  "success": false,
  "error": "Error message",
  "code": "ERROR_CODE",
  "details": { ... }
}
```

---

### Common Headers

**Request Headers:**
```
Content-Type: application/json
Cookie: session=<jwt_token>
```

**Response Headers:**
```
Content-Type: application/json
X-RateLimit-Limit: 100
X-RateLimit-Remaining: 95
X-RateLimit-Reset: 1640995200
```

---

## Authentication

> **Reference:** [ADR 0002 - JWT Authentication](../adrs/0002-jwt-authentication.md)

### POST /api/auth/login

**Description:** Authenticate user and create session

**Authentication:** None (public endpoint)

**Request Body:**
```json
{
  "email": "admin@homa.com",
  "password": "admin123"
}
```

**Success Response (200):**
```json
{
  "userId": "uuid-string",
  "role": "ADMIN",
  "mustChangePassword": false
}
```

**Error Responses:**

**401 - Invalid Credentials:**
```json
{
  "error": "INVALID_CREDENTIALS"
}
```

**423 - Account Locked (ADR 0002):**
```json
{
  "error": "ACCOUNT_LOCKED",
  "lockedUntil": "2026-01-31T10:30:00.000Z"
}
```

**429 - Rate Limited:**
```json
{
  "error": "RATE_LIMITED"
}
```

**Example:**
```bash
curl -X POST http://localhost:3000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email": "admin@homa.com", "password": "admin123"}'
```

**Notes:**
- Sets HTTP-only cookie named `session`
- Cookie expires in 24 hours
- Rate limit: 5 attempts per 15 minutes per IP
- Account locks for 15 minutes after 5 failed attempts (ADR 0002)
- Returns `mustChangePassword: true` if user must change password on first login

---

### POST /api/auth/logout

**Description:** End user session

**Authentication:** Required

**Request Body:** None

**Success Response (200):**
```json
{
  "success": true,
  "message": "Logged out successfully"
}
```

**Notes:**
- Clears session cookie
- Client should redirect to login page

---

### POST /api/auth/change-password

**Description:** Change user password (ADR 0002)

**Authentication:** Required

**Request Body:**
```json
{
  "currentPassword": "temporary123",
  "newPassword": "MySecure@Pass2026"
}
```

**Success Response (200):**
```json
{
  "success": true,
  "message": "Password changed successfully"
}
```

**Error Response (400):**
```json
{
  "success": false,
  "message": "Password must be at least 8 characters"
}
```

**Validation Rules:**
- Minimum 8 characters
- Must contain uppercase, lowercase, and number
- Cannot be same as current password

**Notes:**
- Required for users with `mustChangePassword: true`
- Updates session to set `mustChangePassword: false`

---

### POST /api/auth/users

**Description:** Create new user (Admin provisioning - ADR 0002)

**Authentication:** Required (ADMIN only)

**Request Body:**
```json
{
  "email": "newstaff@homa.id",
  "password": "TempPass123",
  "role": "STAFF"
}
```

**Success Response (201):**
```json
{
  "success": true,
  "user": {
    "id": "uuid-string",
    "email": "newstaff@homa.id",
    "role": "STAFF",
    "mustChangePassword": true
  }
}
```

**Error Responses:**

**403 - Forbidden:**
```json
{
  "success": false,
  "message": "Forbidden - Admin only"
}
```

**400 - Validation Error:**
```json
{
  "success": false,
  "message": "Email, password, and role are required"
}
```

**Notes:**
- Only ADMIN role can create users
- New users automatically have `mustChangePassword: true`
- Valid roles: `ADMIN`, `OWNER`, `STAFF`

---

## Customers API

### GET /api/customers

**Description:** Get list of customers with filtering

**Authentication:** Required (ALL roles)

**Query Parameters:**
| Parameter | Type | Required | Default | Description |
|-----------|------|----------|---------|-------------|
| type | string | No | all | Filter by type: `trial`, `subscription`, `all` |
| status | string | No | all | Filter by status: `active`, `paused`, `expired`, `cancelled` |
| package | string | No | all | Filter by package: `basic`, `regular`, `frequent` |
| mitra_id | number | No | - | Filter by assigned mitra |
| search | string | No | - | Search by name or phone |
| page | number | No | 1 | Page number |
| per_page | number | No | 20 | Items per page (max 100) |

**Success Response (200):**
```json
{
  "success": true,
  "data": {
    "customers": [
      {
        "id": 1,
        "name": "John Doe",
        "email": "john@example.com",
        "phone": "08123456789",
        "address": "Jakarta Selatan",
        "type": "subscription",
        "subscription_status": "active",
        "subscription_package": "regular",
        "subscription_start_date": "2026-01-01",
        "assigned_mitra": {
          "id": 5,
          "name": "Ani Yulianti"
        },
        "next_billing_date": "2026-02-01",
        "created_at": "2025-12-15T10:00:00+07:00"
      }
    ],
    "pagination": {
      "total": 150,
      "page": 1,
      "per_page": 20,
      "total_pages": 8
    }
  }
}
```

**Example:**
```bash
# Get all active subscription customers
curl "https://homa-intools.vercel.app/api/customers?type=subscription&status=active" \
  -H "Cookie: session=<jwt_token>"

# Search by phone
curl "https://homa-intools.vercel.app/api/customers?search=0812" \
  -H "Cookie: session=<jwt_token>"
```

---

### GET /api/customers/[id]

**Description:** Get customer details

**Authentication:** Required (ALL roles)

**Path Parameters:**
| Parameter | Type | Description |
|-----------|------|-------------|
| id | number | Customer ID |

**Success Response (200):**
```json
{
  "success": true,
  "data": {
    "customer": {
      "id": 123,
      "name": "Jane Smith",
      "phone": "08198765432",
      "email": "jane@example.com",
      "address": "Jakarta Utara",
      "type": "subscription",
      "subscription": {
        "status": "active",
        "package": "regular",
        "frequency": 2,
        "price": 1200000,
        "start_date": "2026-01-01",
        "next_billing_date": "2026-02-01"
      },
      "assigned_mitra": {
        "id": 5,
        "name": "Ani Yulianti",
        "phone": "08155555555"
      },
      "scheduled_visits": [
        {
          "id": 456,
          "scheduled_date": "2026-01-29",
          "scheduled_time": "09:00",
          "status": "scheduled"
        }
      ],
      "total_visits": 24,
      "completed_visits": 22,
      "notes": [
        {
          "id": 10,
          "note": "Customer prefers morning visits",
          "created_by": "Admin",
          "created_at": "2026-01-15T10:00:00+07:00"
        }
      ]
    }
  }
}
```

**Error Response (404):**
```json
{
  "success": false,
  "error": "Customer not found",
  "code": "NOT_FOUND"
}
```

---

### POST /api/customers

**Description:** Create new customer

**Authentication:** Required (ADMIN, OWNER)

**Request Body (Trial):**
```json
{
  "name": "John Doe",
  "phone": "08123456789",
  "email": "john@example.com",
  "address": "Jakarta Selatan",
  "type": "trial",
  "trial_start_date": "2026-02-01",
  "trial_notes": "Referral from friend"
}
```

**Request Body (Subscription):**
```json
{
  "name": "Jane Smith",
  "phone": "08198765432",
  "email": "jane@example.com",
  "address": "Jakarta Utara",
  "type": "subscription",
  "subscription_package": "regular",
  "subscription_start_date": "2026-02-01",
  "assigned_mitra_id": 5,
  "schedule": {
    "days": ["monday", "thursday"],
    "time": "09:00"
  }
}
```

**Success Response (201):**
```json
{
  "success": true,
  "data": {
    "customer_id": 124,
    "type": "subscription",
    "message": "Customer created successfully"
  }
}
```

**Error Response (400):**
```json
{
  "success": false,
  "error": "Validation failed",
  "code": "VALIDATION_ERROR",
  "details": {
    "phone": "Invalid phone format. Must be 08XXXXXXXXXX"
  }
}
```

**Validation Rules:**
- Name: Required, 2-255 characters
- Phone: Required, format `08[0-9]{8,11}`
- Email: Optional, valid email format
- Address: Required, min 10 characters
- Type: Required, `trial` or `subscription`

---

### PUT /api/customers/[id]

**Description:** Update customer details

**Authentication:** Required (ADMIN, OWNER)

**Path Parameters:**
| Parameter | Type | Description |
|-----------|------|-------------|
| id | number | Customer ID |

**Request Body:**
```json
{
  "name": "Jane Smith Updated",
  "phone": "08198765432",
  "email": "jane.new@example.com",
  "address": "New Address Jakarta",
  "assigned_mitra_id": 6
}
```

**Success Response (200):**
```json
{
  "success": true,
  "data": {
    "customer_id": 123,
    "updated_fields": ["name", "assigned_mitra_id"]
  }
}
```

**Notes:**
- Only provided fields are updated
- Cannot change subscription package (use separate endpoint)

---

### POST /api/customers/[id]/convert

**Description:** Convert trial customer to subscription

**Authentication:** Required (ADMIN, OWNER)

**Path Parameters:**
| Parameter | Type | Description |
|-----------|------|-------------|
| id | number | Customer ID (must be trial) |

**Request Body:**
```json
{
  "subscription_package": "regular",
  "subscription_start_date": "2026-02-01",
  "assigned_mitra_id": 5,
  "schedule": {
    "days": ["monday", "thursday"],
    "time": "09:00"
  }
}
```

**Success Response (200):**
```json
{
  "success": true,
  "data": {
    "customer_id": 123,
    "subscription_id": 789,
    "message": "Customer converted successfully",
    "next_steps": [
      "Schedule visits created",
      "First invoice generated",
      "Mitra assigned"
    ]
  }
}
```

**Error Response (400):**
```json
{
  "success": false,
  "error": "Customer is not a trial customer",
  "code": "INVALID_OPERATION"
}
```

---

### POST /api/customers/[id]/subscription/pause

**Description:** Pause customer subscription

**Authentication:** Required (ADMIN, OWNER)

**Request Body:**
```json
{
  "reason": "Customer traveling for 2 months",
  "resume_date": "2026-04-01"
}
```

**Success Response (200):**
```json
{
  "success": true,
  "data": {
    "subscription_id": 789,
    "paused_at": "2026-01-29T14:30:00+07:00",
    "resume_date": "2026-04-01",
    "scheduled_visits_cancelled": 8
  }
}
```

---

### POST /api/customers/[id]/subscription/resume

**Description:** Resume paused subscription

**Authentication:** Required (ADMIN, OWNER)

**Request Body:** None

**Success Response (200):**
```json
{
  "success": true,
  "data": {
    "subscription_id": 789,
    "resumed_at": "2026-02-01T09:00:00+07:00",
    "scheduled_visits_recreated": 8
  }
}
```

---

### POST /api/customers/[id]/notes

**Description:** Add note to customer

**Authentication:** Required (ALL roles)

**Request Body:**
```json
{
  "note": "Customer prefers no pets in cleaning area"
}
```

**Success Response (201):**
```json
{
  "success": true,
  "data": {
    "note_id": 20,
    "created_at": "2026-01-29T16:00:00+07:00"
  }
}
```

---

## Trials API

### POST /api/trials/create

**Description:** Create trial customer with single trial date (Sprint 5)

**Authentication:** Required (ADMIN, OWNER)

**Request Body (Sprint 5 - New):**
```json
{
  "customer": {
    "name": "John Doe",
    "phone": "08123456789",
    "address": "Jakarta Selatan"
  },
  "trial_date": "2026-02-01",
  "trial_time": "09:00"
}
```

**Request Body (Sprint 4 - Old):**
```json
{
  "customer": {
    "name": "John Doe",
    "phone": "08123456789",
    "address": "Jakarta"
  },
  "trial_type": "monthly",
  "start_date": "2026-02-01"
}
```

**Success Response (201):**
```json
{
  "success": true,
  "data": {
    "customer_id": 125,
    "trial_date_id": 456,
    "scheduled_date": "2026-02-01",
    "scheduled_time": "09:00"
  }
}
```

---

### POST /api/trials/[id]/add-date

**Description:** Add additional trial date (Sprint 5 - New)

**Authentication:** Required (ADMIN, OWNER)

**Path Parameters:**
| Parameter | Type | Description |
|-----------|------|-------------|
| id | number | Trial customer ID |

**Request Body:**
```json
{
  "trial_date": "2026-02-08",
  "trial_time": "09:00",
  "mitra_id": 5
}
```

**Success Response (201):**
```json
{
  "success": true,
  "data": {
    "trial_date_id": 457,
    "trial_customer_id": 125,
    "scheduled_date": "2026-02-08",
    "scheduled_time": "09:00"
  }
}
```

**Error Response (400):**
```json
{
  "success": false,
  "error": "Customer is not a trial customer",
  "code": "INVALID_OPERATION"
}
```

---

### GET /api/trials

**Description:** Get all trial customers

**Authentication:** Required (ADMIN, OWNER)

**Query Parameters:**
| Parameter | Type | Required | Default | Description |
|-----------|------|----------|---------|-------------|
| status | string | No | all | Filter: `active`, `expired`, `converted` |
| page | number | No | 1 | Page number |
| per_page | number | No | 20 | Items per page |

**Success Response (200):**
```json
{
  "success": true,
  "data": {
    "trials": [
      {
        "id": 125,
        "name": "John Doe",
        "phone": "08123456789",
        "status": "active",
        "trial_dates": [
          {
            "id": 456,
            "scheduled_date": "2026-02-01",
            "scheduled_time": "09:00",
            "attended": false,
            "assigned_mitra": {
              "id": 5,
              "name": "Ani Yulianti"
            }
          }
        ],
        "created_at": "2026-01-29T10:00:00+07:00"
      }
    ],
    "pagination": {
      "total": 25,
      "page": 1,
      "per_page": 20
    }
  }
}
```

---

## Visits API

### GET /api/visits

**Description:** Get scheduled visits

**Authentication:** Required (ALL roles)

**Query Parameters:**
| Parameter | Type | Required | Default | Description |
|-----------|------|----------|---------|-------------|
| customer_id | number | No | - | Filter by customer |
| mitra_id | number | No | - | Filter by mitra |
| start_date | string | No | - | Filter from date (YYYY-MM-DD) |
| end_date | string | No | - | Filter to date (YYYY-MM-DD) |
| status | string | No | all | Filter: `scheduled`, `completed`, `missed`, `cancelled` |
| page | number | No | 1 | Page number |
| per_page | number | No | 20 | Items per page |

**Success Response (200):**
```json
{
  "success": true,
  "data": {
    "visits": [
      {
        "id": 456,
        "customer": {
          "id": 123,
          "name": "John Doe",
          "address": "Jakarta Selatan"
        },
        "mitra": {
          "id": 5,
          "name": "Ani Yulianti"
        },
        "scheduled_date": "2026-02-05",
        "scheduled_time": "09:00",
        "duration_minutes": 180,
        "status": "scheduled",
        "notes": "First visit",
        "created_at": "2026-01-29T10:00:00+07:00"
      }
    ],
    "pagination": {
      "total": 100,
      "page": 1,
      "per_page": 20
    }
  }
}
```

**Example:**
```bash
# Get visits for specific mitra in date range
curl "https://homa-intools.vercel.app/api/visits?mitra_id=5&start_date=2026-02-01&end_date=2026-02-28" \
  -H "Cookie: session=<jwt_token>"
```

---

### GET /api/visits/[id]

**Description:** Get visit details

**Authentication:** Required (ALL roles)

**Success Response (200):**
```json
{
  "success": true,
  "data": {
    "visit": {
      "id": 456,
      "customer": {
        "id": 123,
        "name": "John Doe",
        "phone": "08123456789",
        "address": "Jakarta Selatan"
      },
      "mitra": {
        "id": 5,
        "name": "Ani Yulianti",
        "phone": "08155555555"
      },
      "scheduled_date": "2026-02-05",
      "scheduled_time": "09:00",
      "scheduled_day": "monday",
      "duration_minutes": 180,
      "status": "completed",
      "completed_at": "2026-02-05T12:00:00+07:00",
      "attendance_record": {
        "clock_in_time": "2026-02-05T09:05:00+07:00",
        "clock_out_time": "2026-02-05T12:00:00+07:00",
        "duration_hours": 2.92
      },
      "notes": "All tasks completed",
      "edit_history": [
        {
          "edited_at": "2026-02-06T10:00:00+07:00",
          "edited_by": "Admin",
          "field_changed": "status",
          "old_value": "scheduled",
          "new_value": "completed",
          "reason": "Manual completion"
        }
      ]
    }
  }
}
```

---

### POST /api/visits/schedule

**Description:** Schedule new visit(s)

**Authentication:** Required (ADMIN, OWNER)

**Request Body (Single Visit):**
```json
{
  "customer_id": 123,
  "mitra_id": 5,
  "scheduled_date": "2026-02-05",
  "scheduled_time": "09:00",
  "duration_minutes": 180,
  "notes": "First visit"
}
```

**Request Body (Recurring):**
```json
{
  "customer_id": 123,
  "mitra_id": 5,
  "recurring": true,
  "schedule": {
    "days": ["monday", "thursday"],
    "time": "09:00",
    "duration_minutes": 180
  },
  "start_date": "2026-02-05",
  "end_date": null
}
```

**Success Response (201):**
```json
{
  "success": true,
  "data": {
    "visits_created": 8,
    "visit_ids": [456, 457, 458, 459, 460, 461, 462, 463],
    "message": "Visits scheduled successfully"
  }
}
```

---

### PUT /api/visits/[id]/edit

**Description:** Edit visit (including historical - Sprint 4)

**Authentication:** Required (ADMIN, OWNER)

**Request Body:**
```json
{
  "scheduled_date": "2026-02-06",
  "scheduled_time": "10:00",
  "status": "missed",
  "mitra_id": 6,
  "notes": "Updated notes",
  "reason": "Customer rescheduled"
}
```

**Success Response (200):**
```json
{
  "success": true,
  "data": {
    "visit_id": 456,
    "updated_fields": ["scheduled_date", "status"],
    "payout_adjustment_triggered": true,
    "adjustment": {
      "mitra_id": 5,
      "period": "2026-02",
      "amount": -100000,
      "reason": "Visit 456 marked as missed after payout calculated"
    }
  }
}
```

**Notes:**
- No period lock (can edit ANY visit anytime)
- If payout already calculated → adjustment created automatically
- All edits logged in `visit_edit_history`

---

### POST /api/visits/[id]/mark-attended

**Description:** Mark visit as attended (Sprint 4)

**Authentication:** Required (ADMIN, OWNER)

**Request Body:**
```json
{
  "attended": true,
  "notes": "Completed all tasks"
}
```

**Success Response (200):**
```json
{
  "success": true,
  "data": {
    "visit_id": 456,
    "status": "completed",
    "attendance_record_created": true
  }
}
```

---

### POST /api/visits/bulk/mark-attended

**Description:** Bulk mark visits as attended (Sprint 5)

**Authentication:** Required (ADMIN, OWNER)

**Request Body:**
```json
{
  "visit_ids": [456, 457, 458],
  "attended": true,
  "notes": "Bulk completion"
}
```

**Success Response (200):**
```json
{
  "success": true,
  "data": {
    "updated_count": 3,
    "failed_count": 0,
    "visit_ids": [456, 457, 458],
    "attendance_records_created": 3
  }
}
```

**Partial Success (207):**
```json
{
  "success": true,
  "data": {
    "updated_count": 2,
    "failed_count": 1,
    "succeeded": [456, 457],
    "failed": [
      {
        "visit_id": 458,
        "error": "Visit already completed"
      }
    ]
  }
}
```

---

### POST /api/visits/[id]/cancel

**Description:** Cancel visit

**Authentication:** Required (ADMIN, OWNER)

**Request Body:**
```json
{
  "reason": "Customer cancelled"
}
```

**Success Response (200):**
```json
{
  "success": true,
  "data": {
    "visit_id": 456,
    "status": "cancelled",
    "cancelled_at": "2026-01-29T15:00:00+07:00"
  }
}
```

---

### POST /api/visits/[id]/reschedule

**Description:** Reschedule visit

**Authentication:** Required (ADMIN, OWNER)

**Request Body:**
```json
{
  "new_date": "2026-02-10",
  "new_time": "14:00",
  "reason": "Customer request"
}
```

**Success Response (200):**
```json
{
  "success": true,
  "data": {
    "old_visit_id": 456,
    "new_visit_id": 789,
    "new_scheduled_date": "2026-02-10",
    "new_scheduled_time": "14:00"
  }
}
```

**Notes:**
- Original visit marked as "rescheduled"
- New visit created
- Link maintained between old/new

---

## Attendance API

### POST /api/attendance/clock-in

**Description:** Clock in for visit

**Authentication:** Required (STAFF, ADMIN, OWNER)

**Request Body:**
```json
{
  "mitra_id": 5,
  "scheduled_visit_id": 123,
  "location": {
    "lat": -6.2088,
    "lng": 106.8456
  },
  "photo": "base64_string_or_url"
}
```

**Success Response (201):**
```json
{
  "success": true,
  "data": {
    "attendance_id": 456,
    "clock_in_time": "2026-01-29T09:05:23+07:00",
    "message": "Clock in successful"
  }
}
```

**Error Response (400):**
```json
{
  "success": false,
  "error": "Already clocked in. Please clock out first.",
  "code": "DUPLICATE_CLOCK_IN"
}
```

**Validation:**
- Must not have active clock-in
- Timezone: Asia/Jakarta enforced
- Location optional
- Photo optional

---

### POST /api/attendance/clock-out

**Description:** Clock out from visit

**Authentication:** Required (STAFF, ADMIN, OWNER)

**Request Body:**
```json
{
  "attendance_id": 456,
  "location": {
    "lat": -6.2088,
    "lng": 106.8456
  },
  "photo": "base64_string_or_url",
  "notes": "Completed all tasks"
}
```

**Success Response (200):**
```json
{
  "success": true,
  "data": {
    "attendance_id": 456,
    "clock_out_time": "2026-01-29T12:30:45+07:00",
    "duration_hours": 3.42,
    "message": "Clock out successful"
  }
}
```

---

### GET /api/attendance/history

**Description:** Get attendance history

**Authentication:** Required (STAFF - own only, ADMIN/OWNER - all)

**Query Parameters:**
| Parameter | Type | Required | Default | Description |
|-----------|------|----------|---------|-------------|
| mitra_id | number | No | - | Filter by mitra (ADMIN/OWNER only) |
| start_date | string | No | - | YYYY-MM-DD |
| end_date | string | No | - | YYYY-MM-DD |
| customer_id | number | No | - | Filter by customer |
| status | string | No | all | Filter: `clocked_in`, `clocked_out`, `absent` |
| page | number | No | 1 | Page number |
| per_page | number | No | 20 | Items per page |

**Success Response (200):**
```json
{
  "success": true,
  "data": {
    "attendance_records": [
      {
        "id": 456,
        "mitra": {
          "id": 5,
          "name": "Ani Yulianti"
        },
        "customer": {
          "id": 10,
          "name": "Customer A"
        },
        "clock_in_time": "2026-01-29T09:05:23+07:00",
        "clock_out_time": "2026-01-29T12:30:45+07:00",
        "duration_hours": 3.42,
        "status": "clocked_out",
        "has_photos": true,
        "notes": "Completed all tasks"
      }
    ],
    "pagination": {
      "total": 150,
      "page": 1,
      "per_page": 20
    }
  }
}
```

---

### GET /api/attendance/reports/monthly

**Description:** Generate monthly attendance report

**Authentication:** Required (ADMIN, OWNER)

**Query Parameters:**
| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| month | string | Yes | YYYY-MM format |
| mitra_id | number | No | Filter by specific mitra |

**Success Response (200):**
```json
{
  "success": true,
  "data": {
    "month": "2026-01",
    "mitra_reports": [
      {
        "mitra_id": 5,
        "mitra_name": "Ani Yulianti",
        "total_scheduled": 20,
        "total_attended": 18,
        "total_absent": 2,
        "attendance_rate": 90.0,
        "total_hours": 72.5,
        "late_count": 1,
        "details": [
          {
            "date": "2026-01-29",
            "scheduled_time": "09:00",
            "actual_clock_in": "09:05",
            "status": "on_time",
            "customer": "Customer A"
          }
        ]
      }
    ]
  }
}
```

**Example:**
```bash
curl "https://homa-intools.vercel.app/api/attendance/reports/monthly?month=2026-01" \
  -H "Cookie: session=<jwt_token>"
```

---

### PUT /api/attendance/[id]/edit

**Description:** Edit attendance record (ADMIN only)

**Authentication:** Required (ADMIN, OWNER)

**Request Body:**
```json
{
  "clock_in_time": "2026-01-29T09:00:00+07:00",
  "clock_out_time": "2026-01-29T12:00:00+07:00",
  "status": "clocked_out",
  "notes": "Corrected time",
  "reason": "Time entry error"
}
```

**Success Response (200):**
```json
{
  "success": true,
  "data": {
    "attendance_id": 456,
    "updated_fields": ["clock_in_time", "notes"],
    "adjustment_triggered": true,
    "adjustment_amount": -50000
  }
}
```

---

### POST /api/attendance/export

**Description:** Export attendance to CSV/Excel

**Authentication:** Required (ADMIN, OWNER)

**Request Body:**
```json
{
  "start_date": "2026-01-01",
  "end_date": "2026-01-31",
  "mitra_id": 5,
  "format": "csv"
}
```

**Success Response (200):**
- Content-Type: text/csv or application/vnd.ms-excel
- File download

**CSV Columns:**
```
Date, Mitra Name, Customer Name, Clock In, Clock Out, Duration (hours), Status, Notes
```

---

## Payouts API

### GET /api/payouts

**Description:** Get payouts list

**Authentication:** Required (ADMIN, OWNER)

**Query Parameters:**
| Parameter | Type | Required | Default | Description |
|-----------|------|----------|---------|-------------|
| period | string | No | - | YYYY-MM format |
| mitra_id | number | No | - | Filter by mitra |
| status | string | No | all | Filter: `draft`, `approved`, `paid` |
| page | number | No | 1 | Page number |
| per_page | number | No | 20 | Items per page |

**Success Response (200):**
```json
{
  "success": true,
  "data": {
    "payouts": [
      {
        "id": 1,
        "mitra_id": 5,
        "mitra_name": "Ani Yulianti",
        "period_month": "2026-01",
        "base_rate": 900000,
        "scheduled_visits": 9,
        "actual_visits": 8,
        "calculated_amount": 800000,
        "bonus": 0,
        "deductions": 0,
        "adjustment": 0,
        "final_amount": 800000,
        "status": "approved"
      }
    ],
    "pagination": {
      "total": 50,
      "page": 1,
      "per_page": 20
    }
  }
}
```

---

### POST /api/payouts/calculate

**Description:** Calculate payout for mitra and period

**Authentication:** Required (ADMIN, OWNER)

**Request Body:**
```json
{
  "mitra_id": 5,
  "period_month": "2026-01"
}
```

**Success Response (200):**
```json
{
  "success": true,
  "data": {
    "mitra_id": 5,
    "period_month": "2026-01",
    "base_rate": 900000,
    "scheduled_visits": 9,
    "actual_visits": 8,
    "calculated_amount": 800000,
    "adjustments": [],
    "final_amount": 800000
  }
}
```

**Notes:**
- Uses pro-rate formula: `(actual/scheduled) × base_rate`
- Includes any adjustments from previous periods
- Does not save (use POST /api/payouts/generate)

---

### POST /api/payouts/generate

**Description:** Generate payouts for all mitras in month

**Authentication:** Required (ADMIN, OWNER)

**Request Body:**
```json
{
  "period_month": "2026-01"
}
```

**Success Response (201):**
```json
{
  "success": true,
  "data": {
    "period_month": "2026-01",
    "payouts_generated": 10,
    "total_amount": 8500000,
    "payout_ids": [1, 2, 3, 4, 5, 6, 7, 8, 9, 10]
  }
}
```

**Error Response (400):**
```json
{
  "success": false,
  "error": "Payouts already generated for this period",
  "code": "DUPLICATE_GENERATION"
}
```

---

### GET /api/payouts/[id]

**Description:** Get payout details (slip)

**Authentication:** Required (ADMIN, OWNER, STAFF - own only)

**Success Response (200):**
```json
{
  "success": true,
  "data": {
    "payout": {
      "id": 1,
      "mitra": {
        "id": 5,
        "name": "Ani Yulianti",
        "email": "ani@example.com"
      },
      "period_month": "2026-01",
      "breakdown": {
        "base_rate": 900000,
        "scheduled_visits": 9,
        "actual_visits": 8,
        "calculated_amount": 800000,
        "bonus": 0,
        "deductions": 0,
        "adjustment": 0
      },
      "final_amount": 800000,
      "adjustments": [],
      "status": "approved",
      "visits": [
        {
          "date": "2026-01-08",
          "attended": true,
          "customer_name": "Customer A"
        }
      ]
    }
  }
}
```

---

### POST /api/payouts/[id]/approve

**Description:** Approve payout

**Authentication:** Required (ADMIN, OWNER)

**Request Body:** None

**Success Response (200):**
```json
{
  "success": true,
  "data": {
    "payout_id": 1,
    "status": "approved",
    "approved_by": 1,
    "approved_at": "2026-02-01T10:00:00+07:00"
  }
}
```

---

### POST /api/payouts/[id]/mark-paid

**Description:** Mark payout as paid

**Authentication:** Required (ADMIN, OWNER)

**Request Body:**
```json
{
  "paid_at": "2026-02-05T10:00:00+07:00",
  "payment_method": "Bank Transfer",
  "payment_reference": "TRF123456"
}
```

**Success Response (200):**
```json
{
  "success": true,
  "data": {
    "payout_id": 1,
    "status": "paid",
    "paid_at": "2026-02-05T10:00:00+07:00"
  }
}
```

---

### POST /api/payouts/export

**Description:** Export payouts to CSV/Excel

**Authentication:** Required (ADMIN, OWNER)

**Request Body:**
```json
{
  "period_month": "2026-01",
  "format": "csv"
}
```

**Success Response (200):**
- Content-Type: text/csv
- File download: `payouts-2026-01.csv`

**CSV Columns:**
```
Mitra Name, Period, Base Rate, Scheduled, Attended, Calculated, Adjustments, Final, Status
```

---

### GET /api/payouts/[id]/pdf

**Description:** Download payout slip as PDF (Sprint 5)

**Authentication:** Required (ADMIN, OWNER, STAFF - own only)

**Success Response (200):**
- Content-Type: application/pdf
- File download: `payout-slip-jan-2026-ani-yulianti.pdf`

**Error Response (503):**
```json
{
  "success": false,
  "error": "PDF template not configured yet",
  "code": "SERVICE_UNAVAILABLE"
}
```

**Status:** 🔄 In Progress (blocked by client template)

---

## Mitras API

### GET /api/mitras

**Description:** Get all mitras

**Authentication:** Required (ADMIN, OWNER)

**Query Parameters:**
| Parameter | Type | Required | Default | Description |
|-----------|------|----------|---------|-------------|
| status | string | No | active | Filter: `active`, `inactive`, `all` |
| page | number | No | 1 | Page number |
| per_page | number | No | 20 | Items per page |

**Success Response (200):**
```json
{
  "success": true,
  "data": {
    "mitras": [
      {
        "id": 5,
        "name": "Ani Yulianti",
        "email": "ani@example.com",
        "phone": "08155555555",
        "base_rate_monthly": 900000,
        "status": "active",
        "total_customers": 12,
        "attendance_rate": 95.5,
        "created_at": "2025-12-01T10:00:00+07:00"
      }
    ],
    "pagination": {
      "total": 15,
      "page": 1,
      "per_page": 20
    }
  }
}
```

---

### GET /api/mitras/[id]

**Description:** Get mitra details

**Authentication:** Required (ADMIN, OWNER)

**Success Response (200):**
```json
{
  "success": true,
  "data": {
    "mitra": {
      "id": 5,
      "name": "Ani Yulianti",
      "email": "ani@example.com",
      "phone": "08155555555",
      "base_rate_monthly": 900000,
      "status": "active",
      "user": {
        "email": "ani.staff@homa.com",
        "role": "STAFF",
        "last_login": "2026-02-07T08:00:00+07:00"
      },
      "statistics": {
        "total_customers": 12,
        "total_visits": 240,
        "completed_visits": 228,
        "attendance_rate": 95.0,
        "avg_hours_per_visit": 3.2
      },
      "assigned_customers": [
        {
          "id": 123,
          "name": "John Doe",
          "package": "regular"
        }
      ]
    }
  }
}
```

---

### POST /api/mitras

**Description:** Create new mitra

**Authentication:** Required (ADMIN, OWNER)

**Request Body:**
```json
{
  "name": "Budi Santoso",
  "phone": "08198765432",
  "email": "budi@example.com",
  "base_rate_monthly": 850000,
  "create_user_account": true,
  "user_email": "budi.staff@homa.com",
  "user_password": "temp_password"
}
```

**Success Response (201):**
```json
{
  "success": true,
  "data": {
    "mitra_id": 6,
    "user_id": 10,
    "temp_password": "temp_password",
    "message": "Mitra created. Please ask them to change password on first login."
  }
}
```

---

### PUT /api/mitras/[id]

**Description:** Update mitra details

**Authentication:** Required (ADMIN, OWNER)

**Request Body:**
```json
{
  "name": "Ani Yulianti Updated",
  "phone": "08155555555",
  "base_rate_monthly": 950000,
  "status": "active"
}
```

**Success Response (200):**
```json
{
  "success": true,
  "data": {
    "mitra_id": 5,
    "updated_fields": ["base_rate_monthly"]
  }
}
```

**Notes:**
- Changing base_rate_monthly affects future payouts only
- Existing payouts not affected

---

## Settings API

### GET /api/settings/payout-rates

**Description:** Get payout rate configurations (Sprint 4)

**Authentication:** Required (ADMIN, OWNER)

**Success Response (200):**
```json
{
  "success": true,
  "data": {
    "rates": [
      {
        "id": 1,
        "package_type": "basic",
        "base_rate": 600000,
        "effective_from": "2026-01-01",
        "effective_to": null,
        "created_at": "2025-12-01T10:00:00+07:00"
      },
      {
        "id": 2,
        "package_type": "regular",
        "base_rate": 1200000,
        "effective_from": "2026-01-01",
        "effective_to": null
      }
    ]
  }
}
```

---

### POST /api/settings/payout-rates

**Description:** Create new payout rate config (Sprint 4)

**Authentication:** Required (ADMIN, OWNER)

**Request Body:**
```json
{
  "package_type": "regular",
  "base_rate": 1300000,
  "effective_from": "2026-03-01"
}
```

**Success Response (201):**
```json
{
  "success": true,
  "data": {
    "rate_config_id": 3,
    "package_type": "regular",
    "base_rate": 1300000,
    "effective_from": "2026-03-01",
    "message": "New rate will apply from 2026-03-01"
  }
}
```

**Notes:**
- Previous rate automatically gets effective_to set
- New rate applies to payouts from effective_from date

---

### GET /api/settings/packages

**Description:** Get subscription packages (Sprint 6)

**Authentication:** Required (ALL roles)

**Success Response (200):**
```json
{
  "success": true,
  "data": {
    "packages": [
      {
        "id": 1,
        "name": "Basic",
        "frequency_per_week": 1,
        "price": 600000,
        "description": "1x per week cleaning",
        "active": true
      },
      {
        "id": 2,
        "name": "Regular",
        "frequency_per_week": 2,
        "price": 1200000,
        "description": "2x per week cleaning",
        "active": true
      }
    ]
  }
}
```

---

### POST /api/settings/packages

**Description:** Create new package (Sprint 6)

**Authentication:** Required (ADMIN, OWNER)

**Request Body:**
```json
{
  "name": "Premium",
  "frequency_per_week": 4,
  "price": 2400000,
  "description": "4x per week cleaning"
}
```

**Success Response (201):**
```json
{
  "success": true,
  "data": {
    "package_id": 4,
    "name": "Premium",
    "message": "Package created successfully"
  }
}
```

---

## Reports API

### GET /api/reports/dashboard

**Description:** Get dashboard summary

**Authentication:** Required (ALL roles)

**Query Parameters:**
| Parameter | Type | Required | Default | Description |
|-----------|------|----------|---------|-------------|
| period | string | No | current_month | `today`, `week`, `month`, `year` |

**Success Response (200):**
```json
{
  "success": true,
  "data": {
    "period": "2026-01",
    "summary": {
      "total_customers": 150,
      "active_subscriptions": 135,
      "trial_customers": 15,
      "total_visits_scheduled": 320,
      "total_visits_completed": 295,
      "completion_rate": 92.2,
      "total_revenue": 162000000,
      "total_payout": 13500000
    },
    "trends": {
      "customer_growth": 5.2,
      "revenue_growth": 8.5,
      "attendance_rate": 94.8
    }
  }
}
```

---

## Error Handling

### Error Response Format
```json
{
  "success": false,
  "error": "Human-readable error message",
  "code": "ERROR_CODE",
  "details": {
    "field": "Specific error detail"
  }
}
```

### Common Error Codes

| Code | HTTP | Description |
|------|------|-------------|
| UNAUTHORIZED | 401 | Not authenticated |
| FORBIDDEN | 403 | Not authorized for this action |
| NOT_FOUND | 404 | Resource not found |
| VALIDATION_ERROR | 400 | Request validation failed |
| DUPLICATE_ENTRY | 409 | Resource already exists |
| RATE_LIMIT_EXCEEDED | 429 | Too many requests |
| INTERNAL_ERROR | 500 | Server error |

### Validation Error Example
```json
{
  "success": false,
  "error": "Validation failed",
  "code": "VALIDATION_ERROR",
  "details": {
    "phone": "Invalid phone format. Must be 08XXXXXXXXXX",
    "email": "Invalid email format"
  }
}
```

---

## Rate Limiting

### Limits

**Global:**
- 100 requests per minute per IP
- 1000 requests per hour per user

**Authentication:**
- Login: 5 attempts per 15 minutes per IP
- Password reset: 3 attempts per hour per email

**Heavy Operations:**
- Payout generation: 10 per hour
- Report export: 20 per hour

### Rate Limit Headers
```
X-RateLimit-Limit: 100
X-RateLimit-Remaining: 95
X-RateLimit-Reset: 1640995200
```

### Rate Limit Exceeded Response
```json
{
  "success": false,
  "error": "Rate limit exceeded. Try again in 45 seconds.",
  "code": "RATE_LIMIT_EXCEEDED",
  "retry_after": 45
}
```

---

## Changelog

### Version 1.0 (Sprint 4 - Feb 3, 2026)
- Initial comprehensive API documentation
- All core endpoints documented
- Authentication, Customers, Visits, Attendance, Payouts

### Version 1.1 (Sprint 5 - Planned Feb 17, 2026)
- New trial endpoints (single date, add date)
- Bulk attendance endpoint
- PDF export endpoint

### Version 1.2 (Sprint 6 - Planned Mar 3, 2026)
- Configurable packages endpoints
- Same-day scheduling support

---

## Related Documents

- **Database Schema:** `docs/technical/database-schema.md`
- **Deployment Guide:** `docs/technical/deployment-guide.md`
- **Feature Docs:** `docs/features/*.md`

---

**Document Version:** 1.0  
**Last Updated:** February 7, 2026  
**Maintained By:** Handi (Developer)  
**API Version:** v1 (stable)