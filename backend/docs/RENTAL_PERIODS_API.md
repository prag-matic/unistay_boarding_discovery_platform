# Rental Periods API (Frontend)

## Base URL

```txt
http://localhost:3000/api
```

## Authentication

```http
Authorization: Bearer <access-token>
```

## Route

```txt
GET /api/reservation/:resId/rental-periods
```

---

## Access Rules

- Allowed: reservation participant (`student`) or boarding `owner`, and `ADMIN`
- Denied for unrelated users

---

## RentalPeriod Status Enum

- `UPCOMING`
- `DUE`
- `PARTIALLY_PAID`
- `PAID`
- `OVERDUE`

---

## 1) Get Rental Periods by Reservation

- **Endpoint:** `GET /api/reservation/:resId/rental-periods`
- **Role:** authenticated participant or `ADMIN`
- **Body:** none

### Success (200)

```json
{
  "success": true,
  "message": "Success",
  "data": {
    "rentalPeriods": [
      {
        "id": "cmrp1...",
        "reservationId": "cmr123...",
        "periodLabel": "2026-04",
        "dueDate": "2026-04-01T00:00:00.000Z",
        "amountDue": 28000,
        "status": "UPCOMING",
        "createdAt": "2026-03-22T11:15:00.000Z",
        "updatedAt": "2026-03-22T11:15:00.000Z",
        "payments": [
          {
            "id": "cmp1...",
            "amount": "28000.00",
            "paymentMethod": "BANK_TRANSFER",
            "status": "CONFIRMED",
            "paidAt": "2026-04-01T06:00:00.000Z",
            "confirmedAt": "2026-04-01T07:00:00.000Z"
          }
        ]
      }
    ]
  },
  "timestamp": "2026-03-22T11:20:00.000Z"
}
```

### Response Notes

- Rental periods are ordered by `dueDate` ascending
- `payments[].amount` is Prisma `Decimal`, usually serialized as a string
- `paymentMethod` enum values: `CASH`, `BANK_TRANSFER`, `ONLINE`
- `payment.status` enum values: `PENDING`, `CONFIRMED`, `REJECTED`

---

## Common Frontend Error Cases

- `401 UnauthorizedError` (missing/invalid token)
- `403 ForbiddenError` (not participant/owner/admin)
- `404 NotFoundError` (`Reservation not found`)
- `429 Too Many Requests` (rate limited)
