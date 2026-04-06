# Admin Module

## Route Scope

- Prefix: `/api/admin`
- Middleware: `adminLimiter` + `authenticate` + `requireRole('ADMIN')`

## Business Logic

### User Management

- `GET /users`
  - Supports filtering by `role` and `active`
  - Supports server-side text search via `search` (case-insensitive partial match across `firstName`, `lastName`, `email`, `phone`)
  - Returns paginated users ordered by `createdAt desc`
- `GET /users/:id`
  - Returns selected user profile fields
  - Throws `UserNotFoundError` if missing
- `PATCH /users/:id/activate`
  - Sets `isActive = true`
- `PATCH /users/:id/deactivate`
  - Sets `isActive = false`

### Boarding Moderation

- `GET /boardings/pending`
  - Returns non-deleted boardings in `PENDING_APPROVAL`
  - Ordered by oldest `updatedAt` first
- `PATCH /boardings/:id/approve`
  - Allowed only when boarding exists, not deleted, and status is `PENDING_APPROVAL`
  - Sets status to `ACTIVE`, clears `rejectionReason`
- `PATCH /boardings/:id/reject`
  - Allowed only when status is `PENDING_APPROVAL`
  - Sets status to `REJECTED` and stores `rejectionReason`

## Validation Rules

### Query Validation

`GET /users` uses `adminListUsersQuerySchema`:

- `page`: positive int, default `1`
- `size`: positive int, max `100`, default `20`
- `role`: `STUDENT | OWNER | ADMIN` (optional)
- `active`: boolean-like string via `z.stringbool()` (optional)
- `search`: trimmed string, max length `100` (optional)

### Body Validation

`PATCH /boardings/:id/reject` uses `rejectBoardingSchema`:

- `reason`: required, non-empty string

### Runtime Validation / Guards

- All admin routes require authenticated `ADMIN`
- Missing resources -> `404`
- Invalid status transitions -> `422` (`InvalidStateTransitionError`)

## Common Errors

- `401 UnauthorizedError`
- `403 ForbiddenError`
- `404 UserNotFoundError | BoardingNotFoundError`
- `422 InvalidStateTransitionError | ValidationError`
