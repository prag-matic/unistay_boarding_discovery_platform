# Review API (Frontend)

## Base URL

```txt
http://localhost:3000/api
```

## Route Prefix

```txt
/api/reviews
```

## Authentication

Current review controller supports either:

```http
Authorization: Bearer <access-token>
```

or (fallback used for local testing):

```http
x-user-id: <user-id>
```

> Note: protected actions (create/update/delete/react/comment) require user identity.

## Content Types

- `application/json` for reactions and comment endpoints.
- `multipart/form-data` for create/update review (`data` + optional files).

---

## Common Success Envelope

All review endpoints now use `sendSuccess`:

```json
{
  "success": true,
  "message": "Success",
  "data": {},
  "timestamp": "2026-03-25T10:00:00.000Z"
}
```

## Common Error Envelope

```json
{
  "success": false,
  "error": "BadRequestError",
  "message": "Bad request",
  "timestamp": "2026-03-25T10:00:00.000Z"
}
```

---

## Validation Rules

### Review Create Payload (`data` field in multipart)

```json
{
  "boardingId": "cuid",
  "rating": 5,
  "comment": "optional, max 1000 chars"
}
```

- `boardingId`: required, valid CUID.
- `rating`: required integer, `1..5`.
- `comment`: optional, nullable, max 1000 chars.

### Review Update Payload (`data` field in multipart)

Uses `updateReviewSchema` (`reviewSchema.partial()`):
- all fields optional (`boardingId`, `rating`, `comment`, `images`, `video`).
- business rules still enforce ownership + one-time edit.

### Comment Payload

```json
{
  "comment": "required, max 500 chars"
}
```

### Reaction Payload

```json
{
  "type": "LIKE"
}
```

- `type` must be `LIKE` or `DISLIKE`.

---

## File Upload Rules (Review Create/Update)

- `images`: up to 5 files.
- `video`: up to 1 file.
- total file count max: 6.
- max size: 10 MB per file.
- image MIME types: `image/jpeg`, `image/png`, `image/gif`, `image/webp`.
- video MIME types: `video/mp4`, `video/webm`, `video/quicktime`.
- `application/octet-stream` video accepted only when extension is `.mp4`, `.webm`, `.mov`, `.mkv`, `.avi`.
- uploaded media is stored in Cloudinary under review image/video folders.

---

## 1) Create Review

- **Endpoint:** `POST /api/reviews`
- **Body type:** `multipart/form-data`

### Multipart Fields

- `data` (required): JSON string review payload
- `images` (optional): multiple files
- `video` (optional): single file

### cURL

```bash
curl -X POST http://localhost:3000/api/reviews \
  -H "x-user-id: <student-id>" \
  -F 'data={"boardingId":"<boarding-id>","rating":5,"comment":"Great place!"}' \
  -F 'images=@/path/to/image1.jpg' \
  -F 'video=@/path/to/video.mp4'
```

### Success (201)

```json
{
  "success": true,
  "message": "Review created successfully",
  "data": {
    "id": "cmad7x1rv0009hpk0xw48v9jr",
    "boardingId": "cmad6wkrp0003hpk07v2rd7xq",
    "studentId": "cmad6u8tj0001hpk0w2r5qz5a",
    "rating": 5,
    "comment": "Great place, clean rooms and friendly owner.",
    "images": [
      "https://res.cloudinary.com/demo/image/upload/v1742871800/unistay/reviews/cmad6wkrp0003hpk07v2rd7xq/images/rv_img_01.jpg",
      "https://res.cloudinary.com/demo/image/upload/v1742871802/unistay/reviews/cmad6wkrp0003hpk07v2rd7xq/images/rv_img_02.jpg"
    ],
    "video": "https://res.cloudinary.com/demo/video/upload/v1742871810/unistay/reviews/cmad6wkrp0003hpk07v2rd7xq/videos/rv_vid_01.mp4",
    "likeCount": 0,
    "dislikeCount": 0,
    "commentedAt": "2026-03-25T10:00:00.000Z",
    "editedAt": null,
    "boarding": {
      "id": "cmad6wkrp0003hpk07v2rd7xq",
      "ownerId": "cmad6ud6s0002hpk0c4ny8rry",
      "title": "Lake View Female Boarding",
      "slug": "lake-view-female-boarding",
      "description": "Walking distance to SLIIT, furnished rooms.",
      "city": "Malabe",
      "district": "Colombo",
      "address": "No 12, New Kandy Road",
      "monthlyRent": 28000,
      "boardingType": "DOUBLE",
      "genderPref": "FEMALE",
      "nearUniversity": "SLIIT",
      "latitude": 6.9147,
      "longitude": 79.9729,
      "maxOccupants": 8,
      "currentOccupants": 6,
      "status": "ACTIVE",
      "rejectionReason": null,
      "isDeleted": false,
      "createdAt": "2026-03-20T08:00:00.000Z",
      "updatedAt": "2026-03-24T08:00:00.000Z"
    },
    "student": {
      "id": "cmad6u8tj0001hpk0w2r5qz5a",
      "firstName": "Nethmi",
      "lastName": "Perera",
      "email": "nethmi@example.com"
    }
  },
  "timestamp": "2026-03-25T10:00:00.000Z"
}
```

---

## 2) Get Review by ID

- **Endpoint:** `GET /api/reviews/:id`

### Success (200)

```json
{
  "success": true,
  "message": "Success",
  "data": {
    "id": "cmad7x1rv0009hpk0xw48v9jr",
    "boardingId": "cmad6wkrp0003hpk07v2rd7xq",
    "studentId": "cmad6u8tj0001hpk0w2r5qz5a",
    "rating": 5,
    "comment": "Great place, clean rooms and friendly owner.",
    "images": [
      "https://res.cloudinary.com/demo/image/upload/v1742871800/unistay/reviews/cmad6wkrp0003hpk07v2rd7xq/images/rv_img_01.jpg"
    ],
    "video": "https://res.cloudinary.com/demo/video/upload/v1742871810/unistay/reviews/cmad6wkrp0003hpk07v2rd7xq/videos/rv_vid_01.mp4",
    "likeCount": 3,
    "dislikeCount": 1,
    "commentedAt": "2026-03-25T10:00:00.000Z",
    "editedAt": null,
    "boarding": {
      "id": "cmad6wkrp0003hpk07v2rd7xq",
      "title": "Lake View Female Boarding",
      "boardingType": "DOUBLE",
      "address": "No 12, New Kandy Road",
      "city": "Malabe"
    },
    "student": {
      "id": "cmad6u8tj0001hpk0w2r5qz5a",
      "firstName": "Nethmi",
      "lastName": "Perera",
      "email": "nethmi@example.com"
    },
    "comments": [
      {
        "id": "cmad8g0t3000chpk0xjv3em9z",
        "reviewId": "cmad7x1rv0009hpk0xw48v9jr",
        "commentorId": "cmad6ud6s0002hpk0c4ny8rry",
        "comment": "Thank you for your feedback!",
        "likeCount": 2,
        "dislikeCount": 0,
        "commentedAt": "2026-03-25T10:30:00.000Z",
        "editedAt": null,
        "commentor": {
          "id": "cmad6ud6s0002hpk0c4ny8rry",
          "firstName": "Kasun",
          "lastName": "Silva",
          "email": "kasun@example.com"
        }
      }
    ]
  },
  "timestamp": "2026-03-25T10:00:00.000Z"
}
```

### Not Found

- `404` when review does not exist.

---

## 3) Get Reviews by Boarding

- **Endpoint:** `GET /api/reviews/boarding/:boardingId`

### Query Params

- `page` (default `1`)
- `limit` (default `10`)
- `sortBy`: `rating` | `commentedAt` (default `commentedAt`)
- `sortOrder`: `asc` | `desc` (default `desc`)

### Success (200)

```json
{
  "success": true,
  "message": "Success",
  "data": {
    "reviews": [
      {
        "id": "cmad7x1rv0009hpk0xw48v9jr",
        "boardingId": "cmad6wkrp0003hpk07v2rd7xq",
        "studentId": "cmad6u8tj0001hpk0w2r5qz5a",
        "rating": 5,
        "comment": "Great place, clean rooms and friendly owner.",
        "images": [
          "https://res.cloudinary.com/demo/image/upload/v1742871800/unistay/reviews/cmad6wkrp0003hpk07v2rd7xq/images/rv_img_01.jpg"
        ],
        "video": null,
        "likeCount": 3,
        "dislikeCount": 0,
        "commentedAt": "2026-03-25T10:00:00.000Z",
        "editedAt": null,
        "student": {
          "id": "cmad6u8tj0001hpk0w2r5qz5a",
          "firstName": "Nethmi",
          "lastName": "Perera",
          "email": "nethmi@example.com"
        },
        "comments": [
          {
            "id": "cmad8g0t3000chpk0xjv3em9z",
            "reviewId": "cmad7x1rv0009hpk0xw48v9jr",
            "commentorId": "cmad6ud6s0002hpk0c4ny8rry",
            "comment": "Thank you for your feedback!",
            "likeCount": 2,
            "dislikeCount": 0,
            "commentedAt": "2026-03-25T10:30:00.000Z",
            "editedAt": null,
            "commentor": {
              "id": "cmad6ud6s0002hpk0c4ny8rry",
              "firstName": "Kasun",
              "lastName": "Silva",
              "email": "kasun@example.com"
            }
          }
        ]
      }
    ],
    "pagination": {
      "page": 1,
      "limit": 10,
      "total": 1,
      "totalPages": 1
    }
  },
  "timestamp": "2026-03-25T10:00:00.000Z"
}
```

> Each review includes selected `student` and up to 5 comments.

---

## 4) Get Review Stats by Boarding

- **Endpoint:** `GET /api/reviews/boarding/:boardingId/stats`

### Success (200)

```json
{
  "success": true,
  "message": "Success",
  "data": {
    "totalReviews": 33,
    "averageRating": 4.2,
    "ratingDistribution": {
      "1": 1,
      "2": 2,
      "3": 5,
      "4": 10,
      "5": 15
    }
  },
  "timestamp": "2026-03-25T10:00:00.000Z"
}
```

`averageRating` is rounded to 1 decimal place.

---

## 5) Update Review (One-Time Edit)

- **Endpoint:** `PUT /api/reviews/:id`
- **Body type:** `multipart/form-data`

### Business Rules

- only review owner can update.
- review can be edited once (`editedAt` must be null).
- service errors are mapped to API errors:
  - `404` review not found
  - `403` non-owner attempts
  - `400` already edited

### Success (200)

```json
{
  "success": true,
  "message": "Review updated successfully",
  "data": {
    "id": "cmad7x1rv0009hpk0xw48v9jr",
    "boardingId": "cmad6wkrp0003hpk07v2rd7xq",
    "studentId": "cmad6u8tj0001hpk0w2r5qz5a",
    "rating": 4,
    "comment": "Updated after two weeks of stay. Still very good.",
    "images": [
      "https://res.cloudinary.com/demo/image/upload/v1742958200/unistay/reviews/cmad6wkrp0003hpk07v2rd7xq/images/rv_img_03.jpg"
    ],
    "video": null,
    "likeCount": 3,
    "dislikeCount": 0,
    "commentedAt": "2026-03-25T10:00:00.000Z",
    "editedAt": "2026-03-26T09:15:00.000Z",
    "boarding": {
      "id": "cmad6wkrp0003hpk07v2rd7xq",
      "ownerId": "cmad6ud6s0002hpk0c4ny8rry",
      "title": "Lake View Female Boarding",
      "slug": "lake-view-female-boarding",
      "description": "Walking distance to SLIIT, furnished rooms.",
      "city": "Malabe",
      "district": "Colombo",
      "address": "No 12, New Kandy Road",
      "monthlyRent": 28000,
      "boardingType": "DOUBLE",
      "genderPref": "FEMALE",
      "nearUniversity": "SLIIT",
      "latitude": 6.9147,
      "longitude": 79.9729,
      "maxOccupants": 8,
      "currentOccupants": 6,
      "status": "ACTIVE",
      "rejectionReason": null,
      "isDeleted": false,
      "createdAt": "2026-03-20T08:00:00.000Z",
      "updatedAt": "2026-03-26T09:15:00.000Z"
    },
    "student": {
      "id": "cmad6u8tj0001hpk0w2r5qz5a",
      "firstName": "Nethmi",
      "lastName": "Perera",
      "email": "nethmi@example.com"
    }
  },
  "timestamp": "2026-03-25T10:00:00.000Z"
}
```

---

## 6) Delete Review

- **Endpoint:** `DELETE /api/reviews/:id`

### Success (200)

```json
{
  "success": true,
  "message": "Review deleted successfully",
  "data": null,
  "timestamp": "2026-03-25T10:00:00.000Z"
}
```

---

## 7) React to Review

- **Endpoint:** `POST /api/reviews/:id/reactions`
- **Body type:** `application/json`

```json
{
  "type": "LIKE"
}
```

### Toggle Behavior

- first reaction => `action: "added"`
- same reaction again => `action: "removed"`
- opposite reaction => `action: "changed"`

### Success (200)

```json
{
  "success": true,
  "message": "Review liked",
  "data": {
    "action": "added",
    "type": "LIKE"
  },
  "timestamp": "2026-03-25T10:00:00.000Z"
}
```

---

## 8) Create Comment on Review

- **Endpoint:** `POST /api/reviews/:id/comments`
- **Body type:** `application/json`

```json
{
  "comment": "Nice review"
}
```

### Success (201)

```json
{
  "success": true,
  "message": "Comment added successfully",
  "data": {
    "id": "cmad8g0t3000chpk0xjv3em9z",
    "reviewId": "cmad7x1rv0009hpk0xw48v9jr",
    "commentorId": "cmad6ud6s0002hpk0c4ny8rry",
    "comment": "Thank you for your feedback!",
    "likeCount": 0,
    "dislikeCount": 0,
    "commentedAt": "2026-03-25T10:30:00.000Z",
    "editedAt": null,
    "commentor": {
      "id": "cmad6ud6s0002hpk0c4ny8rry",
      "firstName": "Kasun",
      "lastName": "Silva",
      "email": "kasun@example.com"
    },
    "review": {
      "id": "cmad7x1rv0009hpk0xw48v9jr",
      "boardingId": "cmad6wkrp0003hpk07v2rd7xq"
    }
  },
  "timestamp": "2026-03-25T10:00:00.000Z"
}
```

---

## 9) Update Review Comment (One-Time Edit)

- **Endpoint:** `PUT /api/reviews/comments/:id`

### Business Rules

- only comment owner can update
- comment can be edited once
- mapped errors:
  - `404` comment not found
  - `403` non-owner attempts
  - `400` already edited

### Success (200)

```json
{
  "success": true,
  "message": "Comment updated successfully",
  "data": {
    "id": "cmad8g0t3000chpk0xjv3em9z",
    "reviewId": "cmad7x1rv0009hpk0xw48v9jr",
    "commentorId": "cmad6ud6s0002hpk0c4ny8rry",
    "comment": "Thank you for your feedback. Glad you liked it.",
    "likeCount": 1,
    "dislikeCount": 0,
    "commentedAt": "2026-03-25T10:30:00.000Z",
    "editedAt": "2026-03-26T07:40:00.000Z",
    "commentor": {
      "id": "cmad6ud6s0002hpk0c4ny8rry",
      "firstName": "Kasun",
      "lastName": "Silva",
      "email": "kasun@example.com"
    }
  },
  "timestamp": "2026-03-25T10:00:00.000Z"
}
```

---

## 10) Delete Review Comment

- **Endpoint:** `DELETE /api/reviews/comments/:id`

### Success (200)

```json
{
  "success": true,
  "message": "Comment deleted successfully",
  "data": null,
  "timestamp": "2026-03-25T10:00:00.000Z"
}
```

---

## 11) React to Review Comment

- **Endpoint:** `POST /api/reviews/comments/:id/reactions`
- **Body type:** `application/json`

```json
{
  "type": "DISLIKE"
}
```

### Success (200)

```json
{
  "success": true,
  "message": "Comment reaction updated",
  "data": {
    "action": "changed",
    "type": "DISLIKE"
  },
  "timestamp": "2026-03-25T10:00:00.000Z"
}
```

---

## Common Error Cases

- `400` `BadRequestError`
  - invalid JSON in multipart `data`
  - missing user identity
  - one-time edit already used
- `401` `UnauthorizedError`
  - when auth middleware is used and token is missing/invalid
- `403` `ForbiddenError`
  - editing/deleting another user’s review/comment
- `404` `NotFoundError`
  - review/comment not found
- `422` `ValidationError`
  - body validation from `validate(...)` middleware (e.g., reactions, update comment)

---

## Quick Endpoint List

- `POST /api/reviews`
- `GET /api/reviews/:id`
- `PUT /api/reviews/:id`
- `DELETE /api/reviews/:id`
- `POST /api/reviews/:id/reactions`
- `GET /api/reviews/boarding/:boardingId`
- `GET /api/reviews/boarding/:boardingId/stats`
- `POST /api/reviews/:id/comments`
- `PUT /api/reviews/comments/:id`
- `DELETE /api/reviews/comments/:id`
- `POST /api/reviews/comments/:id/reactions`
