# Payments API (Frontend)

## Base URL

```txt
http://localhost:3000/api
```

## Authentication

```http
Authorization: Bearer <access-token>
```

All payment routes require authentication.

---

## Rate Limit

Payment routes use the payment limiter:

- Window: `15 minutes`
- Max requests: `200` per IP

Possible limit response:

```json
{
  "success": false,
  "error": "TooManyRequests",
  "message": "Too many requests. Please try again later.",
  "timestamp": "2026-03-22T12:00:00.000Z"
}
```

---

## Enums

### PaymentMethod

- `CASH`
- `BANK_TRANSFER`
- `ONLINE`

### PaymentStatus

- `PENDING`
- `CONFIRMED`
- `REJECTED`

### RentalPeriodStatus

- `UPCOMING`
- `DUE`
- `PARTIALLY_PAID`
- `PAID`
- `OVERDUE`

---

## 1) Log a Payment (Student)

- **Endpoint:** `POST /api/payments`
- **Role:** `STUDENT`
- **Purpose:** Student submits a payment record for a rental period.

### Request Body

| Field | Type | Required | Rules |
|---|---|---|---|
| `rentalPeriodId` | string | yes | non-empty |
| `reservationId` | string | yes | non-empty |
| `amount` | number | yes | must be `> 0` |
| `paymentMethod` | enum | yes | `CASH` \| `BANK_TRANSFER` \| `ONLINE` |
| `referenceNumber` | string | no | max 100 chars |
| `proofImageUrl` | string | no | valid URL |
| `paidAt` | string | yes | ISO datetime; must not be in the future |

### Valid Sample Payload

```json
{
  "rentalPeriodId": "cmrp123...",
  "reservationId": "cmr123...",
  "amount": 14000,
  "paymentMethod": "BANK_TRANSFER",
  "referenceNumber": "TXN-2026-0001",
  "proofImageUrl": "https://example.com/payment-proof.jpg",
  "paidAt": "2026-03-22T08:30:00.000Z"
}
```

### Backend Business Validation

Backend can reject even when schema passes:

1. `paidAt` cannot be in the future
2. Rental period must exist
3. Reservation must exist
4. Reservation must belong to logged-in student
5. Rental period must belong to the provided reservation
6. Rental period must not already be fully paid (`PAID`)
7. `amount` cannot exceed current remaining balance

### Success (201)

```json
{
  "success": true,
  "message": "Payment logged successfully",
  "data": {
    "payment": {
      "id": "cmp123...",
      "rentalPeriodId": "cmrp123...",
      "reservationId": "cmr123...",
      "studentId": "cms123...",
      "student": {
        "id": "cms123...",
        "firstName": "Nimal",
        "lastName": "Perera",
        "email": "nimal@student.edu"
      },
      "rentalPeriod": {
        "id": "cmrp123...",
        "periodLabel": "March 2026",
        "dueDate": "2026-03-31T00:00:00.000Z",
        "amountDue": 14000,
        "status": "DUE"
      },
      "reservation": {
        "id": "cmr123...",
        "status": "ACTIVE",
        "moveInDate": "2026-03-01T00:00:00.000Z",
        "boardingId": "cmb123...",
        "boarding": {
          "id": "cmb123...",
          "title": "Cozy Annex Near Campus"
        }
      },
      "amount": "14000.00",
      "paymentMethod": "BANK_TRANSFER",
      "referenceNumber": "TXN-2026-0001",
      "proofImageUrl": "https://example.com/payment-proof.jpg",
      "status": "PENDING",
      "paidAt": "2026-03-22T08:30:00.000Z",
      "rejectionReason": null,
      "confirmedAt": null,
      "createdAt": "2026-03-22T11:00:00.000Z",
      "updatedAt": "2026-03-22T11:00:00.000Z"
    }
  },
  "timestamp": "2026-03-22T11:00:00.000Z"
}
```

---

## 2) Get My Payments (Student)

- **Endpoint:** `GET /api/payments/my-payments`
- **Role:** `STUDENT`
- **Purpose:** Returns all payments of the logged-in student.

### Success (200)

```json
{
  "success": true,
  "message": "Success",
  "data": {
    "payments": [
      {
        "id": "cmp123...",
        "rentalPeriodId": "cmrp123...",
        "reservationId": "cmr123...",
        "studentId": "cms123...",
        "student": {
          "id": "cms123...",
          "firstName": "Nimal",
          "lastName": "Perera",
          "email": "nimal@student.edu"
        },
        "rentalPeriod": {
          "id": "cmrp123...",
          "periodLabel": "March 2026",
          "dueDate": "2026-03-31T00:00:00.000Z",
          "amountDue": 14000,
          "status": "DUE"
        },
        "reservation": {
          "id": "cmr123...",
          "status": "ACTIVE",
          "moveInDate": "2026-03-01T00:00:00.000Z",
          "boardingId": "cmb123...",
          "boarding": {
            "id": "cmb123...",
            "title": "Cozy Annex Near Campus"
          }
        },
        "amount": "14000.00",
        "paymentMethod": "BANK_TRANSFER",
        "referenceNumber": "TXN-2026-0001",
        "proofImageUrl": "https://example.com/payment-proof.jpg",
        "status": "PENDING",
        "paidAt": "2026-03-22T08:30:00.000Z",
        "rejectionReason": null,
        "confirmedAt": null,
        "createdAt": "2026-03-22T11:00:00.000Z",
        "updatedAt": "2026-03-22T11:00:00.000Z"
      }
    ]
  },
  "timestamp": "2026-03-22T11:10:00.000Z"
}
```

### Response Notes

- Ordered by `createdAt` descending (newest first)
- `amount` is Prisma `Decimal`, usually serialized as string
- Each payment includes nested `student`, `rentalPeriod`, and `reservation` details

---

## 3) Get Payments for My Boardings (Owner)

- **Endpoint:** `GET /api/payments/my-boardings`
- **Role:** `OWNER`
- **Purpose:** Owner views payments tied to reservations in owner’s boardings.

### Success (200)

```json
{
  "success": true,
  "message": "Success",
  "data": {
    "payments": [
      {
        "id": "cmp123...",
        "rentalPeriodId": "cmrp123...",
        "reservationId": "cmr123...",
        "studentId": "cms123...",
        "student": {
          "id": "cms123...",
          "firstName": "Nimal",
          "lastName": "Perera",
          "email": "nimal@student.edu"
        },
        "rentalPeriod": {
          "id": "cmrp123...",
          "periodLabel": "March 2026",
          "dueDate": "2026-03-31T00:00:00.000Z",
          "amountDue": 14000,
          "status": "DUE"
        },
        "reservation": {
          "id": "cmr123...",
          "status": "ACTIVE",
          "moveInDate": "2026-03-01T00:00:00.000Z",
          "boardingId": "cmb123...",
          "boarding": {
            "id": "cmb123...",
            "title": "Cozy Annex Near Campus"
          }
        },
        "amount": "14000.00",
        "paymentMethod": "BANK_TRANSFER",
        "referenceNumber": "TXN-2026-0001",
        "proofImageUrl": "https://example.com/payment-proof.jpg",
        "status": "PENDING",
        "paidAt": "2026-03-22T08:30:00.000Z",
        "rejectionReason": null,
        "confirmedAt": null,
        "createdAt": "2026-03-22T11:00:00.000Z",
        "updatedAt": "2026-03-22T11:00:00.000Z"
      }
    ]
  },
  "timestamp": "2026-03-22T11:15:00.000Z"
}
```

---

## 4) Upload Payment Proof Image (Student)

- **Endpoint:** `PUT /api/payments/proof-image`
- **Role:** `STUDENT`
- **Content-Type:** `multipart/form-data`
- **Purpose:** Upload a proof image and receive a hosted `proofImageUrl`.

### Form Data

| Field | Type | Required | Rules |
|---|---|---|---|
| `proofImage` | file | yes | `jpeg/jpg/png`, max 5MB |

### Backend Business Validation

1. File is required (`proofImage`)
2. User must be authenticated (`STUDENT` role)

### Current Implementation Notes

- Endpoint uploads image to Cloudinary and returns URL only.
- Endpoint does not update payment record in database in current version.

### Success (200)

```json
{
  "success": true,
  "message": "Proof image uploaded successfully",
  "data": {
    "proofImageUrl": "https://res.cloudinary.com/.../unistay/payment-proofs/...jpg"
  },
  "timestamp": "2026-03-22T11:18:00.000Z"
}
```

### Sample Request (FormData)

```ts
const formData = new FormData();
formData.append('proofImage', file);

await api.put(`/payments/proof-image`, formData, {
  headers: { 'Content-Type': 'multipart/form-data' },
});
```

---

## 5) Confirm Payment (Owner)

- **Endpoint:** `PATCH /api/payments/:id/confirm`
- **Role:** `OWNER`
- **Purpose:** Owner confirms a pending payment.

### Business Rules

1. Payment must exist
2. Payment must belong to a boarding owned by requester
3. Payment status must be `PENDING`
4. On confirm:
   - Payment status becomes `CONFIRMED`
   - `confirmedAt` is set to current time
   - Rental period status is recalculated:
     - `PAID` when confirmed total >= `amountDue`
     - `PARTIALLY_PAID` when confirmed total > 0 and still below due

### Success (200)

```json
{
  "success": true,
  "message": "Payment confirmed",
  "data": {
    "payment": {
      "id": "cmp123...",
      "rentalPeriodId": "cmrp123...",
      "reservationId": "cmr123...",
      "studentId": "cms123...",
      "student": {
        "id": "cms123...",
        "firstName": "Nimal",
        "lastName": "Perera",
        "email": "nimal@student.edu"
      },
      "rentalPeriod": {
        "id": "cmrp123...",
        "periodLabel": "March 2026",
        "dueDate": "2026-03-31T00:00:00.000Z",
        "amountDue": 14000,
        "status": "PARTIALLY_PAID"
      },
      "reservation": {
        "id": "cmr123...",
        "status": "ACTIVE",
        "moveInDate": "2026-03-01T00:00:00.000Z",
        "boardingId": "cmb123...",
        "boarding": {
          "id": "cmb123...",
          "title": "Cozy Annex Near Campus"
        }
      },
      "amount": "14000.00",
      "paymentMethod": "BANK_TRANSFER",
      "referenceNumber": "TXN-2026-0001",
      "proofImageUrl": "https://example.com/payment-proof.jpg",
      "status": "CONFIRMED",
      "paidAt": "2026-03-22T08:30:00.000Z",
      "rejectionReason": null,
      "confirmedAt": "2026-03-22T11:20:00.000Z",
      "createdAt": "2026-03-22T11:00:00.000Z",
      "updatedAt": "2026-03-22T11:20:00.000Z"
    }
  },
  "timestamp": "2026-03-22T11:20:00.000Z"
}
```

---

## 6) Reject Payment (Owner)

- **Endpoint:** `PATCH /api/payments/:id/reject`
- **Role:** `OWNER`
- **Purpose:** Owner rejects a pending payment with a reason.

### Request Body

| Field | Type | Required | Rules |
|---|---|---|---|
| `reason` | string | yes | non-empty |

### Valid Sample Payload

```json
{
  "reason": "Transfer slip is unclear. Please upload a clearer proof image."
}
```

### Business Rules

1. Payment must exist
2. Payment must belong to a boarding owned by requester
3. Payment status must be `PENDING`
4. Rejection reason is mandatory

### Success (200)

```json
{
  "success": true,
  "message": "Payment rejected",
  "data": {
    "payment": {
      "id": "cmp123...",
      "rentalPeriodId": "cmrp123...",
      "reservationId": "cmr123...",
      "studentId": "cms123...",
      "student": {
        "id": "cms123...",
        "firstName": "Nimal",
        "lastName": "Perera",
        "email": "nimal@student.edu"
      },
      "rentalPeriod": {
        "id": "cmrp123...",
        "periodLabel": "March 2026",
        "dueDate": "2026-03-31T00:00:00.000Z",
        "amountDue": 14000,
        "status": "DUE"
      },
      "reservation": {
        "id": "cmr123...",
        "status": "ACTIVE",
        "moveInDate": "2026-03-01T00:00:00.000Z",
        "boardingId": "cmb123...",
        "boarding": {
          "id": "cmb123...",
          "title": "Cozy Annex Near Campus"
        }
      },
      "amount": "14000.00",
      "paymentMethod": "BANK_TRANSFER",
      "referenceNumber": "TXN-2026-0001",
      "proofImageUrl": "https://example.com/payment-proof.jpg",
      "status": "REJECTED",
      "paidAt": "2026-03-22T08:30:00.000Z",
      "rejectionReason": "Transfer slip is unclear. Please upload a clearer proof image.",
      "confirmedAt": null,
      "createdAt": "2026-03-22T11:00:00.000Z",
      "updatedAt": "2026-03-22T11:25:00.000Z"
    }
  },
  "timestamp": "2026-03-22T11:25:00.000Z"
}
```

---

## Error Responses to Handle

### 1) Validation errors (422 ValidationError)

Example:

```json
{
  "success": false,
  "error": "ValidationError",
  "message": "Validation failed",
  "details": [
    {
      "field": "amount",
      "message": "Amount must be greater than 0"
    }
  ],
  "timestamp": "2026-03-22T11:30:00.000Z"
}
```

### 2) Auth / role errors

- `401 UnauthorizedError`: missing/invalid/expired token
- `403 ForbiddenError`:
  - `Insufficient Permissions`
  - `You are not the student on this reservation`
  - `You do not own this boarding`

### 3) Not found (404)

- `Rental period not found`
- `Reservation not found`
- `Payment not found`

### 4) Bad request (400)

- `paidAt cannot be in the future`
- `Rental period does not belong to this reservation`
- `Amount exceeds remaining balance of <value>`
- `Only PENDING payments can be confirmed`
- `Only PENDING payments can be rejected`
- `No image file provided`

### 5) Upload file errors

- Invalid file type. Only image files are accepted by upload middleware
- File too large (max 5MB)

### 6) Conflict (409)

- `Rental period is already fully paid`

---

## Frontend Validation Checklist

Before calling `POST /api/payments`:

- `rentalPeriodId` is present and non-empty
- `reservationId` is present and non-empty
- `amount` is a number and `> 0`
- `paymentMethod` is one of `CASH | BANK_TRANSFER | ONLINE`
- `referenceNumber` length is `<= 100` (if provided)
- `proofImageUrl` is a valid URL (if provided)
- `paidAt` is a valid ISO datetime string and not in the future
- User is logged in with `STUDENT` role
- `Authorization` header uses `Bearer <token>`

Before calling `PUT /api/payments/:id/proof-image`:

- Send request as `multipart/form-data`
- Use file field name exactly `proofImage`
- Accept only `jpeg/jpg/png`
- Enforce max file size `5MB`

Client-side pre-checks reduce avoidable `422` and `400` errors.

### Suggested Client Validation (TypeScript + Zod)

```ts
import { z } from 'zod';

export const createPaymentClientSchema = z.object({
  rentalPeriodId: z.string().min(1, 'rentalPeriodId is required'),
  reservationId: z.string().min(1, 'reservationId is required'),
  amount: z.number().positive('Amount must be greater than 0'),
  paymentMethod: z.enum(['CASH', 'BANK_TRANSFER', 'ONLINE']),
  referenceNumber: z.string().max(100, 'Reference number max 100 characters').optional(),
  proofImageUrl: z.string().url('proofImageUrl must be a valid URL').optional(),
  paidAt: z.string().datetime({ offset: true }),
}).refine((v) => new Date(v.paidAt) <= new Date(), {
  message: 'paidAt cannot be in the future',
  path: ['paidAt'],
});
```

---

## API Client: Send & Get Data

The API wraps payloads under `data`. Your client should read:

- Single payment: `response.data.data.payment`
- Payment list: `response.data.data.payments`
- Upload URL: `response.data.data.proofImageUrl`

### Minimal Axios Client

```ts
import axios from 'axios';

export const api = axios.create({
  baseURL: 'http://localhost:3000/api',
});

export function setAuthToken(token: string) {
  api.defaults.headers.common.Authorization = `Bearer ${token}`;
}
```

### Create Payment (Student)

```ts
type CreatePaymentInput = {
  rentalPeriodId: string;
  reservationId: string;
  amount: number;
  paymentMethod: 'CASH' | 'BANK_TRANSFER' | 'ONLINE';
  referenceNumber?: string;
  proofImageUrl?: string;
  paidAt: string;
};

export async function createPayment(input: CreatePaymentInput) {
  const res = await api.post('/payments', input);
  return res.data.data.payment;
}
```

### Get My Payments (Student)

```ts
export async function getMyPayments() {
  const res = await api.get('/payments/my-payments');
  return res.data.data.payments;
}
```

### Get My Boarding Payments (Owner)

```ts
export async function getMyBoardingPayments() {
  const res = await api.get('/payments/my-boardings');
  return res.data.data.payments;
}
```

### Confirm / Reject (Owner)

```ts
export async function confirmPayment(id: string) {
  const res = await api.patch(`/payments/${id}/confirm`);
  return res.data.data.payment;
}

export async function rejectPayment(id: string, reason: string) {
  const res = await api.patch(`/payments/${id}/reject`, { reason });
  return res.data.data.payment;
}
```

### Upload Proof Image (Student)

```ts
export async function uploadPaymentProofImage(id: string, file: File) {
  const formData = new FormData();
  formData.append('proofImage', file);

  const res = await api.put(`/payments/${id}/proof-image`, formData, {
    headers: { 'Content-Type': 'multipart/form-data' },
  });

  return res.data.data.proofImageUrl as string;
}
```

### Response Mapping Tip

`amount` is usually serialized as a string (`"14000.00"`). Convert carefully for UI math:

```ts
const amountNumber = Number(payment.amount);
```

For currency-safe totals, prefer decimal-safe handling in frontend logic.

---

## Frontend Integration Checklist

- Use correct role per endpoint (`STUDENT` vs `OWNER`)
- Validate request payload before sending
- Parse backend validation details from `details[]` for field-level UI messages
- Treat `amount` in responses as decimal-safe value
- For proof upload, use `multipart/form-data` with `proofImage` file field
- For owner actions, only show confirm/reject controls when payment is `PENDING`
- Refresh payment list and rental-period view after confirm/reject
