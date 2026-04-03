# Reservation Module

## Route Scope

- Prefix: `/api/reservation`
- Middleware: `reservationLimiter`
- Auth + role by endpoint (`STUDENT`, `OWNER`, `ADMIN` for participant reads)

## Business Logic

### Student Create Flow

- `POST /`
  - `moveInDate` must be at least tomorrow (UTC date check)
  - Boarding must exist, not deleted, and `ACTIVE`
  - Boarding must not be full
  - Student cannot have another global `ACTIVE` reservation
  - Student cannot have `PENDING/ACTIVE` reservation for same boarding
  - On success:
    - status `PENDING`
    - `expiresAt = now + 72h`
    - snapshot fields (`rentSnapshot`, `boardingSnapshot`) captured

### Access / Listing

- `GET /my-requests` (student): own reservations, newest first
- `GET /my-boardings` (owner): reservations for owner boardings
- `GET /:id`: visible to participant (student or owner) or `ADMIN`

### Owner Actions

- `PATCH /:id/approve`
  - Owner must own boarding
  - Only `PENDING` allowed
  - If expired at approval time:
    - reservation set to `EXPIRED`
    - error returned
  - Re-check occupancy before activation
  - On success:
    - reservation becomes `ACTIVE`
    - boarding occupants increment by 1
    - generates 12 rental periods

- `PATCH /:id/reject`
  - Owner-only, only `PENDING`
  - Sets `REJECTED` + `rejectionReason`

- `PATCH /:id/complete`
  - Owner-only, only `ACTIVE`
  - Sets `COMPLETED`
  - Decrements boarding occupants by 1

### Student Cancel

- `PATCH /:id/cancel`
  - Student must own reservation
  - Allowed statuses: `PENDING` or `ACTIVE`
  - Sets `CANCELLED`
  - Decrements occupants only if previous status was `ACTIVE`

## Validation Rules

### Body Validation

`POST /` uses `createReservationSchema`:

- `boardingId`: required non-empty string
- `moveInDate`: required format `YYYY-MM-DD`
- `specialRequests`: optional, max 1000 chars

`PATCH /:id/reject` uses `rejectReservationSchema`:

- `reason`: required non-empty string

### Runtime Validation / Guards

- Role/ownership checks for all state-changing actions
- Expiry, occupancy, and state-transition guards

## Common Errors

- `400 BadRequestError` (date/state/expiry invalid)
- `401 UnauthorizedError`
- `403 ForbiddenError`
- `404 BoardingNotFoundError | NotFoundError`
- `409 ConflictError` (full boarding, conflicting reservation state)
- `422 ValidationError`
