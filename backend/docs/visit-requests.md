# Visit Requests Module

## Route Scope

- Prefix: `/api/visit-requests`
- Middleware: `visitRequestLimiter`
- Auth + role by endpoint (`STUDENT` / `OWNER` / participant read)

## Business Logic

### Student Create Flow

- `POST /`
  - `requestedStartAt` must be in the future
  - `requestedEndAt` must be after start
  - Boarding must exist, not deleted, and `ACTIVE`
  - One `PENDING` visit request per student + boarding
  - On success:
    - status `PENDING`
    - `expiresAt = now + 72h`

### Listing / Access

- `GET /my-requests` (student): own requests, newest first
- `GET /my-boardings` (owner): requests for owner’s boardings, newest first
- `GET /:id`: participant-only access (student requester, owner, or admin)

### Owner Actions

- `PATCH /:id/approve`
  - Owner must own boarding
  - Only `PENDING` allowed
  - If expired during approval:
    - status set to `EXPIRED`
    - returns gone/expired error
  - Otherwise status set to `APPROVED`

- `PATCH /:id/reject`
  - Owner-only, only `PENDING`
  - Sets status `REJECTED` and stores `rejectionReason`

### Student Cancel

- `PATCH /:id/cancel`
  - Student must own request
  - Allowed statuses: `PENDING` or `APPROVED`
  - Sets `CANCELLED`

## Validation Rules

### Body Validation

`POST /` uses `createVisitRequestSchema`:

- `boardingId`: required non-empty string
- `requestedStartAt`: required datetime string
- `requestedEndAt`: required datetime string
- `message`: optional, max 1000 chars

`PATCH /:id/reject` uses `rejectVisitRequestSchema`:

- `reason`: required non-empty string

### Runtime Validation / Guards

- Role/ownership checks for decision and cancel actions
- Time checks (`start > now`, `end > start`)
- Duplicate pending request prevention per student+boarding

## Common Errors

- `400 BadRequestError`
- `401 UnauthorizedError`
- `403 ForbiddenError`
- `404 NotFoundError | BoardingNotFoundError`
- `409 ConflictError` (duplicate pending request)
- `410 GoneError` (expired during approval)
- `422 ValidationError`
