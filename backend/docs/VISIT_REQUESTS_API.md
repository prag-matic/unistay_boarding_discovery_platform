# Visit Requests API (Frontend)

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
/api/visit-requests
```

## VisitRequest Status Enum

- `PENDING`
- `APPROVED`
- `REJECTED`
- `CANCELLED`
- `EXPIRED`

---

## 1) Create Visit Request

- **Endpoint:** `POST /api/visit-requests`
- **Role:** `STUDENT`

### Request Body

```json
{
  "boardingId": "cmb123...",
  "requestedStartAt": "2026-03-24T10:00:00+05:30",
  "requestedEndAt": "2026-03-24T10:30:00+05:30",
  "message": "Can I inspect the room and washroom?"
}
```

### Validation

- `boardingId`: required string
- `requestedStartAt`: required ISO datetime string
- `requestedEndAt`: required ISO datetime string
- `message`: optional string, max 1000 chars

### Business Rules

- `requestedStartAt` must be in the future
- `requestedEndAt` must be after `requestedStartAt`
- Boarding must exist, not deleted, and be `ACTIVE`
- Only one `PENDING` visit request per student + boarding
- New request starts as `PENDING`, expires in 72 hours

### Success (201)

Returns `data.visitRequest`.

---

## 2) Get My Visit Requests (Student)

- **Endpoint:** `GET /api/visit-requests/my-requests`
- **Role:** `STUDENT`
- **Response:** `data.visitRequests` (newest first)

---

## 3) Get Visit Requests for My Boardings (Owner)

- **Endpoint:** `GET /api/visit-requests/my-boardings`
- **Role:** `OWNER`
- **Response:** `data.visitRequests` (newest first)

---

## 4) Get Visit Request by ID

- **Endpoint:** `GET /api/visit-requests/:id`
- **Role:** participant (`student` requester or boarding `owner`) or `ADMIN`
- **Response:** `data.visitRequest`

---

## 5) Approve Visit Request

- **Endpoint:** `PATCH /api/visit-requests/:id/approve`
- **Role:** `OWNER` (must own boarding)
- **Body:** none

### Business Rules

- Only `PENDING` can be approved
- If expired during approval:
  - status is updated to `EXPIRED`
  - API returns `410 Gone` with `Visit request has expired`
- On success status becomes `APPROVED`

---

## 6) Reject Visit Request

- **Endpoint:** `PATCH /api/visit-requests/:id/reject`
- **Role:** `OWNER` (must own boarding)

### Request Body

```json
{
  "reason": "Owner unavailable at that time"
}
```

### Business Rules

- Only `PENDING` can be rejected
- `reason` is required
- Status becomes `REJECTED` and stores `rejectionReason`

---

## 7) Cancel Visit Request

- **Endpoint:** `PATCH /api/visit-requests/:id/cancel`
- **Role:** `STUDENT` (must own request)
- **Body:** none

### Business Rules

- Only `PENDING` or `APPROVED` can be cancelled
- Status becomes `CANCELLED`

---

## Common Frontend Error Cases

- `401 UnauthorizedError` (missing/invalid/expired token)
- `403 ForbiddenError` (wrong role or not owner/participant)
- `404 NotFoundError` (resource not found)
- `409 ConflictError` (duplicate pending request)
- `410 GoneError` (request expired during approval)
- `422 ValidationError` (invalid request body)
- `429 Too Many Requests` (rate limited)
