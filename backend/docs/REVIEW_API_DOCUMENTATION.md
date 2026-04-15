# Review API Documentation

## Base URL
```
/api/reviews
```

## Overview
The Review API allows students to create reviews for boarding listings, upload review media (images/video), react to reviews/comments, and manage comment threads. It also provides public listing/retrieval endpoints and aggregated rating statistics.

---

## Table of Contents
1. [Authentication & Authorization](#authentication--authorization)
2. [Rate Limiting](#rate-limiting)
3. [Enums & Constants](#enums--constants)
4. [Error Responses](#error-responses)
5. [Media Upload Rules](#media-upload-rules)
6. [Endpoints](#endpoints)
7. [Reaction Toggle Logic](#reaction-toggle-logic)
8. [Validation Rules](#validation-rules)
9. [Data Models](#data-models)

---

## Authentication & Authorization

### Authentication Requirement
- Mixed access:
  - Public read endpoints: `GET /boarding/:boardingId`, `GET /boarding/:boardingId/stats`, `GET /:id`
  - Authenticated endpoints: create/update/delete review, reactions, comments, personal lists

### Authorization Rules

| Endpoint | Auth | Role Rule |
|----------|------|-----------|
| `POST /api/reviews` | ✅ | `STUDENT` only |
| `GET /api/reviews/my` | ✅ | Any authenticated user (typically student) |
| `GET /api/reviews/my-boardings` | ✅ | Any authenticated user (intended owner usage) |
| `GET /api/reviews/boarding/:boardingId` | ❌ | Public |
| `GET /api/reviews/boarding/:boardingId/stats` | ❌ | Public |
| `GET /api/reviews/:id` | ❌ | Public |
| `PUT /api/reviews/:id` | ✅ | `STUDENT`, must be review owner |
| `DELETE /api/reviews/:id` | ✅ | Must be review owner |
| `POST /api/reviews/:id/reactions` | ✅ | `STUDENT` only |
| `POST /api/reviews/:id/comments` | ✅ | Any authenticated user |
| `PUT /api/reviews/comments/:id` | ✅ | `STUDENT`, must be comment owner |
| `DELETE /api/reviews/comments/:id` | ✅ | Must be comment owner |
| `POST /api/reviews/comments/:id/reactions` | ⚠️ middleware does not enforce auth | User ID still required by controller/token/header parsing |

> Note: The comment reaction route currently does not include `authenticate` middleware in routing, but the controller still requires a resolvable user identity (`req.user`, `x-user-id`, or Bearer token parsing).

---

## Rate Limiting

No Review-specific limiter middleware is applied at route level in `review.routes.ts`. Global app-level rate limiting (if configured) still applies.

---

## Enums & Constants

### ReactionType
```typescript
enum ReactionType {
  LIKE = "LIKE",
  DISLIKE = "DISLIKE"
}
```

### Review Constraints
```typescript
RATING_MIN = 1
RATING_MAX = 5
MAX_REVIEW_IMAGES = 5
MAX_REVIEW_VIDEO = 1
MAX_REVIEW_COMMENT_LENGTH = 1000
MAX_COMMENT_LENGTH = 500
```

### Pagination Defaults
```typescript
DEFAULT_PAGE = 1
DEFAULT_LIMIT = 10
ALLOWED_SORT_BY = ["rating", "commentedAt"]
ALLOWED_SORT_ORDER = ["asc", "desc"]
```

---

## Error Responses

### Standard Error Response Format
```json
{
  "success": false,
  "error": {
    "code": "ERROR_CODE",
    "message": "Error message"
  }
}
```

### Common Errors

| Scenario | Status | Message |
|----------|--------|---------|
| Review not found | 404 | `Review not found` |
| Comment not found | 404 | `Comment not found` |
| Invalid review media JSON field | 400 | `Invalid JSON in form field 'data'` |
| Missing user identity | 400 | `User ID is required` |
| Exceed image limit | 400 | `Maximum 5 images allowed` |
| Edit other user review/comment | 403 | `You can only edit your own ...` |
| Delete other user review/comment | 403 | `You can only delete your own ...` |
| One-time edit already used | 400 | `...already been edited and cannot be modified again` |
| Invalid file type | 400 | Upload validation error message |

---

## Media Upload Rules

Review create/update uses multipart form-data with a JSON `data` field and optional media files:

- Field `data` (stringified JSON) must validate against create/update schema
- Files:
  - `images` (max 5)
  - `video` (max 1)
- Multer config allows max total files = 6
- Allowed image MIME types include `image/jpeg`, `image/png`, `image/gif`, `image/webp`
- Allowed video MIME types include `video/mp4`, `video/webm`, `video/quicktime`
- `application/octet-stream` is accepted for videos if extension is one of `.mp4`, `.webm`, `.mov`, `.mkv`, `.avi`

---

## Endpoints

### 1. Create Review

**Endpoint:** `POST /api/reviews`

**Description:** Create a review for a boarding with optional images/video.

**Authentication:** ✅ Required

**Authorization:** `STUDENT`

**Request Headers:**
```
Authorization: Bearer <token>
Content-Type: multipart/form-data
```

**Multipart Fields:**
- `data`: JSON string
- `images`: 0..5 files
- `video`: 0..1 file

**`data` JSON Schema:**

| Field | Type | Required | Constraints |
|-------|------|----------|-------------|
| `boardingId` | string | ✅ | 24-char Mongo ObjectId format |
| `rating` | number | ✅ | Integer 1..5 |
| `comment` | string/null | ❌ | Max 1000 |
| `images` | string[] | ❌ | URL array, max 5 (schema field; uploaded files are main source) |
| `video` | string/null | ❌ | URL (schema field; uploaded file is main source) |

**Request Example (cURL):**
```bash
curl -X POST http://localhost:3000/api/reviews \
  -H "Authorization: Bearer <student-token>" \
  -F 'data={"boardingId":"507f1f77bcf86cd799439011","rating":5,"comment":"Very clean and owner is supportive."}' \
  -F "images=@room1.jpg" \
  -F "images=@kitchen.jpg" \
  -F "video=@walkthrough.mp4"
```

**Success Response (201 Created):**
```json
{
  "success": true,
  "message": "Review created successfully",
  "data": {
    "id": "507f1f77bcf86cd799439401",
    "boardingId": {
      "id": "507f1f77bcf86cd799439011",
      "title": "Beautiful Boarding House Near University",
      "boardingType": "SHARED_ROOM",
      "address": "123 Main Street",
      "city": "Colombo"
    },
    "studentId": {
      "id": "507f1f77bcf86cd799439001",
      "firstName": "Ahmed",
      "lastName": "Hassan",
      "email": "ahmed.hassan@example.com"
    },
    "rating": 5,
    "comment": "Very clean and owner is supportive.",
    "images": [
      "https://res.cloudinary.com/unistay/image/upload/v1712390001/reviews/room1.jpg",
      "https://res.cloudinary.com/unistay/image/upload/v1712390002/reviews/kitchen.jpg"
    ],
    "video": "https://res.cloudinary.com/unistay/video/upload/v1712390010/reviews/walkthrough.mp4",
    "likeCount": 0,
    "dislikeCount": 0,
    "commentedAt": "2026-04-06T12:00:00.000Z",
    "editedAt": null,
    "createdAt": "2026-04-06T12:00:00.000Z",
    "updatedAt": "2026-04-06T12:00:00.000Z"
  }
}
```

**Business Logic:**
- Parses `data` JSON from multipart field.
- Uploads provided media to Cloudinary.
- Stores media URLs in review document.
- Initializes reaction counters (`likeCount`, `dislikeCount`) to 0.

---

### 2. Get My Reviews

**Endpoint:** `GET /api/reviews/my`

**Description:** Get reviews authored by the authenticated user.

**Authentication:** ✅ Required

**Query Parameters:**

| Param | Type | Default | Allowed |
|-------|------|---------|---------|
| `page` | number | 1 | Positive integer |
| `limit` | number | 10 | Positive integer |
| `sortBy` | string | `commentedAt` | `rating`, `commentedAt` |
| `sortOrder` | string | `desc` | `asc`, `desc` |

**Success Response (200 OK):**
```json
{
  "success": true,
  "data": {
    "reviews": [
      {
        "id": "507f1f77bcf86cd799439401",
        "boardingId": {
          "id": "507f1f77bcf86cd799439011",
          "title": "Beautiful Boarding House Near University",
          "boardingType": "SHARED_ROOM",
          "address": "123 Main Street",
          "city": "Colombo"
        },
        "rating": 5,
        "comment": "Very clean and owner is supportive.",
        "images": [],
        "video": null,
        "likeCount": 2,
        "dislikeCount": 0,
        "commentedAt": "2026-04-06T12:00:00.000Z",
        "editedAt": null,
        "createdAt": "2026-04-06T12:00:00.000Z",
        "updatedAt": "2026-04-06T12:00:00.000Z"
      }
    ],
    "pagination": {
      "page": 1,
      "limit": 10,
      "total": 1,
      "totalPages": 1
    }
  }
}
```

---

### 3. Get Reviews for My Boardings

**Endpoint:** `GET /api/reviews/my-boardings`

**Description:** Get reviews written on boardings owned by the authenticated user.

**Authentication:** ✅ Required

**Query Parameters:** Same as `GET /my`

**Success Response (200 OK):**
```json
{
  "success": true,
  "data": {
    "reviews": [
      {
        "id": "507f1f77bcf86cd799439401",
        "boardingId": {
          "id": "507f1f77bcf86cd799439011",
          "title": "Beautiful Boarding House Near University",
          "boardingType": "SHARED_ROOM",
          "address": "123 Main Street",
          "city": "Colombo"
        },
        "studentId": {
          "id": "507f1f77bcf86cd799439001",
          "firstName": "Ahmed",
          "lastName": "Hassan",
          "email": "ahmed.hassan@example.com"
        },
        "rating": 5,
        "comment": "Very clean and owner is supportive.",
        "likeCount": 2,
        "dislikeCount": 0,
        "commentedAt": "2026-04-06T12:00:00.000Z"
      }
    ],
    "pagination": {
      "page": 1,
      "limit": 10,
      "total": 1,
      "totalPages": 1
    }
  }
}
```

---

### 4. Get Reviews by Boarding (Public)

**Endpoint:** `GET /api/reviews/boarding/:boardingId`

**Description:** Retrieve reviews for a specific boarding with pagination and sorting.

**Authentication:** ❌ Not required

**Path Params:**
- `boardingId` (Mongo ObjectId)

**Query Parameters:** Same as `GET /my`

**Request Example:**
```bash
GET /api/reviews/boarding/507f1f77bcf86cd799439011?page=1&limit=10&sortBy=rating&sortOrder=desc
```

**Success Response (200 OK):**
```json
{
  "success": true,
  "data": {
    "reviews": [
      {
        "id": "507f1f77bcf86cd799439401",
        "studentId": {
          "id": "507f1f77bcf86cd799439001",
          "firstName": "Ahmed",
          "lastName": "Hassan",
          "email": "ahmed.hassan@example.com"
        },
        "rating": 5,
        "comment": "Very clean and owner is supportive.",
        "images": [],
        "video": null,
        "likeCount": 2,
        "dislikeCount": 0,
        "comments": [
          {
            "id": "507f1f77bcf86cd799439501",
            "comment": "Thanks for the honest feedback!",
            "commentorId": {
              "id": "507f1f77bcf86cd799439009",
              "firstName": "Owner",
              "lastName": "One",
              "email": "owner@example.com"
            },
            "commentedAt": "2026-04-06T13:00:00.000Z"
          }
        ],
        "commentedAt": "2026-04-06T12:00:00.000Z"
      }
    ],
    "pagination": {
      "page": 1,
      "limit": 10,
      "total": 34,
      "totalPages": 4
    }
  }
}
```

**Business Logic:**
- Includes up to 5 comments per review in this listing query.
- Sortable by `rating` or `commentedAt`.

---

### 5. Get Review Statistics by Boarding (Public)

**Endpoint:** `GET /api/reviews/boarding/:boardingId/stats`

**Description:** Get aggregated rating stats for a boarding.

**Authentication:** ❌ Not required

**Success Response (200 OK):**
```json
{
  "success": true,
  "data": {
    "totalReviews": 34,
    "averageRating": 4.3,
    "ratingDistribution": {
      "5": 18,
      "4": 9,
      "3": 4,
      "2": 2,
      "1": 1
    }
  }
}
```

**Business Logic:**
- Average rating is rounded to 1 decimal.
- Distribution is computed over all review ratings for the boarding.

---

### 6. Get Review by ID (Public)

**Endpoint:** `GET /api/reviews/:id`

**Description:** Retrieve a single review with comments.

**Authentication:** ❌ Not required

**Success Response (200 OK):**
```json
{
  "success": true,
  "data": {
    "id": "507f1f77bcf86cd799439401",
    "boardingId": {
      "id": "507f1f77bcf86cd799439011",
      "title": "Beautiful Boarding House Near University",
      "boardingType": "SHARED_ROOM",
      "address": "123 Main Street",
      "city": "Colombo"
    },
    "studentId": {
      "id": "507f1f77bcf86cd799439001",
      "firstName": "Ahmed",
      "lastName": "Hassan",
      "email": "ahmed.hassan@example.com"
    },
    "rating": 5,
    "comment": "Very clean and owner is supportive.",
    "images": [],
    "video": null,
    "likeCount": 2,
    "dislikeCount": 0,
    "comments": [
      {
        "id": "507f1f77bcf86cd799439501",
        "comment": "Thanks for the honest feedback!",
        "commentorId": {
          "id": "507f1f77bcf86cd799439009",
          "firstName": "Owner",
          "lastName": "One",
          "email": "owner@example.com"
        },
        "likeCount": 0,
        "dislikeCount": 0,
        "commentedAt": "2026-04-06T13:00:00.000Z"
      }
    ]
  }
}
```

---

### 7. Update Review

**Endpoint:** `PUT /api/reviews/:id`

**Description:** Update a review once (one-time edit only).

**Authentication:** ✅ Required

**Authorization:** `STUDENT`, must own review

**Request Type:** `multipart/form-data` (same as create)

**Business Logic:**
- Only review owner can update.
- Review can be edited only once (`editedAt` becomes set after first update).
- If new images are uploaded, old images are deleted from Cloudinary and replaced.
- If new video is uploaded, old video is deleted from Cloudinary and replaced.

**Success Response (200 OK):**
```json
{
  "success": true,
  "message": "Review updated successfully",
  "data": {
    "id": "507f1f77bcf86cd799439401",
    "rating": 4,
    "comment": "Updated after one month stay.",
    "editedAt": "2026-04-07T09:30:00.000Z"
  }
}
```

**Error Example (second edit attempt):**
```json
{
  "success": false,
  "error": {
    "code": "BAD_REQUEST",
    "message": "This review has already been edited and cannot be modified again"
  }
}
```

---

### 8. Delete Review

**Endpoint:** `DELETE /api/reviews/:id`

**Description:** Delete own review.

**Authentication:** ✅ Required

**Authorization:** Must own review

**Business Logic:**
- Only author can delete.
- Deletes associated Cloudinary media (best effort).
- Deletes review document; comments/reactions are expected to be removed by cascade strategy in the app design.

**Success Response (200 OK):**
```json
{
  "success": true,
  "message": "Review deleted successfully",
  "data": null
}
```

---

### 9. Add Reaction to Review

**Endpoint:** `POST /api/reviews/:id/reactions`

**Description:** Toggle or update reaction on a review.

**Authentication:** ✅ Required

**Authorization:** `STUDENT`

**Request Body:**
```json
{
  "type": "LIKE"
}
```

**Possible Outcomes:**
- Add new reaction → `action: "added"`
- Send same existing reaction again → removes reaction (`action: "removed"`)
- Send opposite reaction → switches type (`action: "changed"`)

**Success Response (200 OK):**
```json
{
  "success": true,
  "message": "Review liked",
  "data": {
    "action": "added",
    "type": "LIKE"
  }
}
```

---

### 10. Create Review Comment

**Endpoint:** `POST /api/reviews/:id/comments`

**Description:** Add comment to a review.

**Authentication:** ✅ Required

**Request Body:**

| Field | Type | Required | Constraints |
|-------|------|----------|-------------|
| `comment` | string | ✅ | 1..500 chars |

**Success Response (201 Created):**
```json
{
  "success": true,
  "message": "Comment added successfully",
  "data": {
    "id": "507f1f77bcf86cd799439501",
    "reviewId": {
      "id": "507f1f77bcf86cd799439401",
      "boardingId": "507f1f77bcf86cd799439011"
    },
    "commentorId": {
      "id": "507f1f77bcf86cd799439009",
      "firstName": "Owner",
      "lastName": "One",
      "email": "owner@example.com"
    },
    "comment": "Thanks for the honest feedback!",
    "commentedAt": "2026-04-06T13:00:00.000Z",
    "editedAt": null,
    "likeCount": 0,
    "dislikeCount": 0
  }
}
```

---

### 11. Update Review Comment

**Endpoint:** `PUT /api/reviews/comments/:id`

**Description:** Update own comment once.

**Authentication:** ✅ Required

**Authorization:** `STUDENT`, must own comment

**Request Body:**
```json
{
  "comment": "Updated response after visit."
}
```

**Business Logic:**
- One-time edit only (`editedAt` set on first update).
- Author-only update.

**Success Response (200 OK):**
```json
{
  "success": true,
  "message": "Comment updated successfully",
  "data": {
    "id": "507f1f77bcf86cd799439501",
    "comment": "Updated response after visit.",
    "editedAt": "2026-04-06T14:00:00.000Z"
  }
}
```

---

### 12. Delete Review Comment

**Endpoint:** `DELETE /api/reviews/comments/:id`

**Description:** Delete own comment.

**Authentication:** ✅ Required

**Authorization:** Must own comment

**Success Response (200 OK):**
```json
{
  "success": true,
  "message": "Comment deleted successfully",
  "data": null
}
```

---

### 13. Add Reaction to Review Comment

**Endpoint:** `POST /api/reviews/comments/:id/reactions`

**Description:** Toggle or update reaction on a review comment.

**Authentication:** ⚠️ Route-level auth middleware is not attached in current router.

**Request Body:**
```json
{
  "type": "DISLIKE"
}
```

**Behavior:** Same toggle logic as review reactions (`added`, `removed`, `changed`).

**Success Response (200 OK):**
```json
{
  "success": true,
  "message": "Comment reaction updated",
  "data": {
    "action": "changed",
    "type": "DISLIKE"
  }
}
```

---

## Reaction Toggle Logic

For both review and comment reactions:

```
No existing reaction + LIKE      -> add LIKE, likeCount +1
No existing reaction + DISLIKE   -> add DISLIKE, dislikeCount +1
Existing LIKE + LIKE             -> remove reaction, likeCount -1
Existing DISLIKE + DISLIKE       -> remove reaction, dislikeCount -1
Existing LIKE + DISLIKE          -> switch, likeCount -1 & dislikeCount +1
Existing DISLIKE + LIKE          -> switch, dislikeCount -1 & likeCount +1
```

Each user can have at most one reaction per target due to unique compound indexes.

---

## Validation Rules

### `createReviewSchema`
- `boardingId`: required, Mongo ObjectId string
- `rating`: integer 1..5
- `comment`: optional nullable string, max 1000
- `images`: optional URL array, max 5
- `video`: optional nullable URL

### `updateReviewSchema`
- Partial of review schema (all optional)

### `updateReviewCommentSchema`
- `comment`: required, min 1, max 500

### `reactionSchema`
- `type`: `LIKE` or `DISLIKE`

### Additional Runtime Checks
- `data` in multipart must be valid JSON.
- Uploaded images must be <= 5 files.
- Invalid MIME types are rejected.

---

## Data Models

### Review
```typescript
{
  id: ObjectId,
  boardingId: ObjectId,
  studentId: ObjectId,
  rating: number,           // 1..5
  comment?: string,
  commentedAt: Date,
  editedAt?: Date,          // one-time edit flag
  likeCount: number,
  dislikeCount: number,
  images: string[],         // Cloudinary URLs
  video?: string,           // Cloudinary URL
  createdAt: Date,
  updatedAt: Date
}
```

### ReviewComment
```typescript
{
  id: ObjectId,
  reviewId: ObjectId,
  commentorId: ObjectId,
  comment: string,
  commentedAt: Date,
  editedAt?: Date,
  likeCount: number,
  dislikeCount: number,
  createdAt: Date,
  updatedAt: Date
}
```

### ReviewReaction
```typescript
{
  id: ObjectId,
  reviewId: ObjectId,
  userId: ObjectId,
  type: "LIKE" | "DISLIKE",
  createdAt: Date
}
```

### ReviewCommentReaction
```typescript
{
  id: ObjectId,
  reviewCommentId: ObjectId,
  userId: ObjectId,
  type: "LIKE" | "DISLIKE",
  createdAt: Date
}
```

---

## Example Workflows

### Workflow 1: Create Review with Media, Then React

```bash
# 1) Student creates review with 2 images
POST /api/reviews (multipart)
Authorization: Bearer <student-token>
- data={"boardingId":"507f1f77bcf86cd799439011","rating":5,"comment":"Great place"}
- images=@room.jpg
- images=@washroom.jpg

# 2) Another student likes the review
POST /api/reviews/{reviewId}/reactions
Authorization: Bearer <student2-token>
{
  "type": "LIKE"
}

# 3) Same student sends LIKE again (toggle off)
POST /api/reviews/{reviewId}/reactions
{
  "type": "LIKE"
}
# action becomes "removed"
```

### Workflow 2: One-Time Edit Enforcement

```bash
# 1) Update review first time
PUT /api/reviews/{reviewId}
Authorization: Bearer <owner-student-token>
- data={"comment":"Updated after 2 weeks","rating":4}
# success, editedAt set

# 2) Try second update
PUT /api/reviews/{reviewId}
- data={"comment":"Another update"}
# 400 This review has already been edited and cannot be modified again
```

### Workflow 3: Comment Thread + Comment Reactions

```bash
# 1) Owner comments on review
POST /api/reviews/{reviewId}/comments
Authorization: Bearer <owner-token>
{
  "comment": "Thanks for sharing your feedback"
}

# 2) Student reacts to comment
POST /api/reviews/comments/{commentId}/reactions
Authorization: Bearer <student-token>
{
  "type": "LIKE"
}

# 3) Student changes to dislike
POST /api/reviews/comments/{commentId}/reactions
{
  "type": "DISLIKE"
}
# action becomes "changed"
```

---

## Troubleshooting

| Issue | Cause | Fix |
|------|-------|-----|
| `Invalid JSON in form field 'data'` | `data` is not valid JSON string | Send properly JSON-stringified payload in multipart |
| `Maximum 5 images allowed` | Too many image files uploaded | Reduce to 5 images or fewer |
| `Review not found` | Invalid or deleted review ID | Verify ID and existence |
| `You can only edit your own reviews` | User is not review author | Use author account |
| `already been edited` | One-time edit already consumed | Do not attempt second edit |
| Upload MIME errors | Unsupported image/video type | Use allowed MIME types/extensions |
| `User ID is required` | Missing auth context | Pass valid Bearer token (or configured identity header) |

---

## Changelog & Version History

- **v1.0.0 (2026-04-06)**: Initial Review API documentation
  - Review CRUD
  - Review media uploads
  - Review & comment reactions
  - Comment management
  - Boarding review stats and paginated listing
