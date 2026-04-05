# Visit Request API Documentation

## Base URL
```
/api/visit-requests
```

## Overview
The Visit Request API allows students to request in-person visits to active boarding listings and allows owners to approve or reject those requests. It supports full lifecycle management including cancellation and automatic expiry handling.

---

## Table of Contents
1. [Authentication & Authorization](#authentication--authorization)
2. [Rate Limiting](#rate-limiting)
3. [Enums & Constants](#enums--constants)
4. [Error Responses](#error-responses)
5. [Endpoints](#endpoints)
6. [Status Lifecycle](#status-lifecycle)
7. [Validation Rules](#validation-rules)

---

## Authentication & Authorization

### Authentication Requirement
- All visit request endpoints require JWT authentication via `Authorization: Bearer <token>` header.

### Authorization Roles

| Endpoint | Required Role | Description |
|----------|---------------|-------------|
| `POST /api/visit-requests` | STUDENT | Create a new visit request |
| `GET /api/visit-requests/my-requests` | STUDENT | List student's own visit requests |
| `GET /api/visit-requests/my-boardings` | OWNER | List visit requests for owner's boardings |
| `GET /api/visit-requests/:id` | Any authenticated user (with ownership checks) | Get request by ID |
| `PATCH /api/visit-requests/:id/approve` | OWNER | Approve visit request |
| `PATCH /api/visit-requests/:id/reject` | OWNER | Reject visit request |
| `PATCH /api/visit-requests/:id/cancel` | STUDENT | Cancel own request |

### Access Rules for `GET /:id`
- `ADMIN`: Can view any visit request.
- `STUDENT`: Can only view own request.
- `OWNER`: Can only view requests for their own boarding listings.

---

## Rate Limiting

All visit request endpoints are protected by the `visitRequestLimiter` middleware.

---

## Enums & Constants

### VisitRequestStatus
```typescript
enum VisitRequestStatus {
  PENDING = "PENDING",      // Newly created, waiting owner action
  APPROVED = "APPROVED",    // Owner accepted request
  REJECTED = "REJECTED",    // Owner rejected with reason
  CANCELLED = "CANCELLED",  // Student cancelled request
  EXPIRED = "EXPIRED"       // Pending request expired
}
```

### Internal Expiry Configuration
```typescript
VISIT_EXPIRY_HOURS = 72  // Visit request expires 72 hours after creation
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

### Common Error Cases

| Scenario | HTTP Status | Message |
|----------|-------------|---------|
| Boarding not found/deleted | 404 | `Boarding not found` |
| Visit request not found | 404 | `Visit request not found` |
| Boarding not active | 400 | `Boarding is not available for visit requests` |
| Duplicate pending request | 409 | `You already have a pending visit request for this boarding` |
| Invalid time range | 400 | `requestedStartAt must be in the future` / `requestedEndAt must be after requestedStartAt` |
| Non-owner approval/rejection attempt | 403 | `You do not own this boarding` |
| Non-student cancel attempt | 403 | `This is not your visit request` |
| Expired approval attempt | 410 | `Visit request has expired` |
| Invalid state transition | 400 | State-specific validation message |
| Unauthorized access | 403/401 | `User is not authenticated` / auth middleware error |

---

## Endpoints

### 1. Create Visit Request

**Endpoint:** `POST /api/visit-requests`

**Description:** Create a new visit request for an active boarding.

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
| `boardingId` | string | ✅ | Valid non-empty MongoDB ObjectId string |
| `requestedStartAt` | string | ✅ | ISO datetime, must be in the future |
| `requestedEndAt` | string | ✅ | ISO datetime, must be after `requestedStartAt` |
| `message` | string | ❌ | Max 1000 chars |

**Request Example:**
```bash
POST /api/visit-requests
Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR...
Content-Type: application/json

{
  "boardingId": "507f1f77bcf86cd799439011",
  "requestedStartAt": "2026-04-09T09:00:00.000Z",
  "requestedEndAt": "2026-04-09T10:00:00.000Z",
  "message": "I would like to inspect the room and facilities before booking."
}
```

**Success Response (201 Created):**
```json
{
  "success": true,
  "message": "Visit request created successfully",
  "data": {
    "visitRequest": {
      "id": "507f1f77bcf86cd799439301",
      "studentId": {
        "id": "507f1f77bcf86cd799439001",
        "firstName": "Ahmed",
        "lastName": "Hassan",
        "email": "ahmed.hassan@example.com"
      },
      "boardingId": {
        "id": "507f1f77bcf86cd799439011",
        "title": "Beautiful Boarding House Near University",
        "slug": "beautiful-boarding-house-near-university",
        "city": "Colombo",
        "district": "Colombo"
      },
      "status": "PENDING",
      "requestedStartAt": "2026-04-09T09:00:00.000Z",
      "requestedEndAt": "2026-04-09T10:00:00.000Z",
      "message": "I would like to inspect the room and facilities before booking.",
      "rejectionReason": null,
      "expiresAt": "2026-04-09T08:30:00.000Z",
      "createdAt": "2026-04-06T08:30:00.000Z",
      "updatedAt": "2026-04-06T08:30:00.000Z"
    }
  }
}
```

**Business Logic:**
- Only active, non-deleted boardings can receive visit requests.
- `requestedStartAt` must be later than current time.
- `requestedEndAt` must be later than `requestedStartAt`.
- One student cannot have multiple `PENDING` requests for the same boarding.
- `expiresAt` is set to current time + 72 hours.
- Initial status is `PENDING`.

**Validation/Error Examples:**

Duplicate pending request (409):
```json
{
  "success": false,
  "error": {
    "code": "CONFLICT_ERROR",
    "message": "You already have a pending visit request for this boarding"
  }
}
```

Start time not in future (400):
```json
{
  "success": false,
  "error": {
    "code": "BAD_REQUEST",
    "message": "requestedStartAt must be in the future"
  }
}
```

End time before start time (400):
```json
{
  "success": false,
  "error": {
    "code": "BAD_REQUEST",
    "message": "requestedEndAt must be after requestedStartAt"
  }
}
```

Boarding inactive (400):
```json
{
  "success": false,
  "error": {
    "code": "BAD_REQUEST",
    "message": "Boarding is not available for visit requests"
  }
}
```

---

### 2. Get My Visit Requests

**Endpoint:** `GET /api/visit-requests/my-requests`

**Description:** Retrieve all visit requests created by the authenticated student.

**Authentication:** ✅ Required

**Authorization:** `STUDENT` role

**Request Example:**
```bash
GET /api/visit-requests/my-requests
Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR...
```

**Success Response (200 OK):**
```json
{
  "success": true,
  "data": {
    "visitRequests": [
      {
        "id": "507f1f77bcf86cd799439301",
        "studentId": {
          "id": "507f1f77bcf86cd799439001",
          "firstName": "Ahmed",
          "lastName": "Hassan",
          "email": "ahmed.hassan@example.com"
        },
        "boardingId": {
          "id": "507f1f77bcf86cd799439011",
          "title": "Beautiful Boarding House Near University",
          "slug": "beautiful-boarding-house-near-university",
          "city": "Colombo",
          "district": "Colombo"
        },
        "status": "APPROVED",
        "requestedStartAt": "2026-04-09T09:00:00.000Z",
        "requestedEndAt": "2026-04-09T10:00:00.000Z",
        "message": "I would like to inspect the room and facilities before booking.",
        "rejectionReason": null,
        "expiresAt": "2026-04-09T08:30:00.000Z",
        "createdAt": "2026-04-06T08:30:00.000Z",
        "updatedAt": "2026-04-06T10:00:00.000Z"
      },
      {
        "id": "507f1f77bcf86cd799439302",
        "studentId": {
          "id": "507f1f77bcf86cd799439001",
          "firstName": "Ahmed",
          "lastName": "Hassan",
          "email": "ahmed.hassan@example.com"
        },
        "boardingId": {
          "id": "507f1f77bcf86cd799439012",
          "title": "Cozy Single Room in City Center",
          "slug": "cozy-single-room-in-city-center",
          "city": "Colombo",
          "district": "Colombo"
        },
        "status": "REJECTED",
        "requestedStartAt": "2026-04-10T14:00:00.000Z",
        "requestedEndAt": "2026-04-10T15:00:00.000Z",
        "message": "Can I visit in the afternoon?",
        "rejectionReason": "Requested slot unavailable. Please choose another time.",
        "expiresAt": "2026-04-09T09:10:00.000Z",
        "createdAt": "2026-04-06T09:10:00.000Z",
        "updatedAt": "2026-04-06T11:00:00.000Z"
      }
    ]
  }
}
```

**Business Logic:**
- Returns all statuses (`PENDING`, `APPROVED`, `REJECTED`, `CANCELLED`, `EXPIRED`).
- Sorted by newest first (`createdAt` descending).
- Includes populated student and boarding basic details.

---

### 3. Get Visit Requests for My Boardings

**Endpoint:** `GET /api/visit-requests/my-boardings`

**Description:** Retrieve all visit requests associated with boardings owned by authenticated owner.

**Authentication:** ✅ Required

**Authorization:** `OWNER` role

**Request Example:**
```bash
GET /api/visit-requests/my-boardings
Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR...
```

**Success Response (200 OK):**
```json
{
  "success": true,
  "data": {
    "visitRequests": [
      {
        "id": "507f1f77bcf86cd799439301",
        "studentId": {
          "id": "507f1f77bcf86cd799439001",
          "firstName": "Ahmed",
          "lastName": "Hassan",
          "email": "ahmed.hassan@example.com"
        },
        "boardingId": {
          "id": "507f1f77bcf86cd799439011",
          "title": "Beautiful Boarding House Near University",
          "slug": "beautiful-boarding-house-near-university",
          "city": "Colombo",
          "district": "Colombo"
        },
        "status": "PENDING",
        "requestedStartAt": "2026-04-09T09:00:00.000Z",
        "requestedEndAt": "2026-04-09T10:00:00.000Z",
        "message": "I would like to inspect the room and facilities before booking.",
        "rejectionReason": null,
        "expiresAt": "2026-04-09T08:30:00.000Z",
        "createdAt": "2026-04-06T08:30:00.000Z",
        "updatedAt": "2026-04-06T08:30:00.000Z"
      }
    ]
  }
}
```

**Business Logic:**
- First resolves all boardings owned by current owner.
- Returns empty list if owner has no boardings.
- Returns requests across all statuses for those boardings.
- Sorted by newest first.

---

### 4. Get Visit Request by ID

**Endpoint:** `GET /api/visit-requests/:id`

**Description:** Get a single visit request by ID with role/ownership checks.

**Authentication:** ✅ Required

**Authorization:** Any authenticated user (restricted by ownership/role checks)

**Path Parameters:**

| Parameter | Type | Required |
|-----------|------|----------|
| `id` | string | ✅ |

**Request Example:**
```bash
GET /api/visit-requests/507f1f77bcf86cd799439301
Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR...
```

**Success Response (200 OK):**
```json
{
  "success": true,
  "data": {
    "visitRequest": {
      "id": "507f1f77bcf86cd799439301",
      "studentId": {
        "id": "507f1f77bcf86cd799439001",
        "firstName": "Ahmed",
        "lastName": "Hassan",
        "email": "ahmed.hassan@example.com"
      },
      "boardingId": {
        "id": "507f1f77bcf86cd799439011",
        "title": "Beautiful Boarding House Near University",
        "slug": "beautiful-boarding-house-near-university",
        "city": "Colombo",
        "district": "Colombo"
      },
      "status": "PENDING",
      "requestedStartAt": "2026-04-09T09:00:00.000Z",
      "requestedEndAt": "2026-04-09T10:00:00.000Z",
      "message": "I would like to inspect the room and facilities before booking.",
      "rejectionReason": null,
      "expiresAt": "2026-04-09T08:30:00.000Z",
      "createdAt": "2026-04-06T08:30:00.000Z",
      "updatedAt": "2026-04-06T08:30:00.000Z"
    }
  }
}
```

**Access Control Logic:**
- Admin can access any record.
- Student can access only own visit request.
- Owner can access only visit requests for owned boardings.
- Otherwise returns `403 Access denied`.

**Error Example (Forbidden):**
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

### 5. Approve Visit Request

**Endpoint:** `PATCH /api/visit-requests/:id/approve`

**Description:** Approve a pending visit request as the boarding owner.

**Authentication:** ✅ Required

**Authorization:** `OWNER` role (must own boarding)

**Path Parameters:**

| Parameter | Type | Required |
|-----------|------|----------|
| `id` | string | ✅ |

**Request Example:**
```bash
PATCH /api/visit-requests/507f1f77bcf86cd799439301/approve
Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR...
```

**Success Response (200 OK):**
```json
{
  "success": true,
  "message": "Visit request approved",
  "data": {
    "visitRequest": {
      "id": "507f1f77bcf86cd799439301",
      "studentId": {
        "id": "507f1f77bcf86cd799439001",
        "firstName": "Ahmed",
        "lastName": "Hassan",
        "email": "ahmed.hassan@example.com"
      },
      "boardingId": {
        "id": "507f1f77bcf86cd799439011",
        "title": "Beautiful Boarding House Near University",
        "slug": "beautiful-boarding-house-near-university",
        "city": "Colombo",
        "district": "Colombo"
      },
      "status": "APPROVED",
      "requestedStartAt": "2026-04-09T09:00:00.000Z",
      "requestedEndAt": "2026-04-09T10:00:00.000Z",
      "message": "I would like to inspect the room and facilities before booking.",
      "rejectionReason": null,
      "expiresAt": "2026-04-09T08:30:00.000Z",
      "createdAt": "2026-04-06T08:30:00.000Z",
      "updatedAt": "2026-04-06T10:00:00.000Z"
    }
  }
}
```

**Business Logic:**
- Owner must own the boarding associated with request.
- Only `PENDING` requests can be approved.
- If current time is past `expiresAt`:
  - Request is auto-updated to `EXPIRED`.
  - API returns `410 Gone` (`Visit request has expired`).

**Error Examples:**

Not owner (403):
```json
{
  "success": false,
  "error": {
    "code": "FORBIDDEN",
    "message": "You do not own this boarding"
  }
}
```

Not pending (400):
```json
{
  "success": false,
  "error": {
    "code": "BAD_REQUEST",
    "message": "Only PENDING visit requests can be approved"
  }
}
```

Expired request (410):
```json
{
  "success": false,
  "error": {
    "code": "GONE",
    "message": "Visit request has expired"
  }
}
```

---

### 6. Reject Visit Request

**Endpoint:** `PATCH /api/visit-requests/:id/reject`

**Description:** Reject a pending visit request as the boarding owner.

**Authentication:** ✅ Required

**Authorization:** `OWNER` role (must own boarding)

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
PATCH /api/visit-requests/507f1f77bcf86cd799439301/reject
Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR...
Content-Type: application/json

{
  "reason": "Requested time slot is unavailable. Please select another window."
}
```

**Success Response (200 OK):**
```json
{
  "success": true,
  "message": "Visit request rejected",
  "data": {
    "visitRequest": {
      "id": "507f1f77bcf86cd799439301",
      "studentId": {
        "id": "507f1f77bcf86cd799439001",
        "firstName": "Ahmed",
        "lastName": "Hassan",
        "email": "ahmed.hassan@example.com"
      },
      "boardingId": {
        "id": "507f1f77bcf86cd799439011",
        "title": "Beautiful Boarding House Near University",
        "slug": "beautiful-boarding-house-near-university",
        "city": "Colombo",
        "district": "Colombo"
      },
      "status": "REJECTED",
      "requestedStartAt": "2026-04-09T09:00:00.000Z",
      "requestedEndAt": "2026-04-09T10:00:00.000Z",
      "message": "I would like to inspect the room and facilities before booking.",
      "rejectionReason": "Requested time slot is unavailable. Please select another window.",
      "expiresAt": "2026-04-09T08:30:00.000Z",
      "createdAt": "2026-04-06T08:30:00.000Z",
      "updatedAt": "2026-04-06T10:05:00.000Z"
    }
  }
}
```

**Business Logic:**
- Owner must own the target boarding.
- Only `PENDING` requests can be rejected.
- `reason` is required and stored as `rejectionReason`.

**Validation/Error Examples:**

Missing reason (400):
```json
{
  "success": false,
  "error": {
    "code": "VALIDATION_ERROR",
    "message": "Rejection reason is required"
  }
}
```

Not pending (400):
```json
{
  "success": false,
  "error": {
    "code": "BAD_REQUEST",
    "message": "Only PENDING visit requests can be rejected"
  }
}
```

---

### 7. Cancel Visit Request

**Endpoint:** `PATCH /api/visit-requests/:id/cancel`

**Description:** Cancel own visit request as student.

**Authentication:** ✅ Required

**Authorization:** `STUDENT` role (must own request)

**Path Parameters:**

| Parameter | Type | Required |
|-----------|------|----------|
| `id` | string | ✅ |

**Request Example:**
```bash
PATCH /api/visit-requests/507f1f77bcf86cd799439301/cancel
Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR...
```

**Success Response (200 OK):**
```json
{
  "success": true,
  "message": "Visit request cancelled",
  "data": {
    "visitRequest": {
      "id": "507f1f77bcf86cd799439301",
      "studentId": {
        "id": "507f1f77bcf86cd799439001",
        "firstName": "Ahmed",
        "lastName": "Hassan",
        "email": "ahmed.hassan@example.com"
      },
      "boardingId": {
        "id": "507f1f77bcf86cd799439011",
        "title": "Beautiful Boarding House Near University",
        "slug": "beautiful-boarding-house-near-university",
        "city": "Colombo",
        "district": "Colombo"
      },
      "status": "CANCELLED",
      "requestedStartAt": "2026-04-09T09:00:00.000Z",
      "requestedEndAt": "2026-04-09T10:00:00.000Z",
      "message": "I would like to inspect the room and facilities before booking.",
      "rejectionReason": null,
      "expiresAt": "2026-04-09T08:30:00.000Z",
      "createdAt": "2026-04-06T08:30:00.000Z",
      "updatedAt": "2026-04-06T09:45:00.000Z"
    }
  }
}
```

**Business Logic:**
- Student can only cancel their own request.
- Only `PENDING` or `APPROVED` requests can be cancelled.
- Cannot cancel `REJECTED`, `EXPIRED`, or already `CANCELLED` requests.

**Error Examples:**

Not owner student (403):
```json
{
  "success": false,
  "error": {
    "code": "FORBIDDEN",
    "message": "This is not your visit request"
  }
}
```

Invalid state (400):
```json
{
  "success": false,
  "error": {
    "code": "BAD_REQUEST",
    "message": "Only PENDING or APPROVED visit requests can be cancelled"
  }
}
```

---

## Status Lifecycle

```
PENDING
  ├─→ APPROVED   (owner via /approve)
  ├─→ REJECTED   (owner via /reject)
  ├─→ CANCELLED  (student via /cancel)
  └─→ EXPIRED    (auto on approve attempt if past expiresAt)

APPROVED
  └─→ CANCELLED  (student via /cancel)

REJECTED
  └─→ [terminal]

CANCELLED
  └─→ [terminal]

EXPIRED
  └─→ [terminal]
```

### Expiry Behavior
- Each request gets `expiresAt = createdAt + 72 hours`.
- Expiry is enforced when owner tries to approve:
  - If expired, request status is changed to `EXPIRED`.
  - API responds with `410 Gone`.

---

## Validation Rules

### `createVisitRequestSchema`
```typescript
{
  boardingId: string (required, min 1),
  requestedStartAt: string (ISO datetime),
  requestedEndAt: string (ISO datetime),
  message?: string (max 1000)
}
```

### `rejectVisitRequestSchema`
```typescript
{
  reason: string (required, min 1)
}
```

### Controller-Level Time Rules
- `requestedStartAt > now`
- `requestedEndAt > requestedStartAt`

---

## Data Model

### VisitRequest Fields

```typescript
{
  id: ObjectId,
  studentId: ObjectId,          // User reference
  boardingId: ObjectId,         // Boarding reference
  status: VisitRequestStatus,   // PENDING/APPROVED/REJECTED/CANCELLED/EXPIRED
  requestedStartAt: Date,
  requestedEndAt: Date,
  message?: string,
  rejectionReason?: string,
  expiresAt: Date,              // createdAt + 72h
  createdAt: Date,
  updatedAt: Date
}
```

### Indexes
```typescript
visitRequestSchema.index({ studentId: 1 });
visitRequestSchema.index({ boardingId: 1 });
visitRequestSchema.index({ status: 1 });
```

---

## Example Workflows

### Workflow 1: Student Creates and Owner Approves

```bash
# 1) Student creates visit request
POST /api/visit-requests
Authorization: Bearer <student-token>
{
  "boardingId": "507f1f77bcf86cd799439011",
  "requestedStartAt": "2026-04-09T09:00:00.000Z",
  "requestedEndAt": "2026-04-09T10:00:00.000Z",
  "message": "Looking to inspect room conditions."
}
# Response: 201 Created, status: PENDING

# 2) Owner checks incoming requests
GET /api/visit-requests/my-boardings
Authorization: Bearer <owner-token>
# Response: includes request with status PENDING

# 3) Owner approves request
PATCH /api/visit-requests/{id}/approve
Authorization: Bearer <owner-token>
# Response: 200 OK, status: APPROVED
```

### Workflow 2: Owner Rejects with Reason

```bash
# 1) Student creates request (PENDING)
POST /api/visit-requests
Authorization: Bearer <student-token>

# 2) Owner rejects
PATCH /api/visit-requests/{id}/reject
Authorization: Bearer <owner-token>
{
  "reason": "Requested slot unavailable. Please choose another time."
}
# Response: 200 OK, status: REJECTED, rejectionReason saved

# 3) Student sees rejection in own list
GET /api/visit-requests/my-requests
Authorization: Bearer <student-token>
```

### Workflow 3: Student Cancels Approved Request

```bash
# Request already APPROVED
PATCH /api/visit-requests/{id}/cancel
Authorization: Bearer <student-token>
# Response: 200 OK, status: CANCELLED
```

### Workflow 4: Approval Attempt After Expiry

```bash
# Request was PENDING but now expired (older than 72h)
PATCH /api/visit-requests/{id}/approve
Authorization: Bearer <owner-token>

# Server behavior:
# - updates status to EXPIRED
# - returns 410 Gone
{
  "success": false,
  "error": {
    "code": "GONE",
    "message": "Visit request has expired"
  }
}
```

---

## Security Considerations

1. All routes require authentication.
2. Role checks prevent cross-role operations.
3. Ownership checks enforce that:
   - students only manage their own requests,
   - owners only act on their own boardings.
4. Input is validated with Zod schemas.
5. State-transition guardrails prevent invalid lifecycle changes.
6. Expiry prevents stale pending requests from being approved indefinitely.

---

## Troubleshooting

| Issue | Likely Cause | Fix |
|------|--------------|-----|
| `requestedStartAt must be in the future` | Start time is current/past | Provide a future datetime |
| `requestedEndAt must be after requestedStartAt` | End time invalid | Increase end time |
| `You already have a pending visit request for this boarding` | Duplicate pending request exists | Wait for owner action or cancel existing request |
| `Boarding is not available for visit requests` | Boarding not ACTIVE | Request only active boardings |
| `Visit request has expired` | Approval attempted after 72h | Student should create a new request |
| `Only PENDING visit requests can be approved/rejected` | Request already moved to another status | Use valid next action for current status |
| `Only PENDING or APPROVED visit requests can be cancelled` | Request status is terminal | Create a new request if needed |
| `Access denied` | User is neither admin, request owner student, nor listing owner | Authenticate with correct account |

---

## Changelog & Version History

- **v1.0.0 (2026-04-06)**: Initial Visit Request API documentation
  - Create/list/get visit requests
  - Owner approval/rejection actions
  - Student cancellation action
  - 72-hour expiry behavior
  - Full status lifecycle and validation coverage
