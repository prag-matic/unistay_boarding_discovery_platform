# Reservation Creation Validation Guide (Frontend)

This guide is for creating reservation requests via:

- **Endpoint:** `POST /api/reservation`
- **Auth:** Required (`STUDENT` role)
- **Content-Type:** `application/json`

---

## Request Body Rules

### Required fields

| Field | Type | Rules | Example |
|---|---|---|---|
| `boardingId` | string | required, non-empty | `"cmb123abc"` |
| `moveInDate` | string | required, must match `YYYY-MM-DD` | `"2026-04-01"` |

### Optional fields

| Field | Type | Rules | Default |
|---|---|---|---|
| `specialRequests` | string | max 1000 characters | `null` |

---

## Backend Business Validation (Important)

Even if request body format is valid, backend can reject based on business checks:

1. `moveInDate` must be at least **1 day in the future**
2. Boarding must exist and not be soft-deleted
3. Boarding status must be `ACTIVE`
4. Boarding must not be full (`currentOccupants < maxOccupants`)
5. Student cannot already have an `ACTIVE` reservation (global)
6. Student cannot already have a `PENDING` or `ACTIVE` reservation for the same boarding

If valid, reservation is created as:

- `status = PENDING`
- `expiresAt = now + 72 hours`

---

## Date Formatting Notes

- Send only date (no time): `YYYY-MM-DD`
- Avoid locale-formatted dates like `01/04/2026`
- Avoid full datetime for this field (`2026-04-01T00:00:00Z`) because schema expects strict date string

---

## Valid Sample Payload

```json
{
  "boardingId": "cmb123abc",
  "moveInDate": "2026-04-01",
  "specialRequests": "Please keep a ground-floor room if available"
}
```

---

## Success Response (201)

```json
{
  "success": true,
  "message": "Reservation request created successfully",
  "data": {
    "reservation": {
      "id": "cmr123...",
      "studentId": "cms123...",
      "boardingId": "cmb123...",
      "status": "PENDING",
      "moveInDate": "2026-04-01T00:00:00.000Z",
      "specialRequests": "Please keep a ground-floor room if available",
      "rentSnapshot": 28000,
      "boardingSnapshot": {},
      "rejectionReason": null,
      "expiresAt": "2026-03-25T11:00:00.000Z",
      "createdAt": "2026-03-22T11:00:00.000Z",
      "updatedAt": "2026-03-22T11:00:00.000Z",
      "student": {
        "id": "cms123...",
        "firstName": "John",
        "lastName": "Doe",
        "email": "john@example.com"
      },
      "boarding": {
        "id": "cmb123...",
        "title": "Cozy Annex Near Campus",
        "slug": "cozy-annex-near-campus",
        "city": "Colombo",
        "district": "Western"
      }
    }
  },
  "timestamp": "2026-03-22T11:00:00.000Z"
}
```

---

## Error Responses to Handle

### 1) Request shape/format errors (422 ValidationError)

```json
{
  "success": false,
  "error": "ValidationError",
  "message": "Validation failed",
  "details": [
    {
      "field": "moveInDate",
      "message": "moveInDate must be in YYYY-MM-DD format"
    }
  ],
  "timestamp": "2026-03-22T11:05:00.000Z"
}
```

### 2) Move-in date too soon (400 BadRequestError)

```json
{
  "success": false,
  "error": "BadRequestError",
  "message": "Move-in date must be at least 1 day in the future",
  "timestamp": "2026-03-22T11:05:00.000Z"
}
```

### 3) Boarding unavailable/not found (404 or 400)

- `404 BoardingNotFoundError`: `Boarding not found`
- `400 BadRequestError`: `Boarding is not available for reservation`

### 4) Conflict errors (409 ConflictError)

- `Boarding is full`
- `You already have an active reservation`
- `You already have a pending or active reservation for this boarding`

### 5) Auth errors

- `401 UnauthorizedError`: missing/invalid/expired token
- `403 ForbiddenError`: wrong role (non-student)

---

## Frontend Validation Checklist

Before calling `POST /api/reservation`:

- `boardingId` is present and non-empty
- `moveInDate` matches `YYYY-MM-DD`
- `moveInDate` is at least tomorrow (client-side pre-check)
- `specialRequests` length <= 1000
- User is logged in with `STUDENT` role
- `Authorization` header uses `Bearer <token>`

---

## Suggested UX Behavior

- Disable submit button while request is in progress
- Show `details[]` field-level errors for `422 ValidationError`
- Show backend business error messages directly for `400/409`
- After success, refresh list from `GET /api/reservation/my-requests`
- Show pending expiration countdown using `expiresAt`
