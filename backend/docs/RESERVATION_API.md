# Reservation API (Frontend)

## Base URL

```txt
http://localhost:3000/api
```

## Authentication

```http
Authorization: Bearer <access-token>
```

## Route Prefix

```txt
/api/reservation
```

> Note: route prefix is singular (`reservation`).

## Frontend Creation Guide

- Reservation creation + validation details: [RESERVATION_CREATION_VALIDATION.md](./RESERVATION_CREATION_VALIDATION.md)

## Common Success Envelope

```json
{
  "success": true,
  "message": "Success",
  "data": {},
  "timestamp": "2026-03-22T10:00:00.000Z"
}
```

## Common Error Envelope

```json
{
  "success": false,
  "error": "BadRequestError",
  "message": "Bad request",
  "details": [],
  "timestamp": "2026-03-22T10:00:00.000Z"
}
```

---

## Reservation Status Enum

- `PENDING`
- `ACTIVE`
- `COMPLETED`
- `CANCELLED`
- `REJECTED`
- `EXPIRED`

---

## 1) Create Reservation

- **Endpoint:** `POST /api/reservation`
- **Role:** `STUDENT`

### Request Body

```json
{
  "boardingId": "cmx123...",
  "moveInDate": "2026-04-01",
  "specialRequests": "Need a quiet room near study area"
}
```

### Validation

- `boardingId`: required string
- `moveInDate`: required string in `YYYY-MM-DD`
- `specialRequests`: optional string, max 1000 chars

### Business Rules

- `moveInDate` must be at least 1 day in the future
- Boarding must exist, not deleted, and be `ACTIVE`
- Boarding must not be full (`currentOccupants < maxOccupants`)
- Student cannot have another `ACTIVE` reservation globally
- Student cannot have `PENDING` or `ACTIVE` reservation for the same boarding
- New reservation starts as `PENDING` and expires in 72 hours

### Success (201)

Returns `data.reservation`.

---

## 2) Get My Reservations (Student)

- **Endpoint:** `GET /api/reservation/my-requests`
- **Role:** `STUDENT`
- **Response:** `data.reservations` (newest first)

---

## 3) Get Requests for My Boardings (Owner)

- **Endpoint:** `GET /api/reservation/my-boardings`
- **Role:** `OWNER`
- **Response:** `data.reservations` (newest first)

---

## 4) Get Reservation by ID

- **Endpoint:** `GET /api/reservation/:id`
- **Role:** participant (`student` requester or boarding `owner`) or `ADMIN`
- **Response:** `data.reservation`

---

## 5) Approve Reservation

- **Endpoint:** `PATCH /api/reservation/:id/approve`
- **Role:** `OWNER` (must own boarding)
- **Body:** none

### Business Rules

- Only `PENDING` can be approved
- If expired when approving:
  - reservation is set to `EXPIRED`
  - API returns `400` with message `Reservation has expired`
- Rechecks occupancy before approval
- On success:
  - reservation status -> `ACTIVE`
  - boarding `currentOccupants` increments by 1
  - 12 rental periods are generated

---

## 6) Reject Reservation

- **Endpoint:** `PATCH /api/reservation/:id/reject`
- **Role:** `OWNER` (must own boarding)

### Request Body

```json
{
  "reason": "Room already allocated"
}
```

### Business Rules

- Only `PENDING` can be rejected
- `reason` is required
- Status becomes `REJECTED` and stores `rejectionReason`

---

## 7) Cancel Reservation

- **Endpoint:** `PATCH /api/reservation/:id/cancel`
- **Role:** `STUDENT` (must own reservation)
- **Body:** none

### Business Rules

- Only `PENDING` or `ACTIVE` can be cancelled
- Status becomes `CANCELLED`
- If previous status was `ACTIVE`, boarding `currentOccupants` decrements by 1

---

## 8) Complete Reservation

- **Endpoint:** `PATCH /api/reservation/:id/complete`
- **Role:** `OWNER` (must own boarding)
- **Body:** none

### Business Rules

- Only `ACTIVE` can be completed
- Status becomes `COMPLETED`
- Boarding `currentOccupants` decrements by 1

---

## Common Frontend Error Cases

- `401 UnauthorizedError` (missing/invalid/expired token)
- `403 ForbiddenError` (wrong role or not owner/participant)
- `404 NotFoundError` (resource not found)
- `409 ConflictError` (boarding full, duplicate active/pending conflict)
- `422 ValidationError` (invalid body)
- `429 Too Many Requests` (rate limited)
