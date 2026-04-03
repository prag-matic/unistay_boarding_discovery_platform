# Payment Module

## Route Scope

- Prefix: `/api/payments`
- Middleware: `paymentLimiter`
- Auth + role:
  - Student: log payment, own payments, proof upload
  - Owner: confirm/reject payments for owned boardings

## Business Logic

### Student Payment Flow

- `POST /`
  - Logs payment as `PENDING`
  - `paidAt` cannot be in the future
  - Rental period and reservation must exist
  - Reservation must belong to authenticated student
  - Rental period must belong to provided reservation
  - Rental period cannot already be `PAID`
  - Amount cannot exceed remaining balance (`amountDue - confirmedTotal`)

- `GET /my-payments`
  - Returns student’s payments ordered newest first

- `PUT /proof-image`
  - Uploads image to Cloudinary and returns `proofImageUrl`

### Owner Decision Flow

- `GET /my-boardings`
  - Returns payments tied to owner’s boardings

- `PATCH /:id/confirm`
  - Owner must own boarding behind reservation
  - Only `PENDING` payments can be confirmed
  - Sets payment to `CONFIRMED` and timestamps `confirmedAt`
  - Recalculates rental period status:
    - `PAID` if confirmed total >= amountDue
    - `PARTIALLY_PAID` if confirmed total > 0

- `PATCH /:id/reject`
  - Owner must own boarding
  - Only `PENDING` payments can be rejected
  - Sets status to `REJECTED` with `rejectionReason`

## Validation Rules

### Body Validation

`POST /` uses `logPaymentSchema`:

- `rentalPeriodId`: required non-empty string
- `reservationId`: required non-empty string
- `amount`: required number, `> 0`
- `paymentMethod`: `CASH | BANK_TRANSFER | ONLINE`
- `referenceNumber`: optional, max 100 chars
- `proofImageUrl`: optional valid URL
- `paidAt`: datetime string (ISO with offset OR accepted datetime regex)

`PATCH /:id/reject` uses `rejectPaymentSchema`:

- `reason`: required non-empty string

### File Validation

`PUT /proof-image` uses `uploadPaymentProofMiddleware`:

- Field: `proofImage`
- Allowed MIME: `image/jpeg`, `image/jpg`, `image/png`
- Max size: `5MB`

### Runtime Validation / Guards

- Role enforcement (`STUDENT` / `OWNER`) via middleware
- Ownership checks for owner moderation actions
- State checks for allowed status transitions

## Common Errors

- `400 BadRequestError` (future `paidAt`, wrong rentalPeriod/reservation relation, overpayment)
- `401 UnauthorizedError`
- `403 ForbiddenError`
- `404 NotFoundError`
- `409 ConflictError` (already fully paid)
- `422 ValidationError`
