# UniStay Review API Documentation

## Base URL
```
http://localhost:3000/api
```

## Authentication
For now, pass the user ID in the `x-user-id` header:
```
x-user-id: <user-id-from-database>
```

---

## Test Data (from seeder)

### Sample Boarding IDs
```bash
# Get all boardings
docker exec unistay_postgres psql -U postgres -d unistay_db -c "SELECT id, \"propertyName\" FROM \"Boarding\";"
```

### Sample Student IDs
```bash
# Get all students
docker exec unistay_postgres psql -U postgres -d unistay_db -c "SELECT id, email, \"firstName\" FROM \"User\" WHERE role = 'STUDENT';"
```

---

## 1. Create a Review

### Endpoint
```
POST /api/reviews
```

### Headers
```
Content-Type: multipart/form-data
x-user-id: <student-id>
```

### Form Data
| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `data` | JSON string | Yes | Review data (see below) |
| `images` | Files | No | Up to 5 images (auto-converted to WebP) |
| `video` | File | No | 1 video (auto-converted to WebM) |

### JSON Data Structure
```json
{
  "boardingId": "<boarding-id>",
  "rating": 5,
  "comment": "Great place to stay!"
}
```

### cURL Example (without files)
```bash
curl -X POST http://localhost:3000/api/reviews \
  -H "x-user-id: cmm2etffe0000vezeo13gz82n" \
  -F 'data={"boardingId":"cmm2etfgy000qvezejq711xyf","rating":5,"comment":"Amazing boarding experience!"}'
```

### cURL Example (with images and video)
```bash
curl -X POST http://localhost:3000/api/reviews \
  -H "x-user-id: cmm2etffe0000vezeo13gz82n" \
  -F 'data={"boardingId":"cmm2etfgy000qvezejq711xyf","rating":5,"comment":"Beautiful rooms!"}' \
  -F 'images=@/path/to/image1.jpg' \
  -F 'images=@/path/to/image2.png' \
  -F 'video=@/path/to/video.mp4'
```

### Response
```json
{
  "success": true,
  "data": {
    "id": "review-id",
    "boardingId": "boarding-id",
    "studentId": "student-id",
    "rating": 5,
    "comment": "Amazing boarding experience!",
    "images": ["path/to/image1.webp", "path/to/image2.webp"],
    "video": "path/to/video.webm",
    "likeCount": 0,
    "dislikeCount": 0,
    "commentedAt": "2026-02-25T19:00:00.000Z",
    "editedAt": null,
    "student": {
      "id": "student-id",
      "firstName": "John",
      "lastName": "Doe",
      "email": "john@example.com"
    },
    "boarding": { ... }
  },
  "message": "Review created successfully"
}
```

---

## 2. Get Review by ID

### Endpoint
```
GET /api/reviews/:id
```

### cURL Example
```bash
curl http://localhost:3000/api/reviews/<review-id>
```

### Response
```json
{
  "success": true,
  "data": {
    "id": "review-id",
    "rating": 5,
    "comment": "Great place!",
    "images": [...],
    "video": "...",
    "likeCount": 10,
    "dislikeCount": 2,
    "student": { ... },
    "boarding": { ... },
    "comments": [ ... ]
  }
}
```

---

## 3. Get Reviews by Boarding

### Endpoint
```
GET /api/reviews/boarding/:boardingId
```

### Query Parameters
| Parameter | Type | Default | Description |
|-----------|------|---------|-------------|
| `page` | number | 1 | Page number |
| `limit` | number | 10 | Items per page |
| `sortBy` | string | commentedAt | `rating` or `commentedAt` |
| `sortOrder` | string | desc | `asc` or `desc` |

### cURL Example
```bash
curl "http://localhost:3000/api/reviews/boarding/cmm2etfgy000qvezejq711xyf?page=1&limit=5&sortBy=rating&sortOrder=desc"
```

### Response
```json
{
  "success": true,
  "data": [ ... ],
  "pagination": {
    "page": 1,
    "limit": 5,
    "total": 33,
    "totalPages": 7
  }
}
```

---

## 4. Get Review Statistics

### Endpoint
```
GET /api/reviews/boarding/:boardingId/stats
```

### cURL Example
```bash
curl http://localhost:3000/api/reviews/boarding/cmm2etfgy000qvezejq711xyf/stats
```

### Response
```json
{
  "success": true,
  "data": {
    "totalReviews": 33,
    "averageRating": 4.2,
    "ratingDistribution": {
      "5": 15,
      "4": 10,
      "3": 5,
      "2": 2,
      "1": 1
    }
  }
}
```

---

## 5. Update a Review (One-time edit only)

### Endpoint
```
PUT /api/reviews/:id
```

### Headers
```
x-user-id: <student-id> (must be the review author)
```

### cURL Example (without files)
```bash
curl -X PUT http://localhost:3000/api/reviews/<review-id> \
  -H "x-user-id: cmm2etffe0000vezeo13gz82n" \
  -F 'data={"rating":4,"comment":"Updated review after second visit"}'
```

### cURL Example (with new images)
```bash
curl -X PUT http://localhost:3000/api/reviews/<review-id> \
  -H "x-user-id: cmm2etffe0000vezeo13gz82n" \
  -F 'data={"comment":"Updated with new photos"}' \
  -F 'images=@/path/to/new-image1.jpg' \
  -F 'images=@/path/to/new-image2.jpg'
```

### Response
```json
{
  "success": true,
  "data": {
    "id": "review-id",
    "editedAt": "2026-02-25T20:00:00.000Z",
    ...
  },
  "message": "Review updated successfully"
}
```

### Error (Already Edited)
```json
{
  "success": false,
  "error": "BadRequestError",
  "message": "This review has already been edited and cannot be modified again"
}
```

---

## 6. Delete a Review

### Endpoint
```
DELETE /api/reviews/:id
```

### Headers
```
x-user-id: <student-id> (must be the review author)
```

### cURL Example
```bash
curl -X DELETE http://localhost:3000/api/reviews/<review-id> \
  -H "x-user-id: cmm2etffe0000vezeo13gz82n"
```

### Response
```json
{
  "success": true,
  "message": "Review deleted successfully"
}
```

---

## 7. Like/Dislike a Review

### Endpoint
```
POST /api/reviews/:id/reactions
```

### Headers
```
x-user-id: <user-id>
Content-Type: application/json
```

### Body
```json
{
  "type": "LIKE"  // or "DISLIKE"
}
```

### cURL Example (Like)
```bash
curl -X POST http://localhost:3000/api/reviews/<review-id>/reactions \
  -H "x-user-id: cmm2etffe0000vezeo13gz82n" \
  -H "Content-Type: application/json" \
  -d '{"type":"LIKE"}'
```

### cURL Example (Dislike)
```bash
curl -X POST http://localhost:3000/api/reviews/<review-id>/reactions \
  -H "x-user-id: cmm2etffe0000vezeo13gz82n" \
  -H "Content-Type: application/json" \
  -d '{"type":"DISLIKE"}'
```

### Response (Toggle Behavior)
```json
{
  "success": true,
  "data": {
    "action": "added",    // "added", "removed", or "changed"
    "type": "LIKE"
  },
  "message": "Review liked"
}
```

**Note:** Sending the same reaction twice removes it (toggle behavior).

---

## 8. Comment on a Review

### Endpoint
```
POST /api/reviews/:id/comments
```

### Headers
```
x-user-id: <user-id>
Content-Type: application/json
```

### Body
```json
{
  "comment": "Thank you for your feedback!"
}
```

### cURL Example
```bash
curl -X POST http://localhost:3000/api/reviews/<review-id>/comments \
  -H "x-user-id: cmm2etffe0000vezeo13gz82n" \
  -H "Content-Type: application/json" \
  -d '{"comment":"Thank you for your detailed review!"}'
```

### Response
```json
{
  "success": true,
  "data": {
    "id": "comment-id",
    "reviewId": "review-id",
    "commentorId": "user-id",
    "comment": "Thank you for your detailed review!",
    "likeCount": 0,
    "dislikeCount": 0,
    "commentedAt": "2026-02-25T19:00:00.000Z",
    "editedAt": null,
    "commentor": {
      "id": "user-id",
      "firstName": "Jane",
      "lastName": "Smith",
      "email": "jane@example.com"
    }
  },
  "message": "Comment added successfully"
}
```

---

## 9. Update a Comment (One-time edit only)

### Endpoint
```
PUT /api/reviews/comments/:id
```

### Headers
```
x-user-id: <user-id> (must be the comment author)
Content-Type: application/json
```

### Body
```json
{
  "comment": "Updated comment text"
}
```

### cURL Example
```bash
curl -X PUT http://localhost:3000/api/reviews/comments/<comment-id> \
  -H "x-user-id: cmm2etffe0000vezeo13gz82n" \
  -H "Content-Type: application/json" \
  -d '{"comment":"Updated comment text"}'
```

---

## 10. Delete a Comment

### Endpoint
```
DELETE /api/reviews/comments/:id
```

### Headers
```
x-user-id: <user-id> (must be the comment author)
```

### cURL Example
```bash
curl -X DELETE http://localhost:3000/api/reviews/comments/<comment-id> \
  -H "x-user-id: cmm2etffe0000vezeo13gz82n"
```

---

## 11. Like/Dislike a Comment

### Endpoint
```
POST /api/reviews/comments/:id/reactions
```

### Headers
```
x-user-id: <user-id>
Content-Type: application/json
```

### Body
```json
{
  "type": "LIKE"  // or "DISLIKE"
}
```

### cURL Example
```bash
curl -X POST http://localhost:3000/api/reviews/comments/<comment-id>/reactions \
  -H "x-user-id: cmm2etffe0000vezeo13gz82n" \
  -H "Content-Type: application/json" \
  -d '{"type":"LIKE"}'
```

---

## Error Responses

### 400 Bad Request
```json
{
  "success": false,
  "error": "BadRequestError",
  "message": "Validation error message"
}
```

### 404 Not Found
```json
{
  "success": false,
  "error": "NotFoundError",
  "message": "Review not found"
}
```

### 403 Forbidden
```json
{
  "success": false,
  "error": "ForbiddenError",
  "message": "You can only edit your own reviews"
}
```

---

## File Upload Specifications

### Images
- **Max files:** 5
- **Max size:** 10MB per file
- **Accepted formats:** JPEG, PNG, GIF, WebP
- **Conversion:** All images are automatically converted to WebP format
- **Storage:** Openinary (MinIO backend)

### Video
- **Max files:** 1
- **Max size:** 10MB
- **Accepted formats:** MP4, WebM, MOV
- **Conversion:** All videos are automatically converted to WebM format
- **Storage:** Openinary (MinIO backend)

---

## Quick Test Script

```bash
#!/bin/bash

# Configuration
BASE_URL="http://localhost:3000/api"
STUDENT_ID="cmm2etffe0000vezeo13gz82n"
BOARDING_ID="cmm2etfgy000qvezejq711xyf"

echo "=== Creating Review ==="
REVIEW_RESPONSE=$(curl -s -X POST "$BASE_URL/reviews" \
  -H "x-user-id: $STUDENT_ID" \
  -F 'data={"boardingId":"'$BOARDING_ID'","rating":5,"comment":"Test review from curl!"}')

echo "$REVIEW_RESPONSE" | jq .
REVIEW_ID=$(echo "$REVIEW_RESPONSE" | jq -r '.data.id')

echo -e "\n=== Getting Review ==="
curl -s "$BASE_URL/reviews/$REVIEW_ID" | jq .

echo -e "\n=== Liking Review ==="
curl -s -X POST "$BASE_URL/reviews/$REVIEW_ID/reactions" \
  -H "x-user-id: $STUDENT_ID" \
  -H "Content-Type: application/json" \
  -d '{"type":"LIKE"}' | jq .

echo -e "\n=== Adding Comment ==="
COMMENT_RESPONSE=$(curl -s -X POST "$BASE_URL/reviews/$REVIEW_ID/comments" \
  -H "x-user-id: $STUDENT_ID" \
  -H "Content-Type: application/json" \
  -d '{"comment":"This is a test comment"}')

echo "$COMMENT_RESPONSE" | jq .
COMMENT_ID=$(echo "$COMMENT_RESPONSE" | jq -r '.data.id')

echo -e "\n=== Liking Comment ==="
curl -s -X POST "$BASE_URL/reviews/comments/$COMMENT_ID/reactions" \
  -H "x-user-id: $STUDENT_ID" \
  -H "Content-Type: application/json" \
  -d '{"type":"LIKE"}' | jq .

echo -e "\n=== Getting Boarding Reviews ==="
curl -s "$BASE_URL/reviews/boarding/$BOARDING_ID?limit=3" | jq '.pagination'
```
