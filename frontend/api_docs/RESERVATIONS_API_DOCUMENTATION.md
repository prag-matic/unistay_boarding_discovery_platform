# Reservation API Documentation

## Base URL
```
/api/reservations
```

## Overview
The Reservation API manages student requests to book boarding accommodations. Features include creating reservations, managing approvals/rejections, tracking rental periods, and handling payments.

---

## Table of Contents
1. [Authentication](#authentication)
2. [Rate Limiting](#rate-limiting)
3. [Enums & Constants](#enums--constants)
4. [Error Responses](#error-responses)
5. [Endpoints](#endpoints)
6. [Status Workflow](#status-workflow)

---

## Authentication

### Authentication Requirement
- **All endpoints require JWT authentication** via `Authorization: Bearer <token>` header
- Students can create reservations (STUDENT role)
- Owners can manage reservations for their boardings (OWNER role)
- Admins can view all reservations (ADMIN role)

### Authorization Roles
- `STUDENT`: Can create, view, and cancel their own reservations
- `OWNER`: Can approve, reject, and complete reservations for their boardings
- `ADMIN`: Can view all reservations

---

## Rate Limiting

All reservation endpoints are subject to rate limiting via the `reservationLimiter` middleware.

---

## Enums & Constants

### ReservationStatus
```typescript
enum ReservationStatus {
  PENDING = "PENDING",           // Initial state after creation, awaiting owner approval
  ACTIVE = "ACTIVE",             // Approved by owner, rental periods generated
  COMPLETED = "COMPLETED",       // Tenant moved out, marked complete by owner
  CANCELLED = "CANCELLED",       // Cancelled by student or expired
  REJECTED = "REJECTED",         // Rejected by owner with reason
  EXPIRED = "EXPIRED"            // Not approved within 72 hours
}
```

### RentalPeriodStatus
```typescript
enum RentalPeriodStatus {
  UPCOMING = "UPCOMING",         // Payment not yet due
  DUE = "DUE",                   // Payment due date reached
  PARTIALLY_PAID = "PARTIALLY_PAID", // Partial payment received
  PAID = "PAID",                 // Complete payment received
  OVERDUE = "OVERDUE"            // Past due date without full payment
}
```

### Constants
```typescript
RESERVATION_EXPIRY_HOURS = 72    // Reservation expires after 72 hours if not approved
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
| `NOT_FOUND` | 404 | Reservation or resource not found |
| `FORBIDDEN` | 403 | User lacks permission to access resource |
| `BAD_REQUEST` | 400 | Invalid input or invalid state transition |
| `CONFLICT` | 409 | Resource conflict (e.g., duplicate reservation, boarding full) |
| `UNAUTHORIZED` | 401 | Authentication required |
| `UNAUTHENTICATED_USER` | 401 | JWT token missing or invalid |

---

## Endpoints

### 1. Create Reservation

**Endpoint:** `POST /api/reservations`

**Description:** Create a new reservation request for a boarding accommodation.

**Authentication:** ✅ Required (Bearer token)

**Authorization:** `STUDENT` role

**Request Headers:**
```
Authorization: Bearer <token>
Content-Type: application/json
```

**Request Body:**

| Field | Type | Required | Constraints |
|-------|------|----------|-------------|
| `boardingId` | string | ✅ | Valid MongoDB ObjectId |
| `moveInDate` | string | ✅ | YYYY-MM-DD format, at least 1 day in future |
| `specialRequests` | string | ❌ | Max 1000 characters |

**Request Example:**
```bash
POST /api/reservations
Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR...
Content-Type: application/json

{
  "boardingId": "507f1f77bcf86cd799439011",
  "moveInDate": "2026-04-15",
  "specialRequests": "I have a dog, would that be okay? Also, I prefer upper floor rooms."
}
```

**Success Response (201 Created):**
```json
{
  "success": true,
  "message": "Reservation request created successfully",
  "data": {
    "reservation": {
      "id": "507f1f77bcf86cd799439101",
      "studentId": "507f1f77bcf86cd799439201",
      "student": {
        "id": "507f1f77bcf86cd799439201",
        "firstName": "Ahmed",
        "lastName": "Hassan",
        "email": "ahmed.hassan@example.com"
      },
      "boardingId": "507f1f77bcf86cd799439011",
      "boarding": {
        "id": "507f1f77bcf86cd799439011",
        "title": "Beautiful Boarding House Near University",
        "slug": "beautiful-boarding-house-near-university",
        "city": "Colombo",
        "district": "Colombo"
      },
      "status": "PENDING",
      "moveInDate": "2026-04-15",
      "specialRequests": "I have a dog, would that be okay? Also, I prefer upper floor rooms.",
      "rentSnapshot": 15000,
      "boardingSnapshot": {
        "id": "507f1f77bcf86cd799439011",
        "title": "Beautiful Boarding House Near University",
        "slug": "beautiful-boarding-house-near-university",
        "city": "Colombo",
        "district": "Colombo",
        "address": "123 Main Street, Colombo 7",
        "boardingType": "SHARED_ROOM",
        "genderPref": "ANY",
        "monthlyRent": 15000,
        "maxOccupants": 3,
        "nearUniversity": "Colombo University"
      },
      "rejectionReason": null,
      "expiresAt": "2026-04-09T08:30:00.000Z",
      "createdAt": "2026-04-06T08:30:00.000Z",
      "updatedAt": "2026-04-06T08:30:00.000Z"
    }
  }
}
```

**Business Logic:**
- Creates reservation with initial status: `PENDING`
- Sets expiration to 72 hours from creation
- Validates move-in date is at least 1 day in the future
- Checks boarding exists and is ACTIVE
- Checks boarding has available capacity
- Validates student doesn't have another ACTIVE reservation
- Validates student doesn't have another PENDING/ACTIVE reservation for same boarding
- Snapshots rent and boarding info at time of creation (for historical accuracy)

**Validation Errors:**

Move-in date in past (400):
```json
{
  "success": false,
  "error": {
    "code": "BAD_REQUEST",
    "message": "Move-in date must be at least 1 day in the future"
  }
}
```

Boarding not found (404):
```json
{
  "success": false,
  "error": {
    "code": "BOARDING_NOT_FOUND",
    "message": "Boarding not found"
  }
}
```

Boarding not available (400):
```json
{
  "success": false,
  "error": {
    "code": "BAD_REQUEST",
    "message": "Boarding is not available for reservation"
  }
}
```

Boarding is full (409):
```json
{
  "success": false,
  "error": {
    "code": "CONFLICT",
    "message": "Boarding is full"
  }
}
```

Student already has active reservation (409):
```json
{
  "success": false,
  "error": {
    "code": "CONFLICT",
    "message": "You already have an active reservation"
  }
}
```

Already reserved same boarding (409):
```json
{
  "success": false,
  "error": {
    "code": "CONFLICT",
    "message": "You already have a pending or active reservation for this boarding"
  }
}
```

---

### 2. Get My Requests (Student)

**Endpoint:** `GET /api/reservations/my-requests`

**Description:** Retrieve all reservations created by the authenticated student.

**Authentication:** ✅ Required (Bearer token)

**Authorization:** `STUDENT` role

**Request Example:**
```bash
GET /api/reservations/my-requests
Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR...
```

**Success Response (200 OK):**
```json
{
  "success": true,
  "data": {
    "reservations": [
      {
        "id": "507f1f77bcf86cd799439101",
        "studentId": "507f1f77bcf86cd799439201",
        "student": {
          "id": "507f1f77bcf86cd799439201",
          "firstName": "Ahmed",
          "lastName": "Hassan",
          "email": "ahmed.hassan@example.com"
        },
        "boardingId": "507f1f77bcf86cd799439011",
        "boarding": {
          "id": "507f1f77bcf86cd799439011",
          "title": "Beautiful Boarding House Near University",
          "slug": "beautiful-boarding-house-near-university",
          "city": "Colombo",
          "district": "Colombo"
        },
        "status": "ACTIVE",
        "moveInDate": "2026-04-15",
        "specialRequests": "I have a dog, would that be okay?",
        "rentSnapshot": 15000,
        "rejectionReason": null,
        "expiresAt": "2026-04-09T08:30:00.000Z",
        "createdAt": "2026-04-06T08:30:00.000Z",
        "updatedAt": "2026-04-06T10:45:00.000Z"
      },
      {
        "id": "507f1f77bcf86cd799439102",
        "studentId": "507f1f77bcf86cd799439201",
        "student": {
          "id": "507f1f77bcf86cd799439201",
          "firstName": "Ahmed",
          "lastName": "Hassan",
          "email": "ahmed.hassan@example.com"
        },
        "boardingId": "507f1f77bcf86cd799439012",
        "boarding": {
          "id": "507f1f77bcf86cd799439012",
          "title": "Cozy Single Room in City Center",
          "slug": "cozy-single-room-in-city-center",
          "city": "Colombo",
          "district": "Colombo"
        },
        "status": "REJECTED",
        "moveInDate": "2026-05-01",
        "specialRequests": null,
        "rentSnapshot": 12000,
        "rejectionReason": "Owner currently not accepting students with pets",
        "expiresAt": "2026-04-05T08:30:00.000Z",
        "createdAt": "2026-04-02T08:30:00.000Z",
        "updatedAt": "2026-04-03T14:20:00.000Z"
      }
    ]
  }
}
```

**Business Logic:**
- Returns all reservations for authenticated student
- Includes all statuses (PENDING, ACTIVE, COMPLETED, CANCELLED, REJECTED, EXPIRED)
- Sorted by creation date (newest first)
- Includes rejection reasons and boarding snapshots

**Error Responses:**

Unauthorized (401):
```json
{
  "success": false,
  "error": {
    "code": "UNAUTHORIZED",
    "message": "Unauthorized: Please provide a valid authentication token"
  }
}
```

---

### 3. Get My Boarding Requests (Owner)

**Endpoint:** `GET /api/reservations/my-boardings`

**Description:** Retrieve all reservation requests for boardings owned by the authenticated user.

**Authentication:** ✅ Required (Bearer token)

**Authorization:** `OWNER` role

**Request Example:**
```bash
GET /api/reservations/my-boardings
Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR...
```

**Success Response (200 OK):**
```json
{
  "success": true,
  "data": {
    "reservations": [
      {
        "id": "507f1f77bcf86cd799439101",
        "studentId": "507f1f77bcf86cd799439201",
        "student": {
          "id": "507f1f77bcf86cd799439201",
          "firstName": "Ahmed",
          "lastName": "Hassan",
          "email": "ahmed.hassan@example.com"
        },
        "boardingId": "507f1f77bcf86cd799439011",
        "boarding": {
          "id": "507f1f77bcf86cd799439011",
          "title": "Beautiful Boarding House Near University",
          "slug": "beautiful-boarding-house-near-university",
          "city": "Colombo",
          "district": "Colombo"
        },
        "status": "PENDING",
        "moveInDate": "2026-04-15",
        "specialRequests": "I have a dog, would that be okay?",
        "rentSnapshot": 15000,
        "rejectionReason": null,
        "expiresAt": "2026-04-09T08:30:00.000Z",
        "createdAt": "2026-04-06T08:30:00.000Z",
        "updatedAt": "2026-04-06T08:30:00.000Z"
      },
      {
        "id": "507f1f77bcf86cd799439103",
        "studentId": "507f1f77bcf86cd799439202",
        "student": {
          "id": "507f1f77bcf86cd799439202",
          "firstName": "Fatima",
          "lastName": "Ali",
          "email": "fatima.ali@example.com"
        },
        "boardingId": "507f1f77bcf86cd799439011",
        "boarding": {
          "id": "507f1f77bcf86cd799439011",
          "title": "Beautiful Boarding House Near University",
          "slug": "beautiful-boarding-house-near-university",
          "city": "Colombo",
          "district": "Colombo"
        },
        "status": "ACTIVE",
        "moveInDate": "2026-04-10",
        "specialRequests": null,
        "rentSnapshot": 15000,
        "rejectionReason": null,
        "expiresAt": "2026-04-09T08:30:00.000Z",
        "createdAt": "2026-04-05T10:15:00.000Z",
        "updatedAt": "2026-04-06T11:00:00.000Z"
      }
    ]
  }
}
```

**Business Logic:**
- Returns all reservations for boardings owned by authenticated user
- Fetches owner's boardings first, then finds reservations for those boardings
- Returns empty array if owner has no boardings
- Sorted by creation date (newest first)

**Error Responses:**

Unauthorized (401):
```json
{
  "success": false,
  "error": {
    "code": "UNAUTHORIZED",
    "message": "Unauthorized: Please provide a valid authentication token"
  }
}
```

---

### 4. Get Reservation by ID

**Endpoint:** `GET /api/reservations/:id`

**Description:** Retrieve details of a specific reservation.

**Authentication:** ✅ Required (Bearer token)

**Authorization:** Student (own reservation), Owner (boarding owner), or Admin

**Path Parameters:**

| Parameter | Type | Required |
|-----------|------|----------|
| `id` | string | ✅ |

**Request Example:**
```bash
GET /api/reservations/507f1f77bcf86cd799439101
Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR...
```

**Success Response (200 OK):**
```json
{
  "success": true,
  "data": {
    "reservation": {
      "id": "507f1f77bcf86cd799439101",
      "studentId": "507f1f77bcf86cd799439201",
      "student": {
        "id": "507f1f77bcf86cd799439201",
        "firstName": "Ahmed",
        "lastName": "Hassan",
        "email": "ahmed.hassan@example.com"
      },
      "boardingId": "507f1f77bcf86cd799439011",
      "boarding": {
        "id": "507f1f77bcf86cd799439011",
        "title": "Beautiful Boarding House Near University",
        "slug": "beautiful-boarding-house-near-university",
        "city": "Colombo",
        "district": "Colombo"
      },
      "status": "ACTIVE",
      "moveInDate": "2026-04-15",
      "specialRequests": "I have a dog, would that be okay?",
      "rentSnapshot": 15000,
      "boardingSnapshot": {
        "id": "507f1f77bcf86cd799439011",
        "title": "Beautiful Boarding House Near University",
        "slug": "beautiful-boarding-house-near-university",
        "city": "Colombo",
        "district": "Colombo",
        "address": "123 Main Street, Colombo 7",
        "boardingType": "SHARED_ROOM",
        "genderPref": "ANY",
        "monthlyRent": 15000,
        "maxOccupants": 3,
        "nearUniversity": "Colombo University"
      },
      "rejectionReason": null,
      "expiresAt": "2026-04-09T08:30:00.000Z",
      "createdAt": "2026-04-06T08:30:00.000Z",
      "updatedAt": "2026-04-06T10:45:00.000Z"
    }
  }
}
```

**Business Logic:**
- Returns full reservation details with student and boarding info
- Validates user is either the student, boarding owner, or admin
- Returns boarding snapshot from time of reservation creation

**Error Responses:**

Reservation not found (404):
```json
{
  "success": false,
  "error": {
    "code": "NOT_FOUND",
    "message": "Reservation not found"
  }
}
```

Access denied (403):
```json
{
  "success": false,
  "error": {
    "code": "FORBIDDEN",
    "message": "Access denied"
  }
}
```

---

### 5. Approve Reservation

**Endpoint:** `PATCH /api/reservations/:id/approve`

**Description:** Approve a pending reservation. Transitions from PENDING to ACTIVE and generates rental periods.

**Authentication:** ✅ Required (Bearer token)

**Authorization:** `OWNER` role (must own the boarding)

**Path Parameters:**

| Parameter | Type | Required |
|-----------|------|----------|
| `id` | string | ✅ |

**Request Example:**
```bash
PATCH /api/reservations/507f1f77bcf86cd799439101/approve
Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR...
```

**Success Response (200 OK):**
```json
{
  "success": true,
  "message": "Reservation approved",
  "data": {
    "reservation": {
      "id": "507f1f77bcf86cd799439101",
      "studentId": "507f1f77bcf86cd799439201",
      "student": {
        "id": "507f1f77bcf86cd799439201",
        "firstName": "Ahmed",
        "lastName": "Hassan",
        "email": "ahmed.hassan@example.com"
      },
      "boardingId": "507f1f77bcf86cd799439011",
      "boarding": {
        "id": "507f1f77bcf86cd799439011",
        "title": "Beautiful Boarding House Near University",
        "slug": "beautiful-boarding-house-near-university",
        "city": "Colombo",
        "district": "Colombo"
      },
      "status": "ACTIVE",
      "moveInDate": "2026-04-15",
      "specialRequests": "I have a dog, would that be okay?",
      "rentSnapshot": 15000,
      "rejectionReason": null,
      "expiresAt": "2026-04-09T08:30:00.000Z",
      "createdAt": "2026-04-06T08:30:00.000Z",
      "updatedAt": "2026-04-06T11:00:00.000Z"
    }
  },
  "timestamp": "2026-04-06T11:00:00.000Z"
}
```

**Business Logic:**
- Only PENDING reservations can be approved
- Validates reservation hasn't expired (72 hours)
- Validates boarding still has available capacity
- Increments boarding `currentOccupants` by 1
- Generates 12 rental periods starting from move-in date
- Each period covers 1 month with monthly rent as amount due
- Period labels in format: "YYYY-MM"

**Rental Period Generation Example:**
```
Period 1: 2026-04 (April 2026), Due: 2026-04-15, Amount: 15000
Period 2: 2026-05 (May 2026), Due: 2026-05-01, Amount: 15000
Period 3: 2026-06 (June 2026), Due: 2026-06-01, Amount: 15000
... (up to 12 periods)
```

**Error Responses:**

Reservation not found (404):
```json
{
  "success": false,
  "error": {
    "code": "NOT_FOUND",
    "message": "Reservation not found"
  }
}
```

Not the owner (403):
```json
{
  "success": false,
  "error": {
    "code": "FORBIDDEN",
    "message": "You do not own this boarding"
  }
}
```

Invalid status (400):
```json
{
  "success": false,
  "error": {
    "code": "BAD_REQUEST",
    "message": "Only PENDING reservations can be approved"
  }
}
```

Reservation expired (400):
```json
{
  "success": false,
  "error": {
    "code": "BAD_REQUEST",
    "message": "Reservation has expired"
  }
}
```

Boarding is full (409):
```json
{
  "success": false,
  "error": {
    "code": "CONFLICT",
    "message": "Boarding is full"
  }
}
```

---

### 6. Reject Reservation

**Endpoint:** `PATCH /api/reservations/:id/reject`

**Description:** Reject a pending reservation with a reason.

**Authentication:** ✅ Required (Bearer token)

**Authorization:** `OWNER` role (must own the boarding)

**Path Parameters:**

| Parameter | Type | Required |
|-----------|------|----------|
| `id` | string | ✅ |

**Request Body:**

| Field | Type | Required | Constraints |
|-------|------|----------|-------------|
| `reason` | string | ✅ | Min 1 character |

**Request Example:**
```bash
PATCH /api/reservations/507f1f77bcf86cd799439101/reject
Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR...
Content-Type: application/json

{
  "reason": "Owner currently not accepting students with pets"
}
```

**Success Response (200 OK):**
```json
{
  "success": true,
  "message": "Reservation rejected",
  "data": {
    "reservation": {
      "id": "507f1f77bcf86cd799439101",
      "studentId": "507f1f77bcf86cd799439201",
      "student": {
        "id": "507f1f77bcf86cd799439201",
        "firstName": "Ahmed",
        "lastName": "Hassan",
        "email": "ahmed.hassan@example.com"
      },
      "boardingId": "507f1f77bcf86cd799439011",
      "boarding": {
        "id": "507f1f77bcf86cd799439011",
        "title": "Beautiful Boarding House Near University",
        "slug": "beautiful-boarding-house-near-university",
        "city": "Colombo",
        "district": "Colombo"
      },
      "status": "REJECTED",
      "moveInDate": "2026-04-15",
      "specialRequests": "I have a dog, would that be okay?",
      "rentSnapshot": 15000,
      "rejectionReason": "Owner currently not accepting students with pets",
      "expiresAt": "2026-04-09T08:30:00.000Z",
      "createdAt": "2026-04-06T08:30:00.000Z",
      "updatedAt": "2026-04-06T11:05:00.000Z"
    }
  }
}
```

**Business Logic:**
- Only PENDING reservations can be rejected
- Stores rejection reason in `rejectionReason` field
- Transitions status to REJECTED
- Does not affect boarding occupancy
- Student can create new reservation for same boarding after rejection

**Error Responses:**

Reservation not found (404):
```json
{
  "success": false,
  "error": {
    "code": "NOT_FOUND",
    "message": "Reservation not found"
  }
}
```

Not the owner (403):
```json
{
  "success": false,
  "error": {
    "code": "FORBIDDEN",
    "message": "You do not own this boarding"
  }
}
```

Invalid status (400):
```json
{
  "success": false,
  "error": {
    "code": "BAD_REQUEST",
    "message": "Only PENDING reservations can be rejected"
  }
}
```

---

### 7. Cancel Reservation

**Endpoint:** `PATCH /api/reservations/:id/cancel`

**Description:** Cancel a reservation as a student. Only available for PENDING or ACTIVE reservations.

**Authentication:** ✅ Required (Bearer token)

**Authorization:** `STUDENT` role (must own the reservation)

**Path Parameters:**

| Parameter | Type | Required |
|-----------|------|----------|
| `id` | string | ✅ |

**Request Example:**
```bash
PATCH /api/reservations/507f1f77bcf86cd799439101/cancel
Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR...
```

**Success Response (200 OK):**
```json
{
  "success": true,
  "message": "Reservation cancelled",
  "data": {
    "reservation": {
      "id": "507f1f77bcf86cd799439101",
      "studentId": "507f1f77bcf86cd799439201",
      "student": {
        "id": "507f1f77bcf86cd799439201",
        "firstName": "Ahmed",
        "lastName": "Hassan",
        "email": "ahmed.hassan@example.com"
      },
      "boardingId": "507f1f77bcf86cd799439011",
      "boarding": {
        "id": "507f1f77bcf86cd799439011",
        "title": "Beautiful Boarding House Near University",
        "slug": "beautiful-boarding-house-near-university",
        "city": "Colombo",
        "district": "Colombo"
      },
      "status": "CANCELLED",
      "moveInDate": "2026-04-15",
      "specialRequests": "I have a dog, would that be okay?",
      "rentSnapshot": 15000,
      "rejectionReason": null,
      "expiresAt": "2026-04-09T08:30:00.000Z",
      "createdAt": "2026-04-06T08:30:00.000Z",
      "updatedAt": "2026-04-06T11:10:00.000Z"
    }
  }
}
```

**Business Logic:**
- Only PENDING or ACTIVE reservations can be cancelled
- If reservation was ACTIVE, decrements boarding `currentOccupants` by 1
- Uses MongoDB transaction for consistency
- Student must own the reservation

**Error Responses:**

Reservation not found (404):
```json
{
  "success": false,
  "error": {
    "code": "NOT_FOUND",
    "message": "Reservation not found"
  }
}
```

Not the owner (403):
```json
{
  "success": false,
  "error": {
    "code": "FORBIDDEN",
    "message": "This is not your reservation"
  }
}
```

Invalid status (400):
```json
{
  "success": false,
  "error": {
    "code": "BAD_REQUEST",
    "message": "Only PENDING or ACTIVE reservations can be cancelled"
  }
}
```

---

### 8. Complete Reservation

**Endpoint:** `PATCH /api/reservations/:id/complete`

**Description:** Mark an active reservation as completed. Used when tenant moves out.

**Authentication:** ✅ Required (Bearer token)

**Authorization:** `OWNER` role (must own the boarding)

**Path Parameters:**

| Parameter | Type | Required |
|-----------|------|----------|
| `id` | string | ✅ |

**Request Example:**
```bash
PATCH /api/reservations/507f1f77bcf86cd799439101/complete
Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR...
```

**Success Response (200 OK):**
```json
{
  "success": true,
  "message": "Reservation completed",
  "data": {
    "reservation": {
      "id": "507f1f77bcf86cd799439101",
      "studentId": "507f1f77bcf86cd799439201",
      "student": {
        "id": "507f1f77bcf86cd799439201",
        "firstName": "Ahmed",
        "lastName": "Hassan",
        "email": "ahmed.hassan@example.com"
      },
      "boardingId": "507f1f77bcf86cd799439011",
      "boarding": {
        "id": "507f1f77bcf86cd799439011",
        "title": "Beautiful Boarding House Near University",
        "slug": "beautiful-boarding-house-near-university",
        "city": "Colombo",
        "district": "Colombo"
      },
      "status": "COMPLETED",
      "moveInDate": "2026-04-15",
      "specialRequests": "I have a dog, would that be okay?",
      "rentSnapshot": 15000,
      "rejectionReason": null,
      "expiresAt": "2026-04-09T08:30:00.000Z",
      "createdAt": "2026-04-06T08:30:00.000Z",
      "updatedAt": "2026-05-20T14:30:00.000Z"
    }
  }
}
```

**Business Logic:**
- Only ACTIVE reservations can be completed
- Decrements boarding `currentOccupants` by 1
- Uses MongoDB transaction for consistency
- Marks the end of tenancy
- Rental periods remain accessible for payment tracking

**Error Responses:**

Reservation not found (404):
```json
{
  "success": false,
  "error": {
    "code": "NOT_FOUND",
    "message": "Reservation not found"
  }
}
```

Not the owner (403):
```json
{
  "success": false,
  "error": {
    "code": "FORBIDDEN",
    "message": "You do not own this boarding"
  }
}
```

Invalid status (400):
```json
{
  "success": false,
  "error": {
    "code": "BAD_REQUEST",
    "message": "Only ACTIVE reservations can be completed"
  }
}
```

---

### 9. Get Rental Periods

**Endpoint:** `GET /api/reservations/:resId/rental-periods`

**Description:** Retrieve rental periods (monthly payments) for an active reservation.

**Authentication:** ✅ Required (Bearer token)

**Authorization:** Student (own reservation), Owner (boarding owner), or Admin

**Path Parameters:**

| Parameter | Type | Required |
|-----------|------|----------|
| `resId` | string | ✅ |

**Request Example:**
```bash
GET /api/reservations/507f1f77bcf86cd799439101/rental-periods
Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR...
```

**Success Response (200 OK):**
```json
{
  "success": true,
  "data": {
    "rentalPeriods": [
      {
        "id": "507f1f77bcf86cd799439301",
        "reservationId": "507f1f77bcf86cd799439101",
        "periodLabel": "2026-04",
        "dueDate": "2026-04-15",
        "amountDue": 15000,
        "status": "DUE",
        "payments": [
          {
            "id": "507f1f77bcf86cd799439401",
            "amount": 7500,
            "paymentMethod": "BANK_TRANSFER",
            "status": "CONFIRMED",
            "paidAt": "2026-04-14T10:30:00.000Z",
            "confirmedAt": "2026-04-14T11:00:00.000Z"
          }
        ],
        "createdAt": "2026-04-06T12:00:00.000Z",
        "updatedAt": "2026-04-14T11:00:00.000Z"
      },
      {
        "id": "507f1f77bcf86cd799439302",
        "reservationId": "507f1f77bcf86cd799439101",
        "periodLabel": "2026-05",
        "dueDate": "2026-05-01",
        "amountDue": 15000,
        "status": "UPCOMING",
        "payments": [],
        "createdAt": "2026-04-06T12:00:00.000Z",
        "updatedAt": "2026-04-06T12:00:00.000Z"
      },
      {
        "id": "507f1f77bcf86cd799439303",
        "reservationId": "507f1f77bcf86cd799439101",
        "periodLabel": "2026-06",
        "dueDate": "2026-06-01",
        "amountDue": 15000,
        "status": "UPCOMING",
        "payments": [],
        "createdAt": "2026-04-06T12:00:00.000Z",
        "updatedAt": "2026-04-06T12:00:00.000Z"
      }
    ]
  }
}
```

**Business Logic:**
- Returns rental periods for a specific reservation
- Validates user is either the student, boarding owner, or admin
- Includes associated payments for each period
- Sorted by due date (earliest first)
- Statuses determined by:
  - `UPCOMING`: Not yet due
  - `DUE`: Due date reached
  - `PARTIALLY_PAID`: Some payment received
  - `PAID`: Full payment received
  - `OVERDUE`: Past due date without full payment

**Error Responses:**

Reservation not found (404):
```json
{
  "success": false,
  "error": {
    "code": "NOT_FOUND",
    "message": "Reservation not found"
  }
}
```

Access denied (403):
```json
{
  "success": false,
  "error": {
    "code": "FORBIDDEN",
    "message": "Access denied"
  }
}
```

---

## Status Workflow

### Reservation Status Transitions

```
                     ┌─────────────────────────┐
                     │        PENDING          │
                     │ (Awaiting approval)     │
                     └──────────┬──────────────┘
                                │
                    ┌───────────┴────────────┐
                    │                        │
                    ▼                        ▼
            ┌──────────────┐        ┌──────────────┐
            │   ACTIVE     │        │  REJECTED    │
            │ (Approved)   │        │ (Denied)     │
            └──┬───────────┘        └──────────────┘
               │
        ┌──────┴──────────┐
        │                 │
        ▼                 ▼
    ┌────────────┐   ┌──────────┐
    │ COMPLETED  │   │CANCELLED │
    │ (Moved out)│   │(Cancelled)│
    └────────────┘   └──────────┘

Also possible: PENDING → EXPIRED (not approved within 72 hours)
```

### Timeline for Approval

1. **Student creates reservation** → Status: `PENDING`
2. **Owner approves within 72 hours** → Status: `ACTIVE` + Rental periods generated
3. **Student moves in** → Rental periods start (monthly payments due)
4. **Owner marks complete** → Status: `COMPLETED`

---

## Rental Period Lifecycle

### Payment Period States

```
┌──────────────┐
│   UPCOMING   │ ← Before due date
└──────┬───────┘
       │ (Due date reached)
       ▼
┌──────────────┐
│     DUE      │ ← On due date
└──────┬───────┘
       │ (Partial/Full payment received)
       ├─────────────────────┐
       ▼                     ▼
┌────────────────┐   ┌──────────────┐
│ PARTIALLY_PAID │   │    PAID      │ ← Done
└────────────────┘   └──────────────┘
       │
       │ (Payment not made, past due date)
       ▼
┌──────────────┐
│   OVERDUE    │ ← Late payment
└──────────────┘
```

---

## Key Business Rules

### Reservation Creation
- Move-in date must be at least 1 day in future
- Boarding must be ACTIVE and have available capacity
- Student cannot have another ACTIVE reservation
- Student cannot have multiple requests for same boarding
- Reservation expires after 72 hours if not approved

### Approval
- Only PENDING reservations can be approved
- Boarding must still have available capacity at approval time
- Generates 12 rental periods of 1 month each
- Increments boarding occupancy immediately

### Rejection
- Only PENDING reservations can be rejected
- Requires rejection reason
- Does not affect boarding occupancy
- Student can reapply to same boarding

### Cancellation
- Student can cancel PENDING or ACTIVE reservations
- Cancelled ACTIVE reservations decrement occupancy
- Only student who created reservation can cancel

### Completion
- Only OWNER can mark ACTIVE reservations as completed
- Decrements boarding occupancy
- Marks end of tenancy

---

## Example Workflows

### Workflow 1: Complete Reservation Process

```bash
# Step 1: Student creates reservation request
POST /api/reservations
Authorization: Bearer <student_token>
{
  "boardingId": "507f1f77bcf86cd799439011",
  "moveInDate": "2026-04-15",
  "specialRequests": "Prefer upper floor"
}
# Response: 201 Created, status: PENDING, expires in 72 hours

# Step 2: Owner approves reservation
PATCH /api/reservations/{id}/approve
Authorization: Bearer <owner_token>
# Response: 200 OK, status: ACTIVE
# Rental periods generated automatically

# Step 3: Student checks rental schedule
GET /api/reservations/{id}/rental-periods
Authorization: Bearer <student_token>
# Response: 200 OK, list of 12 monthly periods

# Step 4: Months pass, student makes payments (via Payment API)

# Step 5: Owner marks complete when tenant moves out
PATCH /api/reservations/{id}/complete
Authorization: Bearer <owner_token>
# Response: 200 OK, status: COMPLETED
```

### Workflow 2: Rejected Reservation

```bash
# Step 1: Student creates request
POST /api/reservations
Authorization: Bearer <student_token>
{
  "boardingId": "507f1f77bcf86cd799439011",
  "moveInDate": "2026-04-15"
}
# Response: 201 Created, status: PENDING

# Step 2: Owner rejects
PATCH /api/reservations/{id}/reject
Authorization: Bearer <owner_token>
{
  "reason": "Owner has personal reasons"
}
# Response: 200 OK, status: REJECTED, rejectionReason set

# Step 3: Student retrieves reason and tries another boarding
GET /api/reservations/my-requests
Authorization: Bearer <student_token>
# Response: Shows rejection reason in previous reservation
```

### Workflow 3: Student Cancellation

```bash
# Scenario: Student changes mind after reservation approved

# Student cancels active reservation
PATCH /api/reservations/{id}/cancel
Authorization: Bearer <student_token>
# Response: 200 OK, status: CANCELLED
# Boarding occupancy decremented immediately

# Owner can now approve another student for same boarding
```

---

## Common Validation Rules

### Move-In Date
- **Requirement:** Required
- **Format:** YYYY-MM-DD
- **Constraint:** Must be at least 1 day in future
- **Use Case:** Prevents past-dated reservations

### Special Requests
- **Requirement:** Optional
- **Max Length:** 1000 characters
- **Use Case:** Student can communicate preferences to owner

### Rejection Reason
- **Requirement:** Required when rejecting
- **Min Length:** 1 character
- **Use Case:** Explains why owner rejected reservation

---

## Data Models

### Reservation Fields

```typescript
{
  id: ObjectId,
  studentId: ObjectId,              // Student who created
  boardingId: ObjectId,             // Boarding being reserved
  status: ReservationStatus,        // PENDING, ACTIVE, etc.
  moveInDate: Date,                 // When student moves in
  specialRequests: string,          // Optional notes from student
  rentSnapshot: number,             // Monthly rent at creation
  boardingSnapshot: object,         // Boarding info at creation
  rejectionReason: string,          // Why rejected (if applicable)
  expiresAt: Date,                  // 72 hours from creation
  createdAt: Date,
  updatedAt: Date
}
```

### Rental Period Fields

```typescript
{
  id: ObjectId,
  reservationId: ObjectId,          // Associated reservation
  periodLabel: string,              // "2026-04", "2026-05", etc.
  dueDate: Date,                    // When payment is due
  amountDue: number,                // Monthly rent amount
  status: RentalPeriodStatus,       // UPCOMING, DUE, PAID, etc.
  payments: IPayment[],             // Related payments (virtual)
  createdAt: Date,
  updatedAt: Date
}
```

---

## Security Considerations

1. **Authentication:** All endpoints require JWT tokens
2. **Authorization:** Strict role-based access (Student, Owner, Admin)
3. **Ownership Validation:** Every request validates user relationship
4. **Data Snapshot:** Boarding info stored at reservation time (price guarantee)
5. **Transaction Safety:** Critical operations use MongoDB transactions
6. **Rate Limiting:** All endpoints subject to reservationLimiter

---

## Dependencies & Integrations

### Models Used
- `Reservation`: Main reservation document
- `RentalPeriod`: Monthly payment periods
- `Boarding`: Boarding accommodation details
- `Payment`: Payment records (related via RentalPeriod)

### Related APIs
- **Payments API:** For processing rental period payments
- **Boardings API:** For boarding details and availability
- **Users API:** For student and owner information

---

## Performance Tips

1. **Use pagination** when retrieving multiple reservations
2. **Filter by status** to reduce query results
3. **Cache rental period information** on client side
4. **Use `/my-requests` for students** instead of searching all
5. **Batch approve operations** when possible

---

## Troubleshooting

| Issue | Solution |
|-------|----------|
| Reservation expired | Recreate reservation within 72 hours of expiry |
| Cannot approve reservation | Check if boarding still has availability |
| Cannot cancel ACTIVE | Only students can cancel their own reservations |
| Cannot complete reservation | Only owner of boarding can mark complete |
| Access denied error | Verify you're authorized for this reservation |
| Move-in date rejected | Ensure date is at least 1 day in future |
| Already have active reservation | Cancel previous reservation first |

---

## Changelog & Version History

- **v1.0.0 (2026-04-06)**: Initial Reservation API release
  - Reservation creation and lifecycle management
  - Owner approval/rejection workflow
  - Automatic rental period generation
  - Student cancellation support
  - Access control and ownership validation

---

## Support & Contact

For issues or questions:
- Check the [Troubleshooting](#troubleshooting) section
- Review [Key Business Rules](#key-business-rules)
- Verify [Status Workflow](#status-workflow)
- Consult example workflows section
- Contact development team for additional support
