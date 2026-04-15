# Payment API Documentation

## Base URL
```
/api/payments
```

## Overview
The Payment API manages rent payments between students and boarding owners. It handles payment logging, confirmation, rejection, and tracking with support for multiple payment methods and proof images.

---

## Table of Contents
1. [Authentication & Authorization](#authentication--authorization)
2. [Rate Limiting](#rate-limiting)
3. [Enums & Constants](#enums--constants)
4. [Error Responses](#error-responses)
5. [Endpoints](#endpoints)
6. [Payment Workflow](#payment-workflow)
7. [Rental Period Status Management](#rental-period-status-management)

---

## Authentication & Authorization

### Authentication Requirement
- All endpoints require JWT authentication via `Authorization: Bearer <token>` header

### Authorization Roles

| Endpoint | Required Role | Description |
|----------|---------------|-------------|
| `POST /api/payments` | STUDENT | Students can log payments |
| `PUT /api/payments/proof-image` | STUDENT | Students can upload proof images |
| `GET /api/payments/my-payments` | STUDENT | Students can view their payments |
| `GET /api/payments/my-boardings` | OWNER | Owners can view payments for their boardings |
| `PATCH /api/payments/:id/confirm` | OWNER | Owners can confirm payments |
| `PATCH /api/payments/:id/reject` | OWNER | Owners can reject payments |

---

## Rate Limiting

All payment endpoints are subject to rate limiting via the `paymentLimiter` middleware.

| Endpoint | Limit | Window |
|----------|-------|--------|
| All endpoints | Shared limiter | 15 minutes |

---

## Enums & Constants

### PaymentStatus
```typescript
enum PaymentStatus {
  PENDING = "PENDING",         // Initial state, waiting for owner confirmation
  CONFIRMED = "CONFIRMED",     // Owner has confirmed payment received
  REJECTED = "REJECTED"        // Owner rejected payment with reason
}
```

### PaymentMethod
```typescript
enum PaymentMethod {
  CASH = "CASH",               // Cash payment (direct handover)
  BANK_TRANSFER = "BANK_TRANSFER", // Bank transfer payment
  ONLINE = "ONLINE"            // Online payment platform
}
```

### RentalPeriodStatus (Updated by Payment Confirmation)
```typescript
enum RentalPeriodStatus {
  UPCOMING = "UPCOMING",       // Payment not yet due
  DUE = "DUE",                 // Payment is due
  PARTIALLY_PAID = "PARTIALLY_PAID", // Some payments confirmed
  PAID = "PAID",               // Fully paid
  OVERDUE = "OVERDUE"          // Payment is overdue
}
```

### Constants
```typescript
PAYMENT_MAX_AMOUNT = 500000    // Maximum payment amount (Rs.)
PAYMENT_MIN_AMOUNT = 1         // Minimum payment amount
REFERENCE_NUMBER_MAX_LENGTH = 100
```

---

## Error Responses

### Standard Error Response Format
```json
{
  "success": false,
  "error": {
    "code": "ERROR_CODE",
    "message": "Error message"
  }
}
```

### Common Error Codes

| Code | HTTP Status | Description |
|------|------------|-------------|
| `PAYMENT_NOT_FOUND` | 404 | Payment with specified ID does not exist |
| `RENTAL_PERIOD_NOT_FOUND` | 404 | Rental period does not exist |
| `RESERVATION_NOT_FOUND` | 404 | Reservation does not exist |
| `FORBIDDEN` | 403 | User lacks permission |
| `VALIDATION_ERROR` | 400 | Invalid input data |
| `BAD_REQUEST` | 400 | Invalid state or constraint violation |
| `CONFLICT_ERROR` | 409 | Conflicting state (e.g., already fully paid) |
| `UNAUTHORIZED` | 401 | Authentication required |

---

## Endpoints

### 1. Log Payment

**Endpoint:** `POST /api/payments`

**Description:** Record a payment made by a student for a rental period.

**Authentication:** ✅ Required (Bearer token)

**Authorization:** STUDENT role

**Request Headers:**
```
Authorization: Bearer <token>
Content-Type: application/json
```

**Request Body:**

| Field | Type | Required | Constraints |
|-------|------|----------|-------------|
| `rentalPeriodId` | string | ✅ | Valid MongoDB ObjectId |
| `reservationId` | string | ✅ | Valid MongoDB ObjectId |
| `amount` | number | ✅ | > 0, ≤ remaining balance |
| `paymentMethod` | string | ✅ | One of: CASH, BANK_TRANSFER, ONLINE |
| `referenceNumber` | string | ❌ | Max 100 characters (e.g., bank reference) |
| `proofImageUrl` | string | ❌ | Valid URL to uploaded proof image |
| `paidAt` | string | ✅ | ISO 8601 datetime, cannot be future date |

**Request Example:**
```bash
POST /api/payments
Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR...
Content-Type: application/json

{
  "rentalPeriodId": "507f1f77bcf86cd799439101",
  "reservationId": "507f1f77bcf86cd799439051",
  "amount": 7500,
  "paymentMethod": "BANK_TRANSFER",
  "referenceNumber": "TXN-20260406-12345",
  "proofImageUrl": "https://res.cloudinary.com/unistay/image/upload/v1712384520/payments/proof_123.jpg",
  "paidAt": "2026-04-05T14:30:00.000Z"
}
```

**Success Response (201 Created):**
```json
{
  "success": true,
  "message": "Payment logged successfully",
  "data": {
    "payment": {
      "id": "507f1f77bcf86cd799439201",
      "rentalPeriodId": "507f1f77bcf86cd799439101",
      "reservationId": "507f1f77bcf86cd799439051",
      "studentId": "507f1f77bcf86cd799439001",
      "amount": 7500,
      "paymentMethod": "BANK_TRANSFER",
      "referenceNumber": "TXN-20260406-12345",
      "proofImageUrl": "https://res.cloudinary.com/unistay/image/upload/v1712384520/payments/proof_123.jpg",
      "status": "PENDING",
      "paidAt": "2026-04-05T14:30:00.000Z",
      "confirmedAt": null,
      "rejectionReason": null,
      "createdAt": "2026-04-06T09:45:00.000Z",
      "updatedAt": "2026-04-06T09:45:00.000Z"
    }
  }
}
```

**Business Logic:**
- Only STUDENT role can log payments
- `paidAt` cannot be in the future
- Payment amount cannot exceed remaining balance for the rental period
- Cannot log payment if rental period is already fully paid
- Validates that student owns this reservation
- Validates that rental period belongs to the reservation
- Creates payment in PENDING status (waiting for owner confirmation)
- Both reservation and rental period must exist

**Validation Errors:**

Future paidAt date (400):
```json
{
  "success": false,
  "error": {
    "code": "VALIDATION_ERROR",
    "message": "paidAt cannot be in the future"
  }
}
```

Rental period not found (404):
```json
{
  "success": false,
  "error": {
    "code": "VALIDATION_ERROR",
    "message": "Rental period not found"
  }
}
```

Reservation not found (404):
```json
{
  "success": false,
  "error": {
    "code": "VALIDATION_ERROR",
    "message": "Reservation not found"
  }
}
```

Not the student on reservation (403):
```json
{
  "success": false,
  "error": {
    "code": "FORBIDDEN",
    "message": "You are not the student on this reservation"
  }
}
```

Rental period already paid (409):
```json
{
  "success": false,
  "error": {
    "code": "CONFLICT_ERROR",
    "message": "Rental period is already fully paid"
  }
}
```

Amount exceeds remaining balance (400):
```json
{
  "success": false,
  "error": {
    "code": "VALIDATION_ERROR",
    "message": "Amount exceeds remaining balance of 5000.00"
  }
}
```

Invalid payment amount (400):
```json
{
  "success": false,
  "error": {
    "code": "VALIDATION_ERROR",
    "message": "Amount must be greater than 0"
  }
}
```

---

### 2. Upload Proof Image

**Endpoint:** `PUT /api/payments/proof-image`

**Description:** Upload a proof image for payment (receipt, transaction confirmation, etc.).

**Authentication:** ✅ Required (Bearer token)

**Authorization:** STUDENT role

**Request Headers:**
```
Authorization: Bearer <token>
Content-Type: multipart/form-data
```

**Request Body:**

| Field | Type | Required | Constraints |
|-------|------|----------|-------------|
| `image` | file | ✅ | Image file (JPEG, PNG, etc.) |

**Request Example (using cURL):**
```bash
curl -X PUT \
  http://localhost:3000/api/payments/proof-image \
  -H 'Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR...' \
  -F 'image=@payment_receipt.jpg'
```

**Success Response (200 OK):**
```json
{
  "success": true,
  "message": "Proof image uploaded successfully",
  "data": {
    "proofImageUrl": "https://res.cloudinary.com/unistay/image/upload/v1712384520/payments/proof_507f1f77bcf86cd799439201.jpg"
  }
}
```

**Business Logic:**
- Image is uploaded to Cloudinary CDN
- Returns URL that can be used in payment logging
- Only STUDENT role can upload
- Single image upload per request
- Use returned URL as `proofImageUrl` in payment logging

**Upload Tips:**
- Upload proof image before or after logging payment
- Use URL from response in `logPayment` endpoint
- Recommended file size: < 5MB

**Error Responses:**

No image file provided (400):
```json
{
  "success": false,
  "error": {
    "code": "VALIDATION_ERROR",
    "message": "No image file provided"
  }
}
```

---

### 3. Get My Payments

**Endpoint:** `GET /api/payments/my-payments`

**Description:** Retrieve all payments made by authenticated student.

**Authentication:** ✅ Required (Bearer token)

**Authorization:** STUDENT role

**Request Headers:**
```
Authorization: Bearer <token>
```

**Query Parameters:** None

**Request Example:**
```bash
GET /api/payments/my-payments
Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR...
```

**Success Response (200 OK):**
```json
{
  "success": true,
  "data": {
    "payments": [
      {
        "id": "507f1f77bcf86cd799439201",
        "rentalPeriodId": "507f1f77bcf86cd799439101",
        "rentalPeriod": {
          "id": "507f1f77bcf86cd799439101",
          "periodLabel": "February 2026",
          "dueDate": "2026-02-28T23:59:59.000Z",
          "amountDue": 15000,
          "status": "PARTIALLY_PAID"
        },
        "reservationId": "507f1f77bcf86cd799439051",
        "reservation": {
          "id": "507f1f77bcf86cd799439051",
          "boardingId": "507f1f77bcf86cd799439011",
          "boarding": {
            "id": "507f1f77bcf86cd799439011",
            "title": "Beautiful Boarding House Near University"
          }
        },
        "studentId": "507f1f77bcf86cd799439001",
        "amount": 7500,
        "paymentMethod": "BANK_TRANSFER",
        "referenceNumber": "TXN-20260406-12345",
        "proofImageUrl": "https://res.cloudinary.com/unistay/image/upload/v1712384520/payments/proof_123.jpg",
        "status": "CONFIRMED",
        "paidAt": "2026-04-05T14:30:00.000Z",
        "confirmedAt": "2026-04-06T10:15:00.000Z",
        "rejectionReason": null,
        "createdAt": "2026-04-06T09:45:00.000Z",
        "updatedAt": "2026-04-06T10:15:00.000Z"
      },
      {
        "id": "507f1f77bcf86cd799439202",
        "rentalPeriodId": "507f1f77bcf86cd799439101",
        "rentalPeriod": {
          "id": "507f1f77bcf86cd799439101",
          "periodLabel": "February 2026",
          "dueDate": "2026-02-28T23:59:59.000Z",
          "amountDue": 15000,
          "status": "PARTIALLY_PAID"
        },
        "reservationId": "507f1f77bcf86cd799439051",
        "reservation": {
          "id": "507f1f77bcf86cd799439051",
          "boardingId": "507f1f77bcf86cd799439011",
          "boarding": {
            "id": "507f1f77bcf86cd799439011",
            "title": "Beautiful Boarding House Near University"
          }
        },
        "studentId": "507f1f77bcf86cd799439001",
        "amount": 5000,
        "paymentMethod": "CASH",
        "referenceNumber": null,
        "proofImageUrl": null,
        "status": "PENDING",
        "paidAt": "2026-04-06T08:00:00.000Z",
        "confirmedAt": null,
        "rejectionReason": null,
        "createdAt": "2026-04-06T08:15:00.000Z",
        "updatedAt": "2026-04-06T08:15:00.000Z"
      }
    ]
  }
}
```

**Business Logic:**
- Returns all payments made by authenticated student
- Includes rental period details (due date, amount due, status)
- Includes reservation and boarding details
- Sorted by creation date (newest first)
- Shows payment status: PENDING, CONFIRMED, REJECTED
- Shows confirmation date if payment has been confirmed
- Shows rejection reason if payment has been rejected
- Only STUDENT role can access

**Payment Status Indicators:**
- `PENDING`: Awaiting owner confirmation
- `CONFIRMED`: Owner has confirmed payment received
- `REJECTED`: Owner rejected with reason provided

---

### 4. Get My Boarding Payments

**Endpoint:** `GET /api/payments/my-boardings`

**Description:** Retrieve all payments received for boardings owned by authenticated user.

**Authentication:** ✅ Required (Bearer token)

**Authorization:** OWNER role

**Request Headers:**
```
Authorization: Bearer <token>
```

**Query Parameters:** None

**Request Example:**
```bash
GET /api/payments/my-boardings
Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR...
```

**Success Response (200 OK):**
```json
{
  "success": true,
  "data": {
    "payments": [
      {
        "id": "507f1f77bcf86cd799439201",
        "rentalPeriodId": "507f1f77bcf86cd799439101",
        "rentalPeriod": {
          "id": "507f1f77bcf86cd799439101",
          "periodLabel": "February 2026",
          "dueDate": "2026-02-28T23:59:59.000Z",
          "amountDue": 15000,
          "status": "PARTIALLY_PAID"
        },
        "reservationId": "507f1f77bcf86cd799439051",
        "reservation": {
          "id": "507f1f77bcf86cd799439051",
          "boardingId": "507f1f77bcf86cd799439011",
          "boarding": {
            "id": "507f1f77bcf86cd799439011",
            "title": "Beautiful Boarding House Near University"
          }
        },
        "studentId": "507f1f77bcf86cd799439001",
        "amount": 7500,
        "paymentMethod": "BANK_TRANSFER",
        "referenceNumber": "TXN-20260406-12345",
        "proofImageUrl": "https://res.cloudinary.com/unistay/image/upload/v1712384520/payments/proof_123.jpg",
        "status": "CONFIRMED",
        "paidAt": "2026-04-05T14:30:00.000Z",
        "confirmedAt": "2026-04-06T10:15:00.000Z",
        "rejectionReason": null,
        "createdAt": "2026-04-06T09:45:00.000Z",
        "updatedAt": "2026-04-06T10:15:00.000Z"
      },
      {
        "id": "507f1f77bcf86cd799439203",
        "rentalPeriodId": "507f1f77bcf86cd799439102",
        "rentalPeriod": {
          "id": "507f1f77bcf86cd799439102",
          "periodLabel": "March 2026",
          "dueDate": "2026-03-31T23:59:59.000Z",
          "amountDue": 15000,
          "status": "DUE"
        },
        "reservationId": "507f1f77bcf86cd799439052",
        "reservation": {
          "id": "507f1f77bcf86cd799439052",
          "boardingId": "507f1f77bcf86cd799439012",
          "boarding": {
            "id": "507f1f77bcf86cd799439012",
            "title": "Cozy Single Room in City Center"
          }
        },
        "studentId": "507f1f77bcf86cd799439002",
        "amount": 15000,
        "paymentMethod": "ONLINE",
        "referenceNumber": "PAY-2026-03-987654",
        "proofImageUrl": "https://res.cloudinary.com/unistay/image/upload/v1712384600/payments/proof_456.jpg",
        "status": "PENDING",
        "paidAt": "2026-04-01T10:00:00.000Z",
        "confirmedAt": null,
        "rejectionReason": null,
        "createdAt": "2026-04-01T10:30:00.000Z",
        "updatedAt": "2026-04-01T10:30:00.000Z"
      }
    ]
  }
}
```

**Business Logic:**
- Returns all payments for boardings owned by authenticated owner
- Only shows payments for boardings owned by the owner
- If owner has no boardings, returns empty array
- Includes all linked data (rental period, reservation, boarding, student)
- Sorted by creation date (newest first)
- Useful for tracking incoming payments and pending confirmations
- Only OWNER role can access

**Use Cases:**
- View pending payments awaiting confirmation
- Track confirmed payments by date
- Monitor payments by rental period status
- View payment methods used by students

---

### 5. Confirm Payment

**Endpoint:** `PATCH /api/payments/:id/confirm`

**Description:** Confirm a payment as received by boarding owner.

**Authentication:** ✅ Required (Bearer token)

**Authorization:** OWNER role (must own the boarding)

**Path Parameters:**

| Parameter | Type | Required | Validation |
|-----------|------|----------|-----------|
| `id` | string | ✅ | Valid MongoDB ObjectId |

**Request Headers:**
```
Authorization: Bearer <token>
```

**Request Example:**
```bash
PATCH /api/payments/507f1f77bcf86cd799439201/confirm
Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR...
```

**Success Response (200 OK):**
```json
{
  "success": true,
  "message": "Payment confirmed",
  "data": {
    "payment": {
      "id": "507f1f77bcf86cd799439201",
      "rentalPeriodId": "507f1f77bcf86cd799439101",
      "reservationId": "507f1f77bcf86cd799439051",
      "studentId": "507f1f77bcf86cd799439001",
      "amount": 7500,
      "paymentMethod": "BANK_TRANSFER",
      "referenceNumber": "TXN-20260406-12345",
      "proofImageUrl": "https://res.cloudinary.com/unistay/image/upload/v1712384520/payments/proof_123.jpg",
      "status": "CONFIRMED",
      "paidAt": "2026-04-05T14:30:00.000Z",
      "confirmedAt": "2026-04-06T10:15:00.000Z",
      "rejectionReason": null,
      "createdAt": "2026-04-06T09:45:00.000Z",
      "updatedAt": "2026-04-06T10:15:00.000Z"
    }
  }
}
```

**Business Logic:**
- Only PENDING payments can be confirmed
- Sets `confirmedAt` timestamp to current date/time
- Owner must own the boarding the payment is for
- Automatically recalculates rental period status after confirmation
- Rental period status updated based on total confirmed payments:
  - If confirmed total >= amount due → status becomes PAID
  - If confirmed total > 0 and < amount due → status becomes PARTIALLY_PAID
- Uses MongoDB transaction for atomicity

**Rental Period Status Recalculation:**
```
Before: 
  - Rental Period Status: "DUE"
  - Confirmed Payments: 0
  - Amount Due: 15000

After Confirming 7500 Payment:
  - Rental Period Status: "PARTIALLY_PAID"
  - Confirmed Payments: 7500
  - Amount Due: 15000
  - Remaining: 7500

After Confirming Another 7500 Payment:
  - Rental Period Status: "PAID"
  - Confirmed Payments: 15000
  - Amount Due: 15000
  - Remaining: 0
```

**Validation Errors:**

Payment not found (404):
```json
{
  "success": false,
  "error": {
    "code": "PAYMENT_NOT_FOUND",
    "message": "Payment not found"
  }
}
```

Not the boarding owner (403):
```json
{
  "success": false,
  "error": {
    "code": "FORBIDDEN",
    "message": "You do not own this boarding"
  }
}
```

Only PENDING can be confirmed (400):
```json
{
  "success": false,
  "error": {
    "code": "BAD_REQUEST",
    "message": "Only PENDING payments can be confirmed"
  }
}
```

---

### 6. Reject Payment

**Endpoint:** `PATCH /api/payments/:id/reject`

**Description:** Reject a payment with a reason (e.g., incorrect amount, insufficient proof).

**Authentication:** ✅ Required (Bearer token)

**Authorization:** OWNER role (must own the boarding)

**Path Parameters:**

| Parameter | Type | Required | Validation |
|-----------|------|----------|-----------|
| `id` | string | ✅ | Valid MongoDB ObjectId |

**Request Headers:**
```
Authorization: Bearer <token>
Content-Type: application/json
```

**Request Body:**

| Field | Type | Required | Constraints |
|-------|------|----------|-------------|
| `reason` | string | ✅ | Min 1 character |

**Request Example:**
```bash
PATCH /api/payments/507f1f77bcf86cd799439202/reject
Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR...
Content-Type: application/json

{
  "reason": "Insufficient proof provided. Please resubmit with clearer receipt."
}
```

**Success Response (200 OK):**
```json
{
  "success": true,
  "message": "Payment rejected",
  "data": {
    "payment": {
      "id": "507f1f77bcf86cd799439202",
      "rentalPeriodId": "507f1f77bcf86cd799439101",
      "reservationId": "507f1f77bcf86cd799439051",
      "studentId": "507f1f77bcf86cd799439001",
      "amount": 5000,
      "paymentMethod": "CASH",
      "referenceNumber": null,
      "proofImageUrl": null,
      "status": "REJECTED",
      "paidAt": "2026-04-06T08:00:00.000Z",
      "confirmedAt": null,
      "rejectionReason": "Insufficient proof provided. Please resubmit with clearer receipt.",
      "createdAt": "2026-04-06T08:15:00.000Z",
      "updatedAt": "2026-04-06T12:30:00.000Z"
    }
  }
}
```

**Business Logic:**
- Only PENDING payments can be rejected
- Stores rejection reason for student reference
- Does not affect rental period status calculation
- Student can submit new payment after rejection
- Owner must own the boarding the payment is for
- Rejection reason visible to student

**Common Rejection Reasons:**
- "Insufficient proof provided. Please resubmit with clearer receipt."
- "Amount does not match stated payment. Please verify."
- "Reference number could not be verified. Please check with your bank."
- "Payment not received in our account. Please verify the transaction."
- "Proof image quality too low. Please resubmit."

**Validation Errors:**

Payment not found (404):
```json
{
  "success": false,
  "error": {
    "code": "PAYMENT_NOT_FOUND",
    "message": "Payment not found"
  }
}
```

Not the boarding owner (403):
```json
{
  "success": false,
  "error": {
    "code": "FORBIDDEN",
    "message": "You do not own this boarding"
  }
}
```

Only PENDING can be rejected (400):
```json
{
  "success": false,
  "error": {
    "code": "BAD_REQUEST",
    "message": "Only PENDING payments can be rejected"
  }
}
```

Missing rejection reason (400):
```json
{
  "success": false,
  "error": {
    "code": "VALIDATION_ERROR",
    "message": "Rejection reason is required"
  }
}
```

---

## Payment Workflow

### Complete Payment Flow

```
1. Student Makes Payment (Any Time)
   ↓
   POST /api/payments/logPayment
   Status: PENDING
   ↓
   (Optional) Upload proof image separately:
   PUT /api/payments/proof-image
   ↓

2. Owner Reviews Payment
   ↓
   Option A: Confirm Payment
   ├─ PATCH /api/payments/{id}/confirm
   ├─ Status: PENDING → CONFIRMED
   ├─ Rental Period Status Updated
   └─ Payment counts towards rent
   
   Option B: Reject Payment
   ├─ PATCH /api/payments/{id}/reject
   ├─ Status: PENDING → REJECTED
   ├─ Rejection Reason Recorded
   └─ Student Must Resubmit
   ↓

3. Student Checks Status
   ↓
   GET /api/payments/my-payments
   ├─ See CONFIRMED payments
   ├─ See PENDING payments awaiting confirmation
   └─ See REJECTED with reason
   ↓

4. Owner Views Income
   ↓
   GET /api/payments/my-boardings
   ├─ See all incoming payments
   ├─ See pending for confirmation
   └─ Track by rental period
```

### Partial Payment Scenario

```
Rental Period: February 2026
Amount Due: 15,000 Rs.

Day 1:
  Student payment: 7,500 Rs. (BANK_TRANSFER) → Status: PENDING
  
Day 2:
  Owner confirms: Payment CONFIRMED
  Rental Period Status: PARTIALLY_PAID (7,500 / 15,000)
  
Day 5:
  Student payment: 5,000 Rs. (CASH) → Status: PENDING
  
Day 6:
  Owner confirms: Payment CONFIRMED
  Rental Period Status: PARTIALLY_PAID (12,500 / 15,000)
  
Day 10:
  Student payment: 2,500 Rs. (ONLINE) → Status: PENDING
  
Day 11:
  Owner confirms: Payment CONFIRMED
  Rental Period Status: PAID (15,000 / 15,000)
  ✅ Rental period is now fully paid
```

### Rejection & Resubmission Scenario

```
Day 1:
  Student payment: 5,000 Rs. → Status: PENDING
  
Day 2:
  Owner rejects: Reason: "Insufficient proof"
  Payment Status: REJECTED
  
Day 3:
  Student uploads better proof:
  PUT /api/payments/proof-image → New URL
  
Day 3:
  Student submits new payment with new proof URL
  POST /api/payments → Status: PENDING
  
Day 4:
  Owner confirms: Payment CONFIRMED ✅
```

---

## Rental Period Status Management

### How Confirmation Updates Rental Period Status

When a payment is confirmed, the system:

1. **Fetches all payments** for the rental period
2. **Sums confirmed payments** (status = CONFIRMED)
3. **Compares to amount due**:
   - If confirmed total >= amount due → `PAID`
   - If confirmed total > 0 → `PARTIALLY_PAID`
   - If confirmed total = 0 → `DUE` (or other status)

### Rental Period Status Flow

```
UPCOMING
  ├─ (No action required)
  └─ Wait for due date
  
DUE
  ├─ Students can log payments
  ├─ Payments are PENDING
  └─ Owner can confirm/reject
  
On First Payment Confirmation:
  ├─ Status: DUE → PARTIALLY_PAID
  └─ Remaining balance: amountDue - confirmedTotal
  
On Full Payment Confirmation:
  ├─ Status: Any → PAID
  └─ Remaining balance: 0
  
PAID
  ├─ No new payments can be logged
  └─ Rental period complete
  
OVERDUE
  ├─ Past due date without full payment
  └─ Can still accept payments (if not PAID)
```

---

## Common Validation Rules

### Amount Validation
- **Requirement:** Required, must be positive
- **Minimum:** 0.01 (or smallest currency unit)
- **Maximum:** Cannot exceed remaining balance
- **Formula:** `amount ≤ (amountDue - confirmedTotal)`

### Payment Date (paidAt)
- **Requirement:** Required, ISO 8601 format
- **Constraint:** Cannot be future date
- **Use Case:** Actual date payment was made
- **Format:** `2026-04-06T14:30:00.000Z`

### Reference Number
- **Requirement:** Optional
- **Length:** Max 100 characters
- **Use Case:** Bank transfer reference, transaction ID
- **Example:** `TXN-20260406-12345`, `REF-001234`

### Proof Image URL
- **Requirement:** Optional but recommended
- **Format:** Valid URL
- **Use Case:** Receipt, transaction confirmation screenshot
- **How to Get:** Upload via `/proof-image` endpoint

### Payment Method
- **Valid Options:** CASH, BANK_TRANSFER, ONLINE
- **Use Case:** Student indicates payment method
- **Required:** Yes

---

## Security Considerations

1. **Authentication:** All endpoints require valid JWT tokens
2. **Authorization:** 
   - Students can only log payments for their own reservations
   - Students can only see their own payments
   - Owners can only confirm/reject payments for their boardings
   - Owners can only see payments for their boardings
3. **Ownership Validation:** Every action validates boarding ownership
4. **Image Storage:** Proof images stored on Cloudinary (secure CDN)
5. **Data Validation:** All inputs validated with Zod schemas
6. **Rate Limiting:** All endpoints subject to paymentLimiter middleware

---

## Dependencies & Integrations

### Libraries Used
- **mongoose:** MongoDB ODM for database operations
- **multer:** File upload handling middleware
- **cloudinary:** Image storage and CDN
- **zod:** Schema validation
- **express:** Web framework
- **typescript:** Type safety

### External Services
- **Cloudinary:** Image hosting and CDN for proof images
- **MongoDB:** Document database for payment and rental period data

---

## Example Workflows

### Workflow 1: Student Makes Bank Transfer Payment

```bash
# Step 1: Upload proof image (bank receipt screenshot)
PUT /api/payments/proof-image
Authorization: Bearer <student-token>
Content-Type: multipart/form-data
File: receipt_screenshot.jpg
# Response: 200 OK, proofImageUrl

# Step 2: Log payment with proof
POST /api/payments
Authorization: Bearer <student-token>
{
  "rentalPeriodId": "507f1f77bcf86cd799439101",
  "reservationId": "507f1f77bcf86cd799439051",
  "amount": 7500,
  "paymentMethod": "BANK_TRANSFER",
  "referenceNumber": "TXN-20260406-12345",
  "proofImageUrl": "<url-from-step-1>",
  "paidAt": "2026-04-05T14:30:00.000Z"
}
# Response: 201 Created, payment with status: PENDING

# Step 3: Student views payment status
GET /api/payments/my-payments
Authorization: Bearer <student-token>
# Response: 200 OK, shows PENDING payment

# Step 4: Owner reviews and confirms payment
PATCH /api/payments/507f1f77bcf86cd799439201/confirm
Authorization: Bearer <owner-token>
# Response: 200 OK, payment status: CONFIRMED, rental period: PARTIALLY_PAID

# Step 5: Student sees confirmation
GET /api/payments/my-payments
Authorization: Bearer <student-token>
# Response: 200 OK, shows CONFIRMED payment with confirmedAt timestamp
```

### Workflow 2: Partial Payment with Multiple Submissions

```bash
# Month: February 2026, Amount Due: 15,000 Rs.

# Week 1: Student submits first payment
POST /api/payments
{
  "rentalPeriodId": "507f1f77bcf86cd799439101",
  "reservationId": "507f1f77bcf86cd799439051",
  "amount": 5000,
  "paymentMethod": "CASH",
  "paidAt": "2026-02-07T10:00:00.000Z"
}
# Response: Created, Payment ID: P001, Status: PENDING

# Week 1: Owner confirms
PATCH /api/payments/P001/confirm
Authorization: Bearer <owner-token>
# Rental Period Status Updated: PARTIALLY_PAID (5,000/15,000)

# Week 2: Student submits second payment
POST /api/payments
{
  "rentalPeriodId": "507f1f77bcf86cd799439101",
  "reservationId": "507f1f77bcf86cd799439051",
  "amount": 7500,
  "paymentMethod": "ONLINE",
  "referenceNumber": "PAY-12345",
  "proofImageUrl": "https://...",
  "paidAt": "2026-02-14T15:00:00.000Z"
}
# Response: Created, Payment ID: P002, Status: PENDING

# Week 2: Owner confirms
PATCH /api/payments/P002/confirm
Authorization: Bearer <owner-token>
# Rental Period Status Updated: PARTIALLY_PAID (12,500/15,000)

# Week 3: Student submits final payment
POST /api/payments
{
  "rentalPeriodId": "507f1f77bcf86cd799439101",
  "reservationId": "507f1f77bcf86cd799439051",
  "amount": 2500,
  "paymentMethod": "CASH",
  "paidAt": "2026-02-21T11:00:00.000Z"
}
# Response: Created, Payment ID: P003, Status: PENDING

# Week 3: Owner confirms
PATCH /api/payments/P003/confirm
Authorization: Bearer <owner-token>
# Rental Period Status Updated: PAID (15,000/15,000) ✅

# Rental period is now fully paid, cannot log more payments
POST /api/payments
# Response: 409 Conflict - "Rental period is already fully paid"
```

### Workflow 3: Payment Rejection & Resubmission

```bash
# Step 1: Student submits payment without proof
POST /api/payments
{
  "rentalPeriodId": "507f1f77bcf86cd799439101",
  "reservationId": "507f1f77bcf86cd799439051",
  "amount": 7500,
  "paymentMethod": "CASH",
  "paidAt": "2026-04-01T08:00:00.000Z"
}
# Response: 201 Created, Payment ID: P004, Status: PENDING

# Step 2: Owner checks and rejects due to no proof
PATCH /api/payments/P004/reject
Authorization: Bearer <owner-token>
{
  "reason": "No proof image provided. Please resubmit with receipt."
}
# Response: 200 OK, Payment Status: REJECTED, Reason recorded

# Step 3: Student gets notification and uploads proof
PUT /api/payments/proof-image
Authorization: Bearer <student-token>
File: cash_receipt.jpg
# Response: 200 OK, proofImageUrl

# Step 4: Student resubmits payment
POST /api/payments
{
  "rentalPeriodId": "507f1f77bcf86cd799439101",
  "reservationId": "507f1f77bcf86cd799439051",
  "amount": 7500,
  "paymentMethod": "CASH",
  "proofImageUrl": "<url-from-step-3>",
  "paidAt": "2026-04-01T08:00:00.000Z"
}
# Response: 201 Created, Payment ID: P005, Status: PENDING

# Step 5: Owner confirms with proof
PATCH /api/payments/P005/confirm
Authorization: Bearer <owner-token>
# Response: 200 OK, Payment Status: CONFIRMED ✅

# Student sees confirmed payment
GET /api/payments/my-payments
Authorization: Bearer <student-token>
# Shows only P005 as CONFIRMED (P004 REJECTED is also visible)
```

### Workflow 4: Owner Views All Income

```bash
# Owner has 2 boardings with multiple reservations
# Each reservation has rental periods
# Multiple students paying for each period

# View all payments for owned boardings
GET /api/payments/my-boardings
Authorization: Bearer <owner-token>

# Response shows:
# - All PENDING payments awaiting confirmation (action required)
# - All CONFIRMED payments with confirmation dates
# - All REJECTED payments with rejection reasons
# - Grouped by boarding and rental period

# Useful for:
# - Daily reconciliation
# - Tracking income
# - Following up on pending payments
# - Monitoring payment methods
```

---

## Troubleshooting

| Issue | Solution |
|-------|----------|
| "Amount exceeds remaining balance" | Check remaining balance in rental period, pay only the balance due |
| "Rental period is already fully paid" | Rent for this period is complete, wait for next period or check rental periods |
| "Only PENDING payments can be confirmed" | Payment already confirmed or rejected (check status) |
| "You do not own this boarding" | Ensure authenticated as the correct owner |
| "Rental period not found" | Verify rentalPeriodId is correct and exists |
| "You are not the student on this reservation" | Payment can only be logged by the student in the reservation |
| "paidAt cannot be in the future" | Use current or past date for payment date |
| "No image file provided" | Select an image file in multipart form data |
| "Payment not found" | Verify payment ID is correct |
| "Insufficient proof provided" | Owner rejection reason explains needed proof - resubmit with clearer image |

---

## Data Models

### Payment Fields

```typescript
{
  id: ObjectId,
  rentalPeriodId: ObjectId,         // Reference to RentalPeriod
  reservationId: ObjectId,          // Reference to Reservation
  studentId: ObjectId,              // Reference to User (Student)
  amount: number,                   // Payment amount in Rs.
  paymentMethod: PaymentMethod,     // CASH, BANK_TRANSFER, ONLINE
  referenceNumber?: string,         // Transaction/reference number
  proofImageUrl?: string,           // URL to payment proof image (Cloudinary)
  status: PaymentStatus,            // PENDING, CONFIRMED, REJECTED
  paidAt: Date,                     // When payment was made
  confirmedAt?: Date,               // When owner confirmed (if confirmed)
  rejectionReason?: string,         // Why payment was rejected (if rejected)
  createdAt: Date,                  // When payment was logged
  updatedAt: Date                   // Last update timestamp
}
```

### Indexes for Performance

```typescript
paymentSchema.index({ rentalPeriodId: 1 });
paymentSchema.index({ reservationId: 1 });
paymentSchema.index({ studentId: 1 });
paymentSchema.index({ status: 1 });
```

---

## Performance Tips

1. **Use filtering** on payment status to find pending confirmations
2. **Check rental period status** after confirming payments
3. **Upload proof images separately** if not available immediately
4. **Batch operations** - students can submit multiple partial payments
5. **Regular review** - owners should regularly confirm pending payments
6. **Optimize image sizes** before uploading (recommend: < 5MB)

---

## Changelog & Version History

- **v1.0.0 (2026-02-27)**: Initial Payment API release
  - Payment logging and tracking
  - Multiple payment methods support
  - Owner confirmation/rejection workflow
  - Proof image uploads
  - Rental period status integration
  - Partial payment support

---

## Support & Contact

For issues or questions:
- Check the [Troubleshooting](#troubleshooting) section
- Review [Common Validation Rules](#common-validation-rules)
- Verify [Payment Workflow](#payment-workflow) for your use case
- Consult [Example Workflows](#example-workflows) for similar scenarios
- Contact development team for additional support
