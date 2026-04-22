# Boardings API Documentation

## Base URL
```
/api/boardings
```

## Overview
The Boardings API provides endpoints for managing accommodation listings. Features include searching, creating, updating, and managing boarding houses with images, amenities, and rules.

---

## Table of Contents
1. [Authentication](#authentication)
2. [Rate Limiting](#rate-limiting)
3. [Enums & Constants](#enums--constants)
4. [Error Responses](#error-responses)
5. [Endpoints](#endpoints)

---

## Authentication

### Authentication Requirement
- Most endpoints require JWT authentication via `Authorization: Bearer <token>` header
- Public endpoints: Search, Get by slug
- Owner-only endpoints: Create, Update, Submit, Delete Draft, Activate, Deactivate, Image operations

### Authorization Roles
- `OWNER`: Can create and manage boarding listings
- `ADMIN`: Can approve/reject boardings (separate admin endpoints)

---

## Rate Limiting

All boarding endpoints are subject to rate limiting via the `boardingLimiter` middleware.

---

## Enums & Constants

### BoardingStatus
```typescript
enum BoardingStatus {
  DRAFT = "DRAFT",                    // Initial state after creation
  PENDING_APPROVAL = "PENDING_APPROVAL", // Submitted by owner, awaiting admin review
  ACTIVE = "ACTIVE",                  // Approved and publicly visible
  INACTIVE = "INACTIVE",              // Deactivated by owner
  REJECTED = "REJECTED"               // Rejected by admin with reason
}
```

### Lifecycle Policy (Authoritative)
- Active listing edits use **auto-unpublish and re-review** policy:
  - `ACTIVE` listing update transitions to `PENDING_APPROVAL`
  - listing is hidden from public discovery until approved again
- Lifecycle transitions are centralized in backend workflow service.

### BoardingType
```typescript
enum BoardingType {
  SINGLE_ROOM = "SINGLE_ROOM",
  SHARED_ROOM = "SHARED_ROOM",
  ANNEX = "ANNEX",
  HOUSE = "HOUSE"
}
```

### GenderPref
```typescript
enum GenderPref {
  MALE = "MALE",
  FEMALE = "FEMALE",
  ANY = "ANY"
}
```

### BoardingAmenityType
```typescript
// All values are normalized to UPPERCASE with underscores (e.g., "Wi-Fi" → "WI_FI")
Amenities include: WI_FI, KITCHEN, LAUNDRY, PARKING, AC, FAN, BED, DESK, WARDROBE, 
BATHROOM, COMMON_AREA, GYM, SECURITY, etc.
```

### Constants
```typescript
MAX_BOARDING_IMAGES = 10  // Maximum images per boarding
SRI_LANKA_LAT_MIN = 5.9
SRI_LANKA_LAT_MAX = 9.9
SRI_LANKA_LNG_MIN = 79.5
SRI_LANKA_LNG_MAX = 81.9
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
| `BOARDING_NOT_FOUND` | 404 | Boarding with specified ID/slug does not exist |
| `FORBIDDEN` | 403 | User lacks permission (not owner, etc.) |
| `VALIDATION_ERROR` | 400 | Invalid input data |
| `INVALID_STATE_TRANSITION` | 400 | Invalid status transition for boarding |
| `UNAUTHORIZED` | 401 | Authentication required |
| `UNAUTHENTICATED_USER` | 401 | JWT token missing or invalid |

---

## Endpoints

### 1. Search Boardings (Public)

**Endpoint:** `GET /api/boardings`

**Description:** Search and filter active boarding listings with pagination.

**Authentication:** ❌ Not required

**Query Parameters:**

| Parameter | Type | Required | Default | Validation |
|-----------|------|----------|---------|-----------|
| `page` | number | ❌ | 1 | Must be positive integer |
| `size` | number | ❌ | 20 | Positive integer, max 100 |
| `city` | string | ❌ | - | Case-insensitive matching |
| `district` | string | ❌ | - | Case-insensitive matching |
| `minRent` | number | ❌ | - | Positive integer |
| `maxRent` | number | ❌ | - | Positive integer |
| `boardingType` | string | ❌ | - | One of: SINGLE_ROOM, SHARED_ROOM, ANNEX, HOUSE |
| `genderPref` | string | ❌ | - | One of: MALE, FEMALE, ANY |
| `amenities` | string[] | ❌ | - | Comma-separated or array format, normalized to uppercase |
| `nearUniversity` | string | ❌ | - | Case-insensitive matching |
| `search` | string | ❌ | - | Searches title and description |
| `sortBy` | string | ❌ | createdAt | One of: monthlyRent, createdAt |
| `sortDir` | string | ❌ | desc | One of: asc, desc |

**Request Example:**
```bash
GET /api/boardings?page=1&size=20&city=Colombo&minRent=5000&maxRent=50000&amenities=WI_FI,KITCHEN&sortBy=monthlyRent&sortDir=asc
```

**Success Response (200 OK):**
```json
{
  "success": true,
  "data": {
    "boarding": [
      {
        "id": "507f1f77bcf86cd799439011",
        "ownerId": "507f1f77bcf86cd799439001",
        "owner": {
          "id": "507f1f77bcf86cd799439001",
          "firstName": "John",
          "lastName": "Doe",
          "phone": "+94701234567"
        },
        "title": "Spacious 3-Room Boarding House Near University",
        "slug": "spacious-3-room-boarding-house-near-university",
        "description": "Beautiful boarding house located 2km from Colombo University with all modern amenities.",
        "city": "Colombo",
        "district": "Colombo",
        "address": "123 Main Street, Colombo 7",
        "monthlyRent": 15000,
        "boardingType": "SHARED_ROOM",
        "genderPref": "ANY",
        "nearUniversity": "Colombo University",
        "latitude": 6.9124,
        "longitude": 80.7701,
        "maxOccupants": 3,
        "currentOccupants": 1,
        "status": "ACTIVE",
        "rejectionReason": null,
        "isDeleted": false,
        "images": [
          {
            "id": "507f1f77bcf86cd799439021",
            "url": "https://res.cloudinary.com/...",
            "publicId": "unistay/boarding_123_1",
            "createdAt": "2026-02-27T08:16:57.000Z"
          }
        ],
        "amenities": [
          {
            "id": "507f1f77bcf86cd799439031",
            "name": "WI_FI",
            "createdAt": "2026-02-27T08:16:57.000Z"
          },
          {
            "id": "507f1f77bcf86cd799439032",
            "name": "KITCHEN",
            "createdAt": "2026-02-27T08:16:57.000Z"
          }
        ],
        "rules": [
          {
            "id": "507f1f77bcf86cd799439041",
            "rule": "No loud music after 10 PM",
            "createdAt": "2026-02-27T08:16:57.000Z"
          }
        ],
        "createdAt": "2026-02-27T08:16:57.000Z",
        "updatedAt": "2026-03-02T10:15:00.000Z"
      }
    ],
    "pagination": {
      "total": 150,
      "page": 1,
      "size": 20,
      "totalPages": 8
    }
  }
}
```

**Business Logic:**
- Only returns boardings with `status: ACTIVE` and `isDeleted: false`
- Filters support case-insensitive matching for city/district
- Amenities filter returns boardings containing ANY of the specified amenities
- Search filters on title and description fields
- Results are paginated and sorted

**Error Examples:**

Invalid page parameter:
```json
{
  "success": false,
  "error": {
    "code": "VALIDATION_ERROR",
    "message": "Expected number, received nan"
  }
}
```

---

### Lifecycle Utilities

**Endpoint:** `GET /api/boardings/lifecycle/spec`

**Description:** Returns authoritative lifecycle policy, transition matrix, and visibility rules.

**Authentication:** ❌ Not required

---

### Owner Lifecycle Commands

- `DELETE /api/boardings/:id`
- `PATCH /api/boardings/:id/submit`
- `PATCH /api/boardings/:id/deactivate`
- `PATCH /api/boardings/:id/activate`
- `PATCH /api/boardings/:id/archive`
- `PATCH /api/boardings/:id/restore`
- `GET /api/boardings/:id/status-history`

### 2. Get Boarding by Slug (Public)

**Endpoint:** `GET /api/boardings/:slug`

**Description:** Retrieve detailed information about a specific boarding by its unique slug.

**Authentication:** ❌ Not required

**Path Parameters:**

| Parameter | Type | Required | Validation |
|-----------|------|----------|-----------|
| `slug` | string | ✅ | URL-encoded unique boarding identifier |

**Request Example:**
```bash
GET /api/boardings/spacious-3-room-boarding-house-near-university
```

**Success Response (200 OK):**
```json
{
  "success": true,
  "data": {
    "boarding": {
      "id": "507f1f77bcf86cd799439011",
      "ownerId": "507f1f77bcf86cd799439001",
      "owner": {
        "id": "507f1f77bcf86cd799439001",
        "firstName": "John",
        "lastName": "Doe",
        "phone": "+94701234567"
      },
      "title": "Spacious 3-Room Boarding House Near University",
      "slug": "spacious-3-room-boarding-house-near-university",
      "description": "Beautiful boarding house located 2km from Colombo University with all modern amenities.",
      "city": "Colombo",
      "district": "Colombo",
      "address": "123 Main Street, Colombo 7",
      "monthlyRent": 15000,
      "boardingType": "SHARED_ROOM",
      "genderPref": "ANY",
      "nearUniversity": "Colombo University",
      "latitude": 6.9124,
      "longitude": 80.7701,
      "maxOccupants": 3,
      "currentOccupants": 1,
      "status": "ACTIVE",
      "rejectionReason": null,
      "isDeleted": false,
      "images": [
        {
          "id": "507f1f77bcf86cd799439021",
          "url": "https://res.cloudinary.com/...",
          "publicId": "unistay/boarding_123_1",
          "createdAt": "2026-02-27T08:16:57.000Z"
        },
        {
          "id": "507f1f77bcf86cd799439022",
          "url": "https://res.cloudinary.com/...",
          "publicId": "unistay/boarding_123_2",
          "createdAt": "2026-02-27T08:16:57.000Z"
        }
      ],
      "amenities": [
        {
          "id": "507f1f77bcf86cd799439031",
          "name": "WI_FI",
          "createdAt": "2026-02-27T08:16:57.000Z"
        },
        {
          "id": "507f1f77bcf86cd799439032",
          "name": "KITCHEN",
          "createdAt": "2026-02-27T08:16:57.000Z"
        },
        {
          "id": "507f1f77bcf86cd799439033",
          "name": "LAUNDRY",
          "createdAt": "2026-02-27T08:16:57.000Z"
        }
      ],
      "rules": [
        {
          "id": "507f1f77bcf86cd799439041",
          "rule": "No loud music after 10 PM",
          "createdAt": "2026-02-27T08:16:57.000Z"
        },
        {
          "id": "507f1f77bcf86cd799439042",
          "rule": "Guests must be informed to the owner",
          "createdAt": "2026-02-27T08:16:57.000Z"
        },
        {
          "id": "507f1f77bcf86cd799439043",
          "rule": "No cooking in rooms",
          "createdAt": "2026-02-27T08:16:57.000Z"
        }
      ],
      "createdAt": "2026-02-27T08:16:57.000Z",
      "updatedAt": "2026-03-02T10:15:00.000Z"
    }
  }
}
```

**Business Logic:**
- Returns full boarding details with owner information
- Only returns active boardings (`status: ACTIVE` and `isDeleted: false`)
- Includes all related images, amenities, and rules
- Populates owner details from User collection

**Error Responses:**

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

Deleted or inactive boarding:
```json
{
  "success": false,
  "error": {
    "code": "BOARDING_NOT_FOUND",
    "message": "Boarding not found"
  }
}
```

---

### 3. Get My Listings

**Endpoint:** `GET /api/boardings/my-listings`

**Description:** Retrieve all boardings owned by the authenticated user, regardless of status.

**Authentication:** ✅ Required (Bearer token)

**Authorization:** `OWNER` role

**Request Example:**
```bash
GET /api/boardings/my-listings
Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR...
```

**Success Response (200 OK):**
```json
{
  "success": true,
  "data": {
    "boardings": [
      {
        "id": "507f1f77bcf86cd799439011",
        "ownerId": "507f1f77bcf86cd799439001",
        "owner": {
          "id": "507f1f77bcf86cd799439001",
          "firstName": "John",
          "lastName": "Doe",
          "phone": "+94701234567"
        },
        "title": "Spacious 3-Room Boarding House Near University",
        "slug": "spacious-3-room-boarding-house-near-university",
        "description": "Beautiful boarding house located 2km from Colombo University with all modern amenities.",
        "city": "Colombo",
        "district": "Colombo",
        "address": "123 Main Street, Colombo 7",
        "monthlyRent": 15000,
        "boardingType": "SHARED_ROOM",
        "genderPref": "ANY",
        "nearUniversity": "Colombo University",
        "latitude": 6.9124,
        "longitude": 80.7701,
        "maxOccupants": 3,
        "currentOccupants": 1,
        "status": "ACTIVE",
        "rejectionReason": null,
        "isDeleted": false,
        "images": [
          {
            "id": "507f1f77bcf86cd799439021",
            "url": "https://res.cloudinary.com/...",
            "publicId": "unistay/boarding_123_1",
            "createdAt": "2026-02-27T08:16:57.000Z"
          }
        ],
        "amenities": [
          {
            "id": "507f1f77bcf86cd799439031",
            "name": "WI_FI",
            "createdAt": "2026-02-27T08:16:57.000Z"
          }
        ],
        "rules": [
          {
            "id": "507f1f77bcf86cd799439041",
            "rule": "No loud music after 10 PM",
            "createdAt": "2026-02-27T08:16:57.000Z"
          }
        ],
        "createdAt": "2026-02-27T08:16:57.000Z",
        "updatedAt": "2026-03-02T10:15:00.000Z"
      },
      {
        "id": "507f1f77bcf86cd799439012",
        "ownerId": "507f1f77bcf86cd799439001",
        "owner": {
          "id": "507f1f77bcf86cd799439001",
          "firstName": "John",
          "lastName": "Doe",
          "phone": "+94701234567"
        },
        "title": "Cozy Single Room in City Center",
        "slug": "cozy-single-room-in-city-center",
        "description": "Single room available in the heart of Colombo city.",
        "city": "Colombo",
        "district": "Colombo",
        "address": "456 City Road, Colombo 1",
        "monthlyRent": 12000,
        "boardingType": "SINGLE_ROOM",
        "genderPref": "FEMALE",
        "nearUniversity": "SLIIT",
        "latitude": 6.9245,
        "longitude": 80.7654,
        "maxOccupants": 1,
        "currentOccupants": 0,
        "status": "DRAFT",
        "rejectionReason": null,
        "isDeleted": false,
        "images": [],
        "amenities": [],
        "rules": [],
        "createdAt": "2026-03-01T14:20:00.000Z",
        "updatedAt": "2026-03-01T14:20:00.000Z"
      }
    ]
  }
}
```

**Business Logic:**
- Returns all boardings owned by authenticated user (not deleted)
- Includes boardings in all statuses (DRAFT, ACTIVE, INACTIVE, PENDING_APPROVAL, REJECTED)
- Sorted by creation date (newest first)
- Includes rejection reasons if applicable

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

Insufficient permissions (403):
```json
{
  "success": false,
  "error": {
    "code": "FORBIDDEN",
    "message": "Forbidden: You do not have permission to access this resource"
  }
}
```

---

### 4. Create Boarding

**Endpoint:** `POST /api/boardings`

**Description:** Create a new boarding listing. Initial status is DRAFT. In the initial release phase, owner onboarding is focused on SLIIT-area listings.

**Authentication:** ✅ Required (Bearer token)

**Authorization:** `OWNER` role

**Request Headers:**
```
Authorization: Bearer <token>
Content-Type: application/json
```

**Request Body:**

| Field | Type | Required | Constraints |
|-------|------|----------|-------------|
| `title` | string | ✅ | Min 10, Max 200 characters |
| `description` | string | ✅ | Min 30, Max 5000 characters |
| `city` | string | ✅ | Non-empty |
| `district` | string | ✅ | Non-empty |
| `address` | string | ❌ | - |
| `monthlyRent` | number | ✅ | Per-person monthly rent. Min 1000, Max 500000 |
| `boardingType` | string | ✅ | One of: SINGLE_ROOM, SHARED_ROOM, ANNEX, HOUSE |
| `genderPref` | string | ✅ | One of: MALE, FEMALE, ANY |
| `nearUniversity` | string | ❌ | Initial release guidance: use `SLIIT` |
| `latitude` | number | ✅ | 5.9-9.9 (Sri Lanka bounds) |
| `longitude` | number | ✅ | 79.5-81.9 (Sri Lanka bounds) |
| `maxOccupants` | number | ✅ | Min 1, Max 20 |
| `currentOccupants` | number | ❌ | Default 0, Min 0 |
| `amenities` | string[] | ❌ | Normalized uppercase with underscores |
| `rules` | string[] | ❌ | Array of rule strings (min 1 char each) |

**Request Example:**
```bash
POST /api/boardings
Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR...
Content-Type: application/json

{
  "title": "Beautiful Boarding House Near University",
  "description": "Fully furnished boarding house with modern amenities. Located near SLIIT. Perfect for students and young professionals.",
  "city": "Colombo",
  "district": "Colombo",
  "address": "123 Main Street, Colombo 7",
  "monthlyRent": 15000,
  "boardingType": "SHARED_ROOM",
  "genderPref": "ANY",
  "nearUniversity": "SLIIT",
  "latitude": 6.9124,
  "longitude": 80.7701,
  "maxOccupants": 3,
  "currentOccupants": 1,
  "amenities": ["WI_FI", "KITCHEN", "LAUNDRY"],
  "rules": [
    "No loud music after 10 PM",
    "Guests must be informed to the owner",
    "No cooking in rooms"
  ]
}
```

**Success Response (201 Created):**
```json
{
  "success": true,
  "message": "Boarding Created Successfully",
  "data": {
    "boarding": {
      "id": "507f1f77bcf86cd799439011",
      "ownerId": "507f1f77bcf86cd799439001",
      "owner": {
        "id": "507f1f77bcf86cd799439001",
        "firstName": "John",
        "lastName": "Doe",
        "phone": "+94701234567"
      },
      "title": "Beautiful Boarding House Near University",
      "slug": "beautiful-boarding-house-near-university",
      "description": "Fully furnished boarding house with modern amenities. Located near SLIIT. Perfect for students and young professionals.",
      "city": "Colombo",
      "district": "Colombo",
      "address": "123 Main Street, Colombo 7",
      "monthlyRent": 15000,
      "boardingType": "SHARED_ROOM",
      "genderPref": "ANY",
      "nearUniversity": "SLIIT",
      "latitude": 6.9124,
      "longitude": 80.7701,
      "maxOccupants": 3,
      "currentOccupants": 1,
      "status": "DRAFT",
      "rejectionReason": null,
      "isDeleted": false,
      "images": [],
      "amenities": [
        {
          "id": "507f1f77bcf86cd799439031",
          "name": "WI_FI",
          "createdAt": "2026-02-27T08:16:57.000Z"
        },
        {
          "id": "507f1f77bcf86cd799439032",
          "name": "KITCHEN",
          "createdAt": "2026-02-27T08:16:57.000Z"
        },
        {
          "id": "507f1f77bcf86cd799439033",
          "name": "LAUNDRY",
          "createdAt": "2026-02-27T08:16:57.000Z"
        }
      ],
      "rules": [
        {
          "id": "507f1f77bcf86cd799439041",
          "rule": "No loud music after 10 PM",
          "createdAt": "2026-02-27T08:16:57.000Z"
        },
        {
          "id": "507f1f77bcf86cd799439042",
          "rule": "Guests must be informed to the owner",
          "createdAt": "2026-02-27T08:16:57.000Z"
        },
        {
          "id": "507f1f77bcf86cd799439043",
          "rule": "No cooking in rooms",
          "createdAt": "2026-02-27T08:16:57.000Z"
        }
      ],
      "createdAt": "2026-02-27T08:16:57.000Z",
      "updatedAt": "2026-02-27T08:16:57.000Z"
    }
  }
}
```

**Business Logic:**
- Creates boarding with initial status: `DRAFT`
- Initial owner onboarding flow is SLIIT-focused (UI guidance)
- Generates unique slug from title (auto-incremented if duplicate)
- Creates associated amenity and rule records
- Validates that `currentOccupants` does not exceed `maxOccupants`
- Validates geographic coordinates are within Sri Lanka bounds
- Amenities are normalized (uppercase, underscores)
- User must have OWNER role

**Validation Errors:**

Missing required field (400):
```json
{
  "success": false,
  "error": {
    "code": "VALIDATION_ERROR",
    "message": "Title must be at least 10 characters"
  }
}
```

Current occupants exceeds max (400):
```json
{
  "success": false,
  "error": {
    "code": "VALIDATION_ERROR",
    "message": "currentOccupants cannot Exceed Max Occupants"
  }
}
```

Invalid geographic coordinates (400):
```json
{
  "success": false,
  "error": {
    "code": "VALIDATION_ERROR",
    "message": "Latitude must be within Sri Lanka bounds (5.9-9.9)"
  }
}
```

---

### 5. Update Boarding

**Endpoint:** `PUT /api/boardings/:id`

**Description:** Update an existing boarding listing. Only DRAFT and REJECTED boardings can be edited.

**Authentication:** ✅ Required (Bearer token)

**Authorization:** `OWNER` role (must own the boarding)

**Path Parameters:**

| Parameter | Type | Required | Validation |
|-----------|------|----------|-----------|
| `id` | string | ✅ | Valid MongoDB ObjectId |

**Request Body:** (All fields optional)

| Field | Type | Constraints |
|-------|------|-------------|
| `title` | string | Min 10, Max 200 characters |
| `description` | string | Min 30, Max 5000 characters |
| `city` | string | Non-empty |
| `district` | string | Non-empty |
| `address` | string | - |
| `monthlyRent` | number | Min 1000, Max 500000 |
| `boardingType` | string | One of: SINGLE_ROOM, SHARED_ROOM, ANNEX, HOUSE |
| `genderPref` | string | One of: MALE, FEMALE, ANY |
| `nearUniversity` | string | - |
| `latitude` | number | 5.9-9.9 |
| `longitude` | number | 79.5-81.9 |
| `maxOccupants` | number | Min 1, Max 20 |
| `currentOccupants` | number | Min 0 |
| `amenities` | string[] | Replaces all existing amenities |
| `rules` | string[] | Replaces all existing rules |

**Request Example:**
```bash
PUT /api/boardings/507f1f77bcf86cd799439011
Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR...
Content-Type: application/json

{
  "title": "Updated: Beautiful Boarding House Near University",
  "description": "Fully renovated boarding house with modern amenities.",
  "monthlyRent": 16000,
  "maxOccupants": 4,
  "amenities": ["WI_FI", "KITCHEN", "LAUNDRY", "AC"],
  "rules": [
    "No loud music after 10 PM",
    "Guests must be informed to the owner",
    "No cooking in rooms",
    "Monthly maintenance fee: Rs.1000"
  ]
}
```

**Success Response (200 OK):**
```json
{
  "success": true,
  "message": "Boarding updated successfully",
  "data": {
    "boarding": {
      "id": "507f1f77bcf86cd799439011",
      "ownerId": "507f1f77bcf86cd799439001",
      "owner": {
        "id": "507f1f77bcf86cd799439001",
        "firstName": "John",
        "lastName": "Doe",
        "phone": "+94701234567"
      },
      "title": "Updated: Beautiful Boarding House Near University",
      "slug": "updated-beautiful-boarding-house-near-university",
      "description": "Fully renovated boarding house with modern amenities.",
      "city": "Colombo",
      "district": "Colombo",
      "address": "123 Main Street, Colombo 7",
      "monthlyRent": 16000,
      "boardingType": "SHARED_ROOM",
      "genderPref": "ANY",
      "nearUniversity": "Colombo University",
      "latitude": 6.9124,
      "longitude": 80.7701,
      "maxOccupants": 4,
      "currentOccupants": 1,
      "status": "DRAFT",
      "rejectionReason": null,
      "isDeleted": false,
      "images": [
        {
          "id": "507f1f77bcf86cd799439021",
          "url": "https://res.cloudinary.com/...",
          "publicId": "unistay/boarding_123_1",
          "createdAt": "2026-02-27T08:16:57.000Z"
        }
      ],
      "amenities": [
        {
          "id": "507f1f77bcf86cd799439031",
          "name": "WI_FI",
          "createdAt": "2026-02-27T08:16:57.000Z"
        },
        {
          "id": "507f1f77bcf86cd799439032",
          "name": "KITCHEN",
          "createdAt": "2026-02-27T08:16:57.000Z"
        },
        {
          "id": "507f1f77bcf86cd799439033",
          "name": "LAUNDRY",
          "createdAt": "2026-02-27T08:16:57.000Z"
        },
        {
          "id": "507f1f77bcf86cd799439034",
          "name": "AC",
          "createdAt": "2026-02-27T08:16:57.000Z"
        }
      ],
      "rules": [
        {
          "id": "507f1f77bcf86cd799439041",
          "rule": "No loud music after 10 PM",
          "createdAt": "2026-02-27T08:16:57.000Z"
        },
        {
          "id": "507f1f77bcf86cd799439042",
          "rule": "Guests must be informed to the owner",
          "createdAt": "2026-02-27T08:16:57.000Z"
        },
        {
          "id": "507f1f77bcf86cd799439043",
          "rule": "No cooking in rooms",
          "createdAt": "2026-02-27T08:16:57.000Z"
        },
        {
          "id": "507f1f77bcf86cd799439044",
          "rule": "Monthly maintenance fee: Rs.1000",
          "createdAt": "2026-02-27T08:16:57.000Z"
        }
      ],
      "createdAt": "2026-02-27T08:16:57.000Z",
      "updatedAt": "2026-03-02T10:15:00.000Z"
    }
  }
}
```

**Business Logic:**
- Only DRAFT and REJECTED boardings can be edited
- If boarding is ACTIVE or PENDING_APPROVAL, must deactivate first
- Slug is regenerated if title changes
- If title changes, new slug must be unique
- Amenities and rules are completely replaced (not merged) when provided
- Uses MongoDB transaction for atomicity
- Validates that `currentOccupants` does not exceed `maxOccupants`
- Must be the boarding owner

**Error Responses:**

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

Not the owner (403):
```json
{
  "success": false,
  "error": {
    "code": "FORBIDDEN",
    "message": "You do not own this listing"
  }
}
```

Invalid state transition (400):
```json
{
  "success": false,
  "error": {
    "code": "INVALID_STATE_TRANSITION",
    "message": "Cannot edit an active or pending listing. Deactivate first."
  }
}
```

---

### 6. Submit Boarding for Approval

**Endpoint:** `PATCH /api/boardings/:id/submit`

**Description:** Submit a boarding for admin approval. Transitions from DRAFT/REJECTED to PENDING_APPROVAL.

**Authentication:** ✅ Required (Bearer token)

**Authorization:** `OWNER` role (must own the boarding)

**Path Parameters:**

| Parameter | Type | Required |
|-----------|------|----------|
| `id` | string | ✅ |

**Request Headers:**
```
Authorization: Bearer <token>
```

**Request Example:**
```bash
PATCH /api/boardings/507f1f77bcf86cd799439011/submit
Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR...
```

**Success Response (200 OK):**
```json
{
  "success": true,
  "message": "Boarding Submitted for Approval",
  "data": {
    "boarding": {
      "id": "507f1f77bcf86cd799439011",
      "ownerId": "507f1f77bcf86cd799439001",
      "owner": {
        "id": "507f1f77bcf86cd799439001",
        "firstName": "John",
        "lastName": "Doe",
        "phone": "+94701234567"
      },
      "title": "Beautiful Boarding House Near University",
      "slug": "beautiful-boarding-house-near-university",
      "description": "Fully furnished boarding house with modern amenities.",
      "city": "Colombo",
      "district": "Colombo",
      "address": "123 Main Street, Colombo 7",
      "monthlyRent": 15000,
      "boardingType": "SHARED_ROOM",
      "genderPref": "ANY",
      "nearUniversity": "Colombo University",
      "latitude": 6.9124,
      "longitude": 80.7701,
      "maxOccupants": 3,
      "currentOccupants": 1,
      "status": "PENDING_APPROVAL",
      "rejectionReason": null,
      "isDeleted": false,
      "images": [
        {
          "id": "507f1f77bcf86cd799439021",
          "url": "https://res.cloudinary.com/...",
          "publicId": "unistay/boarding_123_1",
          "createdAt": "2026-02-27T08:16:57.000Z"
        },
        {
          "id": "507f1f77bcf86cd799439022",
          "url": "https://res.cloudinary.com/...",
          "publicId": "unistay/boarding_123_2",
          "createdAt": "2026-02-27T08:16:57.000Z"
        }
      ],
      "amenities": [
        {
          "id": "507f1f77bcf86cd799439031",
          "name": "WI_FI",
          "createdAt": "2026-02-27T08:16:57.000Z"
        },
        {
          "id": "507f1f77bcf86cd799439032",
          "name": "KITCHEN",
          "createdAt": "2026-02-27T08:16:57.000Z"
        }
      ],
      "rules": [
        {
          "id": "507f1f77bcf86cd799439041",
          "rule": "No loud music after 10 PM",
          "createdAt": "2026-02-27T08:16:57.000Z"
        }
      ],
      "createdAt": "2026-02-27T08:16:57.000Z",
      "updatedAt": "2026-03-02T10:15:00.000Z"
    }
  }
}
```

**Business Logic:**
- Only DRAFT or REJECTED boardings can be submitted
- Requires at least 1 image to be attached
- Clears rejection reason when resubmitting
- Transitions status to PENDING_APPROVAL
- Will be reviewed by admin before becoming ACTIVE
- Must be the boarding owner

**Validation Errors:**

No images attached (400):
```json
{
  "success": false,
  "error": {
    "code": "VALIDATION_ERROR",
    "message": "At least 1 image is required to submit for approval"
  }
}
```

Invalid state (400):
```json
{
  "success": false,
  "error": {
    "code": "INVALID_STATE_TRANSITION",
    "message": "Only DRAFT or REJECTED listings can be submitted for approval"
  }
}
```

---

### 7. Permanently Delete Draft Boarding

**Endpoint:** `DELETE /api/boardings/:id`

**Description:** Permanently delete a draft boarding listing from the database. This action is irreversible and only applies to the owner’s own DRAFT listings.

**Authentication:** ✅ Required (Bearer token)

**Authorization:** `OWNER` role (must own the boarding)

**Path Parameters:**

| Parameter | Type | Required |
|-----------|------|----------|
| `id` | string | ✅ |

**Request Example:**
```bash
DELETE /api/boardings/507f1f77bcf86cd799439011
Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR...
```

**Success Response (200 OK):**
```json
{
  "success": true,
  "message": "Draft boarding permanently deleted",
  "data": {
    "id": "507f1f77bcf86cd799439011"
  }
}
```

**Business Logic:**
- Only DRAFT boardings can be permanently deleted
- Must be the boarding owner
- Removes the boarding document and related draft data from the database
- Deletes associated image records and best-effort Cloudinary assets

**Validation Errors:**

Invalid state (400):
```json
{
  "success": false,
  "error": {
    "code": "INVALID_STATE_TRANSITION",
    "message": "Only DRAFT listings can be permanently deleted"
  }
}
```

---

### 8. Deactivate Boarding

**Endpoint:** `PATCH /api/boardings/:id/deactivate`

**Description:** Deactivate an active boarding listing. Transitions from ACTIVE to INACTIVE.

**Authentication:** ✅ Required (Bearer token)

**Authorization:** `OWNER` role (must own the boarding)

**Path Parameters:**

| Parameter | Type | Required |
|-----------|------|----------|
| `id` | string | ✅ |

**Request Example:**
```bash
PATCH /api/boardings/507f1f77bcf86cd799439011/deactivate
Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR...
```

**Success Response (200 OK):**
```json
{
  "success": true,
  "message": "Boarding deactivated successfully",
  "data": {
    "boarding": {
      "id": "507f1f77bcf86cd799439011",
      "ownerId": "507f1f77bcf86cd799439001",
      "owner": {
        "id": "507f1f77bcf86cd799439001",
        "firstName": "John",
        "lastName": "Doe",
        "phone": "+94701234567"
      },
      "title": "Beautiful Boarding House Near University",
      "slug": "beautiful-boarding-house-near-university",
      "description": "Fully furnished boarding house with modern amenities.",
      "city": "Colombo",
      "district": "Colombo",
      "address": "123 Main Street, Colombo 7",
      "monthlyRent": 15000,
      "boardingType": "SHARED_ROOM",
      "genderPref": "ANY",
      "nearUniversity": "Colombo University",
      "latitude": 6.9124,
      "longitude": 80.7701,
      "maxOccupants": 3,
      "currentOccupants": 1,
      "status": "INACTIVE",
      "rejectionReason": null,
      "isDeleted": false,
      "images": [
        {
          "id": "507f1f77bcf86cd799439021",
          "url": "https://res.cloudinary.com/...",
          "publicId": "unistay/boarding_123_1",
          "createdAt": "2026-02-27T08:16:57.000Z"
        }
      ],
      "amenities": [
        {
          "id": "507f1f77bcf86cd799439031",
          "name": "WI_FI",
          "createdAt": "2026-02-27T08:16:57.000Z"
        }
      ],
      "rules": [
        {
          "id": "507f1f77bcf86cd799439041",
          "rule": "No loud music after 10 PM",
          "createdAt": "2026-02-27T08:16:57.000Z"
        }
      ],
      "createdAt": "2026-02-27T08:16:57.000Z",
      "updatedAt": "2026-03-02T10:15:00.000Z"
    }
  }
}
```

**Business Logic:**
- Only ACTIVE boardings can be deactivated
- Boarding becomes invisible to public search after deactivation
- Owner can reactivate later if needed
- Must be the boarding owner

**Error Responses:**

Not active (400):
```json
{
  "success": false,
  "error": {
    "code": "INVALID_STATE_TRANSITION",
    "message": "Only ACTIVE listings can be deactivated"
  }
}
```

---

### 8. Activate Boarding

**Endpoint:** `PATCH /api/boardings/:id/activate`

**Description:** Reactivate an inactive boarding listing. Transitions from INACTIVE to ACTIVE.

**Authentication:** ✅ Required (Bearer token)

**Authorization:** `OWNER` role (must own the boarding)

**Path Parameters:**

| Parameter | Type | Required |
|-----------|------|----------|
| `id` | string | ✅ |

**Request Example:**
```bash
PATCH /api/boardings/507f1f77bcf86cd799439011/activate
Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR...
```

**Success Response (200 OK):**
```json
{
  "success": true,
  "message": "Boarding activated successfully",
  "data": {
    "boarding": {
      "id": "507f1f77bcf86cd799439011",
      "ownerId": "507f1f77bcf86cd799439001",
      "owner": {
        "id": "507f1f77bcf86cd799439001",
        "firstName": "John",
        "lastName": "Doe",
        "phone": "+94701234567"
      },
      "title": "Beautiful Boarding House Near University",
      "slug": "beautiful-boarding-house-near-university",
      "description": "Fully furnished boarding house with modern amenities.",
      "city": "Colombo",
      "district": "Colombo",
      "address": "123 Main Street, Colombo 7",
      "monthlyRent": 15000,
      "boardingType": "SHARED_ROOM",
      "genderPref": "ANY",
      "nearUniversity": "Colombo University",
      "latitude": 6.9124,
      "longitude": 80.7701,
      "maxOccupants": 3,
      "currentOccupants": 1,
      "status": "ACTIVE",
      "rejectionReason": null,
      "isDeleted": false,
      "images": [
        {
          "id": "507f1f77bcf86cd799439021",
          "url": "https://res.cloudinary.com/...",
          "publicId": "unistay/boarding_123_1",
          "createdAt": "2026-02-27T08:16:57.000Z"
        }
      ],
      "amenities": [
        {
          "id": "507f1f77bcf86cd799439031",
          "name": "WI_FI",
          "createdAt": "2026-02-27T08:16:57.000Z"
        }
      ],
      "rules": [
        {
          "id": "507f1f77bcf86cd799439041",
          "rule": "No loud music after 10 PM",
          "createdAt": "2026-02-27T08:16:57.000Z"
        }
      ],
      "createdAt": "2026-02-27T08:16:57.000Z",
      "updatedAt": "2026-03-02T10:15:00.000Z"
    }
  }
}
```

**Business Logic:**
- Only INACTIVE boardings can be activated
- Becomes visible to public search after activation
- Must be previously approved (status was ACTIVE before deactivation)
- Must be the boarding owner

**Error Responses:**

Not inactive (400):
```json
{
  "success": false,
  "error": {
    "code": "INVALID_STATE_TRANSITION",
    "message": "Only INACTIVE listings can be activated"
  }
}
```

---

### 9. Upload Boarding Images

**Endpoint:** `POST /api/boardings/:id/images`

**Description:** Upload images for a boarding listing. Maximum 10 images per boarding.

**Authentication:** ✅ Required (Bearer token)

**Authorization:** `OWNER` role (must own the boarding)

**Path Parameters:**

| Parameter | Type | Required |
|-----------|------|----------|
| `id` | string | ✅ |

**Request Headers:**
```
Authorization: Bearer <token>
Content-Type: multipart/form-data
```

**Request Body:**

| Field | Type | Required | Constraints |
|-------|------|----------|-------------|
| `images` | file[] | ✅ | Image files (JPEG, PNG, etc.), max 10 files, total max 10 images |

**Request Example (using cURL):**
```bash
curl -X POST \
  http://localhost:3000/api/boardings/507f1f77bcf86cd799439011/images \
  -H 'Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR...' \
  -F 'images=@image1.jpg' \
  -F 'images=@image2.jpg' \
  -F 'images=@image3.jpg'
```

**Success Response (201 Created):**
```json
{
  "success": true,
  "message": "Images Uploaded Successfully",
  "data": {
    "images": [
      {
        "id": "507f1f77bcf86cd799439021",
        "boardingId": "507f1f77bcf86cd799439011",
        "url": "https://res.cloudinary.com/unistay/image/upload/v1234567890/unistay/boarding_507f1f77bcf86cd799439011_1.jpg",
        "publicId": "unistay/boarding_507f1f77bcf86cd799439011_1",
        "createdAt": "2026-02-27T08:16:57.000Z"
      },
      {
        "id": "507f1f77bcf86cd799439022",
        "boardingId": "507f1f77bcf86cd799439011",
        "url": "https://res.cloudinary.com/unistay/image/upload/v1234567891/unistay/boarding_507f1f77bcf86cd799439011_2.jpg",
        "publicId": "unistay/boarding_507f1f77bcf86cd799439011_2",
        "createdAt": "2026-02-27T08:16:57.000Z"
      },
      {
        "id": "507f1f77bcf86cd799439023",
        "boardingId": "507f1f77bcf86cd799439011",
        "url": "https://res.cloudinary.com/unistay/image/upload/v1234567892/unistay/boarding_507f1f77bcf86cd799439011_3.jpg",
        "publicId": "unistay/boarding_507f1f77bcf86cd799439011_3",
        "createdAt": "2026-02-27T08:16:57.000Z"
      }
    ]
  }
}
```

**Business Logic:**
- Images are uploaded to Cloudinary CDN
- Maximum 10 images per boarding
- Validates that adding new images won't exceed limit
- Returns Cloudinary URL and public ID for deletion purposes
- Must be the boarding owner
- Images should be submitted before submitting boarding for approval

**Validation Errors:**

No images provided (400):
```json
{
  "success": false,
  "error": {
    "code": "VALIDATION_ERROR",
    "message": "No images provided"
  }
}
```

Exceeds max images (400):
```json
{
  "success": false,
  "error": {
    "code": "VALIDATION_ERROR",
    "message": "Cannot exceed 10 images. Currently have 7, trying to add 5."
  }
}
```

---

### 10. Delete Boarding Image

**Endpoint:** `DELETE /api/boardings/:id/images/:imageId`

**Description:** Delete a specific image from a boarding listing.

**Authentication:** ✅ Required (Bearer token)

**Authorization:** `OWNER` role (must own the boarding)

**Path Parameters:**

| Parameter | Type | Required |
|-----------|------|----------|
| `id` | string | ✅ |
| `imageId` | string | ✅ |

**Request Example:**
```bash
DELETE /api/boardings/507f1f77bcf86cd799439011/images/507f1f77bcf86cd799439021
Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR...
```

**Success Response (200 OK):**
```json
{
  "success": true,
  "message": "Image deleted successfully",
  "data": null
}
```

**Business Logic:**
- Deletes image from Cloudinary using publicId
- Removes image record from database
- Validates that image belongs to the specified boarding
- Must be the boarding owner

**Error Responses:**

Image not found (404):
```json
{
  "success": false,
  "error": {
    "code": "BOARDING_NOT_FOUND",
    "message": "Image not found"
  }
}
```

Image belongs to different boarding (404):
```json
{
  "success": false,
  "error": {
    "code": "BOARDING_NOT_FOUND",
    "message": "Image not found"
  }
}
```

---

## Status Transition Diagram

```
DRAFT
  ├─→ PENDING_APPROVAL (via /submit)
  ├─→ [EDIT via PUT]
  └─→ ACTIVE (admin approval)

PENDING_APPROVAL
  ├─→ ACTIVE (admin approval)
  └─→ REJECTED (admin rejection)

ACTIVE
  ├─→ INACTIVE (via /deactivate)
  └─→ [CANNOT EDIT - must deactivate first]

INACTIVE
  ├─→ ACTIVE (via /activate)
  ├─→ [CANNOT EDIT - must be DRAFT or REJECTED]
  └─→ [CANNOT SUBMIT - must be DRAFT or REJECTED]

REJECTED
  ├─→ DRAFT (via PUT with changes)
  ├─→ PENDING_APPROVAL (via /submit after fixing)
  └─→ [EDIT via PUT]
```

---

## Pagination Guidelines

All list endpoints support pagination via query parameters:

- `page`: Current page number (default: 1)
- `size`: Number of items per page (default: 20, max: 100)

**Pagination Response Structure:**
```json
{
  "pagination": {
    "total": 150,
    "page": 1,
    "size": 20,
    "totalPages": 8
  }
}
```

**Calculating pagination:**
- `totalPages = Math.ceil(total / size)`
- `nextPage = page < totalPages ? page + 1 : null`
- `prevPage = page > 1 ? page - 1 : null`

---

## Search & Filter Best Practices

### Query String Format Examples

**Simple comma-separated amenities:**
```
GET /api/boardings?amenities=WI_FI,KITCHEN
```

**Array format amenities:**
```
GET /api/boardings?amenities=WI_FI&amenities=KITCHEN&amenities=LAUNDRY
```

**Combined filters:**
```
GET /api/boardings?page=1&size=10&city=Colombo&minRent=10000&maxRent=30000&boardingType=SHARED_ROOM&genderPref=FEMALE&amenities=WI_FI,KITCHEN&sortBy=monthlyRent&sortDir=asc
```

---

## Common Validation Rules

### Title
- **Requirement:** Required
- **Length:** Min 10, Max 200 characters
- **Use Case:** Brief, descriptive heading for the boarding

### Description
- **Requirement:** Required
- **Length:** Min 30, Max 5000 characters
- **Use Case:** Detailed information about the boarding

### Monthly Rent
- **Requirement:** Required
- **Range:** 1,000 to 500,000 (Sri Lankan Rupees)
- **Validation:** Must be integer

### Geographic Coordinates
- **Latitude Range:** 5.9 to 9.9 (Sri Lanka bounds)
- **Longitude Range:** 79.5 to 81.9 (Sri Lanka bounds)
- **Requirement:** Required
- **Use Case:** Used for location-based search and mapping

### Max & Current Occupants
- **Max Occupants:** 1 to 20
- **Current Occupants:** 0 to Max
- **Validation:** currentOccupants ≤ maxOccupants

### Amenities
- **Format:** Normalized names (UPPERCASE with underscores)
- **Example:** "Wi-Fi" → "WI_FI", "Air Conditioner" → "AC"
- **Requirement:** Optional, but recommended
- **Automatic Normalization:** Yes

---

## Security Considerations

1. **Authentication:** All write operations require valid JWT tokens
2. **Authorization:** Users can only modify their own boardings (OWNER role)
3. **Ownership Validation:** Every request validates boarding ownership
4. **Rate Limiting:** All endpoints subject to boardingLimiter middleware
5. **Input Validation:** All inputs validated with Zod schemas
6. **Geographic Bounds:** Coordinates must be within Sri Lanka
7. **Image Storage:** Images stored on Cloudinary (secure CDN)

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
- **Cloudinary:** Image hosting and CDN
- **MongoDB:** Document database

---

## Performance Tips

1. **Use pagination** for list endpoints (default size: 20)
2. **Filter early** using query parameters to reduce database load
3. **Limit to required endpoints** - don't fetch all data unnecessarily
4. **Cache amenity lists** on client side
5. **Optimize image sizes** before uploading (recommend: <5MB per image)
6. **Use slug for public sharing** instead of ID (more SEO-friendly)

---

## Example Workflows

### Workflow 1: Create and Submit a Boarding for Approval

```bash
# Step 1: Create a boarding (DRAFT status)
POST /api/boardings
Authorization: Bearer <token>
{
  "title": "Beautiful Boarding House",
  "description": "Fully furnished with modern amenities...",
  "city": "Colombo",
  "district": "Colombo",
  "monthlyRent": 15000,
  "boardingType": "SHARED_ROOM",
  "genderPref": "ANY",
  "latitude": 6.9124,
  "longitude": 80.7701,
  "maxOccupants": 3,
  "amenities": ["WI_FI", "KITCHEN"],
  "rules": ["No loud music after 10 PM"]
}
# Response: 201 Created, boarding with status: DRAFT

# Step 2: Upload at least 1 image (required for submission)
POST /api/boardings/{id}/images
Authorization: Bearer <token>
Content-Type: multipart/form-data
Form Data: images=[file1, file2, file3]
# Response: 201 Created, uploaded image URLs

# Step 3: Submit for approval
PATCH /api/boardings/{id}/submit
Authorization: Bearer <token>
# Response: 200 OK, boarding with status: PENDING_APPROVAL
```

### Workflow 2: Manage a Listing After Approval

```bash
# Step 1: Admin approves the boarding (changes status to ACTIVE)
# Step 2: Boarding is now visible in public search

# When owner wants to temporarily hide it:
PATCH /api/boardings/{id}/deactivate
Authorization: Bearer <token>
# Response: 200 OK, boarding with status: INACTIVE

# When owner wants to show it again:
PATCH /api/boardings/{id}/activate
Authorization: Bearer <token>
# Response: 200 OK, boarding with status: ACTIVE

# Owner cannot edit ACTIVE listings, must deactivate first:
PUT /api/boardings/{id}
Authorization: Bearer <token>
# Fails with: "Cannot edit an active or pending listing. Deactivate first."
```

### Workflow 3: Search for Boardings

```bash
# Basic search
GET /api/boardings?page=1&size=20

# Search by location
GET /api/boardings?city=Colombo&district=Colombo

# Search by price range
GET /api/boardings?minRent=10000&maxRent=30000

# Search with amenities
GET /api/boardings?amenities=WI_FI,KITCHEN,LAUNDRY

# Advanced search
GET /api/boardings?page=1&size=10&city=Colombo&boardingType=SHARED_ROOM&genderPref=FEMALE&minRent=5000&maxRent=25000&amenities=WI_FI&sortBy=monthlyRent&sortDir=asc

# Get specific boarding by slug
GET /api/boardings/beautiful-boarding-house-near-university
```

---

## Troubleshooting

| Issue | Solution |
|-------|----------|
| Cannot edit active listing | Deactivate the listing first using `/deactivate` endpoint |
| Cannot submit ACTIVE listing | Must be DRAFT or REJECTED status to submit |
| Image upload fails | Check file size and format, ensure at least 1 image uploaded |
| Search returns empty | Check spelling of city/district names (case-insensitive) |
| Slug not found | Use exact slug from previous request, verify boarding is ACTIVE |
| Unauthorized error on write operations | Ensure JWT token is valid and user has OWNER role |
| Ownership error | Ensure you're authenticated as the boarding owner |
| Geographic coordinates invalid | Verify latitude (5.9-9.9) and longitude (79.5-81.9) are within Sri Lanka |

---

## Changelog & Version History

- **v1.0.0 (2026-02-27)**: Initial Boardings API release
  - Core CRUD operations
  - Image management
  - Amenities and rules
  - Search and filtering
  - Status workflow

---

## Support & Contact

For issues or questions:
- Check the [Troubleshooting](#troubleshooting) section
- Review [Common Validation Rules](#common-validation-rules)
- Verify [Business Logic](#boarding-status-life-cycle) for each endpoint
- Contact development team for additional support
