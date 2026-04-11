# Marketplace API Documentation

## Base URL
```
/api/marketplace
```

## Overview
Marketplace API allows students to create advertisements for selling or giving away items, upload images, and manage listings. It also provides report-based moderation endpoints for admins.

---

## Authentication
- Public endpoints: search listings, get listing by id
- Student endpoints: create/update/delete own listings, manage own listing images
- Authenticated endpoints: report listing
- Admin endpoints: open report queue, takedown/reinstate listing, resolve report

JWT must be provided in `Authorization: Bearer <token>` for protected routes.

---

## Enums & Constants

### MarketplaceAdType
```ts
enum MarketplaceAdType {
  SELL = "SELL",
  GIVEAWAY = "GIVEAWAY"
}
```

### MarketplaceCondition
```ts
enum MarketplaceCondition {
  NEW = "NEW",
  LIKE_NEW = "LIKE_NEW",
  GOOD = "GOOD",
  FAIR = "FAIR",
  POOR = "POOR"
}
```

### MarketplaceStatus
```ts
enum MarketplaceStatus {
  ACTIVE = "ACTIVE",
  TAKEN_DOWN = "TAKEN_DOWN",
  REMOVED = "REMOVED"
}
```

### MarketplaceReportReason
```ts
enum MarketplaceReportReason {
  SPAM = "SPAM",
  SCAM = "SCAM",
  PROHIBITED_ITEM = "PROHIBITED_ITEM",
  HARASSMENT = "HARASSMENT",
  OTHER = "OTHER"
}
```

### MarketplaceReportStatus
```ts
enum MarketplaceReportStatus {
  OPEN = "OPEN",
  RESOLVED = "RESOLVED",
  DISMISSED = "DISMISSED"
}
```

### Constants
```ts
MAX_MARKETPLACE_IMAGES = 4
```

---

## Endpoints

### 1) Search listings (Public)
**GET** `/api/marketplace`

Query params:
- `page` (number, default `1`)
- `size` (number, default `20`, max `100`)
- `search` (string)
- `adType` (`SELL` | `GIVEAWAY`)
- `category` (string)
- `city` (string)
- `district` (string)
- `minPrice` (number)
- `maxPrice` (number)
- `sortBy` (`price` | `createdAt`, default `createdAt`)
- `sortDir` (`asc` | `desc`, default `desc`)

Success `200`:
```json
{
  "success": true,
  "data": {
    "items": [],
    "pagination": {
      "total": 0,
      "page": 1,
      "size": 20,
      "totalPages": 0
    }
  },
  "message": "Success",
  "timestamp": "2026-04-11T10:00:00.000Z"
}
```

---

### 2) Get listing by id (Public)
**GET** `/api/marketplace/:id`

Success `200`:
```json
{
  "success": true,
  "data": { "item": {} },
  "message": "Success",
  "timestamp": "2026-04-11T10:00:00.000Z"
}
```

---

### 3) Get my ads (Student)
**GET** `/api/marketplace/my-ads`

Auth: `STUDENT`

Success `200`:
```json
{
  "success": true,
  "data": { "items": [] },
  "message": "Success",
  "timestamp": "2026-04-11T10:00:00.000Z"
}
```

---

### 4) Create listing (Student)
**POST** `/api/marketplace`

Auth: `STUDENT`

Body:
```json
{
  "title": "Desk chair",
  "description": "Used chair in good condition",
  "adType": "SELL",
  "category": "Furniture",
  "itemCondition": "GOOD",
  "price": 8000,
  "city": "Colombo",
  "district": "Colombo"
}
```

Rules:
- `price` is required for `SELL`
- `price` must not be provided for `GIVEAWAY`

Success `201`:
```json
{
  "success": true,
  "data": { "item": {} },
  "message": "Marketplace item created successfully",
  "timestamp": "2026-04-11T10:00:00.000Z"
}
```

---

### 5) Update listing (Student)
**PUT** `/api/marketplace/:id`

Auth: `STUDENT` (owner only)

Body: partial create payload

Success `200`:
```json
{
  "success": true,
  "data": { "item": {} },
  "message": "Success",
  "timestamp": "2026-04-11T10:00:00.000Z"
}
```

---

### 6) Delete listing (Student)
**DELETE** `/api/marketplace/:id`

Auth: `STUDENT` (owner only)

Behavior:
- Soft delete (`isDeleted=true`)
- status set to `REMOVED`

Success `200`:
```json
{
  "success": true,
  "data": null,
  "message": "Marketplace item removed successfully",
  "timestamp": "2026-04-11T10:00:00.000Z"
}
```

---

### 7) Upload listing images (Student)
**POST** `/api/marketplace/:id/images`

Auth: `STUDENT` (owner only)

Content-Type: `multipart/form-data`
- Field name: `images`
- Max count: `4`

Success `200`:
```json
{
  "success": true,
  "data": { "images": [] },
  "message": "Success",
  "timestamp": "2026-04-11T10:00:00.000Z"
}
```

---

### 8) Delete listing image (Student)
**DELETE** `/api/marketplace/:id/images/:imageId`

Auth: `STUDENT` (owner only)

Success `200`:
```json
{
  "success": true,
  "data": null,
  "message": "Marketplace image deleted successfully",
  "timestamp": "2026-04-11T10:00:00.000Z"
}
```

---

### 9) Report listing (Authenticated)
**POST** `/api/marketplace/:id/report`

Body:
```json
{
  "reason": "SCAM",
  "details": "Suspicious payment request"
}
```

Rules:
- Reporter cannot report own listing
- Duplicate open report by same reporter is blocked

Success `201`:
```json
{
  "success": true,
  "data": null,
  "message": "Listing reported successfully",
  "timestamp": "2026-04-11T10:00:00.000Z"
}
```

---

### 10) Get open reports (Admin)
**GET** `/api/marketplace/reports/open`

Auth: `ADMIN`

Success `200`:
```json
{
  "success": true,
  "data": { "reports": [] },
  "message": "Success",
  "timestamp": "2026-04-11T10:00:00.000Z"
}
```

---

### 11) Takedown listing (Admin)
**PATCH** `/api/marketplace/:id/takedown`

Auth: `ADMIN`

Body:
```json
{ "reason": "Policy violation" }
```

Success `200`:
```json
{
  "success": true,
  "data": { "item": {} },
  "message": "Success",
  "timestamp": "2026-04-11T10:00:00.000Z"
}
```

---

### 12) Reinstate listing (Admin)
**PATCH** `/api/marketplace/:id/reinstate`

Auth: `ADMIN`

Success `200`:
```json
{
  "success": true,
  "data": { "item": {} },
  "message": "Success",
  "timestamp": "2026-04-11T10:00:00.000Z"
}
```

---

### 13) Resolve report (Admin)
**PATCH** `/api/marketplace/reports/:reportId/resolve`

Auth: `ADMIN`

Body:
```json
{
  "status": "RESOLVED",
  "notes": "Taken down by admin"
}
```

`status` must be one of `RESOLVED`, `DISMISSED`.

Success `200`:
```json
{
  "success": true,
  "data": { "report": {} },
  "message": "Success",
  "timestamp": "2026-04-11T10:00:00.000Z"
}
```
